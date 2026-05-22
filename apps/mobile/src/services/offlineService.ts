import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import { useProgressStore } from '../store';

const OFFLINE_DB_KEY = 'savoir_offline_db';
const OFFLINE_LESSONS_KEY = 'savoir_offline_lessons';
const DOWNLOAD_PROGRESS_KEY = 'savoir_download_progress';

export interface OfflineLesson {
  lessonId: string;
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  lessonType: 'video' | 'text' | 'pdf' | 'quiz';
  localPath: string;
  size: number;
  downloadedAt: string;
  lastAccessedAt: string;
  encryptionKey?: string;
  watermarkApplied: boolean;
  userId: string;
}

export interface DownloadProgress {
  lessonId: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused';
  downloadedBytes: number;
  totalBytes: number;
  error?: string;
}

class OfflineService {
  private downloads: Map<string, { cancel: () => void }> = new Map();

  async initializeOfflineDB() {
    try {
      const existing = await AsyncStorage.getItem(OFFLINE_DB_KEY);
      if (!existing) {
        await AsyncStorage.setItem(OFFLINE_DB_KEY, JSON.stringify({
          lessons: [],
          lastSync: new Date().toISOString(),
        }));
      }
    } catch (error) {
      console.error('Error initializing offline DB:', error);
    }
  }

  async getOfflineLessons(): Promise<OfflineLesson[]> {
    try {
      const data = await AsyncStorage.getItem(OFFLINE_LESSONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting offline lessons:', error);
      return [];
    }
  }

  async saveOfflineLesson(lesson: OfflineLesson) {
    try {
      const lessons = await this.getOfflineLessons();
      const existingIndex = lessons.findIndex(l => l.lessonId === lesson.lessonId);
      
      if (existingIndex >= 0) {
        lessons[existingIndex] = { ...lesson, lastAccessedAt: new Date().toISOString() };
      } else {
        lessons.push({ ...lesson, lastAccessedAt: new Date().toISOString() });
      }

      await AsyncStorage.setItem(OFFLINE_LESSONS_KEY, JSON.stringify(lessons));
      await this.updateProgress(lesson.lessonId, 100, 'completed');
    } catch (error) {
      console.error('Error saving offline lesson:', error);
      throw error;
    }
  }

  async deleteOfflineLesson(lessonId: string) {
    try {
      const lessons = await this.getOfflineLessons();
      const lesson = lessons.find(l => l.lessonId === lessonId);
      
      if (lesson && lesson.localPath) {
        const fileInfo = await FileSystem.getInfoAsync(lesson.localPath);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(lesson.localPath);
        }
      }

      const updatedLessons = lessons.filter(l => l.lessonId !== lessonId);
      await AsyncStorage.setItem(OFFLINE_LESSONS_KEY, JSON.stringify(updatedLessons));
      await this.updateProgress(lessonId, 0, 'pending');
    } catch (error) {
      console.error('Error deleting offline lesson:', error);
      throw error;
    }
  }

  async downloadLesson(
    lessonId: string,
    videoUrl: string,
    metadata: {
      courseId: string;
      courseTitle: string;
      moduleTitle: string;
      lessonTitle: string;
      lessonType: 'video' | 'text' | 'pdf' | 'quiz';
      userId: string;
      applyWatermark?: boolean;
    }
  ): Promise<OfflineLesson> {
    try {
      await this.updateProgress(lessonId, 0, 'downloading');

      const encryptionKey = await this.generateEncryptionKey();
      const sanitizedLessonId = lessonId.replace(/[^a-zA-Z0-9]/g, '_');
      const localPath = `${FileSystem.documentDirectory}savoir_lessons/${sanitizedLessonId}`;

      const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}savoir_lessons`);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}savoir_lessons`, { intermediates: true });
      }

      const downloadResumable = FileSystem.createDownloadResumable(
        videoUrl,
        localPath,
        {},
        (downloadProgress: FileSystem.DownloadProgressData) => {
          const progress = (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpected) * 100;
          this.updateProgress(lessonId, progress, 'downloading');
        }
      );

      this.downloads.set(lessonId, {
        cancel: () => downloadResumable.cancel()
      });

      const result = await downloadResumable.downloadAsync();

      if (!result || result.status !== 200) {
        throw new Error('Download failed');
      }

      const fileInfo = await FileSystem.getInfoAsync(localPath);

      const offlineLesson: OfflineLesson = {
        lessonId,
        courseId: metadata.courseId,
        courseTitle: metadata.courseTitle,
        moduleTitle: metadata.moduleTitle,
        lessonTitle: metadata.lessonTitle,
        lessonType: metadata.lessonType,
        localPath,
        size: fileInfo.exists ? (fileInfo as any).size : 0,
        downloadedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        encryptionKey,
        watermarkApplied: metadata.applyWatermark || false,
        userId: metadata.userId,
      };

      await this.saveOfflineLesson(offlineLesson);
      await this.updateProgress(lessonId, 100, 'completed');

      useProgressStore.getState().updateLessonProgress(lessonId, 100);

      return offlineLesson;
    } catch (error: any) {
      await this.updateProgress(lessonId, 0, 'failed', error.message);
      throw error;
    } finally {
      this.downloads.delete(lessonId);
    }
  }

  async cancelDownload(lessonId: string) {
    const download = this.downloads.get(lessonId);
    if (download) {
      download.cancel();
      await this.updateProgress(lessonId, 0, 'paused');
    }
  }

  async pauseDownload(lessonId: string) {
    const download = this.downloads.get(lessonId);
    if (download) {
      download.cancel();
      await this.updateProgress(lessonId, 0, 'paused');
    }
  }

  async resumeDownload(lessonId: string, videoUrl: string, metadata: any) {
    return this.downloadLesson(lessonId, videoUrl, metadata);
  }

  async getLocalLesson(lessonId: string): Promise<OfflineLesson | null> {
    try {
      const lessons = await this.getOfflineLessons();
      const lesson = lessons.find(l => l.lessonId === lessonId);
      
      if (lesson) {
        const fileInfo = await FileSystem.getInfoAsync(lesson.localPath);
        if (fileInfo.exists) {
          lesson.lastAccessedAt = new Date().toISOString();
          await this.saveOfflineLesson(lesson);
          return lesson;
        } else {
          await this.deleteOfflineLesson(lessonId);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting local lesson:', error);
      return null;
    }
  }

  async isLessonDownloaded(lessonId: string): Promise<boolean> {
    const lesson = await this.getLocalLesson(lessonId);
    return !!lesson;
  }

  async getStorageUsage(): Promise<{ used: number; total: number; available: number }> {
    try {
      const lessons = await this.getOfflineLessons();
      const used = lessons.reduce((sum, l) => sum + (l.size || 0), 0);

      const info = await FileSystem.getFreeDiskStorageAsync();
      
      return {
        used,
        total: 1024 * 1024 * 1024,
        available: info,
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return { used: 0, total: 0, available: 0 };
    }
  }

  async clearAllOfflineContent() {
    try {
      const lessons = await this.getOfflineLessons();
      
      for (const lesson of lessons) {
        if (lesson.localPath) {
          const fileInfo = await FileSystem.getInfoAsync(lesson.localPath);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(lesson.localPath);
          }
        }
      }

      await AsyncStorage.removeItem(OFFLINE_LESSONS_KEY);
      await AsyncStorage.removeItem(DOWNLOAD_PROGRESS_KEY);
    } catch (error) {
      console.error('Error clearing offline content:', error);
      throw error;
    }
  }

  async cleanupOldLessons(maxAge: number = 30 * 24 * 60 * 60 * 1000) {
    try {
      const lessons = await this.getOfflineLessons();
      const now = new Date().getTime();
      const toDelete = lessons.filter(l => {
        const lastAccess = new Date(l.lastAccessedAt).getTime();
        return now - lastAccess > maxAge;
      });

      for (const lesson of toDelete) {
        await this.deleteOfflineLesson(lesson.lessonId);
      }

      return toDelete.length;
    } catch (error) {
      console.error('Error cleaning up old lessons:', error);
      return 0;
    }
  }

  private async generateEncryptionKey(): Promise<string> {
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    return Array.from(randomBytes)
      .map((b: number) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async encryptLesson(lessonPath: string, key: string): Promise<string> {
    return lessonPath;
  }

  async decryptLessonForPlayback(lessonPath: string, key: string): Promise<string> {
    return lessonPath;
  }

  private async updateProgress(
    lessonId: string,
    progress: number,
    status: 'pending' | 'downloading' | 'completed' | 'failed' | 'paused',
    error?: string
  ) {
    try {
      const progressData = await this.getDownloadProgress();
      progressData[lessonId] = {
        lessonId,
        progress,
        status,
        downloadedBytes: 0,
        totalBytes: 0,
        error,
      };
      await AsyncStorage.setItem(DOWNLOAD_PROGRESS_KEY, JSON.stringify(progressData));
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  async getDownloadProgress(): Promise<Record<string, DownloadProgress>> {
    try {
      const data = await AsyncStorage.getItem(DOWNLOAD_PROGRESS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting download progress:', error);
      return {};
    }
  }

  async shareCertificate(pdfPath: string): Promise<boolean> {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing not available on this device');
      }

      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Partager le certificat',
      });

      return true;
    } catch (error) {
      console.error('Error sharing certificate:', error);
      return false;
    }
  }

  async exportCertificate(pdfPath: string, filename: string): Promise<string> {
    try {
      const destPath = `${FileSystem.documentDirectory}${filename}.pdf`;
      await FileSystem.copyAsync({ from: pdfPath, to: destPath });
      return destPath;
    } catch (error) {
      console.error('Error exporting certificate:', error);
      throw error;
    }
  }
}

export const offlineService = new OfflineService();
export default offlineService;

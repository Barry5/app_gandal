import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useProgressStore } from '../store';
import offlineService, { OfflineLesson, DownloadProgress } from '../services/offlineService';

export default function OfflineScreen() {
  const navigation = useNavigation<any>();
  const [offlineLessons, setOfflineLessons] = useState<OfflineLesson[]>([]);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, available: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOfflineData();
  }, []);

  const loadOfflineData = async () => {
    setIsLoading(true);
    try {
      const lessons = await offlineService.getOfflineLessons();
      setOfflineLessons(lessons);
      const progress = await offlineService.getDownloadProgress();
      setDownloadProgress(progress);
      const usage = await offlineService.getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error loading offline data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (lessonId: string) => {
    Alert.alert(
      'Supprimer la leçon',
      'Voulez-vous vraiment supprimer cette leçon téléchargée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineService.deleteOfflineLesson(lessonId);
              await loadOfflineData();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer la leçon');
            }
          },
        },
      ]
    );
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleClearAll = () => {
    Alert.alert(
      'Tout supprimer',
      'Voulez-vous supprimer tout le contenu hors ligne ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer tout',
          style: 'destructive',
          onPress: async () => {
            try {
              await offlineService.clearAllOfflineContent();
              await loadOfflineData();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de nettoyer le contenu');
            }
          },
        },
      ]
    );
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'downloading': return '#6366f1';
      case 'failed': return '#ef4444';
      case 'paused': return '#f59e0b';
      default: return '#94a3b8';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎬';
      case 'text': return '📄';
      case 'pdf': return '📑';
      case 'quiz': return '❓';
      default: return '📚';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mode Hors-ligne</Text>
        <TouchableOpacity onPress={loadOfflineData}>
          <Text style={styles.refreshIcon}>🔄</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.storageCard}>
        <View style={styles.storageInfo}>
          <Text style={styles.storageLabel}>Stockage utilisé</Text>
          <Text style={styles.storageValue}>{formatSize(storageUsage.used)}</Text>
        </View>
        <View style={styles.storageBar}>
          <View style={[styles.storageFill, { width: `${(storageUsage.used / storageUsage.total) * 100}%` }]} />
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
          <Text style={styles.clearButtonText}>Tout supprimer</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : offlineLessons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📥</Text>
          <Text style={styles.emptyTitle}>Aucun contenu téléchargé</Text>
          <Text style={styles.emptyText}>
            Téléchargez des leçons pour les regarder hors connexion
          </Text>
        </View>
      ) : (
        <FlatList
          data={offlineLessons}
          keyExtractor={(item) => item.lessonId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const progress = downloadProgress[item.lessonId];
            return (
              <View style={styles.lessonCard}>
                <View style={styles.lessonIcon}>
                  <Text style={styles.lessonIconText}>{getTypeIcon(item.lessonType)}</Text>
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{item.lessonTitle}</Text>
                  <Text style={styles.lessonMeta}>{item.courseTitle}</Text>
                  <Text style={styles.lessonDate}>Téléchargé le {formatDate(item.downloadedAt)}</Text>
                  {progress && progress.status === 'downloading' && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress.progress}%` }]} />
                      </View>
                      <Text style={styles.progressText}>{Math.round(progress.progress)}%</Text>
                    </View>
                  )}
                </View>
                <View style={styles.lessonActions}>
                  <View style={[styles.statusDot, { backgroundColor: getProgressColor(progress?.status || 'completed') }]} />
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(item.lessonId)}
                  >
                    <Text style={styles.deleteIcon}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListFooterComponent={<View style={{ height: 100 }} />}
        />
      )}

      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          Les leçons téléchargées sont stockées de manière sécurisée et ne sont accessibles que dans l'application.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a' },
  refreshIcon: { fontSize: 24 },
  storageCard: { marginHorizontal: 20, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  storageInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  storageLabel: { fontSize: 14, color: '#64748b' },
  storageValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  storageBar: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12 },
  storageFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  clearButton: { alignSelf: 'flex-end' },
  clearButtonText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  listContent: { padding: 20 },
  lessonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  lessonIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  lessonIconText: { fontSize: 24 },
  lessonInfo: { flex: 1, marginLeft: 12 },
  lessonTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  lessonMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  lessonDate: { fontSize: 10, color: '#94a3b8', marginTop: 4 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  progressBar: { flex: 1, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, marginRight: 8 },
  progressFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 2 },
  progressText: { fontSize: 10, color: '#6366f1', fontWeight: '600' },
  lessonActions: { alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 12 },
  deleteButton: { padding: 8 },
  deleteIcon: { fontSize: 18 },
  infoCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 100, padding: 16, backgroundColor: '#e0e7ff', borderRadius: 12 },
  infoIcon: { fontSize: 20, marginRight: 12 },
  infoText: { flex: 1, fontSize: 12, color: '#6366f1', lineHeight: 18 },
});
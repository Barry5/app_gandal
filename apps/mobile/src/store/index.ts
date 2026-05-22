import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Course, Enrollment } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'savoir-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

interface CourseState {
  courses: Course[];
  currentCourse: Course | null;
  enrolledCourses: Enrollment[];
  isLoading: boolean;
  setCourses: (courses: Course[]) => void;
  setCurrentCourse: (course: Course | null) => void;
  setEnrolledCourses: (enrollments: Enrollment[]) => void;
  setLoading: (loading: boolean) => void;
  addCourse: (course: Course) => void;
  updateCourse: (id: string, updates: Partial<Course>) => void;
  removeCourse: (id: string) => void;
}

export const useCourseStore = create<CourseState>()((set) => ({
  courses: [],
  currentCourse: null,
  enrolledCourses: [],
  isLoading: false,
  setCourses: (courses) => set({ courses }),
  setCurrentCourse: (currentCourse) => set({ currentCourse }),
  setEnrolledCourses: (enrolledCourses) => set({ enrolledCourses }),
  setLoading: (isLoading) => set({ isLoading }),
  addCourse: (course) => set((state) => ({ courses: [course, ...state.courses] })),
  updateCourse: (id, updates) =>
    set((state) => ({
      courses: state.courses.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),
  removeCourse: (id) =>
    set((state) => ({
      courses: state.courses.filter((c) => c.id !== id),
    })),
}));

interface ProgressState {
  currentLessonId: string | null;
  currentModuleId: string | null;
  lessonProgress: Record<string, number>;
  quizScores: Record<string, number>;
  setCurrentLesson: (lessonId: string | null, moduleId: string | null) => void;
  updateLessonProgress: (lessonId: string, progress: number) => void;
  setQuizScore: (quizId: string, score: number) => void;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressState>()((set) => ({
  currentLessonId: null,
  currentModuleId: null,
  lessonProgress: {},
  quizScores: {},
  setCurrentLesson: (lessonId, moduleId) =>
    set({ currentLessonId: lessonId, currentModuleId: moduleId }),
  updateLessonProgress: (lessonId, progress) =>
    set((state) => ({
      lessonProgress: { ...state.lessonProgress, [lessonId]: progress },
    })),
  setQuizScore: (quizId, score) =>
    set((state) => ({
      quizScores: { ...state.quizScores, [quizId]: score },
    })),
  resetProgress: () =>
    set({ currentLessonId: null, currentModuleId: null, lessonProgress: {}, quizScores: {} }),
}));

interface SettingsState {
  dataSaverMode: boolean;
  notificationsEnabled: boolean;
  autoPlay: boolean;
  playbackSpeed: number;
  quality: '360p' | '480p' | '720p' | '1080p';
  setDataSaverMode: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setAutoPlay: (enabled: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setQuality: (quality: '360p' | '480p' | '720p' | '1080p') => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  dataSaverMode: false,
  notificationsEnabled: true,
  autoPlay: true,
  playbackSpeed: 1,
  quality: '720p',
  setDataSaverMode: (dataSaverMode) => set({ dataSaverMode }),
  setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
  setAutoPlay: (autoPlay) => set({ autoPlay }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setQuality: (quality) => set({ quality }),
}));

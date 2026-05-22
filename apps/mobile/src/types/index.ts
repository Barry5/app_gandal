export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'admin' | 'creator' | 'learner';
  avatarUrl?: string;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  priceCfa: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  category?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  durationHours?: number;
  totalLessons: number;
  totalStudents: number;
  avgRating: number;
  creatorName: string;
  modules?: Module[];
  createdAt?: string;
  publishedAt?: string;
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  orderIndex: number;
  isFree: boolean;
  totalLessons: number;
  totalDurationSec: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  type: 'video' | 'text' | 'pdf' | 'quiz';
  description?: string;
  contentUrl?: string;
  thumbnailUrl?: string;
  durationSec: number;
  orderIndex: number;
  isFree: boolean;
  viewCount: number;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: 'pending' | 'paid' | 'refunded';
  amountPaid: number;
  progressPercent: number;
  enrolledAt: string;
  completedAt?: string;
  course?: Course;
}

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  enrollmentId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  watchTimeSec: number;
  progressPercent: number;
  completedAt?: string;
  lastWatchedAt?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
  }[];
  explanation?: string;
  points: number;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  lessonId: string;
  enrollmentId: string;
  score: number;
  totalPoints: number;
  correctAnswers: number;
  totalQuestions: number;
  passed: boolean;
  timeSpentSec?: number;
  attemptedAt: string;
}

export interface Certificate {
  id: string;
  enrollmentId: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  pdfUrl?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaymentMethod {
  id: 'orange_money' | 'mtn_momo' | 'card';
  name: string;
  icon: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

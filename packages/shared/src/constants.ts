export const userRoles = {
  ADMIN: 'admin',
  CREATOR: 'creator',
  LEARNER: 'learner',
} as const;

export const courseStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;

export const lessonType = {
  VIDEO: 'video',
  TEXT: 'text',
  PDF: 'pdf',
  QUIZ: 'quiz',
} as const;

export const enrollmentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
} as const;

export const creatorPlans = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const;

export const paymentMethods = {
  ORANGE_MONEY: 'orange_money',
  MTN_MOMO: 'mtn_momo',
  CARD: 'card',
} as const;

export type UserRole = typeof userRoles[keyof typeof userRoles];
export type CourseStatus = typeof courseStatus[keyof typeof courseStatus];
export type LessonType = typeof lessonType[keyof typeof lessonType];
export type EnrollmentStatus = typeof enrollmentStatus[keyof typeof enrollmentStatus];
export type CreatorPlan = typeof creatorPlans[keyof typeof creatorPlans];
export type PaymentMethod = typeof paymentMethods[keyof typeof paymentMethods];

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const PLAN_LIMITS = {
  free: {
    maxStudents: 10,
    maxCourses: 3,
    commissionRate: 10,
    certificateEnabled: false,
    analyticsEnabled: false,
    whiteLabelEnabled: false,
  },
  pro: {
    maxStudents: -1,
    maxCourses: -1,
    commissionRate: 3,
    certificateEnabled: true,
    analyticsEnabled: true,
    whiteLabelEnabled: false,
  },
  enterprise: {
    maxStudents: -1,
    maxCourses: -1,
    commissionRate: 0,
    certificateEnabled: true,
    analyticsEnabled: true,
    whiteLabelEnabled: true,
  },
} as const;

export const COURSE_CATEGORIES = [
  { value: 'business', label: 'Business & Entrepreneuriat' },
  { value: 'tech', label: 'Technologie & Programming' },
  { value: 'marketing', label: 'Marketing & Communication' },
  { value: 'design', label: 'Design & Créativité' },
  { value: 'languages', label: 'Langues' },
  { value: 'health', label: 'Santé & Bien-être' },
  { value: 'agriculture', label: 'Agriculture & Élevage' },
  { value: 'crafts', label: 'Artisanat & Métiers' },
  { value: 'finance', label: 'Finance & Comptabilité' },
  { value: 'other', label: 'Autre' },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
] as const;
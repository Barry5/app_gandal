import { pgTable, uuid, varchar, text, timestamp, integer, boolean, pgEnum, jsonb, unique, index } from 'drizzle-orm/pg-core';

export const userRoles = pgEnum('user_roles', ['admin', 'creator', 'learner']);
export const courseStatus = pgEnum('course_status', ['draft', 'published', 'archived']);
export const lessonType = pgEnum('lesson_type', ['video', 'text', 'pdf', 'image', 'quiz']);
export const enrollmentStatus = pgEnum('enrollment_status', ['pending', 'paid', 'refunded']);
export const progressStatus = pgEnum('progress_status', ['not_started', 'in_progress', 'completed']);
export const creatorPlans = pgEnum('creator_plans', ['free', 'pro', 'enterprise']);
export const paymentMethods = pgEnum('payment_methods', ['orange_money', 'mtn_momo', 'card']);
export const paymentProviders = pgEnum('payment_providers', ['paystack', 'flutterwave', 'cinetpay', 'offline_code']);
export const paymentSubmissionStatus = pgEnum('payment_submission_status', [
  'PENDING_PAYMENT',
  'PAYMENT_SUBMITTED',
  'PAYMENT_VERIFIED',
  'PAYMENT_REJECTED',
  'ACTIVATED',
]);
export const financialTransactionStatus = pgEnum('financial_transaction_status', [
  'DUE',
  'VALIDATED',
  'PAID',
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }).unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  role: userRoles('role').notNull().default('learner'),
  isActive: boolean('is_active').notNull().default(true),
  emailVerified: boolean('email_verified').notNull().default(false),
  phoneVerified: boolean('phone_verified').notNull().default(false),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_users_email: index('idx_users_email').on(table.email),
  idx_users_phone: index('idx_users_phone').on(table.phone),
}));

export const creators = pgTable('creators', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  businessName: varchar('business_name', { length: 255 }),
  bio: text('bio'),
  plan: creatorPlans('plan').notNull().default('free'),
  stripeAccountId: varchar('stripe_account_id', { length: 255 }),
  paystackAccountId: varchar('paystack_account_id', { length: 255 }),
  maxStudents: integer('max_students').notNull().default(10),
  commissionRate: integer('commission_rate').notNull().default(10),
  settings: jsonb('settings').$type<{
    allowWatermark: boolean;
    maxDevices: number;
    requireApproval: boolean;
    autoRelease: boolean;
  }>().default({ allowWatermark: true, maxDevices: 2, requireApproval: false, autoRelease: true }),
  totalEarnings: integer('total_earnings').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  creatorId: uuid('creator_id').references(() => creators.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  shortDescription: varchar('short_description', { length: 300 }),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  priceCfa: integer('price_cfa').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('GNF'),
  status: courseStatus('status').notNull().default('draft'),
  category: varchar('category', { length: 100 }),
  difficulty: varchar('difficulty', { length: 50 }).default('beginner'),
  language: varchar('language', { length: 10 }).notNull().default('fr'),
  durationHours: integer('duration_hours'),
  totalLessons: integer('total_lessons').notNull().default(0),
  totalStudents: integer('total_students').notNull().default(0),
  totalRatings: integer('total_ratings').notNull().default(0),
  avgRating: integer('avg_rating').notNull().default(0),
  isFeatured: boolean('is_featured').notNull().default(false),
  isPublic: boolean('is_public').notNull().default(true),
  settings: jsonb('settings').$type<{
    allowDownload: boolean;
    maxDevices: number;
    watermarkEnabled: boolean;
    dataSaverAvailable: boolean;
    certificateEnabled: boolean;
    certificatePrice: number;
  }>().default({
    allowDownload: false,
    maxDevices: 2,
    watermarkEnabled: true,
    dataSaverAvailable: true,
    certificateEnabled: true,
    certificatePrice: 5000
  }),
  meta: jsonb('meta').$type<{
    tags: string[];
    requirements: string[];
    outcomes: string[];
  }>(),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_courses_creator: index('idx_courses_creator').on(table.creatorId),
  idx_courses_status: index('idx_courses_status').on(table.status),
  idx_courses_slug: index('idx_courses_slug').on(table.slug),
  uniq_courses_slug: unique('uniq_courses_slug').on(table.slug),
}));

export const modules = pgTable('modules', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  orderIndex: integer('order_index').notNull().default(0),
  isFree: boolean('is_free').notNull().default(false),
  totalLessons: integer('total_lessons').notNull().default(0),
  totalDurationSec: integer('total_duration_sec').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_modules_course: index('idx_modules_course').on(table.courseId),
}));

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  moduleId: uuid('module_id').references(() => modules.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  type: lessonType('type').notNull(),
  description: text('description'),
  content: text('content'),
  contentUrl: varchar('content_url', { length: 500 }),
  mediaPublicId: varchar('media_public_id', { length: 500 }),
  thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
  durationSec: integer('duration_sec').default(0),
  orderIndex: integer('order_index').notNull().default(0),
  isFree: boolean('is_free').notNull().default(false),
  settings: jsonb('settings').$type<{
    dataSaverAvailable: boolean;
    transcriptAvailable: boolean;
    playbackSpeed: number[];
    qualityOptions: string[];
  }>(),
  meta: jsonb('meta').$type<{
    fileSize: number;
    mimeType: string;
    quality: string;
  }>(),
  viewCount: integer('view_count').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_lessons_module: index('idx_lessons_module').on(table.moduleId),
}));

export const quizQuestions = pgTable('quiz_questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  question: text('question').notNull(),
  options: jsonb('options').$type<{
    text: string;
    isCorrect: boolean;
  }[]>().notNull(),
  explanation: text('explanation'),
  points: integer('points').notNull().default(10),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const enrollments = pgTable('enrollments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  status: enrollmentStatus('status').notNull().default('pending'),
  amountPaid: integer('amount_paid').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('GNF'),
  paymentMethod: paymentMethods('payment_method'),
  paymentProvider: paymentProviders('payment_provider'),
  paymentRef: varchar('payment_ref', { length: 255 }),
  paymentData: jsonb('payment_data'),
  progressPercent: integer('progress_percent').notNull().default(0),
  completedAt: timestamp('completed_at'),
  enrolledAt: timestamp('enrolled_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_enrollments_user: index('idx_enrollments_user').on(table.userId),
  idx_enrollments_course: index('idx_enrollments_course').on(table.courseId),
  idx_enrollments_status: index('idx_enrollments_status').on(table.status),
  uniq_enrollments_user_course: unique('uniq_enrollments_user_course').on(table.userId, table.courseId),
}));

export const courseAccessCodes = pgTable('course_access_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  creatorId: uuid('creator_id').references(() => creators.id, { onDelete: 'set null' }),
  generatedBy: uuid('generated_by').references(() => users.id, { onDelete: 'set null' }),
  codeHash: varchar('code_hash', { length: 128 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  maxUses: integer('max_uses').notNull().default(1),
  usedCount: integer('used_count').notNull().default(0),
  usedBy: uuid('used_by').references(() => users.id, { onDelete: 'set null' }),
  usedAt: timestamp('used_at'),
  expiresAt: timestamp('expires_at').notNull(),
  paymentRef: varchar('payment_ref', { length: 255 }).unique(),
  priceAtGeneration: integer('price_at_generation').notNull().default(0),
  grossAmount: integer('gross_amount').notNull().default(0),
  platformCommission: integer('platform_commission').notNull().default(0),
  trainerAmount: integer('trainer_amount').notNull().default(0),
  commissionRate: integer('commission_rate').notNull().default(0),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_access_codes_course: index('idx_access_codes_course').on(table.courseId),
  idx_access_codes_status: index('idx_access_codes_status').on(table.status),
  idx_access_codes_hash: index('idx_access_codes_hash').on(table.codeHash),
}));

export const courseAccessCodeAttempts = pgTable('course_access_code_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  accessCodeId: uuid('access_code_id').references(() => courseAccessCodes.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  attemptedCodeHash: varchar('attempted_code_hash', { length: 128 }).notNull(),
  success: boolean('success').notNull().default(false),
  ipAddress: varchar('ip_address', { length: 50 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_access_code_attempts_user_course: index('idx_access_code_attempts_user_course').on(table.userId, table.courseId),
  idx_access_code_attempts_created: index('idx_access_code_attempts_created').on(table.createdAt),
}));

export const lessonProgress = pgTable('lesson_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  enrollmentId: uuid('enrollment_id').references(() => enrollments.id, { onDelete: 'cascade' }).notNull(),
  status: progressStatus('status').notNull().default('not_started'),
  watchTimeSec: integer('watch_time_sec').notNull().default(0),
  progressPercent: integer('progress_percent').notNull().default(0),
  completedAt: timestamp('completed_at'),
  lastWatchedAt: timestamp('last_watched_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_progress_user: index('idx_progress_user').on(table.userId),
  idx_progress_lesson: index('idx_progress_lesson').on(table.lessonId),
  uniq_progress_user_lesson: unique('uniq_progress_user_lesson').on(table.userId, table.lessonId),
}));

export const quizAttempts = pgTable('quiz_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  enrollmentId: uuid('enrollment_id').references(() => enrollments.id, { onDelete: 'cascade' }).notNull(),
  score: integer('score').notNull().default(0),
  totalPoints: integer('total_points').notNull().default(0),
  correctAnswers: integer('correct_answers').notNull().default(0),
  totalQuestions: integer('total_questions').notNull().default(0),
  answers: jsonb('answers').$type<{
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
  }[]>(),
  passed: boolean('passed').notNull().default(false),
  timeSpentSec: integer('time_spent_sec'),
  attemptedAt: timestamp('attempted_at').notNull().defaultNow(),
});

export const certificates = pgTable('certificates', {
  id: uuid('id').defaultRandom().primaryKey(),
  enrollmentId: uuid('enrollment_id').references(() => enrollments.id, { onDelete: 'cascade' }).notNull().unique(),
  certificateNumber: varchar('certificate_number', { length: 50 }).notNull().unique(),
  verificationCode: varchar('verification_code', { length: 100 }).notNull().unique(),
  issuedAt: timestamp('issued_at').notNull().defaultNow(),
  pdfUrl: varchar('pdf_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const discussions = pgTable('discussions', {
  id: uuid('id').defaultRandom().primaryKey(),
  lessonId: uuid('lesson_id').references(() => lessons.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  parentId: uuid('parent_id').references((): any => discussions.id),
  content: text('content').notNull(),
  likesCount: integer('likes_count').notNull().default(0),
  repliesCount: integer('replies_count').notNull().default(0),
  isPinned: boolean('is_pinned').notNull().default(false),
  isResolved: boolean('is_resolved').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_discussions_lesson: index('idx_discussions_lesson').on(table.lessonId),
  idx_discussions_user: index('idx_discussions_user').on(table.userId),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  data: jsonb('data'),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_notifications_user: index('idx_notifications_user').on(table.userId),
  idx_notifications_read: index('idx_notifications_read').on(table.isRead),
}));

export const adminActivityLogs = pgTable('admin_activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  targetUserId: uuid('target_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  reason: text('reason'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_admin_activity_actor: index('idx_admin_activity_actor').on(table.actorUserId),
  idx_admin_activity_target: index('idx_admin_activity_target').on(table.targetUserId),
  idx_admin_activity_created: index('idx_admin_activity_created').on(table.createdAt),
}));

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 500 }).notNull().unique(),
  deviceInfo: jsonb('device_info').$type<{
    platform: string;
    browser: string;
    os: string;
  }>(),
  ipAddress: varchar('ip_address', { length: 50 }),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: varchar('token', { length: 500 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  enrollmentId: uuid('enrollment_id').references(() => enrollments.id),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('GNF'),
  provider: paymentProviders('provider').notNull(),
  providerRef: varchar('provider_ref', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  metadata: jsonb('metadata'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_payments_user: index('idx_payments_user').on(table.userId),
  idx_payments_course: index('idx_payments_course').on(table.courseId),
  idx_payments_provider_ref: index('idx_payments_provider_ref').on(table.providerRef),
}));

export const paymentSubmissions = pgTable('payment_submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('GNF'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 20 }),
  operatorReference: varchar('operator_reference', { length: 255 }),
  paymentDate: varchar('payment_date', { length: 20 }),
  proofUrl: varchar('proof_url', { length: 500 }),
  notes: text('notes'),
  status: paymentSubmissionStatus('status').notNull().default('PENDING_PAYMENT'),
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  activatedAt: timestamp('activated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_payment_submissions_user: index('idx_payment_submissions_user').on(table.userId),
  idx_payment_submissions_course: index('idx_payment_submissions_course').on(table.courseId),
  idx_payment_submissions_status: index('idx_payment_submissions_status').on(table.status),
}));

export const courseActivations = pgTable('course_activations', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  trainerId: uuid('trainer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseSnapshot: jsonb('course_snapshot').$type<{
    title: string;
    priceCfa: number;
    currency: string;
  }>().notNull(),
  priceAtActivation: integer('price_at_activation').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('GNF'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  paymentReference: varchar('payment_reference', { length: 255 }),
  grossAmount: integer('gross_amount').notNull(),
  platformCommission: integer('platform_commission').notNull(),
  trainerAmount: integer('trainer_amount').notNull(),
  commissionRate: integer('commission_rate').notNull(),
  paymentSubmissionId: uuid('payment_submission_id').references(() => paymentSubmissions.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 20 }).notNull().default('ACTIVATED'),
  activatedBy: uuid('activated_by').references(() => users.id, { onDelete: 'set null' }),
  activatedAt: timestamp('activated_at').notNull().defaultNow(),
  events: jsonb('events').$type<Array<{
    type: string;
    at: string;
    by?: string;
    note?: string;
  }>>().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_course_activations_course: index('idx_course_activations_course').on(table.courseId),
  idx_course_activations_student: index('idx_course_activations_student').on(table.studentId),
  idx_course_activations_trainer: index('idx_course_activations_trainer').on(table.trainerId),
}));

export const financialTransactions = pgTable('financial_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  activationId: uuid('activation_id').references(() => courseActivations.id, { onDelete: 'cascade' }).notNull().unique(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  trainerId: uuid('trainer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  studentId: uuid('student_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  grossAmount: integer('gross_amount').notNull(),
  platformCommission: integer('platform_commission').notNull(),
  trainerAmount: integer('trainer_amount').notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('GNF'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  paymentReference: varchar('payment_reference', { length: 255 }),
  commissionRate: integer('commission_rate').notNull(),
  status: financialTransactionStatus('status').notNull().default('DUE'),
  validatedBy: uuid('validated_by').references(() => users.id, { onDelete: 'set null' }),
  validatedAt: timestamp('validated_at'),
  paidBy: uuid('paid_by').references(() => users.id, { onDelete: 'set null' }),
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_financial_transactions_trainer: index('idx_financial_transactions_trainer').on(table.trainerId),
  idx_financial_transactions_status: index('idx_financial_transactions_status').on(table.status),
  idx_financial_transactions_course: index('idx_financial_transactions_course').on(table.courseId),
}));

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  messages: jsonb('messages').$type<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[]>().notNull().default([]),
  context: text('context'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_ai_conversations_user: index('idx_ai_conversations_user').on(table.userId),
}));

export const courseRatings = pgTable('course_ratings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(),
  review: text('review'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_ratings_course: index('idx_ratings_course').on(table.courseId),
  uniq_ratings_user_course: unique('uniq_ratings_user_course').on(table.userId, table.courseId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export const pricingTiers = pgTable('pricing_tiers', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  label: varchar('label', { length: 100 }).notNull().default('Standard'),
  price: integer('price').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('GNF'),
  isActive: boolean('is_active').notNull().default(true),
  validFrom: timestamp('valid_from'),
  validTo: timestamp('valid_to'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_pricing_tiers_course: index('idx_pricing_tiers_course').on(table.courseId),
  idx_pricing_tiers_active: index('idx_pricing_tiers_active').on(table.isActive),
}));

export const coursePriceHistory = pgTable('course_price_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id').references(() => courses.id, { onDelete: 'cascade' }).notNull(),
  oldPrice: integer('old_price').notNull().default(0),
  newPrice: integer('new_price').notNull().default(0),
  currency: varchar('currency', { length: 3 }).notNull().default('GNF'),
  changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
  reason: varchar('reason', { length: 255 }),
  enrolledStudentsAtChange: integer('enrolled_students_at_change').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_price_history_course: index('idx_price_history_course').on(table.courseId),
  idx_price_history_created: index('idx_price_history_created').on(table.createdAt),
}));

export const commissionRates = pgTable('commission_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  plan: creatorPlans('plan').notNull().unique(),
  rate: integer('rate').notNull().default(10),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;
export type Module = typeof modules.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type PricingTier = typeof pricingTiers.$inferSelect;
export type NewPricingTier = typeof pricingTiers.$inferInsert;
export type CoursePriceHistory = typeof coursePriceHistory.$inferSelect;
export type CommissionRate = typeof commissionRates.$inferSelect;

export const badgeTypes = pgEnum('badge_types', [
  'first_lesson',
  'first_course',
  'streak_7_days',
  'streak_30_days',
  'quiz_master',
  'top_10_percent',
  'social_butterfly',
  'helper',
  'speed_learner',
  'perfectionist',
  'early_bird',
  'night_owl',
  'week_warrior',
  'month_master',
  'course_collector',
  'quiz_champion',
  'streak_master',
  'completionist',
  'country_top',
  'global_top',
  'special_event',
]);

export const challengeTypes = pgEnum('challenge_types', [
  'daily',
  'weekly',
  'special',
]);

export const challengeStatus = pgEnum('challenge_status', [
  'active',
  'completed',
  'expired',
  'rewarded',
]);

export const levels = pgTable('levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  level: integer('level').notNull().unique(),
  minXp: integer('min_xp').notNull(),
  maxXp: integer('max_xp').notNull(),
  title: varchar('title', { length: 100 }).notNull(),
  description: text('description'),
  iconUrl: varchar('icon_url', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const badges = pgTable('badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: badgeTypes('type').notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 50 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  xpReward: integer('xp_reward').notNull().default(100),
  criteria: jsonb('criteria').$type<{
    type: string;
    value: number;
    courseId?: string;
  }>().notNull(),
  rarity: varchar('rarity', { length: 20 }).notNull().default('common'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userProgress = pgTable('user_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  totalXp: integer('total_xp').notNull().default(0),
  currentLevel: integer('current_level').notNull().default(1),
  streakDays: integer('streak_days').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lessonsCompleted: integer('lessons_completed').notNull().default(0),
  coursesCompleted: integer('courses_completed').notNull().default(0),
  quizzesPassed: integer('quizzes_passed').notNull().default(0),
  perfectQuizzes: integer('perfect_quizzes').notNull().default(0),
  totalStudyTimeMinutes: integer('total_study_time_minutes').notNull().default(0),
  discussionsCount: integer('discussions_count').notNull().default(0),
  lastActivityAt: timestamp('last_activity_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_user_progress_user: index('idx_user_progress_user').on(table.userId),
  idx_user_progress_total_xp: index('idx_user_progress_total_xp').on(table.totalXp),
  idx_user_progress_level: index('idx_user_progress_level').on(table.currentLevel),
}));

export const userBadges = pgTable('user_badges', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  badgeId: uuid('badge_id').references(() => badges.id, { onDelete: 'cascade' }).notNull(),
  earnedAt: timestamp('earned_at').notNull().defaultNow(),
  progress: integer('progress').notNull().default(0),
}, (table) => ({
  idx_user_badges_user: index('idx_user_badges_user').on(table.userId),
  uniq_user_badge: unique('uniq_user_badge').on(table.userId, table.badgeId),
}));

export const challenges = pgTable('challenges', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: challengeTypes('type').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 50 }).notNull(),
  xpReward: integer('xp_reward').notNull(),
  target: integer('target').notNull(),
  progress: integer('progress').notNull().default(0),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date').notNull(),
  rewardBadgeId: uuid('reward_badge_id').references(() => badges.id),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_challenges_type: index('idx_challenges_type').on(table.type),
  idx_challenges_dates: index('idx_challenges_dates').on(table.startDate, table.endDate),
}));

export const userChallengeProgress = pgTable('user_challenge_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  challengeId: uuid('challenge_id').references(() => challenges.id, { onDelete: 'cascade' }).notNull(),
  status: challengeStatus('status').notNull().default('active'),
  currentProgress: integer('current_progress').notNull().default(0),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  rewardedAt: timestamp('rewarded_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_user_challenge_user: index('idx_user_challenge_user').on(table.userId),
  idx_user_challenge_challenge: index('idx_user_challenge_challenge').on(table.challengeId),
  uniq_user_challenge: unique('uniq_user_challenge').on(table.userId, table.challengeId),
}));

export const xpTransactions = pgTable('xp_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  sourceId: uuid('source_id'),
  description: varchar('description', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_xp_transactions_user: index('idx_xp_transactions_user').on(table.userId),
  idx_xp_transactions_created: index('idx_xp_transactions_created').on(table.createdAt),
}));

export const leaderboard = pgTable('leaderboard', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),
  totalXp: integer('total_xp').notNull().default(0),
  rank: integer('rank').notNull().default(0),
  countryRank: integer('country_rank').notNull().default(0),
  weeklyXp: integer('weekly_xp').notNull().default(0),
  weeklyRank: integer('weekly_rank').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  idx_leaderboard_total_xp: index('idx_leaderboard_total_xp').on(table.totalXp),
  idx_leaderboard_rank: index('idx_leaderboard_rank').on(table.rank),
  idx_leaderboard_weekly: index('idx_leaderboard_weekly').on(table.weeklyXp),
}));

export const dailyRewards = pgTable('daily_rewards', {
  id: uuid('id').defaultRandom().primaryKey(),
  dayNumber: integer('day_number').notNull(),
  xpReward: integer('xp_reward').notNull(),
  badgeId: uuid('badge_id').references(() => badges.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userDailyLogins = pgTable('user_daily_logins', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  loginDate: timestamp('login_date').notNull(),
  streakCount: integer('streak_count').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  idx_user_daily_login_user: index('idx_user_daily_login_user').on(table.userId),
  idx_user_daily_login_date: index('idx_user_daily_login_date').on(table.loginDate),
  uniq_user_login_date: unique('uniq_user_login_date').on(table.userId, table.loginDate),
}));

export type Badge = typeof badges.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type Challenge = typeof challenges.$inferSelect;
export type UserChallengeProgress = typeof userChallengeProgress.$inferSelect;
export type XpTransaction = typeof xpTransactions.$inferSelect;
export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type PaymentSubmission = typeof paymentSubmissions.$inferSelect;
export type CourseActivation = typeof courseActivations.$inferSelect;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;

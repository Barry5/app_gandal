const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface UploadResponse {
  success: boolean;
  media?: {
    publicId: string;
    url: string;
    thumbnailUrl: string;
    format: string;
    duration?: number;
    bytes: number;
  };
  error?: string;
}

type UploadFileType = 'video' | 'image' | 'pdf' | 'audio';

type CloudinarySignatureResponse = {
  cloudName: string;
  apiKey: string;
  resourceType: 'video';
  uploadUrl: string;
  maxBytes: number;
  allowedFormats: string[];
  params: Record<string, string | number | boolean>;
};

type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  format: string;
  duration?: number;
  bytes: number;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  done?: boolean;
};

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const VIDEO_CHUNK_BYTES = 20 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'];

function getFileExtension(filename: string) {
  const index = filename.lastIndexOf('.');
  return index >= 0 ? filename.slice(index).toLowerCase() : '';
}

function validateVideoFile(file: File): string | null {
  if (file.size > MAX_VIDEO_BYTES) {
    return 'La video depasse la limite de 500MB';
  }

  if (!ALLOWED_VIDEO_TYPES.includes(file.type) || !ALLOWED_VIDEO_EXTENSIONS.includes(getFileExtension(file.name))) {
    return 'Format video non supporte. Utilisez mp4, mov ou webm';
  }

  return null;
}

function cloudinaryThumbnailUrl(cloudName: string, publicId: string) {
  return `https://res.cloudinary.com/${cloudName}/video/upload/so_auto,w_640,h_360,c_fill,q_auto,f_jpg/${publicId}.jpg`;
}

async function requestCloudinarySignature(file: File): Promise<CloudinarySignatureResponse> {
  return apiRequest<CloudinarySignatureResponse>('/media/cloudinary/signature', {
    method: 'POST',
    body: JSON.stringify({
      filename: file.name,
      size: file.size,
      contentType: file.type,
    }),
  });
}

function uploadCloudinaryPart(
  signature: CloudinarySignatureResponse,
  filePart: Blob,
  filename: string,
  uploadId: string,
  contentRange: string | null,
): Promise<CloudinaryUploadResponse> {
  const formData = new FormData();

  Object.entries(signature.params).forEach(([key, value]) => {
    formData.append(key, String(value));
  });
  formData.append('api_key', signature.apiKey);
  formData.append('file', filePart, filename);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.addEventListener('load', () => {
      const payload = JSON.parse(xhr.responseText || '{}');
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(payload);
      } else {
        reject(new Error(payload.error?.message || payload.error || 'Upload Cloudinary impossible'));
      }
    });
    xhr.addEventListener('error', () => reject(new Error('Erreur reseau Cloudinary')));
    xhr.open('POST', signature.uploadUrl);
    xhr.setRequestHeader('X-Unique-Upload-Id', uploadId);
    if (contentRange) {
      xhr.setRequestHeader('Content-Range', contentRange);
    }
    xhr.send(formData);
  });
}

async function withRetry<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

async function uploadVideoDirectToCloudinary(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadResponse> {
  const validationError = validateVideoFile(file);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const signature = await requestCloudinarySignature(file);
  const uploadId = crypto.randomUUID();
  let uploadedBytes = 0;
  let finalResponse: CloudinaryUploadResponse | null = null;

  if (file.size <= VIDEO_CHUNK_BYTES) {
    finalResponse = await withRetry(() => uploadCloudinaryPart(signature, file, file.name, uploadId, null));
    onProgress?.(100);
  } else {
    for (let start = 0; start < file.size; start += VIDEO_CHUNK_BYTES) {
      const end = Math.min(start + VIDEO_CHUNK_BYTES, file.size);
      const chunk = file.slice(start, end);
      const contentRange = `bytes ${start}-${end - 1}/${file.size}`;
      finalResponse = await withRetry(() => uploadCloudinaryPart(signature, chunk, file.name, uploadId, contentRange));
      uploadedBytes = end;
      onProgress?.(Math.min(99, Math.round((uploadedBytes / file.size) * 100)));
    }
    onProgress?.(100);
  }

  if (!finalResponse?.secure_url || !finalResponse.public_id) {
    return { success: false, error: 'Cloudinary n a pas retourne les informations video' };
  }

  return {
    success: true,
    media: {
      publicId: finalResponse.public_id,
      url: finalResponse.secure_url,
      thumbnailUrl: finalResponse.thumbnail_url || cloudinaryThumbnailUrl(signature.cloudName, finalResponse.public_id),
      format: finalResponse.format,
      duration: finalResponse.duration,
      bytes: finalResponse.bytes || file.size,
    },
  };
}

export async function uploadFile(
  file: File,
  type: UploadFileType,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
      if (type === 'video') {
    try {
      return await uploadVideoDirectToCloudinary(file, onProgress);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload Cloudinary impossible';
      if (message.includes('Unauthorized') || message.includes('Non autorise') || message.includes('Acces reserve')) {
        return { success: false, error: 'Session expirée. Connectez-vous avec un compte formateur.' };
      }
      if (!message.includes('Cloudinary is not configured')) {
        return { success: false, error: message };
      }
    }
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const token = localStorage.getItem('savoir_token') || '';
    
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve) => {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const progress = Math.round((e.loaded / e.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch {
            resolve({ 
              success: true, 
              media: {
                publicId: 'mock-' + Date.now(),
                url: URL.createObjectURL(file),
                thumbnailUrl: URL.createObjectURL(file),
                format: file.type.split('/')[1],
                bytes: file.size,
              }
            });
          }
        } else {
          let payload: { error?: string; details?: string | Array<{ message?: string }> } = {};
          try {
            payload = JSON.parse(xhr.responseText || '{}');
          } catch {
            payload = {};
          }
          const detailMessage = Array.isArray(payload.details)
            ? payload.details.map((item) => item.message).filter(Boolean).join(' | ')
            : payload.details;
          if (xhr.status === 401) {
            localStorage.removeItem('savoir_token');
            localStorage.removeItem('savoir_user');
            if (!window.location.pathname.startsWith('/auth/login')) {
              window.location.assign('/auth/login');
            }
          }
          resolve({ 
            success: false, 
            error: payload.error || detailMessage || (xhr.status === 401 ? 'Session expiree. Connectez-vous avec un compte formateur.' : 'Erreur lors de l\'upload')
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({ 
          success: false, 
          error: 'Erreur de connexion' 
        });
      });

      xhr.open('POST', `${API_URL}/media/upload`);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  } catch (error) {
    return { 
      success: false, 
      error: 'Erreur lors de l\'upload' 
    };
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem('savoir_token');
}

type ApiCourseRow = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  short_description?: string | null;
  thumbnail_url?: string | null;
  price_cfa?: number | null;
  status: 'draft' | 'published' | 'archived';
  total_students?: number | string | null;
  total_lessons?: number | string | null;
  avg_rating?: number | string | null;
  created_at?: string;
  creator_name?: string;
  currency?: string | null;
  category?: string | null;
  difficulty?: string | null;
  duration_hours?: number | string | null;
  enrollment_status?: 'pending' | 'paid' | 'refunded' | null;
  progress_percent?: number | string | null;
  module_count?: number | string | null;
  lesson_count?: number | string | null;
  completed_lesson_count?: number | string | null;
  is_free?: boolean;
  is_unlocked?: boolean;
  modules?: ApiModuleRow[];
};

type ApiModuleRow = {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  order_index?: number | null;
  is_free?: boolean | null;
  total_lessons?: number | string | null;
  total_duration_sec?: number | string | null;
  lessons?: ApiLessonRow[];
};

type ApiLessonRow = {
  id: string;
  module_id: string;
  title: string;
  type: LessonType;
  description?: string | null;
  content?: string | null;
  content_url?: string | null;
  media_public_id?: string | null;
  thumbnail_url?: string | null;
  duration_sec?: number | string | null;
  order_index?: number | null;
  is_free?: boolean | null;
};

export type CourseAccessCodeDto = {
  id: string;
  code?: string;
  status: string;
  max_uses: number;
  used_count: number;
  used_at?: string | null;
  expires_at: string;
  created_at: string;
  payment_ref: string;
  used_by_name?: string | null;
};

export type AiAssistantMode = 'summary' | 'explain' | 'revision' | 'examples' | 'announcement' | 'course_plan';

export type AiQuizQuestionDto = {
  type: 'qcm' | 'open';
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type AiQuizDto = {
  title: string;
  questions: AiQuizQuestionDto[];
};

export type AiGroundingDto = {
  courseId: string;
  moduleId?: string | null;
  contentChars: number;
  detailedContentChars?: number;
  sourceQuality?: 'course_content' | 'course_metadata';
};

export type AiQuizResponseDto = {
  quiz: AiQuizDto;
  model: string;
  groundedIn: AiGroundingDto;
};

export type AiAssistantResponseDto = {
  answer: string;
  model: string;
  groundedIn: AiGroundingDto;
};

export type LessonType = 'video' | 'text' | 'pdf' | 'image' | 'quiz';

export type AdminCreatorDto = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'creator';
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  creatorId: string;
  businessName?: string | null;
  plan: string;
  coursesCount: number;
  publishedCoursesCount: number;
  totalStudents: number;
  revenueCfa: number;
};

export type AdminCreatorsSummaryDto = {
  total_creators?: number;
  active_creators?: number;
  blocked_creators?: number;
};

export type CourseDto = {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnailUrl: string;
  priceCfa: number;
  status: 'draft' | 'published' | 'archived';
  totalStudents: number;
  totalLessons: number;
  avgRating: number;
  createdAt: string;
  creatorName?: string;
};

export type LessonDto = {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  description: string;
  content: string;
  contentUrl: string;
  mediaPublicId: string;
  thumbnailUrl: string;
  durationSec: number;
  orderIndex: number;
  isFree: boolean;
};

export type ModuleDto = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  orderIndex: number;
  isFree: boolean;
  totalLessons: number;
  totalDurationSec: number;
  lessons: LessonDto[];
};

export type CourseDetailDto = CourseDto & {
  modules: ModuleDto[];
};

export type CatalogCourseDto = CourseDto & {
  currency: string;
  category: string;
  difficulty: string;
  durationHours: number;
  moduleCount: number;
  lessonCount: number;
  completedLessonCount: number;
  enrollmentStatus: 'pending' | 'paid' | 'refunded' | null;
  progressPercent: number;
  isFree: boolean;
  isUnlocked: boolean;
};

export type CourseInput = {
  title: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  priceCfa?: number;
  thumbnailUrl?: string;
};

export type ModuleInput = {
  title: string;
  description?: string;
  orderIndex?: number;
};

export type LessonInput = {
  title: string;
  type: LessonType;
  description?: string;
  content?: string;
  contentUrl?: string;
  mediaPublicId?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  orderIndex?: number;
  isFree?: boolean;
};

function normalizeCourse(course: ApiCourseRow): CourseDto {
  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    description: course.description || '',
    shortDescription: course.short_description || '',
    thumbnailUrl: course.thumbnail_url || '',
    priceCfa: Number(course.price_cfa || 0),
    status: course.status,
    totalStudents: Number(course.total_students || 0),
    totalLessons: Number(course.total_lessons || 0),
    avgRating: Number(course.avg_rating || 0),
    createdAt: course.created_at || '',
    creatorName: course.creator_name,
  };
}

function normalizeLesson(lesson: ApiLessonRow): LessonDto {
  return {
    id: lesson.id,
    moduleId: lesson.module_id,
    title: lesson.title,
    type: lesson.type,
    description: lesson.description || '',
    content: lesson.content || '',
    contentUrl: lesson.content_url || '',
    mediaPublicId: lesson.media_public_id || '',
    thumbnailUrl: lesson.thumbnail_url || '',
    durationSec: Number(lesson.duration_sec || 0),
    orderIndex: Number(lesson.order_index || 0),
    isFree: Boolean(lesson.is_free),
  };
}

function normalizeModule(module: ApiModuleRow): ModuleDto {
  return {
    id: module.id,
    courseId: module.course_id,
    title: module.title,
    description: module.description || '',
    orderIndex: Number(module.order_index || 0),
    isFree: Boolean(module.is_free),
    totalLessons: Number(module.total_lessons || 0),
    totalDurationSec: Number(module.total_duration_sec || 0),
    lessons: (module.lessons || []).map(normalizeLesson),
  };
}

function normalizeCourseDetail(course: ApiCourseRow): CourseDetailDto {
  return {
    ...normalizeCourse(course),
    modules: (course.modules || []).map(normalizeModule),
  };
}

function normalizeCatalogCourse(course: ApiCourseRow): CatalogCourseDto {
  const lessonCount = Number(course.lesson_count || course.total_lessons || 0);
  const progressPercent = Number(course.progress_percent || 0);
  const completedLessonCount = course.completed_lesson_count !== undefined && course.completed_lesson_count !== null
    ? Number(course.completed_lesson_count || 0)
    : Math.round((lessonCount * progressPercent) / 100);
  const isFree = Boolean(course.is_free ?? Number(course.price_cfa || 0) <= 0);

  return {
    ...normalizeCourse(course),
    currency: course.currency || 'GNF',
    category: course.category || '',
    difficulty: course.difficulty || 'beginner',
    durationHours: Number(course.duration_hours || 0),
    moduleCount: Number(course.module_count || 0),
    lessonCount,
    completedLessonCount: Math.min(completedLessonCount, lessonCount),
    enrollmentStatus: course.enrollment_status || null,
    progressPercent,
    isFree,
    isUnlocked: isFree || Boolean(course.is_unlocked || course.enrollment_status === 'paid'),
  };
}

function compactPayload<T extends Record<string, unknown>>(payload: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  ) as Partial<T>;
}

export function getApiErrorMessage(payload: { error?: string; details?: string | Array<{ field?: string; message?: string }> }) {
  if (typeof payload.details === 'string' && payload.details.trim()) {
    return payload.details;
  }

  if (Array.isArray(payload.details) && payload.details.length) {
    return payload.details
      .map((item) => item.field ? `${item.field}: ${item.message}` : item.message)
      .join(' | ');
  }

  return payload.error || 'Erreur API';
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const hasBody = options.body !== undefined && options.body !== null;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('savoir_token');
      localStorage.removeItem('savoir_user');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth/login')) {
        window.location.assign('/auth/login');
      }
      throw new Error('Session expiree. Connectez-vous a votre compte.');
    }
    if (response.status === 403) {
      throw new Error(getApiErrorMessage(payload));
    }
    throw new Error(getApiErrorMessage(payload));
  }

  return payload as T;
}

export const courseApi = {
  async listMine(): Promise<CourseDto[]> {
    const payload = await apiRequest<{ courses: ApiCourseRow[] }>('/courses?mine=true&limit=100');
    return payload.courses.map(normalizeCourse);
  },

  async catalog(): Promise<CatalogCourseDto[]> {
    const payload = await apiRequest<{ courses: ApiCourseRow[] }>('/courses/catalog');
    return payload.courses.map(normalizeCatalogCourse);
  },

  async create(courseData: CourseInput): Promise<CourseDto> {
    const payload = await apiRequest<{ course: ApiCourseRow }>('/courses', {
      method: 'POST',
      body: JSON.stringify(compactPayload(courseData)),
    });
    return normalizeCourse(payload.course);
  },

  async getById(id: string): Promise<CourseDetailDto> {
    const payload = await apiRequest<{ course: ApiCourseRow }>(`/courses/${id}`);
    return normalizeCourseDetail(payload.course);
  },

  async update(id: string, courseData: Partial<CourseInput>): Promise<CourseDto> {
    const payload = await apiRequest<{ course: ApiCourseRow }>(`/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(compactPayload(courseData)),
    });
    return normalizeCourse(payload.course);
  },

  async publish(id: string): Promise<CourseDto> {
    const payload = await apiRequest<{ course: ApiCourseRow }>(`/courses/${id}/publish`, {
      method: 'POST',
    });
    return normalizeCourse(payload.course);
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/courses/${id}`, { method: 'DELETE' });
  },

  async enrollFree(id: string): Promise<void> {
    await apiRequest(`/courses/${id}/enroll-free`, { method: 'POST' });
  },

  async listAccessCodes(courseId: string): Promise<CourseAccessCodeDto[]> {
    const payload = await apiRequest<{ accessCodes: CourseAccessCodeDto[] }>(`/courses/${courseId}/access-codes`);
    return payload.accessCodes;
  },

  async createAccessCode(courseId: string, data: { expiresInDays?: number; maxUses?: number } = {}): Promise<CourseAccessCodeDto> {
    const payload = await apiRequest<{ accessCode: CourseAccessCodeDto }>(`/courses/${courseId}/access-codes`, {
      method: 'POST',
      body: JSON.stringify({ expiresInDays: 7, maxUses: 1, ...data }),
    });
    return payload.accessCode;
  },

  async redeemAccessCode(courseId: string, code: string): Promise<{ message: string; enrollmentId: string }> {
    return apiRequest(`/courses/${courseId}/redeem-code`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async addModule(courseId: string, moduleData: ModuleInput): Promise<ModuleDto> {
    const payload = await apiRequest<{ module: ApiModuleRow }>(`/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(compactPayload(moduleData)),
    });
    return normalizeModule({ ...payload.module, lessons: [] });
  },

  async updateModule(moduleId: string, moduleData: Partial<ModuleInput>): Promise<ModuleDto> {
    const payload = await apiRequest<{ module: ApiModuleRow }>(`/courses/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(compactPayload(moduleData)),
    });
    return normalizeModule(payload.module);
  },

  async deleteModule(moduleId: string): Promise<void> {
    await apiRequest(`/courses/modules/${moduleId}`, { method: 'DELETE' });
  },

  async reorderModules(courseId: string, ids: string[]): Promise<void> {
    await apiRequest(`/courses/${courseId}/modules/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    });
  },

  async addLesson(moduleId: string, lessonData: LessonInput): Promise<LessonDto> {
    const payload = await apiRequest<{ lesson: ApiLessonRow }>(`/courses/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(compactPayload(lessonData)),
    });
    return normalizeLesson(payload.lesson);
  },

  async updateLesson(lessonId: string, lessonData: Partial<LessonInput>): Promise<LessonDto> {
    const payload = await apiRequest<{ lesson: ApiLessonRow }>(`/courses/lessons/${lessonId}`, {
      method: 'PUT',
      body: JSON.stringify(compactPayload(lessonData)),
    });
    return normalizeLesson(payload.lesson);
  },

  async deleteLesson(lessonId: string): Promise<void> {
    await apiRequest(`/courses/lessons/${lessonId}`, { method: 'DELETE' });
  },

  async reorderLessons(moduleId: string, ids: string[]): Promise<void> {
    await apiRequest(`/courses/modules/${moduleId}/lessons/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ ids }),
    });
  },

  async markLessonProgress(lessonId: string, data: {
    status?: 'not_started' | 'in_progress' | 'completed';
    progressPercent?: number;
    watchTimeSec?: number;
  } = {}): Promise<{ progress: { completedLessons: number; totalLessons: number; progressPercent: number } }> {
    return apiRequest(`/courses/lessons/${lessonId}/progress`, {
      method: 'POST',
      body: JSON.stringify({
        status: 'completed',
        progressPercent: 100,
        ...data,
      }),
    });
  },
};

export const aiApi = {
  async generateQuiz(courseId: string, data: {
    questionCount?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    moduleId?: string;
  }): Promise<AiQuizResponseDto> {
    return apiRequest(`/ai/courses/${courseId}/quiz`, {
      method: 'POST',
      body: JSON.stringify(compactPayload(data)),
    });
  },

  async askCourseAssistant(courseId: string, data: {
    prompt: string;
    mode?: AiAssistantMode;
  }): Promise<AiAssistantResponseDto> {
    return apiRequest(`/ai/courses/${courseId}/assistant`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

export const mediaApi = {
  async delete(publicId: string, resourceType: 'video' | 'image' | 'raw' = 'video'): Promise<void> {
    await apiRequest('/media/delete', {
      method: 'POST',
      body: JSON.stringify({ publicId, resourceType }),
    });
  },

  async getPlaybackUrl(publicId: string): Promise<{ url: string; thumbnailUrl: string }> {
    return apiRequest('/media/playback-url', {
      method: 'POST',
      body: JSON.stringify({ publicId }),
    });
  },

  async getLessonDocumentBlob(lessonId: string): Promise<Blob> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/media/lessons/${lessonId}/document`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(getApiErrorMessage(payload));
    }

    return response.blob();
  },
};

export const paymentApi = {
  async initiate(data: {
    courseId: string;
    amount: number;
    currency?: 'GNF' | 'XOF' | 'USD';
    paymentMethod: 'orange_money' | 'mtn_momo' | 'card';
  }): Promise<{ reference: string; amount: number; currency: string; message: string; paymentUrl: string; provider: string }> {
    return apiRequest('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify({
        currency: 'GNF',
        ...data,
      }),
    });
  },

  async verify(reference: string): Promise<{ payment: any }> {
    return apiRequest(`/payments/verify/${reference}`);
  },
};

export type PaymentSubmissionDto = {
  id: string;
  userId: string;
  user?: { id: string; name?: string | null; email?: string | null; phone?: string | null };
  courseId: string;
  course?: { id: string; title?: string | null; thumbnailUrl?: string | null; priceCfa?: number };
  trainerId?: string | null;
  trainerName?: string | null;
  amount: number;
  currency: string;
  paymentMethod: string;
  phoneNumber?: string | null;
  operatorReference?: string | null;
  paymentDate?: string | null;
  proofUrl?: string | null;
  notes?: string | null;
  status: 'PENDING_PAYMENT' | 'PAYMENT_SUBMITTED' | 'PAYMENT_VERIFIED' | 'PAYMENT_REJECTED' | 'ACTIVATED';
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  activatedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type FinancialTransactionDto = {
  id: string;
  activation_id?: string;
  activationId?: string;
  course_id?: string;
  courseId?: string;
  course_title?: string | null;
  courseTitle?: string | null;
  course_thumbnail?: string | null;
  trainer_id?: string;
  trainerId?: string;
  trainer_name?: string | null;
  trainerName?: string | null;
  trainer_phone?: string | null;
  trainer_email?: string | null;
  business_name?: string | null;
  student_id?: string;
  student_name?: string | null;
  studentName?: string | null;
  gross_amount: number | string;
  grossAmount?: number;
  platform_commission: number | string;
  platformCommission?: number;
  trainer_amount: number | string;
  trainerAmount?: number;
  currency?: string;
  payment_method?: string | null;
  payment_reference?: string | null;
  commission_rate?: number;
  status: 'DUE' | 'VALIDATED' | 'PAID';
  paid_at?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
};

export type AdminDashboardDto = {
  overview: {
    total_creators: number;
    active_creators: number;
    total_learners: number;
    total_courses: number;
    published_courses: number;
    total_enrollments: number;
    total_activations: number;
    pending_submissions: number;
    verified_submissions: number;
  };
  financial: {
    gross_revenue: number;
    platform_revenue: number;
    trainer_revenue: number;
    trainer_due: number;
    trainer_paid: number;
  };
  categories: Array<{ category: string; courses: number }>;
  activationsByDay: Array<{ day: string; activations: number }>;
};

export const financeApi = {
  async submitOfflinePayment(data: {
    courseId: string;
    amount: number;
    paymentMethod: 'orange_money' | 'mtn_momo' | 'card' | 'bank_transfer';
    phoneNumber?: string;
    operatorReference?: string;
    paymentDate?: string;
    proofUrl?: string;
    notes?: string;
  }): Promise<{ submissionId: string; status: string; message: string }> {
    return apiRequest('/finances/submissions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async mySubmissions(): Promise<PaymentSubmissionDto[]> {
    const payload = await apiRequest<{ submissions: PaymentSubmissionDto[] }>('/finances/submissions/mine');
    return payload.submissions;
  },

  async adminListSubmissions(params: { status?: string; search?: string; page?: number; limit?: number } = {}): Promise<{
    submissions: PaymentSubmissionDto[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams({
      status: params.status || 'ALL',
      search: params.search || '',
      page: String(params.page || 1),
      limit: String(params.limit || 20),
    });
    return apiRequest('/finances/admin/submissions?' + query.toString());
  },

  async adminGetSubmission(id: string): Promise<{ submission: PaymentSubmissionDto }> {
    return apiRequest(`/finances/admin/submissions/${id}`);
  },

  async verifySubmission(id: string): Promise<{ status: string; message: string }> {
    return apiRequest(`/finances/admin/submissions/${id}/verify`, { method: 'POST', body: JSON.stringify({}) });
  },

  async rejectSubmission(id: string, reason: string): Promise<{ status: string; message: string }> {
    return apiRequest(`/finances/admin/submissions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async activateSubmission(id: string): Promise<{
    status: string;
    activationId: string;
    reference: string;
    grossAmount: number;
    platformCommission: number;
    trainerAmount: number;
    message: string;
  }> {
    return apiRequest(`/finances/admin/submissions/${id}/activate`, { method: 'POST', body: JSON.stringify({}) });
  },

  async adminListActivations(params: { search?: string; page?: number; limit?: number } = {}): Promise<{
    activations: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams({
      search: params.search || '',
      page: String(params.page || 1),
      limit: String(params.limit || 20),
    });
    return apiRequest('/finances/admin/activations?' + query.toString());
  },

  async adminListTransactions(params: { status?: string; page?: number; limit?: number } = {}): Promise<{
    transactions: FinancialTransactionDto[];
    summary: {
      total_gross: number;
      total_commission: number;
      total_trainer: number;
      total_due_to_trainers: number;
      total_paid_to_trainers: number;
    };
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams({
      status: params.status || 'ALL',
      page: String(params.page || 1),
      limit: String(params.limit || 20),
    });
    return apiRequest('/finances/admin/transactions?' + query.toString());
  },

  async validateTransaction(id: string): Promise<{ status: string; message: string }> {
    return apiRequest(`/finances/admin/transactions/${id}/validate`, { method: 'POST', body: JSON.stringify({}) });
  },

  async payTransaction(id: string): Promise<{ status: string; message: string }> {
    return apiRequest(`/finances/admin/transactions/${id}/pay`, { method: 'POST', body: JSON.stringify({}) });
  },

  async adminDashboard(): Promise<AdminDashboardDto> {
    return apiRequest('/finances/admin/dashboard');
  },

  async creatorSummary(): Promise<{
    summary: {
      total_transactions: number;
      gross_revenue: number;
      platform_commission: number;
      net_revenue: number;
      due_amount: number;
      validated_amount: number;
      paid_amount: number;
    };
  }> {
    return apiRequest('/finances/creator/summary');
  },

  async creatorTransactions(params: { status?: string } = {}): Promise<{ transactions: FinancialTransactionDto[] }> {
    const query = new URLSearchParams({ status: params.status || 'ALL' });
    return apiRequest('/finances/creator/transactions?' + query.toString());
  },

  async creatorActivations(): Promise<{ activations: any[] }> {
    return apiRequest('/finances/creator/activations');
  },
};

export async function saveCourse(courseData: CourseInput): Promise<{ success: boolean; course?: CourseDto; error?: string }> {
  try {
    const course = await courseApi.create(courseData);
    return { success: true, course };
  } catch (error) {
    return { success: false, error: 'Erreur lors de la sauvegarde' };
  }
}


export type PricingTierDto = {
  id: string;
  course_id: string;
  label: string;
  price: number;
  currency: string;
  is_active: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type PriceHistoryDto = {
  id: string;
  course_id: string;
  old_price: number;
  new_price: number;
  currency: string;
  changed_by?: string | null;
  changed_by_name?: string | null;
  reason?: string | null;
  enrolled_students_at_change: number;
  created_at: string;
};

export type CommissionRateDto = {
  id: string;
  plan: string;
  rate: number;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export const pricingApi = {
  async listTiers(courseId: string): Promise<PricingTierDto[]> {
    const payload = await apiRequest<{ tiers: PricingTierDto[] }>(`/pricing/${courseId}/tiers`);
    return payload.tiers;
  },

  async createTier(courseId: string, data: {
    label?: string;
    price: number;
    currency?: string;
    isActive?: boolean;
    validFrom?: string;
    validTo?: string;
    sortOrder?: number;
  }): Promise<PricingTierDto> {
    const payload = await apiRequest<{ tier: PricingTierDto }>(`/pricing/${courseId}/tiers`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return payload.tier;
  },

  async updateTier(courseId: string, tierId: string, data: Partial<{
    label: string;
    price: number;
    currency: string;
    isActive: boolean;
    validFrom: string;
    validTo: string;
    sortOrder: number;
  }>): Promise<PricingTierDto> {
    const payload = await apiRequest<{ tier: PricingTierDto }>(`/pricing/${courseId}/tiers/${tierId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return payload.tier;
  },

  async deleteTier(courseId: string, tierId: string): Promise<void> {
    await apiRequest(`/pricing/${courseId}/tiers/${tierId}`, { method: 'DELETE' });
  },

  async getHistory(courseId: string): Promise<PriceHistoryDto[]> {
    const payload = await apiRequest<{ history: PriceHistoryDto[] }>(`/pricing/${courseId}/history`);
    return payload.history;
  },

  async getCommissionRates(): Promise<CommissionRateDto[]> {
    const payload = await apiRequest<{ rates: CommissionRateDto[] }>('/pricing/commission-rates');
    return payload.rates;
  },

  async updateCommissionRate(plan: string, rate: number): Promise<CommissionRateDto> {
    const payload = await apiRequest<{ rate: CommissionRateDto }>(`/pricing/commission-rates/${plan}`, {
      method: 'PUT',
      body: JSON.stringify({ rate }),
    });
    return payload.rate;
  },
};

export const adminApi = {
  async listCreators(params: { status?: 'all' | 'active' | 'blocked'; search?: string; page?: number; limit?: number } = {}): Promise<{
    creators: AdminCreatorDto[];
    summary: AdminCreatorsSummaryDto;
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const query = new URLSearchParams({
      status: params.status || 'all',
      search: params.search || '',
      page: String(params.page || 1),
      limit: String(params.limit || 50),
    });
    return apiRequest('/users/creators?' + query.toString());
  },

  async setUserStatus(userId: string, isActive: boolean, reason?: string): Promise<{ user: any; message: string }> {
    return apiRequest('/users/' + userId + '/status', {
      method: 'PATCH',
      body: JSON.stringify({ isActive, reason }),
    });
  },
};

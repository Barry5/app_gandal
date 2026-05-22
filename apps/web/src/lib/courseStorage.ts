const STORAGE_KEY = 'savoir_courses';

interface Course {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  difficulty: string;
  thumbnailUrl: string;
  price: string;
  status: 'draft' | 'published';
  modules: any[];
  totalLessons: number;
  createdAt: string;
  updatedAt: string;
}

export const courseStorage = {
  getAll: (): Course[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save: (course: Course): Course => {
    const courses = courseStorage.getAll();
    const existingIndex = courses.findIndex(c => c.id === course.id);
    
    if (existingIndex >= 0) {
      courses[existingIndex] = { ...course, updatedAt: new Date().toISOString() };
    } else {
      courses.unshift(course);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
    return course;
  },

  delete: (id: string): void => {
    const courses = courseStorage.getAll().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  },

  getById: (id: string): Course | undefined => {
    return courseStorage.getAll().find(c => c.id === id);
  },

  create: (courseData: Partial<Course>): Course => {
    const course: Course = {
      id: 'course_' + Date.now(),
      title: courseData.title || 'Nouveau cours',
      shortDescription: courseData.shortDescription || '',
      description: courseData.description || '',
      category: courseData.category || '',
      difficulty: courseData.difficulty || 'beginner',
      thumbnailUrl: courseData.thumbnailUrl || '',
      price: courseData.price || '0',
      status: 'draft',
      modules: courseData.modules || [],
      totalLessons: courseData.totalLessons || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return courseStorage.save(course);
  },

  update: (id: string, updates: Partial<Course>): Course | null => {
    const course = courseStorage.getById(id);
    if (!course) return null;
    
    const updated = { ...course, ...updates, updatedAt: new Date().toISOString() };
    return courseStorage.save(updated);
  },

  publish: (id: string): Course | null => {
    return courseStorage.update(id, { status: 'published' });
  }
};

export default courseStorage;
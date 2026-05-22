const STORAGE_KEY = 'savoir_learners';

export interface Learner {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  enrolledCourses: string[];
  progress: Record<string, number>;
  status: 'active' | 'inactive';
  joinedAt: string;
}

export const learnerStorage = {
  getAll: (): Learner[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  add: (learner: Omit<Learner, 'id' | 'joinedAt' | 'progress' | 'enrolledCourses' | 'status'>): Learner => {
    const learners = learnerStorage.getAll();
    const newLearner: Learner = {
      ...learner,
      id: 'learner_' + Date.now(),
      enrolledCourses: [],
      progress: {},
      status: 'active',
      joinedAt: new Date().toISOString(),
    };
    learners.unshift(newLearner);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learners));
    return newLearner;
  },

  addBulk: (learners: Array<{ name: string; email?: string; phone?: string }>): { added: number; errors: string[] } => {
    const existing = learnerStorage.getAll();
    const errors: string[] = [];
    let added = 0;

    learners.forEach(l => {
      if (!l.name) {
        errors.push('Nom manquant');
        return;
      }
      if (!l.email && !l.phone) {
        errors.push(`${l.name || 'Apprenant'}: email ou téléphone requis`);
        return;
      }
      const exists = existing.some(e => e.email === l.email || e.phone === l.phone);
      if (exists) {
        errors.push(`${l.name}: déjà existant`);
        return;
      }

      const newLearner: Learner = {
        id: 'learner_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: l.name,
        email: l.email || '',
        phone: l.phone || '',
        enrolledCourses: [],
        progress: {},
        status: 'active',
        joinedAt: new Date().toISOString(),
      };
      existing.unshift(newLearner);
      added++;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    return { added, errors };
  },

  update: (id: string, updates: Partial<Learner>): Learner | null => {
    const learners = learnerStorage.getAll();
    const index = learners.findIndex(l => l.id === id);
    if (index === -1) return null;
    
    learners[index] = { ...learners[index], ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learners));
    return learners[index];
  },

  delete: (id: string): void => {
    const learners = learnerStorage.getAll().filter(l => l.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(learners));
  },

  getById: (id: string): Learner | undefined => {
    return learnerStorage.getAll().find(l => l.id === id);
  },

  enrollInCourse: (learnerId: string, courseId: string): void => {
    const learner = learnerStorage.getById(learnerId);
    if (learner && !learner.enrolledCourses.includes(courseId)) {
      learnerStorage.update(learnerId, {
        enrolledCourses: [...learner.enrolledCourses, courseId],
        progress: { ...learner.progress, [courseId]: 0 }
      });
    }
  },
};

export default learnerStorage;
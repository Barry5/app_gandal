'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  GraduationCap,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  Clock,
  Star,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, Avatar, StatsCard } from '@/components/ui/DataDisplay';
import { CircularProgress } from '@/components/ui/Progress';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAuthToken, getApiErrorMessage } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface StudentDto {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  enrolledCourses: number;
  completedCourses: number;
  progress: number;
  lastActivity?: string | null;
  joinedAt?: string | null;
}

function formatWhen(date?: string | null) {
  if (!date) return '—';
  const d = new Date(date);
  const now = new Date();
  const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 60) return diffMin <= 1 ? "à l'instant" : `il y a ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  if (diffD < 30) return `il y a ${diffD}j`;
  return d.toLocaleDateString('fr-FR');
}

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgress, setFilterProgress] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAuthToken();
      try {
        const response = await fetch(`${API_URL}/analytics/students`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload));
        }
        if (!cancelled) setStudents(payload.students || []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.email.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesFilter = true;
      if (filterProgress === 'active') matchesFilter = student.progress > 0 && student.progress < 100;
      if (filterProgress === 'completed') matchesFilter = student.progress === 100;
      if (filterProgress === 'inactive') matchesFilter = student.progress === 0;

      return matchesSearch && matchesFilter;
    });
  }, [students, searchQuery, filterProgress]);

  const activeStudents = students.filter((s) => s.progress > 0 && s.progress < 100).length;
  const completedStudents = students.filter((s) => s.progress === 100).length;
  const avgProgress = students.length
    ? Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length)
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes élèves</h1>
            <p className="text-gray-500 dark:text-gray-400">Suivez la progression de vos étudiants</p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            label="Total élèves"
            value={students.length}
            icon={<GraduationCap className="w-6 h-6" />}
            color="indigo"
          />
          <StatsCard
            label="Actifs"
            value={activeStudents}
            icon={<TrendingUp className="w-6 h-6" />}
            color="green"
          />
          <StatsCard
            label="Certifiés"
            value={completedStudents}
            icon={<Award className="w-6 h-6" />}
            color="purple"
          />
          <StatsCard
            label="Progression moyenne"
            value={`${avgProgress}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="orange"
          />
        </div>

        {/* Filters */}
        {students.length > 0 && (
          <Card padding="md">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un élève..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                />
              </div>
              <select
                value={filterProgress}
                onChange={(e) => setFilterProgress(e.target.value)}
                className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tous les élèves</option>
                <option value="active">Actifs</option>
                <option value="completed">Certifiés</option>
                <option value="inactive">Inactifs</option>
              </select>
            </div>
          </Card>
        )}

        {loading && <div className="p-12 text-center text-sm text-gray-500">Chargement des élèves…</div>}

        {!loading && !error && students.length === 0 && (
          <Card className="text-center py-12">
            <GraduationCap className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucun élève pour le moment</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Les élèves inscrits à vos cours apparaîtront ici dès les premières inscriptions.
            </p>
          </Card>
        )}

        {!loading && !error && filteredStudents.length === 0 && students.length > 0 && (
          <Card className="text-center py-12">
            <GraduationCap className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucun élève trouvé</h3>
            <p className="text-gray-500 dark:text-gray-400">Aucun élève ne correspond à vos critères</p>
          </Card>
        )}

        {/* Students Grid */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card
                  padding="none"
                  className="cursor-pointer hover:shadow-lg transition-all duration-300"
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={student.name} src={student.avatarUrl || undefined} size="lg" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{student.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Progression</span>
                        <div className="flex items-center gap-2">
                          <CircularProgress value={student.progress} size={36} strokeWidth={3} />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.progress}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{student.enrolledCourses}</p>
                          <p className="text-xs text-gray-500">Cours</p>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{student.completedCourses}</p>
                          <p className="text-xs text-gray-500">Terminés</p>
                        </div>
                        <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{student.progress === 100 ? 1 : 0}</p>
                          <p className="text-xs text-gray-500">Certificats</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          Dernière activité : {formatWhen(student.lastActivity)}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          {formatWhen(student.joinedAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function StudentDetailModal({
  student,
  onClose,
}: {
  student: StudentDto;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={student.name} src={student.avatarUrl || undefined} size="xl" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{student.name}</h2>
              <p className="text-gray-500 dark:text-gray-400">{student.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20">
              <p className="text-2xl font-bold text-indigo-600">{student.enrolledCourses}</p>
              <p className="text-sm text-gray-500">Cours</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-green-50 dark:bg-green-900/20">
              <p className="text-2xl font-bold text-green-600">{student.completedCourses}</p>
              <p className="text-sm text-gray-500">Terminés</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <p className="text-2xl font-bold text-purple-600">{student.progress === 100 ? 1 : 0}</p>
              <p className="text-sm text-gray-500">Certificats</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20">
              <p className="text-2xl font-bold text-orange-600">{student.progress}%</p>
              <p className="text-sm text-gray-500">Progression</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              Inscrit depuis le {student.joinedAt ? new Date(student.joinedAt).toLocaleDateString('fr-FR') : '—'}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              Dernière activité : {formatWhen(student.lastActivity)}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
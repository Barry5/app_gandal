'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Mail,
  MoreVertical,
  BookOpen,
  Clock,
  TrendingUp,
  Award,
  Calendar,
  ChevronRight,
  Star,
  GraduationCap,
  Video,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge, Avatar, StatsCard } from '@/components/ui/DataDisplay';
import { CircularProgress } from '@/components/ui/Progress';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ImportModal from '@/components/ui/ImportModal';
import learnerStorage from '@/lib/learnerStorage';

interface Student {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  enrolledCourses: number;
  completedCourses: number;
  progress: number;
  lastActivity: string;
  totalWatchTime: number;
  certificatesEarned: number;
  joinedAt: string;
}

const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Aminata Koné',
    email: 'aminata.kone@email.com',
    enrolledCourses: 3,
    completedCourses: 2,
    progress: 85,
    lastActivity: '2h ago',
    totalWatchTime: 1450,
    certificatesEarned: 2,
    joinedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Ibrahim Sow',
    email: 'ibrahim.sow@email.com',
    enrolledCourses: 2,
    completedCourses: 1,
    progress: 42,
    lastActivity: '1j ago',
    totalWatchTime: 680,
    certificatesEarned: 1,
    joinedAt: '2024-02-10',
  },
  {
    id: '3',
    name: 'Mariam Diallo',
    email: 'mariam.diallo@email.com',
    enrolledCourses: 4,
    completedCourses: 3,
    progress: 91,
    lastActivity: '3j ago',
    totalWatchTime: 2100,
    certificatesEarned: 3,
    joinedAt: '2024-01-20',
  },
  {
    id: '4',
    name: 'Sékou Touré',
    email: 'sekou.toure@email.com',
    enrolledCourses: 1,
    completedCourses: 0,
    progress: 15,
    lastActivity: '5j ago',
    totalWatchTime: 120,
    certificatesEarned: 0,
    joinedAt: '2024-03-01',
  },
  {
    id: '5',
    name: 'Fatoumata Barry',
    email: 'fatoumata.barry@email.com',
    enrolledCourses: 2,
    completedCourses: 2,
    progress: 100,
    lastActivity: '1j ago',
    totalWatchTime: 980,
    certificatesEarned: 2,
    joinedAt: '2024-02-05',
  },
  {
    id: '6',
    name: 'Mamadou Baldé',
    email: 'mamadou.balde@email.com',
    enrolledCourses: 3,
    completedCourses: 1,
    progress: 56,
    lastActivity: '4h ago',
    totalWatchTime: 750,
    certificatesEarned: 1,
    joinedAt: '2024-01-25',
  },
];

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [filterProgress, setFilterProgress] = useState<string>('all');
  const [showImportModal, setShowImportModal] = useState(false);

  const importedLearners = learnerStorage.getAll();

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesFilter = true;
    if (filterProgress === 'active') matchesFilter = student.progress > 0 && student.progress < 100;
    if (filterProgress === 'completed') matchesFilter = student.progress === 100;
    if (filterProgress === 'inactive') matchesFilter = student.progress === 0;
    
    return matchesSearch && matchesFilter;
  });

  const activeStudents = students.filter(s => s.progress > 0 && s.progress < 100).length;
  const completedStudents = students.filter(s => s.progress === 100).length;
  const avgProgress = Math.round(students.reduce((acc, s) => acc + s.progress, 0) / students.length);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes élèves</h1>
            <p className="text-gray-500 dark:text-gray-400">Suivez la progression de vos étudiants</p>
          </div>
          <Button variant="outline" leftIcon={<Download className="w-5 h-5" />} onClick={() => setShowImportModal(true)}>
            Importer
          </Button>
        </div>

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
            icon={<Video className="w-6 h-6" />}
            color="orange"
          />
        </div>

        {/* Filters */}
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

        {/* Students Grid */}
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
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar 
                        name={student.name} 
                        src={student.avatarUrl} 
                        size="lg" 
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{student.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                      </div>
                    </div>
                    <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
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
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{student.certificatesEarned}</p>
                        <p className="text-xs text-gray-500">Certificats</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        {formatDuration(student.totalWatchTime)}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {student.lastActivity}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredStudents.length === 0 && (
          <Card className="text-center py-12">
            <GraduationCap className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucun élève trouvé</h3>
            <p className="text-gray-500 dark:text-gray-400">Aucun élève ne correspond à vos critères</p>
          </Card>
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
  student: Student;
  onClose: () => void;
}) {
  const enrolledCourses = [
    { id: '1', title: 'Marketing Digital pour PME', progress: 85, status: 'in_progress' },
    { id: '2', title: 'Initiation à la Programmation Python', progress: 100, status: 'completed' },
    { id: '3', title: 'Gestion Financière pour Artisans', progress: 45, status: 'in_progress' },
  ];

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
            <Avatar name={student.name} size="xl" />
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
              <p className="text-2xl font-bold text-purple-600">{student.certificatesEarned}</p>
              <p className="text-sm text-gray-500">Certificats</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-orange-50 dark:bg-orange-900/20">
              <p className="text-2xl font-bold text-orange-600">{student.progress}%</p>
              <p className="text-sm text-gray-500">Progression</p>
            </div>
          </div>

          {/* Enrolled Courses */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Cours inscrits</h3>
            <div className="space-y-3">
              {enrolledCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">{course.title}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{course.progress}%</span>
                    {course.status === 'completed' && (
                      <Badge variant="success" size="sm">Terminé</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" className="flex-1" leftIcon={<Mail className="w-4 h-4" />}>
              Envoyer un message
            </Button>
            <Button className="flex-1" leftIcon={<MessageSquare className="w-4 h-4" />}>
              Voir les détails
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
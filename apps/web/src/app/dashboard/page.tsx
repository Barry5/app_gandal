'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Users,
  Plus,
  DollarSign,
  Target,
  Clock,
  ChevronRight,
  Upload,
  Wand2,
  Inbox,
  MessageSquare,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge, Avatar, StatsCard } from '@/components/ui/DataDisplay';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { courseApi, type CourseDto } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      router.replace('/dashboard/admin/dashboard');
      return;
    }
    let cancelled = false;
    courseApi
      .listMine()
      .then((items) => {
        if (!cancelled) setCourses(items);
      })
      .catch(() => {
        if (!cancelled) setCourses([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const publishedCount = courses.filter((course) => course.status === 'published').length;
  const totalStudents = courses.reduce((sum, course) => sum + (course.totalStudents || 0), 0);
  const totalRevenue = courses.reduce((sum, course) => sum + (course.priceCfa || 0) * (course.totalStudents || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Bonjour, {user?.name || 'Formateur'} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Voici ce qui se passe avec vos cours</p>
          </div>
          <Link href="/dashboard/courses">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Nouveau cours
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StatsCard
              label="Revenus estimés"
              value={new Intl.NumberFormat('fr-FR').format(totalRevenue) + ' GNF'}
              icon={<DollarSign className="w-6 h-6" />}
              color="green"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <StatsCard
              label="Élèves inscrits"
              value={totalStudents}
              icon={<Users className="w-6 h-6" />}
              color="indigo"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <StatsCard
              label="Cours publiés"
              value={`${publishedCount}/${courses.length}`}
              icon={<BookOpen className="w-6 h-6" />}
              color="purple"
            />
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Courses & Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Actions rapides</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Link
                  href="/dashboard/courses"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">Nouveau cours</span>
                </Link>
                <Link
                  href="/dashboard/courses"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">Importer vidéo</span>
                </Link>
                <Link
                  href="/dashboard/messages"
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">Messages</span>
                </Link>
              </div>
            </Card>

            {/* Recent Courses */}
            <Card padding="none">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Mes cours récents</h3>
                  <p className="text-sm text-gray-500">Gérez et suivez vos formations</p>
                </div>
                <Link href="/dashboard/courses" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  Voir tout <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500">Chargement…</div>
              ) : courses.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <p className="font-medium text-gray-900 dark:text-white">Aucun cours pour le moment</p>
                  <p className="mt-1 text-sm text-gray-500">Créez votre premier cours pour commencer à former des apprenants.</p>
                  <Link href="/dashboard/courses" className="mt-4 inline-block">
                    <Button leftIcon={<Plus className="w-4 h-4" />}>Créer un cours</Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {courses.slice(0, 5).map((course, index) => (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                    >
                      <div className="flex items-center gap-4">
                        {course.thumbnailUrl ? (
                          <Link href={`/dashboard/courses/${course.id}`} className="relative w-24 h-14 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                              <Play className="w-8 h-8 text-white" />
                            </div>
                          </Link>
                        ) : (
                          <div className="flex w-24 h-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 dark:bg-gray-800">
                            <BookOpen className="w-6 h-6" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900 dark:text-white truncate">{course.title}</h4>
                            <Badge variant={course.status === 'published' ? 'success' : 'warning'} size="sm">
                              {course.status === 'published' ? 'Publié' : 'Brouillon'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" /> {course.totalStudents || 0} élèves
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" /> {new Intl.NumberFormat('fr-FR').format(course.priceCfa || 0)} GNF
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            <Card padding="none">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              </div>
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 dark:bg-gray-800">
                  <Inbox className="w-5 h-5" />
                </div>
                <p className="text-sm text-gray-500">Aucune notification pour le moment</p>
              </div>
            </Card>

            {/* Recent Students */}
            <Card padding="none">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Derniers élèves</h3>
                <Link href="/dashboard/students" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Voir tout
                </Link>
              </div>
              {courses.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 dark:bg-gray-800">
                    <Users className="w-5 h-5" />
                  </div>
                  <p className="text-sm text-gray-500">Aucun élève inscrit pour le moment</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {courses
                    .filter((course) => (course.totalStudents || 0) > 0)
                    .slice(0, 4)
                    .map((course) => (
                      <div key={course.id} className="flex items-center gap-3 p-4">
                        <Avatar name={course.title} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{course.title}</p>
                          <p className="text-xs text-gray-500">{course.totalStudents || 0} élève(s) inscrit(s)</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
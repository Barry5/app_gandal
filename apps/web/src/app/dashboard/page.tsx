'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
  Plus,
  DollarSign,
  Target,
  Bell,
  TrendingUp,
  Award,
  Eye,
  Clock,
  ChevronRight,
  Upload,
  Download,
  Play,
  ArrowUpRight,
  ArrowDownRight,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge, Avatar, StatsCard } from '@/components/ui/DataDisplay';
import { CircularProgress } from '@/components/ui/Progress';
import DashboardLayout from '@/components/layout/DashboardLayout';

const recentCourses = [
  {
    id: '1',
    title: 'Marketing Digital pour PME',
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=225&fit=crop',
    students: 45,
    revenue: 2250000,
    status: 'published',
    progress: 78,
  },
  {
    id: '2',
    title: 'Initiation à la Programmation Python',
    thumbnail: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=225&fit=crop',
    students: 32,
    revenue: 1600000,
    status: 'published',
    progress: 65,
  },
  {
    id: '3',
    title: 'Gestion Financière pour Artisans',
    thumbnail: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=225&fit=crop',
    students: 0,
    revenue: 0,
    status: 'draft',
    progress: 30,
  },
];

const recentStudents = [
  { id: '1', name: 'Aminata Koné', enrolledCourses: 3, lastActivity: '2h ago', progress: 85 },
  { id: '2', name: 'Ibrahim Sow', enrolledCourses: 2, lastActivity: '1j ago', progress: 42 },
  { id: '3', name: 'Mariam Diallo', enrolledCourses: 4, lastActivity: '3j ago', progress: 91 },
  { id: '4', name: 'Sékou Touré', enrolledCourses: 1, lastActivity: '5j ago', progress: 15 },
];

const notifications = [
  { id: '1', title: 'Nouveau paiement reçu', message: 'Aminata Koné a acheté "Marketing Digital"', time: 'il y a 10 min', type: 'success' },
  { id: '2', title: 'Quiz terminé', message: 'Ibrahim Sow a complété le quiz Module 3', time: 'il y a 1h', type: 'info' },
  { id: '3', title: 'Nouvel élève', message: 'Mamadou Baldé s\'est inscrit à votre cours', time: 'il y a 3h', type: 'info' },
];

const quickActions = [
  { icon: Plus, label: 'Nouveau cours', href: '/dashboard/courses', color: 'indigo' },
  { icon: Wand2, label: 'Migrer WhatsApp', href: '/dashboard/students', color: 'green' },
  { icon: Upload, label: 'Importer vidéo', href: '/dashboard/courses', color: 'purple' },
  { icon: MessageSquare, label: 'Messages', href: '/dashboard/messages', color: 'blue' },
];

export default function DashboardPage() {
  const totalRevenue = recentCourses.reduce((sum, course) => sum + course.revenue, 0);
  const totalStudents = recentCourses.reduce((sum, course) => sum + course.students, 0);
  const publishedCourses = recentCourses.filter(c => c.status === 'published').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Bonjour, Formateur 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Voici ce qui se passe avec vos cours</p>
          </div>
          <Link href="/dashboard/courses">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              Nouveau cours
            </Button>
          </Link>
        </div>

        {/* WhatsApp Migration Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 p-6"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <Wand2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Migration WhatsApp</h3>
                <p className="text-green-100">Transformez votre groupe en académie en 3 jours</p>
              </div>
            </div>
            <Link href="/dashboard/students">
              <Button className="bg-white text-green-600 hover:bg-green-50 font-semibold">
                Commencer maintenant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StatsCard
              label="Revenus totaux"
              value={new Intl.NumberFormat('fr-FR').format(totalRevenue) + ' GNF'}
              icon={<DollarSign className="w-6 h-6" />}
              trend={{ value: 12.5, isPositive: true }}
              color="green"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <StatsCard
              label="Élèves actifs"
              value={totalStudents}
              icon={<Users className="w-6 h-6" />}
              trend={{ value: 8.2, isPositive: true }}
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
              value={publishedCourses}
              icon={<BookOpen className="w-6 h-6" />}
              color="purple"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <StatsCard
              label="Taux de complétion"
              value="68%"
              icon={<Target className="w-6 h-6" />}
              trend={{ value: 3.1, isPositive: true }}
              color="orange"
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {quickActions.map((action, index) => (
                  <Link
                    key={index}
                    href={action.href}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                      action.color === 'indigo' ? 'from-indigo-500 to-indigo-600' :
                      action.color === 'purple' ? 'from-purple-500 to-purple-600' :
                      action.color === 'green' ? 'from-emerald-500 to-emerald-600' :
                      action.color === 'blue' ? 'from-blue-500 to-blue-600' :
                      'from-orange-500 to-orange-600'
                    } flex items-center justify-center text-white`}>
                      <action.icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">{action.label}</span>
                  </Link>
                ))}
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
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <Link href={`/dashboard/courses/${course.id}`} className="relative w-24 h-14 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">{course.title}</h4>
                          <Badge variant={course.status === 'published' ? 'success' : 'warning'} size="sm">
                            {course.status === 'published' ? 'Publié' : 'Brouillon'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" /> {course.students} élèves
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" /> {new Intl.NumberFormat('fr-FR').format(course.revenue)} GNF
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Notifications */}
            <Card padding="none">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                <Badge variant="info" size="sm">{notifications.length} nouvelles</Badge>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notif, index) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        notif.type === 'success' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20'
                      }`}>
                        {notif.type === 'success' ? <DollarSign className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
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
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {recentStudents.map((student, index) => (
                  <motion.div
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={student.name} size="sm" />
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">{student.name}</p>
                        <p className="text-xs text-gray-500">{student.enrolledCourses} cours • {student.lastActivity}</p>
                      </div>
                      <CircularProgress value={student.progress} size={36} strokeWidth={3} showValue={false} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Achievements */}
            <Card variant="gradient" padding="md">
              <div className="text-center text-white">
                <Award className="w-12 h-12 mx-auto mb-3 opacity-80" />
                <h3 className="text-lg font-bold">Félicitations !</h3>
                <p className="text-sm text-white/80 mt-1">Vous avez formé 95 élèves ce mois</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Badge variant="default" className="bg-white/20 text-white border-0">Top 10%</Badge>
                  <Badge variant="default" className="bg-white/20 text-white border-0">+15% ce mois</Badge>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  BookOpen,
  Award,
  Eye,
  Clock,
  Star,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  BarChart3,
  PieChart,
  Activity,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge, StatsCard } from '@/components/ui/DataDisplay';
import { Button } from '@/components/ui/Button';
import DashboardLayout from '@/components/layout/DashboardLayout';

const monthlyData = [
  { month: 'Jan', revenue: 450000, students: 12, courses: 1 },
  { month: 'Fév', revenue: 680000, students: 18, courses: 1 },
  { month: 'Mar', revenue: 520000, students: 15, courses: 2 },
  { month: 'Avr', revenue: 890000, students: 24, courses: 2 },
  { month: 'Mai', revenue: 750000, students: 21, courses: 2 },
  { month: 'Juin', revenue: 1200000, students: 32, courses: 3 },
];

const topCourses = [
  { id: '1', title: 'Marketing Digital pour PME', students: 45, revenue: 2250000, rating: 4.5, completion: 78 },
  { id: '2', title: 'Initiation à la Programmation Python', students: 32, revenue: 1600000, rating: 4.8, completion: 85 },
  { id: '3', title: 'Gestion Financière pour Artisans', students: 18, revenue: 0, rating: 4.2, completion: 65 },
];

const recentActivity = [
  { id: '1', type: 'enrollment', message: 'Aminata Koné s\'est inscrite à "Marketing Digital"', time: 'il y a 10 min', icon: 'user-plus' },
  { id: '2', type: 'completion', message: 'Ibrahim Sow a terminé "Initiation Python"', time: 'il y a 1h', icon: 'check' },
  { id: '3', type: 'payment', message: 'Paiement de 75 000 GNF reçu', time: 'il y a 2h', icon: 'dollar' },
  { id: '4', type: 'rating', message: 'Nouveau avis: 5 étoiles sur "Marketing Digital"', time: 'il y a 3h', icon: 'star' },
  { id: '5', type: 'certificate', message: 'Certificat délivré à Mariam Diallo', time: 'il y a 5h', icon: 'award' },
];

const deviceStats = [
  { device: 'Mobile', percentage: 45, color: 'bg-indigo-500' },
  { device: 'Desktop', percentage: 35, color: 'bg-purple-500' },
  { device: 'Tablette', percentage: 20, color: 'bg-emerald-500' },
];

const locationStats = [
  { country: 'Guinée', students: 65, percentage: 65 },
  { country: 'Sénégal', students: 15, percentage: 15 },
  { country: 'Côte d\'Ivoire', students: 10, percentage: 10 },
  { country: 'Autres', students: 10, percentage: 10 },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const totalRevenue = monthlyData.reduce((acc, m) => acc + m.revenue, 0);
  const totalStudents = monthlyData.reduce((acc, m) => acc + m.students, 0);
  const avgCompletion = Math.round(topCourses.reduce((acc, c) => acc + c.completion, 0) / topCourses.length);

  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400">Suivez vos performances et statistiques</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="7d">7 derniers jours</option>
              <option value="30d">30 derniers jours</option>
              <option value="90d">90 derniers jours</option>
              <option value="12m">12 derniers mois</option>
            </select>
            <Button variant="outline" leftIcon={<Download className="w-5 h-5" />}>
              Exporter
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <StatsCard
              label="Revenus totaux"
              value={`${(totalRevenue / 1000000).toFixed(1)}M GNF`}
              icon={<DollarSign className="w-6 h-6" />}
              trend={{ value: 23.5, isPositive: true }}
              color="green"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <StatsCard
              label="Nouveaux élèves"
              value={totalStudents}
              icon={<Users className="w-6 h-6" />}
              trend={{ value: 12.3, isPositive: true }}
              color="indigo"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <StatsCard
              label="Taux de complétion"
              value={`${avgCompletion}%`}
              icon={<Award className="w-6 h-6" />}
              trend={{ value: 5.2, isPositive: true }}
              color="purple"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <StatsCard
              label="Vues totales"
              value="12,450"
              icon={<Eye className="w-6 h-6" />}
              trend={{ value: 8.7, isPositive: false }}
              color="orange"
            />
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <div className="lg:col-span-2">
            <Card padding="none">
              <CardHeader className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenus</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Evolution des revenus sur 6 mois</p>
                  </div>
                  <div className="flex gap-2">
                    {['revenue', 'students', 'courses'].map((metric) => (
                      <button
                        key={metric}
                        onClick={() => setSelectedMetric(metric)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          selectedMetric === metric
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'
                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {metric === 'revenue' ? 'Revenus' : metric === 'students' ? 'Élèves' : 'Cours'}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-64 flex items-end justify-between gap-2">
                  {monthlyData.map((data, index) => {
                    const value = selectedMetric === 'revenue' ? data.revenue : 
                                  selectedMetric === 'students' ? data.students * 30000 : 
                                  data.courses * 150000;
                    const height = (value / maxRevenue) * 100;
                    
                    return (
                      <motion.div
                        key={data.month}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="flex-1 relative group"
                      >
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-16 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg opacity-80 group-hover:opacity-100 transition-opacity" style={{ height: '100%' }} />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {selectedMetric === 'revenue' 
                            ? `${(data.revenue / 1000).toFixed(0)}k GNF`
                            : selectedMetric === 'students' 
                            ? `${data.students} élèves`
                            : `${data.courses} cours`
                          }
                        </div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400">
                          {data.month}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Device Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Appareils</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Répartition par type</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {deviceStats.map((stat) => (
                <div key={stat.device}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stat.device}</span>
                    <span className="text-sm text-gray-500">{stat.percentage}%</span>
                  </div>
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${stat.color}`}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Total</span>
                  <span className="font-semibold text-gray-900 dark:text-white">100%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Courses */}
          <div className="lg:col-span-2">
            <Card padding="none">
              <CardHeader className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Top des cours</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cours les plus populaires</p>
                  </div>
                </div>
              </CardHeader>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {topCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white truncate">{course.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" /> {course.students}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" /> {course.rating}
                          </span>
                          <span className="flex items-center gap-1">
                            <Award className="w-4 h-4" /> {course.completion}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-green-600">
                          {course.revenue === 0 ? 'Gratuit' : `${(course.revenue / 1000).toFixed(0)}k GNF`}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>

          {/* Location Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Localisation</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Répartition par pays</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {locationStats.map((stat) => (
                <div key={stat.country} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{stat.country}</span>
                      <span className="text-sm text-gray-500">{stat.students}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${stat.percentage}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="h-full bg-indigo-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card padding="none">
          <CardHeader className="p-6 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Activité récente</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Dernières actions sur la plateforme</p>
              </div>
            </div>
          </CardHeader>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  activity.type === 'enrollment' ? 'bg-blue-100 text-blue-600' :
                  activity.type === 'completion' ? 'bg-green-100 text-green-600' :
                  activity.type === 'payment' ? 'bg-emerald-100 text-emerald-600' :
                  activity.type === 'rating' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-purple-100 text-purple-600'
                }`}>
                  {activity.type === 'enrollment' ? <Users className="w-5 h-5" /> :
                   activity.type === 'completion' ? <Award className="w-5 h-5" /> :
                   activity.type === 'payment' ? <DollarSign className="w-5 h-5" /> :
                   activity.type === 'rating' ? <Star className="w-5 h-5" /> :
                   <Award className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">{activity.message}</p>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
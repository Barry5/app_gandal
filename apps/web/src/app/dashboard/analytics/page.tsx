'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Users,
  BookOpen,
  Award,
  Download,
  Star,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/DataDisplay';
import { Button } from '@/components/ui/Button';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getAuthToken, getApiErrorMessage } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

type AnalyticsDto = {
  revenue: number;
  payments: number;
  students: number;
  totalCourses: number;
  publishedCourses: number;
  avgCompletion: number;
  monthly: { month: string; revenue: number; students: number }[];
  topCourses: { id: string; title: string; status: string; students: number; revenue: number; avgCompletion: number }[];
  recentActivity: { id: string; date: string; type: 'enrollment'; userName: string; courseTitle: string }[];
};

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fév', '03': 'Mar', '04': 'Avr', '05': 'Mai', '06': 'Juin',
  '07': 'Juil', '08': 'Août', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Déc',
};

function formatMonth(month: string) {
  const [, mm] = month.split('-');
  return MONTH_LABELS[mm] || month;
}

function formatDate(date: string) {
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

function exportCsv(rows: { month: string; revenue: number; students: number }[]) {
  const header = 'Mois;Revenus (GNF);Nouveaux élèves\n';
  const body = rows
    .map((row) => `${formatMonth(row.month)};${row.revenue};${row.students}`)
    .join('\n');
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsDto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getAuthToken();
      try {
        const response = await fetch(`${API_URL}/analytics/creator`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload));
        }
        if (!cancelled) setData(payload as AnalyticsDto);
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

  const monthly = data?.monthly || [];
  const maxRevenue = Math.max(1, ...monthly.map((m) => m.revenue));
  const hasData = Boolean(data && (data.revenue > 0 || data.students > 0 || data.totalCourses > 0));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400">Suivez vos performances et statistiques</p>
          </div>
          {monthly.length > 0 && (
            <Button variant="outline" leftIcon={<Download className="w-5 h-5" />} onClick={() => exportCsv(monthly)}>
              Exporter
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="p-12 text-center text-sm text-gray-500">Chargement des statistiques…</div>
        )}

        {!loading && !error && !hasData && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center dark:border-gray-700 dark:bg-gray-800/50">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 dark:bg-indigo-900/20">
              <TrendingUp className="w-7 h-7" />
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Aucune statistique pour le moment</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
              {user?.role === 'admin'
                ? 'Les statistiques apparaîtront dès que des cours seront publiés et vendus sur la plateforme.'
                : 'Les statistiques apparaîtront dès que vos cours auront des élèves inscrits et des paiements.'}
            </p>
          </div>
        )}

        {data && hasData && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <StatsCard
                  label="Revenus totaux"
                  value={`${new Intl.NumberFormat('fr-FR').format(data.revenue)} GNF`}
                  icon={<DollarSign className="w-6 h-6" />}
                  color="green"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
                <StatsCard
                  label="Élèves inscrits"
                  value={data.students}
                  icon={<Users className="w-6 h-6" />}
                  color="indigo"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
                <StatsCard
                  label="Cours publiés"
                  value={`${data.publishedCourses}/${data.totalCourses}`}
                  icon={<BookOpen className="w-6 h-6" />}
                  color="purple"
                />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.3 }}>
                <StatsCard
                  label="Taux de complétion"
                  value={`${data.avgCompletion}%`}
                  icon={<Award className="w-6 h-6" />}
                  color="orange"
                />
              </motion.div>
            </div>

            {/* Revenue Chart */}
            <Card padding="none">
              <CardHeader className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <CardTitle>Revenus</CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Évolution des revenus (12 derniers mois)</p>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {monthly.length === 0 ? (
                  <p className="py-10 text-center text-sm text-gray-500">Aucun paiement enregistré</p>
                ) : (
                  <div className="h-64 flex items-end justify-between gap-2">
                    {monthly.map((dataPoint, index) => (
                      <motion.div
                        key={dataPoint.month}
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(4, (dataPoint.revenue / maxRevenue) * 100)}%` }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="flex-1 relative group"
                      >
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-16 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t-lg opacity-80 group-hover:opacity-100 transition-opacity" style={{ height: '100%' }} />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {new Intl.NumberFormat('fr-FR').format(dataPoint.revenue)} GNF
                        </div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400">
                          {formatMonth(dataPoint.month)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Courses */}
              <div className="lg:col-span-2">
                <Card padding="none">
                  <CardHeader className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div>
                      <CardTitle>Top des cours</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cours les plus populaires</p>
                    </div>
                  </CardHeader>
                  {data.topCourses.length === 0 ? (
                    <p className="p-8 text-center text-sm text-gray-500">Aucun cours</p>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {data.topCourses.map((course, index) => (
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
                                  <Star className="w-4 h-4" /> {course.avgCompletion}%
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-semibold text-green-600">
                                {course.revenue === 0 ? 'Gratuit' : `${new Intl.NumberFormat('fr-FR').format(course.revenue)} GNF`}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Recent Activity */}
              <Card padding="none">
                <CardHeader className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div>
                    <CardTitle>Activité récente</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Dernières inscriptions</p>
                  </div>
                </CardHeader>
                {data.recentActivity.length === 0 ? (
                  <p className="p-8 text-center text-sm text-gray-500">Aucune activité récente</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {data.recentActivity.map((activity) => (
                      <div key={activity.id} className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/20">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white truncate">
                            {activity.userName} s&apos;est inscrit(e) à « {activity.courseTitle} »
                          </p>
                          <span className="text-xs text-gray-400">{formatDate(activity.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
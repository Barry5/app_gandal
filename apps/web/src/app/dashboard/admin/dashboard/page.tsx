'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Landmark,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/DataDisplay';
import { financeApi, type AdminDashboardDto } from '@/lib/api';
import { toast } from 'sonner';

function formatMoney(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString('fr-FR')} GNF`;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      const payload = await financeApi.adminDashboard();
      setData(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const overview = data?.overview;
  const financial = data?.financial;
  const maxActivations = Math.max(1, ...(data?.activationsByDay || []).map((item) => item.activations));
  const maxCourses = Math.max(1, ...(data?.categories || []).map((item) => item.courses));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-red-600">
              <ShieldCheck className="h-4 w-4" />
              Pilotage de la plateforme
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Vue admin</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Indicateurs globaux : formateurs, apprenants, cours, inscriptions, activations et revenus.
            </p>
          </div>
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={loadDashboard} disabled={isLoading}>
            Actualiser
          </Button>
        </div>

        {isLoading || !data ? (
          <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
            Chargement des indicateurs...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard label="Formateurs" value={overview!.total_creators} icon={<Users className="h-6 w-6" />} color="indigo" />
              <StatsCard label="Apprenants" value={overview!.total_learners} icon={<GraduationCap className="h-6 w-6" />} color="purple" />
              <StatsCard label="Cours total" value={overview!.total_courses} icon={<BookOpen className="h-6 w-6" />} color="blue" />
              <StatsCard label="Cours publies" value={overview!.published_courses} icon={<BookOpen className="h-6 w-6" />} color="green" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard label="Inscriptions payees" value={overview!.total_enrollments} icon={<CheckCircle2 className="h-6 w-6" />} color="green" />
              <StatsCard label="Activations de cours" value={overview!.total_activations} icon={<Zap className="h-6 w-6" />} color="indigo" />
              <StatsCard label="Declarations en attente" value={overview!.pending_submissions} icon={<Clock3 className="h-6 w-6" />} color="orange" />
              <StatsCard label="Paiements verifies" value={overview!.verified_submissions} icon={<CheckCircle2 className="h-6 w-6" />} color="blue" />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatsCard label="Revenu brut" value={formatMoney(financial!.gross_revenue)} icon={<TrendingUp className="h-6 w-6" />} color="indigo" />
              <StatsCard label="Commission plateforme" value={formatMoney(financial!.platform_revenue)} icon={<Landmark className="h-6 w-6" />} color="blue" />
              <StatsCard label="Du aux formateurs" value={formatMoney(financial!.trainer_due)} icon={<Wallet className="h-6 w-6" />} color="orange" />
              <StatsCard label="Verse aux formateurs" value={formatMoney(financial!.trainer_paid)} icon={<Wallet className="h-6 w-6" />} color="green" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Activations (30 derniers jours)</CardTitle>
                </CardHeader>
                {data.activationsByDay.length === 0 ? (
                  <p className="pb-6 text-center text-sm text-slate-500">Aucune activation sur la periode</p>
                ) : (
                  <div className="flex h-40 items-end gap-1 px-4 pb-4">
                    {data.activationsByDay.map((item) => (
                      <div key={item.day} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[10px] font-semibold text-slate-500">{item.activations}</span>
                        <div
                          className="w-full rounded-t bg-indigo-500"
                          style={{ height: `${Math.max(8, (item.activations / maxActivations) * 120)}px` }}
                        />
                        <span className="text-[9px] text-slate-400">{item.day.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Cours par categorie</CardTitle>
                </CardHeader>
                {data.categories.length === 0 ? (
                  <p className="pb-6 text-center text-sm text-slate-500">Aucune categorie</p>
                ) : (
                  <div className="space-y-3 px-4 pb-5">
                    {data.categories.map((item) => (
                      <div key={item.category} className="flex items-center gap-3">
                        <span className="w-40 truncate text-sm text-slate-600 dark:text-slate-300">{item.category}</span>
                        <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                            style={{ width: `${(item.courses / maxCourses) * 100}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-sm font-semibold text-slate-900 dark:text-white">{item.courses}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/admin/activations" className="text-sm font-medium text-red-600 hover:underline">
                Traiter les activations →
              </Link>
              <Link href="/dashboard/admin/finances" className="text-sm font-medium text-red-600 hover:underline">
                Gerer le ledger financier →
              </Link>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
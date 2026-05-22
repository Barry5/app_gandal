'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Unlock,
  Users,
  Wallet,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar, Badge, StatsCard } from '@/components/ui/DataDisplay';
import { adminApi, type AdminCreatorDto } from '@/lib/api';
import { toast } from 'sonner';

type StatusFilter = 'all' | 'active' | 'blocked';

function formatMoney(value: number) {
  return value <= 0 ? '0 GNF' : value.toLocaleString('fr-FR') + ' GNF';
}

function formatDate(value?: string | null) {
  if (!value) return 'Jamais';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
}

export default function AdminGovernancePage() {
  const [creators, setCreators] = useState<AdminCreatorDto[]>([]);
  const [summary, setSummary] = useState({ total_creators: 0, active_creators: 0, blocked_creators: 0 });
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const loadCreators = async () => {
    try {
      setIsLoading(true);
      const payload = await adminApi.listCreators({ status, search, limit: 100 });
      setCreators(payload.creators);
      setSummary({
        total_creators: Number(payload.summary.total_creators || 0),
        active_creators: Number(payload.summary.active_creators || 0),
        blocked_creators: Number(payload.summary.blocked_creators || 0),
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(loadCreators, 250);
    return () => window.clearTimeout(timeout);
  }, [status, search]);

  const totals = useMemo(() => {
    return creators.reduce(
      (acc, creator) => ({
        courses: acc.courses + creator.coursesCount,
        students: acc.students + creator.totalStudents,
        revenue: acc.revenue + creator.revenueCfa,
      }),
      { courses: 0, students: 0, revenue: 0 },
    );
  }, [creators]);

  const toggleCreator = async (creator: AdminCreatorDto) => {
    const nextStatus = !creator.isActive;
    const reason = nextStatus
      ? 'Deblocage administratif'
      : 'Blocage administratif depuis le panneau admin';

    try {
      setPendingUserId(creator.id);
      await adminApi.setUserStatus(creator.id, nextStatus, reason);
      setCreators((current) => current.map((item) => item.id === creator.id ? { ...item, isActive: nextStatus } : item));
      toast.success(nextStatus ? 'Formateur debloque' : 'Formateur bloque');
      await loadCreators();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action impossible');
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
              <ShieldCheck className="h-4 w-4" />
              Gouvernance plateforme
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Administration des formateurs</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              L admin supervise les comptes, bloque ou debloque les acces, consulte les indicateurs, mais ne modifie pas les cours appartenant aux formateurs.
            </p>
          </div>
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={loadCreators} disabled={isLoading}>
            Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard label="Formateurs" value={summary.total_creators} icon={<Users className="h-6 w-6" />} color="indigo" />
          <StatsCard label="Actifs" value={summary.active_creators} icon={<CheckCircle2 className="h-6 w-6" />} color="green" />
          <StatsCard label="Bloques" value={summary.blocked_creators} icon={<Lock className="h-6 w-6" />} color="red" />
          <StatsCard label="Revenus suivis" value={formatMoney(totals.revenue)} icon={<Wallet className="h-6 w-6" />} color="orange" />
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher par nom, email ou academie..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
                />
              </div>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="blocked">Bloques</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card padding="none">
          <CardHeader>
            <CardTitle>Formateurs</CardTitle>
          </CardHeader>
          {isLoading ? (
            <div className="p-10 text-center text-slate-500">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
              Chargement des comptes...
            </div>
          ) : creators.length === 0 ? (
            <div className="p-10 text-center">
              <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
              <p className="font-semibold text-slate-900 dark:text-white">Aucun formateur trouve</p>
              <p className="mt-1 text-sm text-slate-500">Ajustez les filtres ou creez un compte formateur.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {creators.map((creator, index) => (
                <motion.div
                  key={creator.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <Avatar name={creator.name} src={creator.avatarUrl || undefined} size="lg" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-950 dark:text-white">{creator.name}</h3>
                        <Badge variant={creator.isActive ? 'success' : 'error'} size="sm">
                          {creator.isActive ? 'Actif' : 'Bloque'}
                        </Badge>
                      </div>
                      <p className="truncate text-sm text-slate-500">{creator.email}</p>
                      <p className="mt-1 text-xs text-slate-400">{creator.businessName || 'Academie sans nom'} · Derniere connexion : {formatDate(creator.lastLoginAt)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <BookOpen className="mx-auto mb-1 h-4 w-4 text-indigo-500" />
                      <p className="font-semibold text-slate-950 dark:text-white">{creator.coursesCount}</p>
                      <p className="text-xs text-slate-500">Cours</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <Users className="mx-auto mb-1 h-4 w-4 text-emerald-500" />
                      <p className="font-semibold text-slate-950 dark:text-white">{creator.totalStudents}</p>
                      <p className="text-xs text-slate-500">Apprenants</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <Wallet className="mx-auto mb-1 h-4 w-4 text-orange-500" />
                      <p className="truncate font-semibold text-slate-950 dark:text-white">{formatMoney(creator.revenueCfa)}</p>
                      <p className="text-xs text-slate-500">Revenus</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant={creator.isActive ? 'error' : 'secondary'}
                      leftIcon={creator.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      onClick={() => toggleCreator(creator)}
                      isLoading={pendingUserId === creator.id}
                      className="w-full lg:w-auto"
                    >
                      {creator.isActive ? 'Bloquer' : 'Debloquer'}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

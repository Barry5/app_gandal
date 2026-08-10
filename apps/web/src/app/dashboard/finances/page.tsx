'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  Clock3,
  HandCoins,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, StatsCard } from '@/components/ui/DataDisplay';
import { financeApi, type FinancialTransactionDto } from '@/lib/api';
import { toast } from 'sonner';

type StatusFilter = 'ALL' | 'DUE' | 'VALIDATED' | 'PAID';

const statusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'error' | 'info' }> = {
  DUE: { label: 'Due', variant: 'warning' },
  VALIDATED: { label: 'Validee', variant: 'info' },
  PAID: { label: 'Payee', variant: 'success' },
};

function formatMoney(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString('fr-FR')} GNF`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function CreatorFinancesPage() {
  const [transactions, setTransactions] = useState<FinancialTransactionDto[]>([]);
  const [summary, setSummary] = useState({
    total_transactions: 0,
    gross_revenue: 0,
    platform_commission: 0,
    net_revenue: 0,
    due_amount: 0,
    validated_amount: 0,
    paid_amount: 0,
  });
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [transactionsPayload, summaryPayload] = await Promise.all([
        financeApi.creatorTransactions({ status: filter }),
        financeApi.creatorSummary(),
      ]);
      setTransactions(transactionsPayload.transactions);
      setSummary(summaryPayload.summary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-indigo-600">
              <Wallet className="h-4 w-4" />
              Mes commissions
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Finances</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Vos commissions sont fgees a chaque activation de cours (montant brut moins la commission plateforme). Suivez l etat de vos versements.
            </p>
          </div>
          <Button variant="outline" leftIcon={<TrendingUp className="h-4 w-4" />} onClick={loadData} disabled={isLoading}>
            Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard label="Revenu brut (ventes)" value={formatMoney(summary.gross_revenue)} icon={<TrendingUp className="h-6 w-6" />} color="indigo" />
          <StatsCard label="Commission plateforme" value={formatMoney(summary.platform_commission)} icon={<HandCoins className="h-6 w-6" />} color="blue" />
          <StatsCard label="Net a percevoir" value={formatMoney(summary.due_amount + summary.validated_amount)} icon={<Clock3 className="h-6 w-6" />} color="orange" />
          <StatsCard label="Deja verse" value={formatMoney(summary.paid_amount)} icon={<Banknote className="h-6 w-6" />} color="green" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatsCard label="Commissions dues" value={formatMoney(summary.due_amount)} icon={<Clock3 className="h-6 w-6" />} color="orange" />
          <StatsCard label="Commissions validees" value={formatMoney(summary.validated_amount)} icon={<CheckCircle2 className="h-6 w-6" />} color="blue" />
          <StatsCard label="Ventes totales" value={summary.total_transactions} icon={<TrendingUp className="h-6 w-6" />} color="indigo" />
        </div>

        <Card>
          <div className="flex flex-wrap gap-2 p-4">
            {(['ALL', 'DUE', 'VALIDATED', 'PAID'] as StatusFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFilter(option)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filter === option
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {option === 'ALL' ? 'Toutes' : option === 'DUE' ? 'Dues' : option === 'VALIDATED' ? 'Validees' : 'Payees'}
              </button>
            ))}
          </div>
        </Card>

        <Card padding="none">
          <CardHeader className="p-4 pb-0">
            <CardTitle>Historique des commissions</CardTitle>
          </CardHeader>
          {isLoading ? (
            <div className="p-10 text-center text-slate-500">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
              Chargement de vos commissions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-slate-900 dark:text-white">Aucune commission</p>
              <p className="mt-1 text-sm text-slate-500">Vos commissions apparaitront des qu un apprenant est active sur l un de vos cours.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((transaction) => {
                const cfg = statusConfig[transaction.status] || statusConfig.DUE;
                return (
                  <div key={transaction.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] lg:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-slate-950 dark:text-white">{transaction.course_title || 'Cours'}</h3>
                        <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Apprenant : {transaction.student_name || '—'} · {formatDate(transaction.created_at || transaction.createdAt)}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="flex justify-between gap-3 text-slate-500 dark:text-slate-400">
                        <span>Brut</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(transaction.grossAmount)}</span>
                      </p>
                      <p className="flex justify-between gap-3 text-slate-500 dark:text-slate-400">
                        <span>Commission ({transaction.commission_rate ?? 0}%)</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">{formatMoney(transaction.platformCommission)}</span>
                      </p>
                      <p className="flex justify-between gap-3 text-slate-500 dark:text-slate-400">
                        <span>Votre part</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(transaction.trainerAmount)}</span>
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {transaction.payment_reference && <p className="font-mono">{transaction.payment_reference}</p>}
                      {transaction.paid_at && <p className="mt-1">Versee le {formatDate(transaction.paid_at)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
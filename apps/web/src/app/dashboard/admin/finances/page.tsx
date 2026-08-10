'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Banknote,
  CheckCircle2,
  HandCoins,
  Landmark,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar, Badge, StatsCard } from '@/components/ui/DataDisplay';
import { financeApi, type FinancialTransactionDto } from '@/lib/api';
import { toast } from 'sonner';

type StatusFilter = 'ALL' | 'DUE' | 'VALIDATED' | 'PAID';

const statusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'error' | 'info' }> = {
  DUE: { label: 'Due', variant: 'warning' },
  VALIDATED: { label: 'Validee', variant: 'info' },
  PAID: { label: 'Payee', variant: 'success' },
};

const methodLabels: Record<string, string> = {
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  card: 'Carte bancaire',
  bank_transfer: 'Virement bancaire',
};

function formatMoney(value: number | null | undefined) {
  return `${Number(value || 0).toLocaleString('fr-FR')} GNF`;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function AdminFinancesPage() {
  const [transactions, setTransactions] = useState<FinancialTransactionDto[]>([]);
  const [summary, setSummary] = useState({
    total_gross: 0,
    total_commission: 0,
    total_trainer: 0,
    total_due_to_trainers: 0,
    total_paid_to_trainers: 0,
  });
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const payload = await financeApi.adminListTransactions({ status: filter, limit: 100 });
      setTransactions(payload.transactions);
      setSummary(payload.summary);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleValidate = async (transaction: FinancialTransactionDto) => {
    try {
      setPendingAction(transaction.id);
      await financeApi.validateTransaction(transaction.id);
      toast.success('Commission validee. Elle est maintenant payee au prochain reglement.');
      await loadTransactions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action impossible');
    } finally {
      setPendingAction(null);
    }
  };

  const handlePay = async (transaction: FinancialTransactionDto) => {
    try {
      setPendingAction(transaction.id);
      await financeApi.payTransaction(transaction.id);
      toast.success(`${formatMoney(transaction.trainerAmount)} marques comme payes au formateur.`);
      await loadTransactions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action impossible');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-red-600">
              <Landmark className="h-4 w-4" />
              Ledger financier
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Gestion des commissions</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Chaque activation fige la commission plateforme (en sus) et le montant reverse au formateur. Suivez les commissions dues, validees et payees.
            </p>
          </div>
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={loadTransactions} disabled={isLoading}>
            Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard label="Revenu brut total" value={formatMoney(summary.total_gross)} icon={<TrendingUp className="h-6 w-6" />} color="indigo" />
          <StatsCard label="Commission plateforme" value={formatMoney(summary.total_commission)} icon={<ShieldCheck className="h-6 w-6" />} color="blue" />
          <StatsCard label="Du aux formateurs" value={formatMoney(summary.total_due_to_trainers)} icon={<HandCoins className="h-6 w-6" />} color="orange" />
          <StatsCard label="Deja paye aux formateurs" value={formatMoney(summary.total_paid_to_trainers)} icon={<Banknote className="h-6 w-6" />} color="green" />
        </div>

        <Card>
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
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
          </div>
        </Card>

        <Card padding="none">
          <CardHeader className="p-4 pb-0">
            <CardTitle>Commissions par transaction</CardTitle>
          </CardHeader>
          {isLoading ? (
            <div className="p-10 text-center text-slate-500">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
              Chargement du ledger...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-slate-900 dark:text-white">Aucune transaction</p>
              <p className="mt-1 text-sm text-slate-500">Les activations de cours alimenteront le ledger financier.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.map((transaction) => {
                const cfg = statusConfig[transaction.status] || statusConfig.DUE;
                const canValidate = transaction.status === 'DUE';
                const canPay = transaction.status === 'DUE' || transaction.status === 'VALIDATED';
                return (
                  <div key={transaction.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={transaction.trainer_name || 'Formateur'} size="lg" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-slate-950 dark:text-white">{transaction.trainer_name || 'Formateur'}</h3>
                          <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                        </div>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{transaction.trainer_email}</p>
                        <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                          {transaction.course_title} · {transaction.student_name} · {formatDate(transaction.created_at || transaction.createdAt)}
                        </p>
                      </div>
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
                        <span>Formateur</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(transaction.trainerAmount)}</span>
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <p>{methodLabels[transaction.payment_method || ''] || transaction.payment_method || '—'}</p>
                      {transaction.payment_reference && <p className="font-mono">{transaction.payment_reference}</p>}
                      {transaction.paid_at && <p className="mt-1">Payee le {formatDate(transaction.paid_at)}</p>}
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {canValidate && (
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<CheckCircle2 className="h-4 w-4" />}
                          isLoading={pendingAction === transaction.id}
                          onClick={() => handleValidate(transaction)}
                        >
                          Valider
                        </Button>
                      )}
                      {canPay && (
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Banknote className="h-4 w-4" />}
                          isLoading={pendingAction === transaction.id}
                          onClick={() => handlePay(transaction)}
                        >
                          Marquer payee
                        </Button>
                      )}
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
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Zap,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Avatar, Badge, StatsCard } from '@/components/ui/DataDisplay';
import { Textarea } from '@/components/ui/Input';
import { financeApi, type PaymentSubmissionDto } from '@/lib/api';
import { toast } from 'sonner';

type StatusFilter = 'ALL' | 'PAYMENT_SUBMITTED' | 'PAYMENT_VERIFIED' | 'PAYMENT_REJECTED' | 'ACTIVATED';

type ActivationRow = {
  id: string;
  course_title?: string | null;
  course_thumbnail?: string | null;
  student_name?: string | null;
  student_email?: string | null;
  trainer_name?: string | null;
  activated_by_name?: string | null;
  price_at_activation?: number;
  gross_amount?: number;
  platform_commission?: number;
  trainer_amount?: number;
  commission_rate?: number;
  payment_reference?: string | null;
  payment_method?: string | null;
  activated_at?: string | null;
  events?: Array<{ type: string; at: string; by?: string; note?: string }>;
};

const statusConfig: Record<string, { label: string; variant: 'warning' | 'success' | 'error' | 'default' | 'info' }> = {
  PENDING_PAYMENT: { label: 'En attente', variant: 'warning' },
  PAYMENT_SUBMITTED: { label: 'Declare', variant: 'warning' },
  PAYMENT_VERIFIED: { label: 'Verifie', variant: 'success' },
  PAYMENT_REJECTED: { label: 'Rejete', variant: 'error' },
  ACTIVATED: { label: 'Active', variant: 'info' },
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

export default function AdminActivationsPage() {
  const [submissions, setSubmissions] = useState<PaymentSubmissionDto[]>([]);
  const [summary, setSummary] = useState({ pending: 0, verified: 0, activated: 0, rejected: 0 });
  const [filter, setFilter] = useState<StatusFilter>('PAYMENT_SUBMITTED');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [detail, setDetail] = useState<PaymentSubmissionDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [tab, setTab] = useState<'submissions' | 'journal'>('submissions');
  const [activations, setActivations] = useState<ActivationRow[]>([]);
  const [isJournalLoading, setIsJournalLoading] = useState(false);

  const loadSubmissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const payload = await financeApi.adminListSubmissions({ status: filter, search, limit: 60 });
      setSubmissions(payload.submissions);
      const [pending, verified, activated, rejected] = await Promise.all([
        financeApi.adminListSubmissions({ status: 'PAYMENT_SUBMITTED', limit: 1 }),
        financeApi.adminListSubmissions({ status: 'PAYMENT_VERIFIED', limit: 1 }),
        financeApi.adminListSubmissions({ status: 'ACTIVATED', limit: 1 }),
        financeApi.adminListSubmissions({ status: 'PAYMENT_REJECTED', limit: 1 }),
      ]);
      setSummary({
        pending: pending.pagination.total,
        verified: verified.pagination.total,
        activated: activated.pagination.total,
        rejected: rejected.pagination.total,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement impossible');
    } finally {
      setIsLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    const timeout = window.setTimeout(loadSubmissions, 250);
    return () => window.clearTimeout(timeout);
  }, [loadSubmissions]);

  const loadActivations = useCallback(async () => {
    try {
      setIsJournalLoading(true);
      const payload = await financeApi.adminListActivations({ limit: 50 });
      setActivations(payload.activations);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement du journal impossible');
    } finally {
      setIsJournalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'journal') loadActivations();
  }, [tab, loadActivations]);

  const handleVerify = async (submission: PaymentSubmissionDto) => {
    try {
      setPendingAction(submission.id);
      await financeApi.verifySubmission(submission.id);
      toast.success('Paiement verifie. Vous pouvez activer le cours.');
      await loadSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action impossible');
    } finally {
      setPendingAction(null);
    }
  };

  const handleActivate = async (submission: PaymentSubmissionDto) => {
    try {
      setPendingAction(submission.id);
      const result = await financeApi.activateSubmission(submission.id);
      toast.success(
        `Cours active : ${formatMoney(result.grossAmount)} bruts, ${formatMoney(result.trainerAmount)} reverses au formateur (${formatMoney(result.platformCommission)} de commission plateforme)`
      );
      await loadSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action impossible');
    } finally {
      setPendingAction(null);
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    if (!rejectReason.trim()) {
      toast.error('Saisissez la raison du rejet');
      return;
    }
    try {
      setIsRejecting(true);
      await financeApi.rejectSubmission(detail.id, rejectReason.trim());
      toast.success('Declaration rejetee');
      setDetail(null);
      setRejectReason('');
      await loadSubmissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Action impossible');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-red-600">
              <ShieldCheck className="h-4 w-4" />
              Workflow paiement hors ligne
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">Gestion des activations</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Verifier les declarations de paiement des apprenants puis activer leur acces. L activation fige le montant brut, la commission plateforme et le montant formule sur le ledger financier.
            </p>
          </div>
          <Button variant="outline" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={loadSubmissions} disabled={isLoading}>
            Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard label="Declarations en attente" value={summary.pending} icon={<Clock3 className="h-6 w-6" />} color="orange" />
          <StatsCard label="Paiements verifies" value={summary.verified} icon={<CheckCircle2 className="h-6 w-6" />} color="green" />
          <StatsCard label="Cours actives" value={summary.activated} icon={<Zap className="h-6 w-6" />} color="indigo" />
          <StatsCard label="Rejetes" value={summary.rejected} icon={<AlertTriangle className="h-6 w-6" />} color="red" />
        </div>

        <Card>
          <div className="flex flex-col gap-3 p-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cours, apprenant, reference, email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('submissions')}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  tab === 'submissions' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Declarations
              </button>
              <button
                type="button"
                onClick={() => setTab('journal')}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  tab === 'journal' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Journal des activations
              </button>
            </div>
            {tab === 'submissions' && (
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as StatusFilter)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="PAYMENT_SUBMITTED">Declarations recues</option>
                <option value="PAYMENT_VERIFIED">Paiements verifies</option>
                <option value="ALL">Tous les statuts</option>
                <option value="ACTIVATED">Cours actives</option>
                <option value="PAYMENT_REJECTED">Rejetes</option>
              </select>
            )}
          </div>
        </Card>

        <Card padding="none">
          <CardHeader className="p-4 pb-0">
            <CardTitle>{tab === 'submissions' ? 'Declarations de paiement' : 'Journal des activations'}</CardTitle>
          </CardHeader>
          {tab === 'journal' ? (
            isJournalLoading ? (
              <div className="p-10 text-center text-slate-500">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
                Chargement du journal...
              </div>
            ) : activations.length === 0 ? (
              <div className="p-10 text-center">
                <Zap className="mx-auto mb-3 h-10 w-10 text-indigo-500" />
                <p className="font-semibold text-slate-900 dark:text-white">Aucune activation enregistree</p>
                <p className="mt-1 text-sm text-slate-500">Le journal se remplit a chaque activation de cours.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {activations.map((activation) => (
                  <div key={activation.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={activation.student_name || 'Apprenant'} size="lg" />
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-950 dark:text-white">{activation.course_title || 'Cours'}</h3>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                          {activation.student_name || 'Apprenant'} · {activation.student_email}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                          Formateur : {activation.trainer_name || '—'} · Active par {activation.activated_by_name || '—'} le {formatDate(activation.activated_at)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="flex justify-between gap-3 text-slate-500 dark:text-slate-400">
                        <span>Brut</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(activation.gross_amount)}</span>
                      </p>
                      <p className="flex justify-between gap-3 text-slate-500 dark:text-slate-400">
                        <span>Commission ({activation.commission_rate ?? 0}%)</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">{formatMoney(activation.platform_commission)}</span>
                      </p>
                      <p className="flex justify-between gap-3 text-slate-500 dark:text-slate-400">
                        <span>Formateur</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(activation.trainer_amount)}</span>
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {activation.payment_reference && <p className="font-mono">{activation.payment_reference}</p>}
                      {activation.payment_method && <p>{methodLabels[activation.payment_method] || activation.payment_method}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(activation.events || []).map((event, index) => (
                        <Badge key={index} variant={event.type === 'ACTIVATED' ? 'success' : 'info'} size="sm">
                          {event.type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : isLoading ? (
            <div className="p-10 text-center text-slate-500">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
              Chargement des declarations...
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-10 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
              <p className="font-semibold text-slate-900 dark:text-white">Aucune declaration</p>
              <p className="mt-1 text-sm text-slate-500">Les paiements declares par les apprenants apparaitront ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {submissions.map((submission) => {
                const cfg = statusConfig[submission.status] || statusConfig.PENDING_PAYMENT;
                const canVerify = submission.status === 'PAYMENT_SUBMITTED';
                const canActivate = submission.status === 'PAYMENT_VERIFIED';
                return (
                  <div key={submission.id} className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={submission.user?.name || 'Apprenant'} size="lg" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-semibold text-slate-950 dark:text-white">
                            {submission.user?.name || 'Apprenant'}
                          </h3>
                          <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                        </div>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400">{submission.user?.email}</p>
                        <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                          {submission.course?.title} · {methodLabels[submission.paymentMethod] || submission.paymentMethod}
                          {submission.operatorReference ? ` · Ref ${submission.operatorReference}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-bold text-slate-900 dark:text-white">{formatMoney(submission.amount)}</span>
                      <span className="text-xs text-slate-400">paye le {formatDate(submission.paymentDate || submission.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      {submission.trainerName && (
                        <span className="truncate">Formateur : {submission.trainerName}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<Eye className="h-4 w-4" />}
                        onClick={() => setDetail(submission)}
                      >
                        Detail
                      </Button>
                      {submission.proofUrl && (
                        <a
                          href={submission.proofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:text-slate-300"
                        >
                          Preuve <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {canVerify && (
                        <Button size="sm" variant="primary" leftIcon={<ThumbsUp className="h-4 w-4" />} isLoading={pendingAction === submission.id} onClick={() => handleVerify(submission)}>
                          Verifier
                        </Button>
                      )}
                      {canActivate && (
                        <Button size="sm" variant="gradient" leftIcon={<Zap className="h-4 w-4" />} isLoading={pendingAction === submission.id} onClick={() => handleActivate(submission)}>
                          Activer
                        </Button>
                      )}
                      {canVerify && (
                        <Button size="sm" variant="outline" leftIcon={<ThumbsDown className="h-4 w-4" />} onClick={() => setDetail(submission)}>
                          Rejeter
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

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetail(null)}>
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Detail de la declaration</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Apprenant</p>
                  <p className="font-semibold">{detail.user?.name || '—'}</p>
                  <p className="text-xs text-slate-500">{detail.user?.email || '—'}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Cours</p>
                  <p className="font-semibold">{detail.course?.title || '—'}</p>
                  <p className="text-xs text-slate-500">{formatMoney(detail.course?.priceCfa)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Montant declare</p>
                  <p className="font-semibold">{formatMoney(detail.amount)}</p>
                  <p className="text-xs text-slate-500">{methodLabels[detail.paymentMethod] || detail.paymentMethod}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <p className="text-xs text-slate-500">Declare le</p>
                  <p className="font-semibold">{formatDate(detail.createdAt)}</p>
                  <p className="text-xs text-slate-500">Statut : {statusConfig[detail.status]?.label || detail.status}</p>
                </div>
              </div>
              {detail.phoneNumber && (
                <p className="text-slate-600 dark:text-slate-300">Numero : <span className="font-semibold">{detail.phoneNumber}</span></p>
              )}
              {detail.operatorReference && (
                <p className="text-slate-600 dark:text-slate-300">Reference operateur : <span className="font-semibold">{detail.operatorReference}</span></p>
              )}
              {detail.notes && <p className="text-slate-600 dark:text-slate-300">Commentaire : {detail.notes}</p>}
              {detail.rejectionReason && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
                  Raison du rejet : {detail.rejectionReason}
                </div>
              )}
              {detail.proofUrl && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">Preuve de paiement</p>
                  <a href={detail.proofUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                    <img src={detail.proofUrl} alt="Preuve de paiement" className="max-h-56 w-full object-contain" />
                  </a>
                </div>
              )}
            </div>

            {detail.status === 'PAYMENT_SUBMITTED' && (
              <div className="mt-4">
                <Textarea
                  label="Raison du rejet (requise)"
                  placeholder="Ex : preuve illisible, montant incorrect..."
                  rows={2}
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                />
                <div className="mt-3 flex gap-2">
                  <Button variant="error" leftIcon={<ThumbsDown className="h-4 w-4" />} isLoading={isRejecting} onClick={handleReject}>
                    Rejeter la declaration
                  </Button>
                  <Button variant="outline" onClick={() => setDetail(null)}>Fermer</Button>
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              {detail.status === 'PAYMENT_SUBMITTED' && (
                <Button leftIcon={<ThumbsUp className="h-4 w-4" />} onClick={() => { handleVerify(detail); setDetail(null); }}>
                  Verifier le paiement
                </Button>
              )}
              {detail.status === 'PAYMENT_VERIFIED' && (
                <Button variant="gradient" leftIcon={<Zap className="h-4 w-4" />} onClick={() => { handleActivate(detail); setDetail(null); }}>
                  Activer le cours
                </Button>
              )}
              {detail.status !== 'PAYMENT_SUBMITTED' && detail.status !== 'PAYMENT_VERIFIED' && (
                <Button variant="outline" onClick={() => setDetail(null)}>Fermer</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
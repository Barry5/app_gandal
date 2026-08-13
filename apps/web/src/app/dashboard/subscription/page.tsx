'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { useAuth } from '@/components/providers/AuthProvider';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { CheckCircle2, Clock, Gift, RefreshCcw, Sparkles } from 'lucide-react';

const fetcher = (url: string, token: string) =>
  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());

const api = (url: string, token: string | null, options?: RequestInit) =>
  fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
  }).then(async (res) => {
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message = data?.error || (data?.details && data.details[0]?.message) || 'Une erreur est survenue.';
      throw new Error(message);
    }
    return data;
  });

export default function CreatorSubscriptionPage() {
  const { token } = useAuth();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const [isSubscribing, setIsSubscribing] = useState<string | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  const { data: status, error: statusError, mutate: mutateStatus } = useSWR(
    token ? [`${apiUrl}/monetization/status`, token] : null,
    ([url, token]) => fetcher(url, token),
  );
  const { data: plansData, error: plansError } = useSWR(
    token ? [`${apiUrl}/monetization/plans`, token] : null,
    ([url, token]) => fetcher(url, token),
  );

  const plans = plansData?.plans ?? [];
  const isSubscription = status?.currentModel === 'subscription';
  const subscription = status?.subscription;
  const pendingPayment = isSubscription && subscription?.status === 'pending_payment';
  const isActive = subscription?.status === 'active' || subscription?.status === 'grace_period';

  const handleSubscribe = async (planId: string) => {
    setIsSubscribing(planId);
    try {
      const result = await api(`${apiUrl}/monetization/change-plan`, token, {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
      toast.success(result.message || 'Demande enregistree.');
      await mutateStatus();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSubscribing(null);
    }
  };

  const handleRevert = async () => {
    setIsReverting(true);
    try {
      const result = await api(`${apiUrl}/monetization/change-plan`, token, {
        method: 'POST',
        body: JSON.stringify({ planId: 'commission' }),
      });
      toast.success(result.message || 'Vous etes passe a la commission.');
      await mutateStatus();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsReverting(false);
    }
  };

  if (statusError) {
    return (
      <DashboardLayout>
        <Card className="py-12 text-center">
          <p className="text-red-500">Erreur de chargement de votre statut de monetisation.</p>
        </Card>
      </DashboardLayout>
    );
  }

  if (!status || !plansData) {
    return (
      <DashboardLayout>
        <Card className="py-12 text-center">
          <p className="text-gray-500">Chargement...</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Abonnement</h1>
          <p className="text-gray-500">Choisissez votre formule : commission sur les ventes ou abonnement a 0% de commission.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Votre formule actuelle</CardTitle>
            <CardDescription>Statut de votre monetisation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-gray-500">Modele</p>
                <p className="mt-1 text-lg font-bold">
                  {isSubscription ? 'Abonnement' : 'Commission'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-gray-500">Commission sur ventes</p>
                <p className="mt-1 text-lg font-bold">{status.commissionRate}%</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-gray-500">Plan</p>
                <p className="mt-1 text-lg font-bold">{subscription?.planName || 'Starter'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs text-gray-500">Statut</p>
                <div className="mt-1">
                  {pendingPayment && <Badge variant="warning">Paiement en attente</Badge>}
                  {isActive && <Badge variant="success">Actif</Badge>}
                  {!isSubscription && <Badge variant="subtle">Gratuit</Badge>}
                  {isSubscription && !pendingPayment && !isActive && (
                    <Badge variant="error">{subscription?.status || 'Expire'}</Badge>
                  )}
                </div>
              </div>
            </div>

            {pendingPayment && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                <Clock className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Paiement en attente de confirmation</p>
                  <p>
                    Votre demande d'abonnement {subscription?.planName} ({Number(subscription?.priceGnf || 0).toLocaleString('fr-FR')} GNF) est enregistree.
                    L'administration doit confirmer votre paiement avant activation. Vous restez en mode commission jusque-la.
                  </p>
                </div>
              </div>
            )}
            {isActive && subscription && (
              <div className="mt-4 flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Abonnement actif</p>
                  <p>
                    Plan {subscription.planName} — expire le {new Date(subscription.expiresAt).toLocaleDateString('fr-FR')}.
                    Vous conservez 100% de vos revenus de ventes.
                  </p>
                </div>
              </div>
            )}

            {status.breakEven?.recommendation && (
              <p className="mt-4 text-sm text-gray-500">{status.breakEven.recommendation}</p>
            )}

            {(isActive || pendingPayment) && (
              <div className="mt-4">
                <Button variant="outline" size="sm" leftIcon={<RefreshCcw className="h-4 w-4" />} isLoading={isReverting} onClick={handleRevert}>
                  Revenir au mode commission
                </Button>
                <p className="mt-2 text-xs text-gray-500">Le retour a la commission prend effet immediatement (ou a la fin de la periode payee si vous etes actif).</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 text-xl font-bold">Choisir un plan</h2>
          {plansError && <p className="text-red-500">Erreur de chargement des plans.</p>}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan: any) => {
              const isCurrent = subscription?.planName === plan.name && isActive;
              return (
                <Card key={plan.id} className={`flex flex-col ${isCurrent ? 'ring-2 ring-indigo-500' : ''}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {plan.trial_period_days > 0 && !status.hasUsedTrial && (
                        <Badge variant="gradient" size="sm"><Gift className="h-3 w-3" /> Essai {plan.trial_period_days}j</Badge>
                      )}
                    </CardTitle>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold gradient-text">
                        {Number(plan.price_gnf).toLocaleString('fr-FR')}
                      </span>
                      <span className="text-sm text-gray-500">GNF/mois</span>
                    </div>
                    <CardDescription>
                      {plan.commission_rate === 0 ? '0% de commission sur les ventes' : `${plan.commission_rate}% de commission sur les ventes`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="mb-4 flex-1 space-y-2">
                      {plan.features.map((feature: string) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.commission_rate === 0 ? 'gradient' : 'default'}
                      disabled={isCurrent || (isSubscription && (isActive || pendingPayment))}
                      isLoading={isSubscribing === plan.id}
                      onClick={() => handleSubscribe(plan.id)}
                      leftIcon={<Sparkles className="h-4 w-4" />}
                    >
                      {isCurrent ? 'Plan actuel' : plan.trial_period_days > 0 && !status.hasUsedTrial ? 'Demarrer l\'essai' : plan.price_gnf > 0 ? 'S\'abonner' : 'Commencer'}
                    </Button>
                    {plan.price_gnf > 0 && plan.trial_period_days === 0 && (
                      <p className="mt-2 text-center text-xs text-gray-500">Paiement a confirmer par l'administration</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
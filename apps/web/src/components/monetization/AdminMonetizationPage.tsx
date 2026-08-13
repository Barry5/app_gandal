'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { useAuth } from '@/components/providers/AuthProvider';
import { Edit, PlusCircle, Save, ToggleLeft, ToggleRight, X, CheckCircle2, Ban, Gift, RefreshCcw, PauseCircle } from 'lucide-react';

const fetcher = (url: string, token: string) =>
  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());

const SUB_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  pending_payment: 'Paiement en attente',
  grace_period: 'Periode de grace',
  suspended: 'Suspendu',
  cancelled: 'Annule',
  expired: 'Expire',
};

const SUB_STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'subtle' | 'info'> = {
  active: 'success',
  pending_payment: 'warning',
  grace_period: 'info',
  suspended: 'error',
  cancelled: 'subtle',
  expired: 'subtle',
};

export default function AdminMonetizationPage() {
  const [activeTab, setActiveTab] = useState('plans');

  const tabs = [
    { id: 'plans', label: 'Plans' },
    { id: 'subscriptions', label: 'Souscriptions' },
    { id: 'creators', label: 'Formateurs' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestion de la Monétisation</h1>
        <p className="text-gray-500">Configurez les plans d'abonnement et les commissions des formateurs.</p>
      </div>

      <div className="flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium ${activeTab === tab.id ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'plans' && <PlansManagement />}
      {activeTab === 'subscriptions' && <SubscriptionsManagement />}
      {activeTab === 'creators' && <CreatorsManagement />}
    </div>
  );
}

function PlansManagement() {
    const { token } = useAuth();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const { data: plans, error, mutate } = useSWR(token ? [`${apiUrl}/admin/monetization/plans`, token] : null, ([url, token]) => fetcher(url, token));
    const [editingPlan, setEditingPlan] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = (plan: any | null = null) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPlan(null);
    };

    const handleSave = async () => {
        await mutate();
        handleCloseModal();
    };

    if (error) return <div className="text-red-500">Erreur de chargement des plans.</div>
    if (!plans) return <div>Chargement des plans...</div>

    return (
        <>
            <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Plans d'Abonnement</CardTitle>
                <Button size="sm" leftIcon={<PlusCircle className="w-4 h-4" />} onClick={() => handleOpenModal()}>Nouveau Plan</Button>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-3">Nom</th>
                                <th className="px-6 py-3">Prix (GNF)</th>
                                <th className="px-6 py-3">Essai (j)</th>
                                <th className="px-6 py-3">Commission</th>
                                <th className="px-6 py-3">Statut</th>
                                <th className="px-6 py-3">Public</th>
                                <th className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plans.map((plan: any) => (
                                <tr key={plan.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                    <td className="px-6 py-4 font-medium">{plan.name}</td>
                                    <td className="px-6 py-4">{plan.price_gnf.toLocaleString('fr-FR')}</td>
                                    <td className="px-6 py-4">{plan.trial_period_days}</td>
                                    <td className="px-6 py-4">{plan.commission_rate}%</td>
                                    <td className="px-6 py-4">{plan.is_active ? <Badge variant="success">Actif</Badge> : <Badge variant="subtle">Inactif</Badge>}</td>
                                    <td className="px-6 py-4">{plan.is_public ? <ToggleRight className="text-green-500"/> : <ToggleLeft className="text-gray-400"/>}</td>
                                    <td className="px-6 py-4"><Button variant="outline" size="sm" leftIcon={<Edit className="w-4 h-4"/>} onClick={() => handleOpenModal(plan)}>Modifier</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
            {isModalOpen && (
                <PlanEditorModal
                    plan={editingPlan}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                />
            )}
        </>
    );
}

function SubscriptionsManagement() {
    const { token } = useAuth();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const { data, error, mutate } = useSWR(token ? [`${apiUrl}/admin/monetization/subscriptions?limit=100`, token] : null, ([url, token]) => fetcher(url, token));
    const [actionSubId, setActionSubId] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [modal, setModal] = useState<{ type: 'confirm' | 'reject' | 'grant'; sub?: any; creator?: any } | null>(null);

    const subscriptions = data?.subscriptions ?? [];
    if (error) return <div className="text-red-500">Erreur de chargement des souscriptions.</div>
    if (!data) return <div>Chargement des souscriptions...</div>

    const runAction = async (path: string, method: string, body?: any) => {
        setIsBusy(true);
        try {
            const res = await fetch(`${apiUrl}${path}`, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: body ? JSON.stringify(body) : undefined,
            });
            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || (result.details && result.details[0]?.message) || 'Action impossible.');
            }
            toast.success(result.message || 'Action effectuee.');
            await mutate();
            return result;
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Souscriptions</CardTitle>
                    <CardDescription>Confirmez les paiements en attente, suspendez ou reprenez les abonnements.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Formateur</th>
                                    <th className="px-6 py-3">Plan</th>
                                    <th className="px-6 py-3">Montant</th>
                                    <th className="px-6 py-3">Statut</th>
                                    <th className="px-6 py-3">Expiration</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subscriptions.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Aucune souscription pour le moment.</td>
                                    </tr>
                                )}
                                {subscriptions.map((sub: any) => (
                                    <tr key={sub.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                        <td className="px-6 py-4 font-medium">
                                            <div className="font-semibold">{sub.creator_name}</div>
                                            <div className="text-xs text-gray-500">{sub.creator_email}</div>
                                        </td>
                                        <td className="px-6 py-4">{sub.plan_name || '-'}</td>
                                        <td className="px-6 py-4">{Number(sub.price_at_subscription).toLocaleString('fr-FR')} GNF</td>
                                        <td className="px-6 py-4">
                                            <Badge variant={SUB_STATUS_VARIANTS[sub.status] || 'subtle'}>{SUB_STATUS_LABELS[sub.status] || sub.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4">{sub.expires_at ? new Date(sub.expires_at).toLocaleDateString('fr-FR') : '-'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                {sub.status === 'pending_payment' && (
                                                    <>
                                                        <Button size="sm" variant="primary" isLoading={isBusy && actionSubId === sub.id} leftIcon={<CheckCircle2 className="w-4 h-4" />} onClick={() => setModal({ type: 'confirm', sub })}>Confirmer</Button>
                                                        <Button size="sm" variant="error" isLoading={isBusy && actionSubId === sub.id} leftIcon={<Ban className="w-4 h-4" />} onClick={() => setModal({ type: 'reject', sub })}>Rejeter</Button>
                                                    </>
                                                )}
                                                {sub.status === 'active' && (
                                                    <Button size="sm" variant="outline" isLoading={isBusy && actionSubId === sub.id} leftIcon={<PauseCircle className="w-4 h-4" />} onClick={async () => { setActionSubId(sub.id); await runAction(`/admin/monetization/subscriptions/${sub.id}/suspend`, 'POST'); setActionSubId(null); }}>Suspendre</Button>
                                                )}
                                                {sub.status === 'suspended' && (
                                                    <Button size="sm" variant="outline" isLoading={isBusy && actionSubId === sub.id} leftIcon={<RefreshCcw className="w-4 h-4" />} onClick={async () => { setActionSubId(sub.id); await runAction(`/admin/monetization/subscriptions/${sub.id}/resume`, 'POST'); setActionSubId(null); }}>Reprendre</Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            {modal?.type === 'confirm' && modal.sub && (
                <ConfirmPaymentModal
                    sub={modal.sub}
                    onClose={() => setModal(null)}
                    onConfirm={async (reference) => {
                        const result = await runAction(`/admin/monetization/subscriptions/${modal.sub.id}/confirm`, 'POST', { transactionRef: reference });
                        if (result) setModal(null);
                    }}
                    isBusy={isBusy}
                />
            )}
            {modal?.type === 'reject' && modal.sub && (
                <RejectPaymentModal
                    sub={modal.sub}
                    onClose={() => setModal(null)}
                    onReject={async (reason) => {
                        const result = await runAction(`/admin/monetization/subscriptions/${modal.sub.id}/reject`, 'POST', { reason });
                        if (result) setModal(null);
                    }}
                    isBusy={isBusy}
                />
            )}
        </>
    );
}

function CreatorsManagement() {
    const { token } = useAuth();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const { data: creators, error, mutate } = useSWR(token ? [`${apiUrl}/admin/monetization/creators`, token] : null, ([url, token]) => fetcher(url, token));
    const [editingCreator, setEditingCreator] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [grantTarget, setGrantTarget] = useState<any | null>(null);

    const handleOpenModal = (creator: any) => {
        setEditingCreator(creator);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingCreator(null);
    };

    const handleSave = async () => {
        await mutate();
        handleCloseModal();
    };

    if (error) return <div className="text-red-500">Erreur de chargement des formateurs.</div>
    if (!creators) return <div>Chargement des formateurs...</div>

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Monétisation par Formateur</CardTitle>
                    <CardDescription>Assignez des commissions personnalisées, changez manuellement le modèle d'un formateur ou offrez-lui une période d'abonnement.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Formateur</th>
                                    <th className="px-6 py-3">Modèle Actuel</th>
                                    <th className="px-6 py-3">Taux Commission</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {creators.map((creator: any) => (
                                    <tr key={creator.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                                        <td className="px-6 py-4 font-medium">
                                            <div className="font-semibold">{creator.name}</div>
                                            <div className="text-xs text-gray-500">{creator.email}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {creator.monetization_model === 'subscription' ? (
                                                <Badge variant="success">{creator.plan_name || 'Abonnement'}</Badge>
                                            ) : (
                                                <Badge variant="warning">Commission</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {creator.custom_commission_rate !== null 
                                                ? `${creator.custom_commission_rate}% (perso)`
                                                : `Défaut (15%)`
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-2">
                                                <Button variant="outline" size="sm" leftIcon={<Edit className="w-4 h-4"/>} onClick={() => handleOpenModal(creator)}>Modifier</Button>
                                                <Button variant="gradient" size="sm" leftIcon={<Gift className="w-4 h-4"/>} onClick={() => setGrantTarget(creator)}>Offrir</Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            {isModalOpen && editingCreator && (
                <CreatorMonetizationEditorModal
                    creator={editingCreator}
                    onClose={handleCloseModal}
                    onSave={handleSave}
                />
            )}
            {grantTarget && (
                <GrantSubscriptionModal
                    creator={grantTarget}
                    onClose={() => setGrantTarget(null)}
                    onGrant={async () => {
                        await mutate();
                        setGrantTarget(null);
                    }}
                />
            )}
        </>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function PlanEditorModal({ plan, onClose, onSave }: { plan: any | null, onClose: () => void, onSave: () => void }) {
    const { token } = useAuth();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const [isSaving, setIsSaving] = useState(false);
    const [formState, setFormState] = useState({
        name: plan?.name || '',
        price_gnf: plan?.price_gnf || 0,
        trial_period_days: plan?.trial_period_days || 0,
        features: plan?.features?.join('\n') || '',
        is_active: plan?.is_active ?? true,
        is_public: plan?.is_public ?? true,
    });

    const handleFormChange = (field: string, value: string | number | boolean) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            ...formState,
            price_gnf: Number(formState.price_gnf),
            trial_period_days: Number(formState.trial_period_days),
            features: formState.features.split('\n').filter((f: string) => f.trim()),
        };

        try {
            const url = plan?.id
                ? `${apiUrl}/admin/monetization/plans/${plan.id}`
                : `${apiUrl}/admin/monetization/plans`;
            const method = plan?.id ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            if (!res.ok) {
                const errorMessage = result.error || (result.details && result.details[0].message) || 'Une erreur est survenue.';
                throw new Error(errorMessage);
            }

            toast.success(`Plan ${plan?.id ? 'mis à jour' : 'créé'} avec succès.`);
            onSave();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                        <h3 className="text-xl font-bold">{plan?.id ? 'Modifier le plan' : 'Nouveau plan'}</h3>
                        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    
                    <div className="space-y-5 p-5 max-h-[70vh] overflow-y-auto">
                        <Field label="Nom du plan"><input value={formState.name} onChange={(e) => handleFormChange('name', e.target.value)} className="field" placeholder="Ex: Pro" required /></Field>
                        <Field label="Prix (GNF)"><input type="number" min="0" value={formState.price_gnf} onChange={(e) => handleFormChange('price_gnf', Number(e.target.value))} className="field" required /></Field>
                        <Field label="Jours d'essai gratuit"><input type="number" min="0" value={formState.trial_period_days} onChange={(e) => handleFormChange('trial_period_days', Number(e.target.value))} className="field" /></Field>
                        <Field label="Fonctionnalités (une par ligne)"><textarea value={formState.features} onChange={(e) => handleFormChange('features', e.target.value)} rows={5} className="field" placeholder={"Élèves illimités\nCours illimités\n0% de commission"} /></Field>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                                <input type="checkbox" checked={formState.is_active} onChange={(e) => handleFormChange('is_active', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-sm font-medium">Plan Actif</span>
                            </label>
                            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                                <input type="checkbox" checked={formState.is_public} onChange={(e) => handleFormChange('is_public', e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                <span className="text-sm font-medium">Plan Public</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Annuler</Button>
                        <Button type="submit" isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Sauvegarder</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function ConfirmPaymentModal({ sub, onClose, onConfirm, isBusy }: { sub: any, onClose: () => void, onConfirm: (reference: string) => void, isBusy: boolean }) {
    const [reference, setReference] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                    <h3 className="text-xl font-bold">Confirmer le paiement</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-4 p-5">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Confirmez le paiement de <strong>{Number(sub.price_at_subscription).toLocaleString('fr-FR')} GNF</strong> pour le plan <strong>{sub.plan_name}</strong> de {sub.creator_name}. L'abonnement sera actif pour 1 mois.
                    </p>
                    <Field label="Référence de transaction (optionnel)">
                        <input value={reference} onChange={(e) => setReference(e.target.value)} className="field" placeholder="Ex: SUB-ABC123" />
                    </Field>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
                    <Button variant="outline" onClick={onClose} disabled={isBusy}>Annuler</Button>
                    <Button isLoading={isBusy} leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => onConfirm(reference.trim())}>Confirmer le paiement</Button>
                </div>
            </div>
        </div>
    );
}

function RejectPaymentModal({ sub, onClose, onReject, isBusy }: { sub: any, onClose: () => void, onReject: (reason: string) => void, isBusy: boolean }) {
    const [reason, setReason] = useState('');
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                    <h3 className="text-xl font-bold">Rejeter le paiement</h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="space-y-4 p-5">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        Rejetez le paiement de {sub.creator_name} pour le plan {sub.plan_name}. Le formateur sera notifie.
                    </p>
                    <Field label="Raison du rejet">
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="field" required placeholder="Ex: Preuve de paiement introuvable" />
                    </Field>
                </div>
                <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
                    <Button variant="outline" onClick={onClose} disabled={isBusy}>Annuler</Button>
                    <Button variant="error" isLoading={isBusy} leftIcon={<Ban className="h-4 w-4" />} disabled={reason.trim().length < 3} onClick={() => onReject(reason.trim())}>Rejeter</Button>
                </div>
            </div>
        </div>
    );
}

function GrantSubscriptionModal({ creator, onClose, onGrant }: { creator: any, onClose: () => void, onGrant: () => void }) {
    const { token } = useAuth();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const [isSaving, setIsSaving] = useState(false);
    const { data: plans } = useSWR(token ? [`${apiUrl}/admin/monetization/plans`, token] : null, ([url, token]) => fetcher(url, token));
    const [planId, setPlanId] = useState('');
    const [months, setMonths] = useState(1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!planId) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${apiUrl}/admin/monetization/creators/${creator.id}/grant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ planId, months }),
            });
            const result = await res.json();
            if (!res.ok) {
                const errorMessage = result.error || (result.details && result.details[0]?.message) || 'Une erreur est survenue.';
                throw new Error(errorMessage);
            }
            toast.success(`Abonnement offert a ${creator.name}.`);
            onGrant();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                        <h3 className="text-xl font-bold">Offrir un abonnement</h3>
                        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <div className="space-y-4 p-5">
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                            Offrez une periode d'abonnement gratuite a <strong>{creator.name}</strong> ({creator.email}).
                        </p>
                        <Field label="Plan">
                            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className="field" required>
                                <option value="">Selectionner un plan...</option>
                                {(plans || []).filter((p: any) => p.is_active).map((p: any) => (
                                    <option key={p.id} value={p.id}>{p.name} - {Number(p.price_gnf).toLocaleString('fr-FR')} GNF/mois</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Duree (mois)">
                            <input type="number" min="1" max="12" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="field" required />
                        </Field>
                    </div>
                    <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Annuler</Button>
                        <Button type="submit" variant="gradient" isLoading={isSaving} leftIcon={<Gift className="h-4 w-4" />}>Offrir</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CreatorMonetizationEditorModal({ creator, onClose, onSave }: { creator: any, onClose: () => void, onSave: () => void }) {
    const { token } = useAuth();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const [isSaving, setIsSaving] = useState(false);
    const [formState, setFormState] = useState({
        monetization_model: creator?.monetization_model || 'commission',
        custom_commission_rate: creator?.custom_commission_rate ?? '',
    });

    const handleFormChange = (field: string, value: string | number) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            monetization_model: formState.monetization_model,
            custom_commission_rate: formState.custom_commission_rate === '' ? null : Number(formState.custom_commission_rate),
        };

        try {
            const url = `${apiUrl}/admin/monetization/creators/${creator.id}`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            if (!res.ok) {
                const errorMessage = result.error || (result.details && result.details[0].message) || 'Une erreur est survenue.';
                throw new Error(errorMessage);
            }

            toast.success(`Paramètres du formateur mis à jour.`);
            onSave();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800">
                        <h3 className="text-xl font-bold">Modifier la monétisation</h3>
                        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    
                    <div className="space-y-5 p-5">
                        <div className="font-medium">{creator.name}</div>
                        <Field label="Modèle de monétisation">
                            <select value={formState.monetization_model} onChange={(e) => handleFormChange('monetization_model', e.target.value)} className="field">
                                <option value="commission">Commission</option>
                                <option value="subscription">Abonnement</option>
                            </select>
                        </Field>
                        
                        <Field label="Taux de commission personnalisé (%)">
                            <input type="number" min="0" max="100" step="0.1" value={formState.custom_commission_rate} onChange={(e) => handleFormChange('custom_commission_rate', e.target.value)} className="field" placeholder="Laisser vide pour le taux par défaut (15%)" disabled={formState.monetization_model !== 'commission'} />
                            {formState.monetization_model !== 'commission' && (
                                <p className="mt-1 text-xs text-slate-500">Non applicable pour le modèle par abonnement.</p>
                            )}
                            {formState.monetization_model === 'subscription' && creator.subscription_status !== 'active' && creator.subscription_status !== 'grace_period' && (
                                <p className="mt-1 text-xs text-amber-600">
                                    Ce formateur n'a pas d'abonnement actif : confirmez son paiement (onglet Souscriptions) ou offrez-lui une période (bouton Offrir).
                                </p>
                            )}
                        </Field>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Annuler</Button>
                        <Button type="submit" isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Sauvegarder</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
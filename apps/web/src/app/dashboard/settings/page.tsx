'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAuth } from '@/components/providers/AuthProvider';
import { Edit, PlusCircle, Save, ToggleLeft, ToggleRight, X } from 'lucide-react';

const fetcher = (url: string, token: string) =>
  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((res) => res.json());

export default function AdminMonetizationPage() {
  const [activeTab, setActiveTab] = useState('plans');

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestion de la Monétisation</h1>
          <p className="text-gray-500">Configurez les plans d'abonnement et les commissions des formateurs.</p>
        </div>

        <div className="flex border-b">
          <button onClick={() => setActiveTab('plans')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'plans' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}>
            Gérer les Plans
          </button>
          <button onClick={() => setActiveTab('creators')} className={`px-4 py-2 text-sm font-medium ${activeTab === 'creators' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'}`}>
            Gérer les Formateurs
          </button>
        </div>

        {activeTab === 'plans' && <PlansManagement />}
        {activeTab === 'creators' && <CreatorsManagement />}
      </div>
    </AdminLayout>
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

function CreatorsManagement() {
    const { token } = useAuth();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    const { data: creators, error, mutate } = useSWR(token ? [`${apiUrl}/admin/monetization/creators`, token] : null, ([url, token]) => fetcher(url, token));
    const [editingCreator, setEditingCreator] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                    <CardDescription>Assignez des commissions personnalisées ou changez manuellement le modèle d'un formateur.</CardDescription>
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
                                            <Button variant="outline" size="sm" leftIcon={<Edit className="w-4 h-4"/>} onClick={() => handleOpenModal(creator)}>Modifier</Button>
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
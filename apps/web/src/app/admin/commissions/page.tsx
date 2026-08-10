'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Percent, RefreshCw, Save } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/components/providers/AuthProvider';
import { pricingApi, type CommissionRateDto } from '@/lib/api';
import { toast } from 'sonner';

const planLabels: Record<string, string> = {
  free: 'Gratuit',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const planDescriptions: Record<string, string> = {
  free: 'Commission prelevee sur chaque vente des createurs du plan Gratuit',
  pro: 'Commission prelevee sur chaque vente des createurs du plan Pro',
  enterprise: 'Commission prelevee sur chaque vente des createurs du plan Enterprise',
};

export default function AdminCommissionsPage() {
  const { isAdmin } = useAuth();
  const [rates, setRates] = useState<CommissionRateDto[]>([]);
  const [editing, setEditing] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await pricingApi.getCommissionRates();
      setRates(data);
      const editMap: Record<string, number> = {};
      data.forEach((r) => { editMap[r.plan] = r.rate; });
      setEditing(editMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  const handleSave = async (plan: string) => {
    try {
      setSaving((prev) => ({ ...prev, [plan]: true }));
      const updated = await pricingApi.updateCommissionRate(plan, editing[plan]);
      setRates((prev) => prev.map((r) => (r.plan === plan ? updated : r)));
      toast.success(`Commission ${planLabels[plan]} mise a jour`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise a jour');
    } finally {
      setSaving((prev) => ({ ...prev, [plan]: false }));
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout>
        <Card className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold">Acces refuse</h3>
          <p className="text-gray-500">Cette page est reservee a l administration.</p>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Taux de commission</h1>
            <p className="text-gray-500 dark:text-gray-400">Gerez les commissions appliquees aux createurs</p>
          </div>
          <Button variant="outline" onClick={loadRates} leftIcon={<RefreshCw className="h-4 w-4" />} disabled={isLoading}>
            Actualiser
          </Button>
        </div>

        {isLoading && (
          <Card className="py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
          </Card>
        )}

        {!isLoading && error && (
          <Card className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <p className="mb-6 text-gray-500">{error}</p>
            <Button onClick={loadRates}>Reessayer</Button>
          </Card>
        )}

        {!isLoading && !error && (
          <div className="grid gap-6 md:grid-cols-3">
            {rates.map((rate, index) => (
              <motion.div
                key={rate.plan}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card variant="bordered" padding="lg" className="h-full">
                  <CardHeader className="p-0 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                        <Percent className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <CardTitle className="text-lg">{planLabels[rate.plan] || rate.plan}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                      {planDescriptions[rate.plan]}
                    </p>
                    <div className="mb-4">
                      <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Taux de commission (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editing[rate.plan] ?? rate.rate}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [rate.plan]: Number(e.target.value || 0) }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <Button
                      className="w-full"
                      leftIcon={<Save className="h-4 w-4" />}
                      isLoading={saving[rate.plan]}
                      onClick={() => handleSave(rate.plan)}
                    >
                      Enregistrer
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

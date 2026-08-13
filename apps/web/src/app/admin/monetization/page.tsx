'use client';

import { AlertCircle } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import AdminMonetizationPage from '@/components/monetization/AdminMonetizationPage';
import { useAuth } from '@/components/providers/AuthProvider';
import { Card } from '@/components/ui/Card';

export default function AdminMonetizationRoute() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <AdminLayout>
        <Card className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold">Acces refuse</h3>
          <p className="text-gray-500">Cette page est reservee a l administration.</p>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <AdminMonetizationPage />
    </AdminLayout>
  );
}
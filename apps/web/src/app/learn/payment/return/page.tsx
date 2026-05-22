'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { paymentApi } from '@/lib/api';

type ReturnState = 'checking' | 'completed' | 'pending' | 'failed';

function CinetPayReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('transaction_id') || searchParams.get('reference') || '';
  const [state, setState] = useState<ReturnState>('checking');
  const [courseId, setCourseId] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!reference) {
        setState('failed');
        return;
      }

      try {
        const result = await paymentApi.verify(reference);
        const payment = result.payment;
        setCourseId(payment.course_id || '');

        if (payment.status === 'completed' || payment.enrollment_status === 'paid') {
          setState('completed');
          toast.success('Paiement confirme, cours deverrouille');
          router.replace(`/learn/courses/${payment.course_id}`);
          return;
        }

        if (payment.status === 'failed') {
          setState('failed');
          return;
        }

        setState('pending');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Verification du paiement impossible');
        setState('failed');
      }
    };

    verifyPayment();
  }, [reference, router]);

  const Icon = state === 'completed' ? CheckCircle2 : state === 'failed' ? XCircle : Clock;
  const title = state === 'completed'
    ? 'Paiement confirme'
    : state === 'failed'
      ? 'Paiement non confirme'
      : state === 'pending'
        ? 'Paiement en attente'
        : 'Verification du paiement';
  const message = state === 'completed'
    ? 'Votre cours est deverrouille. Redirection vers le lecteur.'
    : state === 'failed'
      ? 'Nous n avons pas pu confirmer ce paiement. Vous pouvez reessayer depuis le catalogue.'
      : 'La confirmation Mobile Money peut prendre quelques instants. Cette page verifie le statut cote serveur.';

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-lg text-center">
        <CardContent className="py-10">
          <Icon className={`mx-auto mb-4 h-14 w-14 ${
            state === 'completed' ? 'text-emerald-500' : state === 'failed' ? 'text-red-500' : 'text-amber-500'
          }`} />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">{message}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {courseId && state !== 'failed' && (
              <Button onClick={() => router.push(`/learn/courses/${courseId}`)}>
                Ouvrir le cours
              </Button>
            )}
            <Button variant="secondary" onClick={() => router.push('/learn')}>
              Retour au catalogue
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}


export default function CinetPayReturnPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="py-10">
            <Clock className="mx-auto mb-4 h-14 w-14 text-amber-500" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Verification du paiement</h1>
          </CardContent>
        </Card>
      </main>
    }>
      <CinetPayReturnContent />
    </Suspense>
  );
}

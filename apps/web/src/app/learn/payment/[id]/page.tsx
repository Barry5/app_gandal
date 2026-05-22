'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  KeyRound,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { useAuth } from '@/components/providers/AuthProvider';
import { courseApi, paymentApi, type CatalogCourseDto, type CourseDetailDto } from '@/lib/api';

type PaymentMethod = 'mtn_momo' | 'orange_money' | 'card';

const paymentMethods: Array<{
  value: PaymentMethod;
  label: string;
  description: string;
  icon: typeof Smartphone;
}> = [
  {
    value: 'mtn_momo',
    label: 'MTN MoMo',
    description: 'Paiement mobile money instantane',
    icon: Smartphone,
  },
  {
    value: 'orange_money',
    label: 'Orange Money',
    description: 'Paiement par portefeuille mobile',
    icon: Wallet,
  },
  {
    value: 'card',
    label: 'Carte bancaire',
    description: 'Paiement par carte en mode test',
    icon: CreditCard,
  },
];

function formatPrice(price: number, currency = 'GNF') {
  if (price <= 0) return 'Gratuit';
  return `${price.toLocaleString('fr-FR')} ${currency}`;
}

function getLessonCount(course: CourseDetailDto | null) {
  return course?.modules.reduce((total, module) => total + module.lessons.length, 0) || 0;
}

export default function CoursePaymentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [course, setCourse] = useState<CourseDetailDto | null>(null);
  const [catalogCourse, setCatalogCourse] = useState<CatalogCourseDto | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mtn_momo');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [isRedeemingCode, setIsRedeemingCode] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      toast.error('Connectez-vous avec un compte apprenant');
      router.push('/auth/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  useEffect(() => {
    const loadPaymentContext = async () => {
      if (!params.id || !isAuthenticated) return;

      setIsLoading(true);
      try {
        const [detail, catalog] = await Promise.all([
          courseApi.getById(params.id),
          courseApi.catalog(),
        ]);
        const current = catalog.find((item) => item.id === params.id) || null;
        const isFreeCourse = Boolean(current?.isFree || detail.priceCfa <= 0);
        const isUnlocked = Boolean(current?.isUnlocked || isFreeCourse);

        if (isFreeCourse) {
          if (current?.enrollmentStatus !== 'paid') {
            await courseApi.enrollFree(params.id).catch(() => undefined);
          }
          router.replace(`/learn/courses/${params.id}`);
          return;
        }

        if (isUnlocked) {
          router.replace(`/learn/courses/${params.id}`);
          return;
        }

        setCourse(detail);
        setCatalogCourse(current);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Paiement indisponible');
        router.push('/learn');
      } finally {
        setIsLoading(false);
      }
    };

    loadPaymentContext();
  }, [params.id, isAuthenticated, router]);

  const lessonCount = useMemo(() => getLessonCount(course), [course]);

  const handleRedeemAccessCode = async () => {
    if (!course) return;
    const normalizedCode = accessCode.trim().toUpperCase();
    if (normalizedCode.length < 5) {
      toast.error('Saisissez le code donne par le formateur');
      return;
    }

    setIsRedeemingCode(true);
    try {
      await courseApi.redeemAccessCode(course.id, normalizedCode);
      toast.success('Code valide, cours deverrouille');
      router.replace(`/learn/courses/${course.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Code invalide');
    } finally {
      setIsRedeemingCode(false);
    }
  };

  const handlePayment = async () => {
    if (!course) return;

    setIsPaying(true);
    try {
      const payment = await paymentApi.initiate({
        courseId: course.id,
        amount: course.priceCfa,
        currency: 'GNF',
        paymentMethod,
      });
      if (!payment.paymentUrl) {
        throw new Error('URL de paiement CinetPay indisponible');
      }
      window.location.assign(payment.paymentUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Paiement impossible');
    } finally {
      setIsPaying(false);
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
        <Card className="mx-auto max-w-xl text-center">
          <CardContent className="py-10">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Cours introuvable</h1>
            <Button className="mt-6" onClick={() => router.push('/learn')}>
              Retour au catalogue
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/learn" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
          <ArrowLeft className="h-4 w-4" />
          Retour aux cours
        </Link>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="relative aspect-video bg-slate-100 dark:bg-slate-800">
                {course.thumbnailUrl ? (
                  <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-16 w-16 text-slate-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-5 left-5 right-5">
                  <Badge variant="warning" className="bg-white/90 dark:bg-slate-900/85">
                    <LockKeyhole className="mr-1 h-3.5 w-3.5" />
                    Cours payant
                  </Badge>
                  <h1 className="mt-3 text-2xl font-bold text-white sm:text-3xl">{course.title}</h1>
                  <p className="mt-1 text-sm text-white/75">{course.creatorName || 'Formateur'}</p>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {course.description || course.shortDescription || 'Acces complet aux modules, lecons et supports du cours apres validation du paiement.'}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{course.modules.length}</p>
                    <p className="text-xs text-slate-500">Modules</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{lessonCount}</p>
                    <p className="text-xs text-slate-500">Lecons</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{catalogCourse?.totalStudents || course.totalStudents}</p>
                    <p className="text-xs text-slate-500">Apprenants</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-5">
              <p className="text-sm font-medium text-slate-500">Montant a payer</p>
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">
                {formatPrice(course.priceCfa, catalogCourse?.currency || 'GNF')}
              </p>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-1 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-300" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-indigo-950 dark:text-indigo-100">J'ai un code formateur</p>
                  <p className="mt-1 text-xs leading-5 text-indigo-900/70 dark:text-indigo-100/70">
                    Si vous avez paye directement le formateur, saisissez le code recu pour ouvrir le cours.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <input
                      value={accessCode}
                      onChange={(event) => setAccessCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12))}
                      placeholder="EX: K7M2Q"
                      className="min-h-11 flex-1 rounded-xl border border-indigo-200 bg-white px-3 font-mono text-lg font-semibold uppercase tracking-[0.25em] text-slate-900 outline-none focus:border-indigo-500 dark:border-indigo-800 dark:bg-slate-950 dark:text-white"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      isLoading={isRedeemingCode}
                      onClick={handleRedeemAccessCode}
                    >
                      Valider
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="text-xs font-semibold uppercase text-slate-400">ou payer en ligne</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const selected = paymentMethod === method.value;

                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setPaymentMethod(method.value)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block font-semibold">{method.label}</span>
                        <span className="text-xs opacity-70">{method.description}</span>
                      </span>
                    </span>
                    {selected && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
Paiement en ligne via CinetPay lorsque vos identifiants sont configures. Le code formateur reste disponible pour les paiements hors ligne.
                </p>
              </div>
            </div>

            <Button
              className="mt-6 w-full"
              variant="gradient"
              size="lg"
              leftIcon={<CreditCard className="h-5 w-5" />}
              isLoading={isPaying}
              onClick={handlePayment}
            >
              Confirmer le paiement
            </Button>
          </aside>
        </div>
      </div>
    </main>
  );
}

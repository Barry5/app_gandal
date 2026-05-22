'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Eye, EyeOff, Lock, Mail, ShieldCheck, WalletCards } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/components/providers/AuthProvider';

const benefits = [
  {
    title: 'Espace formateur',
    description: 'Cours, élèves, revenus et certificats au même endroit.',
    icon: BookOpen,
  },
  {
    title: 'Paiements locaux',
    description: 'Une expérience pensée pour Mobile Money et les marchés africains.',
    icon: WalletCards,
  },
  {
    title: 'Accès sécurisé',
    description: 'Session protégée, API réelle et données stockées côté PostgreSQL.',
    icon: ShieldCheck,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!formData.email.trim()) nextErrors.email = 'Email requis';
    if (!formData.password) nextErrors.password = 'Mot de passe requis';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);
    try {
      await login(formData.email.trim(), formData.password);
      router.push('/dashboard');
    } catch {
      toast.error('Email ou mot de passe incorrect');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-slate-200 bg-white px-10 py-10 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <BookOpen className="h-6 w-6" />
            </span>
            <span className="text-xl font-semibold">Savoir-App</span>
          </Link>

          <div className="flex flex-1 flex-col justify-center">
            <div className="max-w-xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
                Plateforme de formation
              </p>
              <h1 className="text-5xl font-bold leading-tight tracking-normal text-slate-950 dark:text-white">
                Pilotez vos formations avec une interface claire et fiable.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300">
                Connectez-vous pour créer des cours, suivre vos apprenants et gérer la progression sans friction.
              </p>
            </div>

            <div className="mt-12 grid gap-4">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm dark:bg-slate-900">
                    <benefit.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-950 dark:text-white">{benefit.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <BookOpen className="h-6 w-6" />
              </span>
              <span className="text-xl font-semibold">Savoir-App</span>
            </div>

            <div className="mb-7">
              <p className="text-sm font-medium text-indigo-600">Connexion</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Ravi de vous revoir</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Accédez à votre espace et reprenez votre travail là où vous l&apos;avez laissé.
              </p>
            </div>

            <Card padding="lg" className="rounded-2xl border-slate-200 shadow-sm dark:border-slate-800">
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Adresse email"
                  type="email"
                  placeholder="nom@exemple.com"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  error={errors.email}
                  leftIcon={<Mail className="h-5 w-5" />}
                  autoComplete="email"
                />

                <div className="relative">
                  <Input
                    label="Mot de passe"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Votre mot de passe"
                    value={formData.password}
                    onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    error={errors.password}
                    leftIcon={<Lock className="h-5 w-5" />}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-9 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    Se souvenir de moi
                  </label>
                  <Link href="/auth/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                    Mot de passe oublié
                  </Link>
                </div>

                <Button type="submit" className="w-full" size="lg" isLoading={isLoading} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Se connecter
                </Button>
              </form>
            </Card>

            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Pas encore de compte ?{' '}
              <Link href="/auth/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Créer un compte
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

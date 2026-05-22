'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Check, Eye, EyeOff, GraduationCap, Lock, Mail, Phone, User, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Navigation';
import { useAuth } from '@/components/providers/AuthProvider';

const creatorHighlights = [
  'Créer et publier vos cours',
  'Suivre vos élèves',
  'Vendre en monnaie locale',
  'Préparer vos certificats',
];

const learnerHighlights = [
  'Accéder aux formations',
  'Suivre votre progression',
  'Apprendre sur mobile',
  'Obtenir des certificats',
];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState<'creator' | 'learner'>('creator');
  const [formData, setFormData] = useState({
    businessName: '',
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const highlights = accountType === 'creator' ? creatorHighlights : learnerHighlights;
  const passwordStrength = useMemo(() => {
    let score = 0;
    if (formData.password.length >= 8) score += 1;
    if (/[A-Z]/.test(formData.password)) score += 1;
    if (/[0-9]/.test(formData.password)) score += 1;
    if (/[^A-Za-z0-9]/.test(formData.password)) score += 1;
    return score;
  }, [formData.password]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading) return;

    setSubmitError('');
    const nextErrors: Record<string, string> = {};
    if (accountType === 'creator' && !formData.businessName.trim()) nextErrors.businessName = 'Nom de l\'académie requis';
    if (!formData.name.trim()) nextErrors.name = 'Nom complet requis';
    if (!formData.email.trim()) nextErrors.email = 'Email requis';
    if (formData.password.length < 8) nextErrors.password = 'Minimum 8 caractères';
    if (formData.password !== formData.confirmPassword) nextErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    if (!formData.agreeTerms) nextErrors.agreeTerms = 'Vous devez accepter les conditions';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);
    try {
      await register({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        role: accountType,
        businessName: accountType === 'creator' ? formData.businessName.trim() : undefined,
      });
      toast.success('Compte créé avec succès');
      router.push(accountType === 'creator' ? '/dashboard' : '/learn');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la creation du compte';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden border-r border-slate-200 bg-white px-10 py-10 dark:border-slate-800 dark:bg-slate-900 lg:flex lg:flex-col">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <BookOpen className="h-6 w-6" />
            </span>
            <span className="text-xl font-semibold">Savoir-App</span>
          </Link>

          <div className="flex flex-1 flex-col justify-center">
            <Badge variant="subtle" className="mb-5 w-fit">Configuration en moins de 2 minutes</Badge>
            <h1 className="max-w-xl text-5xl font-bold leading-tight tracking-normal">
              Créez un espace prêt pour vendre, apprendre et suivre la progression.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 dark:text-slate-300">
              Une inscription claire, reliée à l&apos;API et à PostgreSQL Supabase, pour démarrer sur une base solide.
            </p>

            <div className="mt-10 grid gap-3">
              {highlights.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
          <div className="w-full max-w-xl">
            <div className="mb-7 flex items-center justify-center gap-3 lg:hidden">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <BookOpen className="h-6 w-6" />
              </span>
              <span className="text-xl font-semibold">Savoir-App</span>
            </div>

            <div className="mb-7">
              <p className="text-sm font-medium text-indigo-600">Créer un compte</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">Choisissez votre espace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Le rôle choisi détermine l&apos;accueil et les outils disponibles après inscription.
              </p>
            </div>

            <div className="mb-5">
              <Tabs
                tabs={[
                  { id: 'creator', label: 'Formateur', icon: <GraduationCap className="h-4 w-4" /> },
                  { id: 'learner', label: 'Apprenant', icon: <Users className="h-4 w-4" /> },
                ]}
                activeTab={accountType}
                onChange={(id) => setAccountType(id as 'creator' | 'learner')}
              />
            </div>

            <Card padding="lg" className="rounded-2xl border-slate-200 shadow-sm dark:border-slate-800">
              <form onSubmit={handleSubmit} className="space-y-4">
                {submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {submitError}
                  </div>
                )}

                {accountType === 'creator' && (
                  <Input
                    label="Nom de l'académie"
                    placeholder="Ex: Académie Diallo"
                    value={formData.businessName}
                    onChange={(event) => setFormData({ ...formData, businessName: event.target.value })}
                    error={errors.businessName}
                    leftIcon={<BookOpen className="h-5 w-5" />}
                  />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Nom complet"
                    placeholder="Mamadou Diallo"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    error={errors.name}
                    leftIcon={<User className="h-5 w-5" />}
                    autoComplete="name"
                  />
                  <Input
                    label="Téléphone"
                    type="tel"
                    placeholder="+224 600 00 00 00"
                    value={formData.phone}
                    onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                    leftIcon={<Phone className="h-5 w-5" />}
                    autoComplete="tel"
                  />
                </div>

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

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <Input
                      label="Mot de passe"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="8 caractères minimum"
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                      error={errors.password}
                      leftIcon={<Lock className="h-5 w-5" />}
                      autoComplete="new-password"
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
                  <Input
                    label="Confirmation"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Répétez le mot de passe"
                    value={formData.confirmPassword}
                    onChange={(event) => setFormData({ ...formData, confirmPassword: event.target.value })}
                    error={errors.confirmPassword}
                    leftIcon={<Lock className="h-5 w-5" />}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((item) => (
                      <span
                        key={item}
                        className={`h-1.5 rounded-full ${item < passwordStrength ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Utilisez au moins 8 caractères. Ajoutez chiffres et symboles si possible.</p>
                </div>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={formData.agreeTerms}
                      onChange={(event) => setFormData({ ...formData, agreeTerms: event.target.checked })}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>
                      J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité.
                    </span>
                  </label>
                  {errors.agreeTerms && <p className="mt-1 text-sm text-red-500">{errors.agreeTerms}</p>}
                </div>

                <Button type="submit" className="w-full" size="lg" isLoading={isLoading} rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Créer mon compte
                </Button>
              </form>
            </Card>

            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              Déjà inscrit ?{' '}
              <Link href="/auth/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Se connecter
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

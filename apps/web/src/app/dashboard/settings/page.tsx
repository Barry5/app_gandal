'use client';

import { User, Shield, CreditCard, LogOut, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge, Avatar } from '@/components/ui/DataDisplay';
import { useAuth } from '@/components/providers/AuthProvider';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function DashboardSettingsPage() {
  const { user, logout, isCreator, isAdmin } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Paramètres du compte</h1>
          <p className="text-gray-500">Gérez votre profil et votre formule.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Profil</CardTitle>
              <CardDescription>Vos informations de compte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar name={user?.name || 'Utilisateur'} size="xl" src={user?.avatarUrl || undefined} />
                <div>
                  <p className="text-lg font-bold">{user?.name}</p>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <div className="mt-2">
                    <Badge variant={isAdmin ? 'gradient' : isCreator ? 'info' : 'success'}>
                      {isAdmin ? 'Administrateur' : isCreator ? 'Formateur' : 'Apprenant'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formule</CardTitle>
              <CardDescription>Commission ou abonnement</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 text-indigo-500" />
                <div>
                  <p className="font-semibold">{isCreator ? 'Mon abonnement' : 'Votre compte'}</p>
                  <p className="text-sm text-gray-500">
                    {isCreator
                      ? 'Consultez votre formule actuelle, votre taux de commission et souscrivez a un plan sans commission.'
                      : 'Les abonnements sont disponibles pour les formateurs.'}
                  </p>
                </div>
              </div>
              {isCreator && (
                <Link href="/dashboard/subscription">
                  <Button variant="gradient" leftIcon={<CreditCard className="h-4 w-4" />}>Gérer mon abonnement</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
              <CardDescription>Gestion de votre connexion</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-emerald-500" />
                <div>
                  <p className="font-semibold">Sécurité</p>
                  <p className="text-sm text-gray-500">Votre session est protegee par jeton d'authentification.</p>
                </div>
              </div>
              <Button variant="error" leftIcon={<LogOut className="h-4 w-4" />} onClick={logout}>Déconnexion</Button>
            </CardContent>
          </Card>
        </div>

        {isCreator && (
          <Card variant="gradient">
            <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <GraduationCap className="mt-1 h-6 w-6 text-white/80" />
                <div>
                  <p className="text-lg font-bold text-white">Passez a 0% de commission</p>
                  <p className="text-sm text-white/80">
                    L'abonnement Pro conserve 100% de vos revenus de ventes, avec un essai gratuit de 14 jours.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/subscription">
                <Button variant="white" leftIcon={<User className="h-4 w-4" />}>Voir les plans</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
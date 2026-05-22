'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Lock,
  Bell,
  CreditCard,
  Palette,
  Globe,
  Shield,
  Camera,
  Mail,
  Phone,
  MapPin,
  Building,
  Link2,
  Save,
  Upload,
  Check,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  Smartphone,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Badge, Avatar } from '@/components/ui/DataDisplay';
import { useAuth } from '@/components/providers/AuthProvider';

const tabs = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'account', label: 'Compte', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'appearance', label: 'Apparence', icon: Palette },
];

export default function LearnerSettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, logout } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
              <p className="text-gray-500 dark:text-gray-400">Gérez votre compte et vos préférences</p>
            </div>
            <Button variant="outline" onClick={logout} leftIcon={<LogOut className="w-4 h-4" />}>
              Déconnexion
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <Card padding="sm">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Informations du profil</CardTitle>
                  <CardDescription>Gérez vos informations personnelles</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <Avatar name={user?.name || 'User'} size="xl" className="w-24 h-24 text-3xl" />
                      <button className="absolute bottom-0 right-0 p-2 bg-indigo-500 rounded-full text-white hover:bg-indigo-600 transition shadow-lg">
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Photo de profil</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">JPG, PNG ou GIF. Max 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Nom complet" defaultValue={user?.name} />
                    <Input label="Email" defaultValue={user?.email} type="email" />
                    <Input label="Téléphone" placeholder="+224 6XX XXX XXX" />
                    <Input label="Localisation" placeholder="Conakry, Guinea" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bio</label>
                    <textarea
                      rows={3}
                      placeholder="Parlez-nous de vous..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button leftIcon={<Save className="w-4 h-4" />}>Enregistrer</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'notifications' && (
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                  <CardDescription>Choisissez comment vous souhaitez être notifié</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Notifications par email', desc: 'Recevoir des notifications par email' },
                    { label: 'Rappels de cours', desc: 'Rappel avant le début d\'un cours' },
                    { label: 'Nouveaux messages', desc: 'Notification pour les nouveaux messages' },
                    { label: 'Résumé hebdomadaire', desc: 'Recevoir un résumé chaque semaine' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <button className="w-12 h-6 rounded-full bg-indigo-500 transition">
                        <div className="w-5 h-5 bg-white rounded-full translate-x-6" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {activeTab === 'security' && (
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Sécurité</CardTitle>
                  <CardDescription>Gérez la sécurité de votre compte</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Mot de passe</p>
                        <p className="text-sm text-gray-500">Dernière modification: Il y a 30 jours</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Modifier</Button>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Authentification à deux facteurs</p>
                        <p className="text-sm text-gray-500">Non activé</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Activer</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'appearance' && (
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Apparence</CardTitle>
                  <CardDescription>Personnalisez l'apparence de l'interface</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Mode d'affichage</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setIsDarkMode(false)}
                        className={`p-4 rounded-xl border-2 transition-all ${!isDarkMode ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Clair</p>
                      </button>
                      <button
                        onClick={() => setIsDarkMode(true)}
                        className={`p-4 rounded-xl border-2 transition-all ${isDarkMode ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`}
                      >
                        <Moon className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Sombre</p>
                      </button>
                      <button className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                        <Monitor className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">Système</p>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'account' && (
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Paramètres du compte</CardTitle>
                  <CardDescription>Gérez les paramètres généraux de votre compte</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Langue</p>
                        <p className="text-sm text-gray-500">Français</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center gap-3">
                      <Globe className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Fuseau horaire</p>
                        <p className="text-sm text-gray-500">GMT+0 (Conakry)</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="pt-4">
                    <Button variant="outline" leftIcon={<LogOut className="w-4 h-4" />} className="text-red-600" onClick={logout}>
                      Se déconnecter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
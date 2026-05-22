'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Badge, Avatar } from '@/components/ui/DataDisplay';
import DashboardLayout from '@/components/layout/DashboardLayout';

const tabs = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'account', label: 'Compte', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'billing', label: 'Facturation', icon: CreditCard },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'appearance', label: 'Apparence', icon: Palette },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres</h1>
          <p className="text-gray-500 dark:text-gray-400">Gérez votre compte et vos préférences</p>
        </div>

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
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'profile' && <ProfileSettings onImageUpload={handleImageUpload} profileImage={profileImage} />}
                {activeTab === 'account' && <AccountSettings />}
                {activeTab === 'notifications' && <NotificationsSettings />}
                {activeTab === 'billing' && <BillingSettings />}
                {activeTab === 'security' && <SecuritySettings />}
                {activeTab === 'appearance' && <AppearanceSettings isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function ProfileSettings({ onImageUpload, profileImage }: { onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; profileImage: string | null }) {
  const [formData, setFormData] = useState({
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    phone: '+224 612 34 56 78',
    bio: 'Formateur expert en marketing digital avec plus de 10 ans d\'expérience.',
    location: 'Conakry, Guinea',
    company: 'Savoir Academy',
    website: 'https://jeandupont.com',
  });

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Informations du profil</CardTitle>
        <CardDescription>Gérez vos informations personnelles et professionnelles</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <Avatar 
              name={formData.name} 
              src={profileImage || undefined} 
              size="xl" 
              className="w-24 h-24 text-3xl"
            />
            <button 
              className="absolute bottom-0 right-0 p-2 bg-indigo-500 rounded-full text-white hover:bg-indigo-600 transition shadow-lg"
              onClick={() => document.getElementById('avatar-upload')?.click()}
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImageUpload}
            />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Photo de profil</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">JPG, PNG ou GIF. Max 2MB.</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nom complet
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Localisation
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Entreprise
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Site web
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Bio
          </label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={4}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button leftIcon={<Save className="w-4 h-4" />}>
            Enregistrer les modifications
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountSettings() {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Paramètres du compte</CardTitle>
        <CardDescription>Gérez les paramètres généraux de votre compte</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
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

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Devise</p>
                <p className="text-sm text-gray-500">GNF - Franc Guinéen</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" leftIcon={<LogOut className="w-4 h-4" />} className="text-red-600 hover:bg-red-50 hover:border-red-300">
            Se déconnecter de tous les appareils
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsSettings() {
  const [notifications, setNotifications] = useState({
    emailNewEnrollment: true,
    emailNewReview: true,
    emailNewPayment: true,
    emailWeeklyDigest: false,
    pushNewEnrollment: true,
    pushNewMessage: true,
    pushCourseUpdates: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications({ ...notifications, [key]: !notifications[key] });
  };

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>Choisissez comment vous souhaitez être notifié</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notifications par email</h3>
          <div className="space-y-3">
            {[
              { key: 'emailNewEnrollment', label: 'Nouvelle inscription', desc: 'Quando un élève s\'inscrit à vos cours' },
              { key: 'emailNewReview', label: 'Nouvel avis', desc: 'Quando un élève laisse un avis' },
              { key: 'emailNewPayment', label: 'Nouveau paiement', desc: 'Quando vous recevez un paiement' },
              { key: 'emailWeeklyDigest', label: 'Résumé hebdomadaire', desc: 'Recevoir un résumé chaque semaine' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleNotification(item.key as keyof typeof notifications)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications[item.key as keyof typeof notifications] ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Notifications push</h3>
          <div className="space-y-3">
            {[
              { key: 'pushNewEnrollment', label: 'Nouvelle inscription', desc: 'Notifications en temps réel' },
              { key: 'pushNewMessage', label: 'Nouveau message', desc: 'Quando vous recevez un message' },
              { key: 'pushCourseUpdates', label: 'Mises à jour des cours', desc: 'Changements sur vos cours' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => toggleNotification(item.key as keyof typeof notifications)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    notifications[item.key as keyof typeof notifications] ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    notifications[item.key as keyof typeof notifications] ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BillingSettings() {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Facturation</CardTitle>
        <CardDescription>Gérez vos méthodes de paiement et votre abonnement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Plan actuel</p>
              <p className="text-2xl font-bold">Pro</p>
            </div>
            <Badge className="bg-white/20 text-white border-0">Actif</Badge>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-white/80">Prochain paiement: 15 Avril 2024</p>
            <p className="font-semibold">25,000 GNF/mois</p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Méthodes de paiement</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  OR
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Orange Money</p>
                  <p className="text-sm text-gray-500">•••• •••• •••• 1234</p>
                </div>
              </div>
              <Badge variant="success" size="sm">Par défaut</Badge>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 bg-yellow-500 rounded flex items-center justify-center text-white text-xs font-bold">
                  MT
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">MTN Mobile Money</p>
                  <p className="text-sm text-gray-500">•••• •••• •••• 5678</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Définir par défaut</Button>
            </div>

            <Button variant="outline" leftIcon={<CreditCard className="w-4 h-4" />} className="w-full">
              Ajouter une méthode de paiement
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Historique des factures</h3>
          <div className="space-y-2">
            {[
              { date: '15 Mars 2024', amount: '25,000 GNF', status: 'paid' },
              { date: '15 Février 2024', amount: '25,000 GNF', status: 'paid' },
              { date: '15 Janvier 2024', amount: '25,000 GNF', status: 'paid' },
            ].map((invoice, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                <span className="text-gray-900 dark:text-white">{invoice.date}</span>
                <span className="text-gray-900 dark:text-white font-medium">{invoice.amount}</span>
                <Badge variant="success" size="sm">Payé</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SecuritySettings() {
  const [showPassword, setShowPassword] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Sécurité</CardTitle>
        <CardDescription>Gérez la sécurité de votre compte</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Changer le mot de passe</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nouveau mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirmer le mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button leftIcon={<Lock className="w-4 h-4" />}>
              Mettre à jour le mot de passe
            </Button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Authentification à deux facteurs</h3>
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">2FA activé</p>
                <p className="text-sm text-gray-500">Via SMS et email</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Gérer</Button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Sessions actives</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Chrome - Windows</p>
                  <p className="text-sm text-gray-500">Conakry, actif maintenant</p>
                </div>
              </div>
              <Badge variant="success" size="sm">Actuel</Badge>
            </div>
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Safari - iPhone</p>
                  <p className="text-sm text-gray-500">Conakry, il y a 2h</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">Déconnecter</Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AppearanceSettings({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean; setIsDarkMode: (v: boolean) => void }) {
  return (
    <Card padding="lg">
      <CardHeader>
        <CardTitle>Apparence</CardTitle>
        <CardDescription>Personnalisez l'apparence de l'interface</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Mode d'affichage</h3>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setIsDarkMode(false)}
              className={`p-4 rounded-xl border-2 transition-all ${
                !isDarkMode ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <Sun className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Clair</p>
            </button>
            <button
              onClick={() => setIsDarkMode(true)}
              className={`p-4 rounded-xl border-2 transition-all ${
                isDarkMode ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <Moon className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Sombre</p>
            </button>
            <button
              onClick={() => setIsDarkMode(false)}
              className="p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700"
            >
              <Monitor className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">Système</p>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Accent</h3>
          <div className="flex gap-3">
            {['indigo', 'purple', 'blue', 'green', 'orange', 'pink'].map((color) => (
              <button
                key={color}
                className={`w-10 h-10 rounded-full bg-${color}-500 hover:scale-110 transition-transform`}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
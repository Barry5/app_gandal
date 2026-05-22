'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Award,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  ChevronLeft,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, Badge } from '@/components/ui/DataDisplay';
import { useAuth, type UserRole } from '@/components/providers/AuthProvider';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  description: string;
  badge?: number;
}

const creatorNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Tableau de bord', href: '/dashboard', description: 'Vue globale' },
  { icon: BookOpen, label: 'Mes cours', href: '/dashboard/courses', description: 'Formations' },
  { icon: Users, label: 'Ã‰lÃ¨ves', href: '/dashboard/students', description: 'Suivi' },
  { icon: BarChart3, label: 'Analytics', href: '/dashboard/analytics', description: 'Performance' },
  { icon: MessageSquare, label: 'Messages', href: '/dashboard/messages', description: 'Ã‰changes', badge: 3 },
  { icon: Award, label: 'Certificats', href: '/dashboard/certificates', description: 'Validations' },
  { icon: Settings, label: 'ParamÃ¨tres', href: '/dashboard/settings', description: 'Compte' },
];

const learnerNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Accueil', href: '/learn', description: 'Continuer' },
  { icon: BookMarked, label: 'Mes cours', href: '/learn/courses', description: 'Inscriptions' },
  { icon: Trophy, label: 'SuccÃ¨s', href: '/learn/achievements', description: 'Badges' },
  { icon: Calendar, label: 'Planning', href: '/learn/schedule', description: 'Agenda' },
  { icon: Award, label: 'Certificats', href: '/learn/certificates', description: 'Acquis' },
  { icon: Settings, label: 'ParamÃ¨tres', href: '/learn/settings', description: 'Compte' },
];

function getRoleLabel(role: UserRole | undefined) {
  switch (role) {
    case 'creator':
      return 'Formateur';
    case 'admin':
      return 'Administrateur';
    case 'learner':
      return 'Apprenant';
    default:
      return 'Utilisateur';
  }
}

function getRoleColor(role: UserRole | undefined) {
  switch (role) {
    case 'creator':
      return 'bg-indigo-600';
    case 'admin':
      return 'bg-red-600';
    case 'learner':
      return 'bg-emerald-600';
    default:
      return 'bg-slate-600';
  }
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isCreator, isAdmin, isAuthenticated, isLoading } = useAuth();
  const adminNavItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Vue admin', href: '/dashboard', description: 'Pilotage' },
    { icon: ShieldCheck, label: 'Administration', href: '/dashboard/admin', description: 'Gouvernance' },
    { icon: BookOpen, label: 'Cours', href: '/dashboard/courses', description: 'Supervision' },
    { icon: Settings, label: 'Parametres', href: '/dashboard/settings', description: 'Systeme' },
  ];
  const isDashboardUser = isCreator || isAdmin;
  const navItems = isAdmin ? adminNavItems : isCreator ? creatorNavItems : learnerNavItems;

  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const sync = () => {
      setIsDesktop(media.matches);
      setSidebarOpen(media.matches);
    };

    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false);
  }, [pathname, isDesktop]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (pathname.startsWith('/dashboard') && !isDashboardUser) {
      router.push('/learn');
    }
  }, [isAuthenticated, isDashboardUser, isLoading, pathname, router]);

  const collapsed = isDesktop && !sidebarOpen;
  const sidebarWidth = sidebarOpen ? 280 : 84;
  const isDashboardRoute = pathname.startsWith('/dashboard');

  if (isLoading || !isAuthenticated || (isDashboardRoute && !isDashboardUser)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Verification des droits...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      {!isDesktop && sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <motion.aside
        initial={false}
        animate={isDesktop ? { width: sidebarWidth, x: 0 } : { width: 280, x: sidebarOpen ? 0 : -300 }}
        transition={{ duration: 0.2 }}
        className="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900 lg:shadow-none"
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          {!collapsed && (
            <Link href={isDashboardUser ? '/dashboard' : '/learn'} className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <GraduationCap className="h-6 w-6" />
              </span>
              <span className="truncate text-xl font-semibold">Savoir</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={sidebarOpen ? 'RÃ©duire le menu' : 'Ouvrir le menu'}
          >
            {isDesktop ? (
              sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="px-4 py-4">
            <div className={`rounded-xl ${getRoleColor(user?.role)} px-4 py-3 text-white`}>
              <p className="text-sm font-semibold">{getRoleLabel(user?.role)}</p>
              <p className="truncate text-xs text-white/75">{user?.name || 'Utilisateur'}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{item.label}</span>
                      <span className={`block truncate text-xs ${isActive ? 'text-white/75' : 'text-slate-400'}`}>
                        {item.description}
                      </span>
                    </span>
                    {item.badge && <Badge variant="error" size="sm">{item.badge}</Badge>}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
              <Avatar name={user?.name || 'Utilisateur'} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user?.name || 'Utilisateur'}</p>
                <p className="text-xs text-slate-500">{getRoleLabel(user?.role)}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                title="DÃ©connexion"
                aria-label="DÃ©connexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </motion.aside>

      <motion.main
        initial={false}
        animate={{ marginLeft: isDesktop ? sidebarWidth : 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-screen"
      >
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white lg:hidden"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500 dark:border-slate-900" />
              </button>
              <Link
                href={isDashboardUser ? '/dashboard/settings' : '/learn/settings'}
                className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Avatar name={user?.name || 'Utilisateur'} size="sm" />
                <span className="hidden text-left md:block">
                  <span className="block max-w-40 truncate text-sm font-semibold">{user?.name || 'Utilisateur'}</span>
                  <span className="block text-xs text-slate-500">{getRoleLabel(user?.role)}</span>
                </span>
              </Link>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6">{children}</div>
      </motion.main>
    </div>
  );
}


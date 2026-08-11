'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Award,
  Clock,
  Play,
  Search,
  Star,
  Users,
  Trophy,
  Target,
  Calendar,
  Settings,
  Bell,
  LogOut,
  GraduationCap,
  BookMarked,
  LayoutDashboard,
  Menu,
  CreditCard,
  LockKeyhole,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge, Avatar, StatsCard } from '@/components/ui/DataDisplay';
import { useAuth } from '@/components/providers/AuthProvider';
import { courseApi, gamificationApi, type CatalogCourseDto, type GamificationBadgeDto } from '@/lib/api';
import { toast } from 'sonner';

const courseFallbackImage =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=450&fit=crop';

function formatPrice(price: number, currency = 'GNF') {
  if (price <= 0) return 'Gratuit';
  return `${price.toLocaleString('fr-FR')} ${currency}`;
}

function formatDuration(hours: number) {
  if (!hours) return 'A votre rythme';
  return `${hours} h`;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Accueil', href: '/learn' },
  { icon: BookMarked, label: 'Mes cours', href: '/learn/courses' },
  { icon: Trophy, label: 'Succès', href: '/learn/achievements' },
  { icon: Calendar, label: 'Planning', href: '/learn/schedule' },
  { icon: Award, label: 'Certificats', href: '/learn/certificates' },
  { icon: Settings, label: 'Paramètres', href: '/learn/settings' },
];

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState('courses');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogCourses, setCatalogCourses] = useState<CatalogCourseDto[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [pendingCourseId, setPendingCourseId] = useState<string | null>(null);
  const [badges, setBadges] = useState<GamificationBadgeDto[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [isLoadingBadges, setIsLoadingBadges] = useState(true);
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();

  const loadCatalog = async () => {
    setIsLoadingCourses(true);
    try {
      const courses = await courseApi.catalog();
      setCatalogCourses(courses);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Chargement des cours impossible');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const loadBadges = async () => {
    setIsLoadingBadges(true);
    try {
      const [profile, all] = await Promise.all([gamificationApi.profile(), gamificationApi.allBadges()]);
      const earnedIds = new Set(profile.badges.map((badge) => badge.id));
      const byType = new Map(profile.badges.map((badge) => [badge.type, badge]));
      setEarnedBadgeIds(earnedIds);
      setBadges(all.map((badge) => byType.get(badge.type) || badge));
    } catch (error) {
      setBadges([]);
      setEarnedBadgeIds(new Set());
      toast.error(error instanceof Error ? error.message : 'Chargement des succès impossible');
    } finally {
      setIsLoadingBadges(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadBadges();
  }, [isAuthenticated]);

  const visibleCourses = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return catalogCourses;
    return catalogCourses.filter((course) =>
      `${course.title} ${course.shortDescription} ${course.creatorName || ''}`.toLowerCase().includes(query)
    );
  }, [catalogCourses, searchQuery]);

  const unlockedCourses = catalogCourses.filter((course) => course.isUnlocked);
  const totalUnlockedLessons = unlockedCourses.reduce((acc, course) => acc + course.lessonCount, 0);
  const completedUnlockedLessons = unlockedCourses.reduce((acc, course) => acc + course.completedLessonCount, 0);
  const totalProgress = totalUnlockedLessons
    ? Math.round((completedUnlockedLessons / totalUnlockedLessons) * 100)
    : 0;
  const completedCourses = unlockedCourses.filter(c => c.progressPercent === 100).length;
  const certificatesEarned = completedCourses;
  const studyHours = unlockedCourses.reduce((acc, course) => acc + course.durationHours, 0);
  const lockedCourses = catalogCourses.filter((course) => !course.isUnlocked);
  const freeCourses = catalogCourses.filter((course) => course.isFree).length;
  const paidLockedCourses = lockedCourses.filter((course) => !course.isFree).length;

  const handleFreeEnroll = async (course: CatalogCourseDto) => {
    setPendingCourseId(course.id);
    try {
      await courseApi.enrollFree(course.id);
      toast.success('Cours gratuit ajoute a vos cours');
      await loadCatalog();
      router.push(`/learn/courses/${course.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Déverrouillage impossible');
    } finally {
      setPendingCourseId(null);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="fixed left-0 top-0 h-full bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-gray-700 z-50 transition-all duration-300"
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          {sidebarOpen && (
            <Link href="/learn" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Savoir
              </span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Role Badge */}
        {sidebarOpen && (
          <div className="px-4 py-3">
            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-center">
              <p className="text-sm font-medium">Apprenant</p>
              <p className="text-xs text-white/70">{user?.name}</p>
            </div>
          </div>
        )}

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = (item.href === '/learn' && activeTab === 'courses') || 
                           (item.href === '/learn/courses' && activeTab === 'courses') ||
                           (item.href === '/learn/achievements' && activeTab === 'achievements') ||
                           (item.href === '/learn/schedule' && activeTab === 'schedule');
            return (
              <button
                key={item.href}
                onClick={() => {
                  if (item.href === '/learn/courses') setActiveTab('courses');
                  else if (item.href === '/learn/achievements') setActiveTab('achievements');
                  else if (item.href === '/learn/schedule') setActiveTab('schedule');
                  else router.push(item.href);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === 'courses' && item.href === '/learn'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition"
            >
              <LogOut className="w-5 h-5" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">Déconnexion</p>
              </div>
            </button>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 280 : 80 }}
        className="flex-1 transition-all duration-300 min-h-screen"
      >
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher un cours..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="pl-10 pr-4 py-2.5 w-72 rounded-xl bg-gray-100 dark:bg-gray-700/50 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-800" />
              </button>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-600 dark:text-gray-400"
              >
                <LogOut className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/learn/settings')}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <Avatar name={user?.name || 'Apprenant'} size="sm" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {/* Welcome & Stats */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Bienvenue, {user?.name || 'Apprenant'} ! 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Continuez votre parcours d'apprentissage</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              label="Progression globale"
              value={`${totalProgress}%`}
              icon={<Target className="w-6 h-6" />}
              color="indigo"
            />
            <StatsCard
              label="Cours terminés"
              value={completedCourses}
              icon={<BookOpen className="w-6 h-6" />}
              color="green"
            />
            <StatsCard
              label="Certificats"
              value={certificatesEarned}
              icon={<Award className="w-6 h-6" />}
              color="purple"
            />
            <StatsCard
              label="Heures d'apprentissage"
              value={studyHours}
              icon={<Clock className="w-6 h-6" />}
              color="orange"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
            {['courses', 'achievements', 'schedule'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab === 'courses' ? 'Mes cours' : tab === 'achievements' ? 'Succès' : 'Planning'}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'courses' && (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Mes cours et catalogue</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {unlockedCourses.length} cours lisible(s), {freeCourses} gratuit(s), {paidLockedCourses} payant(s) a debloquer.
                  </p>
                </div>
                <div className="relative md:hidden">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un cours..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {!isLoadingCourses && (
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Mes cours debloques</p>
                        <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-200">
                          {unlockedCourses.length ? 'Lecture disponible maintenant.' : 'Aucun cours debloque pour le moment.'}
                        </p>
                      </div>
                      {unlockedCourses[0] && (
                        <Button
                          variant="gradient"
                          leftIcon={<Play className="h-4 w-4" />}
                          onClick={() => router.push(`/learn/courses/${unlockedCourses[0].id}`)}
                        >
                          Lire mon dernier cours
                        </Button>
                      )}
                    </div>
                    {unlockedCourses.length > 0 && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {unlockedCourses.slice(0, 2).map((course) => (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => router.push(`/learn/courses/${course.id}`)}
                            className="rounded-xl border border-emerald-200 bg-white p-3 text-left transition hover:border-emerald-400 dark:border-emerald-900/60 dark:bg-slate-900"
                          >
                            <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{course.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{course.completedLessonCount}/{course.lessonCount} lecons</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-white p-4 dark:border-amber-900/50 dark:bg-slate-900">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Acces aux cours</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-emerald-50 p-3 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
                        <p className="text-2xl font-bold">{freeCourses}</p>
                        <p className="text-xs">Gratuit(s) lisibles</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="text-2xl font-bold">{paidLockedCourses}</p>
                        <p className="text-xs">Payant(s) verrouilles</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isLoadingCourses ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3].map((item) => (
                    <Card key={item} padding="none" className="overflow-hidden">
                      <div className="aspect-video animate-pulse bg-gray-200 dark:bg-gray-700" />
                      <CardContent className="p-4 space-y-3">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-9 w-full animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : visibleCourses.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <Search className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Aucun cours publie</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Les cours publies par les formateurs apparaitront ici.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {visibleCourses.map((course, index) => {
                    const priceLabel = formatPrice(course.priceCfa, course.currency);
                    const canContinue = course.isUnlocked || course.isFree;
                    const accessLabel = course.isFree ? 'Gratuit' : course.isUnlocked ? 'Deverrouille' : priceLabel;
                    const isPending = pendingCourseId === course.id;
                    const completedLessons = Math.min(course.completedLessonCount, course.lessonCount);
                    const remainingLessons = Math.max(course.lessonCount - completedLessons, 0);
                    const progressLabel = `${completedLessons}/${course.lessonCount} lecons`;
                    const remainingLabel = remainingLessons <= 1 ? `${remainingLessons} restante` : `${remainingLessons} restantes`;

                    const openCourse = () => {
                      if (canContinue) {
                        if (course.isFree && course.enrollmentStatus !== 'paid') {
                          handleFreeEnroll(course);
                          return;
                        }
                        router.push(`/learn/courses/${course.id}`);
                        return;
                      }
                      router.push(`/learn/payment/${course.id}`);
                    };

                    return (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: index * 0.04 }}
                      >
                        <Card
                          padding="none"
                          className="h-full cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                          onClick={openCourse}
                        >
                          <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                            <img
                              src={course.thumbnailUrl || courseFallbackImage}
                              alt={course.title}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                            <div className="absolute left-4 right-4 top-4 flex items-start justify-between gap-2">
                              <Badge
                                variant={course.isFree ? 'info' : course.isUnlocked ? 'success' : 'warning'}
                                className="bg-white/90 dark:bg-slate-900/85"
                              >
                                {course.isFree ? (
                                  <BookOpen className="mr-1 h-3.5 w-3.5" />
                                ) : course.isUnlocked ? (
                                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                                ) : (
                                  <LockKeyhole className="mr-1 h-3.5 w-3.5" />
                                )}
                                {accessLabel}
                              </Badge>
                              {course.avgRating > 0 && (
                                <Badge variant="default" className="bg-white/90 dark:bg-slate-900/85">
                                  <Star className="mr-1 h-3.5 w-3.5 fill-current" />
                                  {course.avgRating.toFixed(1)}
                                </Badge>
                              )}
                            </div>
                            <div className="absolute bottom-4 left-4 right-4">
                              <h3 className="line-clamp-2 text-lg font-semibold text-white">{course.title}</h3>
                              <p className="mt-1 text-sm text-white/75">{course.creatorName || 'Formateur'}</p>
                            </div>
                          </div>

                          <CardContent className="flex h-full flex-col p-4">
                            <p className="mb-4 line-clamp-2 min-h-[2.5rem] text-sm text-gray-600 dark:text-gray-300">
                              {course.shortDescription || course.description || 'Cours structure en modules et lecons.'}
                            </p>

                            <div className="mb-4 grid grid-cols-3 gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <Layers className="h-4 w-4" />
                                {course.moduleCount} modules
                              </span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-4 w-4" />
                                {course.lessonCount} lecons
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                {formatDuration(course.durationHours)}
                              </span>
                            </div>

                            {canContinue && (
                              <div className="mb-4">
                                <div className="mb-2 flex items-center justify-between text-sm">
                                  <span className="text-gray-500">Progression</span>
                                  <span className="font-semibold text-gray-900 dark:text-white">{course.progressPercent}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${course.progressPercent}%` }}
                                    transition={{ duration: 0.6 }}
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
                                  />
                                </div>
                                <div className="mt-2 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center gap-1.5">
                                    <BookOpen className="h-4 w-4" />
                                    {progressLabel}
                                  </span>
                                  <span>{remainingLabel}</span>
                                </div>
                              </div>
                            )}

                            {!canContinue && (
                              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                                <div className="flex items-start gap-3">
                                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold">Paiement requis</p>
                                    <p className="mt-1 text-xs leading-5 opacity-80">
                                      Choisissez ce cours puis confirmez le paiement de test pour ouvrir les lecons.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="mt-auto flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                                <Users className="h-4 w-4" />
                                {course.totalStudents} apprenants
                              </span>
                              <span className="text-base font-semibold text-gray-900 dark:text-white">
                                {priceLabel}
                              </span>
                            </div>

                            <Button
                              className="mt-4 w-full"
                              variant={canContinue ? 'gradient' : 'default'}
                              leftIcon={canContinue ? <Play className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                              isLoading={isPending}
                              onClick={(event) => {
                                event.stopPropagation();
                                openCourse();
                              }}
                            >
                              {canContinue ? course.isFree ? 'Lire gratuitement' : 'Lire maintenant' : 'Payer et deverrouiller'}
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div>
              {isLoadingBadges ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <Card key={item}>
                      <CardContent className="flex items-center gap-4">
                        <div className="h-14 w-14 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-700" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                          <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : badges.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <Trophy className="h-7 w-7 text-amber-600 dark:text-amber-300" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Aucun succès pour le moment</h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Terminez vos leçons, quiz et cours pour gagner des badges et de l'expérience.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {badges.map((badge, index) => {
                    const earned = earnedBadgeIds.has(badge.id);
                    const earnedDate = badge.earned_at ? new Date(badge.earned_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
                    return (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <Card className={earned ? '' : 'opacity-60'}>
                          <CardContent className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                              earned
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                                : 'bg-gray-100 dark:bg-gray-700'
                            }`}>
                              {badge.icon}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{badge.name}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{badge.description}</p>
                              {earned ? (
                                earnedDate && <p className="mt-1 text-sm text-green-600">{earnedDate}</p>
                              ) : (
                                <p className="mt-1 text-xs text-gray-400">{badge.xp_reward} XP</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <Card>
              <CardHeader>
                <CardTitle>Planning de la semaine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <Calendar className="h-7 w-7 text-emerald-600 dark:text-emerald-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Aucun cours planifié</h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Vos prochaines sessions d'apprentissage apparaitront ici.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.main>
    </div>
  );
}

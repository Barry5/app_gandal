'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  Edit,
  Eye,
  Grid3X3,
  List,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { PriceInput } from '@/components/ui/PriceInput';
import { useAuth } from '@/components/providers/AuthProvider';
import { courseApi, type CourseDto, type CourseInput } from '@/lib/api';
import { toast } from 'sonner';

const statusConfig = {
  draft: { label: 'Brouillon', variant: 'warning' as const },
  published: { label: 'Publié', variant: 'success' as const },
  archived: { label: 'Archivé', variant: 'default' as const },
};

function getCourseImage(course: CourseDto) {
  return course.thumbnailUrl;
}

function formatPrice(priceCfa: number) {
  return priceCfa === 0 ? 'Gratuit' : `${priceCfa.toLocaleString('fr-FR')} GNF`;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CourseDto['status']>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDto | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const { isAdmin } = useAuth();

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await courseApi.listMine();
      setCourses(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les cours');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || course.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [courses, searchQuery, statusFilter]);

  const handleCreateCourse = async (course: CourseInput) => {
    const created = await courseApi.create(course);
    setCourses((current) => [created, ...current]);
    setShowCreateModal(false);
  };

  const handleUpdateCourse = async (course: CourseInput) => {
    if (!editingCourse) return;
    const updated = await courseApi.update(editingCourse.id, course);
    setCourses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setEditingCourse(null);
  };

  const handleDeleteCourse = async (id: string) => {
    try {
      setPendingAction(id);
      await courseApi.delete(id);
      setCourses((current) => current.filter((course) => course.id !== id));
      setShowDeleteConfirm(null);
    } finally {
      setPendingAction(null);
    }
  };

  const handlePublishCourse = async (id: string) => {
    try {
      setPendingAction(id);
      const updated = await courseApi.publish(id);
      setCourses((current) => current.map((course) => (course.id === id ? updated : course)));
      toast.success('Cours publié');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Publication impossible');
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mes cours</h1>
            <p className="text-gray-500 dark:text-gray-400">Gérez et publiez vos formations depuis l&apos;API.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadCourses} disabled={isLoading}>
              Actualiser
            </Button>
            {!isAdmin && (
              <Link href="/courses/create">
                <Button leftIcon={<Plus className="w-5 h-5" />}>
                  Nouveau cours
                </Button>
              </Link>
            )}
          </div>
        </div>

        <Card padding="md">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un cours..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700/50"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700/50"
              >
                <option value="all">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="archived">Archivé</option>
              </select>
              <div className="flex overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2.5 ${viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  aria-label="Vue grille"
                >
                  <Grid3X3 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2.5 ${viewMode === 'list' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  aria-label="Vue liste"
                >
                  <List className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </Card>

        {isLoading && (
          <Card className="py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
            <p className="mt-4 text-sm text-gray-500">Chargement des cours...</p>
          </Card>
        )}

        {!isLoading && error && (
          <Card className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Chargement impossible</h3>
            <p className="mb-6 text-gray-500">{error}</p>
            <Button onClick={loadCourses}>Réessayer</Button>
          </Card>
        )}

        {!isLoading && !error && filteredCourses.length === 0 && (
          <Card className="py-12 text-center">
            <BookOpen className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Aucun cours trouvé</h3>
            <p className="mb-6 text-gray-500 dark:text-gray-400">
              Créez votre premier cours ou ajustez les filtres.
            </p>
            <Link href="/courses/create">
              <Button leftIcon={<Plus className="h-5 w-5" />}>
                Créer un cours
              </Button>
            </Link>
          </Card>
        )}

        {!isLoading && !error && filteredCourses.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filteredCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                  >
                    <CourseCard
                      course={course}
                      pending={pendingAction === course.id}
                      readOnly={isAdmin}
                      onEdit={() => setEditingCourse(course)}
                      onDelete={() => setShowDeleteConfirm(course.id)}
                      onPublish={() => handlePublishCourse(course.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Card padding="none">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredCourses.map((course, index) => (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: index * 0.03 }}
                    className="p-4 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <CourseRow
                      course={course}
                      pending={pendingAction === course.id}
                      readOnly={isAdmin}
                      onEdit={() => setEditingCourse(course)}
                      onDelete={() => setShowDeleteConfirm(course.id)}
                      onPublish={() => handlePublishCourse(course.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </Card>
          )
        )}
      </div>

      <AnimatePresence>
        {(showCreateModal || editingCourse) && (
          <CourseModal
            course={editingCourse}
            onClose={() => {
              setShowCreateModal(false);
              setEditingCourse(null);
            }}
            onSave={editingCourse ? handleUpdateCourse : handleCreateCourse}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteModal
            isDeleting={pendingAction === showDeleteConfirm}
            onCancel={() => setShowDeleteConfirm(null)}
            onConfirm={() => handleDeleteCourse(showDeleteConfirm)}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function CourseCard({
  course,
  pending,
  readOnly = false,
  onEdit,
  onDelete,
  onPublish,
}: {
  course: CourseDto;
  pending: boolean;
  readOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
}) {
  return (
    <Card padding="none" className="overflow-hidden transition-shadow duration-300 hover:shadow-lg">
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
        {getCourseImage(course) ? (
          <img src={getCourseImage(course)} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-emerald-100 text-indigo-700 dark:from-indigo-950 dark:via-slate-900 dark:to-emerald-950">
            <BookOpen className="h-12 w-12" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <Badge variant={statusConfig[course.status].variant}>{statusConfig[course.status].label}</Badge>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/70 to-transparent p-4">
          <Link href={`/dashboard/courses/${course.id}`}>
            <Button size="sm" variant="white" leftIcon={<Eye className="h-4 w-4" />}>
              Voir
            </Button>
          </Link>
          {!readOnly && (
            <Button size="sm" variant="white" leftIcon={<Edit className="h-4 w-4" />} onClick={onEdit}>
              Modifier
            </Button>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="mb-2 line-clamp-2 font-semibold text-gray-900 dark:text-white">{course.title}</h3>
        <p className="mb-4 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{course.description || course.shortDescription}</p>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-500">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> {course.totalStudents}
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" /> {course.totalLessons}
            </span>
          </div>
          <span className="font-semibold text-indigo-600">{formatPrice(course.priceCfa)}</span>
        </div>
        {course.avgRating > 0 && (
          <div className="mt-3 flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-500">{course.avgRating}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        {!readOnly && course.status === 'draft' ? (
          <Button size="sm" onClick={onPublish} disabled={pending} isLoading={pending}>
            Publier
          </Button>
        ) : (
          <div />
        )}
        {!readOnly && (
          <button
            onClick={onDelete}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
            aria-label="Supprimer le cours"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </CardFooter>
    </Card>
  );
}

function CourseRow({
  course,
  pending,
  readOnly = false,
  onEdit,
  onDelete,
  onPublish,
}: {
  course: CourseDto;
  pending: boolean;
  readOnly?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center">
      <div className="h-24 w-full flex-shrink-0 overflow-hidden rounded-lg md:w-36">
        {getCourseImage(course) ? (
          <img src={getCourseImage(course)} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-emerald-100 text-indigo-700 dark:from-indigo-950 dark:via-slate-900 dark:to-emerald-950">
            <BookOpen className="h-7 w-7" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <h4 className="truncate font-medium text-gray-900 dark:text-white">{course.title}</h4>
          <Badge variant={statusConfig[course.status].variant} size="sm">
            {statusConfig[course.status].label}
          </Badge>
        </div>
        <p className="truncate text-sm text-gray-500 dark:text-gray-400">{course.description || course.shortDescription}</p>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" /> {course.totalStudents} élèves
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-4 w-4" /> {course.totalLessons} leçons
          </span>
          <span className="font-semibold text-indigo-600">{formatPrice(course.priceCfa)}</span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && course.status === 'draft' && (
          <Button size="sm" onClick={onPublish} disabled={pending} isLoading={pending}>
            Publier
          </Button>
        )}
        {!readOnly && (
          <>
            <Button size="sm" variant="outline" leftIcon={<Edit className="h-4 w-4" />} onClick={onEdit}>
              Modifier
            </Button>
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              aria-label="Supprimer le cours"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function CourseModal({
  course,
  onClose,
  onSave,
}: {
  course: CourseDto | null;
  onClose: () => void;
  onSave: (course: CourseInput) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CourseInput>({
    title: course?.title || '',
    shortDescription: course?.shortDescription || '',
    description: course?.description || '',
    difficulty: 'beginner',
    priceCfa: course?.priceCfa || 0,
    thumbnailUrl: course?.thumbnailUrl || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setIsSaving(true);
      setError(null);
      await onSave(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauvegarde impossible');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {course ? 'Modifier le cours' : 'Créer un nouveau cours'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Titre du cours *</span>
            <input
              type="text"
              value={formData.title}
              onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700/50"
              placeholder="Ex: Introduction au marketing digital"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description courte</span>
            <input
              type="text"
              value={formData.shortDescription}
              onChange={(event) => setFormData({ ...formData, shortDescription: event.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700/50"
              maxLength={300}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</span>
            <textarea
              value={formData.description}
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700/50"
            />
          </label>

          <PriceInput
            value={formData.priceCfa}
            onChange={(value) => setFormData({ ...formData, priceCfa: value })}
            label="Prix"
            hint="Mettre 0 pour offrir le cours gratuitement"
          />

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">URL de la miniature</span>
            <input
              type="url"
              value={formData.thumbnailUrl}
              onChange={(event) => setFormData({ ...formData, thumbnailUrl: event.target.value })}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700/50"
              placeholder="https://..."
            />
          </label>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={isSaving}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" isLoading={isSaving}>
              {course ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DeleteModal({
  isDeleting,
  onCancel,
  onConfirm,
}: {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">Supprimer le cours ?</h3>
          <p className="mb-6 text-gray-500 dark:text-gray-400">
            Cette action supprimera le cours côté serveur.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
              Annuler
            </Button>
            <Button variant="error" onClick={onConfirm} isLoading={isDeleting}>
              Supprimer
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

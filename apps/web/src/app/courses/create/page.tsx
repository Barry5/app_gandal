'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Type,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { useAuth } from '@/components/providers/AuthProvider';
import { courseApi, mediaApi, uploadFile, type CourseDetailDto, type CourseInput, type LessonDto, type LessonInput, type LessonType, type ModuleDto } from '@/lib/api';

const lessonTypes: Array<{
  id: LessonType;
  label: string;
  description: string;
  icon: typeof Video;
  uploadType?: 'video' | 'pdf' | 'image';
}> = [
  { id: 'video', label: 'Vidéo', description: 'Cours filmé, replay ou démonstration.', icon: Video, uploadType: 'video' },
  { id: 'pdf', label: 'PDF', description: 'Support de cours ou document à lire.', icon: FileText, uploadType: 'pdf' },
  { id: 'text', label: 'Texte', description: 'Leçon écrite directement dans la plateforme.', icon: Type },
  { id: 'image', label: 'Image', description: 'Schéma, affiche, infographie ou planche visuelle.', icon: ImageIcon, uploadType: 'image' },
];

const categories = [
  { value: 'business', label: 'Business' },
  { value: 'tech', label: 'Technologie' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'design', label: 'Design' },
  { value: 'languages', label: 'Langues' },
  { value: 'agriculture', label: 'Agriculture' },
];

const difficulties = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
] as const;

type BuilderStep = 'info' | 'program' | 'publish';

type LessonDraft = LessonInput & {
  id?: string;
  moduleId: string;
};

function emptyLesson(moduleId: string, type: LessonType): LessonDraft {
  return {
    moduleId,
    title: '',
    type,
    description: '',
    content: '',
    contentUrl: '',
    mediaPublicId: '',
    thumbnailUrl: '',
    durationSec: 0,
    isFree: false,
  };
}

function getYoutubeEmbedUrl(url: string) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const videoId = host === 'youtu.be'
      ? parsed.pathname.replace('/', '')
      : parsed.searchParams.get('v');
    if (!videoId || !['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return '';
    return `https://www.youtube.com/embed/${videoId}`;
  } catch {
    return '';
  }
}

function isIncompleteYoutubeUrl(url: string) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    return ['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host) && !getYoutubeEmbedUrl(url);
  } catch {
    return false;
  }
}

function formatDuration(seconds: number) {
  if (!seconds) return '0 min';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

export default function CourseCreatePage() {
  const router = useRouter();
  const { isLoading: isAuthLoading, isAuthenticated, isCreator } = useAuth();
  const [step, setStep] = useState<BuilderStep>('info');
  const [course, setCourse] = useState<CourseDetailDto | null>(null);
  const [courseForm, setCourseForm] = useState<CourseInput>({
    title: '',
    shortDescription: '',
    description: '',
    category: '',
    difficulty: 'beginner',
    priceCfa: 0,
    thumbnailUrl: '',
  });
  const [moduleTitle, setModuleTitle] = useState('');
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [lessonDraft, setLessonDraft] = useState<LessonDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverUploadProgress, setCoverUploadProgress] = useState(0);

  const selectedModule = course?.modules.find((module) => module.id === activeModuleId) || course?.modules[0] || null;
  const totalLessons = course?.modules.reduce((sum, module) => sum + module.lessons.length, 0) || 0;
  const totalDuration = course?.modules.reduce((sum, module) => sum + module.lessons.reduce((inner, lesson) => inner + lesson.durationSec, 0), 0) || 0;

  const publicationChecks = useMemo(() => [
    { label: 'Titre renseigné', done: Boolean(courseForm.title.trim()) },
    { label: 'Description courte', done: Boolean(courseForm.shortDescription?.trim()) },
    { label: 'Au moins un module', done: Boolean(course && course.modules.length > 0) },
    { label: 'Au moins une leçon', done: totalLessons > 0 },
    { label: 'Prix défini', done: Number(courseForm.priceCfa || 0) >= 0 },
  ], [course, courseForm, totalLessons]);
  const canPublish = publicationChecks.every((item) => item.done);

  const canEditCourse = !isAuthLoading && isAuthenticated && isCreator;

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      toast.error('Connectez-vous avec un compte formateur pour créer un cours');
      router.push('/auth/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  const refreshCourse = async (id = course?.id) => {
    if (!id) return null;
    const fresh = await courseApi.getById(id);
    setCourse(fresh);
    setCourseForm({
      title: fresh.title,
      shortDescription: fresh.shortDescription,
      description: fresh.description,
      category: '',
      difficulty: 'beginner',
      priceCfa: fresh.priceCfa,
      thumbnailUrl: fresh.thumbnailUrl,
    });
    setActiveModuleId((current) => current || fresh.modules[0]?.id || null);
    return fresh;
  };

  const saveCourseDraft = async () => {
    if (!canEditCourse) {
      toast.error('Session formateur requise');
      return null;
    }

    if (!courseForm.title?.trim() || courseForm.title.trim().length < 3) {
      toast.error('Ajoutez un titre de cours avec au moins 3 caractères');
      return null;
    }

    setIsSaving(true);
    try {
      if (course) {
        const updated = await courseApi.update(course.id, courseForm);
        const fresh = await refreshCourse(updated.id);
        toast.success('Cours mis à jour');
        return fresh;
      }

      const created = await courseApi.create(courseForm);
      const fresh = await refreshCourse(created.id);
      toast.success('Brouillon créé');
      setStep('program');
      return fresh;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sauvegarde impossible');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const addModule = async () => {
    const currentCourse = course || await saveCourseDraft();
    if (!currentCourse) return;
    if (!moduleTitle.trim() || moduleTitle.trim().length < 2) {
      toast.error('Nommez le module avec au moins 2 caractères');
      return;
    }

    setIsSaving(true);
    try {
      const createdModule = await courseApi.addModule(currentCourse.id, {
        title: moduleTitle.trim(),
        orderIndex: currentCourse.modules.length,
      });
      setCourse({ ...currentCourse, modules: [...currentCourse.modules, createdModule] });
      setActiveModuleId(createdModule.id);
      setModuleTitle('');
      toast.success('Module ajouté');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ajout impossible');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!course) return;
    setIsSaving(true);
    try {
      await courseApi.deleteModule(moduleId);
      const nextModules = course.modules.filter((module) => module.id !== moduleId);
      setCourse({ ...course, modules: nextModules });
      setActiveModuleId(nextModules[0]?.id || null);
      toast.success('Module supprimé');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible');
    } finally {
      setIsSaving(false);
    }
  };

  const moveModule = async (moduleId: string, direction: -1 | 1) => {
    if (!course) return;
    const index = course.modules.findIndex((module) => module.id === moduleId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= course.modules.length) return;

    const modules = [...course.modules];
    const [movedModule] = modules.splice(index, 1);
    modules.splice(targetIndex, 0, movedModule);
    setCourse({ ...course, modules });
    await courseApi.reorderModules(course.id, modules.map((item) => item.id));
  };

  const openLessonEditor = (moduleId: string, type: LessonType, lesson?: LessonDto) => {
    setLessonDraft(lesson ? {
      id: lesson.id,
      moduleId,
      title: lesson.title,
      type: lesson.type,
      description: lesson.description,
      content: lesson.content,
      contentUrl: lesson.contentUrl,
      mediaPublicId: lesson.mediaPublicId,
      thumbnailUrl: lesson.thumbnailUrl,
      durationSec: lesson.durationSec,
      isFree: lesson.isFree,
      orderIndex: lesson.orderIndex,
    } : emptyLesson(moduleId, type));
  };

  const saveLesson = async () => {
    if (!course || !lessonDraft) return;
    if (!lessonDraft.title.trim() || lessonDraft.title.trim().length < 2) {
      toast.error('Ajoutez un titre de leçon avec au moins 2 caractères');
      return;
    }
    if (lessonDraft.type === 'text' && !lessonDraft.content?.trim()) {
      toast.error('Ajoutez le contenu texte de la leçon');
      return;
    }
    if (lessonDraft.type !== 'text' && !lessonDraft.contentUrl?.trim()) {
      toast.error('Ajoutez un fichier ou une URL de contenu');
      return;
    }
    if (lessonDraft.type === 'video' && isIncompleteYoutubeUrl(lessonDraft.contentUrl || '')) {
      toast.error('Lien YouTube incomplet. Collez l URL complete de la video ou uploadez un fichier.');
      return;
    }
    if (lessonDraft.type === 'pdf' && lessonDraft.contentUrl?.includes('youtube.com')) {
      toast.error('Une lecon PDF doit contenir un fichier PDF, pas une URL video.');
      return;
    }

    setIsSaving(true);
    try {
      if (lessonDraft.id) {
        await courseApi.updateLesson(lessonDraft.id, lessonDraft);
        toast.success('Leçon mise à jour');
      } else {
        const targetModule = course.modules.find((item) => item.id === lessonDraft.moduleId);
        await courseApi.addLesson(lessonDraft.moduleId, {
          ...lessonDraft,
          orderIndex: targetModule?.lessons.length || 0,
        });
        toast.success('Leçon ajoutée');
      }
      setLessonDraft(null);
      await refreshCourse(course.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Sauvegarde impossible');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!course) return;
    setIsSaving(true);
    try {
      await courseApi.deleteLesson(lessonId);
      await refreshCourse(course.id);
      toast.success('Leçon supprimée');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Suppression impossible');
    } finally {
      setIsSaving(false);
    }
  };

  const moveLesson = async (module: ModuleDto, lessonId: string, direction: -1 | 1) => {
    if (!course) return;
    const index = module.lessons.findIndex((lesson) => lesson.id === lessonId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= module.lessons.length) return;

    const lessons = [...module.lessons];
    const [lesson] = lessons.splice(index, 1);
    lessons.splice(targetIndex, 0, lesson);
    setCourse({
      ...course,
      modules: course.modules.map((item) => item.id === module.id ? { ...item, lessons } : item),
    });
    await courseApi.reorderLessons(module.id, lessons.map((item) => item.id));
  };

  const uploadLessonAsset = async (file: File) => {
    if (!canEditCourse) {
      toast.error('Session formateur requise');
      return;
    }

    if (!lessonDraft) return;
    const lessonType = lessonTypes.find((item) => item.id === lessonDraft.type);
    if (!lessonType?.uploadType) return;

    setIsUploading(true);
    setUploadProgress(0);
    const result = await uploadFile(file, lessonType.uploadType, setUploadProgress);
    setIsUploading(false);

    if (!result.success || !result.media) {
      toast.error(result.error || 'Upload impossible');
      return;
    }

    setLessonDraft({
      ...lessonDraft,
      contentUrl: result.media.url,
      mediaPublicId: result.media.publicId,
      thumbnailUrl: result.media.thumbnailUrl || lessonDraft.thumbnailUrl,
      durationSec: result.media.duration ? Math.round(result.media.duration) : lessonDraft.durationSec,
    });
    toast.success('Fichier ajouté');
  };

  const removeLessonAsset = async () => {
    if (!lessonDraft) return;
    if (lessonDraft.mediaPublicId) {
      try {
        await mediaApi.delete(lessonDraft.mediaPublicId, lessonDraft.type === 'image' ? 'image' : lessonDraft.type === 'pdf' ? 'raw' : 'video');
      } catch {
        toast.error('Suppression Cloudinary impossible, le lien local sera retire');
      }
    }

    setLessonDraft({
      ...lessonDraft,
      contentUrl: '',
      mediaPublicId: '',
      thumbnailUrl: '',
      durationSec: 0,
    });
    toast.success('Media retire de la lecon');
  };

  const uploadCoverAsset = async (file: File) => {
    if (!canEditCourse) {
      toast.error('Session formateur requise');
      return;
    }

    setIsCoverUploading(true);
    setCoverUploadProgress(0);
    const result = await uploadFile(file, 'image', setCoverUploadProgress);
    setIsCoverUploading(false);

    if (!result.success || !result.media) {
      toast.error(result.error || 'Upload de la couverture impossible');
      return;
    }

    setCourseForm({ ...courseForm, thumbnailUrl: result.media.url });
    toast.success('Image de couverture ajoutee');
  };

  const publishCourse = async () => {
    if (!canEditCourse) {
      toast.error('Session formateur requise');
      return;
    }

    if (!course) {
      toast.error('Sauvegardez le cours avant publication');
      return;
    }
    if (!canPublish) {
      toast.error('Complétez la checklist avant de publier');
      return;
    }

    setIsSaving(true);
    try {
      await courseApi.publish(course.id);
      toast.success('Cours publié');
      router.push('/dashboard/courses');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Publication impossible');
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span className="font-medium">Vérification de la session...</span>
        </div>
      </main>
    );
  }

  if (isAuthenticated && !isCreator) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-950 dark:bg-slate-950 dark:text-white">
        <Card padding="lg" className="max-w-md text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-amber-500" />
          <h1 className="text-xl font-bold">Accès formateur requis</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Les modules, leçons et uploads sont réservés aux comptes formateurs.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/auth/login">
              <Button>Changer de compte</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/courses">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Builder de cours</h1>
              <p className="text-sm text-slate-500">Cours, modules et leçons connectés à Supabase.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={saveCourseDraft} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>
              Sauvegarder
            </Button>
            <Button onClick={publishCourse} disabled={!course || !canPublish || isSaving} leftIcon={<Check className="h-4 w-4" />}>
              Publier
            </Button>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 pb-4 sm:px-6">
          {[
            { id: 'info', label: 'Informations' },
            { id: 'program', label: 'Programme' },
            { id: 'publish', label: 'Publication' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setStep(item.id as BuilderStep)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${step === item.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          {step === 'info' && (
            <Card className="shadow-sm" padding="lg">
              <div className="mb-6">
                <h2 className="text-lg font-bold">Informations générales</h2>
                <p className="mt-1 text-sm text-slate-500">Créez d&apos;abord le brouillon, puis ajoutez modules et leçons.</p>
              </div>

              <div className="space-y-5">
                <Field label="Titre du cours">
                  <input
                    value={courseForm.title}
                    onChange={(event) => setCourseForm({ ...courseForm, title: event.target.value })}
                    className="field"
                    placeholder="Ex: Marketing digital pour PME"
                  />
                </Field>

                <Field label="Description courte">
                  <input
                    value={courseForm.shortDescription}
                    onChange={(event) => setCourseForm({ ...courseForm, shortDescription: event.target.value })}
                    className="field"
                    placeholder="Une promesse claire en une phrase"
                  />
                </Field>

                <Field label="Description complète">
                  <textarea
                    value={courseForm.description}
                    onChange={(event) => setCourseForm({ ...courseForm, description: event.target.value })}
                    rows={5}
                    className="field"
                    placeholder="Objectifs, prérequis, résultats attendus..."
                  />
                </Field>

                <div className="grid gap-5 md:grid-cols-3">
                  <Field label="Catégorie">
                    <select
                      value={courseForm.category}
                      onChange={(event) => setCourseForm({ ...courseForm, category: event.target.value })}
                      className="field"
                    >
                      <option value="">Sélectionner</option>
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>{category.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Niveau">
                    <select
                      value={courseForm.difficulty}
                      onChange={(event) => setCourseForm({ ...courseForm, difficulty: event.target.value as CourseInput['difficulty'] })}
                      className="field"
                    >
                      {difficulties.map((difficulty) => (
                        <option key={difficulty.value} value={difficulty.value}>{difficulty.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Prix GNF">
                    <input
                      type="number"
                      min="0"
                      value={courseForm.priceCfa}
                      onChange={(event) => setCourseForm({ ...courseForm, priceCfa: Number(event.target.value || 0) })}
                      className="field"
                    />
                  </Field>
                </div>

                <CoverUploader
                  value={courseForm.thumbnailUrl || ''}
                  isUploading={isCoverUploading}
                  progress={coverUploadProgress}
                  onUpload={uploadCoverAsset}
                  onUrlChange={(thumbnailUrl) => setCourseForm({ ...courseForm, thumbnailUrl })}
                />

                <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/30 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Ensuite, ajoutez le programme</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Sauvegarde le brouillon puis ouvre la zone Modules et leçons.</p>
                  </div>
                  <Button onClick={saveCourseDraft} isLoading={isSaving} leftIcon={<Plus className="h-4 w-4" />}>
                    Ajouter modules et leçons
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {step === 'program' && (
            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
              <Card padding="lg" className="h-fit shadow-sm">
                <div className="mb-5">
                  <h2 className="text-lg font-bold">Structure</h2>
                  <p className="mt-1 text-sm text-slate-500">Ajoutez les modules dans l&apos;ordre du cours.</p>
                </div>

                {!course && (
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">1. Ajouter un module</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Saisissez le titre du premier module. Le bouton cree d'abord le brouillon, puis ajoute le module.
                    </p>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row xl:flex-col">
                      <input
                        value={moduleTitle}
                        onChange={(event) => setModuleTitle(event.target.value)}
                        className="field"
                        placeholder="Ex: Module 1 - Introduction"
                      />
                      <Button onClick={addModule} disabled={isSaving} leftIcon={<Plus className="h-4 w-4" />}>
                        Ajouter le module
                      </Button>
                    </div>
                  </div>
                )}

                {!course && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Sauvegardez d&apos;abord les informations générales pour créer le brouillon.
                  </div>
                )}

                {course && (
                  <>
                    <div className="mb-3 mt-5 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Modules du cours</p>
                      <Badge size="sm" variant="subtle">{course.modules.length}</Badge>
                    </div>

                    <div className="space-y-2">
                      {course.modules.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500 dark:border-slate-700">
                          Aucun module pour l'instant.
                        </div>
                      )}
                      {course.modules.map((module, index) => (
                        <button
                          key={module.id}
                          type="button"
                          onClick={() => setActiveModuleId(module.id)}
                          className={`w-full rounded-xl border p-3 text-left transition ${selectedModule?.id === module.id ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">{index + 1}. {module.title}</p>
                              <p className="text-xs text-slate-500">{module.lessons.length} leçon(s)</p>
                            </div>
                            <Badge size="sm" variant={module.lessons.length ? 'success' : 'warning'}>
                              {module.lessons.length ? 'OK' : 'Vide'}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <p className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Ajouter un autre module</p>
                      <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                      <input
                        value={moduleTitle}
                        onChange={(event) => setModuleTitle(event.target.value)}
                        className="field"
                        placeholder="Nouveau module"
                      />
                      <Button onClick={addModule} disabled={isSaving} leftIcon={<Plus className="h-4 w-4" />}>
                        Ajouter
                      </Button>
                      </div>
                    </div>
                  </>
                )}
              </Card>

              <Card padding="lg" className="shadow-sm">
                {!selectedModule ? (
                  <div className="flex min-h-80 flex-col items-center justify-center text-center">
                    <BookOpen className="mb-4 h-14 w-14 text-slate-300" />
                    <h3 className="text-lg font-semibold">Aucun module sélectionné</h3>
                    <p className="mt-2 max-w-sm text-sm text-slate-500">Créez un module pour commencer à ajouter des vidéos, PDF, textes et images.</p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold">{selectedModule.title}</h2>
                          <Badge variant="subtle">{formatDuration(selectedModule.totalDurationSec)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{selectedModule.lessons.length} leçon(s)</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => moveModule(selectedModule.id, -1)} leftIcon={<ArrowUp className="h-4 w-4" />}>Monter</Button>
                        <Button variant="ghost" size="sm" onClick={() => moveModule(selectedModule.id, 1)} leftIcon={<ArrowDown className="h-4 w-4" />}>Descendre</Button>
                        <Button variant="error" size="sm" onClick={() => deleteModule(selectedModule.id)} leftIcon={<Trash2 className="h-4 w-4" />}>Supprimer</Button>
                      </div>
                    </div>

                    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                      <div className="mb-4">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">2. Ajouter une leçon au module</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Choisissez le format : vidéo, PDF, texte ou image.</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {lessonTypes.map((type) => (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => openLessonEditor(selectedModule.id, type.id)}
                            className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                          >
                            <type.icon className="mb-3 h-6 w-6 text-indigo-600" />
                            <p className="font-semibold">{type.label}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{type.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {selectedModule.lessons.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">
                          Ajoutez une première leçon à ce module.
                        </div>
                      )}

                      {selectedModule.lessons.map((lesson, index) => (
                        <div key={lesson.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
                          <LessonIcon type={lesson.type} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-semibold">{index + 1}. {lesson.title}</p>
                              <Badge size="sm" variant="default">{lessonTypes.find((item) => item.id === lesson.type)?.label}</Badge>
                              {lesson.isFree && <Badge size="sm" variant="success">Gratuite</Badge>}
                            </div>
                            <p className="mt-1 truncate text-sm text-slate-500">
                              {lesson.type === 'text' ? `${lesson.content.length} caractères` : lesson.contentUrl || 'Aucun fichier'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" size="sm" onClick={() => moveLesson(selectedModule, lesson.id, -1)} leftIcon={<ArrowUp className="h-4 w-4" />}>Monter</Button>
                            <Button variant="ghost" size="sm" onClick={() => moveLesson(selectedModule, lesson.id, 1)} leftIcon={<ArrowDown className="h-4 w-4" />}>Descendre</Button>
                            <Button variant="outline" size="sm" onClick={() => openLessonEditor(selectedModule.id, lesson.type, lesson)}>Modifier</Button>
                            <button
                              type="button"
                              onClick={() => deleteLesson(lesson.id)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                              aria-label="Supprimer la leçon"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          )}

          {step === 'publish' && (
            <Card padding="lg" className="shadow-sm">
              <h2 className="text-lg font-bold">Préparation publication</h2>
              <p className="mt-1 text-sm text-slate-500">Vérifiez que le cours est prêt pour l&apos;apprenant.</p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {publicationChecks.map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                      <Check className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl bg-slate-100 p-5 dark:bg-slate-900">
                <p className="text-sm text-slate-500">Résumé</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-3">
                  <Summary label="Modules" value={course?.modules.length || 0} />
                  <Summary label="Leçons" value={totalLessons} />
                  <Summary label="Durée" value={formatDuration(totalDuration)} />
                </div>
              </div>
            </Card>
          )}
        </section>

        <aside className="space-y-4">
          <Card padding="lg" className="sticky top-36 shadow-sm">
            <h2 className="font-bold">État du cours</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Summary label="Statut" value={course?.status === 'published' ? 'Publié' : 'Brouillon'} />
              <Summary label="Modules" value={course?.modules.length || 0} />
              <Summary label="Leçons" value={totalLessons} />
              <Summary label="Durée" value={formatDuration(totalDuration)} />
            </div>

            <div className="mt-6 space-y-2">
              {publicationChecks.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className={item.done ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}>{item.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      {lessonDraft && (
        <LessonEditor
          draft={lessonDraft}
          isSaving={isSaving}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          onChange={setLessonDraft}
          onUpload={uploadLessonAsset}
          onRemoveMedia={removeLessonAsset}
          onClose={() => setLessonDraft(null)}
          onSave={saveLesson}
        />
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</span>
      {children}
    </label>
  );
}

function CoverUploader({
  value,
  isUploading,
  progress,
  onUpload,
  onUrlChange,
}: {
  value: string;
  isUploading: boolean;
  progress: number;
  onUpload: (file: File) => Promise<void>;
  onUrlChange: (url: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Image de couverture</p>
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
            {value ? (
              <img src={value} alt="Couverture du cours" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-5 text-center text-slate-400">
                <ImageIcon className="mb-2 h-8 w-8" />
                <span className="text-sm font-medium">Aucune image</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800">
              {isUploading ? (
                <>
                  <Loader2 className="mb-3 h-8 w-8 animate-spin text-indigo-600" />
                  <p className="font-medium">Upload couverture... {progress}%</p>
                </>
              ) : (
                <>
                  <UploadCloud className="mb-3 h-9 w-9 text-slate-400" />
                  <p className="font-medium">Uploader l'image de couverture</p>
                  <p className="mt-1 text-sm text-slate-500">PNG, JPG ou WebP.</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0])}
              />
            </label>

            <Field label="Ou coller une URL">
              <input
                type="url"
                value={value}
                onChange={(event) => onUrlChange(event.target.value)}
                className="field"
                placeholder="https://..."
              />
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

function LessonIcon({ type }: { type: LessonType }) {
  const Icon = lessonTypes.find((item) => item.id === type)?.icon || BookOpen;
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
      <Icon className="h-5 w-5" />
    </div>
  );
}

function LessonEditor({
  draft,
  isSaving,
  isUploading,
  uploadProgress,
  onChange,
  onUpload,
  onRemoveMedia,
  onClose,
  onSave,
}: {
  draft: LessonDraft;
  isSaving: boolean;
  isUploading: boolean;
  uploadProgress: number;
  onChange: (draft: LessonDraft) => void;
  onUpload: (file: File) => Promise<void>;
  onRemoveMedia: () => Promise<void>;
  onClose: () => void;
  onSave: () => void;
}) {
  const lessonType = lessonTypes.find((item) => item.id === draft.type);
  const [localPreviewUrl, setLocalPreviewUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => () => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
  }, [localPreviewUrl]);

  const handleFile = async (file: File) => {
    if (draft.type === 'video') {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
      setLocalPreviewUrl(URL.createObjectURL(file));
    }
    await onUpload(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl dark:bg-slate-900 sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <p className="text-sm font-medium text-indigo-600">{lessonType?.label}</p>
            <h2 className="text-xl font-bold">{draft.id ? 'Modifier la leçon' : 'Nouvelle leçon'}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <Field label="Titre">
            <input
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              className="field"
              placeholder="Ex: Introduction et objectifs"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Durée en secondes">
              <input
                type="number"
                min="0"
                value={draft.durationSec || 0}
                onChange={(event) => onChange({ ...draft, durationSec: Number(event.target.value || 0) })}
                className="field"
              />
            </Field>
            <label className="flex items-end gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <input
                type="checkbox"
                checked={Boolean(draft.isFree)}
                onChange={(event) => onChange({ ...draft, isFree: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium">Leçon gratuite en aperçu</span>
            </label>
          </div>

          <Field label="Description courte">
            <textarea
              value={draft.description}
              onChange={(event) => onChange({ ...draft, description: event.target.value })}
              rows={3}
              className="field"
              placeholder="Ce que l'apprenant va comprendre dans cette leçon"
            />
          </Field>

          {draft.type === 'text' ? (
            <Field label="Contenu texte">
              <textarea
                value={draft.content}
                onChange={(event) => onChange({ ...draft, content: event.target.value })}
                rows={12}
                className="field"
                placeholder="Écrivez la leçon ici..."
              />
            </Field>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {draft.type === 'video' ? 'Uploader la video du cours' : 'Fichier de contenu'}
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center transition hover:border-indigo-400 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  {isUploading ? (
                    <>
                      <Loader2 className="mb-3 h-9 w-9 animate-spin text-indigo-600" />
                      <p className="font-medium">Upload en cours... {uploadProgress}%</p>
                      {draft.type === 'video' && (
                        <p className="mt-1 text-sm text-slate-500">Envoi direct vers Cloudinary avec reprise automatique.</p>
                      )}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="mb-3 h-10 w-10 text-slate-400" />
                      <p className="font-medium">Choisir un fichier {lessonType?.label.toLowerCase()}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {draft.type === 'video'
                          ? 'MP4, MOV ou WebM, 500MB max. Glisser-deposer fonctionne aussi.'
                          : 'Vous pouvez aussi coller une URL ci-dessous.'}
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept={draft.type === 'video' ? 'video/*' : draft.type === 'pdf' ? 'application/pdf' : 'image/*'}
                    onChange={(event) => event.target.files?.[0] && handleFile(event.target.files[0])}
                  />
                </label>
              </div>

              {draft.type === 'video' && (
                <div
                  className={`rounded-2xl border-2 border-dashed p-4 transition ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : 'border-slate-300 dark:border-slate-700'}`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    const file = event.dataTransfer.files?.[0];
                    if (file) handleFile(file);
                  }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">Zone drag & drop video</p>
                      <p className="mt-1 text-sm text-slate-500">Optimisee mobile, tablette et ordinateur.</p>
                    </div>
                    <Badge variant="subtle">Cloudinary direct</Badge>
                  </div>

                  {(localPreviewUrl || draft.contentUrl) && (
                    <video
                      controls
                      playsInline
                      poster={draft.thumbnailUrl || undefined}
                      src={localPreviewUrl || draft.contentUrl}
                      className="mt-4 aspect-video w-full rounded-xl bg-black object-contain"
                    />
                  )}
                </div>
              )}

              {draft.contentUrl && (
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold">Media associe</p>
                    <p className="truncate text-sm text-slate-500">{draft.mediaPublicId || draft.contentUrl}</p>
                  </div>
                  <Button variant="outline" onClick={onRemoveMedia} disabled={isUploading || isSaving}>
                    Supprimer / remplacer
                  </Button>
                </div>
              )}

              <Field label="URL du contenu">
                <input
                  type="url"
                  value={draft.contentUrl}
                  onChange={(event) => onChange({ ...draft, contentUrl: event.target.value })}
                  className="field"
                  placeholder="https://..."
                />
              </Field>

              {draft.type === 'image' && draft.contentUrl && (
                <img src={draft.contentUrl} alt={draft.title || 'Aperçu'} className="max-h-72 w-full rounded-xl object-contain bg-slate-100 dark:bg-slate-800" />
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Annuler</Button>
          <Button onClick={onSave} isLoading={isSaving} leftIcon={<Save className="h-4 w-4" />}>Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}

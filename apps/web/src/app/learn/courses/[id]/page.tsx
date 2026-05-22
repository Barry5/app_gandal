'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Layers,
  LockKeyhole,
  PlayCircle,
  Send,
  Sparkles,
  Type,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { useAuth } from '@/components/providers/AuthProvider';
import { aiApi, courseApi, mediaApi, type AiAssistantMode, type CourseDetailDto, type LessonDto } from '@/lib/api';

const lessonIcons = {
  video: Video,
  pdf: FileText,
  image: ImageIcon,
  text: Type,
  quiz: BookOpen,
};

const assistantModes: Array<{ value: AiAssistantMode; label: string }> = [
  { value: 'summary', label: 'Resumer' },
  { value: 'explain', label: 'Expliquer' },
  { value: 'revision', label: 'Reviser' },
  { value: 'examples', label: 'Exemples' },
];

function formatDuration(seconds: number) {
  if (!seconds) return 'A votre rythme';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function getFirstLesson(course: CourseDetailDto | null) {
  return course?.modules.find((module) => module.lessons.length > 0)?.lessons[0] || null;
}

function getYoutubeEmbedUrl(url: string) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const videoId = host === 'youtu.be'
      ? parsed.pathname.replace('/', '')
      : parsed.searchParams.get('v');

    if (!videoId || !['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
      return '';
    }

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

export default function LearnerCoursePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [course, setCourse] = useState<CourseDetailDto | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LessonDto | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set());
  const [assistantMode, setAssistantMode] = useState<AiAssistantMode>('explain');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState('');
  const [isAskingAssistant, setIsAskingAssistant] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      toast.error('Connectez-vous avec un compte apprenant');
      router.push('/auth/login');
    }
  }, [isAuthLoading, isAuthenticated, router]);

  useEffect(() => {
    const loadCourse = async () => {
      if (!params.id || !isAuthenticated) return;

      setIsLoading(true);
      try {
        const [detail, catalog] = await Promise.all([
          courseApi.getById(params.id),
          courseApi.catalog(),
        ]);
        const catalogCourse = catalog.find((item) => item.id === params.id);
        const isFreeCourse = Boolean(catalogCourse?.isFree || detail.priceCfa <= 0);
        const unlocked = Boolean(catalogCourse?.isUnlocked || isFreeCourse);

        setCourse(detail);
        setIsUnlocked(unlocked);
        setSelectedLesson(getFirstLesson(detail));

        if (isFreeCourse && catalogCourse?.enrollmentStatus !== 'paid') {
          courseApi.enrollFree(params.id).catch(() => undefined);
        }

        if (!unlocked) {
          toast.error('Paiement requis pour lire ce cours');
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Chargement du cours impossible');
      } finally {
        setIsLoading(false);
      }
    };

    loadCourse();
  }, [params.id, isAuthenticated]);

  useEffect(() => {
    let objectUrl = '';

    const loadDocumentUrl = async () => {
      setDocumentUrl('');
      if (!selectedLesson || selectedLesson.type !== 'pdf') return;

      setIsDocumentLoading(true);
      try {
        const blob = await mediaApi.getLessonDocumentBlob(selectedLesson.id);
        objectUrl = URL.createObjectURL(blob);
        setDocumentUrl(objectUrl);
      } catch {
        setDocumentUrl(selectedLesson.contentUrl);
      } finally {
        setIsDocumentLoading(false);
      }
    };

    loadDocumentUrl();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedLesson]);

  useEffect(() => {
    const loadPlaybackUrl = async () => {
      setPlaybackUrl('');
      if (!selectedLesson || selectedLesson.type !== 'video') return;

      if (!selectedLesson.mediaPublicId) {
        setPlaybackUrl(selectedLesson.contentUrl);
        return;
      }

      try {
        const playback = await mediaApi.getPlaybackUrl(selectedLesson.mediaPublicId);
        setPlaybackUrl(playback.url || selectedLesson.contentUrl);
      } catch {
        setPlaybackUrl(selectedLesson.contentUrl);
      }
    };

    loadPlaybackUrl();
  }, [selectedLesson]);

  const lessons = useMemo(
    () => course?.modules.flatMap((module) => module.lessons) || [],
    [course]
  );
  const youtubeEmbedUrl = selectedLesson?.type === 'video' ? getYoutubeEmbedUrl(selectedLesson.contentUrl) : '';
  const hasIncompleteYoutubeUrl = selectedLesson?.type === 'video' ? isIncompleteYoutubeUrl(selectedLesson.contentUrl) : false;
  const completedCount = completedLessonIds.size;
  const progressPercent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  const handleAskAssistant = async () => {
    if (!course) return;
    const prompt = assistantPrompt.trim();
    if (prompt.length < 3) {
      toast.error('Saisissez une demande plus precise');
      return;
    }

    setIsAskingAssistant(true);
    try {
      const result = await aiApi.askCourseAssistant(course.id, {
        prompt,
        mode: assistantMode,
      });
      setAssistantAnswer(result.answer);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Assistant indisponible');
    } finally {
      setIsAskingAssistant(false);
    }
  };

  const handleCompleteLesson = async () => {
    if (!selectedLesson) return;

    setIsCompleting(true);
    try {
      const result = await courseApi.markLessonProgress(selectedLesson.id);
      setCompletedLessonIds((current) => new Set(current).add(selectedLesson.id));
      toast.success('Lecon terminee');

      const nextLesson = lessons.find((lesson) => !completedLessonIds.has(lesson.id) && lesson.id !== selectedLesson.id);
      if (nextLesson) setSelectedLesson(nextLesson);

      if (result.progress.progressPercent === 100) {
        toast.success('Cours termine');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Progression impossible');
    } finally {
      setIsCompleting(false);
    }
  };

  if (isLoading || isAuthLoading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
        <div className="mx-auto max-w-6xl">
          <div className="h-10 w-44 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
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
              Retour aux cours
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
        <Card className="mx-auto max-w-xl text-center">
          <CardContent className="py-10">
            <LockKeyhole className="mx-auto mb-4 h-12 w-12 text-amber-500" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Cours payant verrouille</h1>
            <p className="mt-2 text-sm text-slate-500">
              Ce cours necessite un paiement confirme avant la lecture des lecons.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                variant="gradient"
                leftIcon={<CreditCard className="h-4 w-4" />}
                onClick={() => router.push(`/learn/payment/${params.id}`)}
              >
                Payer et deverrouiller
              </Button>
              <Button variant="secondary" onClick={() => router.push('/learn')}>
                Retour au catalogue
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 dark:bg-slate-950 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/learn" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-emerald-600">
              <ArrowLeft className="h-4 w-4" />
              Retour aux cours
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{course.title}</h1>
            <p className="mt-1 text-sm text-slate-500">{course.creatorName || 'Formateur'}</p>
          </div>
          <div className="min-w-60 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-500">Progression</span>
              <span className="font-semibold text-slate-900 dark:text-white">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">{completedCount}/{lessons.length} lecons terminees</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card padding="none" className="h-fit overflow-hidden">
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-900 dark:text-white">Programme</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">{course.modules.length} modules, {lessons.length} lecons</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-3">
              {course.modules.map((module, moduleIndex) => (
                <div key={module.id} className="mb-4 last:mb-0">
                  <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Module {moduleIndex + 1}: {module.title}
                  </p>
                  <div className="space-y-2">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const Icon = lessonIcons[lesson.type];
                      const isActive = selectedLesson?.id === lesson.id;
                      const isCompleted = completedLessonIds.has(lesson.id);

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setSelectedLesson(lesson)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            isActive
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                              : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex gap-3">
                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {isCompleted ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Icon className="h-4 w-4" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                                {lessonIndex + 1}. {lesson.title}
                              </span>
                              <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="h-3.5 w-3.5" />
                                {formatDuration(lesson.durationSec)}
                              </span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <section className="min-w-0">
            <Card padding="none" className="overflow-hidden">
              <div className="border-b border-slate-100 p-4 dark:border-slate-800 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge variant="success" size="sm">
                      {selectedLesson?.type || 'lecon'}
                    </Badge>
                    <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">
                      {selectedLesson?.title || 'Aucune lecon'}
                    </h2>
                    {selectedLesson?.description && (
                      <p className="mt-2 text-sm text-slate-500">{selectedLesson.description}</p>
                    )}
                  </div>
                  {selectedLesson && (
                    <Button
                      variant="gradient"
                      leftIcon={<CheckCircle2 className="h-4 w-4" />}
                      isLoading={isCompleting}
                      onClick={handleCompleteLesson}
                    >
                      Marquer terminee
                    </Button>
                  )}
                </div>
              </div>

              <div className="bg-slate-950">
                {!selectedLesson && (
                  <div className="flex min-h-96 items-center justify-center p-8 text-center text-white">
                    <div>
                      <BookOpen className="mx-auto mb-4 h-12 w-12 text-white/50" />
                      <p>Selectionnez une lecon pour commencer.</p>
                    </div>
                  </div>
                )}

                {selectedLesson?.type === 'video' && (
                  <div className="aspect-video w-full bg-black">
                    {youtubeEmbedUrl ? (
                      <iframe
                        title={selectedLesson.title}
                        src={youtubeEmbedUrl}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full"
                      />
                    ) : playbackUrl || selectedLesson.contentUrl ? (
                      hasIncompleteYoutubeUrl ? (
                        <div className="flex h-full items-center justify-center p-8 text-center text-white">
                          <div>
                            <PlayCircle className="mx-auto mb-3 h-10 w-10 text-white/60" />
                            <p className="font-semibold">Lien video incomplet</p>
                            <p className="mt-2 text-sm text-white/70">
                              Collez une URL YouTube complete avec l identifiant de la video, ou uploadez un fichier MP4/WebM.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <video
                          src={playbackUrl || selectedLesson.contentUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="h-full w-full"
                          poster={selectedLesson.thumbnailUrl || undefined}
                        />
                      )
                    ) : (
                      <div className="flex h-full items-center justify-center text-white">
                        <PlayCircle className="mr-2 h-6 w-6" />
                        Video indisponible
                      </div>
                    )}
                  </div>
                )}

                {selectedLesson?.type === 'pdf' && (
                  <div className="h-[70vh] bg-white">
                    {isDocumentLoading ? (
                      <div className="flex h-full items-center justify-center text-slate-500">Ouverture du PDF...</div>
                    ) : documentUrl || selectedLesson.contentUrl ? (
                      <iframe title={selectedLesson.title} src={documentUrl || selectedLesson.contentUrl} className="h-full w-full" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500">PDF indisponible</div>
                    )}
                  </div>
                )}

                {selectedLesson?.type === 'image' && (
                  <div className="flex min-h-96 items-center justify-center bg-slate-900 p-4">
                    {selectedLesson.contentUrl ? (
                      <img src={selectedLesson.contentUrl} alt={selectedLesson.title} className="max-h-[75vh] max-w-full rounded-lg object-contain" />
                    ) : (
                      <p className="text-white">Image indisponible</p>
                    )}
                  </div>
                )}

                {selectedLesson?.type === 'text' && (
                  <div className="min-h-96 bg-white p-6 dark:bg-slate-900 sm:p-8">
                    <article className="prose max-w-none whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                      {selectedLesson.content || 'Contenu texte indisponible.'}
                    </article>
                  </div>
                )}

                {selectedLesson?.type === 'quiz' && (
                  <div className="flex min-h-96 items-center justify-center bg-white p-8 text-center dark:bg-slate-900">
                    <div>
                      <BookOpen className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Quiz</h3>
                      <p className="mt-2 text-sm text-slate-500">La lecture du quiz sera connectee au moteur de quiz.</p>
                      <Button className="mt-5" onClick={() => router.push(`/learn/quiz/${selectedLesson.id}`)}>
                        Ouvrir le quiz
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {selectedLesson?.contentUrl && selectedLesson.type !== 'video' && (
                <div className="border-t border-slate-100 p-4 dark:border-slate-800">
                  <a
                    href={selectedLesson.type === 'pdf' ? (documentUrl || selectedLesson.contentUrl) : selectedLesson.contentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600"
                  >
                    Ouvrir dans un nouvel onglet
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}
            </Card>

            <Card className="mt-6">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="font-semibold text-slate-900 dark:text-white">Assistant pedagogique</h2>
                      <p className="text-sm text-slate-500">Reponses basees sur ce cours.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {assistantModes.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => setAssistantMode(mode.value)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                          assistantMode === mode.value
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  value={assistantPrompt}
                  onChange={(event) => setAssistantPrompt(event.target.value)}
                  placeholder="Exemple: explique cette notion avec des mots simples"
                  rows={3}
                />

                <div className="flex justify-end">
                  <Button
                    variant="gradient"
                    onClick={handleAskAssistant}
                    isLoading={isAskingAssistant}
                    leftIcon={<Send className="h-4 w-4" />}
                  >
                    Demander
                  </Button>
                </div>

                {assistantAnswer && (
                  <div className="whitespace-pre-wrap rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm leading-6 text-slate-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-slate-100">
                    {assistantAnswer}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </main>
  );
}

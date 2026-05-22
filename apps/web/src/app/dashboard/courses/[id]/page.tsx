'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Copy,
  Edit,
  KeyRound,
  FileText,
  Sparkles,
  Wand2,
  Image as ImageIcon,
  Layers,
  Play,
  Star,
  Users,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge, StatsCard } from '@/components/ui/DataDisplay';
import { useAuth } from '@/components/providers/AuthProvider';
import { aiApi, courseApi, type AiQuizDto, type CourseAccessCodeDto, type CourseDetailDto, type LessonDto } from '@/lib/api';
import { toast } from 'sonner';

const statusConfig = {
  draft: { label: 'Brouillon', variant: 'warning' as const },
  published: { label: 'Publie', variant: 'success' as const },
  archived: { label: 'Archive', variant: 'default' as const },
};

const lessonIcons = {
  video: Play,
  text: FileText,
  pdf: FileText,
  image: ImageIcon,
  quiz: CheckCircle2,
};

function formatPrice(priceCfa: number) {
  return priceCfa === 0 ? 'Gratuit' : `${priceCfa.toLocaleString('fr-FR')} GNF`;
}

function formatDuration(seconds: number) {
  if (!seconds) return 'Libre';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function getLessonLabel(lesson: LessonDto) {
  const labels: Record<LessonDto['type'], string> = {
    video: 'Video',
    text: 'Texte',
    pdf: 'PDF',
    image: 'Image',
    quiz: 'Quiz',
  };

  return labels[lesson.type];
}

export default function DashboardCourseDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<CourseDetailDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [accessCodes, setAccessCodes] = useState<CourseAccessCodeDto[]>([]);
  const [generatedCode, setGeneratedCode] = useState<CourseAccessCodeDto | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [aiQuiz, setAiQuiz] = useState<AiQuizDto | null>(null);
  const [aiModuleId, setAiModuleId] = useState('');
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const { isAdmin } = useAuth();

  const loadCourse = async () => {
    if (!params.id) return;
    try {
      setIsLoading(true);
      const [result, codes] = await Promise.all([
        courseApi.getById(params.id),
        courseApi.listAccessCodes(params.id).catch(() => []),
      ]);
      setCourse(result);
      setAccessCodes(codes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Cours introuvable');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCourse();
  }, [params.id]);

  const totalLessons = useMemo(
    () => course?.modules.reduce((sum, module) => sum + module.lessons.length, 0) || 0,
    [course],
  );

  const totalDurationSec = useMemo(
    () => course?.modules.reduce(
      (sum, module) => sum + module.lessons.reduce((inner, lesson) => inner + lesson.durationSec, 0),
      0,
    ) || 0,
    [course],
  );

  const canPublish = Boolean(course && course.modules.length > 0 && totalLessons > 0);

  const handleGenerateAccessCode = async () => {
    if (!course) return;

    setIsGeneratingCode(true);
    try {
      const accessCode = await courseApi.createAccessCode(course.id, { expiresInDays: 7, maxUses: 1 });
      setGeneratedCode(accessCode);
      setAccessCodes((current) => [accessCode, ...current]);
      toast.success('Code genere. Copiez-le maintenant.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation du code impossible');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = async (code?: string) => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast.success('Code copie');
  };

  const handleGenerateQuiz = async () => {
    if (!course) return;

    setIsGeneratingQuiz(true);
    try {
      const result = await aiApi.generateQuiz(course.id, {
        questionCount: aiQuestionCount,
        moduleId: aiModuleId || undefined,
      });
      setAiQuiz(result.quiz);
      toast.success('Quiz pedagogique genere');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation IA impossible');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '-';
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  };

  const handlePublish = async () => {
    if (!course) return;
    if (!canPublish) {
      toast.error('Ajoutez au moins un module et une lecon avant de publier.');
      return;
    }

    setIsPublishing(true);
    try {
      const updated = await courseApi.publish(course.id);
      setCourse({ ...course, ...updated });
      toast.success('Cours publie');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Publication impossible');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard/courses')}
              className="mt-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Retour aux cours"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-medium text-indigo-600">Detail du cours</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {course?.title || 'Cours'}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isAdmin && (
              <Link href="/courses/create">
                <Button variant="outline" leftIcon={<Edit className="h-4 w-4" />}>
                  Ouvrir le builder
                </Button>
              </Link>
            )}
            {!isAdmin && course?.status === 'draft' && (
              <Button onClick={handlePublish} isLoading={isPublishing} disabled={!canPublish}>
                Publier
              </Button>
            )}
          </div>
        </div>

        {isLoading && (
          <Card className="py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-500" />
            <p className="mt-4 text-sm text-gray-500">Chargement du cours...</p>
          </Card>
        )}

        {!isLoading && !course && (
          <Card className="py-16 text-center">
            <BookOpen className="mx-auto mb-4 h-14 w-14 text-gray-300" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Cours introuvable</h2>
            <Link href="/dashboard/courses" className="mt-4 inline-flex">
              <Button variant="outline">Retour aux cours</Button>
            </Link>
          </Card>
        )}

        {!isLoading && course && (
          <>
            <Card padding="none" className="overflow-hidden">
              <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative min-h-64 bg-slate-100 dark:bg-slate-800">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.title} className="h-full min-h-64 w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-64 items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-emerald-100 text-indigo-700 dark:from-indigo-950 dark:via-slate-900 dark:to-emerald-950">
                      <BookOpen className="h-20 w-20" />
                    </div>
                  )}
                </div>
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant={statusConfig[course.status].variant}>{statusConfig[course.status].label}</Badge>
                    <Badge variant="subtle">{formatPrice(course.priceCfa)}</Badge>
                  </div>
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {course.description || course.shortDescription || 'Aucune description renseignee.'}
                  </p>
                  <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-slate-500">Apprenants</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{course.totalStudents}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="text-slate-500">Note moyenne</p>
                      <p className="mt-1 font-semibold text-slate-900 dark:text-white">{course.avgRating || 0}/5</p>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <StatsCard label="Modules" value={course.modules.length} icon={<Layers className="h-6 w-6" />} color="indigo" />
              <StatsCard label="Lecons" value={totalLessons} icon={<BookOpen className="h-6 w-6" />} color="green" />
              <StatsCard label="Duree" value={formatDuration(totalDurationSec)} icon={<Clock className="h-6 w-6" />} color="orange" />
              <StatsCard label="Avis" value={course.avgRating || 0} icon={<Star className="h-6 w-6" />} color="purple" />
            </div>

            {!isAdmin && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40">
                          <Sparkles className="h-5 w-5" />
                        </span>
                        <CardTitle>IA pedagogique</CardTitle>
                      </div>
                      <p className="mt-2 text-sm text-slate-500">
                        Generez un quiz QCM strictement base sur le contenu du cours.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_110px_auto]">
                      <select
                        value={aiModuleId}
                        onChange={(event) => setAiModuleId(event.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">Tout le cours</option>
                        {course.modules.map((module) => (
                          <option key={module.id} value={module.id}>{module.title}</option>
                        ))}
                      </select>
                      <select
                        value={aiQuestionCount}
                        onChange={(event) => setAiQuestionCount(Number(event.target.value))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      >
                        {[5, 6, 7, 8, 9, 10].map((count) => (
                          <option key={count} value={count}>{count} QCM</option>
                        ))}
                      </select>
                      <Button
                        onClick={handleGenerateQuiz}
                        isLoading={isGeneratingQuiz}
                        leftIcon={<Wand2 className="h-4 w-4" />}
                      >
                        Generer
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {aiQuiz && (
                  <CardContent>
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/20">
                      <h3 className="font-semibold text-slate-900 dark:text-white">{aiQuiz.title}</h3>
                      <div className="mt-4 space-y-4">
                        {aiQuiz.questions.map((question, index) => (
                          <div key={`${question.question}-${index}`} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
                            <p className="font-medium text-slate-900 dark:text-white">
                              {index + 1}. {question.question}
                            </p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              {question.options.map((option, optionIndex) => (
                                <div
                                  key={`${option}-${optionIndex}`}
                                  className={`rounded-lg border px-3 py-2 text-sm ${
                                    option === question.correctAnswer
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'
                                      : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {option}
                                </div>
                              ))}
                            </div>
                            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                              <span className="font-semibold">Reponse:</span> {question.correctAnswer}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">{question.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {!isAdmin && course.priceCfa > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Codes d'acces hors ligne</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        Generez un code unique apres paiement direct. Le code est visible une seule fois.
                      </p>
                    </div>
                    <Button
                      onClick={handleGenerateAccessCode}
                      isLoading={isGeneratingCode}
                      leftIcon={<KeyRound className="h-4 w-4" />}
                    >
                      Generer un code
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {generatedCode?.code && (
                    <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
                      <p className="text-sm font-semibold">Code a remettre a l'apprenant</p>
                      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <span className="rounded-xl bg-white px-4 py-2 font-mono text-2xl font-bold tracking-[0.35em] text-emerald-700 dark:bg-slate-900">
                          {generatedCode.code}
                        </span>
                        <Button variant="secondary" leftIcon={<Copy className="h-4 w-4" />} onClick={() => handleCopyCode(generatedCode.code)}>
                          Copier
                        </Button>
                      </div>
                      <p className="mt-2 text-xs opacity-80">
                        Expire le {formatDate(generatedCode.expires_at)}. Ce code ne sera plus affiche apres actualisation.
                      </p>
                    </div>
                  )}

                  {accessCodes.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                      <KeyRound className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                      <p className="font-medium text-slate-900 dark:text-white">Aucun code genere</p>
                      <p className="mt-1 text-sm text-slate-500">Les codes generes apparaitront ici avec leur statut.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-[1fr_1fr_1fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:bg-slate-900">
                        <span>Statut</span>
                        <span>Expiration</span>
                        <span>Utilisation</span>
                      </div>
                      {accessCodes.map((item) => (
                        <div key={item.id} className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800">
                          <span>
                            <Badge variant={item.status === 'active' ? 'success' : item.status === 'used' ? 'subtle' : 'warning'} size="sm">
                              {item.status}
                            </Badge>
                          </span>
                          <span className="text-slate-600 dark:text-slate-300">{formatDate(item.expires_at)}</span>
                          <span className="text-slate-600 dark:text-slate-300">
                            {item.used_count}/{item.max_uses}
                            {item.used_by_name ? ` par ${item.used_by_name}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Programme du cours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {course.modules.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                    <Layers className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <p className="font-medium text-slate-900 dark:text-white">Aucun module</p>
                    <p className="mt-1 text-sm text-slate-500">Ajoutez des modules dans le builder avant de publier.</p>
                  </div>
                ) : (
                  course.modules.map((module, index) => (
                    <div key={module.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                            Module {index + 1}
                          </p>
                          <h3 className="font-semibold text-slate-900 dark:text-white">{module.title}</h3>
                          {module.description && (
                            <p className="mt-1 text-sm text-slate-500">{module.description}</p>
                          )}
                        </div>
                        <Badge variant={module.lessons.length ? 'success' : 'warning'} size="sm">
                          {module.lessons.length} lecon(s)
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-2">
                        {module.lessons.length === 0 ? (
                          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                            Ce module est vide.
                          </p>
                        ) : (
                          module.lessons.map((lesson) => {
                            const Icon = lessonIcons[lesson.type];
                            return (
                              <div
                                key={lesson.id}
                                className="flex flex-col gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-600 dark:bg-slate-800">
                                    <Icon className="h-5 w-5" />
                                  </span>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">{lesson.title}</p>
                                    <p className="text-xs text-slate-500">{getLessonLabel(lesson)} · {formatDuration(lesson.durationSec)}</p>
                                  </div>
                                </div>
                                {lesson.contentUrl && (
                                  <a
                                    href={lesson.contentUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                  >
                                    Ouvrir
                                  </a>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

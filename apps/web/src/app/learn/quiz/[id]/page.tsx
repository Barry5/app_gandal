'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { CircularProgress } from '@/components/ui/Progress';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  Trophy,
  RotateCcw,
  Home,
  Award,
  AlertCircle,
} from 'lucide-react';

const quizData = {
  id: 'quiz-1',
  title: 'Quiz Module 3: Instagram pour PME',
  courseTitle: 'Marketing Digital pour PME',
  moduleTitle: 'Module 3: Réseaux sociaux',
  questions: [
    {
      id: 'q1',
      question: 'Quel est le format Instagram qui permet de publier des vidéos courtes ?',
      options: [
        { id: 'a', text: 'Instagram Stories', isCorrect: false },
        { id: 'b', text: 'Instagram Reels', isCorrect: true },
        { id: 'c', text: 'Instagram Live', isCorrect: false },
        { id: 'd', text: 'Instagram Feed', isCorrect: false },
      ],
      explanation: 'Les Reels sont des vidéos courtes (jusqu\'à 90 secondes) optimisées pour la découverte.',
      points: 10,
    },
    {
      id: 'q2',
      question: 'Quelle est la taille recommandée pour une image de profil Instagram ?',
      options: [
        { id: 'a', text: '500x500 pixels', isCorrect: false },
        { id: 'b', text: '320x320 pixels', isCorrect: false },
        { id: 'c', text: '110x110 pixels', isCorrect: false },
        { id: 'd', text: '1080x1080 pixels', isCorrect: true },
      ],
      explanation: 'Instagram affiche les images de profil en cercle, soit environ 110x110 pixels sur l\'app, mais une résolution plus élevée assure une qualité optimale.',
      points: 10,
    },
    {
      id: 'q3',
      question: 'Combien de hashtags recommandez-vous par publication Instagram ?',
      options: [
        { id: 'a', text: '1-5 hashtags', isCorrect: false },
        { id: 'b', text: '5-10 hashtags', isCorrect: false },
        { id: 'c', text: '10-15 hashtags', isCorrect: false },
        { id: 'd', text: '15-30 hashtags', isCorrect: true },
      ],
      explanation: 'Les études montrent que 15-30 hashtags pertinents génèrent le plus d\'engagement.',
      points: 10,
    },
    {
      id: 'q4',
      question: 'Quelle est la meilleure heure pour publier sur Instagram en Afrique de l\'Ouest ?',
      options: [
        { id: 'a', text: '6h00 - 8h00', isCorrect: false },
        { id: 'b', text: '12h00 - 14h00', isCorrect: false },
        { id: 'c', text: '19h00 - 21h00', isCorrect: true },
        { id: 'd', text: '22h00 - 00h00', isCorrect: false },
      ],
      explanation: 'Entre 19h et 21h, les utilisateurs sont plus actifs après leur journée de travail.',
      points: 10,
    },
    {
      id: 'q5',
      question: 'Qu\'est-ce qu\'un CTA (Call To Action) dans une publication Instagram ?',
      options: [
        { id: 'a', text: 'Un filtre photo', isCorrect: false },
        { id: 'b', text: 'Une invitation à agir (ex: "Cliquez ici", "Laissez un commentaire")', isCorrect: true },
        { id: 'c', text: 'Un hashtag', isCorrect: false },
        { id: 'd', text: 'Une mention (@)', isCorrect: false },
      ],
      explanation: 'Un CTA encourage l\'utilisateur à effectuer une action spécifique : commenter, partager, cliquer, etc.',
      points: 10,
    },
  ],
  passingScore: 60,
  timeLimit: 600,
};

export default function QuizPage() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quizData.timeLimit);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const handleAnswer = (questionId: string, optionId: string) => {
    if (showResults || isReviewMode) return;
    setAnswers({ ...answers, [questionId]: optionId });
  };

  const calculateScore = () => {
    let correct = 0;
    quizData.questions.forEach(q => {
      const selectedOption = q.options.find(o => o.id === answers[q.id]);
      if (selectedOption?.isCorrect) correct++;
    });
    return (correct / quizData.questions.length) * 100;
  };

  const score = calculateScore();
  const passed = score >= quizData.passingScore;

  const nextQuestion = () => {
    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const restartQuiz = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setShowResults(false);
    setIsReviewMode(false);
    setTimeLeft(quizData.timeLimit);
  };

  const getOptionClass = (optionId: string, isCorrect: boolean) => {
    const isSelected = answers[quizData.questions[currentQuestion].id] === optionId;
    
    if (isReviewMode) {
      if (isCorrect) return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
      if (isSelected && !isCorrect) return 'border-red-500 bg-red-50 dark:bg-red-900/20';
    }
    
    if (isSelected) return 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20';
    return 'border-gray-200 dark:border-gray-700 hover:border-indigo-300';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/learn">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Retour
              </Button>
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">{quizData.title}</h1>
              <p className="text-sm text-gray-500">{quizData.courseTitle}</p>
            </div>
          </div>
          
          {!showResults && !isReviewMode && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                <Clock className="w-5 h-5 text-gray-500" />
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">
              Question {currentQuestion + 1} sur {quizData.questions.length}
            </span>
            <span className="text-sm font-medium text-indigo-600">
              {Math.round(((currentQuestion + 1) / quizData.questions.length) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-bg"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQuestion + (showResults ? 1 : 0)) / quizData.questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {!showResults ? (
          <>
            {/* Question Card */}
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card padding="lg" className="mb-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white font-bold">
                      {currentQuestion + 1}
                    </div>
                    <div>
                      <Badge variant="info" size="sm">{quizData.questions[currentQuestion].points} points</Badge>
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-8">
                  {quizData.questions[currentQuestion].question}
                </h2>

                <div className="space-y-3">
                  {quizData.questions[currentQuestion].options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAnswer(quizData.questions[currentQuestion].id, option.id)}
                      disabled={isReviewMode}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${getOptionClass(option.id, option.isCorrect)}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                        answers[quizData.questions[currentQuestion].id] === option.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}>
                        {option.id.toUpperCase()}
                      </div>
                      <span className="flex-1 text-left font-medium text-gray-900 dark:text-white">
                        {option.text}
                      </span>
                      {isReviewMode && option.isCorrect && (
                        <CheckCircle className="w-6 h-6 text-emerald-500" />
                      )}
                      {isReviewMode && answers[quizData.questions[currentQuestion].id] === option.id && !option.isCorrect && (
                        <XCircle className="w-6 h-6 text-red-500" />
                      )}
                    </button>
                  ))}
                </div>

                {isReviewMode && (
                  <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-200">Explication</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          {quizData.questions[currentQuestion].explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={prevQuestion}
                  disabled={currentQuestion === 0}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Précédent
                </Button>

                <div className="flex items-center gap-3">
                  {quizData.questions.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestion(index)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        index === currentQuestion
                          ? 'gradient-bg text-white'
                          : answers[quizData.questions[index].id]
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={nextQuestion}
                  disabled={!answers[quizData.questions[currentQuestion].id]}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {currentQuestion === quizData.questions.length - 1 ? 'Terminer' : 'Suivant'}
                </Button>
              </div>
            </motion.div>
            </>
          ) : !isReviewMode ? (
            /* Results Screen */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card variant="gradient" padding="xl" className="text-center mb-6">
                <div className="w-24 h-24 mx-auto mb-6 relative">
                  <CircularProgress
                    value={score}
                    size={96}
                    strokeWidth={6}
                    color={passed ? '#10b981' : '#ef4444'}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {passed ? (
                      <Trophy className="w-10 h-10 text-white" />
                    ) : (
                      <XCircle className="w-10 h-10 text-white" />
                    )}
                  </div>
                </div>

                <h2 className="text-3xl font-bold text-white mb-2">
                  {passed ? 'Félicitations !' : 'Pas de chance'}
                </h2>
                <p className="text-white/80 text-lg mb-6">
                  {passed
                    ? 'Vous avez réussi le quiz !'
                    : `Vous avez besoin de ${quizData.passingScore}% pour réussir. Réessayez !`}
                </p>

                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-2xl font-bold">{Math.round(score)}%</p>
                    <p className="text-sm text-white/70">Score</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-2xl font-bold">
                      {Object.values(answers).filter((a, i) => quizData.questions[i].options.find(o => o.id === a)?.isCorrect).length}
                      /{quizData.questions.length}
                    </p>
                    <p className="text-sm text-white/70">Bonnes réponses</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-4">
                    <p className="text-2xl font-bold">{Math.round((quizData.timeLimit - 0) / 60)}min</p>
                    <p className="text-sm text-white/70">Temps</p>
                  </div>
                </div>
              </Card>

              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={<Home className="w-5 h-5" />}
                  onClick={() => window.location.href = '/learn'}
                >
                  Retour au cours
                </Button>
                <Button
                  size="lg"
                  leftIcon={<RotateCcw className="w-5 h-5" />}
                  onClick={restartQuiz}
                >
                  Recommencer
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  leftIcon={<Award className="w-5 h-5" />}
                  onClick={() => setIsReviewMode(true)}
                >
                  Revoir les réponses
                </Button>
              </div>
            </motion.div>
          ) : (
            /* Review Mode */
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Revue des réponses</h2>
                <Button variant="ghost" onClick={() => setIsReviewMode(false)}>
                  Fermer
                </Button>
              </div>

              {quizData.questions.map((question, index) => (
                <Card key={question.id} padding="md" className={index === currentQuestion ? 'ring-2 ring-indigo-500' : ''}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                      answers[question.id] === question.options.find(o => o.isCorrect)?.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {answers[question.id] === question.options.find(o => o.isCorrect)?.id ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white mb-1">Question {index + 1}</p>
                      <p className="text-gray-600 dark:text-gray-300">{question.question}</p>
                    </div>
                  </div>

                  <div className="space-y-2 ml-14">
                    {question.options.map(option => (
                      <div
                        key={option.id}
                        className={`p-3 rounded-lg border ${getOptionClass(option.id, option.isCorrect)}`}
                      >
                        <span className="font-medium mr-2">{option.id.toUpperCase()}.</span>
                        {option.text}
                        {option.isCorrect && <Badge variant="success" size="sm" className="ml-2">Correct</Badge>}
                        {answers[question.id] === option.id && !option.isCorrect && (
                          <Badge variant="error" size="sm" className="ml-2">Votre réponse</Badge>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 ml-14">
                    <p className="font-medium text-blue-900 dark:text-blue-200 mb-1">Explication</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">{question.explanation}</p>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 ml-14"
                    onClick={() => setCurrentQuestion(index)}
                  >
                    Aller à cette question
                  </Button>
                </Card>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

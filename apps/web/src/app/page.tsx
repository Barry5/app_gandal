'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import { ArrowRight, Play, Users, BarChart3, Shield, Zap, Star, Check } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Migration Assistée',
    description: 'Transformez votre groupe WhatsApp en académie sans perdre votre audience.',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'Analytics Avancées',
    description: 'Suivez qui regarde vos vidéos, qui complète les quiz et qui a besoin de rappel.',
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Protection du Contenu',
    description: 'Watermarking dynamique et restriction de téléchargement pour protéger votre savoir.',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'CRM Intégré',
    description: 'Relances automatiques et notifications push pour maximiser l\'engagement.',
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: 'Certification',
    description: 'Générez des certificats vérifiables pour valoriser vos élèves.',
  },
  {
    icon: <Play className="w-6 h-6" />,
    title: 'Vidéo Optimisée',
    description: 'Streaming adaptatif avec mode économie de données pour toute connexion.',
  },
];

const stats = [
  { value: '10K+', label: 'Apprenants actifs' },
  { value: '500+', label: 'Formateurs' },
  { value: '98%', label: 'Satisfaction' },
];

const testimonials = [
  {
    name: 'Mariam Diallo',
    role: 'Formatrice en couture',
    content: 'Avant, je perdais mes vidéos sur WhatsApp. Maintenant, tout est structuré et mes élèves adorent !',
    rating: 5,
  },
  {
    name: 'Ibrahim Sow',
    role: 'Coach en marketing digital',
    content: 'Le système de quiz m\'aide à valider que mes élèves comprennent vraiment mes leçons.',
    rating: 5,
  },
  {
    name: 'Aminata Koné',
    role: 'Enseignante en langues',
    content: 'La certification a boosté la valeur de ma formation. Mes élèves sont plus motivés.',
    rating: 5,
  },
];

const plans = [
  {
    name: 'Gratuit',
    price: '0',
    period: 'pour toujours',
    description: 'Parfait pour tester et commencer',
    features: [
      'Jusqu\'à 10 élèves',
      '3 cours maximum',
      'Commission 10%',
      'Support comunidad',
    ],
    cta: 'Commencer gratuit',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '49 900',
    period: 'GNF/mois',
    description: 'Pour les formateurs sérieux',
    features: [
      'Élèves illimités',
      'Cours illimités',
      'Commission 3%',
      'Certification incluse',
      'Analytics avancées',
      'Support prioritaire',
    ],
    cta: 'Essai gratuit 14j',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Sur devis',
    period: '',
    description: 'Pour les grandes écoles',
    features: [
      'Tout du plan Pro',
      'White label',
      'API access',
      'Support dédié',
      'Formation équipe',
    ],
    cta: 'Contactez-nous',
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">Savoir-App</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">
                Fonctionnalités
              </Link>
              <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">
                Tarifs
              </Link>
              <Link href="#testimonials" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition">
                Témoignages
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Connexion</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Commencer</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl" />
        </div>
        
        <div className="max-w-7xl mx-auto relative">
          <div className="text-center max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="gradient" size="md" className="mb-6">
                🚀 Plus de 500 formateurs font confiance à Savoir-App
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white leading-tight">
                Transformez WhatsApp en{' '}
                <span className="gradient-text">Académie Numérique</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Le LMS mobile-first qui structure votre contenu, protège votre savoir et automatisent vos revenus. 
                Conçu pour l'Afrique, avec support Orange Money & MTN MoMo.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/register">
                  <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Créer mon académie gratuite
                  </Button>
                </Link>
                <Button variant="outline" size="lg" leftIcon={<Play className="w-4 h-4" />}>
                  Voir la démo
                </Button>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-20 relative"
          >
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 to-transparent z-10 pointer-events-none" />
              <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 bg-gray-900">
                <div className="bg-gray-800 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 text-center">
                    savoir-app.com/dashboard
                  </div>
                </div>
                <div className="aspect-video bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-8 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full gradient-bg flex items-center justify-center mx-auto mb-4 cursor-pointer hover:scale-110 transition-transform">
                      <Play className="w-10 h-10 text-white ml-1" />
                    </div>
                    <p className="text-white/80 text-sm">Découvrez le tableau de bord</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Tout ce dont vous avez besoin pour enseigneer
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Une plateforme complète pour créer, vendre et gérer vos formations en ligne.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card variant="bordered" padding="lg" className="h-full hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {index === 0 ? (
                      <Link href="/migration" className="hover:text-indigo-600 transition">
                        {feature.title}
                      </Link>
                    ) : (
                      feature.title
                    )}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Des tarifs adaptés à votre croissance
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Commencez gratuitement et évoluez selon vos besoins.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card 
                  variant={plan.highlighted ? 'gradient' : 'bordered'} 
                  padding="lg" 
                  className={`h-full relative ${plan.highlighted ? 'text-white' : ''}`}
                >
                  {plan.highlighted && (
                    <Badge variant="default" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-indigo-600">
                      Populaire
                    </Badge>
                  )}
                  <div className="mb-6">
                    <h3 className={`text-xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {plan.name}
                    </h3>
                    <div className="mt-2">
                      <span className={`text-4xl font-extrabold ${plan.highlighted ? 'text-white' : 'gradient-text'}`}>
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className={`text-sm ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>
                          {' '}{plan.period}
                        </span>
                      )}
                    </div>
                    <p className={`mt-2 text-sm ${plan.highlighted ? 'text-white/70' : 'text-gray-500'}`}>
                      {plan.description}
                    </p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className={`w-5 h-5 ${plan.highlighted ? 'text-white' : 'text-indigo-500'}`} />
                        <span className={`text-sm ${plan.highlighted ? 'text-white/90' : 'text-gray-600 dark:text-gray-300'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    variant={plan.highlighted ? 'secondary' : 'outline'} 
                    className={`w-full ${plan.highlighted ? 'bg-white text-indigo-600 hover:bg-white/90' : ''}`}
                  >
                    {plan.cta}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Ce que disent nos formateurs
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              Des centaines de formateurs ont déjà transformé leur business avec Savoir-App.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Card variant="bordered" padding="lg">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
                    "{testimonial.content}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-semibold text-sm">
                      {testimonial.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">{testimonial.name}</p>
                      <p className="text-xs text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Card variant="gradient" padding="xl">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Prêt à transformer votre groupe WhatsApp ?
              </h2>
              <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                Rejoignez plus de 500 formateurs qui utilisent déjà Savoir-App pour structurer leurs formations et augmenter leurs revenus.
              </p>
              <Link href="/auth/register">
                <Button 
                  size="lg" 
                  className="bg-white text-indigo-600 hover:bg-white/90"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Créer mon académie gratuitement
                </Button>
              </Link>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">Savoir-App</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="#" className="hover:text-gray-900 dark:hover:text-white">Confidentialité</Link>
              <Link href="#" className="hover:text-gray-900 dark:hover:text-white">Conditions</Link>
              <Link href="#" className="hover:text-gray-900 dark:hover:text-white">Contact</Link>
            </div>
            <p className="text-sm text-gray-500">
              © 2024 Savoir-App. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function BookOpen({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
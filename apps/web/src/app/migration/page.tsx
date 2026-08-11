'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  MessageCircle,
  Users,
  FileText,
  Video,
  Upload,
  CheckCircle,
  ArrowDown,
  Phone,
  Mail,
  Zap,
  Shield,
  BarChart3,
  Award,
  Download,
  Wand2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';

const steps = [
  {
    number: '01',
    title: 'Exportez vos données WhatsApp',
    description: 'Paramètres du groupe → Exporter le chat → Sans médias. Vous получите un fichier texte avec tous les messages.',
    icon: Download,
  },
  {
    number: '02',
    title: 'Importez vos apprenants',
    description: 'Collez la liste de vos membres (nom, téléphone) ou importez un fichier CSV.他们是自动添加.',
    icon: Users,
  },
  {
    number: '03',
    title: 'Transformez le contenu en cours',
    description: 'Upload du fichier WhatsApp → L\'IA analyse et restructure les messages en modules et leçons structurés.',
    icon: Wand2,
  },
  {
    number: '04',
    title: 'Configurez et publiez',
    description: 'Ajoutez prix, description, puis partagez le lien d\'inscription à vos apprenants existants.',
    icon: Upload,
  },
];

const features = [
  {
    title: 'Pas de perte de données',
    description: 'Tous les messages, liens et documents partagés sont conservés et transformés en contenu structuré.',
    icon: FileText,
  },
  {
    title: 'Vos apprenants vous suivent',
    description: 'ereka automatique des contacts depuis WhatsApp. Pas de nouvelle inscription complexe.',
    icon: Phone,
  },
  {
    title: 'Contenu protégé',
    description: 'Finish watermarkting automatique des vidéos. Téléchargement bloqué. Vos cours restent vôtre.',
    icon: Shield,
  },
  {
    title: 'Suivi de progression',
    description: 'Vous voyez exactement qui a commencé, terminé, ou a besoin de rappel. Fini le flou.',
    icon: BarChart3,
  },
  {
    title: 'Certificats automatiques',
    description: 'Générez des certificats vérifiables quand un apprenant termine un cours.',
    icon: Award,
  },
  {
    title: 'Notifications intégrées',
    description: 'Rappels automatiques par email et SMS. Pas besoin de relancer manuellement.',
    icon: MessageCircle,
  },
];

const timeline = [
  { day: 'J1', action: 'Upload du fichier WhatsApp' },
  { day: 'J1', action: 'Import des apprenants' },
  { day: 'J1', action: 'Structuration automatique du contenu' },
  { day: 'J2', action: 'Validation et ajustement' },
  { day: 'J3', action: 'Publication et envoi des invitations' },
];

export default function MigrationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />

        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <Badge className="mb-6 bg-indigo-500/20 text-indigo-300 border-indigo-500/30">
              <Zap className="w-3 h-3 mr-1" /> Migration Assistée
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              Transformez votre groupe WhatsApp en{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                académie professionnelle
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
              Sans perdre un seul apprenant. Sans perdre votre contenu. En 3 jours, votre formation est en ligne.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600">
                  Commencer la migration
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                <MessageCircle className="w-5 h-5 mr-2" />
                Demo vidéo
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-20 relative"
          >
            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-between text-sm text-slate-400 mb-4">
                <span>WhatsApp</span>
                <ArrowRight className="w-5 h-5 text-indigo-400" />
                <span>Savoir</span>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <MessageCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-white font-medium">Groupe WhatsApp</p>
                  <p className="text-slate-400 text-sm mt-1">Messagerie非结构isée</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <ArrowRight className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                  <p className="text-white font-medium">Transformation</p>
                  <p className="text-slate-400 text-sm mt-1">Analyse automatique</p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                  <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-white font-medium">Académie en ligne</p>
                  <p className="text-slate-400 text-sm mt-1">Cours structurés + Suivi</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Steps Section */}
      <div className="py-24 bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              4 étapes simples pour migrer votre formation WhatsApp vers une plateforme professionnelle
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative"
              >
                <div className="bg-slate-800 rounded-2xl p-6 h-full border border-slate-700 hover:border-indigo-500/50 transition group">
                  <div className="text-6xl font-bold text-indigo-500/20 absolute top-4 right-4">
                    {step.number}
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                    <step.icon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-slate-400 text-sm">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-5 h-5 text-slate-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Timeline */}
          <div className="mt-16 bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-6 text-center">Calendrier estimée</h3>
            <div className="flex items-center justify-between overflow-x-auto pb-4">
              {timeline.map((item, index) => (
                <div key={index} className="flex flex-col items-center min-w-[120px]">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm mb-2">
                    {item.day}
                  </div>
                  <p className="text-slate-400 text-xs text-center">{item.action}</p>
                  {index < timeline.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-slate-600 mt-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="py-24 bg-gradient-to-b from-slate-900 to-indigo-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pourquoi passer à Savoir ?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Comparaison des fonctionnalités entre WhatsApp et notre plateforme
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 hover:border-indigo-500/30 transition"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Comparison Table */}
          <div className="mt-16 overflow-x-auto">
            <table className="w-full max-w-3xl mx-auto">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4 text-slate-400 font-medium">Fonctionnalité</th>
                  <th className="text-center py-4 px-4 text-green-400 font-medium">WhatsApp</th>
                  <th className="text-center py-4 px-4 text-indigo-400 font-medium">Savoir</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Cours structurés', whatsapp: '❌', savoir: '✅' },
                  { feature: 'Suivi de progression', whatsapp: '❌', savoir: '✅' },
                  { feature: 'Vidéos HD + streaming', whatsapp: '⚠️', savoir: '✅' },
                  { feature: 'Quiz interactifs', whatsapp: '❌', savoir: '✅' },
                  { feature: 'Certificats', whatsapp: '❌', savoir: '✅' },
                  { feature: 'Protection du contenu', whatsapp: '❌', savoir: '✅' },
                  { feature: 'Analytics détaillées', whatsapp: '❌', savoir: '✅' },
                  { feature: 'Notifications automatiques', whatsapp: '⚠️', savoir: '✅' },
                  { feature: 'Paiements en ligne', whatsapp: '❌', savoir: '✅' },
                ].map((row, index) => (
                  <tr key={index} className="border-b border-slate-800">
                    <td className="py-4 px-4 text-slate-300">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-lg">{row.whatsapp}</td>
                    <td className="py-4 px-4 text-center text-lg">{row.savoir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Prêt à professionnaliser votre formation ?
            </h2>
            <p className="text-xl text-slate-400 mb-10">
              Rejoignez les formateurs qui ont déjà migré leur groupe WhatsApp vers Savoir
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register">
                <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600">
                  Démarrer gratuitement
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                <Mail className="w-5 h-5 mr-2" />
                Nous contacter
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-slate-950 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-white font-semibold">Savoir</span>
            </div>
            <p className="text-slate-400 text-sm">
              © 2024 Savoir. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
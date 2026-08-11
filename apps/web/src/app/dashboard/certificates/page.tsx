'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Download,
  Share2,
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  BookOpen,
  CheckCircle,
  Clock,
  FileText,
  Copy,
  ExternalLink,
  QrCode,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge, Avatar } from '@/components/ui/DataDisplay';
import DashboardLayout from '@/components/layout/DashboardLayout';

interface Certificate {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  courseThumbnail: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  progress: number;
  status: 'completed' | 'pending' | 'expired';
}

const mockCertificates: Certificate[] = [];

const statusConfig = {
  completed: { label: 'Délivré', variant: 'success' as const, icon: CheckCircle },
  pending: { label: 'En attente', variant: 'warning' as const, icon: Clock },
  expired: { label: 'Expiré', variant: 'error' as const, icon: Clock },
};

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>(mockCertificates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showVerification, setShowVerification] = useState(false);

  const filteredCertificates = certificates.filter(cert =>
    cert.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = certificates.filter(c => c.status === 'completed').length;
  const pendingCount = certificates.filter(c => c.status === 'pending').length;
  const thisMonthCount = certificates.filter(c => c.status === 'completed' && new Date(c.issuedAt).getMonth() === new Date().getMonth()).length;
  const completionRate = certificates.length > 0 ? Math.round((completedCount / certificates.length) * 100) : 0;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Certificats</h1>
            <p className="text-gray-500 dark:text-gray-400">Gérez les certificats de vos élèves</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" leftIcon={<QrCode className="w-5 h-5" />} onClick={() => setShowVerification(true)}>
              Vérifier
            </Button>
            <Button leftIcon={<Download className="w-5 h-5" />}>
              Exporter
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Total délivrés</p>
                  <p className="text-3xl font-bold mt-1">{completedCount}</p>
                </div>
                <Award className="w-10 h-10 text-white/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">En attente</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{pendingCount}</p>
                </div>
                <Clock className="w-10 h-10 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Ce mois</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{thisMonthCount}</p>
                </div>
                <Calendar className="w-10 h-10 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Taux de complétion</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{completionRate}%</p>
                </div>
                <Shield className="w-10 h-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card padding="md">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par nom, cours ou numéro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <select className="px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Tous les statuts</option>
              <option>Délivrés</option>
              <option>En attente</option>
            </select>
          </div>
        </Card>

        {/* Certificates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate, index) => (
            <motion.div
              key={certificate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card 
                padding="none" 
                className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${certificate.status === 'pending' ? 'opacity-75' : ''}`}
              >
                <div className="relative h-32 bg-gradient-to-br from-indigo-500 to-purple-600">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Award className="w-16 h-16 text-white/30" />
                  </div>
                  <div className="absolute top-3 right-3">
                    <Badge variant={statusConfig[certificate.status].variant}>
                      {statusConfig[certificate.status].label}
                    </Badge>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={certificate.studentName} size="md" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{certificate.studentName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{certificate.studentEmail}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      {certificate.courseTitle}
                    </p>
                    {certificate.progress < 100 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-500">Progression</span>
                          <span className="font-medium text-indigo-600">{certificate.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${certificate.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {certificate.status === 'completed' && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-500 dark:text-gray-400">N° Certificat</span>
                        <span className="font-mono text-gray-900 dark:text-white">{certificate.certificateNumber}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Délivré le</span>
                        <span className="text-gray-900 dark:text-white">{certificate.issuedAt}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
                
                {certificate.status === 'completed' && (
                  <div className="px-4 pb-4 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1" 
                      leftIcon={<Eye className="w-4 h-4" />}
                      onClick={() => setSelectedCertificate(certificate)}
                    >
                      Voir
                    </Button>
                    <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />} className="flex-1">
                      PDF
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredCertificates.length === 0 && (
          <Card className="text-center py-12">
            <Award className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucun certificat trouvé</h3>
            <p className="text-gray-500 dark:text-gray-400">Aucun certificat ne correspond à vos critères</p>
          </Card>
        )}
      </div>

      {/* Certificate Detail Modal */}
      <AnimatePresence>
        {selectedCertificate && (
          <CertificateDetailModal
            certificate={selectedCertificate}
            onClose={() => setSelectedCertificate(null)}
          />
        )}
      </AnimatePresence>

      {/* Verification Modal */}
      <AnimatePresence>
        {showVerification && (
          <VerificationModal onClose={() => setShowVerification(false)} />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

function CertificateDetailModal({
  certificate,
  onClose,
}: {
  certificate: Certificate;
  onClose: () => void;
}) {
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        {/* Certificate Preview */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-8 text-center">
          <Award className="w-16 h-16 mx-auto text-white/80 mb-4" />
          <h2 className="text-2xl font-bold text-white">CERTIFICAT</h2>
          <p className="text-white/80">DE RÉUSSITE</p>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-500 dark:text-gray-400 mb-1">Ceci certifie que</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{certificate.studentName}</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2">a successfully complété avec succès le cours</p>
            <h4 className="text-xl font-semibold text-indigo-600 mt-2">{certificate.courseTitle}</h4>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Numéro</p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">{certificate.certificateNumber}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Date</p>
                <p className="font-medium text-gray-900 dark:text-white">{certificate.issuedAt}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" leftIcon={<Eye className="w-4 h-4" />}>
              Prévisualiser
            </Button>
            <Button className="flex-1" leftIcon={<Download className="w-4 h-4" />}>
              Télécharger PDF
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function VerificationModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setResult({
        valid: false,
        message: 'Aucun certificat correspondant a ce code. La verification en ligne sera disponible prochainement.',
      });
    }, 1500);
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Vérifier un certificat</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            ✕
          </button>
        </div>

        {!result ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Code de vérification
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Entrez le code de vérification"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button className="w-full" onClick={handleVerify} disabled={!code || loading}>
              {loading ? 'Vérification...' : 'Vérifier'}
            </Button>
          </>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Certificat introuvable</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{result.message}</p>
            <Button variant="outline" className="w-full" onClick={() => setResult(null)}>
              Reessayer
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
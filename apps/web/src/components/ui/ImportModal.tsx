'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Upload,
  FileSpreadsheet,
  MessageCircle,
  X,
  Check,
  AlertCircle,
  Users,
  FileText,
  ArrowRight,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/DataDisplay';
import learnerStorage, { Learner } from '@/lib/learnerStorage';
import { parseWhatsAppChat, convertToCourse, WhatsAppImportResult, CourseFromWhatsApp } from '@/lib/whatsappImport';
import courseStorage from '@/lib/courseStorage';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (learners: Learner[]) => void;
}

type ImportStep = 'select' | 'learners' | 'whatsapp' | 'preview';

interface LearnerImportData {
  name: string;
  email?: string;
  phone?: string;
}

export default function ImportModal({ isOpen, onClose, onImportComplete }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>('select');
  const [learnerData, setLearnerData] = useState<LearnerImportData[]>([]);
  const [whatsappResult, setWhatsappResult] = useState<WhatsAppImportResult | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const handleLearnersImport = useCallback((data: string) => {
    const lines = data.split('\n').filter(l => l.trim());
    const parsed: LearnerImportData[] = [];
    
    lines.forEach((line, idx) => {
      const parts = line.split(/[,\t;]/).map(p => p.trim());
      if (parts.length >= 1 && parts[0]) {
        parsed.push({
          name: parts[0],
          email: parts[1] || '',
          phone: parts[2] || '',
        });
      }
    });
    
    setLearnerData(parsed);
    setStep('preview');
  }, []);

  const handleWhatsAppImport = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseWhatsAppChat(content);
      setWhatsappResult(result);
      setCourseTitle(`Cours depuis WhatsApp - ${result.dateRange.start}`);
      setStep('preview');
      toast.success(`${result.messages.length} messages analysés`);
    };
    reader.readAsText(file);
  }, []);

  const handleConfirmLearnerImport = useCallback(() => {
    const result = learnerStorage.addBulk(learnerData);
    setImportErrors(result.errors);
    
    if (result.added > 0) {
      const allLearners = learnerStorage.getAll();
      onImportComplete?.(allLearners.slice(0, result.added));
      toast.success(`${result.added} apprenants importés`);
      handleClose();
    }
  }, [learnerData, onImportComplete]);

  const handleConfirmWhatsAppImport = useCallback(() => {
    if (!whatsappResult || !courseTitle) return;
    
    const courseData = convertToCourse(whatsappResult, courseTitle);
    const savedCourse = courseStorage.create(courseData);
    
    toast.success('Cours créé depuis WhatsApp');
    handleClose();
  }, [whatsappResult, courseTitle]);

  const handleClose = () => {
    setStep('select');
    setLearnerData([]);
    setWhatsappResult(null);
    setCourseTitle('');
    setImportErrors([]);
    onClose();
  };

  const downloadSampleCSV = () => {
    const sample = "Nom,Email,Téléphone\nAminata Koné,aminata@email.com,771234567\nMamadou Diallo,mamadou@email.com,772345678";
    const blob = new Blob([sample], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_import_apprenants.csv';
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Importer</h2>
            <p className="text-sm text-gray-500">Importez des apprenants ou du contenu</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStep('learners')}
                className="p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Importer des apprenants</h3>
                <p className="text-sm text-gray-500">Ajoutez plusieurs apprenants depuis un fichier CSV ou texte</p>
              </button>

              <button
                onClick={() => setStep('whatsapp')}
                className="p-6 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition text-left group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Importer depuis WhatsApp</h3>
                <p className="text-sm text-gray-500">Transformez un export de chat WhatsApp en cours</p>
              </button>
            </div>
          )}

          {step === 'learners' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Liste des apprenants</h3>
                <Button variant="outline" size="sm" onClick={downloadSampleCSV} leftIcon={<Download className="w-4 h-4" />}>
                  Télécharger modèle
                </Button>
              </div>
              
              <Textarea
                placeholder="Collez vos données ici (une ligne par apprenant)&#10;Format: Nom, Email, Téléphone&#10;&#10;Exemple:&#10;Aminata Koné, aminata@email.com, 771234567&#10;Mamadou Diallo, mamadou@email.com, 772345678"
                className="min-h-[200px] font-mono text-sm"
                value={learnerData.map(l => `${l.name},${l.email || ''},${l.phone || ''}`).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value.split('\n').filter(l => l.trim());
                  setLearnerData(lines.map(line => {
                    const parts = line.split(/[,\t;]/).map(p => p.trim());
                    return { name: parts[0] || '', email: parts[1] || '', phone: parts[2] || '' };
                  }));
                }}
              />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('select')}>Retour</Button>
                <Button onClick={() => setStep('preview')} disabled={learnerData.length === 0}>
                  Analyser {learnerData.length} apprenants
                </Button>
              </div>
            </div>
          )}

          {step === 'whatsapp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900 dark:text-amber-200">Comment exporter votre chat WhatsApp</p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Ouvrez le groupe → Paramètres → Exporter le chat → Sans médias
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-green-500 transition cursor-pointer">
                <input
                  type="file"
                  accept=".txt,.html"
                  className="hidden"
                  id="whatsapp-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleWhatsAppImport(file);
                  }}
                />
                <label htmlFor="whatsapp-upload" className="cursor-pointer">
                  <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium text-gray-900 dark:text-white">Cliquez pour uploader</p>
                  <p className="text-sm text-gray-500">Fichier .txt ou .html exporté de WhatsApp</p>
                </label>
              </div>

              <Button variant="outline" onClick={() => setStep('select')}>Retour</Button>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              {learnerData.length > 0 && (
                <>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Aperçu ({learnerData.length} apprenants)
                    </h3>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {learnerData.slice(0, 10).map((learner, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <span className="text-sm font-medium text-indigo-600">
                              {learner.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white">{learner.name}</p>
                            <p className="text-sm text-gray-500">
                              {learner.email || learner.phone || 'Aucun contact'}
                            </p>
                          </div>
                          {(learner.email || learner.phone) && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      ))}
                      {learnerData.length > 10 && (
                        <p className="text-center text-sm text-gray-500 py-2">
                          ... et {learnerData.length - 10} autres
                        </p>
                      )}
                    </div>
                  </div>

                  {importErrors.length > 0 && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20">
                      <p className="font-medium text-red-900 dark:text-red-200 mb-2">Erreurs détectées:</p>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {importErrors.slice(0, 5).map((err, idx) => (
                          <li key={idx}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {whatsappResult && (
                <>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Contenu analysé</h3>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                        <p className="text-2xl font-bold text-indigo-600">{whatsappResult.messages.length}</p>
                        <p className="text-xs text-gray-500">Messages</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                        <p className="text-2xl font-bold text-green-600">{whatsappResult.participants.length}</p>
                        <p className="text-xs text-gray-500">Participants</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                        <p className="text-2xl font-bold text-purple-600">{whatsappResult.media.images}</p>
                        <p className="text-xs text-gray-500">Images</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <p className="text-2xl font-bold text-orange-600">{whatsappResult.media.documents}</p>
                        <p className="text-xs text-gray-500">Documents</p>
                      </div>
                    </div>
                  </div>

                  <Input
                    label="Titre du cours"
                    value={courseTitle}
                    onChange={(e) => setCourseTitle(e.target.value)}
                    placeholder="Nom du cours à créer"
                  />
                </>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setStep('select'); setImportErrors([]); }}>
                  Retour
                </Button>
                {learnerData.length > 0 && (
                  <Button onClick={handleConfirmLearnerImport}>
                    Confirmer l'import
                  </Button>
                )}
                {whatsappResult && courseTitle && (
                  <Button onClick={handleConfirmWhatsAppImport}>
                    Créer le cours
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
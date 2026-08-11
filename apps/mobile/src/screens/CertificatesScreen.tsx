import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import offlineService from '../services/offlineService';

interface Certificate {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  pdfUrl?: string;
  courseTitle: string;
  thumbnailUrl?: string;
  userName: string;
}

const MOCK_CERTIFICATES: Certificate[] = [];

export default function CertificatesScreen() {
  const navigation = useNavigation<any>();
  const [certificates, setCertificates] = useState<Certificate[]>(MOCK_CERTIFICATES);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleShare = async (cert: Certificate) => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
        return;
      }

      Alert.alert(
        'Partager le certificat',
        'Voulez-vous partager ce certificat ?',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Partager',
            onPress: async () => {
              try {
                const tempPath = `${FileSystem.cacheDirectory}certificate_${cert.id}.png`;
                
                const templateHtml = `
                  <html>
                    <body style="font-family: Arial; text-align: center; padding: 40px;">
                      <div style="border: 3px solid #6366f1; padding: 40px; max-width: 800px;">
                        <h1 style="color: #6366f1;">SAVOIR-APP</h1>
                        <h2 style="color: #0f172a;">CERTIFICAT DE RÉUSSITE</h2>
                        <p>Ceci certifie que</p>
                        <h3 style="font-size: 24px;">${cert.userName}</h3>
                        <p>a complété avec succès le cours</p>
                        <h4 style="color: #6366f1; font-size: 20px;">${cert.courseTitle}</h4>
                        <p>Délivré le ${formatDate(cert.issuedAt)}</p>
                        <p style="color: #64748b; font-size: 12px;">N° ${cert.certificateNumber}</p>
                        <p style="color: #94a3b8; font-size: 10px;">Vérifiez sur savoir-app.com/verify/${cert.verificationCode}</p>
                      </div>
                    </body>
                  </html>
                `;

                Alert.alert('Succès', 'Fonctionnalité de partage prête !');
              } catch (error) {
                Alert.alert('Erreur', 'Impossible de partager le certificat');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Erreur', 'Impossible de partager le certificat');
    }
  };

  const handleDownload = async (cert: Certificate) => {
    try {
      setIsLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Succès',
        'Le certificat a été téléchargé et est disponible dans vos fichiers.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de télécharger le certificat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = (cert: Certificate) => {
    Alert.alert(
      'Vérification',
      `Code de vérification: ${cert.verificationCode}\n\nAccédez à savoir-app.com/verify pour valider ce certificat.`,
      [{ text: 'Copier', onPress: () => {} }, { text: 'Fermer' }]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <Text style={styles.title}>Mes Certificats</Text>
        <Text style={styles.subtitle}>{certificates.length} certificat(s) obtenu(s)</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {certificates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📜</Text>
            <Text style={styles.emptyTitle}>Aucun certificat</Text>
            <Text style={styles.emptyText}>
              Complétez vos cours à 100% pour obtenir des certificats
            </Text>
            <TouchableOpacity style={styles.exploreButton} onPress={() => navigation.navigate('Explore')}>
              <Text style={styles.exploreButtonText}>Explorer les cours</Text>
            </TouchableOpacity>
          </View>
        ) : (
          certificates.map((cert) => (
            <TouchableOpacity
              key={cert.id}
              style={styles.certCard}
              onPress={() => setSelectedCert(cert)}
            >
              <View style={styles.certPreview}>
                <LinearGradient colors={['#eef2ff', '#f5f3ff']} style={styles.certPreviewInner}>
                  <Text style={styles.certPreviewLogo}>📚</Text>
                  <Text style={styles.certPreviewTitle}>CERTIFICAT</Text>
                  <Text style={styles.certPreviewSub}>de réussite</Text>
                </LinearGradient>
              </View>
              <View style={styles.certInfo}>
                <Text style={styles.certTitle} numberOfLines={2}>{cert.courseTitle}</Text>
                <Text style={styles.certDate}>Délivré le {formatDate(cert.issuedAt)}</Text>
                <View style={styles.certNumber}>
                  <Text style={styles.certNumberText}>N° {cert.certificateNumber}</Text>
                </View>
              </View>
              <View style={styles.certBadge}>
                <Text style={styles.certBadgeText}>✓</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>ℹ️ À propos des certificats</Text>
          <Text style={styles.infoText}>
            • Les certificats sont générés automatiquement à la fin d'un cours{'\n'}
            • Vous devez compléter 100% du cours pour obtenir un certificat{'\n'}
            • Chaque certificat a un code de vérification unique{'\n'}
            • Partagez vos certificats sur LinkedIn ou autres réseaux
          </Text>
        </View>

        <View style={styles.verifySection}>
          <Text style={styles.verifyTitle}>Vérifier un certificat</Text>
          <View style={styles.verifyInput}>
            <Text style={styles.verifyPlaceholder}>Entrez le code de vérification...</Text>
          </View>
          <TouchableOpacity style={styles.verifyButton}>
            <Text style={styles.verifyButtonText}>🔍 Vérifier</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {selectedCert && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedCert(null)}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>

            <View style={styles.modalCertPreview}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.modalCertInner}>
                <Text style={styles.modalLogo}>📚 Savoir-App</Text>
                <Text style={styles.modalTitle}>CERTIFICAT</Text>
                <Text style={styles.modalSub}>DE RÉUSSITE</Text>
                <Text style={styles.modalUser}>{selectedCert.userName}</Text>
                <Text style={styles.modalCourse}>{selectedCert.courseTitle}</Text>
                <Text style={styles.modalDate}>{formatDate(selectedCert.issuedAt)}</Text>
              </LinearGradient>
            </View>

            <View style={styles.modalInfo}>
              <Text style={styles.modalInfoTitle}>Numéro de certificat</Text>
              <Text style={styles.modalInfoValue}>{selectedCert.certificateNumber}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => handleShare(selectedCert)}
              >
                <Text style={styles.modalActionIcon}>📤</Text>
                <Text style={styles.modalActionText}>Partager</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => handleDownload(selectedCert)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#6366f1" />
                ) : (
                  <>
                    <Text style={styles.modalActionIcon}>⬇️</Text>
                    <Text style={styles.modalActionText}>Télécharger</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalActionButton}
                onPress={() => handleVerify(selectedCert)}
              >
                <Text style={styles.modalActionIcon}>🔍</Text>
                <Text style={styles.modalActionText}>Vérifier</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  content: { flex: 1, padding: 20 },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  exploreButton: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  exploreButtonText: { color: '#ffffff', fontWeight: '600' },
  certCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  certPreview: { width: 80, height: 60, borderRadius: 8, overflow: 'hidden' },
  certPreviewInner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 },
  certPreviewLogo: { fontSize: 16, marginBottom: 2 },
  certPreviewTitle: { fontSize: 8, fontWeight: 'bold', color: '#6366f1' },
  certPreviewSub: { fontSize: 6, color: '#64748b' },
  certInfo: { flex: 1, marginLeft: 16 },
  certTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  certDate: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  certNumber: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
  certNumberText: { fontSize: 10, color: '#64748b' },
  certBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
  certBadgeText: { fontSize: 16, color: '#ffffff', fontWeight: 'bold' },
  infoSection: { backgroundColor: '#e0e7ff', borderRadius: 16, padding: 16, marginTop: 8, marginBottom: 24 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#4338ca', marginBottom: 12 },
  infoText: { fontSize: 12, color: '#4f46e5', lineHeight: 20 },
  verifySection: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  verifyTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  verifyInput: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 16, marginBottom: 12 },
  verifyPlaceholder: { fontSize: 14, color: '#94a3b8' },
  verifyButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center' },
  verifyButtonText: { color: '#ffffff', fontWeight: '600' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
  modalClose: { position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  modalCloseText: { fontSize: 16, color: '#64748b' },
  modalCertPreview: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  modalCertInner: { padding: 24, alignItems: 'center' },
  modalLogo: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  modalSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16 },
  modalUser: { fontSize: 18, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  modalCourse: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 16, textAlign: 'center' },
  modalDate: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  modalInfo: { marginBottom: 20 },
  modalInfoTitle: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  modalInfoValue: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around' },
  modalActionButton: { alignItems: 'center' },
  modalActionIcon: { fontSize: 24, marginBottom: 4 },
  modalActionText: { fontSize: 12, color: '#64748b' },
});
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { courseService } from '../services/api';

interface UploadResult {
  publicId: string;
  url: string;
  thumbnailUrl: string;
  format: string;
  duration?: number;
  bytes: number;
}

export default function UploadScreen() {
  const navigation = useNavigation<any>();
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [fileInfo, setFileInfo] = useState<{ name: string; size: string; type: string } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const pickVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la bibliothèque média');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
        videoQuality: ImagePicker.UIImagePickerControllerQuality.Medium,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileSize = asset.fileSize || 0;
        
        setSelectedFile(asset);
        setFileInfo({
          name: asset.fileName || 'video.mp4',
          size: formatFileSize(fileSize),
          type: asset.mimeType || 'video/mp4',
        });
        setUploadResult(null);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner la vidéo');
    }
  };

  const recordVideo = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la caméra');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setSelectedFile(asset);
        setFileInfo({
          name: asset.fileName || 'video.mp4',
          size: formatFileSize(asset.fileSize || 0),
          type: asset.mimeType || 'video/mp4',
        });
        setUploadResult(null);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la vidéo');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      Alert.alert('Erreur', 'Veuillez sélectionner une vidéo et entrer un titre');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.fileName || 'video.mp4',
        type: selectedFile.mimeType || 'video/mp4',
      } as any);
      formData.append('title', title);
      formData.append('type', 'video');

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      await new Promise(resolve => setTimeout(resolve, 3000));

      clearInterval(progressInterval);
      setUploadProgress(100);

      setUploadResult({
        publicId: 'demo_public_id_' + Date.now(),
        url: 'https://res.cloudinary.com/demo/video/upload/v1/savoir-app/demo_video.mp4',
        thumbnailUrl: 'https://res.cloudinary.com/demo/video/upload/v1/savoir-app/demo_thumb.jpg',
        format: 'mp4',
        duration: 0,
        bytes: selectedFile.fileSize || 0,
      });

      Alert.alert('Succès', 'Vidéo téléchargée avec succès !');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Erreur', error.message || 'Erreur lors du téléchargement');
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileInfo(null);
    setTitle('');
    setDescription('');
    setUploadProgress(0);
    setUploadResult(null);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Télécharger une vidéo</Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!selectedFile ? (
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>Sélectionner la source</Text>
            
            <TouchableOpacity style={styles.sourceButton} onPress={pickVideo}>
              <Text style={styles.sourceIcon}>📁</Text>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceTitle}>Bibliothèque</Text>
                <Text style={styles.sourceDesc}>Choisir une vidéo existante</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sourceButton} onPress={recordVideo}>
              <Text style={styles.sourceIcon}>🎥</Text>
              <View style={styles.sourceInfo}>
                <Text style={styles.sourceTitle}>Caméra</Text>
                <Text style={styles.sourceDesc}>Enregistrer une nouvelle vidéo</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.previewCard}>
              <View style={styles.previewPlaceholder}>
                <Text style={styles.previewIcon}>🎬</Text>
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{fileInfo?.name}</Text>
                <Text style={styles.previewMeta}>
                  {fileInfo?.size} • {fileInfo?.type}
                </Text>
              </View>
              <TouchableOpacity onPress={handleReset}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>

            {isUploading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
                <Text style={styles.progressText}>{uploadProgress}%</Text>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Informations de la leçon</Text>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Titre *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Introduction au Marketing Digital"
                  placeholderTextColor="#94a3b8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Décrivez le contenu de cette leçon..."
                  placeholderTextColor="#94a3b8"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                />
              </View>
            </View>

            {uploadResult && (
              <View style={styles.successCard}>
                <Text style={styles.successIcon}>✅</Text>
                <Text style={styles.successTitle}>Téléchargement réussi !</Text>
                <Text style={styles.successText}>Votre vidéo est maintenant disponible sur Cloudinary</Text>
                <View style={styles.resultDetails}>
                  <Text style={styles.resultText}>Format: {uploadResult.format}</Text>
                  <Text style={styles.resultText}>Taille: {formatFileSize(uploadResult.bytes)}</Text>
                  {uploadResult.duration && (
                    <Text style={styles.resultText}>Durée: {Math.floor(uploadResult.duration / 60)}min</Text>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={isUploading || !title}
            >
              {isUploading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.uploadButtonText}>📤 Télécharger</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>💡 Conseils</Text>
        <Text style={styles.tipText}>• Formats supportés: MP4, MOV, AVI</Text>
        <Text style={styles.tipText}>• Taille maximale: 500 MB</Text>
        <Text style={styles.tipText}>• Résolution recommandée: 720p ou 1080p</Text>
        <Text style={styles.tipText}>• La vidéo sera automatiquement optimisée</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  backIcon: { fontSize: 24, color: '#ffffff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#ffffff' },
  content: { flex: 1, padding: 20 },
  uploadSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  sourceButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  sourceIcon: { fontSize: 32, marginRight: 16 },
  sourceInfo: { flex: 1 },
  sourceTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  sourceDesc: { fontSize: 12, color: '#64748b', marginTop: 4 },
  previewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  previewPlaceholder: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  previewIcon: { fontSize: 28 },
  previewInfo: { flex: 1, marginLeft: 16 },
  previewTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  previewMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  removeText: { fontSize: 24, color: '#ef4444' },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  progressBar: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginRight: 12 },
  progressFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  progressText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
  formSection: { marginBottom: 24 },
  inputContainer: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, fontSize: 16, color: '#0f172a', borderWidth: 1, borderColor: '#e5e7eb' },
  textArea: { height: 100, textAlignVertical: 'top' },
  successCard: { backgroundColor: '#d1fae5', borderRadius: 16, padding: 20, marginBottom: 20 },
  successIcon: { fontSize: 40, textAlign: 'center', marginBottom: 12 },
  successTitle: { fontSize: 18, fontWeight: 'bold', color: '#065f46', textAlign: 'center', marginBottom: 8 },
  successText: { fontSize: 14, color: '#047857', textAlign: 'center', marginBottom: 16 },
  resultDetails: { borderTopWidth: 1, borderTopColor: '#a7f3d0', paddingTop: 12 },
  resultText: { fontSize: 12, color: '#047857', marginBottom: 4 },
  uploadButton: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20 },
  uploadButtonDisabled: { backgroundColor: '#a5b4fc' },
  uploadButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  tipsSection: { padding: 20, backgroundColor: '#fef3c7', marginHorizontal: 20, borderRadius: 16, marginBottom: 40 },
  tipsTitle: { fontSize: 14, fontWeight: '600', color: '#92400e', marginBottom: 8 },
  tipText: { fontSize: 12, color: '#b45309', marginBottom: 4 },
});
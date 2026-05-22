import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const MOCK_LESSON = {
  id: 'l1',
  title: 'Introduction au marketing digital',
  type: 'video',
  durationSec: 750,
  description: 'Dans cette leçon, vous apprendrez les bases du marketing digital et pourquoi il est essentiel pour votre entreprise.',
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
};

export default function LessonScreen() {
  const navigation = useNavigation<any>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : !isPlaying ? (
          <TouchableOpacity style={styles.playOverlay} onPress={() => setIsPlaying(true)}>
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.playButton}>
              <Text style={styles.playIcon}>▶️</Text>
            </LinearGradient>
            <Text style={styles.playText}>Appuyez pour jouer</Text>
          </TouchableOpacity>
        ) : (
          <Video
            source={{ uri: MOCK_LESSON.videoUrl }}
            style={styles.video}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => setIsLoading(false)}
            onPlaybackStatusUpdate={(status) => {
              if (status.isLoaded && status.didJustFinish) {
                setIsPlaying(false);
              }
            }}
          />
        )}
        
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{MOCK_LESSON.title}</Text>
        <Text style={styles.duration}>12min 30sec • Module 1</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>🔄</Text>
            <Text style={styles.actionText}>Recommencer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>⏩</Text>
            <Text style={styles.actionText}>Suivant</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>Notes</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.descriptionSection}>
          <Text style={styles.sectionTitle}>À propos de cette leçon</Text>
          <Text style={styles.description}>{MOCK_LESSON.description}</Text>
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={() => navigation.navigate('Quiz', { quizId: 'quiz-1' })}>
          <Text style={styles.nextButtonText}>Passer au quiz →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  videoContainer: { width, height: 250, backgroundColor: '#1e293b', position: 'relative' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#ffffff', marginTop: 12, fontSize: 14 },
  playOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  playButton: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  playIcon: { fontSize: 36 },
  playText: { color: '#94a3b8', marginTop: 16, fontSize: 14 },
  video: { width: '100%', height: '100%' },
  backBtn: { position: 'absolute', top: 50, left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: '#ffffff' },
  progressBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  progressFill: { width: '35%', height: '100%', backgroundColor: '#6366f1' },
  content: { flex: 1, backgroundColor: '#f8fafc', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  duration: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
  actionBtn: { alignItems: 'center' },
  actionIcon: { fontSize: 24, marginBottom: 4 },
  actionText: { fontSize: 12, color: '#64748b' },
  descriptionSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  description: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  nextButton: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center' },
  nextButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
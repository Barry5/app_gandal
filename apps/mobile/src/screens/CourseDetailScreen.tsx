import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { courseService, paymentService } from '../services/api';

const { width } = Dimensions.get('window');

type CourseDetail = {
  id: string;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  thumbnail_url: string;
  price_cfa: number;
  currency: string;
  status: string;
  difficulty: string;
  total_lessons: number;
  total_students: number;
  avg_rating: number;
  total_ratings: number;
  duration_hours: number;
  language: string;
  creator_name: string;
  creator_avatar: string | null;
  modules: Array<{
    id: string;
    title: string;
    lessons: Array<{
      id: string;
      title: string;
      type: string;
      duration_sec: number;
      is_free: boolean;
    }>;
  }>;
};

export default function CourseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { courseId } = route.params || {};
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (courseId) {
      loadCourse(courseId);
    }
  }, [courseId]);

  const loadCourse = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await courseService.getById(id);
      setCourse(data.course || data);
    } catch {
      setCourse(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Cours introuvable</Text>
      </View>
    );
  }

  const isFree = course.price_cfa <= 0;
  const totalDuration = (course.modules || []).reduce((acc, m) =>
    acc + (m.lessons || []).reduce((sum, l) => sum + (l.duration_sec || 0), 0), 0
  );
  const totalLessons = (course.modules || []).reduce((acc, m) => acc + (m.lessons || []).length, 0);

  const handleEnroll = async () => {
    try {
      if (isFree) {
        await courseService.enrollFree(course.id);
        navigation.navigate('CourseContent', { courseId: course.id });
      } else {
        const result = await paymentService.initiate({
          courseId: course.id,
          amount: course.price_cfa,
          paymentMethod: 'orange_money',
        });
        if (result.paymentUrl) {
          navigation.navigate('PaymentWebView', { url: result.paymentUrl, reference: result.reference });
        }
      }
    } catch {
      // Handle error
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.imageContainer}>
        <View style={styles.placeholderImage}>
          <Text style={styles.placeholderText}>{course.title?.[0] || 'C'}</Text>
        </View>
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.gradient}>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              {isFree ? 'Gratuit' : `${course.price_cfa.toLocaleString()} ${course.currency || 'GNF'}`}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.instructor}>Par {course.creator_name}</Text>

        {course.short_description ? (
          <Text style={styles.description}>{course.short_description}</Text>
        ) : null}
        {course.description ? (
          <Text style={styles.description}>{course.description}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalLessons}</Text>
            <Text style={styles.statLabel}>Leçons</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{course.duration_hours || Math.round(totalDuration / 3600)}h</Text>
            <Text style={styles.statLabel}>Durée</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>⭐ {course.avg_rating}</Text>
            <Text style={styles.statLabel}>{course.total_ratings || 0} avis</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.enrollButton} onPress={handleEnroll}>
          <Text style={styles.enrollButtonText}>
            {isFree ? 'Commencer gratuitement' : `S\'inscrire - ${course.price_cfa.toLocaleString()} GNF`}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Programme</Text>
        {(course.modules || []).map((module) => (
          <View key={module.id} style={styles.moduleCard}>
            <Text style={styles.moduleTitle}>{module.title}</Text>
            {(module.lessons || []).map((lesson) => (
              <View key={lesson.id} style={styles.lessonRow}>
                <Text style={styles.lessonIcon}>
                  {lesson.type === 'video' ? '▶' : lesson.type === 'quiz' ? '❓' : '📄'}
                </Text>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                {lesson.is_free && (
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>Gratuit</Text>
                  </View>
                )}
                <Text style={styles.lessonDuration}>
                  {lesson.duration_sec ? `${Math.round(lesson.duration_sec / 60)}min` : ''}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  errorText: { fontSize: 16, color: '#ef4444' },
  imageContainer: { height: 250, position: 'relative' },
  placeholderImage: { width: '100%', height: '100%', backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 80, fontWeight: 'bold', color: '#ffffff', opacity: 0.5 },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, justifyContent: 'flex-end', padding: 20 },
  priceBadge: { backgroundColor: '#6366f1', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  priceText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  instructor: { fontSize: 16, color: '#6366f1', marginBottom: 16 },
  description: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 20 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 20 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  enrollButton: { backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  enrollButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  moduleCard: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, marginBottom: 12 },
  moduleTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  lessonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  lessonIcon: { fontSize: 14, marginRight: 10 },
  lessonTitle: { flex: 1, fontSize: 14, color: '#334155' },
  freeBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
  freeBadgeText: { fontSize: 10, color: '#16a34a', fontWeight: '600' },
  lessonDuration: { fontSize: 12, color: '#94a3b8' },
});

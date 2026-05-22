import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store';
import { courseService } from '../services/api';
import type { Course, Enrollment } from '../types';

const { width } = Dimensions.get('window');

const MOCK_ENROLLED_COURSES: Enrollment[] = [
  {
    id: '1',
    userId: '1',
    courseId: '1',
    status: 'paid',
    amountPaid: 150000,
    progressPercent: 68,
    enrolledAt: '2024-01-15',
    course: {
      id: '1',
      title: 'Marketing Digital pour PME',
      slug: 'marketing-digital-pme',
      priceCfa: 150000,
      currency: 'GNF',
      status: 'published',
      difficulty: 'intermediate',
      totalLessons: 12,
      totalStudents: 45,
      avgRating: 4.8,
      creatorName: 'Mamadou Diallo',
      thumbnailUrl: 'https://picsum.photos/seed/course1/400/225',
    },
  },
  {
    id: '2',
    userId: '1',
    courseId: '2',
    status: 'paid',
    amountPaid: 200000,
    progressPercent: 35,
    enrolledAt: '2024-02-01',
    course: {
      id: '2',
      title: 'Initiation Python',
      slug: 'initiation-python',
      priceCfa: 200000,
      currency: 'GNF',
      status: 'published',
      difficulty: 'beginner',
      totalLessons: 15,
      totalStudents: 32,
      avgRating: 4.9,
      creatorName: 'Ibrahim Sow',
      thumbnailUrl: 'https://picsum.photos/seed/course2/400/225',
    },
  },
];

const MOCK_COURSES: Course[] = [
  {
    id: '3',
    title: 'Gestion Financière pour Artisans',
    slug: 'gestion-financiere',
    priceCfa: 80000,
    currency: 'GNF',
    status: 'published',
    difficulty: 'beginner',
    totalLessons: 8,
    totalStudents: 78,
    avgRating: 4.7,
    creatorName: 'Aminata Koné',
    thumbnailUrl: 'https://picsum.photos/seed/course3/400/225',
    shortDescription: 'Apprenez à gérer vos finances et augmenter vos revenus',
  },
  {
    id: '4',
    title: 'Réseaux Sociaux pour Débutants',
    slug: 'reseaux-sociaux-debutants',
    priceCfa: 0,
    currency: 'GNF',
    status: 'published',
    difficulty: 'beginner',
    totalLessons: 6,
    totalStudents: 156,
    avgRating: 4.6,
    creatorName: 'Sékou Touré',
    thumbnailUrl: 'https://picsum.photos/seed/course4/400/225',
    shortDescription: 'Maîtrisez Facebook, WhatsApp et Instagram pour votre business',
  },
  {
    id: '5',
    title: ' Entrepreneuriat en Afrique',
    slug: 'entrepreneuriat-afrique',
    priceCfa: 120000,
    currency: 'GNF',
    status: 'published',
    difficulty: 'intermediate',
    totalLessons: 10,
    totalStudents: 89,
    avgRating: 4.9,
    creatorName: 'Mariam Diallo',
    thumbnailUrl: 'https://picsum.photos/seed/course5/400/225',
    shortDescription: 'Construisez et faites grandir votre entreprise en Afrique',
  },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const enrolledCourses = MOCK_ENROLLED_COURSES;
  const continueLearning = enrolledCourses.find(e => e.progressPercent > 0 && e.progressPercent < 100);
  const featuredCourses = MOCK_COURSES;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Bonjour, {user?.name?.split(' ')[0] || 'Apprenant'} 👋</Text>
            <Text style={styles.subtitle}>Continuez votre apprentissage</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un cours..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
        }
      >
        {/* Continue Learning */}
        {continueLearning && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continuer</Text>
            <TouchableOpacity
              style={styles.continueCard}
              onPress={() => navigation.navigate('Lesson')}
            >
              <Image
                source={{ uri: continueLearning.course?.thumbnailUrl }}
                style={styles.continueImage}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.continueOverlay}
              >
                <View style={styles.continueContent}>
                  <Text style={styles.continueTitle} numberOfLines={1}>
                    {continueLearning.course?.title}
                  </Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${continueLearning.progressPercent}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{continueLearning.progressPercent}%</Text>
                  </View>
                  <View style={styles.continueButton}>
                    <Text style={styles.continueButtonText}>▶ Continuer</Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{enrolledCourses.length}</Text>
            <Text style={styles.statLabel}>Cours inscrits</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Leçons complétées</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>85%</Text>
            <Text style={styles.statLabel}>Taux de réussite</Text>
          </View>
        </View>

        {/* Featured Courses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cours populaires</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {featuredCourses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={styles.courseCard}
                onPress={() => navigation.navigate('CourseDetail', { courseId: course.id })}
              >
                <Image source={{ uri: course.thumbnailUrl }} style={styles.courseImage} />
                <View style={styles.courseContent}>
                  <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                  <Text style={styles.courseInstructor}>{course.creatorName}</Text>
                  <View style={styles.courseFooter}>
                    <View style={styles.ratingContainer}>
                      <Text style={styles.ratingIcon}>⭐</Text>
                      <Text style={styles.ratingText}>{course.avgRating}</Text>
                    </View>
                    <Text style={styles.coursePrice}>
                      {course.priceCfa === 0 ? 'Gratuit' : `${course.priceCfa.toLocaleString()} GNF`}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Catégories</Text>
          <View style={styles.categoriesGrid}>
            {[
              { icon: '💼', name: 'Business', count: 24 },
              { icon: '💻', name: 'Tech', count: 18 },
              { icon: '📱', name: 'Marketing', count: 32 },
              { icon: '🎨', name: 'Design', count: 15 },
              { icon: '🌍', name: 'Langues', count: 21 },
              { icon: '🌱', name: 'Agriculture', count: 12 },
            ].map((category, index) => (
              <TouchableOpacity key={index} style={styles.categoryItem}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>{category.count} cours</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    fontSize: 22,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0f172a',
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '600',
  },
  continueCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  continueOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  continueContent: {},
  continueTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  continueButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  continueButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  courseCard: {
    width: 200,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  courseImage: {
    width: '100%',
    height: 120,
  },
  courseContent: {
    padding: 12,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  courseInstructor: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  coursePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  categoryItem: {
    width: '31%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: '1%',
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },
  categoryCount: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  bottomSpacer: {
    height: 120,
  },
});

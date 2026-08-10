import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { courseService } from '../services/api';
import type { Course } from '../types';

const CATEGORIES = ['Tous', 'Business', 'Tech', 'Marketing', 'Design', 'Langues', 'Agriculture'];
const SORT_OPTIONS = ['Populaires', 'Récent', 'Prix croissant', 'Prix décroissant'];

type CatalogCourse = {
  id: string;
  title: string;
  slug: string;
  price_cfa: number;
  currency: string;
  difficulty: string;
  total_lessons: number;
  total_students: number;
  avg_rating: number;
  creator_name: string;
  thumbnail_url?: string;
  category?: string;
  is_free: boolean;
};

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const [courses, setCourses] = useState<CatalogCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setIsLoading(true);
      const data = await courseService.getCatalog();
      setCourses(data.courses || []);
    } catch {
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Tous' || (course.category || '').toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  const mapToCourse = (item: CatalogCourse): Course => ({
    id: item.id,
    title: item.title,
    slug: item.slug,
    priceCfa: item.price_cfa,
    currency: item.currency || 'GNF',
    status: 'published',
    difficulty: item.difficulty as Course['difficulty'],
    totalLessons: item.total_lessons || 0,
    totalStudents: item.total_students || 0,
    avgRating: item.avg_rating || 0,
    creatorName: item.creator_name || '',
    thumbnailUrl: item.thumbnail_url,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explorer</Text>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterButton, selectedCategory === cat && styles.filterButtonActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.filterText, selectedCategory === cat && styles.filterTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          numColumns={2}
          contentContainerStyle={styles.courseGrid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.courseCard}
              onPress={() => navigation.navigate('CourseDetail', { courseId: item.id })}
            >
              <View style={styles.courseImageContainer}>
                <View style={styles.courseImage} />
                <View style={styles.priceTag}>
                  <Text style={styles.priceText}>
                    {item.price_cfa === 0 ? 'Gratuit' : `${item.price_cfa.toLocaleString()} GNF`}
                  </Text>
                </View>
              </View>
              <View style={styles.courseInfo}>
                <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.courseInstructor}>{item.creator_name}</Text>
                <View style={styles.courseMeta}>
                  <Text style={styles.metaText}>⭐ {item.avg_rating}</Text>
                  <Text style={styles.metaText}>{item.total_lessons} leçons</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  searchIcon: { fontSize: 20, marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, color: '#0f172a' },
  filters: { paddingVertical: 12, paddingHorizontal: 20 },
  filterButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#ffffff', marginRight: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  filterButtonActive: { backgroundColor: '#6366f1' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#ffffff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  courseGrid: { paddingHorizontal: 12, paddingTop: 8 },
  courseCard: { flex: 1, margin: 6, backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  courseImageContainer: { height: 120, backgroundColor: '#e5e7eb', position: 'relative' },
  courseImage: { width: '100%', height: '100%', backgroundColor: '#c7d2fe' },
  priceTag: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#6366f1', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  priceText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  courseInfo: { padding: 12 },
  courseTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  courseInstructor: { fontSize: 12, color: '#64748b', marginBottom: 8 },
  courseMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaText: { fontSize: 11, color: '#94a3b8' },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Course } from '../types';

const MOCK_COURSES: Course[] = [
  { id: '1', title: 'Marketing Digital', slug: 'marketing', priceCfa: 150000, currency: 'GNF', status: 'published', difficulty: 'intermediate', totalLessons: 12, totalStudents: 45, avgRating: 4.8, creatorName: 'Mamadou Diallo', thumbnailUrl: 'https://picsum.photos/seed/c1/400/225' },
  { id: '2', title: 'Python Avancé', slug: 'python', priceCfa: 200000, currency: 'GNF', status: 'published', difficulty: 'advanced', totalLessons: 20, totalStudents: 32, avgRating: 4.9, creatorName: 'Ibrahim Sow', thumbnailUrl: 'https://picsum.photos/seed/c2/400/225' },
  { id: '3', title: 'Entrepreneuriat', slug: 'entrepreneuriat', priceCfa: 80000, currency: 'GNF', status: 'published', difficulty: 'beginner', totalLessons: 8, totalStudents: 78, avgRating: 4.7, creatorName: 'Aminata Koné', thumbnailUrl: 'https://picsum.photos/seed/c3/400/225' },
  { id: '4', title: 'Réseaux Sociaux', slug: 'social', priceCfa: 0, currency: 'GNF', status: 'published', difficulty: 'beginner', totalLessons: 6, totalStudents: 156, avgRating: 4.6, creatorName: 'Sékou Touré', thumbnailUrl: 'https://picsum.photos/seed/c4/400/225' },
];

const CATEGORIES = ['Tous', 'Business', 'Tech', 'Marketing', 'Design', 'Langues', 'Agriculture'];
const SORT_OPTIONS = ['Populaires', 'Récent', 'Prix croissant', 'Prix décroissant'];

export default function ExploreScreen() {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('Tous');

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

      <FlatList
        data={MOCK_COURSES}
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
                  {item.priceCfa === 0 ? 'Gratuit' : `${item.priceCfa.toLocaleString()} GNF`}
                </Text>
              </View>
            </View>
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.courseInstructor}>{item.creatorName}</Text>
              <View style={styles.courseMeta}>
                <Text style={styles.metaText}>⭐ {item.avgRating}</Text>
                <Text style={styles.metaText}>{item.totalLessons} leçons</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={<View style={{ height: 120 }} />}
      />
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
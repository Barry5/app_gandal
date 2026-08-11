import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';

const MOCK_CREATOR_DATA = {
  totalEarnings: 0,
  totalStudents: 0,
  totalCourses: 0,
  completionRate: 0,
  recentCourses: [] as {
    id: string;
    title: string;
    students: number;
    revenue: number;
    thumbnail: string;
  }[],
  recentStudents: [],
};

export default function CreatorDashboardScreen() {
  const navigation = useNavigation<any>();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
        <Text style={styles.greeting}>Bonjour, Créateur 👋</Text>
        <Text style={styles.subtitle}>Voici vos statistiques</Text>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{MOCK_CREATOR_DATA.totalEarnings.toLocaleString('fr-FR')}</Text>
          <Text style={styles.statLabel}>GNF revenus</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{MOCK_CREATOR_DATA.totalStudents}</Text>
          <Text style={styles.statLabel}>Élèves</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{MOCK_CREATOR_DATA.totalCourses}</Text>
          <Text style={styles.statLabel}>Cours</Text>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CourseBuilder')}>
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionText}>Nouveau cours</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>Analytics</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Messages</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cours récents</Text>
        {MOCK_CREATOR_DATA.recentCourses.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Aucun cours pour le moment</Text>
          </View>
        )}
        {MOCK_CREATOR_DATA.recentCourses.map((course) => (
          <TouchableOpacity key={course.id} style={styles.courseCard}>
            <View style={styles.courseThumbnail} />
            <View style={styles.courseInfo}>
              <Text style={styles.courseTitle}>{course.title}</Text>
              <Text style={styles.courseMeta}>{course.students} élèves</Text>
            </View>
            <Text style={styles.courseRevenue}>{(course.revenue / 100000).toFixed(0)}K GNF</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statsContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: -40, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#6366f1' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 24, marginBottom: 24, gap: 12 },
  actionButton: { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#0f172a' },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  courseCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  courseThumbnail: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#e0e7ff' },
  courseInfo: { flex: 1, marginLeft: 12 },
  courseTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  courseMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  courseRevenue: { fontSize: 14, fontWeight: 'bold', color: '#059669' },
  emptyState: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#64748b' },
  bottomSpacer: { height: 100 },
});
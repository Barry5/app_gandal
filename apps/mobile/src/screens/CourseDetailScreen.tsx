import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { paymentService } from '../services/api';

const { width } = Dimensions.get('window');

const MOCK_COURSE = {
  id: '1',
  title: 'Marketing Digital pour PME',
  slug: 'marketing-digital',
  description: 'Apprenez à utiliser le marketing digital pour développer votre entreprise. Ce cours couvre Facebook Ads, Google Ads, le SEO, et les stratégies de contenu.',
  shortDescription: 'Devenez un expert du marketing digital',
  thumbnailUrl: 'https://picsum.photos/seed/marketing/800/450',
  priceCfa: 150000,
  currency: 'GNF',
  status: 'published',
  difficulty: 'intermediate',
  totalLessons: 12,
  totalStudents: 45,
  avgRating: 4.8,
  totalRatings: 128,
  durationHours: 8.5,
  language: 'fr',
  creatorName: 'Mamadou Diallo',
  creatorAvatar: null,
  creatorBio: 'Expert en marketing digital avec 10 ans d\'expérience',
  modules: [
    {
      id: '1', title: 'Module 1: Les bases', orderIndex: 1, isFree: true,
      lessons: [
        { id: 'l1', title: 'Introduction au marketing digital', type: 'video', durationSec: 750, isFree: true, orderIndex: 1 },
        { id: 'l2', title: 'Comprendre votre audience', type: 'video', durationSec: 1125, isFree: true, orderIndex: 2 },
      ],
    },
    {
      id: '2', title: 'Module 2: Stratégies de contenu', orderIndex: 2, isFree: false,
      lessons: [
        { id: 'l3', title: 'Créer du contenu engageant', type: 'video', durationSec: 1335, isFree: false, orderIndex: 1 },
        { id: 'l4', title: 'Calendrier éditorial', type: 'video', durationSec: 930, isFree: false, orderIndex: 2 },
        { id: 'l5', title: 'Quiz Module 2', type: 'quiz', durationSec: 600, isFree: false, orderIndex: 3 },
      ],
    },
    {
      id: '3', title: 'Module 3: Réseaux sociaux', orderIndex: 3, isFree: false,
      lessons: [
        { id: 'l6', title: 'Facebook Marketing', type: 'video', durationSec: 1500, isFree: false, orderIndex: 1 },
        { id: 'l7', title: 'WhatsApp Business', type: 'video', durationSec: 1230, isFree: false, orderIndex: 2 },
      ],
    },
  ],
};

export default function CourseDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const [expandedModule, setExpandedModule] = React.useState<string | null>('1');

  const formatDuration = (seconds: number) => `${Math.floor(seconds / 60)}min`;
  const totalDuration = MOCK_COURSE.modules.reduce((sum, m) => sum + m.lessons.reduce((s, l) => s + l.durationSec, 0), 0);

  const handleEnroll = async () => {
    try {
      const response = await paymentService.initiate({
        courseId: MOCK_COURSE.id,
        amount: MOCK_COURSE.priceCfa,
        paymentMethod: 'mtn_momo',
      });
      console.log('Payment initiated:', response);
    } catch (error) {
      console.log('Payment error');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Image source={{ uri: MOCK_COURSE.thumbnailUrl }} style={styles.headerImage} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.headerOverlay}>
            <Text style={styles.priceTag}>
              {MOCK_COURSE.priceCfa === 0 ? 'GRATUIT' : `${MOCK_COURSE.priceCfa.toLocaleString()} GNF`}
            </Text>
          </LinearGradient>
        </LinearGradient>

        <View style={styles.content}>
          <Text style={styles.title}>{MOCK_COURSE.title}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⭐</Text>
              <Text style={styles.metaValue}>{MOCK_COURSE.avgRating}</Text>
              <Text style={styles.metaLabel}>({MOCK_COURSE.totalRatings})</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>👥</Text>
              <Text style={styles.metaValue}>{MOCK_COURSE.totalStudents}</Text>
              <Text style={styles.metaLabel}>élèves</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>🎬</Text>
              <Text style={styles.metaValue}>{MOCK_COURSE.totalLessons}</Text>
              <Text style={styles.metaLabel}>leçons</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>⏱️</Text>
              <Text style={styles.metaValue}>{Math.floor(totalDuration / 3600)}h</Text>
              <Text style={styles.metaLabel}>durée</Text>
            </View>
          </View>

          <View style={styles.difficultyBadge}>
            <Text style={styles.difficultyText}>{MOCK_COURSE.difficulty}</Text>
          </View>

          <View style={styles.creatorSection}>
            <View style={styles.creatorAvatar}>
              <Text style={styles.creatorInitials}>{MOCK_COURSE.creatorName.split(' ').map(n => n[0]).join('')}</Text>
            </View>
            <View style={styles.creatorInfo}>
              <Text style={styles.creatorName}>{MOCK_COURSE.creatorName}</Text>
              <Text style={styles.creatorBio}>{MOCK_COURSE.creatorBio}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{MOCK_COURSE.description}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Programme ({MOCK_COURSE.modules.length} modules)</Text>
            {MOCK_COURSE.modules.map((module) => (
              <View key={module.id} style={styles.moduleCard}>
                <TouchableOpacity
                  style={styles.moduleHeader}
                  onPress={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
                >
                  <View style={styles.moduleNumber}>
                    <Text style={styles.moduleNumberText}>{module.orderIndex}</Text>
                  </View>
                  <View style={styles.moduleInfo}>
                    <Text style={styles.moduleTitle}>{module.title}</Text>
                    <Text style={styles.moduleMeta}>{module.lessons.length} leçons</Text>
                  </View>
                  <Text style={styles.expandIcon}>{expandedModule === module.id ? '−' : '+'}</Text>
                </TouchableOpacity>

                {expandedModule === module.id && (
                  <View style={styles.lessonsList}>
                    {module.lessons.map((lesson) => (
                      <TouchableOpacity
                        key={lesson.id}
                        style={styles.lessonItem}
                        onPress={() => lesson.isFree ? navigation.navigate('Lesson', { lessonId: lesson.id }) : null}
                      >
                        <View style={[styles.lessonIcon, { backgroundColor: lesson.isFree ? '#e0e7ff' : '#f1f5f9' }]}>
                          <Text style={styles.lessonIconText}>{lesson.type === 'video' ? '▶️' : lesson.type === 'quiz' ? '❓' : '📄'}</Text>
                        </View>
                        <View style={styles.lessonInfo}>
                          <Text style={styles.lessonTitle}>{lesson.title}</Text>
                          <Text style={styles.lessonMeta}>{formatDuration(lesson.durationSec)}</Text>
                        </View>
                        {lesson.isFree && <Text style={styles.freeTag}>GRATUIT</Text>}
                        {!lesson.isFree && <Text style={styles.lockIcon}>🔒</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.priceContainer}>
          <Text style={styles.footerPrice}>
            {MOCK_COURSE.priceCfa === 0 ? 'Gratuit' : `${MOCK_COURSE.priceCfa.toLocaleString()} GNF`}
          </Text>
          {MOCK_COURSE.priceCfa > 0 && (
            <View style={styles.paymentMethods}>
              <Text style={styles.paymentText}>Paiements: Orange Money | MTN MoMo</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.enrollButton} onPress={handleEnroll}>
          <Text style={styles.enrollButtonText}>
            {MOCK_COURSE.priceCfa === 0 ? "S'inscrire gratuitement" : 'S\'inscrire'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { height: 280, position: 'relative' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, color: '#ffffff' },
  headerImage: { width: '100%', height: '100%', position: 'absolute' },
  headerOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', justifyContent: 'flex-end', padding: 20 },
  priceTag: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', backgroundColor: '#6366f1', alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  content: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metaItem: { alignItems: 'center' },
  metaIcon: { fontSize: 20, marginBottom: 4 },
  metaValue: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  metaLabel: { fontSize: 12, color: '#64748b' },
  difficultyBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 20 },
  difficultyText: { color: '#d97706', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  creatorSection: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  creatorAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
  creatorInitials: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
  creatorInfo: { marginLeft: 12 },
  creatorName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  creatorBio: { fontSize: 12, color: '#64748b', marginTop: 2 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  description: { fontSize: 14, color: '#64748b', lineHeight: 22 },
  moduleCard: { backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  moduleNumber: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  moduleNumberText: { color: '#6366f1', fontWeight: 'bold' },
  moduleInfo: { flex: 1, marginLeft: 12 },
  moduleTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  moduleMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  expandIcon: { fontSize: 24, color: '#6366f1', fontWeight: '300' },
  lessonsList: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  lessonItem: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingLeft: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  lessonIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lessonIconText: { fontSize: 16 },
  lessonInfo: { flex: 1, marginLeft: 12 },
  lessonTitle: { fontSize: 14, color: '#0f172a' },
  lessonMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  freeTag: { fontSize: 10, fontWeight: '600', color: '#059669', backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  lockIcon: { fontSize: 14 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  priceContainer: {},
  footerPrice: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  paymentMethods: { marginTop: 4 },
  paymentText: { fontSize: 10, color: '#94a3b8' },
  enrollButton: { backgroundColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  enrollButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
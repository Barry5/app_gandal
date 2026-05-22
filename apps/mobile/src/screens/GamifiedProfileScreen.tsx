import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '../store';
import gamificationService, { UserProgress, Badge, Challenge, LeaderboardEntry } from '../services/gamificationService';

const LEVEL_ICONS: Record<string, string> = {
  'Débutant': '🌱',
  'Apprenti': '🌿',
  'Novice': '📗',
  'Initié': '📘',
  'Apprenant': '📙',
  'Compétent': '📕',
  'Intermédiaire': '📓',
  'Avancé': '📒',
  'Confirmé': '📔',
  'Expert': '🎓',
  'Maître': '🏆',
  'Grand Maître': '👑',
  'Légende': '⭐',
};

const BADGE_ICONS: Record<string, string> = {
  first_lesson: '🎯',
  first_course: '🎓',
  streak_7_days: '🔥',
  streak_30_days: '⭐',
  quiz_master: '🧠',
  quiz_champion: '🏆',
  social_butterfly: '💬',
  course_collector: '📚',
  speed_learner: '⚡',
  early_bird: '🌅',
  night_owl: '🌙',
  week_warrior: '⚔️',
  completionist: '💎',
  top_10_percent: '👑',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8',
  rare: '#3b82f6',
  epic: '#8b5cf6',
  legendary: '#f59e0b',
};

export default function GamifiedProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();

  const [profile, setProfile] = useState<UserProgress | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number>(0);
  const [streak, setStreak] = useState({ currentStreak: 0, longestStreak: 0, loggedInToday: false });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'challenges' | 'leaderboard'>('overview');
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profileData, badges, challengesData, leaderboardData, rankData, streakData] = await Promise.all([
        gamificationService.getProfile().catch(() => null),
        gamificationService.getAllBadges().catch(() => []),
        gamificationService.getChallenges().catch(() => []),
        gamificationService.getLeaderboard().catch(() => []),
        gamificationService.getMyRank().catch(() => ({ myRank: 0 })),
        gamificationService.getStreak().catch(() => ({ currentStreak: 0, longestStreak: 0, loggedInToday: false })),
      ]);

      if (profileData) {
        setProfile(profileData.progress);
        setEarnedBadges(profileData.badges.filter((b: Badge) => b.earnedAt));
      }
      setAllBadges(badges);
      setChallenges(challengesData);
      setLeaderboard(leaderboardData);
      setMyRank(rankData.myRank || 0);
      setStreak(streakData);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDailyLogin = async () => {
    try {
      const result = await gamificationService.recordDailyLogin();
      if (result.xpEarned > 0) {
        await loadData();
      }
    } catch (error) {
      console.error('Error recording daily login:', error);
    }
  };

  const levelIcon = profile?.levelInfo?.title ? LEVEL_ICONS[profile.levelInfo.title] || '🎖️' : '🎖️';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#8b5cf6', '#a855f7']} style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
            </Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{profile?.currentLevel || 1}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{user?.name || 'Apprenant'}</Text>
        <View style={styles.levelInfo}>
          <Text style={styles.levelIcon}>{levelIcon}</Text>
          <Text style={styles.levelTitle}>Niveau {profile?.currentLevel || 1} - {profile?.levelInfo?.title || 'Débutant'}</Text>
        </View>

        {/* XP Progress Bar */}
        <View style={styles.xpContainer}>
          <View style={styles.xpInfo}>
            <Text style={styles.xpText}>{profile?.totalXp?.toLocaleString() || 0} XP</Text>
            <Text style={styles.xpNext}>
              {profile?.nextLevel ? `${profile.nextLevel.minXp.toLocaleString()} XP pour niveau ${profile.nextLevel.level}` : 'Niveau maximum'}
            </Text>
          </View>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${profile?.progressPercent || 0}%` }]} />
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{streak.currentStreak}</Text>
            <Text style={styles.statLabel}>🔥 Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnedBadges.length}</Text>
            <Text style={styles.statLabel}>🏅 Badges</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>#{myRank || '?'}</Text>
            <Text style={styles.statLabel}>📊 Rang</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'badges', 'challenges', 'leaderboard'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? '📋' : tab === 'badges' ? '🏅' : tab === 'challenges' ? '🎯' : '🏆'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}>
        {activeTab === 'overview' && (
          <View style={styles.overviewContent}>
            {/* Daily Login */}
            {!streak.loggedInToday && (
              <TouchableOpacity style={styles.dailyBonusCard} onPress={handleDailyLogin}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.dailyBonusInner}>
                  <Text style={styles.dailyBonusIcon}>🎁</Text>
                  <View style={styles.dailyBonusText}>
                    <Text style={styles.dailyBonusTitle}>Bonus quotidien !</Text>
                    <Text style={styles.dailyBonusSub}>+10 XP pour connexion</Text>
                  </View>
                  <Text style={styles.dailyBonusCta}>Récupérer →</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Recent Badges */}
            {earnedBadges.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🏅 Derniers badges</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {earnedBadges.slice(0, 5).map((badge, index) => (
                    <View key={index} style={[styles.badgeMiniCard, { borderColor: RARITY_COLORS[badge.rarity] || '#94a3b8' }]}>
                      <Text style={styles.badgeMiniIcon}>{BADGE_ICONS[badge.type] || '🏅'}</Text>
                      <Text style={styles.badgeMiniName}>{badge.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Active Challenges */}
            {challenges.filter(c => c.userStatus === 'active').length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎯 Défis actifs</Text>
                {challenges.filter(c => c.userStatus === 'active').slice(0, 3).map((challenge) => (
                  <View key={challenge.id} style={styles.challengeCard}>
                    <Text style={styles.challengeIcon}>{challenge.icon}</Text>
                    <View style={styles.challengeInfo}>
                      <Text style={styles.challengeTitle}>{challenge.title}</Text>
                      <View style={styles.challengeProgress}>
                        <View style={styles.challengeBar}>
                          <View style={[styles.challengeFill, { width: `${challenge.progress}%` }]} />
                        </View>
                        <Text style={styles.challengePercent}>{challenge.progress}%</Text>
                      </View>
                    </View>
                    <Text style={styles.challengeReward}>+{challenge.xpReward} XP</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Statistiques</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{profile?.lessonsCompleted || 0}</Text>
                  <Text style={styles.statsLabel}>Leçons complétées</Text>
                </View>
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{profile?.coursesCompleted || 0}</Text>
                  <Text style={styles.statsLabel}>Cours terminés</Text>
                </View>
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{profile?.quizzesPassed || 0}</Text>
                  <Text style={styles.statsLabel}>Quiz réussis</Text>
                </View>
                <View style={styles.statsCard}>
                  <Text style={styles.statsValue}>{streak.longestStreak}</Text>
                  <Text style={styles.statsLabel}>Meilleur streak</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'badges' && (
          <View style={styles.badgesContent}>
            <View style={styles.badgesSection}>
              <Text style={styles.badgeSectionTitle}>🎖️ Badges gagnés ({earnedBadges.length})</Text>
              {earnedBadges.length === 0 ? (
                <Text style={styles.emptyText}>Aucun badge pour le moment. Continuez votre apprentissage !</Text>
              ) : (
                <View style={styles.badgesGrid}>
                  {earnedBadges.map((badge, index) => (
                    <View key={index} style={[styles.badgeCard, { borderColor: RARITY_COLORS[badge.rarity] || '#94a3b8' }]}>
                      <Text style={styles.badgeIcon}>{BADGE_ICONS[badge.type] || '🏅'}</Text>
                      <Text style={styles.badgeName}>{badge.name}</Text>
                      <Text style={styles.badgeRarity}>{badge.rarity}</Text>
                      <Text style={styles.badgeReward}>+{badge.xpReward} XP</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.badgesSection}>
              <Text style={styles.badgeSectionTitle}>🔒 Badges à débloquer</Text>
              <View style={styles.badgesGrid}>
                {allBadges
                  .filter(b => !earnedBadges.find(e => e.type === b.type))
                  .map((badge, index) => (
                    <View key={index} style={[styles.badgeCard, styles.badgeLocked]}>
                      <Text style={styles.badgeIconLocked}>🔒</Text>
                      <Text style={styles.badgeNameLocked}>{badge.name}</Text>
                      <Text style={styles.badgeDesc}>{badge.description}</Text>
                    </View>
                  ))}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'challenges' && (
          <View style={styles.challengesContent}>
            <Text style={styles.sectionTitle}>🎯 Défis disponibles</Text>
            {challenges.length === 0 ? (
              <Text style={styles.emptyText}>Aucun défi disponible pour le moment.</Text>
            ) : (
              challenges.map((challenge) => (
                <View key={challenge.id} style={styles.challengeFullCard}>
                  <View style={styles.challengeHeader}>
                    <Text style={styles.challengeHeaderIcon}>{challenge.icon}</Text>
                    <View style={styles.challengeHeaderInfo}>
                      <Text style={styles.challengeHeaderTitle}>{challenge.title}</Text>
                      <Text style={styles.challengeHeaderDesc}>{challenge.description}</Text>
                    </View>
                    <View style={[styles.challengeStatus, challenge.userStatus === 'completed' && styles.challengeStatusDone]}>
                      <Text style={styles.challengeStatusText}>
                        {challenge.userStatus === 'completed' ? '✓' : `${challenge.progress}%`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.challengeProgressFull}>
                    <View style={styles.challengeBarFull}>
                      <View style={[styles.challengeFillFull, { width: `${challenge.progress}%` }]} />
                    </View>
                    <Text style={styles.challengeProgressText}>
                      {challenge.userProgress || 0} / {challenge.target}
                    </Text>
                  </View>
                  <View style={styles.challengeFooter}>
                    <View style={styles.challengeRewardBadge}>
                      <Text style={styles.challengeRewardText}>+{challenge.xpReward} XP</Text>
                    </View>
                    <Text style={styles.challengeType}>{challenge.type === 'daily' ? 'Quotidien' : 'Hebdomadaire'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'leaderboard' && (
          <View style={styles.leaderboardContent}>
            <Text style={styles.sectionTitle}>🏆 Classement</Text>

            {/* My Rank */}
            <View style={styles.myRankCard}>
              <Text style={styles.myRankLabel}>Votre position</Text>
              <View style={styles.myRankInfo}>
                <Text style={styles.myRankNumber}>#{myRank}</Text>
                <Text style={styles.myRankXp}>{profile?.totalXp?.toLocaleString() || 0} XP</Text>
              </View>
            </View>

            {/* Top 10 */}
            {leaderboard.map((entry, index) => (
              <View key={index} style={[styles.leaderboardItem, index < 3 && styles.leaderboardTop]}>
                <View style={styles.leaderboardRank}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </View>
                <View style={styles.leaderboardAvatar}>
                  <Text style={styles.leaderboardAvatarText}>
                    {entry.user?.name?.split(' ').map(n => n[0]).join('') || '?'}
                  </Text>
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>{entry.user?.name || 'Anonyme'}</Text>
                  <Text style={styles.leaderboardXp}>{entry.totalXp.toLocaleString()} XP</Text>
                </View>
                {myRank === index + 1 && <Text style={styles.youBadge}>Vous</Text>}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Level Up Modal */}
      <Modal visible={showLevelUp} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.levelUpModal}>
            <Text style={styles.levelUpEmoji}>🎉</Text>
            <Text style={styles.levelUpTitle}>Level Up!</Text>
            <Text style={styles.levelUpText}>Félicitations ! Vous avez atteint le niveau {profile?.currentLevel} !</Text>
            <TouchableOpacity style={styles.levelUpButton} onPress={() => setShowLevelUp(false)}>
              <Text style={styles.levelUpButtonText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* New Badge Modal */}
      <Modal visible={!!newBadge} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.badgeEarnedModal}>
            <Text style={styles.badgeEarnedEmoji}>{newBadge && BADGE_ICONS[newBadge.type]}</Text>
            <Text style={styles.badgeEarnedTitle}>Nouveau badge!</Text>
            <Text style={styles.badgeEarnedName}>{newBadge?.name}</Text>
            <Text style={styles.badgeEarnedDesc}>{newBadge?.description}</Text>
            <Text style={styles.badgeEarnedXp}>+{newBadge?.xpReward} XP</Text>
            <TouchableOpacity style={styles.badgeEarnedButton} onPress={() => setNewBadge(null)}>
              <Text style={styles.badgeEarnedButtonText}>Super!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  avatarContainer: { position: 'relative' },
  avatarText: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 80, fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  levelBadge: { position: 'absolute', bottom: -4, right: -4, width: 32, height: 32, borderRadius: 16, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#ffffff' },
  levelNumber: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
  settingsButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 20 },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  levelInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  levelIcon: { fontSize: 20, marginRight: 8 },
  levelTitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  xpContainer: { marginBottom: 20 },
  xpInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  xpText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  xpNext: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  xpBar: { height: 12, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 6 },
  xpFill: { height: '100%', backgroundColor: '#f59e0b', borderRadius: 6 },
  quickStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, padding: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 12 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: -20, backgroundColor: '#ffffff', borderRadius: 16, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: '#6366f1' },
  tabText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  tabTextActive: { color: '#ffffff' },
  content: { flex: 1, padding: 20 },
  overviewContent: {},
  dailyBonusCard: { marginBottom: 20 },
  dailyBonusInner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  dailyBonusIcon: { fontSize: 32, marginRight: 16 },
  dailyBonusText: { flex: 1 },
  dailyBonusTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  dailyBonusSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  dailyBonusCta: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  badgeMiniCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginRight: 12, alignItems: 'center', borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  badgeMiniIcon: { fontSize: 28, marginBottom: 4 },
  badgeMiniName: { fontSize: 10, fontWeight: '600', color: '#0f172a', textAlign: 'center' },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  challengeIcon: { fontSize: 24, marginRight: 12 },
  challengeInfo: { flex: 1 },
  challengeTitle: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  challengeProgress: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  challengeBar: { flex: 1, height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, marginRight: 8 },
  challengeFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 3 },
  challengePercent: { fontSize: 10, fontWeight: '600', color: '#6366f1' },
  challengeReward: { fontSize: 12, fontWeight: '600', color: '#f59e0b' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  statsCard: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },
  statsValue: { fontSize: 28, fontWeight: 'bold', color: '#6366f1', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statsLabel: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 8 },
  badgesContent: {},
  badgesSection: { marginBottom: 24 },
  badgeSectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center', padding: 40 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 },
  badgeCard: { width: '30%', backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginHorizontal: '1%', marginBottom: 12, alignItems: 'center', borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  badgeIcon: { fontSize: 32, marginBottom: 4 },
  badgeName: { fontSize: 10, fontWeight: '600', color: '#0f172a', textAlign: 'center' },
  badgeRarity: { fontSize: 8, color: '#94a3b8', marginTop: 2, textTransform: 'uppercase' },
  badgeReward: { fontSize: 10, fontWeight: '600', color: '#f59e0b', marginTop: 4 },
  badgeLocked: { opacity: 0.5 },
  badgeIconLocked: { fontSize: 28, marginBottom: 4, opacity: 0.5 },
  badgeNameLocked: { fontSize: 10, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  badgeDesc: { fontSize: 8, color: '#94a3b8', textAlign: 'center', marginTop: 2 },
  challengesContent: {},
  challengeFullCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  challengeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  challengeHeaderIcon: { fontSize: 32, marginRight: 12 },
  challengeHeaderInfo: { flex: 1 },
  challengeHeaderTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  challengeHeaderDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },
  challengeStatus: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center' },
  challengeStatusDone: { backgroundColor: '#10b981' },
  challengeStatusText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
  challengeProgressFull: { marginBottom: 12 },
  challengeBarFull: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 4 },
  challengeFillFull: { height: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  challengeProgressText: { fontSize: 12, color: '#64748b', textAlign: 'right' },
  challengeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeRewardBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  challengeRewardText: { fontSize: 12, fontWeight: '600', color: '#d97706' },
  challengeType: { fontSize: 12, color: '#94a3b8' },
  leaderboardContent: {},
  myRankCard: { backgroundColor: '#6366f1', borderRadius: 16, padding: 16, marginBottom: 20, alignItems: 'center' },
  myRankLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  myRankInfo: { flexDirection: 'row', alignItems: 'baseline' },
  myRankNumber: { fontSize: 36, fontWeight: 'bold', color: '#ffffff' },
  myRankXp: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginLeft: 12 },
  leaderboardItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  leaderboardTop: { backgroundColor: '#fef3c7', borderWidth: 2, borderColor: '#f59e0b' },
  leaderboardRank: { width: 40, fontSize: 18, textAlign: 'center', fontWeight: 'bold' },
  leaderboardAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  leaderboardAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#ffffff' },
  leaderboardInfo: { flex: 1 },
  leaderboardName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  leaderboardXp: { fontSize: 12, color: '#64748b', marginTop: 2 },
  youBadge: { fontSize: 10, fontWeight: '600', color: '#6366f1', backgroundColor: '#e0e7ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  levelUpModal: { backgroundColor: '#ffffff', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%' },
  levelUpEmoji: { fontSize: 64, marginBottom: 16 },
  levelUpTitle: { fontSize: 28, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  levelUpText: { fontSize: 16, color: '#64748b', textAlign: 'center', marginBottom: 24 },
  levelUpButton: { backgroundColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  levelUpButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  badgeEarnedModal: { backgroundColor: '#ffffff', borderRadius: 24, padding: 32, alignItems: 'center', width: '100%' },
  badgeEarnedEmoji: { fontSize: 80, marginBottom: 16 },
  badgeEarnedTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  badgeEarnedName: { fontSize: 24, fontWeight: 'bold', color: '#6366f1', marginBottom: 8 },
  badgeEarnedDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 16 },
  badgeEarnedXp: { fontSize: 18, fontWeight: '600', color: '#f59e0b', marginBottom: 24 },
  badgeEarnedButton: { backgroundColor: '#6366f1', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  badgeEarnedButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
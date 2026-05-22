import api from './api';

export interface UserProgress {
  totalXp: number;
  currentLevel: number;
  streakDays: number;
  longestStreak: number;
  lessonsCompleted: number;
  coursesCompleted: number;
  quizzesPassed: number;
  levelInfo: {
    level: number;
    minXp: number;
    maxXp: number;
    title: string;
  };
  nextLevel?: {
    level: number;
    minXp: number;
    maxXp?: number;
    title?: string;
  };
  xpToNextLevel: number;
  xpInCurrentLevel: number;
  xpNeededForLevel: number;
  progressPercent: number;
}

export interface Badge {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xpReward: number;
  rarity: string;
  earnedAt?: string;
  progress?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  target: number;
  type: string;
  progress: number;
  userProgress: number;
  userStatus: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  totalXp: number;
  weeklyXp: number;
}

export interface XpGainResult {
  success: boolean;
  xpGained: number;
  newTotalXp: number;
  newLevel: number;
  leveledUp: boolean;
  levelInfo?: {
    level: number;
    title: string;
  };
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  loggedInToday: boolean;
  loggedInYesterday: boolean;
  streakAtRisk: boolean;
}

class GamificationService {
  async getProfile(): Promise<{ progress: UserProgress; badges: Badge[] }> {
    const response = await api.get('/gamification/profile');
    return response.data;
  }

  async addXp(type: string, source: string, sourceId?: string, description?: string): Promise<XpGainResult> {
    const response = await api.post('/gamification/xp/add', {
      type,
      source,
      sourceId,
      description,
    });
    return response.data;
  }

  async getAllBadges(): Promise<Badge[]> {
    const response = await api.get('/gamification/badges/all');
    return response.data.badges;
  }

  async checkNewBadges(): Promise<{ newBadges: Badge[]; totalBadgesEarned: number }> {
    const response = await api.post('/gamification/badges/check');
    return response.data;
  }

  async getChallenges(): Promise<Challenge[]> {
    const response = await api.get('/gamification/challenges');
    return response.data.challenges;
  }

  async updateChallengeProgress(challengeId: string, progress: number): Promise<void> {
    await api.post('/gamification/challenges/progress', { challengeId, progress });
  }

  async getLeaderboard(type: 'global' | 'weekly' | 'country' = 'global', limit = 10): Promise<LeaderboardEntry[]> {
    const response = await api.get('/gamification/leaderboard', {
      params: { type, limit },
    });
    return response.data.leaderboard;
  }

  async getMyRank(): Promise<{ myRank: number; leaderboard: any }> {
    const response = await api.get('/gamification/leaderboard/me');
    return response.data;
  }

  async getStreak(): Promise<StreakInfo> {
    const response = await api.get('/gamification/streak');
    return response.data;
  }

  async recordDailyLogin(): Promise<{
    success: boolean;
    streakCount: number;
    xpEarned: number;
    streakBonus?: string;
  }> {
    const response = await api.post('/gamification/daily-login');
    return response.data;
  }

  async getLevels(): Promise<{ level: number; minXp: number; maxXp: number; title: string }[]> {
    const response = await api.get('/gamification/levels');
    return response.data.levels;
  }

  async celebrateLevelUp(newLevel: number): Promise<void> {
    console.log(`🎉 Level Up! You reached level ${newLevel}`);
  }

  async celebrateBadgeEarned(badge: Badge): Promise<void> {
    console.log(`🏅 Badge Earned: ${badge.name}`);
  }
}

export const gamificationService = new GamificationService();
export default gamificationService;

export const GAME_BALANCE = {
  // Bottle base scores
  SCORES: {
    NEAR_BOTTLE: 100,
    MID_BOTTLE: 150,
    FAR_BOTTLE: 220,
    GOLDEN_BOTTLE: 350,
    DYNAMITE_BOTTLE: 250,
    MOVING_BONUS: 50,
    PERFECT_ACCURACY_BONUS: 600,
    SPEED_BONUS_PER_SEC: 25
  },

  // Combo system
  COMBO: {
    STEP_INCREMENT: 0.25,
    MAX_MULTIPLIER: 4.0,
    TIMEOUT_MS: 3500 // Drops combo if player doesn't hit within 3.5s
  },

  // Rewards
  REWARDS: {
    LEVEL_CLEAR_BASE_COINS: 40,
    COINS_PER_STAR: 25,
    DAILY_CHALLENGE_COINS: 250,
    REWARDED_AD_COIN_BONUS: 300
  },

  // Accuracy calculation: hits / shotsFired
  getAccuracyPercentage(hits: number, shots: number): number {
    if (shots <= 0) return 0;
    return Math.min(100, Math.round((hits / shots) * 100));
  },

  // Stars calculation based on score and accuracy
  calculateStars(score: number, accuracy: number, starThresholds: [number, number, number]): number {
    if (score < starThresholds[0]) return 0;
    if (score >= starThresholds[2] && accuracy >= 70) return 3;
    if (score >= starThresholds[1]) return 2;
    return 1;
  },

  // Daily challenge generator based on date string (YYYY-MM-DD)
  getDailyChallengeConfig(dateStr: string) {
    // Simple deterministic PRNG seed from date string
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = (hash << 5) - hash + dateStr.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);

    const bottleCounts = [12, 15, 18, 20];
    const timeLimits = [40, 45, 50, 60];
    const countIndex = seed % bottleCounts.length;
    const timeIndex = (seed >> 2) % timeLimits.length;

    return {
      name: `Daily Challenge: ${dateStr}`,
      targetBottles: bottleCounts[countIndex],
      ammo: bottleCounts[countIndex] + 8,
      timeLimit: timeLimits[timeIndex],
      hasMoving: true,
      hasGolden: true,
      hasObstacles: (seed % 2 === 0),
      rewardCoins: 250
    };
  }
};

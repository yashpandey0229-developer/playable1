import { GameSaveData, IPlayablesAdapter } from '../platform/types';
import { DEFAULT_SKIN_ID } from '../data/weapons';

const CURRENT_SAVE_VERSION = 1;

export class SaveManager {
  private static instance: SaveManager | null = null;
  private adapter: IPlayablesAdapter;
  private data: GameSaveData;
  private isLoaded = false;
  private isSaveRunning = false;
  private queuedSaveResolvers: Array<(success: boolean) => void> = [];

  private constructor(adapter: IPlayablesAdapter) {
    this.adapter = adapter;
    this.data = this.getDefaultData();
  }

  static getInstance(adapter?: IPlayablesAdapter): SaveManager {
    if (!SaveManager.instance) {
      if (!adapter) throw new Error('SaveManager requires an IPlayablesAdapter on first initialization');
      SaveManager.instance = new SaveManager(adapter);
    }
    return SaveManager.instance;
  }

  static resetInstance(): void {
    SaveManager.instance = null;
  }

  getDefaultData(): GameSaveData {
    return {
      version: CURRENT_SAVE_VERSION,
      unlockedLevels: 1, // Start at Level 1 for proper progression
      highScore: 0,
      coins: 200,
      stars: {},
      levelScores: {},
      unlockedSkins: [DEFAULT_SKIN_ID],
      selectedSkin: DEFAULT_SKIN_ID,
      soundEnabled: true
    };
  }

  async load(): Promise<void> {
    try {
      const loaded = await this.adapter.loadData();
      if (loaded) {
        this.data = this.validateAndMigrate(loaded);
        console.log('[SaveManager] Successfully loaded cloud save data.');
      } else {
        console.log('[SaveManager] No cloud save found. Initialized with default state.');
        this.data = this.getDefaultData();
      }
    } catch (err) {
      console.warn('[SaveManager] Error loading cloud save, using defaults:', err);
      this.data = this.getDefaultData();
    } finally {
      this.isLoaded = true;
    }
  }

  validateAndMigrate(raw: any): GameSaveData {
    const defaults = this.getDefaultData();
    if (!raw || typeof raw !== 'object') return defaults;

    const data: GameSaveData = {
      version: typeof raw.version === 'number' ? raw.version : CURRENT_SAVE_VERSION,
      unlockedLevels: typeof raw.unlockedLevels === 'number' && !isNaN(raw.unlockedLevels)
        ? Math.min(30, Math.max(1, Math.floor(raw.unlockedLevels)))
        : 1,
      highScore: typeof raw.highScore === 'number' && raw.highScore >= 0 ? Math.floor(raw.highScore) : defaults.highScore,
      coins: typeof raw.coins === 'number' && raw.coins >= 0 ? Math.floor(raw.coins) : defaults.coins,
      stars: {},
      levelScores: {},
      unlockedSkins: Array.isArray(raw.unlockedSkins) && raw.unlockedSkins.length > 0 ? [...raw.unlockedSkins] : [DEFAULT_SKIN_ID],
      selectedSkin: typeof raw.selectedSkin === 'string' ? raw.selectedSkin : DEFAULT_SKIN_ID,
      soundEnabled: typeof raw.soundEnabled === 'boolean' ? raw.soundEnabled : true,
      lastDailyDate: typeof raw.lastDailyDate === 'string' ? raw.lastDailyDate : undefined,
      dailyCompleted: typeof raw.dailyCompleted === 'boolean' ? raw.dailyCompleted : false
    };

    // Validate stars map: keys 1..30, values 1..3
    if (raw.stars && typeof raw.stars === 'object' && !Array.isArray(raw.stars)) {
      for (const [k, v] of Object.entries(raw.stars)) {
        const numK = Number(k);
        const numV = Number(v);
        if (!isNaN(numK) && !isNaN(numV) && numK >= 1 && numK <= 30 && numV >= 1 && numV <= 3) {
          data.stars[numK] = Math.floor(numV);
        }
      }
    }

    // Validate levelScores map: keys 1..30, values >= 0
    if (raw.levelScores && typeof raw.levelScores === 'object' && !Array.isArray(raw.levelScores)) {
      for (const [k, v] of Object.entries(raw.levelScores)) {
        const numK = Number(k);
        const numV = Number(v);
        if (!isNaN(numK) && !isNaN(numV) && numK >= 1 && numK <= 30 && numV >= 0) {
          data.levelScores[numK] = Math.floor(numV);
        }
      }
    }

    // Ensure default skin is always in unlocked list
    if (!data.unlockedSkins.includes(DEFAULT_SKIN_ID)) {
      data.unlockedSkins.push(DEFAULT_SKIN_ID);
    }

    // Ensure selected skin is valid and unlocked
    if (!data.unlockedSkins.includes(data.selectedSkin)) {
      data.selectedSkin = DEFAULT_SKIN_ID;
    }

    // Progression sanity check & migration:
    // If user has stars in completed levels, unlockedLevels must at LEAST be highestCompleted + 1
    const completedLevelIds = Object.keys(data.stars)
      .map(Number)
      .filter(n => (data.stars[n] || 0) > 0);

    if (completedLevelIds.length === 0) {
      // Fix old bug where fresh accounts had unlockedLevels: 30
      if (raw.unlockedLevels === 30 || typeof raw.unlockedLevels !== 'number') {
        data.unlockedLevels = 1;
      }
    } else {
      const highestCompleted = Math.max(0, ...completedLevelIds);
      data.unlockedLevels = Math.min(30, Math.max(data.unlockedLevels, highestCompleted + 1));
    }

    return data;
  }

  async save(): Promise<boolean> {
    if (!this.isLoaded) {
      console.warn('[SaveManager] Attempted to save before initial load completed. Ignored.');
      return false;
    }

    // If a save operation is already in flight, queue this request
    if (this.isSaveRunning) {
      return new Promise<boolean>((resolve) => {
        this.queuedSaveResolvers.push(resolve);
      });
    }

    this.isSaveRunning = true;
    let success = false;
    try {
      success = await this.adapter.saveData(this.data);
    } catch (e) {
      console.error('[SaveManager] Cloud save exception:', e);
      success = false;
    } finally {
      this.isSaveRunning = false;

      // If newer save requests were queued while saving, execute a follow-up save with latest data
      if (this.queuedSaveResolvers.length > 0) {
        const resolvers = this.queuedSaveResolvers;
        this.queuedSaveResolvers = [];
        this.save().then((nextSuccess) => {
          resolvers.forEach(cb => cb(nextSuccess));
        });
      }
    }

    return success;
  }

  // Getters
  getData(): Readonly<GameSaveData> {
    return this.data;
  }

  getUnlockedLevels(): number {
    return this.data.unlockedLevels;
  }

  getHighScore(): number {
    return this.data.highScore;
  }

  getCoins(): number {
    return this.data.coins;
  }

  getTotalStars(): number {
    return Object.values(this.data.stars).reduce((sum, s) => sum + s, 0);
  }

  getLevelStars(levelId: number): number {
    return this.data.stars[levelId] || 0;
  }

  getLevelScore(levelId: number): number {
    return this.data.levelScores[levelId] || 0;
  }

  isSkinUnlocked(skinId: string): boolean {
    return this.data.unlockedSkins.includes(skinId);
  }

  getSelectedSkin(): string {
    return this.data.selectedSkin;
  }

  isSoundEnabled(): boolean {
    return this.data.soundEnabled;
  }

  // Mutation methods that trigger cloud save
  async unlockLevel(levelId: number): Promise<void> {
    if (levelId > this.data.unlockedLevels && levelId <= 30) {
      this.data.unlockedLevels = levelId;
      await this.save();
    }
  }

  async addCoins(amount: number): Promise<void> {
    if (amount > 0) {
      this.data.coins += Math.floor(amount);
      await this.save();
    }
  }

  async spendCoins(amount: number): Promise<boolean> {
    const cost = Math.floor(amount);
    if (cost > 0 && this.data.coins >= cost) {
      this.data.coins -= cost;
      await this.save();
      return true;
    }
    return false;
  }

  /**
   * Atomic record level victory: updates score, stars, level unlock, and coin reward in one atomic save
   */
  async recordLevelVictory(
    levelId: number,
    score: number,
    stars: number,
    coinsEarned: number
  ): Promise<boolean> {
    let changed = false;

    // High score check
    let isNewHighScore = false;
    const finalScore = Math.floor(score);
    if (finalScore > this.data.highScore) {
      this.data.highScore = finalScore;
      isNewHighScore = true;
      changed = true;
      this.adapter.sendScore(this.data.highScore).catch(err => {
        console.warn('[SaveManager] Failed to sendScore to YouTube:', err);
      });
    }

    // Stars
    const currentStars = this.data.stars[levelId] || 0;
    if (stars > currentStars) {
      this.data.stars[levelId] = stars;
      changed = true;
    }

    // Level score
    const currentScore = this.data.levelScores[levelId] || 0;
    if (finalScore > currentScore) {
      this.data.levelScores[levelId] = finalScore;
      changed = true;
    }

    // Unlock next level
    if (levelId >= this.data.unlockedLevels && levelId < 30) {
      this.data.unlockedLevels = levelId + 1;
      changed = true;
    }

    // Coins
    if (coinsEarned > 0) {
      this.data.coins += Math.floor(coinsEarned);
      changed = true;
    }

    if (changed) {
      await this.save();
    }

    return isNewHighScore;
  }

  async recordLevelCompletion(levelId: number, score: number, stars: number): Promise<boolean> {
    return this.recordLevelVictory(levelId, score, stars, 0);
  }

  async unlockSkin(skinId: string): Promise<void> {
    if (!this.data.unlockedSkins.includes(skinId)) {
      this.data.unlockedSkins.push(skinId);
      await this.save();
    }
  }

  async selectSkin(skinId: string): Promise<void> {
    if (this.data.unlockedSkins.includes(skinId)) {
      this.data.selectedSkin = skinId;
      await this.save();
    }
  }

  async setSoundEnabled(enabled: boolean): Promise<void> {
    this.data.soundEnabled = enabled;
    await this.save();
  }

  async recordDailyCompletion(dateStr: string): Promise<void> {
    this.data.lastDailyDate = dateStr;
    this.data.dailyCompleted = true;
    await this.save();
  }

  getNextPlayableLevel(): number {
    for (let lvl = 1; lvl <= 30; lvl++) {
      const stars = this.data.stars[lvl] || 0;
      if (stars === 0) {
        return Math.min(lvl, this.data.unlockedLevels);
      }
    }
    return Math.min(this.data.unlockedLevels, 1);
  }

  async resetProgress(): Promise<void> {
    this.data = this.getDefaultData();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem('bottle_blast_dev_save');
      } catch (e) {}
    }
    await this.adapter.saveData(this.data);
  }
}

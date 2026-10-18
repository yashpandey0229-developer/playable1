/**
 * YouTube Playables SDK & Game Platform Types
 */

export interface GameSaveData {
  version: number;
  unlockedLevels: number;
  highScore: number;
  coins: number;
  stars: Record<number, number>; // levelNumber -> stars (1-3)
  levelScores: Record<number, number>; // levelNumber -> score
  unlockedSkins: string[]; // skin IDs
  selectedSkin: string;
  soundEnabled: boolean;
  lastDailyDate?: string; // YYYY-MM-DD
  dailyCompleted?: boolean;
}

export interface IPlayablesAdapter {
  readonly isMock: boolean;
  init(): Promise<void>;
  firstFrameReady(): void;
  gameReady(): void;
  loadData(): Promise<GameSaveData | null>;
  saveData(data: GameSaveData): Promise<boolean>;
  sendScore(score: number): Promise<boolean>;
  isAudioEnabled(): boolean;
  onAudioEnabledChange(callback: (enabled: boolean) => void): () => void;
  onPause(callback: () => void): () => void;
  onResume(callback: () => void): () => void;
  requestRewardedAd(rewardId: string): Promise<boolean>;
}

// Global declaration for YouTube Playables SDK
declare global {
  interface Window {
    ytgame?: {
      IN_PLAYABLES_ENV?: boolean;
      game: {
        firstFrameReady: () => void;
        gameReady: () => void;
        loadData: () => Promise<string | undefined>;
        saveData: (data: string) => Promise<void>;
      };
      engagement: {
        sendScore: (scoreObj: { value: number }) => Promise<void>;
      };
      system: {
        isAudioEnabled: () => boolean;
        onAudioEnabledChange: (callback: (enabled: boolean) => void) => void;
        onPause: (callback: () => void) => void;
        onResume: (callback: () => void) => void;
        getLanguage?: () => string;
      };
      ads: {
        requestRewardedAd: (rewardId?: string) => Promise<boolean>;
      };
      SdkError?: new (message?: string) => Error;
    };
  }
}

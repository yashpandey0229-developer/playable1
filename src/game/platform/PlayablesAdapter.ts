import { IPlayablesAdapter, GameSaveData } from './types';

/**
 * Production PlayablesAdapter
 * Strictly communicates with the official YouTube Playables SDK (window.ytgame).
 * Does not make unauthorized storage calls, does not use external networks.
 */
export class PlayablesAdapter implements IPlayablesAdapter {
  readonly isMock = false;
  private audioListeners: Array<(enabled: boolean) => void> = [];
  private pauseListeners: Array<() => void> = [];
  private resumeListeners: Array<() => void> = [];
  private hasLoadedBeforeSave = false;
  private hasCalledFirstFrame = false;
  private hasCalledGameReady = false;
  private isAdRequestPending = false;

  private get ytgame() {
    return typeof window !== 'undefined' ? window.ytgame : undefined;
  }

  async init(): Promise<void> {
    const yt = this.ytgame;
    if (yt) {
      console.log('[PlayablesAdapter] YouTube Playables SDK detected.');

      // Register system audio listener
      try {
        yt.system.onAudioEnabledChange((enabled: boolean) => {
          console.log('[PlayablesAdapter] SDK onAudioEnabledChange:', enabled);
          this.audioListeners.forEach(fn => fn(enabled));
        });
      } catch (err) {
        console.warn('[PlayablesAdapter] Error registering audio listener:', err);
      }

      // Register pause listener
      try {
        yt.system.onPause(() => {
          console.log('[PlayablesAdapter] SDK onPause triggered');
          this.pauseListeners.forEach(fn => fn());
        });
      } catch (err) {
        console.warn('[PlayablesAdapter] Error registering onPause listener:', err);
      }

      // Register resume listener
      try {
        yt.system.onResume(() => {
          console.log('[PlayablesAdapter] SDK onResume triggered');
          this.resumeListeners.forEach(fn => fn());
        });
      } catch (err) {
        console.warn('[PlayablesAdapter] Error registering onResume listener:', err);
      }
    } else {
      console.warn('[PlayablesAdapter] ytgame is not available on window. Ensure SDK script is loaded.');
    }
  }

  firstFrameReady(): void {
    if (this.hasCalledFirstFrame) return;
    this.hasCalledFirstFrame = true;

    const yt = this.ytgame;
    if (yt?.game?.firstFrameReady) {
      try {
        console.log('[PlayablesAdapter] Calling ytgame.game.firstFrameReady()');
        yt.game.firstFrameReady();
      } catch (e) {
        console.error('[PlayablesAdapter] firstFrameReady error:', e);
      }
    }
  }

  gameReady(): void {
    if (this.hasCalledGameReady) return;
    this.hasCalledGameReady = true;

    const yt = this.ytgame;
    if (yt?.game?.gameReady) {
      try {
        console.log('[PlayablesAdapter] Calling ytgame.game.gameReady()');
        yt.game.gameReady();
      } catch (e) {
        console.error('[PlayablesAdapter] gameReady error:', e);
      }
    }
  }

  async loadData(): Promise<GameSaveData | null> {
    this.hasLoadedBeforeSave = true;
    const yt = this.ytgame;
    if (!yt?.game?.loadData) {
      console.warn('[PlayablesAdapter] loadData not available on ytgame.');
      return null;
    }

    try {
      console.log('[PlayablesAdapter] Calling ytgame.game.loadData()');
      const loadPromise = yt.game.loadData();
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('[PlayablesAdapter] ytgame.game.loadData() timed out after 8000ms.');
          resolve(null);
        }, 8000);
      });

      const raw = await Promise.race([loadPromise, timeoutPromise]);
      if (!raw || typeof raw !== 'string') {
        console.log('[PlayablesAdapter] loadData returned empty or non-string:', raw);
        return null;
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed as GameSaveData;
      }
      return null;
    } catch (e) {
      console.error('[PlayablesAdapter] Error loading data from YouTube SDK:', e);
      return null;
    }
  }

  async saveData(data: GameSaveData): Promise<boolean> {
    if (!this.hasLoadedBeforeSave) {
      console.warn('[PlayablesAdapter] Save requested before initial loadData. Ensuring load check first.');
    }

    try {
      const payload = JSON.stringify(data);
      // Ensure payload byte size is within YouTube Playables 3 MiB limit
      const byteSize = new TextEncoder().encode(payload).byteLength;
      if (byteSize > 3 * 1024 * 1024) {
        console.error('[PlayablesAdapter] Save data exceeds 3 MiB limit!');
        return false;
      }

      const yt = this.ytgame;
      if (!yt?.game?.saveData) {
        console.warn('[PlayablesAdapter] saveData not available on ytgame.');
        return false;
      }

      let timedOut = false;
      const savePromise = Promise.resolve(yt.game.saveData(payload)).then(() => true);
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          timedOut = true;
          console.warn('[PlayablesAdapter] ytgame.game.saveData() timed out after 8000ms.');
          resolve(false);
        }, 8000);
      });

      const outcome = await Promise.race([savePromise, timeoutPromise]);
      if (outcome && !timedOut) {
        console.log('[PlayablesAdapter] Cloud save operation completed successfully.');
        return true;
      }
      return false;
    } catch (e) {
      console.error('[PlayablesAdapter] Error saving data to YouTube SDK:', e);
      return false;
    }
  }

  async sendScore(score: number): Promise<boolean> {
    const yt = this.ytgame;
    if (!yt?.engagement?.sendScore) {
      console.warn('[PlayablesAdapter] sendScore not available on ytgame.');
      return false;
    }

    try {
      console.log(`[PlayablesAdapter] Sending score ${score} to YouTube`);
      const scorePromise = Promise.resolve(yt.engagement.sendScore({ value: Math.max(0, Math.floor(score)) })).then(() => true);
      const timeoutPromise = new Promise<boolean>((resolve) => {
        setTimeout(() => {
          console.warn('[PlayablesAdapter] ytgame.engagement.sendScore timed out after 8000ms.');
          resolve(false);
        }, 8000);
      });
      const success = await Promise.race([scorePromise, timeoutPromise]);
      return Boolean(success);
    } catch (e) {
      console.error('[PlayablesAdapter] Error sending score to YouTube SDK:', e);
      return false;
    }
  }

  isAudioEnabled(): boolean {
    const yt = this.ytgame;
    if (yt?.system?.isAudioEnabled) {
      try {
        return yt.system.isAudioEnabled();
      } catch (e) {
        console.error('[PlayablesAdapter] isAudioEnabled error:', e);
      }
    }
    return true; // Default fallback if not defined
  }

  onAudioEnabledChange(callback: (enabled: boolean) => void): () => void {
    this.audioListeners.push(callback);
    return () => {
      this.audioListeners = this.audioListeners.filter(fn => fn !== callback);
    };
  }

  onPause(callback: () => void): () => void {
    this.pauseListeners.push(callback);
    return () => {
      this.pauseListeners = this.pauseListeners.filter(fn => fn !== callback);
    };
  }

  onResume(callback: () => void): () => void {
    this.resumeListeners.push(callback);
    return () => {
      this.resumeListeners = this.resumeListeners.filter(fn => fn !== callback);
    };
  }

  async requestRewardedAd(rewardId: string): Promise<boolean> {
    if (this.isAdRequestPending) {
      console.warn('[PlayablesAdapter] Rewarded ad request already in progress. Ignoring duplicate.');
      return false;
    }

    const yt = this.ytgame;
    if (!yt?.ads?.requestRewardedAd) {
      console.warn('[PlayablesAdapter] Rewarded ads not supported in this environment.');
      return false;
    }

    this.isAdRequestPending = true;
    try {
      console.log(`[PlayablesAdapter] Requesting rewarded ad with ID "${rewardId}"`);
      const earned = await yt.ads.requestRewardedAd(rewardId);
      console.log('[PlayablesAdapter] Rewarded ad outcome:', earned);
      return Boolean(earned);
    } catch (e) {
      console.error('[PlayablesAdapter] Error requesting rewarded ad:', e);
      return false;
    } finally {
      this.isAdRequestPending = false;
    }
  }
}

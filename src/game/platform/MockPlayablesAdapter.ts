import { IPlayablesAdapter, GameSaveData } from './types';

/**
 * Development-only MockPlayablesAdapter
 * Provides local in-memory storage and an interactive rewarded ad test modal.
 * Clearly logs development behavior to the console.
 */
export class MockPlayablesAdapter implements IPlayablesAdapter {
  readonly isMock = true;
  private inMemoryData: GameSaveData | null = null;
  private audioListeners: Array<(enabled: boolean) => void> = [];
  private pauseListeners: Array<() => void> = [];
  private resumeListeners: Array<() => void> = [];
  private audioEnabled = true;
  private hasCalledFirstFrame = false;
  private hasCalledGameReady = false;
  private isAdRequestPending = false;

  async init(): Promise<void> {
    console.info('[MockPlayablesAdapter] Initialized in development mode (in-memory mock).');
  }

  firstFrameReady(): void {
    if (this.hasCalledFirstFrame) return;
    this.hasCalledFirstFrame = true;
    console.info('[MockPlayablesAdapter] firstFrameReady() invoked.');
  }

  gameReady(): void {
    if (this.hasCalledGameReady) return;
    this.hasCalledGameReady = true;
    console.info('[MockPlayablesAdapter] gameReady() invoked.');
  }

  async loadData(): Promise<GameSaveData | null> {
    if (!this.inMemoryData) {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const stored = window.localStorage.getItem('bottle_blast_dev_save');
          if (stored) {
            this.inMemoryData = JSON.parse(stored);
          }
        }
      } catch (e) {}
    }
    console.info('[MockPlayablesAdapter] loadData() returned state:', this.inMemoryData);
    return this.inMemoryData ? JSON.parse(JSON.stringify(this.inMemoryData)) : null;
  }

  async saveData(data: GameSaveData): Promise<boolean> {
    console.info('[MockPlayablesAdapter] saveData() updating store:', data);
    this.inMemoryData = JSON.parse(JSON.stringify(data));
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('bottle_blast_dev_save', JSON.stringify(data));
      }
    } catch (e) {}
    return true;
  }

  async sendScore(score: number): Promise<boolean> {
    console.info(`[MockPlayablesAdapter] sendScore(${score}) logged.`);
    return true;
  }

  isAudioEnabled(): boolean {
    return this.audioEnabled;
  }

  onAudioEnabledChange(callback: (enabled: boolean) => void): () => void {
    this.audioListeners.push(callback);
    return () => {
      this.audioListeners = this.audioListeners.filter(fn => fn !== callback);
    };
  }

  setMockAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
    this.audioListeners.forEach(fn => fn(enabled));
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

  triggerMockPause(): void {
    console.info('[MockPlayablesAdapter] Emulating platform pause event');
    this.pauseListeners.forEach(fn => fn());
  }

  triggerMockResume(): void {
    console.info('[MockPlayablesAdapter] Emulating platform resume event');
    this.resumeListeners.forEach(fn => fn());
  }

  async requestRewardedAd(rewardId: string): Promise<boolean> {
    if (this.isAdRequestPending) {
      console.warn('[MockPlayablesAdapter] Rewarded ad request already in progress. Ignoring duplicate.');
      return false;
    }

    console.info(`[MockPlayablesAdapter] Rewarded ad requested for "${rewardId}". Opening interactive test modal.`);
    this.isAdRequestPending = true;

    let modal = document.getElementById('dev-ad-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'dev-ad-modal';
      modal.className = 'dev-modal hidden';
      modal.innerHTML = `
        <div class="dev-modal-card">
          <div class="dev-modal-header">
            <span class="dev-badge">Local Dev Mock Ad</span>
            <h3>YouTube Rewarded Ad Test</h3>
          </div>
          <p id="dev-ad-message">Testing rewarded ad playback in development mode.</p>
          <div class="dev-modal-countdown" id="dev-ad-timer">Simulating ad: 3s</div>
          <div class="dev-modal-actions">
            <button id="dev-ad-complete-btn" class="dev-btn primary" disabled>Claim Reward</button>
            <button id="dev-ad-cancel-btn" class="dev-btn secondary">Skip / Close (No Reward)</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    const timerElem = document.getElementById('dev-ad-timer');
    const claimBtn = document.getElementById('dev-ad-complete-btn') as HTMLButtonElement | null;
    const cancelBtn = document.getElementById('dev-ad-cancel-btn') as HTMLButtonElement | null;
    const msgElem = document.getElementById('dev-ad-message');

    if (!modal || !claimBtn || !cancelBtn || !timerElem) {
      this.isAdRequestPending = false;
      // Fallback if modal DOM elements are missing
      return new Promise<boolean>(resolve => {
        const confirmClaim = window.confirm(`[Dev Mock Ad: ${rewardId}]\nClick OK to simulate watching ad to completion.\nClick Cancel to simulate abandoning ad.`);
        resolve(confirmClaim);
      });
    }

    if (msgElem) {
      msgElem.textContent = `Reward target: "${rewardId}". Ad will unlock in 3 seconds or you can skip.`;
    }

    modal.classList.remove('hidden');
    claimBtn.disabled = true;
    claimBtn.textContent = 'Watching Ad...';

    return new Promise<boolean>((resolve) => {
      let timeLeft = 3;
      timerElem.textContent = `Simulating ad: ${timeLeft}s`;

      const interval = setInterval(() => {
        timeLeft -= 1;
        if (timeLeft > 0) {
          timerElem.textContent = `Simulating ad: ${timeLeft}s`;
        } else {
          clearInterval(interval);
          timerElem.textContent = 'Ad complete! You can claim your reward.';
          claimBtn.disabled = false;
          claimBtn.textContent = 'Claim Reward';
        }
      }, 1000);

      const cleanup = () => {
        clearInterval(interval);
        modal.classList.add('hidden');
        claimBtn.onclick = null;
        cancelBtn.onclick = null;
        this.isAdRequestPending = false;
      };

      claimBtn.onclick = () => {
        cleanup();
        console.info('[MockPlayablesAdapter] Player claimed rewarded ad reward.');
        resolve(true);
      };

      cancelBtn.onclick = () => {
        cleanup();
        console.info('[MockPlayablesAdapter] Player cancelled/skipped rewarded ad.');
        resolve(false);
      };
    });
  }
}

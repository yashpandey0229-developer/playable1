import { GAME_BALANCE } from '../data/balance';
import { ShelfTier, TargetType } from '../data/levels';

export interface ScoreEvent {
  points: number;
  multiplier: number;
  totalAdded: number;
  isComboMilestone: boolean;
  x: number;
  y: number;
  label?: string;
}

export class ScoringSystem {
  private score = 0;
  private hits = 0;
  private shotsFired = 0;
  private combo = 1.0;
  private maxCombo = 1.0;
  private lastHitTime = 0;
  private onScoreCallback?: (event: ScoreEvent) => void;

  constructor(onScore?: (event: ScoreEvent) => void) {
    this.onScoreCallback = onScore;
  }

  reset(): void {
    this.score = 0;
    this.hits = 0;
    this.shotsFired = 0;
    this.combo = 1.0;
    this.maxCombo = 1.0;
    this.lastHitTime = 0;
  }

  recordShot(): void {
    this.shotsFired++;
  }

  recordHit(type: TargetType, tier: ShelfTier, isMoving: boolean, worldX: number, worldY: number): ScoreEvent {
    this.hits++;
    const now = Date.now();

    // Check combo timeout
    if (this.lastHitTime > 0 && now - this.lastHitTime < GAME_BALANCE.COMBO.TIMEOUT_MS) {
      this.combo = Math.min(GAME_BALANCE.COMBO.MAX_MULTIPLIER, this.combo + GAME_BALANCE.COMBO.STEP_INCREMENT);
    } else {
      this.combo = 1.0;
    }
    this.lastHitTime = now;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    // Calculate base points
    let base = GAME_BALANCE.SCORES.NEAR_BOTTLE;
    if (tier === 'mid') base = GAME_BALANCE.SCORES.MID_BOTTLE;
    if (tier === 'far') base = GAME_BALANCE.SCORES.FAR_BOTTLE;

    let bonusLabel = '';
    if (type === 'golden') {
      base = GAME_BALANCE.SCORES.GOLDEN_BOTTLE;
      bonusLabel = 'GOLDEN!';
    } else if (type === 'dynamite') {
      base = GAME_BALANCE.SCORES.DYNAMITE_BOTTLE;
      bonusLabel = 'BLAST!';
    }

    if (isMoving) {
      base += GAME_BALANCE.SCORES.MOVING_BONUS;
      if (!bonusLabel) bonusLabel = 'MOVING!';
    }

    const totalAdded = Math.round(base * this.combo);
    this.score += totalAdded;

    const isComboMilestone = this.combo >= 2.0 && (this.combo % 0.5 === 0);

    const event: ScoreEvent = {
      points: base,
      multiplier: this.combo,
      totalAdded,
      isComboMilestone,
      x: worldX,
      y: worldY,
      label: bonusLabel || (this.combo >= 2.0 ? `${this.combo.toFixed(1)}x COMBO` : undefined)
    };

    if (this.onScoreCallback) {
      this.onScoreCallback(event);
    }

    return event;
  }

  recordMiss(): void {
    // Drop combo on shot miss
    this.combo = 1.0;
  }

  update(now: number): boolean {
    // If combo expired in real time
    if (this.combo > 1.0 && this.lastHitTime > 0 && now - this.lastHitTime >= GAME_BALANCE.COMBO.TIMEOUT_MS) {
      this.combo = 1.0;
      return true; // combo dropped
    }
    return false;
  }

  getScore(): number {
    return this.score;
  }

  getHits(): number {
    return this.hits;
  }

  getShotsFired(): number {
    return this.shotsFired;
  }

  getAccuracy(): number {
    return GAME_BALANCE.getAccuracyPercentage(this.hits, this.shotsFired);
  }

  getCombo(): number {
    return this.combo;
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  getComboProgress(): number {
    if (this.combo <= 1.0 || this.lastHitTime === 0) return 0;
    const elapsed = Date.now() - this.lastHitTime;
    return Math.max(0, 1 - (elapsed / GAME_BALANCE.COMBO.TIMEOUT_MS));
  }
}

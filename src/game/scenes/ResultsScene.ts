import Phaser from 'phaser';
import { getPlayablesAdapter } from '../platform';
import { LevelDefinition } from '../data/levels';
import { GAME_BALANCE } from '../data/balance';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';

interface ResultsSceneData {
  win: boolean;
  reason?: 'ammo' | 'time';
  score: number;
  hits: number;
  shots: number;
  accuracy: number;
  maxCombo: number;
  levelData: LevelDefinition;
  isDaily: boolean;
}

export class ResultsScene extends Phaser.Scene {
  private resultsData!: ResultsSceneData;
  private saveManager!: SaveManager;
  private audio!: AudioManager;
  private adClaimed = false;
  private isAdPending = false;

  constructor() {
    super({ key: 'ResultsScene' });
  }

  init(data: ResultsSceneData): void {
    this.resultsData = data;
    this.adClaimed = false;
    this.isAdPending = false;
  }

  create(): void {
    const { width, height } = this.scale;
    this.saveManager = SaveManager.getInstance();
    this.audio = AudioManager.getInstance();

    // 1. Darkened backdrop with radial vignette
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2a0d05, 0x2a0d05, 0x0a0402, 0x0a0402, 1);
    bg.fillRect(0, 0, width, height);

    // 2. Results Card Container
    const cardW = Math.min(width * 0.9, 440);
    const cardH = Math.min(height * 0.88, 620);
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    const card = this.add.graphics();
    card.fillStyle(0x1a0f0a, 0.95);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 18);
    card.lineStyle(3, this.resultsData.win ? 0xffb300 : 0x757575, 0.9);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 18);

    // 3. Header Banner
    const bannerColor = this.resultsData.win ? '#4caf50' : '#f44336';
    const bannerTitle = this.resultsData.win
      ? (this.resultsData.isDaily ? 'CHALLENGE CLEARED!' : 'VICTORY!')
      : (this.resultsData.reason === 'time' ? 'TIME EXPIRED!' : 'OUT OF AMMO!');

    this.add.text(width / 2, cardY + 45, bannerTitle, {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '34px',
      color: bannerColor,
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // 4. Calculate Stars & Save Progress in Background
    let starsEarned = 0;
    let earnedCoins = 0;
    let isNewBest = false;

    if (this.resultsData.win) {
      starsEarned = GAME_BALANCE.calculateStars(
        this.resultsData.score,
        this.resultsData.accuracy,
        this.resultsData.levelData.starThresholds
      );
      earnedCoins = GAME_BALANCE.REWARDS.LEVEL_CLEAR_BASE_COINS +
        (starsEarned * GAME_BALANCE.REWARDS.COINS_PER_STAR);

      isNewBest = this.resultsData.score > this.saveManager.getHighScore();

      if (this.resultsData.isDaily) {
        earnedCoins += GAME_BALANCE.REWARDS.DAILY_CHALLENGE_COINS;
        const today = new Date().toISOString().split('T')[0];
        this.saveManager.recordDailyCompletion(today).catch(() => {});
      } else {
        this.saveManager.recordLevelCompletion(
          this.resultsData.levelData.id,
          this.resultsData.score,
          starsEarned
        ).catch(() => {});
      }
      this.saveManager.addCoins(earnedCoins).catch(() => {});
    }

    // 5. Star Animations
    this.createStarsDisplay(width / 2, cardY + 105, starsEarned);

    // 6. Score & Stats Breakdown
    this.createStatsBreakdown(cardX + 40, cardY + 165, cardW - 80, earnedCoins, isNewBest);

    // 7. Rewarded Ad Button
    this.createRewardedAdButton(width / 2, cardY + cardH - 135);

    // 8. Navigation Buttons (Next / Retry / Level Select)
    this.createNavButtons(width / 2, cardY + cardH - 55);
  }

  private createStarsDisplay(cx: number, cy: number, starsEarned: number): void {
    const spacing = 52;
    for (let i = 0; i < 3; i++) {
      const sx = cx + ((i - 1) * spacing);
      const isEarned = i < starsEarned;
      const texture = isEarned ? 'star_gold' : 'star_empty';

      const star = this.add.sprite(sx, cy, texture)
        .setScale(isEarned ? 0 : 0.85);

      if (isEarned) {
        this.time.delayedCall(250 + (i * 220), () => {
          this.audio.playStarChime(i);
          this.tweens.add({
            targets: star,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 250,
            yoyo: true,
            ease: 'Back.easeOut',
            onComplete: () => star.setScale(1.0)
          });
        });
      }
    }
  }

  private createStatsBreakdown(
    x: number,
    y: number,
    w: number,
    coinsEarned: number,
    isNewBest: boolean
  ): void {
    const lines = [
      { label: 'Final Score', value: `${this.resultsData.score}`, color: '#ffffff' },
      { label: 'Accuracy', value: `${this.resultsData.accuracy}% (${this.resultsData.hits}/${this.resultsData.shots})`, color: '#81d4fa' },
      { label: 'Max Combo', value: `${this.resultsData.maxCombo.toFixed(1)}x`, color: '#ffca28' },
      { label: 'Coins Earned', value: `+${coinsEarned}`, color: '#69f0ae' }
    ];

    lines.forEach((line, idx) => {
      const lineY = y + (idx * 34);

      this.add.text(x, lineY, line.label, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#b0bec5'
      });

      this.add.text(x + w, lineY, line.value, {
        fontFamily: 'sans-serif',
        fontSize: '16px',
        color: line.color,
        fontStyle: 'bold'
      }).setOrigin(1, 0);

      // Separator line
      const sep = this.add.graphics();
      sep.lineStyle(1, 0x424242, 0.4);
      sep.lineBetween(x, lineY + 26, x + w, lineY + 26);
    });

    if (isNewBest) {
      const bestNotice = this.add.text(x + w / 2, y + 155, '★ NEW PERSONAL BEST SCORE! ★', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ffd700',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      this.tweens.add({
        targets: bestNotice,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 600,
        yoyo: true,
        repeat: -1
      });
    }
  }

  private createRewardedAdButton(cx: number, cy: number): void {
    const adapter = getPlayablesAdapter();
    const btnW = 320;
    const btnH = 46;

    const adContainer = this.add.container(cx, cy);

    const btnBg = this.add.graphics();
    btnBg.fillGradientStyle(0x7b1fa2, 0x7b1fa2, 0x4a148c, 0x4a148c, 1);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    btnBg.lineStyle(1.5, 0xba68c8, 0.8);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

    const btnLabel = this.resultsData.win
      ? '📺 WATCH AD: DOUBLE COINS (+300)'
      : '📺 WATCH AD: FREE RETRY (+4 AMMO)';

    const label = this.add.text(0, 0, btnLabel, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const statusMsg = this.add.text(0, 32, '', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#ff8a80'
    }).setOrigin(0.5);

    const adZone = this.add.zone(0, 0, btnW, btnH).setOrigin(0.5).setInteractive({ useHandCursor: true });
    adContainer.add([btnBg, label, statusMsg, adZone]);

    adZone.on('pointerdown', async () => {
      if (this.adClaimed || this.isAdPending) return;

      this.audio.playClick();
      this.isAdPending = true;
      label.setText('Requesting Ad...');
      adContainer.setAlpha(0.6);
      statusMsg.setText('');

      const rewardId = this.resultsData.win ? 'reward_double_coins' : 'reward_extra_ammo';

      try {
        const earned = await adapter.requestRewardedAd(rewardId);

        if (earned) {
          this.adClaimed = true;
          this.audio.playVictory();
          label.setText('REWARD CLAIMED! ✓');
          btnBg.clear();
          btnBg.fillStyle(0x2e7d32, 1);
          btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

          if (this.resultsData.win) {
            // Grant +300 bonus coins
            await this.saveManager.addCoins(300);
            statusMsg.setText('+300 Coins added to your bank!').setColor('#69f0ae');
          } else {
            // Relaunch level with +4 bonus ammo
            statusMsg.setText('Restarting with +4 Bonus Ammo!').setColor('#81d4fa');
            this.time.delayedCall(1200, () => {
              this.scene.start('GameScene', {
                levelId: this.resultsData.levelData.id,
                bonusAmmo: 4
              });
            });
          }
        } else {
          label.setText(btnLabel);
          adContainer.setAlpha(1);
          statusMsg.setText('Ad was skipped or reward not earned.');
        }
      } catch (e) {
        label.setText(btnLabel);
        adContainer.setAlpha(1);
        statusMsg.setText('Rewarded ad is currently unavailable.');
      } finally {
        this.isAdPending = false;
      }
    });
  }

  private createNavButtons(cx: number, cy: number): void {
    const spacing = 110;

    // Retry Button
    this.createSmallBtn(cx - spacing, cy, 'RETRY', 0x1976d2, () => {
      this.audio.playClick();
      this.scene.start('GameScene', {
        levelId: this.resultsData.levelData.id,
        isDaily: this.resultsData.isDaily
      });
    });

    // Next Level Button (if won)
    if (this.resultsData.win && this.resultsData.levelData.id < 30 && !this.resultsData.isDaily) {
      this.createSmallBtn(cx, cy, 'NEXT LEVEL', 0x4caf50, () => {
        this.audio.playClick();
        this.scene.start('GameScene', { levelId: this.resultsData.levelData.id + 1 });
      });
    }

    // Menu / Level Select
    this.createSmallBtn(cx + (this.resultsData.win && !this.resultsData.isDaily ? spacing : 0), cy, 'MENU', 0x5d4037, () => {
      this.audio.playClick();
      this.scene.start('MenuScene');
    });
  }

  private createSmallBtn(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const w = 98;
    const h = 42;

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(1.5, 0xffffff, 0.4);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const zone = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.add([bg, label, zone]);

    let handled = false;
    zone.on('pointerdown', () => {
      if (handled) return;
      handled = true;
      btn.setScale(0.94);
      this.time.delayedCall(70, () => {
        btn.setScale(1.0);
        onClick();
        this.time.delayedCall(300, () => { handled = false; });
      });
    });

    return btn;
  }
}

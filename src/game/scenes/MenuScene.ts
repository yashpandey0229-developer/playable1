import Phaser from 'phaser';
import { getPlayablesAdapter } from '../platform';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { LEVELS } from '../data/levels';
import { GAME_BALANCE } from '../data/balance';

export class MenuScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private audio!: AudioManager;
  private levelSelectContainer?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    const adapter = getPlayablesAdapter();
    this.saveManager = SaveManager.getInstance();
    this.audio = AudioManager.getInstance();

    // Signal gameReady to YouTube Playables SDK
    adapter.gameReady();

    // 1. Rich Shooting Gallery Marquee Background
    this.createBackground(width, height);

    // 2. Stats Header Bar (Coins, Stars, Best Score)
    this.createHeader(width);

    // 3. Marquee Title
    this.createTitle(width, height);

    // 4. Main Menu Action Buttons
    this.createMenuButtons(width, height);

    // 5. Sound Toggle Button
    this.createAudioToggle(width, height);
  }

  private createBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    // Warm atmospheric twilight carnival gradient
    bg.fillGradientStyle(0x3e1808, 0x3e1808, 0x140704, 0x140704, 1);
    bg.fillRect(0, 0, width, height);

    // Wooden barn wall vertical plank stripes
    bg.lineStyle(1, 0x000000, 0.3);
    for (let x = 0; x < width; x += 45) {
      bg.lineBetween(x, 0, x, height);
    }

    // Carnival warm light spots
    for (let i = 0; i < 6; i++) {
      const lx = (width * 0.15) + (i * (width * 0.14));
      const ly = 40 + (Math.sin(i * 1.5) * 12);
      const glow = this.add.graphics();
      glow.fillStyle(0xffe082, 0.25);
      glow.fillCircle(lx, ly, 18);
      glow.fillStyle(0xffffff, 0.9);
      glow.fillCircle(lx, ly, 4);

      // Light pulsing tween
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.6, to: 1 },
        duration: 1200 + (i * 200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    // Decorative Bottles on bottom shelf sill
    const sill = this.add.sprite(width / 2, height - 12, 'wood_shelf')
      .setScale(1.2, 1.0)
      .setDisplaySize(width + 40, 36);

    const b1 = this.add.sprite(width * 0.12, height - 28, 'bottle_standard').setScale(0.65);
    const b2 = this.add.sprite(width * 0.2, height - 28, 'bottle_amber').setScale(0.65);
    const b3 = this.add.sprite(width * 0.8, height - 28, 'bottle_blue').setScale(0.65);
    const b4 = this.add.sprite(width * 0.88, height - 28, 'bottle_golden').setScale(0.65);
  }

  private createHeader(width: number): void {
    const header = this.add.container(width / 2, 45);

    // Header background pill
    const bg = this.add.graphics();
    const pillW = Math.min(width * 0.92, 540);
    bg.fillStyle(0x1a0f0a, 0.85);
    bg.fillRoundedRect(-pillW / 2, -22, pillW, 44, 22);
    bg.lineStyle(2, 0xc8963e, 0.6);
    bg.strokeRoundedRect(-pillW / 2, -22, pillW, 44, 22);
    header.add(bg);

    const stars = this.saveManager.getTotalStars();
    const coins = this.saveManager.getCoins();
    const best = this.saveManager.getHighScore();

    // Stars
    const starIcon = this.add.sprite(-pillW * 0.35, 0, 'star_gold').setScale(0.6);
    const starText = this.add.text(-pillW * 0.35 + 20, 0, `${stars}`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // Coins
    const coinIcon = this.add.sprite(-pillW * 0.05, 0, 'coin_gold').setScale(0.7);
    const coinText = this.add.text(-pillW * 0.05 + 18, 0, `${coins}`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    // High Score
    const trophy = this.add.text(pillW * 0.22, 0, '🏆', { fontSize: '18px' }).setOrigin(0.5);
    const bestText = this.add.text(pillW * 0.22 + 18, 0, `BEST: ${best}`, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#81d4fa',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    header.add([starIcon, starText, coinIcon, coinText, trophy, bestText]);
  }

  private createTitle(width: number, height: number): void {
    const titleY = height * 0.26;

    // Glowing Marquee Sign
    const signBg = this.add.graphics();
    const signW = Math.min(width * 0.85, 420);
    const signH = 105;
    signBg.fillStyle(0x3e1f0e, 0.95);
    signBg.fillRoundedRect((width - signW) / 2, titleY - signH / 2, signW, signH, 18);
    signBg.lineStyle(4, 0xffa726, 0.9);
    signBg.strokeRoundedRect((width - signW) / 2, titleY - signH / 2, signW, signH, 18);

    const titleText = this.add.text(width / 2, titleY - 10, 'BOTTLE BLAST', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '44px',
      color: '#ffeb3b',
      stroke: '#b71c1c',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);

    const subText = this.add.text(width / 2, titleY + 30, '★ CLASSIC ARCADE SHOOTER ★', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffe082',
      fontStyle: 'bold',
      letterSpacing: 2
    }).setOrigin(0.5);

    // Subtle gentle float animation
    this.tweens.add({
      targets: [titleText, subText],
      y: '-=4',
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  private createMenuButtons(width: number, height: number): void {
    const nextLevel = this.saveManager.getNextPlayableLevel();
    const startY = height * 0.48;
    const spacing = 58;

    // 1. Play Button
    const playLabel = nextLevel === 1 ? 'PLAY LEVEL 1' : `CONTINUE LEVEL ${nextLevel}`;
    const playBtn = this.createButton(
      width / 2,
      startY,
      playLabel,
      0x4caf50,
      0x2e7d32,
      () => {
        this.audio.playClick();
        this.scene.start('GameScene', { levelId: nextLevel });
      },
      true
    );

    // 2. Level Select Button
    this.createButton(
      width / 2,
      startY + spacing,
      'LEVEL SELECT',
      0x1976d2,
      0x0d47a1,
      () => {
        this.audio.playClick();
        this.openLevelSelect();
      }
    );

    // 3. Gun Skins Button
    this.createButton(
      width / 2,
      startY + (spacing * 2),
      'GUN SKINS & ARSENAL',
      0x8e24aa,
      0x4a148c,
      () => {
        this.audio.playClick();
        this.scene.start('SkinScene');
      }
    );

    // 4. Daily Challenge Button
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = this.saveManager.getData().lastDailyDate === today && this.saveManager.getData().dailyCompleted;

    this.createButton(
      width / 2,
      startY + (spacing * 3),
      isCompleted ? 'DAILY CHALLENGE (DONE)' : 'DAILY CHALLENGE (+250 COINS)',
      isCompleted ? 0x616161 : 0xff8f00,
      isCompleted ? 0x424242 : 0xe65100,
      () => {
        this.audio.playClick();
        this.startDailyChallenge(today);
      }
    );
  }

  private startDailyChallenge(dateStr: string): void {
    const dailyConfig = GAME_BALANCE.getDailyChallengeConfig(dateStr);
    this.scene.start('GameScene', { isDaily: true, dailyConfig });
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    topColor: number,
    bottomColor: number,
    onClick: () => void,
    pulse = false
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const btnW = Math.min(this.scale.width * 0.8, 340);
    const btnH = 50;

    const bg = this.add.graphics();
    bg.fillGradientStyle(topColor, topColor, bottomColor, bottomColor, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 14);
    bg.lineStyle(2, 0xffffff, 0.4);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 14);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'sans-serif',
      fontSize: '17px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Explicit interactive zone covering the full button footprint
    const hitZone = this.add.zone(0, 0, btnW, btnH)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    container.add([bg, label, hitZone]);

    let isDown = false;
    let isHandled = false;
    hitZone.on('pointerdown', () => {
      if (isHandled) return;
      isDown = true;
      this.tweens.killTweensOf(container);
      this.tweens.add({
        targets: container,
        scaleX: 0.94,
        scaleY: 0.94,
        duration: 70,
        yoyo: true,
        ease: 'Quad.easeInOut'
      });
    });

    hitZone.on('pointerout', () => {
      isDown = false;
    });

    hitZone.on('pointerup', () => {
      if (isHandled || !isDown) {
        isDown = false;
        return;
      }
      isDown = false;
      isHandled = true;
      onClick();
      this.time.delayedCall(400, () => {
        isHandled = false;
      });
    });

    if (pulse) {
      this.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }

    return container;
  }

  private createAudioToggle(width: number, height: number): void {
    const x = width - 40;
    const y = height - 40;

    const btn = this.add.container(x, y).setDepth(800);
    const bg = this.add.circle(0, 0, 20, 0x212121, 0.8);
    const icon = this.add.text(0, 0, this.audio.isMuted() ? '🔇' : '🔊', {
      fontSize: '18px'
    }).setOrigin(0.5);

    const aZone = this.add.zone(0, 0, 48, 48)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.add([bg, icon, aZone]);

    aZone.on('pointerdown', async () => {
      this.audio.playClick();
      const currentMuted = this.audio.isMuted();
      const newMuted = !currentMuted;
      this.audio.setUserMuted(newMuted);
      await this.saveManager.setSoundEnabled(!newMuted);
      icon.setText(newMuted ? '🔇' : '🔊');
    });
  }

  private openLevelSelect(): void {
    if (this.levelSelectContainer) {
      this.levelSelectContainer.destroy();
    }

    const { width, height } = this.scale;
    const container = this.add.container(0, 0).setDepth(2000);
    this.levelSelectContainer = container;

    // Dark backdrop
    const backdrop = this.add.rectangle(0, 0, width, height, 0x000000, 0.85)
      .setOrigin(0)
      .setInteractive();
    container.add(backdrop);

    // Modal Card
    const cardW = Math.min(width * 0.92, 480);
    const cardH = Math.min(height * 0.85, 620);
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    const cardBg = this.add.graphics();
    cardBg.fillStyle(0x1a0f0a, 0.98);
    cardBg.fillRoundedRect(cardX, cardY, cardW, cardH, 16);
    cardBg.lineStyle(2, 0xc8963e, 0.8);
    cardBg.strokeRoundedRect(cardX, cardY, cardW, cardH, 16);
    container.add(cardBg);

    // Title & Close Button
    const modalTitle = this.add.text(width / 2, cardY + 32, 'SELECT LEVEL (1 - 30)', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const closeBtn = this.add.text(cardX + cardW - 30, cardY + 30, '✕', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      color: '#ff5252',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    let modalInteractive = false;
    this.time.delayedCall(250, () => {
      modalInteractive = true;
    });

    closeBtn.on('pointerup', () => {
      if (!modalInteractive) return;
      this.audio.playClick();
      container.destroy();
      this.levelSelectContainer = undefined;
    });

    container.add([modalTitle, closeBtn]);

    // Grid of Levels: 5 columns x 6 rows = 30 levels
    const cols = 5;
    const rows = 6;
    const gridStartX = cardX + 38;
    const gridStartY = cardY + 70;
    const cellW = (cardW - 76) / cols;
    const cellH = (cardH - 100) / rows;

    const unlockedMax = this.saveManager.getUnlockedLevels();

    for (let i = 0; i < 30; i++) {
      const lvlNum = i + 1;
      const c = i % cols;
      const r = Math.floor(i / cols);
      const cx = gridStartX + (c * cellW) + (cellW / 2);
      const cy = gridStartY + (r * cellH) + (cellH / 2);

      const isUnlocked = lvlNum <= unlockedMax;
      const starsEarned = this.saveManager.getLevelStars(lvlNum);

      const cellBg = this.add.graphics();
      const bW = cellW - 8;
      const bH = cellH - 8;

      if (isUnlocked) {
        cellBg.fillStyle(0x3e2723, 0.9);
        cellBg.fillRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 8);
        cellBg.lineStyle(1.5, 0xffb300, 0.8);
        cellBg.strokeRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 8);
      } else {
        cellBg.fillStyle(0x1b100d, 0.7);
        cellBg.fillRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 8);
        cellBg.lineStyle(1, 0x424242, 0.5);
        cellBg.strokeRoundedRect(cx - bW / 2, cy - bH / 2, bW, bH, 8);
      }
      container.add(cellBg);

      // Level number or Lock icon
      if (isUnlocked) {
        const numText = this.add.text(cx, cy - 6, `${lvlNum}`, {
          fontFamily: 'sans-serif',
          fontSize: '16px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        // Star rating pips
        const starsStr = starsEarned > 0 ? '★'.repeat(starsEarned) : '---';
        const starsText = this.add.text(cx, cy + 12, starsStr, {
          fontFamily: 'sans-serif',
          fontSize: '11px',
          color: starsEarned > 0 ? '#ffd700' : '#757575'
        }).setOrigin(0.5);

        container.add([numText, starsText]);

        // Interactive hit area
        const hitArea = this.add.rectangle(cx, cy, bW, bH)
          .setInteractive({ useHandCursor: true });

        let isDownOnCell = false;
        hitArea.on('pointerdown', () => {
          if (!modalInteractive) return;
          isDownOnCell = true;
        });

        hitArea.on('pointerout', () => {
          isDownOnCell = false;
        });

        hitArea.on('pointerup', () => {
          if (!modalInteractive || !isDownOnCell) {
            isDownOnCell = false;
            return;
          }
          isDownOnCell = false;
          this.audio.playClick();
          container.destroy();
          this.levelSelectContainer = undefined;
          this.scene.start('GameScene', { levelId: lvlNum });
        });

        container.add(hitArea);
      } else {
        const lockText = this.add.text(cx, cy, '🔒', {
          fontSize: '16px'
        }).setOrigin(0.5);
        container.add(lockText);
      }
    }

    // Reset Progress option at bottom
    const resetText = this.add.text(width / 2, cardY + cardH - 18, '🔄 RESET PROGRESS TO LEVEL 1', {
      fontFamily: 'sans-serif',
      fontSize: '11px',
      color: '#ff8a80',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    let isDownOnReset = false;
    resetText.on('pointerdown', () => {
      if (!modalInteractive) return;
      isDownOnReset = true;
    });

    resetText.on('pointerout', () => {
      isDownOnReset = false;
    });

    resetText.on('pointerup', async () => {
      if (!modalInteractive || !isDownOnReset) {
        isDownOnReset = false;
        return;
      }
      isDownOnReset = false;
      this.audio.playClick();
      await this.saveManager.resetProgress();
      container.destroy();
      this.levelSelectContainer = undefined;
      this.scene.restart();
    });

    container.add(resetText);
  }
}

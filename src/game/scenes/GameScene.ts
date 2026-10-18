import Phaser from 'phaser';
import { getPlayablesAdapter } from '../platform';
import { getLevelById, LevelDefinition } from '../data/levels';
import { SaveManager } from '../systems/SaveManager';
import { SkinManager } from '../systems/SkinManager';
import { AudioManager } from '../systems/AudioManager';
import { ScoringSystem, ScoreEvent } from '../systems/ScoringSystem';
import { ShootingSystem } from '../systems/ShootingSystem';
import { LevelManager } from '../systems/LevelManager';

interface GameSceneInitData {
  levelId?: number;
  isDaily?: boolean;
  dailyConfig?: any;
  bonusAmmo?: number;
}

export class GameScene extends Phaser.Scene {
  private levelData!: LevelDefinition;
  private isDaily = false;
  private saveManager!: SaveManager;
  private skinManager!: SkinManager;
  private audio!: AudioManager;

  // Systems
  private scoringSystem!: ScoringSystem;
  private shootingSystem!: ShootingSystem;
  private levelManager!: LevelManager;

  // HUD Elements
  private hudContainer!: Phaser.GameObjects.Container;
  private scoreText!: Phaser.GameObjects.Text;
  private targetCounterText!: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private comboContainer!: Phaser.GameObjects.Container;
  private comboFill!: Phaser.GameObjects.Graphics;
  private comboLabel!: Phaser.GameObjects.Text;
  private ammoIcons: Phaser.GameObjects.Sprite[] = [];
  private ammoReserveText?: Phaser.GameObjects.Text;
  private reloadPromptText!: Phaser.GameObjects.Text;

  // Tutorial
  private tutorialContainer?: Phaser.GameObjects.Container;

  // Keyboard controls
  private spaceKey?: Phaser.Input.Keyboard.Key;
  private reloadKey?: Phaser.Input.Keyboard.Key;
  private pauseKey?: Phaser.Input.Keyboard.Key;

  // Pause cleanup
  private removePlatformPause?: () => void;
  private removePlatformResume?: () => void;
  private isPaused = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneInitData): void {
    this.isDaily = Boolean(data.isDaily);
    if (this.isDaily && data.dailyConfig) {
      // Build level definition from daily config
      this.levelData = {
        id: 999,
        title: data.dailyConfig.name,
        description: 'Clear all targets within the time limit for 250 bonus coins!',
        ammo: data.dailyConfig.ammo + (data.bonusAmmo || 0),
        timeLimitSec: data.dailyConfig.timeLimit,
        starThresholds: [1200, 1800, 2400],
        targets: []
      };
      // Populate targets for daily
      for (let i = 0; i < data.dailyConfig.targetBottles; i++) {
        const xNorm = 0.15 + (0.7 * (i / (data.dailyConfig.targetBottles - 1)));
        const tier = i % 3 === 0 ? 'far' : i % 2 === 0 ? 'mid' : 'near';
        this.levelData.targets.push({
          id: `daily_${i}`,
          type: i === 0 ? 'golden' : i % 4 === 0 ? 'dynamite' : i % 2 === 0 ? 'amber' : 'standard',
          shelfTier: tier,
          xNorm,
          movement: data.dailyConfig.hasMoving && i % 2 === 1 ? { type: 'horizontal', speed: 80, distance: 160 } : undefined
        });
      }
      if (data.dailyConfig.hasObstacles) {
        this.levelData.obstacles = [
          { id: 'daily_obs', shelfTier: 'near', xNorm: 0.5, width: 80, height: 100, movement: { type: 'horizontal', speed: 85, distance: 160 } }
        ];
      }
    } else {
      const levelId = data.levelId || 1;
      this.levelData = getLevelById(levelId);
      if (data.bonusAmmo) {
        // Clone with bonus ammo if rewarded ad granted
        this.levelData = { ...this.levelData, ammo: this.levelData.ammo + data.bonusAmmo };
      }
    }
  }

  create(): void {
    const { width, height } = this.scale;
    const adapter = getPlayablesAdapter();
    this.saveManager = SaveManager.getInstance();
    this.skinManager = SkinManager.getInstance();
    this.audio = AudioManager.getInstance();

    // 1. Layered Background (Horizon sunset & shooting gallery wall)
    this.createAtmosphericBackground(width, height);

    // 2. HUD Overlay (must be created before systems that dispatch initial state updates)
    this.createHUD(width, height);

    // 3. Scoring System
    this.scoringSystem = new ScoringSystem((event: ScoreEvent) => {
      this.showScorePopup(event);
    });

    // 4. Level Manager (3D Shelves, targets, obstacles, win/fail)
    this.levelManager = new LevelManager(this, this.levelData, {
      onWin: () => this.handleWin(),
      onFail: (reason: 'ammo' | 'time') => this.handleFail(reason),
      onTargetCountChange: (rem, total) => this.updateTargetCounter(rem, total),
      onTimeUpdate: (sec) => this.updateTimer(sec)
    });

    // 5. Shooting System (First-person gun, reticle, recoil, raycast)
    const equippedSkin = this.skinManager.getEquippedSkin();
    this.shootingSystem = new ShootingSystem(
      this,
      equippedSkin,
      this.levelData.ammo,
      this.scoringSystem,
      (loaded, capacity, isReloading, reserve, total) => {
        this.updateAmmoDisplay(loaded, capacity, isReloading, reserve, total);
        this.levelManager.checkAmmoFail(total, isReloading);
      }
    );

    // 6. Interactive Tutorial for Level 1
    if (this.levelData.id === 1 && !this.isDaily) {
      this.createTutorialOverlay(width, height);
    }

    // 7. Input Listeners
    this.setupInput();

    // Listen for scene resume to restore input responsiveness
    this.events.on('resume', () => {
      this.isPaused = false;
    });

    // Register cleanup on scene shutdown (Phaser calls shutdown, NOT destroy, on scene transitions)
    this.events.once('shutdown', () => {
      this.cleanupScene();
    });

    // 8. YouTube SDK Pause/Resume Listeners
    this.removePlatformPause = adapter.onPause(() => {
      this.pauseGame();
    });
    this.removePlatformResume = adapter.onResume(() => {
      this.resumeGame();
    });
  }

  private createAtmosphericBackground(width: number, height: number): void {
    const bg = this.add.graphics().setDepth(50);
    // Scenic twilight sunset gradient
    bg.fillGradientStyle(0x4a1805, 0x4a1805, 0x1f0d06, 0x1f0d06, 1);
    bg.fillRect(0, 0, width, height);

    // Distant mountain ridge silhouette
    const ridge = this.add.graphics().setDepth(60);
    ridge.fillStyle(0x180904, 0.7);
    ridge.beginPath();
    ridge.moveTo(0, height * 0.38);
    ridge.lineTo(width * 0.25, height * 0.28);
    ridge.lineTo(width * 0.55, height * 0.35);
    ridge.lineTo(width * 0.8, height * 0.26);
    ridge.lineTo(width, height * 0.36);
    ridge.lineTo(width, height);
    ridge.lineTo(0, height);
    ridge.closePath();
    ridge.fill();

    // Carnival festive bunting flags string across top
    const bunting = this.add.graphics().setDepth(220);
    const numFlags = 14;
    const flagW = width / numFlags;
    const colors = [0xd50000, 0xffd600, 0x2979ff, 0x00e676];

    for (let i = 0; i < numFlags; i++) {
      const fx = i * flagW;
      const fy = 65 + Math.sin((i / numFlags) * Math.PI) * 22;
      bunting.fillStyle(colors[i % colors.length], 0.85);
      bunting.beginPath();
      bunting.moveTo(fx, fy);
      bunting.lineTo(fx + flagW, fy + 4);
      bunting.lineTo(fx + flagW / 2, fy + 32);
      bunting.closePath();
      bunting.fill();
    }
  }

  private createHUD(width: number, height: number): void {
    this.hudContainer = this.add.container(0, 0).setDepth(1500);

    // Top Bar Ribbon
    const topBar = this.add.graphics();
    topBar.fillStyle(0x0e0604, 0.88);
    topBar.fillRect(0, 0, width, 58);
    topBar.lineStyle(1.5, 0xc8963e, 0.5);
    topBar.lineBetween(0, 58, width, 58);
    this.hudContainer.add(topBar);

    // Level Title / Indicator
    const levelTitle = this.isDaily ? 'DAILY CHALLENGE' : `LEVEL ${this.levelData.id}`;
    const levelText = this.add.text(18, 16, levelTitle, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffb300',
      fontStyle: 'bold'
    });

    // Score Display (Rolling counter)
    this.scoreText = this.add.text(width / 2, 16, 'SCORE: 0', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0);

    // Target Counter (Bottles Left)
    this.targetCounterText = this.add.text(width - 80, 16, `🎯 ${this.levelData.targets.length}`, {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#81d4fa',
      fontStyle: 'bold'
    }).setOrigin(1, 0);

    // Pause Button in top right
    const pauseBtn = this.add.container(width - 34, 28);
    const pBg = this.add.circle(0, 0, 18, 0x271714, 0.9);
    pBg.setStrokeStyle(1.5, 0xffb300, 0.8);
    const pIcon = this.add.text(0, 0, '❚❚', { fontSize: '12px', color: '#ffb300' }).setOrigin(0.5);
    const pZone = this.add.zone(0, 0, 44, 44).setOrigin(0.5).setInteractive({ useHandCursor: true });
    pauseBtn.add([pBg, pIcon, pZone]);
    pZone.on('pointerdown', () => {
      this.audio.playClick();
      this.pauseGame();
    });

    this.hudContainer.add([levelText, this.scoreText, this.targetCounterText, pauseBtn]);

    // Timer display if timed round
    if (this.levelData.timeLimitSec) {
      this.timerText = this.add.text(width / 2, 64, `⏱ ${this.levelData.timeLimitSec}s`, {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#ff5252',
        fontStyle: 'bold',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { x: 8, y: 3 }
      }).setOrigin(0.5, 0);
      this.hudContainer.add(this.timerText);
    }

    // Combo Meter (Right side below top bar)
    this.comboContainer = this.add.container(width - 90, 80);
    const comboBg = this.add.graphics();
    comboBg.fillStyle(0x1a0f0a, 0.8);
    comboBg.fillRoundedRect(-50, -12, 100, 24, 12);
    comboBg.lineStyle(1.5, 0xff9800, 0.7);
    comboBg.strokeRoundedRect(-50, -12, 100, 24, 12);

    this.comboFill = this.add.graphics();

    this.comboLabel = this.add.text(0, 0, '1.0x', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffcc80',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.comboContainer.add([comboBg, this.comboFill, this.comboLabel]);
    this.hudContainer.add(this.comboContainer);

    // Ammunition Display (Bottom Left)
    this.createAmmoHUD(height);

    // Reload Prompt
    this.reloadPromptText = this.add.text(width / 2, height - 90, '', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ff5252',
      fontStyle: 'bold',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setAlpha(0);
    this.hudContainer.add(this.reloadPromptText);
  }

  private createAmmoHUD(height: number): void {
    const ammoContainer = this.add.container(25, height - 45);
    const capacity = this.skinManager.getEquippedSkin().stats.capacity;

    this.ammoIcons = [];
    for (let i = 0; i < capacity; i++) {
      const bullet = this.add.sprite(i * 18, 0, 'ammo_bullet')
        .setScale(0.8)
        .setOrigin(0.5);
      this.ammoIcons.push(bullet);
      ammoContainer.add(bullet);
    }

    // Reserve Ammo count text badge
    const initialReserve = Math.max(0, this.levelData.ammo - capacity);
    this.ammoReserveText = this.add.text((capacity * 18) + 8, 0, `+${initialReserve}`, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#ffb300',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    ammoContainer.add(this.ammoReserveText);

    // Interactive Reload Button next to ammo
    const reloadBtn = this.add.container((capacity * 18) + 55, 0);
    const rBg = this.add.graphics();
    rBg.fillStyle(0x3e2723, 0.85);
    rBg.fillRoundedRect(-18, -16, 36, 32, 8);
    rBg.lineStyle(1.5, 0xffb300, 0.6);
    rBg.strokeRoundedRect(-18, -16, 36, 32, 8);

    const rIcon = this.add.text(0, 0, '⟳', {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      color: '#ffb300',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const rZone = this.add.zone(0, 0, 44, 40).setOrigin(0.5).setInteractive({ useHandCursor: true });
    reloadBtn.add([rBg, rIcon, rZone]);
    rZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Prevent event bubbling or pointerdown misfire
      pointer.event?.stopPropagation?.();
      this.shootingSystem.reload();
    });

    ammoContainer.add(reloadBtn);
    this.hudContainer.add(ammoContainer);
  }

  private createTutorialOverlay(width: number, height: number): void {
    const container = this.add.container(width / 2, height * 0.24).setDepth(1800);
    this.tutorialContainer = container;

    const bannerBg = this.add.graphics();
    const bW = Math.min(width * 0.88, 440);
    bannerBg.fillStyle(0x1a0f0a, 0.92);
    bannerBg.fillRoundedRect(-bW / 2, -30, bW, 60, 14);
    bannerBg.lineStyle(2, 0xffd54f, 0.9);
    bannerBg.strokeRoundedRect(-bW / 2, -30, bW, 60, 14);

    const text = this.add.text(0, 0, '👆 Tap or Click any bottle to aim and fire!\n[Space] fires, [R] reloads', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#fff',
      align: 'center',
      lineSpacing: 4
    }).setOrigin(0.5);

    container.add([bannerBg, text]);

    // Auto fade after 5 seconds or upon first shot
    this.time.delayedCall(5500, () => {
      if (this.tutorialContainer) {
        this.tweens.add({
          targets: this.tutorialContainer,
          alpha: 0,
          duration: 400,
          onComplete: () => {
            this.tutorialContainer?.destroy();
            this.tutorialContainer = undefined;
          }
        });
      }
    });
  }

  private setupInput(): void {
    // Touch & Mouse Movement tracking
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPaused) return;
      this.shootingSystem.updateAim(pointer.x, pointer.y);
    });

    // Touch & Mouse Shooting
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      if (this.isPaused) return;

      // Ignore touches on HUD interactive controls (e.g. Pause button, Reload button)
      if (currentlyOver && currentlyOver.length > 0) return;
      if (pointer.y < 58) return;

      // Dismiss tutorial if active
      if (this.tutorialContainer) {
        this.tutorialContainer.destroy();
        this.tutorialContainer = undefined;
      }

      this.shootingSystem.updateAim(pointer.x, pointer.y);
      this.shootingSystem.shoot(this.levelManager.getTargets(), this.levelManager.getObstacles());
    });

    // Keyboard controls
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.reloadKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.pauseKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

      this.spaceKey.on('down', () => {
        if (!this.isPaused) {
          if (this.tutorialContainer) {
            this.tutorialContainer.destroy();
            this.tutorialContainer = undefined;
          }
          this.shootingSystem.shoot(this.levelManager.getTargets(), this.levelManager.getObstacles());
        }
      });

      this.reloadKey.on('down', () => {
        if (!this.isPaused) {
          this.shootingSystem.reload();
        }
      });

      this.pauseKey.on('down', () => {
        if (this.isPaused) {
          this.resumeGame();
        } else {
          this.pauseGame();
        }
      });
    }
  }

  update(_time: number, delta: number): void {
    if (this.isPaused) return;

    // Update level entities (moving targets & obstacles)
    this.levelManager.update(delta);

    // Update combo expiration
    const comboDropped = this.scoringSystem.update(Date.now());
    if (comboDropped) {
      this.updateComboHUD();
    }
  }

  private showScorePopup(event: ScoreEvent): void {
    // Floating score animation
    const textStr = event.label ? `+${event.totalAdded}\n${event.label}` : `+${event.totalAdded}`;
    const popup = this.add.text(event.x, event.y - 20, textStr, {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: event.isComboMilestone ? '24px' : '18px',
      color: event.isComboMilestone ? '#ffd700' : '#ffffff',
      stroke: '#b71c1c',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5).setDepth(1600);

    this.tweens.add({
      targets: popup,
      y: event.y - 75,
      alpha: 0,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 750,
      ease: 'Quad.easeOut',
      onComplete: () => popup.destroy()
    });

    // Update score text in HUD
    this.scoreText.setText(`SCORE: ${this.scoringSystem.getScore()}`);
    this.updateComboHUD();
  }

  private updateComboHUD(): void {
    const combo = this.scoringSystem.getCombo();
    this.comboLabel.setText(`${combo.toFixed(1)}x`);

    this.comboFill.clear();
    if (combo > 1.0) {
      const progress = this.scoringSystem.getComboProgress();
      this.comboFill.fillStyle(combo >= 2.5 ? 0xff1744 : 0xff9800, 0.85);
      this.comboFill.fillRoundedRect(-48, -10, 96 * progress, 20, 10);
      this.comboLabel.setColor(combo >= 2.5 ? '#ffff00' : '#ffffff');
    }
  }

  private updateAmmoDisplay(
    current: number,
    max: number,
    isReloading: boolean,
    reserve = 0,
    total = 0
  ): void {
    if (this.ammoIcons && this.ammoIcons.length > 0) {
      this.ammoIcons.forEach((icon, idx) => {
        if (idx < current) {
          icon.setTexture('ammo_bullet').setAlpha(1);
        } else {
          icon.setTexture('ammo_empty').setAlpha(0.35);
        }
      });
    }

    if (this.ammoReserveText) {
      this.ammoReserveText.setText(`+${reserve}`);
      this.ammoReserveText.setColor(reserve > 0 ? '#ffb300' : '#757575');
    }

    if (this.reloadPromptText) {
      if (isReloading) {
        this.reloadPromptText.setText('RELOADING...').setAlpha(1);
      } else if (total === 0 && current === 0) {
        this.reloadPromptText.setText('OUT OF AMMO!').setAlpha(1);
      } else if (current === 0 && reserve > 0) {
        this.reloadPromptText.setText('RELOAD! ⟳ or [R]').setAlpha(1);
      } else {
        this.reloadPromptText.setAlpha(0);
      }
    }
  }

  private updateTargetCounter(remaining: number, total: number): void {
    if (this.targetCounterText) {
      this.targetCounterText.setText(`🎯 ${remaining}/${total}`);
    }
  }

  private updateTimer(seconds: number): void {
    if (this.timerText) {
      this.timerText.setText(`⏱ ${seconds}s`);
      if (seconds <= 5) {
        this.timerText.setColor('#ff1744');
      }
    }
  }

  private handleWin(): void {
    this.audio.playVictory();

    this.scene.start('ResultsScene', {
      win: true,
      score: this.scoringSystem.getScore(),
      hits: this.scoringSystem.getHits(),
      shots: this.scoringSystem.getShotsFired(),
      accuracy: this.scoringSystem.getAccuracy(),
      maxCombo: this.scoringSystem.getMaxCombo(),
      levelData: this.levelData,
      isDaily: this.isDaily
    });
  }

  private handleFail(reason: 'ammo' | 'time'): void {
    this.audio.playDefeat();

    this.scene.start('ResultsScene', {
      win: false,
      reason,
      score: this.scoringSystem.getScore(),
      hits: this.scoringSystem.getHits(),
      shots: this.scoringSystem.getShotsFired(),
      accuracy: this.scoringSystem.getAccuracy(),
      maxCombo: this.scoringSystem.getMaxCombo(),
      levelData: this.levelData,
      isDaily: this.isDaily
    });
  }

  private pauseGame(): void {
    if (this.isPaused) return;
    this.isPaused = true;
    this.scene.pause();
    this.scene.launch('PauseScene', {
      parentScene: 'GameScene',
      levelId: this.levelData.id,
      isDaily: this.isDaily
    });
  }

  private resumeGame(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.scene.resume();
    this.scene.stop('PauseScene');
  }

  private cleanupScene(): void {
    if (this.removePlatformPause) this.removePlatformPause();
    if (this.removePlatformResume) this.removePlatformResume();
    this.shootingSystem?.destroy();
    this.levelManager?.destroy();
  }
}

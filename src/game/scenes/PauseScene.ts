import Phaser from 'phaser';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../systems/SaveManager';

export class PauseScene extends Phaser.Scene {
  private audio!: AudioManager;
  private saveManager!: SaveManager;
  private parentSceneName = 'GameScene';
  private levelId = 1;
  private isDaily = false;

  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data: { parentScene?: string; levelId?: number; isDaily?: boolean }): void {
    if (data.parentScene) {
      this.parentSceneName = data.parentScene;
    }
    this.levelId = data.levelId || 1;
    this.isDaily = Boolean(data.isDaily);
  }

  create(): void {
    const { width, height } = this.scale;
    this.audio = AudioManager.getInstance();
    this.saveManager = SaveManager.getInstance();

    // Dark backdrop overlay
    const bg = this.add.rectangle(0, 0, width, height, 0x000000, 0.75)
      .setOrigin(0)
      .setInteractive();

    // Modal Card
    const cardW = Math.min(width * 0.85, 360);
    const cardH = 340;
    const cardX = (width - cardW) / 2;
    const cardY = (height - cardH) / 2;

    const card = this.add.graphics();
    card.fillStyle(0x1a0f0a, 0.98);
    card.fillRoundedRect(cardX, cardY, cardW, cardH, 16);
    card.lineStyle(2, 0xc8963e, 0.8);
    card.strokeRoundedRect(cardX, cardY, cardW, cardH, 16);

    // Title
    this.add.text(width / 2, cardY + 40, 'GAME PAUSED', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '28px',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 5
    }).setOrigin(0.5);

    // Action Buttons
    const startY = cardY + 110;
    const spacing = 52;

    // 1. Resume Button
    this.createButton(width / 2, startY, 'RESUME', 0x4caf50, () => {
      this.resumeParent();
    });

    // 2. Restart Button (retains current level)
    this.createButton(width / 2, startY + spacing, 'RESTART LEVEL', 0x1976d2, () => {
      this.audio.playClick();
      this.scene.stop(this.parentSceneName);
      this.scene.stop('PauseScene');
      this.scene.start('GameScene', { levelId: this.levelId, isDaily: this.isDaily });
    });

    // 3. Main Menu
    this.createButton(width / 2, startY + (spacing * 2), 'MAIN MENU', 0x5d4037, () => {
      this.audio.playClick();
      this.scene.stop(this.parentSceneName);
      this.scene.stop('PauseScene');
      this.scene.start('MenuScene');
    });

    // Keyboard shortcuts to resume
    if (this.input.keyboard) {
      const esc = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      const pKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);
      esc.once('down', () => this.resumeParent());
      pKey.once('down', () => this.resumeParent());
    }

    // Sound toggle in pause menu
    const isMuted = this.audio.isMuted();
    const soundToggle = this.add.text(width / 2, cardY + cardH - 32, isMuted ? '🔇 Audio: MUTED' : '🔊 Audio: ON', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#ffcc80',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    soundToggle.on('pointerup', async () => {
      this.audio.playClick();
      const newMuted = !this.audio.isMuted();
      this.audio.setUserMuted(newMuted);
      await this.saveManager.setSoundEnabled(!newMuted);
      soundToggle.setText(newMuted ? '🔇 Audio: MUTED' : '🔊 Audio: ON');
    });
  }

  private resumeParent(): void {
    this.audio.playClick();
    this.scene.stop('PauseScene');
    this.scene.resume(this.parentSceneName);
  }

  private createButton(
    x: number,
    y: number,
    text: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const btn = this.add.container(x, y);
    const w = 240;
    const h = 42;

    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
    bg.lineStyle(1.5, 0xffffff, 0.4);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);

    const label = this.add.text(0, 0, text, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const zone = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.add([bg, label, zone]);

    let handled = false;
    zone.on('pointerdown', () => {
      if (handled) return;
      handled = true;
      btn.setScale(0.95);
      this.time.delayedCall(70, () => {
        btn.setScale(1.0);
        onClick();
        this.time.delayedCall(300, () => { handled = false; });
      });
    });

    return btn;
  }
}

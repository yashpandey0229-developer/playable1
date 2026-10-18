import Phaser from 'phaser';
import { getPlayablesAdapter } from '../platform';
import { SaveManager } from '../systems/SaveManager';
import { AudioManager } from '../systems/AudioManager';
import { SkinManager } from '../systems/SkinManager';

export class LoadingScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LoadingScene' });
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;
    const adapter = getPlayablesAdapter();

    // Background gradient canvas or rect
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x26130b, 0x26130b, 0x0d0705, 0x0d0705, 1);
    bg.fillRect(0, 0, width, height);

    // Title
    const title = this.add.text(width / 2, height * 0.4, 'BOTTLE BLAST', {
      fontFamily: '"Impact", "Trebuchet MS", sans-serif',
      fontSize: '44px',
      color: '#ffb300',
      stroke: '#3e2723',
      strokeThickness: 8,
      align: 'center'
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.4 + 48, 'Arcade Shooting Gallery', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ffcc80',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Loading Bar Background
    const barWidth = Math.min(320, width * 0.7);
    const barHeight = 16;
    const barX = (width - barWidth) / 2;
    const barY = height * 0.65;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x3e2723, 0.8);
    barBg.fillRoundedRect(barX, barY, barWidth, barHeight, 8);
    barBg.lineStyle(2, 0xffb300, 0.6);
    barBg.strokeRoundedRect(barX, barY, barWidth, barHeight, 8);

    const barFill = this.add.graphics();

    const statusText = this.add.text(width / 2, barY + 32, 'Loading Cloud Data...', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#cfd8dc'
    }).setOrigin(0.5);

    // Animate progress bar smoothly
    let progress = 0;
    const progressInterval = this.time.addEvent({
      delay: 30,
      repeat: 25,
      callback: () => {
        progress += 0.04;
        barFill.clear();
        barFill.fillStyle(0xff9800, 1);
        barFill.fillRoundedRect(barX + 2, barY + 2, Math.min(barWidth - 4, (barWidth - 4) * progress), barHeight - 4, 6);
      }
    });

    // Initialize systems
    const saveManager = SaveManager.getInstance(adapter);
    const audioManager = AudioManager.getInstance(adapter);
    const skinManager = SkinManager.getInstance(saveManager, adapter);

    // Load cloud save
    await saveManager.load();
    await skinManager.checkAutoUnlocks();

    // Ensure audio setting sync
    audioManager.setUserMuted(!saveManager.isSoundEnabled());

    // Small delay for smooth visual transition
    this.time.delayedCall(800, () => {
      progressInterval.destroy();
      this.scene.start('MenuScene');
    });
  }
}

import Phaser from 'phaser';
import { getPlayablesAdapter } from '../platform';
import { WEAPON_SKINS, WeaponSkin } from '../data/weapons';
import { SaveManager } from '../systems/SaveManager';
import { SkinManager } from '../systems/SkinManager';
import { AudioManager } from '../systems/AudioManager';

export class SkinScene extends Phaser.Scene {
  private saveManager!: SaveManager;
  private skinManager!: SkinManager;
  private audio!: AudioManager;

  private currentSkinIndex = 0;
  private showcaseContainer!: Phaser.GameObjects.Container;
  private gunPreviewSprite!: Phaser.GameObjects.Sprite;
  private flashPreviewSprite!: Phaser.GameObjects.Sprite;
  private skinTitleText!: Phaser.GameObjects.Text;
  private skinDescText!: Phaser.GameObjects.Text;
  private statusBadgeText!: Phaser.GameObjects.Text;
  private actionBtnContainer!: Phaser.GameObjects.Container;
  private actionBtnLabel!: Phaser.GameObjects.Text;
  private coinsDisplayText!: Phaser.GameObjects.Text;
  private statCapacityText!: Phaser.GameObjects.Text;
  private statFireRateText!: Phaser.GameObjects.Text;
  private statReloadText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'SkinScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.saveManager = SaveManager.getInstance();
    this.skinManager = SkinManager.getInstance();
    this.audio = AudioManager.getInstance();

    // Find index of currently equipped skin
    const equipped = this.skinManager.getEquippedSkin();
    this.currentSkinIndex = WEAPON_SKINS.findIndex(s => s.id === equipped.id);
    if (this.currentSkinIndex < 0) this.currentSkinIndex = 0;

    // 1. Dark armory showroom background
    this.createShowroomBackground(width, height);

    // 2. Top Header (Title, Back Button, Coins count)
    this.createHeader(width);

    // 3. Central 3D Gun Pedestal & Showcase
    this.createGunShowcase(width, height);

    // 4. Skin Carousel Arrows & Dots
    this.createCarouselControls(width, height);

    // 5. Stat Badges & Details
    this.createStatsPanel(width, height);

    // 6. Action Button (EQUIP / BUY / WATCH AD / LOCKED)
    this.createActionButton(width, height);

    // 7. Interactive Test Fire Button
    this.createTestFireButton(width, height);

    // Initial render
    this.updateSelectedSkinView();
  }

  private createShowroomBackground(width: number, height: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0f18, 0x1a0f18, 0x08040a, 0x08040a, 1);
    bg.fillRect(0, 0, width, height);

    // Armory spotlight effect
    const spot = this.add.graphics();
    spot.fillStyle(0xffffff, 0.05);
    spot.beginPath();
    spot.moveTo(width / 2 - 40, 0);
    spot.lineTo(width / 2 + 40, 0);
    spot.lineTo(width / 2 + 180, height * 0.58);
    spot.lineTo(width / 2 - 180, height * 0.58);
    spot.closePath();
    spot.fill();

    // Pedestal base
    const pedestal = this.add.graphics();
    pedestal.fillStyle(0x212121, 0.9);
    pedestal.fillEllipse(width / 2, height * 0.44, 260, 48);
    pedestal.lineStyle(2, 0xc8963e, 0.7);
    pedestal.strokeEllipse(width / 2, height * 0.44, 260, 48);
  }

  private createHeader(width: number): void {
    // Back Button
    const backBtn = this.add.container(40, 40);
    const bBg = this.add.circle(0, 0, 20, 0x271714, 0.85);
    bBg.setStrokeStyle(1.5, 0xc8963e, 0.8);
    const bIcon = this.add.text(0, 0, '←', { fontSize: '22px', color: '#ffb300' }).setOrigin(0.5);
    const bZone = this.add.zone(0, 0, 48, 48).setOrigin(0.5).setInteractive({ useHandCursor: true });
    backBtn.add([bBg, bIcon, bZone]);
    bZone.on('pointerdown', () => {
      this.audio.playClick();
      this.scene.start('MenuScene');
    });

    // Title
    this.add.text(width / 2, 40, 'GUN ARSENAL & SKINS', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '24px',
      color: '#ffd700',
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Coins Counter
    const coins = this.saveManager.getCoins();
    const coinContainer = this.add.container(width - 55, 40);
    const cIcon = this.add.sprite(-22, 0, 'coin_gold').setScale(0.7);
    this.coinsDisplayText = this.add.text(0, 0, `${coins}`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    coinContainer.add([cIcon, this.coinsDisplayText]);
  }

  private createGunShowcase(width: number, height: number): void {
    this.showcaseContainer = this.add.container(width / 2, height * 0.32);

    this.gunPreviewSprite = this.add.sprite(0, 0, `gun_${WEAPON_SKINS[0].id}`)
      .setScale(1.15)
      .setOrigin(0.5, 0.6);

    this.flashPreviewSprite = this.add.sprite(0, -140, `flash_${WEAPON_SKINS[0].id}`)
      .setOrigin(0.5)
      .setScale(0.8)
      .setAlpha(0);

    this.showcaseContainer.add([this.gunPreviewSprite, this.flashPreviewSprite]);

    // Idle sway tween
    this.tweens.add({
      targets: this.showcaseContainer,
      y: height * 0.32 - 10,
      angle: { from: -2, to: 2 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Titles
    this.skinTitleText = this.add.text(width / 2, height * 0.48, '', {
      fontFamily: '"Impact", "Arial Black", sans-serif',
      fontSize: '28px',
      color: '#ffeb3b',
      stroke: '#000',
      strokeThickness: 5
    }).setOrigin(0.5);

    this.statusBadgeText = this.add.text(width / 2, height * 0.53, '', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      backgroundColor: 'rgba(0,0,0,0.6)',
      padding: { x: 10, y: 4 }
    }).setOrigin(0.5);

    this.skinDescText = this.add.text(width / 2, height * 0.58, '', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#b0bec5',
      align: 'center',
      wordWrap: { width: Math.min(width * 0.85, 380) }
    }).setOrigin(0.5);
  }

  private createCarouselControls(width: number, height: number): void {
    const arrowY = height * 0.32;

    // Left Arrow
    const leftArrow = this.add.container(35, arrowY);
    const lBg = this.add.circle(0, 0, 22, 0x212121, 0.8);
    const lIcon = this.add.text(0, 0, '◀', { fontSize: '18px', color: '#ffb300' }).setOrigin(0.5);
    const lZone = this.add.zone(0, 0, 48, 48).setOrigin(0.5).setInteractive({ useHandCursor: true });
    leftArrow.add([lBg, lIcon, lZone]);
    lZone.on('pointerdown', () => {
      this.audio.playClick();
      this.currentSkinIndex = (this.currentSkinIndex - 1 + WEAPON_SKINS.length) % WEAPON_SKINS.length;
      this.updateSelectedSkinView();
    });

    // Right Arrow
    const rightArrow = this.add.container(width - 35, arrowY);
    const rBg = this.add.circle(0, 0, 22, 0x212121, 0.8);
    const rIcon = this.add.text(0, 0, '▶', { fontSize: '18px', color: '#ffb300' }).setOrigin(0.5);
    const rZone = this.add.zone(0, 0, 48, 48).setOrigin(0.5).setInteractive({ useHandCursor: true });
    rightArrow.add([rBg, rIcon, rZone]);
    rZone.on('pointerdown', () => {
      this.audio.playClick();
      this.currentSkinIndex = (this.currentSkinIndex + 1) % WEAPON_SKINS.length;
      this.updateSelectedSkinView();
    });
  }

  private createStatsPanel(width: number, height: number): void {
    const statsY = height * 0.65;
    const statW = Math.min(width * 0.92, 420);

    const statsBg = this.add.graphics();
    statsBg.fillStyle(0x1a0f0a, 0.9);
    statsBg.fillRoundedRect((width - statW) / 2, statsY - 22, statW, 44, 12);
    statsBg.lineStyle(1.5, 0xc8963e, 0.6);
    statsBg.strokeRoundedRect((width - statW) / 2, statsY - 22, statW, 44, 12);

    const colW = statW / 3;
    const col1X = (width - statW) / 2 + (colW * 0.5);
    const col2X = (width - statW) / 2 + (colW * 1.5);
    const col3X = (width - statW) / 2 + (colW * 2.5);

    this.statCapacityText = this.add.text(col1X, statsY, 'CAP: 6 RDS', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.statFireRateText = this.add.text(col2X, statsY, 'RATE: FAST', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#81d4fa',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.statReloadText = this.add.text(col3X, statsY, 'RELOAD: 1.4s', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#69f0ae',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private createActionButton(width: number, height: number): void {
    const btnY = height * 0.77;
    const btnW = Math.min(width * 0.8, 320);
    const btnH = 50;

    this.actionBtnContainer = this.add.container(width / 2, btnY);

    const bg = this.add.graphics();
    bg.name = 'bg';
    bg.fillGradientStyle(0x4caf50, 0x4caf50, 0x2e7d32, 0x2e7d32, 1);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    bg.lineStyle(1.5, 0xffffff, 0.5);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);

    this.actionBtnLabel = this.add.text(0, 0, 'EQUIP', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const actionZone = this.add.zone(0, 0, btnW, btnH).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.actionBtnContainer.add([bg, this.actionBtnLabel, actionZone]);

    actionZone.on('pointerdown', () => {
      this.handleActionClick();
    });
  }

  private createTestFireButton(width: number, height: number): void {
    const testBtn = this.add.container(width / 2, height * 0.87);
    const w = 180;
    const h = 36;

    const bg = this.add.graphics();
    bg.fillStyle(0x3e2723, 0.9);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    bg.lineStyle(1, 0xffb300, 0.6);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    const label = this.add.text(0, 0, '💥 TEST FIRE', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#ffcc80',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const tZone = this.add.zone(0, 0, w, h).setOrigin(0.5).setInteractive({ useHandCursor: true });
    testBtn.add([bg, label, tZone]);

    tZone.on('pointerdown', () => {
      const currentSkin = WEAPON_SKINS[this.currentSkinIndex];
      this.audio.playShoot(currentSkin);

      // Flash preview
      this.flashPreviewSprite.setTexture(`flash_${currentSkin.id}`);
      this.flashPreviewSprite.setAlpha(1);
      this.tweens.add({
        targets: this.flashPreviewSprite,
        alpha: 0,
        duration: 80
      });

      // Recoil preview
      this.tweens.add({
        targets: this.gunPreviewSprite,
        y: -15,
        angle: -6,
        duration: 60,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    });
  }

  private updateSelectedSkinView(): void {
    const skin = WEAPON_SKINS[this.currentSkinIndex];
    const isUnlocked = this.skinManager.isSkinUnlocked(skin.id);
    const isEquipped = this.skinManager.getEquippedSkin().id === skin.id;

    // Update gun sprite
    this.gunPreviewSprite.setTexture(`gun_${skin.id}`);
    this.flashPreviewSprite.setTexture(`flash_${skin.id}`);
    this.skinTitleText.setText(skin.name.toUpperCase());
    this.skinDescText.setText(skin.description);

    // Update Status Badge & Action Button
    const bg = this.actionBtnContainer.getByName('bg') as Phaser.GameObjects.Graphics;
    const btnW = Math.min(this.scale.width * 0.8, 320);
    const btnH = 50;

    if (isEquipped) {
      this.statusBadgeText.setText('CURRENTLY EQUIPPED').setColor('#69f0ae');
      this.actionBtnLabel.setText('EQUIPPED ✓');
      this.actionBtnContainer.setAlpha(0.6);
      bg.clear();
      bg.fillStyle(0x37474f, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    } else if (isUnlocked) {
      this.statusBadgeText.setText('OWNED IN ARSENAL').setColor('#81d4fa');
      this.actionBtnLabel.setText('EQUIP WEAPON');
      this.actionBtnContainer.setAlpha(1);
      bg.clear();
      bg.fillStyle(0x1976d2, 1);
      bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
    } else {
      // Locked state
      this.actionBtnContainer.setAlpha(1);
      if (skin.unlockType === 'coins') {
        const canAfford = this.saveManager.getCoins() >= skin.unlockValue;
        this.statusBadgeText.setText(`COST: ${skin.unlockValue} COINS`).setColor(canAfford ? '#ffd700' : '#ff8a80');
        this.actionBtnLabel.setText(`UNLOCK FOR ${skin.unlockValue} COINS`);
        bg.clear();
        bg.fillStyle(canAfford ? 0xff8f00 : 0x424242, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      } else if (skin.unlockType === 'ad') {
        this.statusBadgeText.setText('SPECIAL REWARD SKIN').setColor('#ba68c8');
        this.actionBtnLabel.setText('📺 WATCH AD TO UNLOCK');
        bg.clear();
        bg.fillStyle(0x7b1fa2, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      } else if (skin.unlockType === 'level') {
        this.statusBadgeText.setText(`REACH LEVEL ${skin.unlockValue} TO UNLOCK`).setColor('#ff8a80');
        this.actionBtnLabel.setText(`LOCKED (LEVEL ${skin.unlockValue})`);
        bg.clear();
        bg.fillStyle(0x424242, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      } else if (skin.unlockType === 'stars') {
        const stars = this.saveManager.getTotalStars();
        this.statusBadgeText.setText(`REQUIRES ${skin.unlockValue} STARS (${stars}/${skin.unlockValue})`).setColor('#ff8a80');
        this.actionBtnLabel.setText(`LOCKED (${skin.unlockValue} STARS)`);
        bg.clear();
        bg.fillStyle(0x424242, 1);
        bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 12);
      }
    }

    // Update stats labels
    if (this.statCapacityText && this.statFireRateText && this.statReloadText) {
      this.statCapacityText.setText(`CAP: ${skin.stats.capacity} RDS`);
      const speedLabel = skin.stats.fireRateMs <= 200 ? 'RAPID' : skin.stats.fireRateMs <= 240 ? 'FAST' : 'STANDARD';
      this.statFireRateText.setText(`RATE: ${speedLabel}`);
      this.statReloadText.setText(`RELOAD: ${(skin.stats.reloadTimeMs / 1000).toFixed(1)}s`);
    }

    // Refresh coins display
    this.coinsDisplayText.setText(`${this.saveManager.getCoins()}`);
  }

  private async handleActionClick(): Promise<void> {
    const skin = WEAPON_SKINS[this.currentSkinIndex];
    const isUnlocked = this.skinManager.isSkinUnlocked(skin.id);
    const isEquipped = this.skinManager.getEquippedSkin().id === skin.id;

    if (isEquipped) return;

    if (isUnlocked) {
      this.audio.playClick();
      await this.skinManager.equipSkin(skin.id);
      this.updateSelectedSkinView();
      return;
    }

    if (skin.unlockType === 'coins') {
      const bought = await this.skinManager.purchaseWithCoins(skin);
      if (bought) {
        this.audio.playVictory();
        this.updateSelectedSkinView();
      } else {
        this.audio.playDefeat();
      }
    } else if (skin.unlockType === 'ad') {
      this.audio.playClick();
      this.actionBtnLabel.setText('Loading Ad...');
      const earned = await this.skinManager.unlockViaRewardedAd(skin);
      if (earned) {
        this.audio.playVictory();
      }
      this.updateSelectedSkinView();
    }
  }
}

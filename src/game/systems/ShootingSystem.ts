import Phaser from 'phaser';
import { WeaponSkin } from '../data/weapons';
import { AudioManager } from './AudioManager';
import { ScoringSystem } from './ScoringSystem';

export interface TargetEntity {
  id: string;
  type: string;
  shelfTier: 'near' | 'mid' | 'far';
  gameObject: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  hitBox: Phaser.Geom.Rectangle;
  isDestroyed: boolean;
  isMoving: boolean;
  isHanging?: boolean;
  ropeGraphics?: Phaser.GameObjects.Graphics;
  shatter: () => void;
}

export interface ObstacleEntity {
  id: string;
  shelfTier: 'near' | 'mid' | 'far';
  gameObject: Phaser.GameObjects.Sprite;
  hitBox: Phaser.Geom.Rectangle;
}

export class ShootingSystem {
  private scene: Phaser.Scene;
  private skin: WeaponSkin;
  private audio: AudioManager;
  private scoring: ScoringSystem;

  // Gun & Reticle GameObjects
  private gunContainer!: Phaser.GameObjects.Container;
  private gunSprite!: Phaser.GameObjects.Sprite;
  private muzzleFlash!: Phaser.GameObjects.Sprite;
  private reticle!: Phaser.GameObjects.Sprite;
  private reticleHit!: Phaser.GameObjects.Sprite;

  // State
  private loadedAmmo: number;
  private totalAmmo: number;
  private capacity: number;
  private isReloading = false;
  private lastShotTime = 0;
  private aimX = 0;
  private aimY = 0;
  private gunBaseX = 0;
  private gunBaseY = 0;
  private recoilOffset = 0;
  private recoilAngle = 0;

  private onAmmoChangeCallback?: (
    loaded: number,
    capacity: number,
    isReloading: boolean,
    reserve: number,
    total: number
  ) => void;
  private onHitCallback?: (target: TargetEntity) => void;

  constructor(
    scene: Phaser.Scene,
    skin: WeaponSkin,
    maxAmmo: number,
    scoring: ScoringSystem,
    onAmmoChange?: (
      loaded: number,
      capacity: number,
      isReloading: boolean,
      reserve: number,
      total: number
    ) => void,
    onHit?: (target: TargetEntity) => void
  ) {
    this.scene = scene;
    this.skin = skin;
    this.capacity = skin.stats.capacity;
    this.totalAmmo = maxAmmo;
    this.loadedAmmo = Math.min(this.capacity, this.totalAmmo);
    this.scoring = scoring;
    this.audio = AudioManager.getInstance();
    this.onAmmoChangeCallback = onAmmoChange;
    this.onHitCallback = onHit;

    this.createGameObjects();
  }

  private createGameObjects(): void {
    const { width, height } = this.scene.scale;
    this.aimX = width / 2;
    this.aimY = height / 2;
    this.gunBaseX = width / 2;
    this.gunBaseY = height + 40;

    // Reticle
    this.reticle = this.scene.add.sprite(this.aimX, this.aimY, 'crosshair')
      .setDepth(1000)
      .setOrigin(0.5);

    this.reticleHit = this.scene.add.sprite(this.aimX, this.aimY, 'crosshair_hit')
      .setDepth(1001)
      .setOrigin(0.5)
      .setAlpha(0);

    // Gun Container (anchored near bottom center of screen)
    this.gunContainer = this.scene.add.container(this.gunBaseX, this.gunBaseY).setDepth(900);

    // Gun Sprite
    this.gunSprite = this.scene.add.sprite(0, 0, `gun_${this.skin.id}`)
      .setOrigin(0.5, 0.85);

    // Muzzle Flash
    this.muzzleFlash = this.scene.add.sprite(0, -180, `flash_${this.skin.id}`)
      .setOrigin(0.5)
      .setAlpha(0)
      .setScale(0.8);

    this.gunContainer.add([this.gunSprite, this.muzzleFlash]);

    // Initial ammo notify
    this.notifyAmmo();
  }

  updateAim(worldX: number, worldY: number): void {
    this.aimX = worldX;
    this.aimY = worldY;

    this.reticle.setPosition(worldX, worldY);
    this.reticleHit.setPosition(worldX, worldY);

    // First person gun subtle parallax aim tilt
    const { width } = this.scene.scale;
    const normX = (worldX - width / 2) / (width / 2);
    const targetGunX = this.gunBaseX + (normX * 90);
    this.gunContainer.x += (targetGunX - this.gunContainer.x) * 0.15;

    // Recoil spring recovery
    this.recoilOffset *= 0.82;
    this.recoilAngle *= 0.82;
    this.gunContainer.y = this.gunBaseY + this.recoilOffset;
    this.gunContainer.angle = (normX * 12) + this.recoilAngle;
  }

  canShoot(): boolean {
    const now = this.scene.time.now;
    return (
      !this.isReloading &&
      this.loadedAmmo > 0 &&
      now - this.lastShotTime >= this.skin.stats.fireRateMs
    );
  }

  shoot(targets: TargetEntity[], obstacles: ObstacleEntity[]): boolean {
    if (!this.canShoot()) {
      if (this.loadedAmmo <= 0 && this.getReserveAmmo() > 0 && !this.isReloading) {
        this.reload();
      }
      return false;
    }

    this.lastShotTime = this.scene.time.now;
    this.loadedAmmo--;
    this.totalAmmo--;
    this.scoring.recordShot();

    // 1. Play gun sound
    this.audio.playShoot(this.skin);

    // 2. Gun Recoil & Muzzle Flash Animation
    this.triggerRecoilAndFlash();

    // 3. Screen shake
    this.scene.cameras.main.shake(80, 0.0035);

    // 4. Bullet Tracer & Raycast Hit Detection
    this.performHitScan(this.aimX, this.aimY, targets, obstacles);

    // Notify ammo state AFTER hit scan has resolved
    this.notifyAmmo();

    // Auto reload if clip is empty and reserve ammo remains
    if (this.loadedAmmo === 0 && this.getReserveAmmo() > 0) {
      this.scene.time.delayedCall(250, () => {
        if (this.loadedAmmo === 0 && this.getReserveAmmo() > 0 && !this.isReloading) {
          this.reload();
        }
      });
    }

    return true;
  }

  private triggerRecoilAndFlash(): void {
    // Spring kickback
    this.recoilOffset = this.skin.stats.recoilAmount;
    this.recoilAngle = -8 + (Math.random() * 4);

    // Muzzle flash burst
    this.muzzleFlash.setAlpha(1);
    this.muzzleFlash.setScale(0.9 + Math.random() * 0.3);
    this.muzzleFlash.setAngle(Math.random() * 360);

    this.scene.tweens.add({
      targets: this.muzzleFlash,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 65,
      ease: 'Quad.easeOut'
    });
  }

  private performHitScan(
    targetX: number,
    targetY: number,
    targets: TargetEntity[],
    obstacles: ObstacleEntity[]
  ): void {
    // Spawn bullet tracer beam from gun barrel to aim point
    const muzzleWorldX = this.gunContainer.x;
    const muzzleWorldY = this.gunContainer.y - 180;

    const tracer = this.scene.add.graphics().setDepth(850);
    tracer.lineStyle(3, this.skin.visuals.tracerColor, 0.95);
    tracer.lineBetween(muzzleWorldX, muzzleWorldY, targetX, targetY);

    this.scene.tweens.add({
      targets: tracer,
      alpha: 0,
      duration: 70,
      onComplete: () => tracer.destroy()
    });

    // Check hit on Obstacles first (near to far)
    let obstacleBlocked = false;
    for (const obs of obstacles) {
      if (obs.hitBox.contains(targetX, targetY)) {
        obstacleBlocked = true;
        this.audio.playObstacleHit();
        this.spawnImpactSparks(targetX, targetY, 0xffa726);
        this.scoring.recordMiss();
        break;
      }
    }

    if (obstacleBlocked) return;

    // Check hit on Bottles (sorted by depth: near -> mid -> far)
    const sortedTargets = [...targets].filter(t => !t.isDestroyed).sort((a, b) => {
      const depthOrder = { near: 0, mid: 1, far: 2 };
      return depthOrder[a.shelfTier] - depthOrder[b.shelfTier];
    });

    let hitTarget: TargetEntity | null = null;
    for (const target of sortedTargets) {
      if (target.hitBox.contains(targetX, targetY)) {
        hitTarget = target;
        break;
      }
    }

    if (hitTarget) {
      // Hit confirmed!
      this.triggerHitConfirmation();
      const scoreEvent = this.scoring.recordHit(
        hitTarget.type as any,
        hitTarget.shelfTier,
        hitTarget.isMoving,
        targetX,
        targetY
      );

      // Play audio & combo sound
      this.audio.playGlassBreak(hitTarget.type);
      if (scoreEvent.isComboMilestone) {
        this.audio.playCombo(scoreEvent.multiplier);
      }

      // Shatter the bottle entity
      hitTarget.shatter();

      if (this.onHitCallback) {
        this.onHitCallback(hitTarget);
      }
    } else {
      // Missed shot
      this.scoring.recordMiss();
      this.spawnMissImpact(targetX, targetY);
    }
  }

  private triggerHitConfirmation(): void {
    this.reticleHit.setAlpha(1).setScale(1.2);
    this.scene.tweens.add({
      targets: this.reticleHit,
      alpha: 0,
      scaleX: 1.0,
      scaleY: 1.0,
      duration: 140,
      ease: 'Quad.easeOut'
    });
  }

  private spawnImpactSparks(x: number, y: number, color: number): void {
    const emitter = this.scene.add.particles(x, y, 'drop_gold', {
      speed: { min: 80, max: 220 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: 250,
      tint: color,
      quantity: 8,
      blendMode: 'ADD'
    }).setDepth(860);

    this.scene.time.delayedCall(250, () => emitter.destroy());
  }

  private spawnMissImpact(x: number, y: number): void {
    const hole = this.scene.add.sprite(x, y, 'bullet_impact')
      .setDepth(150)
      .setScale(0.85);

    this.scene.tweens.add({
      targets: hole,
      alpha: 0,
      duration: 3500,
      delay: 1500,
      onComplete: () => hole.destroy()
    });
  }

  reload(): void {
    if (this.isReloading || this.loadedAmmo >= this.capacity || this.getReserveAmmo() <= 0) return;

    this.isReloading = true;
    this.audio.playReload();
    this.notifyAmmo();

    // Animate gun lower during reload
    this.scene.tweens.add({
      targets: this.gunContainer,
      y: this.gunBaseY + 80,
      duration: this.skin.stats.reloadTimeMs * 0.45,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        const needed = this.capacity - this.loadedAmmo;
        const toLoad = Math.min(needed, this.getReserveAmmo());
        this.loadedAmmo += toLoad;
        this.isReloading = false;
        this.notifyAmmo();
      }
    });
  }

  private notifyAmmo(): void {
    if (this.onAmmoChangeCallback) {
      this.onAmmoChangeCallback(
        this.loadedAmmo,
        this.capacity,
        this.isReloading,
        this.getReserveAmmo(),
        this.totalAmmo
      );
    }
  }

  getAmmo(): number {
    return this.loadedAmmo;
  }

  getTotalAmmo(): number {
    return this.totalAmmo;
  }

  getReserveAmmo(): number {
    return Math.max(0, this.totalAmmo - this.loadedAmmo);
  }

  getMaxAmmo(): number {
    return this.capacity;
  }

  addBonusAmmo(amount: number): void {
    this.totalAmmo += amount;
    if (this.loadedAmmo === 0) {
      const toLoad = Math.min(this.capacity, this.totalAmmo);
      this.loadedAmmo = toLoad;
    }
    this.notifyAmmo();
  }

  setEquippedSkin(skin: WeaponSkin): void {
    this.skin = skin;
    this.capacity = skin.stats.capacity;
    this.gunSprite.setTexture(`gun_${skin.id}`);
    this.muzzleFlash.setTexture(`flash_${skin.id}`);
    this.notifyAmmo();
  }

  destroy(): void {
    this.reticle.destroy();
    this.reticleHit.destroy();
    this.gunContainer.destroy();
  }
}

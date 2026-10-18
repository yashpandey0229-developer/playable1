import Phaser from 'phaser';
import { LevelDefinition, TargetConfig, ObstacleConfig, ShelfTier } from '../data/levels';
import { TargetEntity, ObstacleEntity } from './ShootingSystem';

export interface ShelfLayout {
  y: number;
  scale: number;
  depth: number;
  leftX: number;
  rightX: number;
}

export class LevelManager {
  private scene: Phaser.Scene;
  private level: LevelDefinition;

  // Shelves
  private shelves: Record<ShelfTier, ShelfLayout> = {
    far: { y: 0, scale: 0.52, depth: 300, leftX: 0, rightX: 0 },
    mid: { y: 0, scale: 0.72, depth: 400, leftX: 0, rightX: 0 },
    near: { y: 0, scale: 1.0, depth: 500, leftX: 0, rightX: 0 }
  };

  // Entities
  private targets: TargetEntity[] = [];
  private obstacles: ObstacleEntity[] = [];
  private movingTargets: Array<{
    target: TargetEntity;
    config: NonNullable<TargetConfig['movement']>;
    baseX: number;
    time: number;
    isHanging?: boolean;
    anchorX?: number;
    anchorY?: number;
    ropeLen?: number;
  }> = [];
  private movingObstacles: Array<{ obstacle: ObstacleEntity; config: NonNullable<ObstacleConfig['movement']>; baseX: number; time: number }> = [];

  // Environment elements
  private envElements: Phaser.GameObjects.GameObject[] = [];

  // State
  private remainingBottles = 0;
  private isGameOver = false;
  private timeRemaining = 0;
  private timerEvent?: Phaser.Time.TimerEvent;

  private onWinCallback?: () => void;
  private onFailCallback?: (reason: 'ammo' | 'time') => void;
  private onTargetCountChange?: (remaining: number, total: number) => void;
  private onTimeUpdate?: (secondsLeft: number) => void;

  constructor(
    scene: Phaser.Scene,
    level: LevelDefinition,
    callbacks: {
      onWin: () => void;
      onFail: (reason: 'ammo' | 'time') => void;
      onTargetCountChange: (remaining: number, total: number) => void;
      onTimeUpdate?: (secondsLeft: number) => void;
    }
  ) {
    this.scene = scene;
    this.level = level;
    this.onWinCallback = callbacks.onWin;
    this.onFailCallback = callbacks.onFail;
    this.onTargetCountChange = callbacks.onTargetCountChange;
    this.onTimeUpdate = callbacks.onTimeUpdate;

    this.calculateShelves();
    this.buildEnvironment();
    this.spawnEntities();
    this.startTimerIfNeeded();
  }

  private calculateShelves(): void {
    const { width, height } = this.scene.scale;

    this.shelves.far = {
      y: height * 0.36,
      scale: 0.52,
      depth: 300,
      leftX: width * 0.12,
      rightX: width * 0.88
    };

    this.shelves.mid = {
      y: height * 0.52,
      scale: 0.72,
      depth: 400,
      leftX: width * 0.08,
      rightX: width * 0.92
    };

    this.shelves.near = {
      y: height * 0.70,
      scale: 1.0,
      depth: 500,
      leftX: width * 0.05,
      rightX: width * 0.95
    };
  }

  private buildEnvironment(): void {
    const { width, height } = this.scene.scale;

    // 1. Rustic Shooting Range Shelves
    (['far', 'mid', 'near'] as ShelfTier[]).forEach(tier => {
      const shelf = this.shelves[tier];
      const shelfWidth = (shelf.rightX - shelf.leftX) + 60;
      const shelfObj = this.scene.add.sprite(width / 2, shelf.y + (16 * shelf.scale), 'wood_shelf')
        .setDepth(shelf.depth)
        .setScale(shelf.scale * 1.05, shelf.scale)
        .setDisplaySize(shelfWidth, 38 * shelf.scale);
      this.envElements.push(shelfObj);
    });

    // 2. Hanging Lanterns with warm glow
    const lanternLeft = this.scene.add.sprite(width * 0.1, height * 0.18, 'lantern')
      .setDepth(250)
      .setScale(0.85);
    const lanternRight = this.scene.add.sprite(width * 0.9, height * 0.18, 'lantern')
      .setDepth(250)
      .setScale(0.85);

    // Subtle gentle pendulum swing for lanterns
    this.scene.tweens.add({
      targets: lanternLeft,
      angle: { from: -4, to: 4 },
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    this.scene.tweens.add({
      targets: lanternRight,
      angle: { from: 4, to: -4 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    this.envElements.push(lanternLeft, lanternRight);
  }

  private spawnEntities(): void {
    this.remainingBottles = this.level.targets.length;

    // Spawn Targets
    this.level.targets.forEach(cfg => {
      const shelf = this.shelves[cfg.shelfTier];
      const shelfSpan = shelf.rightX - shelf.leftX;
      const spawnX = shelf.leftX + (shelfSpan * cfg.xNorm);
      const spawnY = shelf.y + (cfg.yOffset || 0);

      const isHanging = Boolean(cfg.isHanging || cfg.movement?.type === 'pendulum');
      const textureKey = `bottle_${cfg.type}`;

      let sprite: Phaser.GameObjects.Sprite;
      let hitBox: Phaser.Geom.Rectangle;
      let ropeGraphics: Phaser.GameObjects.Graphics | undefined;
      const anchorX = spawnX;
      let anchorY = 0;
      const ropeLen = (cfg.ropeLength || 105) * shelf.scale;

      if (isHanging) {
        // Ceiling anchor point above shelf
        anchorY = Math.max(45, shelf.y - (55 * shelf.scale) - ropeLen);
        const bottleSpawnY = anchorY + ropeLen;

        // Bottle origin set at neck rim (0.5, 0.1) for realistic rotational swing
        sprite = this.scene.add.sprite(spawnX, bottleSpawnY, textureKey)
          .setOrigin(0.5, 0.1)
          .setScale(shelf.scale)
          .setDepth(shelf.depth + 10);

        // Suspension rope graphics
        ropeGraphics = this.scene.add.graphics().setDepth(shelf.depth + 5);
        ropeGraphics.lineStyle(2.5 * shelf.scale, 0xd7ccc8, 0.92);
        ropeGraphics.lineBetween(anchorX, anchorY, spawnX, bottleSpawnY);
        ropeGraphics.lineStyle(1 * shelf.scale, 0x8d6e63, 0.6);
        ropeGraphics.lineBetween(anchorX, anchorY, spawnX, bottleSpawnY);
        ropeGraphics.fillStyle(0x8d6e63, 1);
        ropeGraphics.fillCircle(anchorX, anchorY, 4 * shelf.scale);
        ropeGraphics.fillStyle(0xa1887f, 1);
        ropeGraphics.fillCircle(spawnX, bottleSpawnY, 3 * shelf.scale);

        // Hitbox for hanging bottle (origin 0.5, 0.1)
        const hitW = Math.max(38, 48 * shelf.scale);
        const hitH = Math.max(76, 115 * shelf.scale);
        hitBox = new Phaser.Geom.Rectangle(spawnX - hitW / 2, bottleSpawnY, hitW, hitH);
      } else {
        // Standard shelf-standing bottle
        sprite = this.scene.add.sprite(spawnX, spawnY, textureKey)
          .setOrigin(0.5, 0.95)
          .setScale(shelf.scale)
          .setDepth(shelf.depth + 10);

        const hitW = Math.max(38, 48 * shelf.scale);
        const hitH = Math.max(76, 115 * shelf.scale);
        hitBox = new Phaser.Geom.Rectangle(spawnX - hitW / 2, spawnY - hitH, hitW, hitH);
      }

      const entity: TargetEntity = {
        id: cfg.id,
        type: cfg.type,
        shelfTier: cfg.shelfTier,
        gameObject: sprite,
        hitBox,
        isDestroyed: false,
        isMoving: Boolean(cfg.movement),
        isHanging,
        ropeGraphics,
        shatter: () => this.shatterBottle(entity)
      };

      this.targets.push(entity);

      if (cfg.movement) {
        this.movingTargets.push({
          target: entity,
          config: cfg.movement,
          baseX: spawnX,
          time: cfg.movement.phase || 0,
          isHanging,
          anchorX,
          anchorY,
          ropeLen
        });
      }
    });

    // Spawn Obstacles
    if (this.level.obstacles) {
      this.level.obstacles.forEach(cfg => {
        const shelf = this.shelves[cfg.shelfTier];
        const shelfSpan = shelf.rightX - shelf.leftX;
        const spawnX = shelf.leftX + (shelfSpan * cfg.xNorm);
        const spawnY = shelf.y - (30 * shelf.scale) + (cfg.yOffset || 0);

        const sprite = this.scene.add.sprite(spawnX, spawnY, 'wood_obstacle')
          .setOrigin(0.5, 0.5)
          .setScale(shelf.scale)
          .setDepth(shelf.depth + 20);

        const hitW = cfg.width * shelf.scale;
        const hitH = cfg.height * shelf.scale;
        const hitBox = new Phaser.Geom.Rectangle(spawnX - hitW / 2, spawnY - hitH / 2, hitW, hitH);

        const obsEntity: ObstacleEntity = {
          id: cfg.id,
          shelfTier: cfg.shelfTier,
          gameObject: sprite,
          hitBox
        };

        this.obstacles.push(obsEntity);

        if (cfg.movement) {
          this.movingObstacles.push({
            obstacle: obsEntity,
            config: cfg.movement,
            baseX: spawnX,
            time: 0
          });
        }
      });
    }

    if (this.onTargetCountChange) {
      this.onTargetCountChange(this.remainingBottles, this.level.targets.length);
    }
  }

  private startTimerIfNeeded(): void {
    if (this.level.timeLimitSec && this.level.timeLimitSec > 0) {
      this.timeRemaining = this.level.timeLimitSec;
      if (this.onTimeUpdate) this.onTimeUpdate(this.timeRemaining);

      this.timerEvent = this.scene.time.addEvent({
        delay: 1000,
        repeat: this.level.timeLimitSec,
        callback: () => {
          if (this.isGameOver) return;
          this.timeRemaining--;
          if (this.onTimeUpdate) this.onTimeUpdate(this.timeRemaining);

          if (this.timeRemaining <= 0) {
            this.handleFail('time');
          }
        }
      });
    }
  }

  update(delta: number): void {
    if (this.isGameOver) return;
    const dt = delta / 1000;

    // Update Moving Targets
    this.movingTargets.forEach(m => {
      if (m.target.isDestroyed) return;
      const shelf = this.shelves[m.target.shelfTier];

      if (m.isHanging || m.config.type === 'pendulum') {
        m.time += dt * (m.config.speed / 42);
        const maxAngleRad = ((m.config.maxAngle || 24) * Math.PI) / 180;
        const currentAngle = maxAngleRad * Math.sin(m.time);

        const anchorX = m.anchorX ?? m.baseX;
        const anchorY = m.anchorY ?? (shelf.y - 120);
        const ropeLen = m.ropeLen ?? 90;

        const curX = anchorX + Math.sin(currentAngle) * ropeLen;
        const curY = anchorY + Math.cos(currentAngle) * ropeLen;

        m.target.gameObject.setPosition(curX, curY);
        m.target.gameObject.setRotation(currentAngle);

        if (m.target.ropeGraphics) {
          const ropeGfx = m.target.ropeGraphics;
          ropeGfx.clear();
          ropeGfx.lineStyle(2.5 * shelf.scale, 0xd7ccc8, 0.92);
          ropeGfx.lineBetween(anchorX, anchorY, curX, curY);
          ropeGfx.lineStyle(1 * shelf.scale, 0x8d6e63, 0.6);
          ropeGfx.lineBetween(anchorX, anchorY, curX, curY);
          ropeGfx.fillStyle(0x8d6e63, 1);
          ropeGfx.fillCircle(anchorX, anchorY, 4 * shelf.scale);
          ropeGfx.fillStyle(0xa1887f, 1);
          ropeGfx.fillCircle(curX, curY, 3 * shelf.scale);
        }

        const hitW = Math.max(38, 48 * shelf.scale);
        const hitH = Math.max(76, 115 * shelf.scale);
        m.target.hitBox.setTo(curX - hitW / 2, curY, hitW, hitH);
      } else {
        m.time += dt * (m.config.speed / 50);

        let offsetX = 0;
        let offsetY = 0;

        if (m.config.type === 'horizontal') {
          offsetX = Math.sin(m.time) * (m.config.distance / 2);
          const velocity = Math.cos(m.time);
          m.target.gameObject.setAngle(velocity * 3.5);
        } else if (m.config.type === 'sine') {
          offsetX = Math.sin(m.time) * (m.config.distance / 2);
          offsetY = Math.cos(m.time * 2) * 12;
          m.target.gameObject.setAngle(Math.sin(m.time * 2) * 4.5);
        }

        const curX = m.baseX + offsetX;
        const curY = shelf.y + offsetY;

        m.target.gameObject.setPosition(curX, curY);

        const hitW = Math.max(38, 48 * shelf.scale);
        const hitH = Math.max(76, 115 * shelf.scale);
        m.target.hitBox.setTo(curX - hitW / 2, curY - hitH, hitW, hitH);
      }
    });

    // Update Moving Obstacles
    this.movingObstacles.forEach(m => {
      m.time += dt * (m.config.speed / 50);
      const offsetX = Math.sin(m.time) * (m.config.distance / 2);
      const curX = m.baseX + offsetX;
      m.obstacle.gameObject.x = curX;

      const shelf = this.shelves[m.obstacle.shelfTier];
      const hitW = m.obstacle.hitBox.width;
      const hitH = m.obstacle.hitBox.height;
      m.obstacle.hitBox.x = curX - hitW / 2;
    });
  }

  private shatterBottle(target: TargetEntity): void {
    if (target.isDestroyed) return;
    target.isDestroyed = true;
    target.gameObject.setVisible(false);

    if (target.ropeGraphics) {
      target.ropeGraphics.destroy();
      target.ropeGraphics = undefined;
    }

    const shelf = this.shelves[target.shelfTier];
    const x = target.gameObject.x;
    const y = target.isHanging
      ? target.gameObject.y + (50 * shelf.scale)
      : target.gameObject.y - 45;

    // 1. Shards Particles
    const shardEmitter = this.scene.add.particles(x, y, 'shard_1', {
      speed: { min: 80 * shelf.scale, max: 240 * shelf.scale },
      angle: { min: 200, max: 340 },
      rotate: { start: 0, end: 360 },
      gravityY: 450,
      scale: { start: shelf.scale * 1.1, end: shelf.scale * 0.4 },
      lifespan: 600,
      quantity: 8
    }).setDepth(target.gameObject.depth + 5);

    // 2. Liquid Drops
    const dropKey = target.type === 'golden' ? 'drop_gold'
      : target.type === 'blue' ? 'drop_blue'
      : target.type === 'amber' ? 'drop_amber'
      : target.type === 'dynamite' ? 'drop_red'
      : 'drop_green';

    const liquidEmitter = this.scene.add.particles(x, y, dropKey, {
      speed: { min: 60 * shelf.scale, max: 190 * shelf.scale },
      angle: { min: 180, max: 360 },
      gravityY: 500,
      scale: { start: shelf.scale * 0.9, end: 0 },
      lifespan: 500,
      quantity: 12
    }).setDepth(target.gameObject.depth + 4);

    this.scene.time.delayedCall(700, () => {
      shardEmitter.destroy();
      liquidEmitter.destroy();
    });

    // Handle Explosive Dynamite
    if (target.type === 'dynamite') {
      this.triggerExplosion(x, y);
    }

    // Decrement count
    this.remainingBottles--;
    if (this.onTargetCountChange) {
      this.onTargetCountChange(this.remainingBottles, this.level.targets.length);
    }

    // Check Win Condition
    if (this.remainingBottles <= 0 && !this.isGameOver) {
      this.isGameOver = true;
      if (this.timerEvent) this.timerEvent.destroy();
      this.scene.time.delayedCall(350, () => {
        if (this.onWinCallback) this.onWinCallback();
      });
    }
  }

  private triggerExplosion(centerX: number, centerY: number): void {
    // Camera shake
    this.scene.cameras.main.shake(160, 0.008);

    // Blast wave particle ring
    const blastEmitter = this.scene.add.particles(centerX, centerY, 'drop_gold', {
      speed: { min: 140, max: 320 },
      angle: { min: 0, max: 360 },
      scale: { start: 1.2, end: 0 },
      lifespan: 400,
      quantity: 24,
      blendMode: 'ADD'
    }).setDepth(600);

    this.scene.time.delayedCall(450, () => blastEmitter.destroy());

    // Shatter adjacent bottles within 180px radius
    const radiusSq = 180 * 180;
    this.targets.forEach(t => {
      if (!t.isDestroyed) {
        const dx = t.gameObject.x - centerX;
        const dy = t.gameObject.y - centerY;
        if (dx * dx + dy * dy <= radiusSq) {
          this.scene.time.delayedCall(80 + Math.random() * 80, () => {
            if (!t.isDestroyed) {
              t.shatter();
            }
          });
        }
      }
    });
  }

  checkAmmoFail(currentAmmo: number, isReloading: boolean): void {
    if (this.isGameOver) return;
    if (currentAmmo <= 0 && !isReloading && this.remainingBottles > 0) {
      // Delay failure check to ensure any winning hit on the final bullet resolves first
      this.scene.time.delayedCall(450, () => {
        if (!this.isGameOver && this.remainingBottles > 0) {
          this.handleFail('ammo');
        }
      });
    }
  }

  private handleFail(reason: 'ammo' | 'time'): void {
    if (this.isGameOver) return;
    this.isGameOver = true;
    if (this.timerEvent) this.timerEvent.destroy();

    this.scene.time.delayedCall(400, () => {
      if (this.onFailCallback) this.onFailCallback(reason);
    });
  }

  getTargets(): TargetEntity[] {
    return this.targets;
  }

  getObstacles(): ObstacleEntity[] {
    return this.obstacles;
  }

  getRemainingBottles(): number {
    return this.remainingBottles;
  }

  getTimeRemaining(): number {
    return this.timeRemaining;
  }

  destroy(): void {
    if (this.timerEvent) this.timerEvent.destroy();
    this.targets.forEach(t => {
      if (t.ropeGraphics) t.ropeGraphics.destroy();
      t.gameObject.destroy();
    });
    this.obstacles.forEach(o => o.gameObject.destroy());
    this.envElements.forEach(e => e.destroy());
  }
}

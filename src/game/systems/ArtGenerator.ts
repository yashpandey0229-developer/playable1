import Phaser from 'phaser';
import { WEAPON_SKINS, WeaponSkin } from '../data/weapons';

/**
 * Procedural Art & Texture Generator
 * Generates high-definition, crisp arcade textures dynamically in Phaser's TextureManager.
 * Zero external asset dependencies, zero network latency, zero bundle bloat.
 */
export class ArtGenerator {
  static generateAll(scene: Phaser.Scene): void {
    const textures = scene.textures;

    // 1. Generate Bottle Variants
    this.createBottleTexture(scene, 'bottle_standard', '#2e7d32', '#66bb6a', '#1b5e20', '#a5d6a7');
    this.createBottleTexture(scene, 'bottle_amber', '#bf360c', '#ff7043', '#3e2723', '#ffccbc');
    this.createBottleTexture(scene, 'bottle_blue', '#0d47a1', '#42a5f5', '#011e4d', '#90caf9');
    this.createBottleTexture(scene, 'bottle_golden', '#ffb300', '#fff176', '#ff8f00', '#fff9c4', true);
    this.createBottleTexture(scene, 'bottle_dynamite', '#d50000', '#ff5252', '#b71c1c', '#ffffff', false, true);

    // 2. Glass Shards & Liquid Drops
    this.createGlassShards(scene);
    this.createLiquidDrops(scene);

    // 3. Environment Elements
    this.createWoodShelf(scene);
    this.createWoodObstacle(scene);
    this.createLantern(scene);
    this.createBulletImpact(scene);

    // 4. Reticles & UI Icons
    this.createCrosshair(scene);
    this.createCrosshairHit(scene);
    this.createAmmoIcons(scene);
    this.createStarIcons(scene);
    this.createCoinIcon(scene);

    // 5. Weapon Skins & Muzzle Flashes
    WEAPON_SKINS.forEach(skin => {
      this.createGunSprite(scene, skin);
      this.createMuzzleFlashSprite(scene, skin);
    });

    console.log('[ArtGenerator] All procedural textures successfully baked into Phaser cache.');
  }

  private static createBottleTexture(
    scene: Phaser.Scene,
    key: string,
    bodyColor: string,
    highlightColor: string,
    shadowColor: string,
    specularColor: string,
    isGolden = false,
    isDynamite = false
  ): void {
    if (scene.textures.exists(key)) return;

    const width = 64;
    const height = 140;
    const canvas = scene.textures.createCanvas(key, width, height);
    if (!canvas) return;
    const ctx = canvas.context;

    // Shadow on base
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(width / 2, height - 8, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bottle Path
    ctx.beginPath();
    // Neck top / rim
    ctx.moveTo(26, 12);
    ctx.lineTo(38, 12);
    ctx.lineTo(38, 16);
    ctx.lineTo(36, 18);
    // Neck column
    ctx.lineTo(36, 42);
    // Shoulder swell
    ctx.bezierCurveTo(36, 52, 48, 62, 48, 76);
    // Body cylinder
    ctx.lineTo(48, height - 16);
    // Base curves
    ctx.quadraticCurveTo(48, height - 10, 40, height - 10);
    ctx.lineTo(24, height - 10);
    ctx.quadraticCurveTo(16, height - 10, 16, height - 16);
    // Left side body
    ctx.lineTo(16, 76);
    // Left shoulder curve
    ctx.bezierCurveTo(16, 62, 28, 52, 28, 42);
    // Left neck
    ctx.lineTo(28, 18);
    ctx.lineTo(26, 16);
    ctx.closePath();

    // Glass Gradient fill
    const grad = ctx.createLinearGradient(16, 0, 48, 0);
    grad.addColorStop(0, shadowColor);
    grad.addColorStop(0.3, bodyColor);
    grad.addColorStop(0.7, highlightColor);
    grad.addColorStop(1, shadowColor);
    ctx.fillStyle = grad;
    ctx.fill();

    // Inner Glass Outline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Glass Specular Sheen (Left vertical highlight curve)
    ctx.beginPath();
    ctx.moveTo(22, 44);
    ctx.bezierCurveTo(20, 60, 20, 75, 20, height - 20);
    ctx.strokeStyle = specularColor;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Secondary subtle right rim glint
    ctx.beginPath();
    ctx.moveTo(44, 78);
    ctx.lineTo(44, height - 24);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Label or Stopper
    if (isDynamite) {
      // Danger label band
      ctx.fillStyle = '#ffea00';
      ctx.fillRect(16, 85, 32, 22);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TNT', width / 2, 100);

      // Sizzling Fuse
      ctx.beginPath();
      ctx.moveTo(width / 2, 12);
      ctx.quadraticCurveTo(width / 2 - 8, 4, width / 2 - 4, 0);
      ctx.strokeStyle = '#d7ccc8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spark
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(width / 2 - 4, 1, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (isGolden) {
      // Golden aura star glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(28, 80, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff9c4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(28, 72);
      ctx.lineTo(28, 88);
      ctx.moveTo(20, 80);
      ctx.lineTo(36, 80);
      ctx.stroke();
    } else {
      // Vintage vintage label band
      ctx.fillStyle = 'rgba(245, 240, 225, 0.85)';
      ctx.beginPath();
      ctx.roundRect(19, 86, 26, 26, 3);
      ctx.fill();
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Label text lines
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(23, 94, 18, 2);
      ctx.fillRect(25, 100, 14, 2);

      // Cork stopper
      ctx.fillStyle = '#bcaaa4';
      ctx.fillRect(29, 6, 6, 7);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(29, 10, 6, 3);
    }

    canvas.refresh();
  }

  private static createGlassShards(scene: Phaser.Scene): void {
    const shardData = [
      { key: 'shard_1', points: [[0, 0], [12, 4], [8, 16], [2, 14]] },
      { key: 'shard_2', points: [[6, 0], [16, 12], [4, 18], [0, 8]] },
      { key: 'shard_3', points: [[0, 2], [14, 0], [10, 12], [2, 8]] }
    ];

    shardData.forEach(({ key, points }) => {
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, 20, 20);
      if (!canvas) return;
      const ctx = canvas.context;

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i][0], points[i][1]);
      }
      ctx.closePath();

      ctx.fillStyle = 'rgba(230, 255, 245, 0.75)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 1;
      ctx.stroke();

      canvas.refresh();
    });
  }

  private static createLiquidDrops(scene: Phaser.Scene): void {
    const dropColors = [
      { key: 'drop_green', color: '#4caf50' },
      { key: 'drop_amber', color: '#ff7043' },
      { key: 'drop_blue', color: '#29b6f6' },
      { key: 'drop_gold', color: '#ffd54f' },
      { key: 'drop_red', color: '#f44336' }
    ];

    dropColors.forEach(({ key, color }) => {
      if (scene.textures.exists(key)) return;
      const canvas = scene.textures.createCanvas(key, 12, 12);
      if (!canvas) return;
      const ctx = canvas.context;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(6, 6, 5, 0, Math.PI * 2);
      ctx.fill();

      // Specular dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(4, 4, 1.5, 0, Math.PI * 2);
      ctx.fill();

      canvas.refresh();
    });
  }

  private static createWoodShelf(scene: Phaser.Scene): void {
    const key = 'wood_shelf';
    if (scene.textures.exists(key)) return;

    const width = 600;
    const height = 40;
    const canvas = scene.textures.createCanvas(key, width, height);
    if (!canvas) return;
    const ctx = canvas.context;

    // Shelf top face
    const topGrad = ctx.createLinearGradient(0, 0, 0, height);
    topGrad.addColorStop(0, '#5d4037');
    topGrad.addColorStop(0.3, '#4e342e');
    topGrad.addColorStop(0.7, '#3e2723');
    topGrad.addColorStop(1, '#271714');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle wood grain horizontal lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    for (let y = 6; y < height; y += 7) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(150, y + 2, 350, y - 2, width, y + 1);
      ctx.stroke();
    }

    // Top highlight bevel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 1);
    ctx.lineTo(width, 1);
    ctx.stroke();

    // Bottom dark rim
    ctx.strokeStyle = '#1b100d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, height - 1.5);
    ctx.lineTo(width, height - 1.5);
    ctx.stroke();

    // Brass corner studs
    ctx.fillStyle = '#c8963e';
    [15, width - 15].forEach(x => {
      ctx.beginPath();
      ctx.arc(x, height / 2, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff099';
      ctx.beginPath();
      ctx.arc(x - 1, height / 2 - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c8963e';
    });

    canvas.refresh();
  }

  private static createWoodObstacle(scene: Phaser.Scene): void {
    const key = 'wood_obstacle';
    if (scene.textures.exists(key)) return;

    const width = 80;
    const height = 110;
    const canvas = scene.textures.createCanvas(key, width, height);
    if (!canvas) return;
    const ctx = canvas.context;

    // Wood plank background
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, '#4e342e');
    grad.addColorStop(0.5, '#5d4037');
    grad.addColorStop(1, '#3e2723');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Bevel borders
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    ctx.strokeStyle = '#271714';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, width - 4, height - 4);

    // Metal reinforcement cross-straps
    ctx.fillStyle = '#616161';
    ctx.fillRect(0, 18, width, 12);
    ctx.fillRect(0, height - 30, width, 12);

    // Metal bolts
    ctx.fillStyle = '#b0bec5';
    [10, width - 10].forEach(bx => {
      ctx.beginPath();
      ctx.arc(bx, 24, 3, 0, Math.PI * 2);
      ctx.arc(bx, height - 24, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Warning cross hatch or target sign
    ctx.strokeStyle = 'rgba(255, 87, 34, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, 38);
    ctx.lineTo(width - 15, height - 38);
    ctx.moveTo(width - 15, 38);
    ctx.lineTo(15, height - 38);
    ctx.stroke();

    canvas.refresh();
  }

  private static createLantern(scene: Phaser.Scene): void {
    const key = 'lantern';
    if (scene.textures.exists(key)) return;

    const width = 60;
    const height = 90;
    const canvas = scene.textures.createCanvas(key, width, height);
    if (!canvas) return;
    const ctx = canvas.context;

    // Chain
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(30, 0);
    ctx.lineTo(30, 18);
    ctx.stroke();

    // Top cap
    ctx.fillStyle = '#424242';
    ctx.beginPath();
    ctx.moveTo(20, 18);
    ctx.lineTo(40, 18);
    ctx.lineTo(45, 28);
    ctx.lineTo(15, 28);
    ctx.closePath();
    ctx.fill();

    // Glass glow
    const glowGrad = ctx.createRadialGradient(30, 48, 2, 30, 48, 20);
    glowGrad.addColorStop(0, '#ffffff');
    glowGrad.addColorStop(0.3, '#ffeb3b');
    glowGrad.addColorStop(0.7, '#ff9800');
    glowGrad.addColorStop(1, 'rgba(255, 152, 0, 0.1)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(30, 48, 18, 0, Math.PI * 2);
    ctx.fill();

    // Cage bars
    ctx.strokeStyle = '#212121';
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 28, 24, 40);
    ctx.beginPath();
    ctx.moveTo(26, 28);
    ctx.lineTo(26, 68);
    ctx.moveTo(34, 28);
    ctx.lineTo(34, 68);
    ctx.stroke();

    // Bottom base
    ctx.fillStyle = '#424242';
    ctx.fillRect(16, 68, 28, 8);

    canvas.refresh();
  }

  private static createBulletImpact(scene: Phaser.Scene): void {
    const key = 'bullet_impact';
    if (scene.textures.exists(key)) return;

    const canvas = scene.textures.createCanvas(key, 24, 24);
    if (!canvas) return;
    const ctx = canvas.context;

    // Outer splinter ring
    ctx.fillStyle = '#21130d';
    ctx.beginPath();
    ctx.arc(12, 12, 7, 0, Math.PI * 2);
    ctx.fill();

    // Deep black hole center
    ctx.fillStyle = '#080403';
    ctx.beginPath();
    ctx.arc(12, 12, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Splinters
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(12 + Math.cos(angle) * 4, 12 + Math.sin(angle) * 4);
      ctx.lineTo(12 + Math.cos(angle) * 10, 12 + Math.sin(angle) * 10);
      ctx.stroke();
    }

    canvas.refresh();
  }

  private static createCrosshair(scene: Phaser.Scene): void {
    const key = 'crosshair';
    if (scene.textures.exists(key)) return;

    const size = 64;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.context;
    const center = size / 2;

    // Subtle outer targeting ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(center, center, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright ring
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, 8, 0, Math.PI * 2);
    ctx.stroke();

    // Cross pips
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    // Top
    ctx.beginPath();
    ctx.moveTo(center, center - 24);
    ctx.lineTo(center, center - 12);
    ctx.stroke();
    // Bottom
    ctx.beginPath();
    ctx.moveTo(center, center + 12);
    ctx.lineTo(center, center + 24);
    ctx.stroke();
    // Left
    ctx.beginPath();
    ctx.moveTo(center - 24, center);
    ctx.lineTo(center - 12, center);
    ctx.stroke();
    // Right
    ctx.beginPath();
    ctx.moveTo(center + 12, center);
    ctx.lineTo(center + 24, center);
    ctx.stroke();

    // Center glow dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(center, center, 2.5, 0, Math.PI * 2);
    ctx.fill();

    canvas.refresh();
  }

  private static createCrosshairHit(scene: Phaser.Scene): void {
    const key = 'crosshair_hit';
    if (scene.textures.exists(key)) return;

    const size = 64;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.context;
    const center = size / 2;

    // Diagonal hit pips (red/orange hitmarkers)
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const p = 14;
    const l = 6;
    // Top-Left
    ctx.beginPath();
    ctx.moveTo(center - p, center - p);
    ctx.lineTo(center - p + l, center - p + l);
    ctx.stroke();
    // Top-Right
    ctx.beginPath();
    ctx.moveTo(center + p, center - p);
    ctx.lineTo(center + p - l, center - p + l);
    ctx.stroke();
    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(center - p, center + p);
    ctx.lineTo(center - p + l, center + p - l);
    ctx.stroke();
    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(center + p, center + p);
    ctx.lineTo(center + p - l, center + p - l);
    ctx.stroke();

    canvas.refresh();
  }

  private static createAmmoIcons(scene: Phaser.Scene): void {
    // Loaded bullet
    if (!scene.textures.exists('ammo_bullet')) {
      const canvas = scene.textures.createCanvas('ammo_bullet', 16, 36);
      if (canvas) {
        const ctx = canvas.context;
        // Bullet tip (copper)
        ctx.fillStyle = '#ff8f00';
        ctx.beginPath();
        ctx.moveTo(4, 12);
        ctx.quadraticCurveTo(8, 0, 12, 12);
        ctx.closePath();
        ctx.fill();

        // Bullet casing (brass)
        const brassGrad = ctx.createLinearGradient(3, 0, 13, 0);
        brassGrad.addColorStop(0, '#c8963e');
        brassGrad.addColorStop(0.5, '#ffd54f');
        brassGrad.addColorStop(1, '#a67c00');
        ctx.fillStyle = brassGrad;
        ctx.fillRect(3, 12, 10, 20);

        // Primer rim
        ctx.fillStyle = '#795548';
        ctx.fillRect(2, 32, 12, 3);

        canvas.refresh();
      }
    }

    // Empty bullet slot
    if (!scene.textures.exists('ammo_empty')) {
      const canvas = scene.textures.createCanvas('ammo_empty', 16, 36);
      if (canvas) {
        const ctx = canvas.context;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.beginPath();
        ctx.roundRect(3, 8, 10, 26, 3);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        canvas.refresh();
      }
    }
  }

  private static createStarIcons(scene: Phaser.Scene): void {
    // Gold Star
    if (!scene.textures.exists('star_gold')) {
      const canvas = scene.textures.createCanvas('star_gold', 44, 44);
      if (canvas) {
        const ctx = canvas.context;
        this.drawStar(ctx, 22, 22, 5, 18, 9, '#ffd700', '#fff9a6', '#ff8f00');
        canvas.refresh();
      }
    }

    // Empty Star
    if (!scene.textures.exists('star_empty')) {
      const canvas = scene.textures.createCanvas('star_empty', 44, 44);
      if (canvas) {
        const ctx = canvas.context;
        this.drawStar(ctx, 22, 22, 5, 18, 9, 'rgba(80, 80, 80, 0.5)', 'rgba(120, 120, 120, 0.5)', 'rgba(40, 40, 40, 0.5)');
        canvas.refresh();
      }
    }
  }

  private static drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    spikes: number,
    outerRadius: number,
    innerRadius: number,
    fillColor: string,
    highlightColor: string,
    strokeColor: string
  ): void {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Top shine highlight
    ctx.fillStyle = highlightColor;
    ctx.beginPath();
    ctx.arc(cx, cy - 6, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private static createCoinIcon(scene: Phaser.Scene): void {
    const key = 'coin_gold';
    if (scene.textures.exists(key)) return;

    const canvas = scene.textures.createCanvas(key, 32, 32);
    if (!canvas) return;
    const ctx = canvas.context;

    // Base coin gradient
    const grad = ctx.createLinearGradient(0, 0, 32, 32);
    grad.addColorStop(0, '#ffe082');
    grad.addColorStop(0.5, '#ffd54f');
    grad.addColorStop(1, '#ff8f00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(16, 16, 14, 0, Math.PI * 2);
    ctx.fill();

    // Inner rim
    ctx.strokeStyle = '#fff8e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(16, 16, 11, 0, Math.PI * 2);
    ctx.stroke();

    // Embossed star in center
    ctx.fillStyle = '#ff8f00';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 16, 17);

    canvas.refresh();
  }

  /**
   * First-person gun sprite generator tailored to each weapon skin
   */
  private static createGunSprite(scene: Phaser.Scene, skin: WeaponSkin): void {
    const key = `gun_${skin.id}`;
    if (scene.textures.exists(key)) return;

    const width = 280;
    const height = 300;
    const canvas = scene.textures.createCanvas(key, width, height);
    if (!canvas) return;
    const ctx = canvas.context;

    const pColor = '#' + skin.visuals.primaryColor.toString(16).padStart(6, '0');
    const sColor = '#' + skin.visuals.secondaryColor.toString(16).padStart(6, '0');
    const gColor = '#' + skin.visuals.gripColor.toString(16).padStart(6, '0');
    const mColor = '#' + skin.visuals.metalColor.toString(16).padStart(6, '0');
    const glow = '#' + skin.visuals.glowColor.toString(16).padStart(6, '0');

    ctx.save();
    // Center point of gun barrel roughly around (140, 60)

    // 1. Grip / Handle
    ctx.fillStyle = gColor;
    ctx.beginPath();
    ctx.moveTo(110, 160);
    ctx.lineTo(170, 160);
    ctx.lineTo(210, 290);
    ctx.lineTo(130, 290);
    ctx.closePath();
    ctx.fill();

    // Grip Texture / Panel
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.moveTo(125, 175);
    ctx.lineTo(165, 175);
    ctx.lineTo(195, 275);
    ctx.lineTo(145, 275);
    ctx.closePath();
    ctx.fill();

    // Grip Screws / Accents
    ctx.fillStyle = mColor;
    ctx.beginPath();
    ctx.arc(145, 195, 4, 0, Math.PI * 2);
    ctx.arc(170, 255, 4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Trigger Guard & Trigger
    ctx.strokeStyle = mColor;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(140, 165, 18, 0, Math.PI);
    ctx.stroke();

    // Trigger
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(140, 155);
    ctx.quadraticCurveTo(144, 165, 142, 172);
    ctx.stroke();

    // 3. Receiver & Slide Frame
    ctx.fillStyle = pColor;
    ctx.fillRect(85, 90, 110, 70);

    // Slide bevels
    ctx.fillStyle = mColor;
    ctx.fillRect(90, 75, 100, 22);

    // 4. Barrel Assembly
    const barrelGrad = ctx.createLinearGradient(110, 0, 170, 0);
    barrelGrad.addColorStop(0, mColor);
    barrelGrad.addColorStop(0.5, sColor);
    barrelGrad.addColorStop(1, mColor);
    ctx.fillStyle = barrelGrad;
    ctx.fillRect(115, 30, 50, 60);

    // Barrel Muzzle Opening / Flash Hider
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.ellipse(140, 30, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // 5. Iron Sights / Optics
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(140, 23, 3, 0, Math.PI * 2);
    ctx.fill();

    // Rear notch sights
    ctx.fillStyle = sColor;
    ctx.fillRect(112, 70, 6, 8);
    ctx.fillRect(162, 70, 6, 8);

    // 6. Distinct Skin Accents & Details
    if (skin.visuals.style === 'neon' || skin.visuals.style === 'circuit') {
      // Glowing circuit lines
      ctx.strokeStyle = glow;
      ctx.lineWidth = 3;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(95, 105);
      ctx.lineTo(135, 105);
      ctx.lineTo(135, 140);
      ctx.lineTo(175, 140);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else if (skin.visuals.style === 'gold') {
      // Filigree engravings
      ctx.strokeStyle = '#fff099';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(140, 125, 12, 0, Math.PI * 2);
      ctx.stroke();
    } else if (skin.visuals.style === 'retro') {
      // 8-bit arcade side vent
      ctx.fillStyle = '#ff5722';
      for (let y = 100; y <= 135; y += 8) {
        ctx.fillRect(95, y, 16, 4);
      }
    } else if (skin.visuals.style === 'frost') {
      // Crystalline frost facets
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(115, 60);
      ctx.lineTo(130, 45);
      ctx.lineTo(145, 65);
      ctx.closePath();
      ctx.fill();
    } else if (skin.visuals.style === 'sunset') {
      // Vaporwave gradient across slide
      const sunGrad = ctx.createLinearGradient(85, 90, 195, 160);
      sunGrad.addColorStop(0, '#ff9100');
      sunGrad.addColorStop(0.5, '#f50057');
      sunGrad.addColorStop(1, '#651fff');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(92, 95, 96, 45);
    }

    ctx.restore();
    canvas.refresh();
  }

  private static createMuzzleFlashSprite(scene: Phaser.Scene, skin: WeaponSkin): void {
    const key = `flash_${skin.id}`;
    if (scene.textures.exists(key)) return;

    const size = 160;
    const canvas = scene.textures.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.context;
    const center = size / 2;

    const fColor = '#' + skin.visuals.flashColor.toString(16).padStart(6, '0');

    // Central bright core
    const radGrad = ctx.createRadialGradient(center, center, 4, center, center, 65);
    radGrad.addColorStop(0, '#ffffff');
    radGrad.addColorStop(0.3, fColor);
    radGrad.addColorStop(0.8, fColor);
    radGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(center, center, 65, 0, Math.PI * 2);
    ctx.fill();

    // Starburst spikes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const len = i % 2 === 0 ? 70 : 45;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.lineTo(center + Math.cos(angle) * len, center + Math.sin(angle) * len);
      ctx.stroke();
    }

    canvas.refresh();
  }
}

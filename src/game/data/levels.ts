export type TargetType = 'standard' | 'amber' | 'blue' | 'golden' | 'dynamite';
export type ShelfTier = 'near' | 'mid' | 'far';

export interface TargetConfig {
  id: string;
  type: TargetType;
  shelfTier: ShelfTier;
  xNorm: number; // 0.1 to 0.9 across shelf width
  yOffset?: number; // fine vertical adjustment
  isHanging?: boolean; // Hanging from overhead rope
  ropeLength?: number; // Length of suspension rope (px)
  movement?: {
    type: 'horizontal' | 'sine' | 'pendulum';
    speed: number;
    distance: number;
    phase?: number;
    maxAngle?: number; // Maximum pendulum swing angle in degrees (e.g. 25)
  };
}

export interface ObstacleConfig {
  id: string;
  shelfTier: ShelfTier;
  xNorm: number;
  yOffset?: number;
  width: number;
  height: number;
  movement?: {
    type: 'horizontal' | 'swing';
    speed: number;
    distance: number;
  };
}

export interface LevelDefinition {
  id: number;
  title: string;
  description: string;
  ammo: number;
  timeLimitSec?: number;
  starThresholds: [number, number, number];
  tutorialText?: string;
  targets: TargetConfig[];
  obstacles?: ObstacleConfig[];
}

export const LEVELS: LevelDefinition[] = [
  // Level 1: First Shots & Hanging Targets (Combines stationary counter bottles + swinging pendulums)
  {
    id: 1,
    title: 'First Shots & Swingers',
    description: 'Welcome to the gallery! Shatter the counter bottles and time your shots on the hanging swinging bottles.',
    ammo: 10,
    starThresholds: [450, 600, 750],
    tutorialText: 'Tap or Click to fire! Time your shots to shatter both counter and hanging swinging bottles!',
    targets: [
      { id: 'b1', type: 'standard', shelfTier: 'near', xNorm: 0.18 },
      {
        id: 'h1',
        type: 'amber',
        shelfTier: 'mid',
        xNorm: 0.36,
        isHanging: true,
        movement: { type: 'pendulum', speed: 52, distance: 110, maxAngle: 22 }
      },
      { id: 'b2', type: 'standard', shelfTier: 'near', xNorm: 0.54 },
      {
        id: 'h2',
        type: 'standard',
        shelfTier: 'mid',
        xNorm: 0.72,
        isHanging: true,
        movement: { type: 'pendulum', speed: 60, distance: 130, phase: Math.PI * 0.7, maxAngle: 25 }
      },
      {
        id: 'm1',
        type: 'blue',
        shelfTier: 'far',
        xNorm: 0.5,
        movement: { type: 'horizontal', speed: 65, distance: 120 }
      }
    ]
  },

  // Level 2: Dual Swings & High Wires
  {
    id: 2,
    title: 'Dual Swings',
    description: 'Multiple hanging bottles swaying in alternating rhythm! Wait for the sweet spot.',
    ammo: 12,
    starThresholds: [800, 1050, 1300],
    targets: [
      { id: 'b1', type: 'standard', shelfTier: 'near', xNorm: 0.2 },
      { id: 'b2', type: 'standard', shelfTier: 'near', xNorm: 0.8 },
      {
        id: 'h1',
        type: 'amber',
        shelfTier: 'mid',
        xNorm: 0.32,
        isHanging: true,
        movement: { type: 'pendulum', speed: 60, distance: 120, maxAngle: 24 }
      },
      {
        id: 'h2',
        type: 'amber',
        shelfTier: 'mid',
        xNorm: 0.68,
        isHanging: true,
        movement: { type: 'pendulum', speed: 60, distance: 120, phase: Math.PI, maxAngle: 24 }
      },
      {
        id: 'h3',
        type: 'golden',
        shelfTier: 'far',
        xNorm: 0.5,
        isHanging: true,
        movement: { type: 'pendulum', speed: 75, distance: 100, maxAngle: 28 }
      },
      { id: 'b3', type: 'standard', shelfTier: 'mid', xNorm: 0.5 }
    ]
  },

  // Level 3: Distance & Precision (Far tier with smaller targets & swinging lanterns)
  {
    id: 3,
    title: 'Precision Range',
    description: 'Distant bottles yield massive score bonuses. Take steady aim.',
    ammo: 12,
    starThresholds: [1000, 1300, 1550],
    targets: [
      { id: 'b1', type: 'blue', shelfTier: 'far', xNorm: 0.2 },
      {
        id: 'h1',
        type: 'blue',
        shelfTier: 'far',
        xNorm: 0.4,
        isHanging: true,
        movement: { type: 'pendulum', speed: 65, distance: 90, maxAngle: 20 }
      },
      {
        id: 'h2',
        type: 'golden',
        shelfTier: 'far',
        xNorm: 0.6,
        isHanging: true,
        movement: { type: 'pendulum', speed: 70, distance: 90, phase: Math.PI * 0.5, maxAngle: 22 }
      },
      { id: 'b2', type: 'blue', shelfTier: 'far', xNorm: 0.8 },
      { id: 'b3', type: 'standard', shelfTier: 'mid', xNorm: 0.3 },
      { id: 'b4', type: 'standard', shelfTier: 'mid', xNorm: 0.7 }
    ]
  },

  // Level 4: Moving Practice (Sliding targets)
  {
    id: 4,
    title: 'Moving Gallery',
    description: 'Track the moving targets on the conveyor rail! Lead your shots.',
    ammo: 14,
    starThresholds: [900, 1200, 1450],
    targets: [
      { id: 'b1', type: 'standard', shelfTier: 'near', xNorm: 0.2 },
      { id: 'b2', type: 'standard', shelfTier: 'near', xNorm: 0.8 },
      { id: 'm1', type: 'amber', shelfTier: 'mid', xNorm: 0.5, movement: { type: 'horizontal', speed: 80, distance: 160 } },
      { id: 'm2', type: 'amber', shelfTier: 'mid', xNorm: 0.3, movement: { type: 'horizontal', speed: 70, distance: 120, phase: Math.PI } },
      { id: 'm3', type: 'standard', shelfTier: 'mid', xNorm: 0.7, movement: { type: 'horizontal', speed: 90, distance: 140 } },
      { id: 'b3', type: 'blue', shelfTier: 'far', xNorm: 0.5 }
    ]
  },

  // Level 5: Rapid Fire (Time limit round)
  {
    id: 5,
    title: 'Rapid Fire',
    description: 'Clear all 10 bottles before the 30-second fuse runs out! Build high combos.',
    ammo: 16,
    timeLimitSec: 30,
    starThresholds: [1200, 1500, 1850],
    targets: [
      { id: 'b1', type: 'standard', shelfTier: 'near', xNorm: 0.15 },
      { id: 'b2', type: 'amber', shelfTier: 'near', xNorm: 0.35 },
      { id: 'b3', type: 'standard', shelfTier: 'near', xNorm: 0.55 },
      { id: 'b4', type: 'amber', shelfTier: 'near', xNorm: 0.75 },
      { id: 'b5', type: 'blue', shelfTier: 'mid', xNorm: 0.25 },
      { id: 'b6', type: 'standard', shelfTier: 'mid', xNorm: 0.45 },
      { id: 'b7', type: 'blue', shelfTier: 'mid', xNorm: 0.65 },
      { id: 'b8', type: 'blue', shelfTier: 'mid', xNorm: 0.85 },
      { id: 'b9', type: 'standard', shelfTier: 'far', xNorm: 0.35 },
      { id: 'b10', type: 'standard', shelfTier: 'far', xNorm: 0.65 }
    ]
  },

  // Level 6: Golden Elixir (Introduces rare Golden Bottles)
  {
    id: 6,
    title: 'The Golden Reserve',
    description: 'Hit the rare golden elixir bottles for 350 bonus points and extra coins!',
    ammo: 14,
    starThresholds: [1400, 1800, 2200],
    targets: [
      { id: 'g1', type: 'golden', shelfTier: 'far', xNorm: 0.5, movement: { type: 'horizontal', speed: 95, distance: 150 } },
      { id: 'b1', type: 'amber', shelfTier: 'mid', xNorm: 0.2 },
      { id: 'b2', type: 'standard', shelfTier: 'mid', xNorm: 0.4 },
      { id: 'b3', type: 'standard', shelfTier: 'mid', xNorm: 0.6 },
      { id: 'b4', type: 'amber', shelfTier: 'mid', xNorm: 0.8 },
      { id: 'b5', type: 'standard', shelfTier: 'near', xNorm: 0.3 },
      { id: 'b6', type: 'standard', shelfTier: 'near', xNorm: 0.7 }
    ]
  },

  // Level 7: Wooden Barricade (Introduces moving obstacle planks)
  {
    id: 7,
    title: 'Wooden Barricades',
    description: 'A swinging wooden plank blocks your shots! Time your trigger pull carefully.',
    ammo: 14,
    starThresholds: [1000, 1300, 1600],
    obstacles: [
      { id: 'obs1', shelfTier: 'near', xNorm: 0.5, width: 90, height: 110, movement: { type: 'horizontal', speed: 90, distance: 180 } }
    ],
    targets: [
      { id: 'b1', type: 'standard', shelfTier: 'mid', xNorm: 0.2 },
      { id: 'b2', type: 'blue', shelfTier: 'mid', xNorm: 0.4 },
      { id: 'b3', type: 'blue', shelfTier: 'mid', xNorm: 0.5 },
      { id: 'b4', type: 'blue', shelfTier: 'mid', xNorm: 0.6 },
      { id: 'b5', type: 'standard', shelfTier: 'mid', xNorm: 0.8 },
      { id: 'b6', type: 'standard', shelfTier: 'far', xNorm: 0.35 },
      { id: 'b7', type: 'standard', shelfTier: 'far', xNorm: 0.65 }
    ]
  },

  // Level 8: Dynamite Blast (Introduces explosive bottles)
  {
    id: 8,
    title: 'Dynamite Blast',
    description: 'Shoot the red dynamite bottle to trigger an explosive shockwave shattering nearby bottles!',
    ammo: 12,
    starThresholds: [1100, 1400, 1750],
    targets: [
      { id: 'dyn1', type: 'dynamite', shelfTier: 'near', xNorm: 0.5 },
      { id: 'b1', type: 'standard', shelfTier: 'near', xNorm: 0.42 },
      { id: 'b2', type: 'standard', shelfTier: 'near', xNorm: 0.58 },
      { id: 'b3', type: 'amber', shelfTier: 'mid', xNorm: 0.25 },
      { id: 'b4', type: 'amber', shelfTier: 'mid', xNorm: 0.75 },
      { id: 'b5', type: 'blue', shelfTier: 'far', xNorm: 0.35 },
      { id: 'b6', type: 'blue', shelfTier: 'far', xNorm: 0.65 }
    ]
  },

  // Level 9: Fast Crossers
  {
    id: 9,
    title: 'Fast Crossers',
    description: 'High-speed moving bottles crossing at opposing directions.',
    ammo: 15,
    starThresholds: [1300, 1650, 2000],
    targets: [
      { id: 'm1', type: 'blue', shelfTier: 'mid', xNorm: 0.3, movement: { type: 'horizontal', speed: 120, distance: 200 } },
      { id: 'm2', type: 'amber', shelfTier: 'mid', xNorm: 0.7, movement: { type: 'horizontal', speed: -110, distance: 200 } },
      { id: 'm3', type: 'standard', shelfTier: 'far', xNorm: 0.5, movement: { type: 'horizontal', speed: 130, distance: 220 } },
      { id: 'b1', type: 'standard', shelfTier: 'near', xNorm: 0.2 },
      { id: 'b2', type: 'standard', shelfTier: 'near', xNorm: 0.4 },
      { id: 'b3', type: 'standard', shelfTier: 'near', xNorm: 0.6 },
      { id: 'b4', type: 'standard', shelfTier: 'near', xNorm: 0.8 }
    ]
  },

  // Level 10: Milestone Boss Gallery - The Saloon Showdown
  {
    id: 10,
    title: 'Saloon Showdown',
    description: 'Tier 1 Milestone! Double obstacles, moving targets, and golden rewards.',
    ammo: 18,
    timeLimitSec: 45,
    starThresholds: [1800, 2300, 2800],
    obstacles: [
      { id: 'obs1', shelfTier: 'near', xNorm: 0.3, width: 80, height: 100, movement: { type: 'horizontal', speed: 70, distance: 130 } },
      { id: 'obs2', shelfTier: 'near', xNorm: 0.7, width: 80, height: 100, movement: { type: 'horizontal', speed: -75, distance: 130 } }
    ],
    targets: [
      { id: 'g1', type: 'golden', shelfTier: 'far', xNorm: 0.5, movement: { type: 'sine', speed: 90, distance: 160 } },
      { id: 'dyn1', type: 'dynamite', shelfTier: 'mid', xNorm: 0.5 },
      { id: 'b1', type: 'blue', shelfTier: 'mid', xNorm: 0.2 },
      { id: 'b2', type: 'blue', shelfTier: 'mid', xNorm: 0.8 },
      { id: 'm1', type: 'amber', shelfTier: 'mid', xNorm: 0.35, movement: { type: 'horizontal', speed: 85, distance: 140 } },
      { id: 'm2', type: 'amber', shelfTier: 'mid', xNorm: 0.65, movement: { type: 'horizontal', speed: -85, distance: 140 } },
      { id: 'b3', type: 'standard', shelfTier: 'near', xNorm: 0.15 },
      { id: 'b4', type: 'standard', shelfTier: 'near', xNorm: 0.85 }
    ]
  },

  // Level 11: Carnival Carousel
  {
    id: 11,
    title: 'Carnival Carousel',
    description: 'Bottles bobbing up and down in smooth rhythmic sine waves.',
    ammo: 16,
    starThresholds: [1200, 1550, 1900],
    targets: [
      { id: 's1', type: 'standard', shelfTier: 'mid', xNorm: 0.2, movement: { type: 'sine', speed: 70, distance: 80 } },
      { id: 's2', type: 'blue', shelfTier: 'mid', xNorm: 0.4, movement: { type: 'sine', speed: 70, distance: 80, phase: Math.PI / 2 } },
      { id: 's3', type: 'amber', shelfTier: 'mid', xNorm: 0.6, movement: { type: 'sine', speed: 70, distance: 80, phase: Math.PI } },
      { id: 's4', type: 'standard', shelfTier: 'mid', xNorm: 0.8, movement: { type: 'sine', speed: 70, distance: 80, phase: (3 * Math.PI) / 2 } },
      { id: 'b1', type: 'standard', shelfTier: 'near', xNorm: 0.3 },
      { id: 'b2', type: 'standard', shelfTier: 'near', xNorm: 0.7 }
    ]
  },

  // Level 12: Tight Ammunition
  {
    id: 12,
    title: 'Marksman Strict',
    description: 'Strict ammunition! Only 7 shots for 7 targets. Every miss is fatal.',
    ammo: 7,
    starThresholds: [900, 1200, 1500],
    targets: [
      { id: 'b1', type: 'standard', shelfTier: 'near', xNorm: 0.2 },
      { id: 'b2', type: 'standard', shelfTier: 'near', xNorm: 0.4 },
      { id: 'b3', type: 'blue', shelfTier: 'near', xNorm: 0.6 },
      { id: 'b4', type: 'standard', shelfTier: 'near', xNorm: 0.8 },
      { id: 'b5', type: 'amber', shelfTier: 'mid', xNorm: 0.3 },
      { id: 'b6', type: 'amber', shelfTier: 'mid', xNorm: 0.7 },
      { id: 'b7', type: 'golden', shelfTier: 'far', xNorm: 0.5 }
    ]
  },

  // Levels 13 to 30: Programmatic deterministic rich definitions
  ...generateExtendedLevels(13, 30)
];

/**
 * Deterministically generates rich, balanced levels for 13 to 30
 */
function generateExtendedLevels(startLevel: number, endLevel: number): LevelDefinition[] {
  const result: LevelDefinition[] = [];

  const titles = [
    'Whiskey Row', 'Phantom Bottles', 'The Pendulum', 'Twin Spinners',
    'High Noon Blitz', 'Canyon Echoes', 'Desert Mirages', 'Gold Rush Frenzy',
    'Midnight Express', 'Rattlesnake Ridge', 'Bounty Hunter', 'Clockwork Gears',
    'Iron Sights', 'The Old Mine', 'Dynamite Canyon', 'Saloon Royale',
    'Outlaw Gauntlet', 'The Grand Champion'
  ];

  for (let lvl = startLevel; lvl <= endLevel; lvl++) {
    const index = lvl - startLevel;
    const title = titles[index % titles.length] || `Range Level ${lvl}`;
    const isBoss = (lvl % 5 === 0);
    const isTimed = (lvl % 3 === 0);
    const targetCount = Math.min(16, 7 + Math.floor(lvl / 3));
    const ammo = targetCount + (isBoss ? 6 : Math.max(3, 8 - Math.floor(lvl / 6)));
    const timeLimitSec = isTimed ? (30 + Math.floor(targetCount * 1.8)) : undefined;

    const targets: TargetConfig[] = [];
    const obstacles: ObstacleConfig[] = [];

    // Distribute targets across tiers
    for (let t = 0; t < targetCount; t++) {
      const xNorm = 0.15 + (0.7 * (t / Math.max(1, targetCount - 1)));
      const tier: ShelfTier = t % 3 === 0 ? 'far' : t % 2 === 0 ? 'mid' : 'near';
      let type: TargetType = 'standard';

      if (t === 0 && lvl >= 15) {
        type = 'golden';
      } else if (t === Math.floor(targetCount / 2) && lvl >= 14 && lvl % 2 === 0) {
        type = 'dynamite';
      } else if (t % 3 === 0) {
        type = 'blue';
      } else if (t % 2 === 0) {
        type = 'amber';
      }

      // Add movement for higher levels
      let movement = undefined;
      if (t % 2 === 1 && lvl >= 14) {
        movement = {
          type: (lvl % 4 === 0 ? 'sine' : 'horizontal') as 'sine' | 'horizontal',
          speed: 60 + (lvl * 3) + ((t * 15) % 40),
          distance: 100 + ((t * 20) % 80),
          phase: (t * Math.PI) / 3
        };
      }

      targets.push({
        id: `t_${lvl}_${t}`,
        type,
        shelfTier: tier,
        xNorm,
        movement
      });
    }

    // Add obstacles for certain levels
    if (lvl >= 16 && (lvl % 2 === 1 || isBoss)) {
      obstacles.push({
        id: `obs_${lvl}_1`,
        shelfTier: 'near',
        xNorm: 0.5,
        width: 75,
        height: 100,
        movement: {
          type: 'horizontal',
          speed: 70 + (lvl * 2),
          distance: 150
        }
      });
    }

    if (isBoss) {
      obstacles.push({
        id: `obs_${lvl}_2`,
        shelfTier: 'mid',
        xNorm: 0.3,
        width: 70,
        height: 90,
        movement: {
          type: 'horizontal',
          speed: -65 - (lvl * 2),
          distance: 140
        }
      });
    }

    const baseStarScore = targetCount * 140;
    result.push({
      id: lvl,
      title,
      description: isBoss
        ? `Tier Milestone! Conquer moving targets, obstacles and score targets.`
        : `Master target range level ${lvl} with speed, accuracy and precision.`,
      ammo,
      timeLimitSec,
      starThresholds: [
        baseStarScore,
        Math.floor(baseStarScore * 1.35),
        Math.floor(baseStarScore * 1.7)
      ],
      targets,
      obstacles: obstacles.length > 0 ? obstacles : undefined
    });
  }

  return result;
}

export function getLevelById(id: number): LevelDefinition {
  return LEVELS.find(l => l.id === id) || LEVELS[0];
}

export interface WeaponSkin {
  id: string;
  name: string;
  description: string;
  unlockType: 'starter' | 'level' | 'stars' | 'coins' | 'ad';
  unlockValue: number; // e.g. Level number, Stars required, or Coin price
  rewardId?: string; // Static reward ID for YouTube Playables rewarded ad
  stats: {
    fireRateMs: number;
    reloadTimeMs: number;
    recoilAmount: number;
    capacity: number;
  };
  visuals: {
    primaryColor: number;
    secondaryColor: number;
    gripColor: number;
    metalColor: number;
    glowColor: number;
    flashColor: number;
    tracerColor: number;
    particleColor: number;
    style: 'vintage' | 'gold' | 'neon' | 'frost' | 'crimson' | 'retro' | 'carbon' | 'circuit' | 'sunset' | 'galaxy';
  };
}

export const WEAPON_SKINS: WeaponSkin[] = [
  {
    id: 'classic_timber',
    name: 'Classic Timber',
    description: 'Nostalgic carnival revolver crafted from polished mahogany and blued steel.',
    unlockType: 'starter',
    unlockValue: 0,
    stats: {
      fireRateMs: 260,
      reloadTimeMs: 1400,
      recoilAmount: 22,
      capacity: 6
    },
    visuals: {
      primaryColor: 0x4a2a18,
      secondaryColor: 0xc8963e,
      gripColor: 0x30180d,
      metalColor: 0x757d8a,
      glowColor: 0xffaa33,
      flashColor: 0xffaa22,
      tracerColor: 0xffcc44,
      particleColor: 0xffe099,
      style: 'vintage'
    }
  },
  {
    id: 'golden_blaster',
    name: 'Golden Blaster',
    description: 'Forged in solid 24-karat gold with engraved filigree for high rollers.',
    unlockType: 'stars',
    unlockValue: 15, // 15 stars required
    stats: {
      fireRateMs: 250,
      reloadTimeMs: 1300,
      recoilAmount: 20,
      capacity: 6
    },
    visuals: {
      primaryColor: 0xffd700,
      secondaryColor: 0xfff099,
      gripColor: 0xb8860b,
      metalColor: 0xffe066,
      glowColor: 0xffea00,
      flashColor: 0xfff7a0,
      tracerColor: 0xffe600,
      particleColor: 0xfffae0,
      style: 'gold'
    }
  },
  {
    id: 'neon_pulse',
    name: 'Neon Pulse',
    description: 'Cyberpunk synthwave firearm with glowing electroluminescent energy strips.',
    unlockType: 'coins',
    unlockValue: 600,
    stats: {
      fireRateMs: 240,
      reloadTimeMs: 1350,
      recoilAmount: 18,
      capacity: 7
    },
    visuals: {
      primaryColor: 0x1f0b2e,
      secondaryColor: 0x00f3ff,
      gripColor: 0x140520,
      metalColor: 0xff007f,
      glowColor: 0x00e5ff,
      flashColor: 0x00f7ff,
      tracerColor: 0x00ffff,
      particleColor: 0xd400ff,
      style: 'neon'
    }
  },
  {
    id: 'arctic_frost',
    name: 'Arctic Frost',
    description: 'Glacial cryo-blaster wrapped in sub-zero frost and crystalline ice.',
    unlockType: 'level',
    unlockValue: 6, // Reach level 6
    stats: {
      fireRateMs: 250,
      reloadTimeMs: 1300,
      recoilAmount: 19,
      capacity: 6
    },
    visuals: {
      primaryColor: 0x81d4fa,
      secondaryColor: 0xe1f5fe,
      gripColor: 0x0277bd,
      metalColor: 0xb3e5fc,
      glowColor: 0x4fc3f7,
      flashColor: 0x80deea,
      tracerColor: 0xb2ebf2,
      particleColor: 0xe0f7fa,
      style: 'frost'
    }
  },
  {
    id: 'crimson_strike',
    name: 'Crimson Strike',
    description: 'Aggressive tactical matte weapon accented with blazing vermilion heat sinks.',
    unlockType: 'coins',
    unlockValue: 1200,
    stats: {
      fireRateMs: 230,
      reloadTimeMs: 1250,
      recoilAmount: 24,
      capacity: 7
    },
    visuals: {
      primaryColor: 0x1a1a1a,
      secondaryColor: 0xd50000,
      gripColor: 0x111111,
      metalColor: 0xff1744,
      glowColor: 0xff5252,
      flashColor: 0xff1744,
      tracerColor: 0xff3d00,
      particleColor: 0xff8a80,
      style: 'crimson'
    }
  },
  {
    id: 'retro_arcade',
    name: 'Retro Arcade',
    description: 'Classic 1980s console light-gun replica with nostalgic clicky pop aesthetic.',
    unlockType: 'stars',
    unlockValue: 30, // 30 stars required
    stats: {
      fireRateMs: 230,
      reloadTimeMs: 1200,
      recoilAmount: 16,
      capacity: 8
    },
    visuals: {
      primaryColor: 0xd6d6d6,
      secondaryColor: 0xff5722,
      gripColor: 0x757575,
      metalColor: 0x424242,
      glowColor: 0xff7043,
      flashColor: 0xffab40,
      tracerColor: 0xff9100,
      particleColor: 0xffe0b2,
      style: 'retro'
    }
  },
  {
    id: 'carbon_shadow',
    name: 'Carbon Shadow',
    description: 'Black-ops composite pistol featuring woven carbon-fiber and low-signature finish.',
    unlockType: 'level',
    unlockValue: 12, // Reach level 12
    stats: {
      fireRateMs: 230,
      reloadTimeMs: 1200,
      recoilAmount: 17,
      capacity: 7
    },
    visuals: {
      primaryColor: 0x212121,
      secondaryColor: 0x616161,
      gripColor: 0x141414,
      metalColor: 0x424242,
      glowColor: 0x90a4ae,
      flashColor: 0xcfd8dc,
      tracerColor: 0xb0bec5,
      particleColor: 0xffffff,
      style: 'carbon'
    }
  },
  {
    id: 'emerald_circuit',
    name: 'Emerald Circuit',
    description: 'Microprinted green silicon board inlaid with radiant gold circuit pathways.',
    unlockType: 'coins',
    unlockValue: 1800,
    stats: {
      fireRateMs: 220,
      reloadTimeMs: 1150,
      recoilAmount: 16,
      capacity: 8
    },
    visuals: {
      primaryColor: 0x004d40,
      secondaryColor: 0x00e676,
      gripColor: 0x00332c,
      metalColor: 0xffd54f,
      glowColor: 0x69f0ae,
      flashColor: 0xb9f6ca,
      tracerColor: 0x00e676,
      particleColor: 0xa7ffeb,
      style: 'circuit'
    }
  },
  {
    id: 'sunset_chrome',
    name: 'Sunset Chrome',
    description: 'Mirror-polished chrome slide bathing in dusk orange and electric violet gradients.',
    unlockType: 'ad',
    unlockValue: 0,
    rewardId: 'skin_sunset_chrome',
    stats: {
      fireRateMs: 220,
      reloadTimeMs: 1100,
      recoilAmount: 18,
      capacity: 8
    },
    visuals: {
      primaryColor: 0xff6f00,
      secondaryColor: 0xaa00ff,
      gripColor: 0x3e2723,
      metalColor: 0xffd54f,
      glowColor: 0xff4081,
      flashColor: 0xff80ab,
      tracerColor: 0xff1744,
      particleColor: 0xff80ab,
      style: 'sunset'
    }
  },
  {
    id: 'galaxy_prism',
    name: 'Galaxy Prism',
    description: 'Mythic cosmic frame swirling with distant nebula starlight and celestial nebulae.',
    unlockType: 'level',
    unlockValue: 25, // Reach level 25
    stats: {
      fireRateMs: 210,
      reloadTimeMs: 1050,
      recoilAmount: 15,
      capacity: 9
    },
    visuals: {
      primaryColor: 0x311b92,
      secondaryColor: 0xe040fb,
      gripColor: 0x1a237e,
      metalColor: 0x00e5ff,
      glowColor: 0x7c4dff,
      flashColor: 0xe1bee7,
      tracerColor: 0x651fff,
      particleColor: 0xffffff,
      style: 'galaxy'
    }
  }
];

export const DEFAULT_SKIN_ID = 'classic_timber';

export function getSkinById(id: string): WeaponSkin {
  return WEAPON_SKINS.find(s => s.id === id) || WEAPON_SKINS[0];
}

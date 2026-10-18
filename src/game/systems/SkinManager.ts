import { WeaponSkin, WEAPON_SKINS, getSkinById, DEFAULT_SKIN_ID } from '../data/weapons';
import { SaveManager } from './SaveManager';
import { IPlayablesAdapter } from '../platform/types';

export class SkinManager {
  private static instance: SkinManager | null = null;
  private saveManager: SaveManager;
  private adapter: IPlayablesAdapter;

  private constructor(saveManager: SaveManager, adapter: IPlayablesAdapter) {
    this.saveManager = saveManager;
    this.adapter = adapter;
  }

  static getInstance(saveManager?: SaveManager, adapter?: IPlayablesAdapter): SkinManager {
    if (!SkinManager.instance) {
      if (!saveManager || !adapter) throw new Error('SkinManager requires SaveManager and IPlayablesAdapter');
      SkinManager.instance = new SkinManager(saveManager, adapter);
    }
    return SkinManager.instance;
  }

  getAllSkins(): WeaponSkin[] {
    return WEAPON_SKINS;
  }

  getEquippedSkin(): WeaponSkin {
    const id = this.saveManager.getSelectedSkin();
    return getSkinById(id);
  }

  isSkinUnlocked(skinId: string): boolean {
    return this.saveManager.isSkinUnlocked(skinId);
  }

  canUnlock(skin: WeaponSkin): { canUnlock: boolean; reason?: string } {
    if (this.isSkinUnlocked(skin.id)) {
      return { canUnlock: true, reason: 'Already unlocked' };
    }

    switch (skin.unlockType) {
      case 'starter':
        return { canUnlock: true };
      case 'level': {
        const currentLvl = this.saveManager.getUnlockedLevels();
        const met = currentLvl >= skin.unlockValue;
        return {
          canUnlock: met,
          reason: met ? 'Level reached!' : `Unlocks at Level ${skin.unlockValue}`
        };
      }
      case 'stars': {
        const stars = this.saveManager.getTotalStars();
        const met = stars >= skin.unlockValue;
        return {
          canUnlock: met,
          reason: met ? 'Stars collected!' : `Requires ${skin.unlockValue} Total Stars (${stars}/${skin.unlockValue})`
        };
      }
      case 'coins': {
        const coins = this.saveManager.getCoins();
        const met = coins >= skin.unlockValue;
        return {
          canUnlock: met,
          reason: met ? 'Enough coins!' : `Cost: ${skin.unlockValue} Coins`
        };
      }
      case 'ad': {
        return {
          canUnlock: true,
          reason: 'Watch Rewarded Ad to Unlock'
        };
      }
    }
  }

  async equipSkin(skinId: string): Promise<boolean> {
    if (this.isSkinUnlocked(skinId)) {
      await this.saveManager.selectSkin(skinId);
      return true;
    }
    return false;
  }

  async purchaseWithCoins(skin: WeaponSkin): Promise<boolean> {
    if (skin.unlockType !== 'coins') return false;
    if (this.isSkinUnlocked(skin.id)) return true;

    const success = await this.saveManager.spendCoins(skin.unlockValue);
    if (success) {
      await this.saveManager.unlockSkin(skin.id);
      await this.saveManager.selectSkin(skin.id);
      return true;
    }
    return false;
  }

  async unlockViaRewardedAd(skin: WeaponSkin): Promise<boolean> {
    if (skin.unlockType !== 'ad' && !skin.rewardId) return false;
    const rewardId = skin.rewardId || `skin_${skin.id}`;

    try {
      const earned = await this.adapter.requestRewardedAd(rewardId);
      if (earned) {
        await this.saveManager.unlockSkin(skin.id);
        await this.saveManager.selectSkin(skin.id);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[SkinManager] Rewarded ad error during skin unlock:', e);
      return false;
    }
  }

  async checkAutoUnlocks(): Promise<void> {
    for (const skin of WEAPON_SKINS) {
      if (this.isSkinUnlocked(skin.id)) continue;

      if (skin.unlockType === 'level' && this.saveManager.getUnlockedLevels() >= skin.unlockValue) {
        await this.saveManager.unlockSkin(skin.id);
      } else if (skin.unlockType === 'stars' && this.saveManager.getTotalStars() >= skin.unlockValue) {
        await this.saveManager.unlockSkin(skin.id);
      }
    }
  }
}

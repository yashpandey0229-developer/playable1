import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { WEAPON_SKINS, DEFAULT_SKIN_ID, getSkinById } from '../src/game/data/weapons';

describe('Weapon Skins Integrity', () => {
  test('default skin exists and is unlocked as a starter weapon', () => {
    const defaultSkin = getSkinById(DEFAULT_SKIN_ID);
    assert.ok(defaultSkin, 'Default skin must exist');
    assert.equal(defaultSkin.id, DEFAULT_SKIN_ID);
    assert.equal(defaultSkin.unlockType, 'starter');
    assert.equal(defaultSkin.unlockValue, 0);
  });

  test('all weapon skins have valid stats, visuals, and unlock criteria', () => {
    const validUnlockTypes = new Set(['starter', 'level', 'stars', 'coins', 'ad']);
    const ids = new Set<string>();

    WEAPON_SKINS.forEach((skin) => {
      assert.ok(!ids.has(skin.id), `Duplicate skin ID found: ${skin.id}`);
      ids.add(skin.id);

      assert.ok(skin.name.length > 0, `Skin ${skin.id} missing name`);
      assert.ok(skin.description.length > 0, `Skin ${skin.id} missing description`);
      assert.ok(validUnlockTypes.has(skin.unlockType), `Skin ${skin.id} has invalid unlockType: ${skin.unlockType}`);

      // Stats
      assert.ok(skin.stats.capacity >= 6, `Skin ${skin.id} capacity (${skin.stats.capacity}) must be >= 6`);
      assert.ok(skin.stats.fireRateMs >= 150, `Skin ${skin.id} fire rate must be realistic (>= 150ms)`);
      assert.ok(skin.stats.reloadTimeMs >= 800, `Skin ${skin.id} reload time must be realistic (>= 800ms)`);
      assert.ok(skin.stats.recoilAmount > 0, `Skin ${skin.id} recoil must be > 0`);

      // Visual colors
      assert.ok(typeof skin.visuals.primaryColor === 'number', `Skin ${skin.id} primaryColor must be number`);
      assert.ok(typeof skin.visuals.tracerColor === 'number', `Skin ${skin.id} tracerColor must be number`);

      // Rewarded ad skin must have rewardId
      if (skin.unlockType === 'ad') {
        assert.ok(skin.rewardId && skin.rewardId.length > 0, `Ad skin ${skin.id} must define a static rewardId`);
      }
    });
  });

  test('getSkinById falls back safely to default skin on unknown ID', () => {
    const fallback = getSkinById('non_existent_skin_xyz');
    assert.equal(fallback.id, DEFAULT_SKIN_ID);
  });
});

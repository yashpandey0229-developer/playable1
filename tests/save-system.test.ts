import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager } from '../src/game/systems/SaveManager';
import { MockPlayablesAdapter } from '../src/game/platform/MockPlayablesAdapter';
import { DEFAULT_SKIN_ID } from '../src/game/data/weapons';

describe('SaveManager Cloud Progression & Migration Suite', () => {
  let adapter: MockPlayablesAdapter;
  let saveManager: SaveManager;

  beforeEach(() => {
    SaveManager.resetInstance();
    adapter = new MockPlayablesAdapter();
    saveManager = SaveManager.getInstance(adapter);
  });

  test('initializes with default progression state starting at Level 1', () => {
    const data = saveManager.getDefaultData();
    assert.equal(data.version, 1);
    assert.equal(data.unlockedLevels, 1, 'Fresh players must start at Level 1');
    assert.equal(data.coins, 200, 'Starting bonus coins must be 200');
    assert.equal(data.highScore, 0);
    assert.deepEqual(data.unlockedSkins, [DEFAULT_SKIN_ID]);
    assert.equal(data.selectedSkin, DEFAULT_SKIN_ID);
    assert.equal(data.soundEnabled, true);
  });

  test('validateAndMigrate heals old bug where 0 stars had unlockedLevels: 30', () => {
    const corruptLegacySave = {
      version: 1,
      unlockedLevels: 30, // Old bug
      coins: 500,
      highScore: 0,
      stars: {}, // 0 stars earned
      unlockedSkins: [DEFAULT_SKIN_ID],
      selectedSkin: DEFAULT_SKIN_ID
    };

    const healed = saveManager.validateAndMigrate(corruptLegacySave);
    assert.equal(healed.unlockedLevels, 1, 'Must reset to Level 1 because 0 levels were completed');
    assert.equal(healed.coins, 500, 'Must preserve earned coins');
  });

  test('validateAndMigrate preserves legitimate progress when levels are completed', () => {
    const legitimateSave = {
      version: 1,
      unlockedLevels: 6,
      coins: 850,
      highScore: 4200,
      stars: { 1: 3, 2: 3, 3: 2, 4: 3, 5: 1 },
      levelScores: { 1: 900, 2: 850, 3: 750, 4: 920, 5: 780 },
      unlockedSkins: [DEFAULT_SKIN_ID, 'golden_blaster'],
      selectedSkin: 'golden_blaster'
    };

    const validated = saveManager.validateAndMigrate(legitimateSave);
    assert.equal(validated.unlockedLevels, 6);
    assert.equal(validated.coins, 850);
    assert.equal(validated.highScore, 4200);
    assert.equal(validated.stars[1], 3);
    assert.equal(validated.stars[5], 1);
    assert.equal(validated.selectedSkin, 'golden_blaster');
  });

  test('validateAndMigrate handles corrupt, null, and malformed structures gracefully', () => {
    const corruptValues = [null, undefined, '', 123, 'bad-json', {}, { stars: 'not-an-object' }];
    corruptValues.forEach(val => {
      const result = saveManager.validateAndMigrate(val);
      assert.ok(result, 'Must return a valid GameSaveData object');
      assert.equal(result.version, 1);
      assert.ok(result.unlockedLevels >= 1 && result.unlockedLevels <= 30);
      assert.ok(Array.isArray(result.unlockedSkins));
      assert.ok(result.unlockedSkins.includes(DEFAULT_SKIN_ID));
    });
  });

  test('atomic recordLevelVictory commits high score, stars, level unlock, and coins together', async () => {
    await saveManager.load();

    const isNewHigh = await saveManager.recordLevelVictory(1, 1500, 3, 100);
    assert.equal(isNewHigh, true);
    assert.equal(saveManager.getHighScore(), 1500);
    assert.equal(saveManager.getLevelStars(1), 3);
    assert.equal(saveManager.getLevelScore(1), 1500);
    assert.equal(saveManager.getUnlockedLevels(), 2, 'Level 2 should now be unlocked');
    assert.equal(saveManager.getCoins(), 300, '200 initial + 100 earned = 300');

    // Simulate second completion of same level with lower score
    const isNewHigh2 = await saveManager.recordLevelVictory(1, 1200, 2, 50);
    assert.equal(isNewHigh2, false, 'Lower score should not be new high score');
    assert.equal(saveManager.getHighScore(), 1500, 'High score must not regress');
    assert.equal(saveManager.getLevelStars(1), 3, 'Stars must not regress');
    assert.equal(saveManager.getCoins(), 350, 'Coins should still be awarded');
  });

  test('save queue coalescing: overlapping save requests never lose data and all resolve', async () => {
    await saveManager.load();

    // Trigger multiple asynchronous save-inducing mutations concurrently
    const p1 = saveManager.addCoins(50);
    const p2 = saveManager.addCoins(100);
    const p3 = saveManager.unlockLevel(3);
    const p4 = saveManager.addCoins(75);

    await Promise.all([p1, p2, p3, p4]);

    assert.equal(saveManager.getCoins(), 425, '200 + 50 + 100 + 75 = 425');
    assert.equal(saveManager.getUnlockedLevels(), 3, 'Level 3 must be unlocked');

    // Reload from adapter to verify persistence
    SaveManager.resetInstance();
    const newSaveManager = SaveManager.getInstance(adapter);
    await newSaveManager.load();

    assert.equal(newSaveManager.getCoins(), 425, 'Persisted coins must equal 425');
    assert.equal(newSaveManager.getUnlockedLevels(), 3, 'Persisted unlocked level must equal 3');
  });

  test('spendCoins correctly validates balances and prevents overdrawing', async () => {
    await saveManager.load();
    assert.equal(saveManager.getCoins(), 200);

    const success1 = await saveManager.spendCoins(150);
    assert.equal(success1, true);
    assert.equal(saveManager.getCoins(), 50);

    const success2 = await saveManager.spendCoins(100); // Exceeds balance
    assert.equal(success2, false);
    assert.equal(saveManager.getCoins(), 50, 'Balance must remain unchanged after failed spend');
  });
});

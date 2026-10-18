import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, getLevelById } from '../src/game/data/levels';

describe('Level Definitions & Progression Integrity', () => {
  test('exactly 30 levels are defined in sequential order from 1 to 30', () => {
    assert.equal(LEVELS.length, 30, 'There must be exactly 30 levels');
    for (let i = 0; i < 30; i++) {
      assert.equal(LEVELS[i].id, i + 1, `Level at index ${i} must have id ${i + 1}`);
    }
  });

  test('all 30 levels have valid configurations, ammo, targets, and star thresholds', () => {
    const validShelfTiers = new Set(['near', 'mid', 'far']);
    const validTargetTypes = new Set(['standard', 'amber', 'blue', 'golden', 'dynamite']);

    LEVELS.forEach((level) => {
      // Basic info
      assert.ok(level.title && level.title.length > 0, `Level ${level.id} title missing`);
      assert.ok(level.description && level.description.length > 0, `Level ${level.id} description missing`);

      // Ammo and Targets
      assert.ok(level.ammo >= 5, `Level ${level.id} ammo (${level.ammo}) must be >= 5`);
      assert.ok(level.targets.length >= 3, `Level ${level.id} target count (${level.targets.length}) must be >= 3`);

      // Star Thresholds must be strictly ascending
      assert.equal(level.starThresholds.length, 3, `Level ${level.id} must have 3 star thresholds`);
      assert.ok(level.starThresholds[0] > 0, `Level ${level.id} 1-star threshold must be > 0`);
      assert.ok(
        level.starThresholds[0] < level.starThresholds[1],
        `Level ${level.id} 2-star threshold must be > 1-star threshold`
      );
      assert.ok(
        level.starThresholds[1] < level.starThresholds[2],
        `Level ${level.id} 3-star threshold must be > 2-star threshold`
      );

      // Verify every target
      level.targets.forEach((target, tIdx) => {
        assert.ok(target.id, `Level ${level.id} target ${tIdx} missing id`);
        assert.ok(validShelfTiers.has(target.shelfTier), `Level ${level.id} target ${target.id} has invalid shelfTier: ${target.shelfTier}`);
        assert.ok(validTargetTypes.has(target.type), `Level ${level.id} target ${target.id} has invalid type: ${target.type}`);
        assert.ok(target.xNorm >= 0.05 && target.xNorm <= 0.95, `Level ${level.id} target ${target.id} xNorm ${target.xNorm} out of bounds`);
      });

      // Verify obstacles if present
      if (level.obstacles) {
        level.obstacles.forEach((obs, oIdx) => {
          assert.ok(obs.id, `Level ${level.id} obstacle ${oIdx} missing id`);
          assert.ok(validShelfTiers.has(obs.shelfTier), `Level ${level.id} obstacle ${obs.id} invalid shelfTier`);
          assert.ok(obs.width > 0 && obs.height > 0, `Level ${level.id} obstacle ${obs.id} dimensions invalid`);
        });
      }
    });
  });

  test('getLevelById retrieves correct level and falls back to Level 1 for invalid IDs', () => {
    assert.equal(getLevelById(1).id, 1);
    assert.equal(getLevelById(15).id, 15);
    assert.equal(getLevelById(30).id, 30);
    assert.equal(getLevelById(999).id, 1, 'Unknown ID should fall back to Level 1');
    assert.equal(getLevelById(-5).id, 1, 'Negative ID should fall back to Level 1');
  });
});

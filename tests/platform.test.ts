import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { MockPlayablesAdapter } from '../src/game/platform/MockPlayablesAdapter';
import { PlayablesAdapter } from '../src/game/platform/PlayablesAdapter';

describe('Platform Adapter Contracts & YouTube SDK Conformance', () => {
  let mockAdapter: MockPlayablesAdapter;

  beforeEach(() => {
    mockAdapter = new MockPlayablesAdapter();
  });

  test('MockPlayablesAdapter flags isMock as true and produces valid save lifecycle', async () => {
    assert.equal(mockAdapter.isMock, true);
    await mockAdapter.init();

    const initial = await mockAdapter.loadData();
    assert.ok(initial === null || typeof initial === 'object');

    const testSave = {
      version: 1,
      unlockedLevels: 4,
      highScore: 1200,
      coins: 450,
      stars: { 1: 3, 2: 2, 3: 1 },
      levelScores: { 1: 400, 2: 500, 3: 300 },
      unlockedSkins: ['classic_timber'],
      selectedSkin: 'classic_timber',
      soundEnabled: true
    };

    const saveSuccess = await mockAdapter.saveData(testSave);
    assert.equal(saveSuccess, true);

    const reloaded = await mockAdapter.loadData();
    assert.deepEqual(reloaded, testSave);
  });

  test('firstFrameReady and gameReady are idempotent and safe to call repeatedly', () => {
    // Should execute cleanly without throw on multiple calls
    assert.doesNotThrow(() => {
      mockAdapter.firstFrameReady();
      mockAdapter.firstFrameReady();
      mockAdapter.gameReady();
      mockAdapter.gameReady();
    });
  });

  test('audio and pause event listener registration and unregistration works cleanly', () => {
    let audioToggled = false;
    let pauseFired = false;
    let resumeFired = false;

    const unregAudio = mockAdapter.onAudioEnabledChange((en) => { audioToggled = en; });
    const unregPause = mockAdapter.onPause(() => { pauseFired = true; });
    const unregResume = mockAdapter.onResume(() => { resumeFired = true; });

    mockAdapter.setMockAudioEnabled(false);
    assert.equal(audioToggled, false);
    assert.equal(mockAdapter.isAudioEnabled(), false);

    mockAdapter.triggerMockPause();
    assert.equal(pauseFired, true);

    mockAdapter.triggerMockResume();
    assert.equal(resumeFired, true);

    // Unregister
    unregAudio();
    unregPause();
    unregResume();

    // Trigger again; listeners should not fire
    pauseFired = false;
    mockAdapter.triggerMockPause();
    assert.equal(pauseFired, false, 'Unregistered pause listener must not fire');
  });

  test('PlayablesAdapter validates 3 MiB byte size limit and rejects oversized payload', async () => {
    const prodAdapter = new PlayablesAdapter();
    assert.equal(prodAdapter.isMock, false);

    // Create a payload larger than 3 MiB
    const largeString = 'a'.repeat(3.1 * 1024 * 1024);
    const oversizedData: any = {
      version: 1,
      unlockedLevels: 1,
      highScore: 0,
      coins: 0,
      stars: {},
      levelScores: {},
      unlockedSkins: [largeString],
      selectedSkin: 'classic_timber',
      soundEnabled: true
    };

    const saved = await prodAdapter.saveData(oversizedData);
    assert.equal(saved, false, 'Saves exceeding 3 MiB must be rejected');
  });
});

import Phaser from 'phaser';
import { createGameConfig } from './game/GameConfig';
import { getPlayablesAdapter } from './game/platform';


async function bootstrap(): Promise<void> {
  try {
    // Prevent context menu and gestures
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Prevent default touch gestures that cause page zoom or pull-to-refresh
    document.addEventListener(
      'touchmove',
      (e) => {
        if (e.target instanceof HTMLCanvasElement) {
          e.preventDefault();
        }
      },
      { passive: false }
    );

    // Initialize YouTube Playables SDK adapter (or dev mock adapter)
    const adapter = getPlayablesAdapter();
    await adapter.init();

    // Initialize Phaser Game instance
    const config = createGameConfig();
    const game = new Phaser.Game(config);

    // Preserve game instance reference
    (window as any).__bottleBlastGame = game;
    console.log('[Bottle Blast] Game initialized successfully.');
  } catch (err) {
    console.error('[Bottle Blast] Failed to bootstrap game:', err);
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}


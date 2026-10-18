import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { LoadingScene } from './scenes/LoadingScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultsScene } from './scenes/ResultsScene';
import { SkinScene } from './scenes/SkinScene';
import { PauseScene } from './scenes/PauseScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#0d0705',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%'
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    render: {
      antialias: true,
      pixelArt: false,
      powerPreference: 'high-performance'
    },
    scene: [
      BootScene,
      LoadingScene,
      MenuScene,
      GameScene,
      ResultsScene,
      SkinScene,
      PauseScene
    ]
  };
}

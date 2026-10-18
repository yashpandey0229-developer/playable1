import Phaser from 'phaser';
import { ArtGenerator } from '../systems/ArtGenerator';
import { getPlayablesAdapter } from '../platform';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    const adapter = getPlayablesAdapter();

    // 1. Bake all procedural textures into Phaser cache
    ArtGenerator.generateAll(this);

    // 2. Notify YouTube Playables SDK that first visual frame is ready
    adapter.firstFrameReady();

    // 3. Move to LoadingScene
    this.scene.start('LoadingScene');
  }
}

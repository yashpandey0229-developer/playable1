import { IPlayablesAdapter } from '../platform/types';
import { WeaponSkin } from '../data/weapons';

export class AudioManager {
  private static instance: AudioManager | null = null;
  private ctx: AudioContext | null = null;
  private adapter: IPlayablesAdapter;
  private isUserMuted = false;
  private isPlatformMuted = false;
  private isPaused = false;
  private bgmOscillator: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;

  private constructor(adapter: IPlayablesAdapter) {
    this.adapter = adapter;
    this.isPlatformMuted = !adapter.isAudioEnabled();

    // Listen to YouTube system audio changes
    this.adapter.onAudioEnabledChange((enabled: boolean) => {
      this.isPlatformMuted = !enabled;
      this.updateGlobalGain();
    });

    // Listen to YouTube system pause/resume
    this.adapter.onPause(() => {
      this.isPaused = true;
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
    });

    this.adapter.onResume(() => {
      this.isPaused = false;
      if (this.ctx && this.ctx.state === 'suspended' && this.isAudioAllowed()) {
        this.ctx.resume().catch(() => {});
      }
    });
  }

  static getInstance(adapter?: IPlayablesAdapter): AudioManager {
    if (!AudioManager.instance) {
      if (!adapter) throw new Error('AudioManager requires an IPlayablesAdapter on first initialization');
      AudioManager.instance = new AudioManager(adapter);
    }
    return AudioManager.instance;
  }

  private initContext(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && this.isAudioAllowed()) {
      this.ctx.resume().catch(() => {});
    }
  }

  isAudioAllowed(): boolean {
    return !this.isUserMuted && !this.isPlatformMuted && !this.isPaused;
  }

  setUserMuted(muted: boolean): void {
    this.isUserMuted = muted;
    this.updateGlobalGain();
  }

  isMuted(): boolean {
    return this.isUserMuted || this.isPlatformMuted;
  }

  private updateGlobalGain(): void {
    if (this.ctx) {
      if (!this.isAudioAllowed()) {
        if (this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      } else {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    }
  }

  // --- Sound Effects Synthesizer ---

  /**
   * Gunshot sound tailored to weapon skin aesthetics
   */
  playShoot(skin?: WeaponSkin): void {
    if (!this.isAudioAllowed()) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const style = skin?.visuals.style || 'vintage';

    if (style === 'retro') {
      // 8-bit arcade laser / pop sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
      return;
    }

    if (style === 'neon' || style === 'circuit') {
      // Sci-fi synth energy pulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.18);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
      return;
    }

    // Classic / Punchy gunshot with transient noise burst and low-end thud
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter noise for mechanical punch
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(style === 'frost' ? 2400 : 1200, t);
    filter.Q.setValueAtTime(1.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    // Low-end oscillator kick
    const kick = this.ctx.createOscillator();
    const kickGain = this.ctx.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(180, t);
    kick.frequency.exponentialRampToValueAtTime(40, t + 0.14);
    kickGain.gain.setValueAtTime(0.5, t);
    kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.14);

    kick.connect(kickGain);
    kickGain.connect(this.ctx.destination);

    noiseSource.start(t);
    kick.start(t);
    kick.stop(t + 0.15);
  }

  /**
   * Mechanical reload sound (slide action and ammo click)
   */
  playReload(): void {
    if (!this.isAudioAllowed()) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // First click: slide pull
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(450, t);
    osc1.frequency.exponentialRampToValueAtTime(200, t + 0.08);
    gain1.gain.setValueAtTime(0.2, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.08);

    // Second click: slide snap forward
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(250, t + 0.18);
    osc2.frequency.exponentialRampToValueAtTime(550, t + 0.26);
    gain2.gain.setValueAtTime(0.25, t + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.26);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(t + 0.18);
    osc2.stop(t + 0.26);
  }

  /**
   * Crisp glass bottle shattering sound with shards tinkling
   */
  playGlassBreak(type: string = 'standard'): void {
    if (!this.isAudioAllowed()) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseFreq = type === 'golden' ? 2400 : type === 'blue' ? 1800 : 1400;

    // High frequency noise burst
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(baseFreq, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);

    // Resonant chime shards
    const chimeFrequencies = [baseFreq * 1.2, baseFreq * 1.5, baseFreq * 1.8];
    chimeFrequencies.forEach((freq, idx) => {
      if (!this.ctx) return;
      const chime = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(freq, t + (idx * 0.03));
      chimeGain.gain.setValueAtTime(0.15 / (idx + 1), t + (idx * 0.03));
      chimeGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22 + (idx * 0.04));
      chime.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chime.start(t + (idx * 0.03));
      chime.stop(t + 0.22 + (idx * 0.04));
    });
  }

  /**
   * Wooden ricochet / obstacle thud
   */
  playObstacleHit(): void {
    if (!this.isAudioAllowed()) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.1);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  /**
   * Ascending combo chord milestone
   */
  playCombo(multiplier: number): void {
    if (!this.isAudioAllowed()) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseNotes = [440, 554, 659, 880, 1108]; // A Major scale
    const noteIndex = Math.min(baseNotes.length - 1, Math.floor(multiplier));
    const freq = baseNotes[noteIndex];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * Level cleared victory fanfare
   */
  playVictory(): void {
    if (!this.isAudioAllowed()) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + (idx * 0.12));
      gain.gain.setValueAtTime(0.2, t + (idx * 0.12));
      gain.gain.exponentialRampToValueAtTime(0.01, t + (idx * 0.12) + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + (idx * 0.12));
      osc.stop(t + (idx * 0.12) + 0.35);
    });
  }

  /**
   * Level failed sound
   */
  playDefeat(): void {
    if (!this.isAudioAllowed()) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [440, 415, 392, 349];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + (idx * 0.16));
      gain.gain.setValueAtTime(0.15, t + (idx * 0.16));
      gain.gain.exponentialRampToValueAtTime(0.01, t + (idx * 0.16) + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + (idx * 0.16));
      osc.stop(t + (idx * 0.16) + 0.3);
    });
  }

  /**
   * Star earned chime on results screen
   */
  playStarChime(starIndex: number): void {
    if (!this.isAudioAllowed()) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const frequencies = [659.25, 830.61, 987.77];
    const freq = frequencies[starIndex % frequencies.length];

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.25);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.005, t + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * UI Click
   */
  playClick(): void {
    if (!this.isAudioAllowed()) return;
    this.initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.04);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }
}

import { IPlayablesAdapter } from './types';
import { PlayablesAdapter } from './PlayablesAdapter';
import { MockPlayablesAdapter } from './MockPlayablesAdapter';

let adapterInstance: IPlayablesAdapter | null = null;

export function isYouTubeEnvironment(): boolean {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  if (params.get('mock') === 'true') return false;
  if (params.get('force_yt') === 'true') return true;

  if (window.ytgame?.IN_PLAYABLES_ENV) {
    return true;
  }

  const isLocalHost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0' ||
    window.location.hostname.endsWith('.local') ||
    window.location.hostname === '';

  // YouTube Playables always embed games in a sandboxed cross-origin iframe
  const isInsideIframe = window.self !== window.top;

  return Boolean(window.ytgame && isInsideIframe && !isLocalHost);
}

export function getPlayablesAdapter(): IPlayablesAdapter {
  if (!adapterInstance) {
    if (isYouTubeEnvironment()) {
      console.log('[Platform] Embedded in YouTube environment. Using PlayablesAdapter.');
      adapterInstance = new PlayablesAdapter();
    } else {
      console.info('[Platform] Standalone / Development environment detected. Using MockPlayablesAdapter.');
      adapterInstance = new MockPlayablesAdapter();
    }
  }
  return adapterInstance;
}

export function resetPlayablesAdapter(): void {
  adapterInstance = null;
}

export * from './types';
export { PlayablesAdapter, MockPlayablesAdapter };


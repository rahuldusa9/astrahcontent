/**
 * AstrahContent — Central Configuration
 * Secure key resolution: LocalStorage -> Server API (/api/config) -> Fallback
 */

let resolvedApiKey = localStorage.getItem('astrah_openrouter_key') || '';

// If running in browser environment, attempt to fetch from server config
if (typeof window !== 'undefined') {
  fetch('/api/config')
    .then(r => r.ok ? r.json() : null)
    .then(cfg => {
      if (cfg && cfg.OPENROUTER_API_KEY && !localStorage.getItem('astrah_openrouter_key')) {
        resolvedApiKey = cfg.OPENROUTER_API_KEY;
      }
    })
    .catch(() => {});
}

export function getApiKey() {
  return localStorage.getItem('astrah_openrouter_key') || resolvedApiKey || '';
}

export function setApiKey(key) {
  resolvedApiKey = key;
  if (key) {
    localStorage.setItem('astrah_openrouter_key', key);
  } else {
    localStorage.removeItem('astrah_openrouter_key');
  }
}

export const OPENROUTER_MODEL   = 'nvidia/nemotron-3-ultra-550b-a55b';
export const OPENROUTER_URL     = 'https://openrouter.ai/api/v1/chat/completions';

export const APP_NAME           = 'AstrahContent';
export const APP_VERSION        = '1.0.0';
export const HYPERFRAMES_VERSION = '0.8.123';

export const STUDIO_URL         = './studio.html';
export const LANDING_URL        = './index.html';

export const DEFAULT_VIDEO_DURATION = 60;
export const DEFAULT_FPS            = 30;

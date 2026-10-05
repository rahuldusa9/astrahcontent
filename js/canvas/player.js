/**
 * AstrahContent — Video Preview Playback Engine
 * Supports both the static HyperFrames scene system AND
 * dynamically injected LLM-generated render functions (Full AI Mode).
 */
import { state } from '../state.js';
import {
  drawBackground,
  drawIntroScene,
  drawConceptScene,
  drawAnimationScene,
  drawSummaryScene,
  formatTime,
} from './scenes.js';

// ── LLM-Generated Render Injection ────────────────────────────
// When Full AI Mode runs, this is set to the LLM-compiled render fn.
// Set to null to fall back to the static scene system.
let _aiRenderFn = null;

/** Set the LLM-generated render function. Pass null to clear. */
export function setAIRenderFn(fn) {
  _aiRenderFn = fn;
}

/** Get the current AI render fn (or null). */
export function getAIRenderFn() {
  return _aiRenderFn;
}

// ── Public API ────────────────────────────────────────────────

export function initPreviewCanvas() {
  const canvas = document.getElementById('previewCanvas');
  if (!canvas) return;
  canvas.width  = 1280;
  canvas.height = 720;
  renderPreviewFrame(state.playbackTime);
}

export function renderPreviewFrame(time) {
  const canvas = document.getElementById('previewCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // ── Full AI Mode: call the LLM-generated function directly ──
  if (_aiRenderFn) {
    try {
      ctx.save();
      _aiRenderFn(ctx, W, H, time, state.videoDuration);
      ctx.restore();

      // Timestamp overlay on top
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font      = '18px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatTime(time), W - 20, H - 16);

      // AI Mode badge
      ctx.fillStyle = 'rgba(168,85,247,0.85)';
      ctx.beginPath();
      ctx.roundRect(W - 140, H - 44, 120, 26, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font      = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ Full AI Mode', W - 80, H - 26);
    } catch (err) {
      // If generated code crashes, show the error on canvas
      ctx.fillStyle = '#0a0010';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Generated Code Error:', W/2, H/2 - 40);
      ctx.fillStyle = '#fca5a5';
      ctx.font = '18px monospace';
      ctx.fillText(String(err).slice(0, 80), W/2, H/2 + 10);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px monospace';
      ctx.fillText('Check browser console for full stack trace', W/2, H/2 + 50);
      console.error('[HyperFrames AI Mode] Render error:', err);
    }
    return;
  }

  // ── Static Mode: original HyperFrames scene system ──────────
  drawBackground(ctx, W, H, time);

  const pct = time / state.videoDuration;
  if      (pct < 0.15) drawIntroScene    (ctx, W, H, time, pct / 0.15);
  else if (pct < 0.45) drawConceptScene  (ctx, W, H, time, (pct - 0.15) / 0.30);
  else if (pct < 0.75) drawAnimationScene(ctx, W, H, time, (pct - 0.45) / 0.30);
  else                 drawSummaryScene  (ctx, W, H, time, (pct - 0.75) / 0.25);

  // Timestamp
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font      = '20px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatTime(time), W - 20, H - 16);
}

export function togglePlayback() {
  state.isPlaying ? stopPlayback() : startPlayback();
}

export function startPlayback() {
  state.isPlaying = true;
  const playIcon = document.getElementById('play-icon');
  if (playIcon) playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';

  state.playbackInterval = setInterval(() => {
    state.playbackTime += 0.1;
    if (state.playbackTime >= state.videoDuration) state.playbackTime = 0;
    updatePlaybackUI();
  }, 100);
}

export function stopPlayback() {
  state.isPlaying = false;
  clearInterval(state.playbackInterval);
  state.playbackInterval = null;
  const playIcon = document.getElementById('play-icon');
  if (playIcon) playIcon.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
}

export function rewindVideo() {
  state.playbackTime = 0;
  updatePlaybackUI();
}

// ── Internal ──────────────────────────────────────────────────

function updatePlaybackUI() {
  const pct  = (state.playbackTime / state.videoDuration) * 100;
  const prog = document.getElementById('timeline-progress');
  const head = document.getElementById('timeline-playhead');
  const disp = document.getElementById('time-display');
  if (prog) prog.style.width  = pct + '%';
  if (head) head.style.left   = pct + '%';
  if (disp) disp.textContent  = `${formatTime(state.playbackTime)} / ${formatTime(state.videoDuration)}`;
  renderPreviewFrame(state.playbackTime);
}

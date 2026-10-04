/**
 * AstrahContent — Video Preview Playback Engine
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

  drawBackground(ctx, W, H, time);

  const pct = time / state.videoDuration;
  if      (pct < 0.15) drawIntroScene    (ctx, W, H, time, pct / 0.15);
  else if (pct < 0.45) drawConceptScene  (ctx, W, H, time, (pct - 0.15) / 0.30);
  else if (pct < 0.75) drawAnimationScene(ctx, W, H, time, (pct - 0.45) / 0.30);
  else                 drawSummaryScene  (ctx, W, H, time, (pct - 0.75) / 0.25);

  // Timestamp
  ctx.fillStyle  = 'rgba(255,255,255,0.45)';
  ctx.font       = '20px Inter, sans-serif';
  ctx.textAlign  = 'right';
  ctx.fillText(formatTime(time), W - 20, H - 16);
}

export function togglePlayback() {
  state.isPlaying ? stopPlayback() : startPlayback();
}

export function startPlayback() {
  state.isPlaying      = true;
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

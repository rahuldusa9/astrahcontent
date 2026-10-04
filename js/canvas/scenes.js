/**
 * AstrahContent — Preview Canvas Scene Renderers
 * Each function draws one scene type onto the given 2D context.
 */
import { state } from '../state.js';

/** Format seconds → "M:SS" */
export function formatTime(s) {
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ── Background shared layer ───────────────────────────────────
export function drawBackground(ctx, W, H, t) {
  ctx.fillStyle = '#070711';
  ctx.fillRect(0, 0, W, H);

  const angle = t * 0.5;
  const g1 = ctx.createRadialGradient(
    W * 0.3 + Math.sin(angle) * 100, H * 0.4 + Math.cos(angle) * 60, 0,
    W * 0.3, H * 0.4, 400,
  );
  g1.addColorStop(0, 'rgba(168,85,247,0.15)');
  g1.addColorStop(1, 'transparent');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(
    W * 0.7 + Math.cos(angle) * 80, H * 0.6 + Math.sin(angle) * 50, 0,
    W * 0.7, H * 0.6, 350,
  );
  g2.addColorStop(0, 'rgba(6,182,212,0.12)');
  g2.addColorStop(1, 'transparent');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Particles
  for (let i = 0; i < 20; i++) {
    const px    = ((i * 137.5 + t * 30 * (i % 3 === 0 ? 1 : -1)) % W + W) % W;
    const py    = ((i * 89.3  + t * 15) % H + H) % H;
    const alpha = 0.3 + 0.3 * Math.sin(t * 2 + i);
    ctx.beginPath();
    ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? `rgba(168,85,247,${alpha})` : `rgba(6,182,212,${alpha})`;
    ctx.fill();
  }
}

// ── Scene 1: Intro Title ──────────────────────────────────────
export function drawIntroScene(ctx, W, H, t, progress) {
  let title    = 'Your Video';
  let subtitle = 'AstrahContent × HyperFrames';

  if (state.generatedScript) {
    title    = state.generatedScript.title ?? title;
    subtitle = `${state.generatedScript.scenes.length} scenes · ${state.generatedScript.totalDuration}s`;
  } else if (state.activeTemplate) {
    title    = state.activeTemplate.name;
    subtitle = state.activeTemplate.desc;
  } else {
    const raw = document.getElementById('video-topic')?.value?.trim() ?? '';
    if (raw) title = raw.length > 50 ? raw.substring(0, 50) + '…' : raw;
  }

  // Radiating lines
  ctx.save();
  ctx.translate(W / 2, H / 2);
  for (let i = 0; i < 12; i++) {
    const ang   = (i / 12) * Math.PI * 2 + t * 0.3;
    const len   = 100 + 80 * Math.sin(t * 1.5 + i * 0.5);
    const alpha = 0.15 + 0.1 * Math.sin(t + i);
    ctx.strokeStyle = i % 2 === 0 ? `rgba(168,85,247,${alpha})` : `rgba(6,182,212,${alpha})`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();

  ctx.globalAlpha = Math.min(1, progress * 3);
  ctx.textAlign   = 'center';

  // Wrapping title
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur  = 30;
  ctx.fillStyle   = '#f0f0ff';
  ctx.font        = 'bold 54px Inter, sans-serif';
  const words = title.split(' ');
  let line1 = '', line2 = '';
  words.forEach(w => {
    if (ctx.measureText(line1 + ' ' + w).width < W - 120)
      line1 += (line1 ? ' ' : '') + w;
    else
      line2 += (line2 ? ' ' : '') + w;
  });
  ctx.fillText(line1, W / 2, line2 ? H / 2 - 50 : H / 2 - 20);
  if (line2) ctx.fillText(line2, W / 2, H / 2 + 14);

  ctx.shadowBlur  = 0;
  ctx.font        = '22px Inter, sans-serif';
  ctx.fillStyle   = '#a0a0bf';
  ctx.fillText(
    subtitle.length > 80 ? subtitle.substring(0, 80) + '…' : subtitle,
    W / 2,
    line2 ? H / 2 + 60 : H / 2 + 28,
  );

  ctx.font      = '16px Inter, sans-serif';
  ctx.fillStyle = '#a855f7';
  ctx.fillText('Powered by HyperFrames + NVIDIA Nemotron', W / 2, line2 ? H / 2 + 96 : H / 2 + 64);
  ctx.globalAlpha = 1;
}

// ── Scene 2: Concept / Diagram ────────────────────────────────
export function drawConceptScene(ctx, W, H, t, progress) {
  const cx = W * 0.35, cy = H * 0.5;
  const numNodes = 6, radius = 120;

  for (let i = 0; i < numNodes; i++) {
    const ang = (i / numNodes) * Math.PI * 2 + t * 0.2;
    const nx  = cx + Math.cos(ang) * radius;
    const ny  = cy + Math.sin(ang) * radius;

    ctx.strokeStyle = 'rgba(168,85,247,0.3)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();

    ctx.beginPath();
    ctx.arc(nx, ny, 14 * (1 + 0.15 * Math.sin(t * 2 + i)), 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(168,85,247,0.8)' : 'rgba(6,182,212,0.8)';
    ctx.fill();
  }

  // Central glow node
  const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
  cg.addColorStop(0, '#c084fc'); cg.addColorStop(1, '#06b6d4');
  ctx.beginPath(); ctx.arc(cx, cy, 22 + 4 * Math.sin(t * 2), 0, Math.PI * 2);
  ctx.fillStyle = cg; ctx.fill();

  // Right-side text
  const tx = W * 0.62;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#a855f7'; ctx.font = 'bold 14px Inter, sans-serif';
  ctx.fillText('CONCEPT BREAKDOWN', tx, H * 0.3);
  ctx.fillStyle = '#f0f0ff'; ctx.font = 'bold 36px Inter, sans-serif';
  ctx.fillText('Core Mechanism', tx, H * 0.4);
  ctx.fillStyle = '#a0a0bf'; ctx.font = '18px Inter, sans-serif';
  ['Each component works together', 'to create the whole system.', 'Watch the connections form…']
    .forEach((l, i) => ctx.fillText(l, tx, H * 0.5 + i * 28));
}

// ── Scene 3: Data / Chart Animation ──────────────────────────
export function drawAnimationScene(ctx, W, H, t, progress) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a855f7'; ctx.font = 'bold 14px Inter, sans-serif';
  ctx.fillText('DATA VISUALIZATION', W / 2, 80);
  ctx.fillStyle = '#f0f0ff'; ctx.font = 'bold 32px Inter, sans-serif';
  ctx.fillText('Key Statistics', W / 2, 120);

  const data   = [0.65, 0.88, 0.42, 0.95, 0.73, 0.58];
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const barW   = 80, gap = 40, baseY = H - 160;
  const maxH   = 280;
  const startX = W / 2 - (data.length * (barW + gap)) / 2;

  data.forEach((val, i) => {
    const animated = val * Math.min(1, progress * 2 + i * 0.1);
    const bH = animated * maxH;
    const bX = startX + i * (barW + gap);
    const bY = baseY - bH;

    const bg = ctx.createLinearGradient(bX, bY, bX, baseY);
    bg.addColorStop(0, i % 2 === 0 ? '#a855f7' : '#06b6d4');
    bg.addColorStop(1, 'rgba(168,85,247,0.2)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(bX, bY, barW, bH, [6, 6, 0, 0]);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0f0ff'; ctx.font = 'bold 14px Inter, sans-serif';
    ctx.fillText(Math.round(animated * 100) + '%', bX + barW / 2, bY - 8);
    ctx.fillStyle = '#a0a0bf'; ctx.font = '14px Inter, sans-serif';
    ctx.fillText(labels[i], bX + barW / 2, baseY + 20);
  });
}

// ── Scene 4: Summary ─────────────────────────────────────────
export function drawSummaryScene(ctx, W, H, t, progress) {
  ctx.textAlign = 'center';
  ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 20;
  ctx.fillStyle = '#f0f0ff'; ctx.font = 'bold 52px Inter, sans-serif';
  ctx.fillText('Key Takeaways', W / 2, H * 0.28);
  ctx.shadowBlur = 0;

  ['✦ Core concept mastered', '✦ Mechanisms understood',
   '✦ Applications identified', '✦ Ready to go deeper'].forEach((pt, i) => {
    ctx.globalAlpha = Math.min(1, Math.max(0, progress * 4 - i * 0.8));
    ctx.fillStyle   = i % 2 === 0 ? '#c084fc' : '#22d3ee';
    ctx.font        = '24px Inter, sans-serif';
    ctx.fillText(pt, W / 2, H * 0.42 + i * 50);
  });
  ctx.globalAlpha = 1;

  const pulse = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(168,85,247,${pulse})`;
  ctx.font      = 'bold 18px Inter, sans-serif';
  ctx.fillText('AstrahContent × HyperFrames', W / 2, H - 60);
}

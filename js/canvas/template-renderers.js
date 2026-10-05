/**
 * AstrahContent — Pro Template Canvas Preview Renderers
 * Each function renders a live animated preview for a template.
 * All functions signature: (ctx, W, H, t, template)
 *  - t = elapsed time in seconds (drives animation)
 */

// ── Shared utilities ─────────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function easeIn(t) { return t * t * t; }

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function drawGlowText(ctx, text, x, y, color, size, blurAmt = 20) {
  ctx.save();
  ctx.shadowColor  = color;
  ctx.shadowBlur   = blurAmt;
  ctx.fillStyle    = color;
  ctx.font         = `bold ${size}px 'Space Grotesk', Inter, sans-serif`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawGradientRect(ctx, x, y, w, h, c1, c2, angle = 0) {
  const gx1 = x + Math.cos(angle) * w;
  const gy1 = y;
  const gx2 = x + Math.cos(angle + Math.PI) * w;
  const gy2 = y + h;
  const g = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

function drawChromAb(ctx, W, H, amount = 2) {
  ctx.save();
  // Lightweight chromatic aberration: offset red/cyan screen layers
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.04;
  ctx.fillStyle = 'rgba(255,0,0,1)';
  ctx.fillRect(amount, 0, W, H);
  ctx.fillStyle = 'rgba(0,255,255,1)';
  ctx.fillRect(-amount, 0, W, H);
  ctx.restore();
}

function drawScanlines(ctx, W, H, opacity = 0.08) {
  ctx.save();
  ctx.globalAlpha = opacity;
  for (let y = 0; y < H; y += 4) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, y, W, 2);
  }
  ctx.restore();
}

function drawFilmGrain(ctx, W, H, t, strength = 0.04) {
  ctx.save();
  ctx.globalAlpha = strength;
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 1.5;
    ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx, W, H, t, color1, color2, count = 30, speed = 1) {
  for (let i = 0; i < count; i++) {
    const px    = ((i * 137.5 + t * 40 * speed * (i % 3 === 0 ? 1 : -0.7)) % W + W) % W;
    const py    = ((i * 89.3  + t * 20 * speed) % H + H) % H;
    const alpha = 0.2 + 0.3 * Math.sin(t * 2 + i);
    const r     = 1.5 + (i % 3);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? color1.replace(')', `,${alpha})`) : color2.replace(')', `,${alpha})`);
    ctx.fill();
  }
}

function drawTextBlock(ctx, lines, startX, startY, lineH, align = 'center') {
  ctx.textAlign = align;
  lines.forEach((line, i) => {
    ctx.fillStyle = line.color;
    ctx.font      = `${line.weight || 'bold'} ${line.size}px ${line.font || "'Space Grotesk', Inter, sans-serif"}`;
    if (line.shadow) { ctx.shadowColor = line.shadow; ctx.shadowBlur = 20; }
    ctx.fillText(line.text, startX, startY + i * lineH);
    ctx.shadowBlur = 0;
  });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawLowerThird(ctx, W, H, title, subtitle, accentColor, t) {
  const progress = Math.min(1, t * 3);
  const xOff = lerp(-500, 0, easeOut(progress));
  ctx.save();
  // Background strip
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(xOff + 60, H - 120, 500, 60);
  // Accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(xOff + 60, H - 120, 5, 60);
  // Text
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Inter, sans-serif';
  ctx.fillText(title, xOff + 75, H - 96);
  ctx.fillStyle = '#aaa';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText(subtitle, xOff + 75, H - 74);
  ctx.restore();
}

function drawStatCard(ctx, cx, cy, value, label, color, t) {
  const scale = easeOut(Math.min(1, t * 2));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  // Card
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  drawRoundedRect(ctx, -120, -55, 240, 110, 12);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Value
  ctx.textAlign = 'center';
  ctx.shadowColor = color; ctx.shadowBlur = 15;
  ctx.fillStyle = color;
  ctx.font = 'bold 36px "Space Grotesk", sans-serif';
  ctx.fillText(value, 0, 8);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#888';
  ctx.font = '13px Inter, sans-serif';
  ctx.fillText(label, 0, 36);
  ctx.restore();
}

// ── 1. VIRAL HOOK ─────────────────────────────────────────────────────────
export function renderViralHook(ctx, W, H, t) {
  // Background — pure black with fire glow
  ctx.fillStyle = '#0a0000';
  ctx.fillRect(0, 0, W, H);

  // Fire gradient pulse
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  const g = ctx.createRadialGradient(W / 2, H * 0.6, 0, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, `rgba(239,68,68,${0.15 + pulse * 0.1})`);
  g.addColorStop(0.5, `rgba(245,158,11,${0.08 + pulse * 0.05})`);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Fast-cut scene indicator (flash on beat)
  const beat = Math.floor(t * 2) % 2;
  if (beat === 1 && (t * 2 - Math.floor(t * 2)) < 0.08) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, W, H);
  }

  // Counter hook opening — big number counts up
  if (t < 3) {
    const progress = t / 3;
    const num = Math.floor(progress * 97);
    ctx.textAlign = 'center';
    ctx.font = `bold ${Math.floor(140 + 20 * Math.sin(t * 10))}px "Space Grotesk", sans-serif`;
    ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 40;
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(num + '%', W / 2, H / 2 + 30);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('of people are doing it wrong', W / 2, H / 2 + 90);
  } else {
    // Title slam
    const slamProgress = easeOut(Math.min(1, (t - 3) * 4));
    const scaleY = 0.3 + 0.7 * slamProgress;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(1, scaleY);
    ctx.textAlign = 'center';
    ctx.font = 'bold 80px "Space Grotesk", sans-serif';
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 30;
    ctx.fillStyle = '#fff';
    ctx.fillText('THIS WILL CHANGE', 0, -30);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText('EVERYTHING', 0, 70);
    ctx.restore();
    ctx.shadowBlur = 0;

    // Chromatic aberration
    drawChromAb(ctx, W, H, 3 * (1 - easeOut(Math.min(1, (t - 3) * 2))));

    // Particles
    drawParticles(ctx, W, H, t, 'rgba(245,158,11', 'rgba(239,68,68', 15, 2);
  }

  // Lower third
  if (t > 4) drawLowerThird(ctx, W, H, 'Watch this through', 'AstrahContent Educational Video', '#f59e0b', t - 4);

  drawScanlines(ctx, W, H, 0.03);
}

// ── 2. TIKTOK BANGER ─────────────────────────────────────────────────────
export function renderTiktokBanger(ctx, W, H, t) {
  ctx.fillStyle = '#050010';
  ctx.fillRect(0, 0, W, H);

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, `rgba(99,102,241,${0.12 + 0.05 * Math.sin(t * 3)})`);
  g.addColorStop(1, `rgba(236,72,153,${0.08 + 0.04 * Math.cos(t * 2)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Beat pulse — screen flash
  const beatFreq = 2; // 2 beats/sec
  const beatPhase = (t * beatFreq) % 1;
  if (beatPhase < 0.05) {
    ctx.fillStyle = `rgba(255,255,255,${0.06 * (1 - beatPhase / 0.05)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Zoom punch text
  const wordTime = Math.floor(t * 1.5);
  const words = ['WAIT', '🔥', '3 TIPS', 'THAT HIT', 'DIFFERENT', '→'];
  const word = words[wordTime % words.length];
  const scale = 1 + 0.3 * (1 - Math.min(1, (t * 1.5 % 1) * 4));

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.font = `bold 100px "Space Grotesk", sans-serif`;
  ctx.shadowColor = '#ec4899'; ctx.shadowBlur = 25;
  ctx.fillStyle = '#fff';
  ctx.fillText(word, 0, 0);
  ctx.restore();
  ctx.shadowBlur = 0;

  // Subtitle line
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '18px Inter, sans-serif';
  ctx.fillText('That hit different', W / 2, H / 2 + 90);

  drawScanlines(ctx, W, H, 0.03);
}

// ── 3. EPIC EXPLAINER (Kurzgesagt) ────────────────────────────────────────
export function renderEpicExplainer(ctx, W, H, t) {
  ctx.fillStyle = '#0d0800';
  ctx.fillRect(0, 0, W, H);

  // Warm orange gradient universe
  const g = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.8);
  g.addColorStop(0, `rgba(249,115,22,${0.12 + 0.05 * Math.sin(t * 0.5)})`);
  g.addColorStop(0.5, 'rgba(251,191,36,0.05)');
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Particle system — orange stars
  drawParticles(ctx, W, H, t, 'rgba(249,115,22', 'rgba(251,191,36', 40, 0.5);

  // Animated diagram circles
  const cx = W * 0.35, cy = H * 0.5;
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2 + t * 0.3;
    const r = 100;
    const nx = cx + Math.cos(ang) * r;
    const ny = cy + Math.sin(ang) * r;

    ctx.beginPath();
    ctx.arc(cx, cy, 1, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(249,115,22,0.3)`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();

    const pulse = 1 + 0.15 * Math.sin(t * 2 + i);
    ctx.beginPath(); ctx.arc(nx, ny, 16 * pulse, 0, Math.PI * 2);
    const cg = ctx.createRadialGradient(nx, ny, 0, nx, ny, 16 * pulse);
    cg.addColorStop(0, '#f97316'); cg.addColorStop(1, 'rgba(249,115,22,0.2)');
    ctx.fillStyle = cg; ctx.fill();
  }
  // Center
  ctx.beginPath(); ctx.arc(cx, cy, 24 + 4 * Math.sin(t * 2), 0, Math.PI * 2);
  const cc = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
  cc.addColorStop(0, '#fbbf24'); cc.addColorStop(1, '#f97316');
  ctx.fillStyle = cc; ctx.fill();

  // Right side text
  const tx = W * 0.6;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fb923c'; ctx.font = 'bold 13px Inter, sans-serif';
  ctx.fillText('THE UNIVERSE IS STRANGER', tx, H * 0.3);
  ctx.shadowColor = '#f97316'; ctx.shadowBlur = 15;
  ctx.fillStyle = '#fef3c7'; ctx.font = `bold 36px "Space Grotesk", sans-serif`;
  ctx.fillText('Than You', tx, H * 0.42);
  ctx.fillText('Can Imagine', tx, H * 0.52);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#a78764'; ctx.font = '16px Inter, sans-serif';
  ctx.fillText('A story 13.8 billion years in the making', tx, H * 0.62);

  drawFilmGrain(ctx, W, H, t, 0.02);
}

// ── 4. TED MINIMAL ───────────────────────────────────────────────────────
export function renderTedMinimal(ctx, W, H, t) {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, W, H);

  // Minimal horizontal accent line
  const lineW = W * 0.6 * Math.min(1, t * 2);
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect((W - lineW) / 2, H * 0.35, lineW, 3);

  // Main heading — word by word
  const words = ['IDEAS', 'WORTH', 'SPREADING'];
  const showCount = Math.min(words.length, Math.floor(t * 1.2) + 1);
  ctx.textAlign = 'center';
  words.slice(0, showCount).forEach((w, i) => {
    const alpha = Math.min(1, (t * 1.2 - i) * 3);
    const yOff  = lerp(20, 0, easeOut(Math.min(1, (t * 1.2 - i) * 3)));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i === 1 ? '#f43f5e' : '#f8fafc';
    ctx.font = `bold 72px "Space Grotesk", sans-serif`;
    ctx.fillText(w, W / 2, H * 0.45 + i * 85 + yOff);
  });
  ctx.globalAlpha = 1;

  // Speaker subtitle
  if (t > 2) {
    const a = Math.min(1, (t - 2) * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '18px Inter, sans-serif';
    ctx.fillText('A talk that will challenge everything you believe', W / 2, H * 0.82);
    ctx.globalAlpha = 1;
  }

  // Progress bar at bottom
  const prog = (t % 8) / 8;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(W * 0.1, H - 20, W * 0.8, 3);
  ctx.fillStyle = '#f43f5e';
  ctx.fillRect(W * 0.1, H - 20, W * 0.8 * prog, 3);
}

// ── 5. DEEP SCIENCE (Veritasium) ─────────────────────────────────────────
export function renderDeepScience(ctx, W, H, t) {
  ctx.fillStyle = '#020817';
  ctx.fillRect(0, 0, W, H);

  const g = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.6);
  g.addColorStop(0, `rgba(14,165,233,${0.1 + 0.04 * Math.sin(t)})`);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  drawParticles(ctx, W, H, t, 'rgba(14,165,233', 'rgba(124,58,237', 25, 0.4);

  // Typewriter question
  const question = 'But Why Does This Happen?';
  const charCount = Math.min(question.length, Math.floor(t * 8));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e0f2fe';
  ctx.font = `bold 52px "Space Grotesk", sans-serif`;
  ctx.shadowColor = '#0ea5e9'; ctx.shadowBlur = 15;
  ctx.fillText(question.slice(0, charCount), W / 2, H / 2 - 20);
  ctx.shadowBlur = 0;

  // Cursor
  if (charCount < question.length || Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(W / 2 + ctx.measureText(question.slice(0, charCount)).width / 2 + 4, H / 2 - 56, 3, 48);
  }

  if (t > 3) {
    const a = Math.min(1, (t - 3) * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#64748b';
    ctx.font = '20px Inter, sans-serif';
    ctx.fillText('The answer will surprise you', W / 2, H / 2 + 40);
    ctx.globalAlpha = 1;
  }

  // Annotation arrow (hand-drawn style)
  if (t > 4) {
    const a = Math.min(1, (t - 4) * 3);
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(W * 0.72, H * 0.35);
    ctx.bezierCurveTo(W * 0.8, H * 0.3, W * 0.85, H * 0.35, W * 0.82, H * 0.43);
    ctx.stroke();
    ctx.fillStyle = '#fbbf24'; ctx.font = 'bold 13px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('← The key', W * 0.73, H * 0.3);
    ctx.globalAlpha = 1;
  }
}

// ── 6. VISUAL MATH (3Blue1Brown) ─────────────────────────────────────────
export function renderVisualMath(ctx, W, H, t) {
  ctx.fillStyle = '#000818';
  ctx.fillRect(0, 0, W, H);

  // Grid of math
  ctx.strokeStyle = 'rgba(59,130,246,0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Animated circle → euler
  const cx = W * 0.35, cy = H * 0.5;
  const radius = 120;
  ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.stroke();

  // Rotating point
  const ang = t * 1.2;
  const px = cx + Math.cos(ang) * radius;
  const py = cy + Math.sin(ang) * radius;

  // Dashed lines to axes
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = 'rgba(59,130,246,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(px, py); ctx.stroke();
  ctx.setLineDash([]);

  // Point
  ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#a78bfa'; ctx.fill();
  ctx.shadowColor = '#a78bfa'; ctx.shadowBlur = 20; ctx.fill(); ctx.shadowBlur = 0;

  // Sine wave trailing
  ctx.beginPath(); ctx.strokeStyle = '#60a5fa'; ctx.lineWidth = 2;
  for (let i = 0; i < 200; i++) {
    const x = cx + radius + 2 + i * 1.5;
    const y = cy + Math.sin(ang - i * 0.06) * radius;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Formula text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bfdbfe'; ctx.font = 'bold 28px "Space Grotesk", sans-serif';
  ctx.fillText(`e^(iπ) + 1 = 0`, W * 0.73, H * 0.25);
  ctx.fillStyle = '#64748b'; ctx.font = '16px Inter';
  ctx.fillText('The most beautiful equation', W * 0.73, H * 0.32);
}

// ── 7. CODE BANGER (Fireship) ─────────────────────────────────────────────
export function renderCodeBanger(ctx, W, H, t) {
  ctx.fillStyle = '#050008';
  ctx.fillRect(0, 0, W, H);

  // Code editor aesthetic
  const lines = [
    { code: 'const meaning = await findLife();', color: '#c084fc' },
    { code: 'if (!meaning) throw new Error("42");', color: '#818cf8' },
    { code: 'console.log("🔥 " + meaning);', color: '#4ade80' },
    { code: '// 100 seconds → senior dev', color: '#64748b' },
    { code: 'export default () => unstoppable;', color: '#f472b6' },
  ];

  const currentLine = Math.floor(t * 1.5) % lines.length;
  lines.forEach((line, i) => {
    const isActive = i === currentLine;
    const yPos = H * 0.28 + i * 52;
    if (isActive) {
      ctx.fillStyle = 'rgba(124,58,237,0.15)';
      ctx.fillRect(60, yPos - 30, W - 120, 44);
    }
    ctx.font = `${isActive ? 'bold' : 'normal'} 20px 'JetBrains Mono', monospace`;
    ctx.textAlign = 'left';
    ctx.fillStyle = isActive ? line.color : 'rgba(129,140,248,0.4)';
    if (isActive) { ctx.shadowColor = line.color; ctx.shadowBlur = 8; }
    ctx.fillText(line.code, 80, yPos);
    ctx.shadowBlur = 0;
  });

  // Top bar
  ctx.fillStyle = '#818cf8'; ctx.font = 'bold 14px Inter';
  ctx.textAlign = 'left';
  ctx.fillText('JavaScript in 100 Seconds', 80, H * 0.15);
  ctx.fillStyle = '#4ade80'; ctx.font = '12px JetBrains Mono';
  ctx.fillText('● LIVE', W - 120, H * 0.15);

  // Timer
  const remaining = Math.max(0, 100 - Math.floor(t * 5));
  ctx.textAlign = 'right';
  ctx.fillStyle = remaining < 20 ? '#ef4444' : '#94a3b8';
  ctx.font = 'bold 18px JetBrains Mono';
  ctx.fillText(`${remaining}s`, W - 80, H * 0.15);

  drawScanlines(ctx, W, H, 0.04);
  if (Math.floor(t * 3) % 3 === 0) drawChromAb(ctx, W, H, 1.5);
}

// ── 8. HACKER TERMINAL ────────────────────────────────────────────────────
export function renderHackerTerminal(ctx, W, H, t) {
  ctx.fillStyle = '#000d00';
  ctx.fillRect(0, 0, W, H);

  // Matrix rain columns
  const cols = Math.floor(W / 18);
  for (let c = 0; c < cols; c++) {
    const speed = 0.8 + (c % 3) * 0.4;
    const yOffset = ((c * 47 + t * 60 * speed) % (H + 200)) - 200;
    const chars = '01アイウエオABCDEF!@#$%^&*';
    for (let r = 0; r < 8; r++) {
      const alpha = 1 - r * 0.12;
      const ch = chars[Math.floor((t * 10 + c + r) % chars.length)];
      ctx.fillStyle = r === 0 ? `rgba(180,255,180,${alpha})` : `rgba(34,197,94,${alpha * 0.7})`;
      ctx.font = '14px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText(ch, c * 18, yOffset - r * 18);
    }
  }

  // Dark overlay so text is readable
  ctx.fillStyle = 'rgba(0,13,0,0.65)';
  ctx.fillRect(0, 0, W, H);

  // Terminal window
  const tw = W * 0.65, th = H * 0.55;
  const tx = (W - tw) / 2, ty = (H - th) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  drawRoundedRect(ctx, tx, ty, tw, th, 8); ctx.fill();
  ctx.strokeStyle = '#22c55e'; ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, tx, ty, tw, th, 8); ctx.stroke();

  // Terminal content
  const cmdLines = [
    '> sudo decrypt --file classified.db',
    '> Access granted. Loading data...',
    '> [██████████████████████] 100%',
    `> Found ${Math.floor(t * 120 + 200)} encrypted records`,
    '> Initiating pattern analysis...',
  ];
  const visibleLines = Math.min(cmdLines.length, Math.floor(t * 1.5) + 1);
  cmdLines.slice(0, visibleLines).forEach((line, i) => {
    ctx.fillStyle = i === visibleLines - 1 ? '#86efac' : '#4ade80';
    ctx.font = '15px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(line, tx + 20, ty + 42 + i * 32);
  });

  // Cursor
  if (Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = '#22c55e';
    const lastLine = cmdLines[visibleLines - 1] || '';
    const cx2 = tx + 20 + ctx.measureText(lastLine).width;
    ctx.fillRect(cx2, ty + 24 + (visibleLines - 1) * 32, 10, 16);
  }

  drawScanlines(ctx, W, H, 0.07);
}

// ── 9. DATA SLAM ──────────────────────────────────────────────────────────
export function renderDataSlam(ctx, W, H, t) {
  ctx.fillStyle = '#020c14';
  ctx.fillRect(0, 0, W, H);

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(14,165,233,0.08)');
  g.addColorStop(1, 'rgba(56,189,248,0.04)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Big stat counter
  const targetNum = 4200;
  const currentNum = Math.floor(Math.min(targetNum, t * targetNum / 3));
  ctx.textAlign = 'center';
  ctx.font = `bold 100px "Space Grotesk", sans-serif`;
  ctx.shadowColor = '#0ea5e9'; ctx.shadowBlur = 40;
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText('$' + (currentNum / 1000).toFixed(1) + 'T', W / 2, H * 0.38);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 24px "Space Grotesk", sans-serif';
  ctx.fillText('Spent in the last 24 hours', W / 2, H * 0.48);

  // Bar chart building in
  const bars = [0.45, 0.78, 0.62, 0.91, 0.55, 0.83, 0.70];
  const bW = 60, gap = 24;
  const chartW = bars.length * (bW + gap) - gap;
  const startX = (W - chartW) / 2;
  const maxBarH = H * 0.22;
  const baseY = H * 0.85;

  bars.forEach((val, i) => {
    const delay = i * 0.2;
    const progress = easeOut(Math.max(0, Math.min(1, (t - 2 - delay) * 3)));
    const bH = val * maxBarH * progress;
    const bX = startX + i * (bW + gap);

    const bg2 = ctx.createLinearGradient(bX, baseY - bH, bX, baseY);
    bg2.addColorStop(0, i % 2 === 0 ? '#0ea5e9' : '#38bdf8');
    bg2.addColorStop(1, 'rgba(14,165,233,0.2)');
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.roundRect(bX, baseY - bH, bW, bH, [4, 4, 0, 0]); ctx.fill();

    if (progress > 0.9) {
      ctx.fillStyle = '#7dd3fc'; ctx.font = 'bold 12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(Math.round(val * 100) + '%', bX + bW / 2, baseY - bH - 8);
    }
  });
}

// ── 10. INFOGRAPHIC FLOW ──────────────────────────────────────────────────
export function renderInfographicFlow(ctx, W, H, t) {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, W, H);

  drawParticles(ctx, W, H, t, 'rgba(59,130,246', 'rgba(168,85,247', 20, 0.3);

  // Connection nodes
  const nodes = [
    { x: W * 0.2, y: H * 0.35, label: 'Input', color: '#3b82f6' },
    { x: W * 0.5, y: H * 0.25, label: 'Process', color: '#a855f7' },
    { x: W * 0.8, y: H * 0.35, label: 'Output', color: '#06b6d4' },
    { x: W * 0.35, y: H * 0.65, label: 'Feedback', color: '#f59e0b' },
    { x: W * 0.65, y: H * 0.65, label: 'Analysis', color: '#ec4899' },
  ];

  // Draw connections
  const connections = [[0,1],[1,2],[0,3],[2,4],[3,4],[1,4]];
  connections.forEach(([a, b], i) => {
    const progress = Math.min(1, (t - i * 0.3) * 2);
    if (progress <= 0) return;
    const na = nodes[a], nb = nodes[b];
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    const ex = na.x + (nb.x - na.x) * progress;
    const ey = na.y + (nb.y - na.y) * progress;
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Draw nodes
  nodes.forEach((n, i) => {
    const delay = i * 0.4;
    const scale = easeOut(Math.max(0, Math.min(1, (t - delay) * 3)));
    if (scale <= 0) return;
    ctx.save();
    ctx.translate(n.x, n.y); ctx.scale(scale, scale);
    ctx.beginPath(); ctx.arc(0, 0, 30 + 5 * Math.sin(t * 2 + i), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
    ctx.strokeStyle = n.color; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = n.color; ctx.font = 'bold 12px Inter'; ctx.textAlign = 'center';
    ctx.fillText(n.label, 0, 4);
    ctx.restore();
  });

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dbeafe'; ctx.font = `bold 32px "Space Grotesk", sans-serif`;
  ctx.fillText('How It All Connects', W / 2, H * 0.1);
}

// ── 11. DOCUMENTARY ───────────────────────────────────────────────────────
export function renderDocumentary(ctx, W, H, t) {
  ctx.fillStyle = '#0a0806';
  ctx.fillRect(0, 0, W, H);

  // Cinematic letterbox
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H * 0.1);
  ctx.fillRect(0, H * 0.9, W, H * 0.1);

  // Warm vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.8);
  vg.addColorStop(0, 'transparent');
  vg.addColorStop(1, 'rgba(0,0,0,0.7)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

  // Slow reveal text
  const titleAlpha = Math.min(1, t * 0.5);
  ctx.globalAlpha = titleAlpha;
  ctx.textAlign = 'center';
  ctx.font = `bold 70px "Space Grotesk", sans-serif`;
  ctx.letterSpacing = '8px';
  ctx.fillStyle = '#f5deb3';
  ctx.fillText('THE UNTOLD STORY', W / 2, H / 2 - 10);
  ctx.globalAlpha = 1;

  // Subtitle with line
  if (t > 2) {
    const a = Math.min(1, (t - 2) * 0.8);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(W / 2 - 80, H / 2 + 20, 160, 1);
    ctx.fillStyle = '#a8835c'; ctx.font = '18px Inter';
    ctx.fillText('A documentary series', W / 2, H / 2 + 45);
    ctx.globalAlpha = 1;
  }

  drawFilmGrain(ctx, W, H, t, 0.05);
}

// ── 12. NEON FUTURE ───────────────────────────────────────────────────────
export function renderNeonFuture(ctx, W, H, t) {
  ctx.fillStyle = '#04000f';
  ctx.fillRect(0, 0, W, H);

  // Neon grid perspective
  const gridColor = 'rgba(240,171,252,0.15)';
  ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
  const horizon = H * 0.55;
  for (let i = 0; i < 12; i++) {
    const x = (W / 11) * i;
    ctx.beginPath(); ctx.moveTo(W / 2, horizon); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let j = 0; j < 8; j++) {
    const y = horizon + (H - horizon) * Math.pow(j / 7, 2);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Glitch text
  const glitchOffset = Math.sin(t * 20) > 0.9 ? (Math.random() - 0.5) * 8 : 0;
  ctx.textAlign = 'center';
  ctx.font = `bold 64px "Space Grotesk", sans-serif`;
  ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#f0abfc';
  ctx.fillText('SYSTEM_ONLINE', W / 2 + glitchOffset, H * 0.38);
  if (glitchOffset !== 0) {
    ctx.fillStyle = 'rgba(103,232,249,0.5)';
    ctx.fillText('SYSTEM_ONLINE', W / 2 - glitchOffset * 2, H * 0.38);
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#67e8f9'; ctx.font = '18px JetBrains Mono';
  ctx.fillText('Ver. 2.0.77 // ASTRAH.AI', W / 2, H * 0.47);

  // Ticker at bottom
  const tickerText = '[ NEURAL INTERFACE ACTIVE ] — [ MEMORY BANKS LOADED ] — [ READY ] — ';
  const scrollX = -(t * 80 % (ctx.measureText(tickerText).width || 800));
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, H * 0.85, W, 30);
  ctx.fillStyle = '#f0abfc'; ctx.font = '13px JetBrains Mono'; ctx.textAlign = 'left';
  ctx.fillText(tickerText + tickerText, scrollX, H * 0.87 + 20);

  drawScanlines(ctx, W, H, 0.05);
  drawChromAb(ctx, W, H, 2);
}

// ── 13. SYNTHWAVE RETRO ───────────────────────────────────────────────────
export function renderSynthwaveRetro(ctx, W, H, t) {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.6);
  sky.addColorStop(0, '#0d0010');
  sky.addColorStop(0.5, '#3d0050');
  sky.addColorStop(1, '#ff6b6b');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.6);

  // Ground
  ctx.fillStyle = '#0a0010'; ctx.fillRect(0, H * 0.6, W, H * 0.4);

  // Sun
  const sunY = H * 0.58;
  const sunG = ctx.createRadialGradient(W / 2, sunY, 0, W / 2, sunY, 80);
  sunG.addColorStop(0, '#feca57');
  sunG.addColorStop(0.5, '#ff9ff3');
  sunG.addColorStop(1, 'transparent');
  ctx.fillStyle = sunG; ctx.fillRect(W / 2 - 90, sunY - 90, 180, 180);

  // Neon grid on ground
  ctx.strokeStyle = 'rgba(255,159,243,0.5)'; ctx.lineWidth = 1;
  for (let i = 0; i < 10; i++) {
    const prog = (i + (t * 1.5) % 1) / 10;
    const y = H * 0.6 + (H * 0.4) * Math.pow(prog, 2);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(72,219,251,0.4)';
  for (let c = 0; c <= 10; c++) {
    const x = (W / 10) * c;
    ctx.beginPath(); ctx.moveTo(W / 2, H * 0.6); ctx.lineTo(x, H); ctx.stroke();
  }

  // Chrome text
  ctx.textAlign = 'center';
  const chromeG = ctx.createLinearGradient(0, H * 0.22, 0, H * 0.35);
  chromeG.addColorStop(0, '#fff');
  chromeG.addColorStop(0.5, '#feca57');
  chromeG.addColorStop(1, '#ff9ff3');
  ctx.fillStyle = chromeG;
  ctx.font = `bold 80px "Space Grotesk", sans-serif`;
  ctx.shadowColor = '#ff6b6b'; ctx.shadowBlur = 25;
  ctx.fillText('RETROGRADE', W / 2, H * 0.33);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#48dbfb'; ctx.font = '20px Inter';
  ctx.fillText('E S T  •  1 9 8 4', W / 2, H * 0.42);

  drawScanlines(ctx, W, H, 0.06);
}

// ── 14. CLEAN CREATOR (Ali Abdaal) ────────────────────────────────────────
export function renderCleanCreator(ctx, W, H, t) {
  ctx.fillStyle = '#0c0800';
  ctx.fillRect(0, 0, W, H);

  const g = ctx.createRadialGradient(W * 0.3, H * 0.4, 0, W * 0.3, H * 0.4, W * 0.6);
  g.addColorStop(0, 'rgba(217,119,6,0.1)'); g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Chapter header
  if (t > 1) {
    const a = Math.min(1, (t - 1) * 2);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#d97706'; ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('CHAPTER 01 — THE MINDSET SHIFT', 80, H * 0.2);
    ctx.globalAlpha = 1;
  }

  // Main heading — slides up
  const yOff = lerp(40, 0, easeOut(Math.min(1, t * 2)));
  ctx.globalAlpha = Math.min(1, t * 2);
  ctx.textAlign = 'left';
  ctx.font = `bold 52px "Space Grotesk", sans-serif`;
  ctx.fillStyle = '#fffbeb';
  ctx.fillText('5 Things I Wish', 80, H * 0.38 + yOff);
  ctx.fillStyle = '#d97706';
  ctx.fillText('I Knew Earlier', 80, H * 0.38 + 68 + yOff);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#a16207'; ctx.font = '18px Inter'; ctx.textAlign = 'left';
  ctx.fillText('That changed everything about how I work', 80, H * 0.58);

  // Quote card
  if (t > 2) {
    const a2 = Math.min(1, (t - 2) * 2);
    ctx.globalAlpha = a2;
    ctx.fillStyle = 'rgba(217,119,6,0.1)';
    drawRoundedRect(ctx, 80, H * 0.65, W * 0.55, 80, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(217,119,6,0.4)'; ctx.lineWidth = 1;
    drawRoundedRect(ctx, 80, H * 0.65, W * 0.55, 80, 8); ctx.stroke();
    ctx.fillStyle = '#fde68a'; ctx.font = 'italic 17px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('"The best time to start was yesterday."', 100, H * 0.68 + 30);
    ctx.globalAlpha = 1;
  }

  drawLowerThird(ctx, W, H, 'Ali-style Creator Template', 'Professional & Warm', '#d97706', Math.max(0, t - 3));
}

// ── 15. PREMIUM TECH (MKBHD) ─────────────────────────────────────────────
export function renderPremiumTech(ctx, W, H, t) {
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, W, H);

  // Subtle light sweep
  const sweepX = (t * 200) % (W + 400) - 200;
  const lg = ctx.createLinearGradient(sweepX - 100, 0, sweepX + 100, H);
  lg.addColorStop(0, 'transparent');
  lg.addColorStop(0.5, 'rgba(255,255,255,0.015)');
  lg.addColorStop(1, 'transparent');
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);

  // Product reveal — clean geometric shape
  const prodAlpha = Math.min(1, t * 0.8);
  ctx.globalAlpha = prodAlpha * 0.15;
  drawRoundedRect(ctx, W * 0.55, H * 0.2, W * 0.35, H * 0.6, 20);
  ctx.fillStyle = '#1f2937'; ctx.fill();
  ctx.globalAlpha = 1;

  // Red accent line
  const lineW2 = W * 0.08 * Math.min(1, t * 3);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(80, H * 0.32, lineW2, 3);

  // Confident text
  ctx.textAlign = 'left';
  const titleAlpha = Math.min(1, t * 1.5);
  ctx.globalAlpha = titleAlpha;
  ctx.fillStyle = '#f9fafb'; ctx.font = `bold 56px "Space Grotesk", sans-serif`;
  ctx.fillText('The iPhone', 80, H * 0.42);
  ctx.fillStyle = '#6b7280'; ctx.font = `bold 56px "Space Grotesk", sans-serif`;
  ctx.fillText('That Changed', 80, H * 0.42 + 72);
  ctx.fillStyle = '#ef4444'; ctx.font = `bold 56px "Space Grotesk", sans-serif`;
  ctx.fillText('Everything.', 80, H * 0.42 + 144);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#374151'; ctx.font = '16px Inter'; ctx.textAlign = 'left';
  ctx.fillText('Full review — no compromises', 80, H * 0.78);

  drawFilmGrain(ctx, W, H, t, 0.015);
}

// ── 16. COSMIC JOURNEY ────────────────────────────────────────────────────
export function renderCosmicJourney(ctx, W, H, t) {
  ctx.fillStyle = '#01000a';
  ctx.fillRect(0, 0, W, H);

  // Star field
  for (let i = 0; i < 120; i++) {
    const x = ((i * 173 + t * 5 * (i % 4 === 0 ? 1 : -0.3)) % W + W) % W;
    const y = ((i * 97) % H + H) % H;
    const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i));
    const r = 0.5 + (i % 3) * 0.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${twinkle * 0.8})`; ctx.fill();
  }

  // Nebula
  const ng = ctx.createRadialGradient(W * 0.4, H * 0.4, 0, W * 0.4, H * 0.4, W * 0.5);
  ng.addColorStop(0, `rgba(129,140,248,${0.08 + 0.03 * Math.sin(t * 0.3)})`);
  ng.addColorStop(0.5, `rgba(192,132,252,${0.05})`);
  ng.addColorStop(1, 'transparent');
  ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);

  // Quote reveal
  const quoteAlpha = Math.min(1, t * 0.5);
  ctx.globalAlpha = quoteAlpha;
  ctx.textAlign = 'center';
  ctx.font = `bold 54px "Space Grotesk", sans-serif`;
  ctx.shadowColor = '#818cf8'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#e0e7ff';
  ctx.fillText('We Are Stardust', W / 2, H / 2 - 10);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#6366f1'; ctx.font = '20px Inter';
  ctx.fillText('A journey across 13.8 billion years', W / 2, H / 2 + 40);
  ctx.globalAlpha = 1;

  drawParticles(ctx, W, H, t, 'rgba(129,140,248', 'rgba(192,132,252', 60, 0.2);
}

// ── 17. LIFE SCIENCE ─────────────────────────────────────────────────────
export function renderLifeScience(ctx, W, H, t) {
  ctx.fillStyle = '#010f07';
  ctx.fillRect(0, 0, W, H);

  const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
  bg.addColorStop(0, 'rgba(52,211,153,0.08)');
  bg.addColorStop(1, 'transparent');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // Organic blob cells
  for (let c = 0; c < 5; c++) {
    const cx2 = W * (0.2 + c * 0.15) + Math.sin(t * 0.7 + c) * 20;
    const cy2 = H * (0.4 + Math.sin(t * 0.5 + c * 1.3) * 0.15);
    const r = 40 + 15 * Math.sin(t * 1.2 + c);
    ctx.beginPath();
    ctx.ellipse(cx2, cy2, r, r * 0.85, t * 0.3 + c, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(52,211,153,${0.1 + 0.05 * Math.sin(t + c)})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(110,231,183,${0.3 + 0.2 * Math.sin(t + c)})`;
    ctx.lineWidth = 1.5; ctx.stroke();

    // Organelle dot
    ctx.beginPath(); ctx.arc(cx2, cy2, 6 + 2 * Math.sin(t * 2 + c), 0, Math.PI * 2);
    ctx.fillStyle = '#6ee7b7'; ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#a7f3d0'; ctx.font = `bold 48px "Space Grotesk", sans-serif`;
  ctx.shadowColor = '#34d399'; ctx.shadowBlur = 20;
  ctx.fillText('Inside the Cell', W / 2, H * 0.18);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#6ee7b7'; ctx.font = '18px Inter';
  ctx.fillText('Life at molecular scale', W / 2, H * 0.26);

  drawParticles(ctx, W, H, t, 'rgba(52,211,153', 'rgba(16,185,129', 20, 0.3);
}

// ── 18. EPIC HISTORY ─────────────────────────────────────────────────────
export function renderEpicHistory(ctx, W, H, t) {
  ctx.fillStyle = '#0a0202';
  ctx.fillRect(0, 0, W, H);

  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, `rgba(220,38,38,${0.1 + 0.04 * Math.sin(t * 2)})`);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  // Date counter slamming in
  if (t < 2) {
    const scl = easeOut(t / 2);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scl, scl);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde68a'; ctx.font = `bold 120px "Space Grotesk", sans-serif`;
    ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 40;
    ctx.fillText('476 AD', 0, 0);
    ctx.restore(); ctx.shadowBlur = 0;
  } else {
    // Title reveal
    const a = Math.min(1, (t - 2) * 2);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = `bold 72px "Space Grotesk", sans-serif`;
    ctx.fillStyle = '#fca5a5';
    ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 20;
    ctx.fillText('THE FALL OF ROME', W / 2, H / 2 - 10);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fde68a'; ctx.font = '22px Inter';
    ctx.fillText('The day everything changed', W / 2, H / 2 + 55);
    ctx.globalAlpha = 1;
  }

  drawFilmGrain(ctx, W, H, t, 0.04);
  drawScanlines(ctx, W, H, 0.02);
}

// ── 19. MOTIVATION FIRE ───────────────────────────────────────────────────
export function renderMotivationFire(ctx, W, H, t) {
  ctx.fillStyle = '#080300';
  ctx.fillRect(0, 0, W, H);

  // Fire pulse bg
  const pulse2 = 0.5 + 0.5 * Math.sin(t * 6);
  const fg = ctx.createRadialGradient(W / 2, H * 0.8, 0, W / 2, H / 2, W * 0.7);
  fg.addColorStop(0, `rgba(245,158,11,${0.2 + pulse2 * 0.15})`);
  fg.addColorStop(0.4, `rgba(239,68,68,${0.1 + pulse2 * 0.08})`);
  fg.addColorStop(1, 'transparent');
  ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);

  // Word-by-word slam
  const words = ['STOP', 'MAKING', 'EXCUSES', '🔥', 'START', 'NOW'];
  const wordIdx = Math.floor(t * 3) % words.length;
  const wordProgress = (t * 3) % 1;
  const scale2 = 1 + 0.5 * Math.max(0, 0.15 - wordProgress) / 0.15;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale2, scale2);
  ctx.textAlign = 'center';
  ctx.font = `bold 110px "Space Grotesk", sans-serif`;
  ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 40;
  ctx.fillStyle = wordIdx % 2 === 0 ? '#fff' : '#f59e0b';
  ctx.fillText(words[wordIdx], 0, 20);
  ctx.restore();
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '20px Inter'; ctx.textAlign = 'center';
  ctx.fillText('Not tomorrow. Not Monday. NOW.', W / 2, H * 0.75);

  // Heartbeat flash
  if (pulse2 > 0.95) {
    ctx.fillStyle = `rgba(245,158,11,0.04)`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ── 20. TIKTOK BANGER (placeholder alias) ────────────────────────────────
export function renderTiktokBangerFull(ctx, W, H, t) {
  return renderTiktokBanger(ctx, W, H, t);
}

// ── RENDER DISPATCH MAP ────────────────────────────────────────────────────
export const RENDER_FNS = {
  viralHook:       renderViralHook,
  tiktokBanger:    renderTiktokBanger,
  epicExplainer:   renderEpicExplainer,
  tedMinimal:      renderTedMinimal,
  deepScience:     renderDeepScience,
  visualMath:      renderVisualMath,
  codeBanger:      renderCodeBanger,
  hackerTerminal:  renderHackerTerminal,
  dataSlam:        renderDataSlam,
  infographicFlow: renderInfographicFlow,
  documentary:     renderDocumentary,
  neonFuture:      renderNeonFuture,
  synthwaveRetro:  renderSynthwaveRetro,
  cleanCreator:    renderCleanCreator,
  premiumTech:     renderPremiumTech,
  cosmicJourney:   renderCosmicJourney,
  lifeScience:     renderLifeScience,
  epicHistory:     renderEpicHistory,
  motivationFire:  renderMotivationFire,
};

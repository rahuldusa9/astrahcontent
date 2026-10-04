/**
 * AstrahContent — Hero Landing Canvas Visualizations
 * High-performance interactive background cards for Science, Math, and History.
 */

export function initHeroCanvases() {
  initScienceCanvas();
  initMathCanvas();
  initHistoryCanvas();
}

export function initScienceCanvas() {
  const canvas = document.getElementById('scienceCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  let animId;

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0a1a12';
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2 - 6;

    // Glowing Nucleus
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
    ng.addColorStop(0, '#34d399');
    ng.addColorStop(1, 'rgba(52,211,153,0.2)');
    ctx.fillStyle = ng;
    ctx.fill();

    // 3 Orbiting electrons
    for (let i = 0; i < 3; i++) {
      const orbitR = 38 + i * 22;
      ctx.beginPath();
      ctx.ellipse(cx, cy, orbitR, orbitR * 0.35, (i * Math.PI / 3) + t * 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(52,211,153,0.22)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      const ang = t * (1.2 + i * 0.4) + (i * Math.PI * 2 / 3);
      const ex = cx + Math.cos(ang) * orbitR;
      const ey = cy + Math.sin(ang) * orbitR * 0.35 + Math.sin((i * Math.PI / 3) + t * 0.3) * orbitR * 0.6;
      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#34d399';
      ctx.shadowColor = '#34d399';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(52,211,153,0.9)';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('MOLECULAR DYNAMICS', cx, H - 12);

    t += 0.025;
    animId = requestAnimationFrame(draw);
  }

  draw();
  return () => cancelAnimationFrame(animId);
}

export function initMathCanvas() {
  const canvas = document.getElementById('mathCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  let animId;

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0d0a1a';
    ctx.fillRect(0, 0, W, H);

    // Axes
    ctx.strokeStyle = 'rgba(168,85,247,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, H - 32);
    ctx.lineTo(W - 20, H - 32);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(46, 12);
    ctx.lineTo(46, H - 20);
    ctx.stroke();

    // Sine wave
    ctx.beginPath();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 12;

    let first = true;
    for (let x = 46; x < W - 20; x++) {
      const xVal = (x - 46) / 32;
      const y = (H - 32) - (Math.sin(xVal - t) * 44 + 36);
      if (first) {
        ctx.moveTo(x, y);
        first = false;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Equation
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c084fc';
    ctx.font = '600 16px "Space Grotesk", sans-serif';
    ctx.fillText('y = sin(ωt + φ)', W - 20, 28);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(168,85,247,0.85)';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('CALCULUS & OSCILLATION', W / 2, H - 12);

    t += 0.035;
    animId = requestAnimationFrame(draw);
  }

  draw();
  return () => cancelAnimationFrame(animId);
}

export function initHistoryCanvas() {
  const canvas = document.getElementById('historyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  let animId;

  const events = [
    { year: '1776', label: 'Revolution', x: 0.16 },
    { year: '1865', label: 'Civil Rights', x: 0.38 },
    { year: '1945', label: 'United Nations', x: 0.62 },
    { year: '1969', label: 'Moon Landing', x: 0.84 },
  ];

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0e0c18';
    ctx.fillRect(0, 0, W, H);

    const ly = H * 0.58;
    const grd = ctx.createLinearGradient(20, ly, W - 20, ly);
    grd.addColorStop(0, 'rgba(168,85,247,0.1)');
    grd.addColorStop(0.5, 'rgba(168,85,247,0.9)');
    grd.addColorStop(1, 'rgba(6,182,212,0.7)');
    ctx.strokeStyle = grd;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, ly);
    ctx.lineTo(W - 20, ly);
    ctx.stroke();

    events.forEach((ev, i) => {
      const ex = ev.x * W;
      const pulse = 1 + 0.25 * Math.sin(t * 2 + i * 1.2);

      ctx.beginPath();
      ctx.arc(ex, ly, 6 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = i % 2 === 0 ? '#a855f7' : '#06b6d4';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Stem
      ctx.beginPath();
      ctx.moveTo(ex, ly);
      ctx.lineTo(ex, ly - 42);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Year badge
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0f0ff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillText(ev.year, ex, ly - 48);

      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '9px Inter, sans-serif';
      ctx.fillText(ev.label, ex, ly - 36);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(168,85,247,0.85)';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('HISTORICAL CHRONOLOGY', W / 2, H - 12);

    t += 0.025;
    animId = requestAnimationFrame(draw);
  }

  draw();
  return () => cancelAnimationFrame(animId);
}

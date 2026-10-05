/**
 * AstrahContent — Full AI Mode: LLM generates HyperFrames Canvas2D code from scratch.
 *
 * The model receives the complete HyperFrames API spec + the user's style brief,
 * then outputs a self-contained render function.
 * We execute it with new Function() and pipe it directly to the canvas.
 */
import { getApiKey, OPENROUTER_MODEL, OPENROUTER_URL } from '../config.js';

// ── HyperFrames API reference sent to the LLM ─────────────────────────────
const HYPERFRAMES_API = `
You are writing JavaScript Canvas2D animation code for the HyperFrames engine.

CANVAS ENVIRONMENT:
- Canvas is always 1920 × 1080 pixels (W=1920, H=1080)
- Your render function is called at 60fps
- t = elapsed time in seconds (starts at 0, ends at totalDuration)
- totalDuration = total video length in seconds

YOUR OUTPUT MUST BE a single self-contained JavaScript function with this exact signature:
  function render(ctx, W, H, t, totalDuration) { ... }

AVAILABLE Canvas2D APIS (standard browser canvas):
  ctx.fillStyle / ctx.strokeStyle / ctx.globalAlpha / ctx.globalCompositeOperation
  ctx.fillRect() / ctx.strokeRect() / ctx.clearRect()
  ctx.beginPath() / ctx.arc() / ctx.moveTo() / ctx.lineTo() / ctx.bezierCurveTo() / ctx.fill() / ctx.stroke()
  ctx.font / ctx.textAlign / ctx.textBaseline / ctx.fillText() / ctx.strokeText() / ctx.measureText()
  ctx.save() / ctx.restore() / ctx.translate() / ctx.rotate() / ctx.scale()
  ctx.createLinearGradient() / ctx.createRadialGradient() / ctx.addColorStop()
  ctx.shadowColor / ctx.shadowBlur / ctx.lineWidth / ctx.lineCap / ctx.lineJoin
  ctx.setLineDash() / ctx.roundRect()
  Math.sin / Math.cos / Math.PI / Math.random / Math.floor / Math.abs / Math.min / Math.max

USEFUL PATTERNS (use freely):
  // Easing
  const easeOut = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const easeIn  = (t) => t * t * t;
  const lerp    = (a, b, t) => a + (b - a) * t;

  // Scene progress (progress = 0..1 within a scene)
  const sceneProgress = (sceneStart, sceneDuration) =>
    Math.min(1, Math.max(0, (t - sceneStart) / sceneDuration));

  // Slide-in from left (offset starts at -W, ends at 0)
  const slideIn = (start, dur, from = -W) =>
    lerp(from, 0, easeOut(sceneProgress(start, dur)));

  // Rounded rect helper
  const rrect = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

  // Glitch offset (returns a random ±n when intensity > 0.9)
  const glitch = (intensity, n) => Math.sin(t * 50) > intensity ? (Math.random()-0.5)*n*2 : 0;

RULES:
1. Structure the animation as TIME-BASED scenes using if/else on t
2. Every scene must have a smooth enter AND exit (use easeOut for reveals)
3. Use ctx.save()/ctx.restore() around transforms
4. NEVER use setTimeout, setInterval, fetch, or any async operations
5. NEVER import anything — write all helpers inline
6. NEVER use document, window, or any DOM access
7. You MAY call Math.random() for particle systems (it will vary each frame — use t-seeded values for stability)
8. For stable randomness: use (Math.sin(seed*127.1+t*0.01)*43758.5453)%1 pattern
9. Text must use: ctx.font = 'WEIGHT SIZEpx FAMILY' (e.g. 'bold 80px "Space Grotesk", sans-serif')
10. Always clear/redraw the full canvas every frame (start with ctx.fillRect(0,0,W,H))
`;

// ── Style vocabulary ───────────────────────────────────────────────────────
const PACE_MAP = {
  'ultra-fast':  'ULTRA-FAST (TikTok). Each scene ≤ 3 seconds. Text slams in, stays 1s, next cut. Maximum velocity.',
  'rapid-fire':  'RAPID-FIRE (Fireship). Scenes 3-6s. Dense information. Quick hard cuts.',
  'punchy':      'PUNCHY (YouTube). Scenes 5-10s. High energy but breathable. One key beat per scene.',
  'moderate':    'MODERATE (Explainer). Scenes 10-18s. Information has time to land. Smooth reveals.',
  'cinematic':   'CINEMATIC (Documentary). Scenes 15-25s. Slow dramatic reveals. Dwells on moments.',
  'atmospheric': 'ATMOSPHERIC (Art Film). Long transitions. Mood-driven. Immersive particle environments.',
};
const CUT_MAP = {
  'smash-cuts':  'SMASH CUTS: Between scenes, flash ctx.fillStyle="white"; ctx.globalAlpha=flashAmt; ctx.fillRect(0,0,W,H) for 3-5 frames.',
  'whip-pan':    'WHIP-PAN: Between scenes, use ctx.translate(-speed*W, 0) with high speed to simulate horizontal motion blur.',
  'zoom-blend':  'ZOOM BLEND: At scene boundaries, scale the canvas from 1 to 1.3 while fading alpha from 1 to 0.',
  'morph':       'MORPH: Transition via expanding circles or rectangles that wipe the screen.',
  'glitch':      'GLITCH: At cuts, draw RGB-split duplicates: red +offset, cyan -offset, for 3-5 frames.',
  'dissolve':    'DISSOLVE: Cross-fade via globalAlpha ramping from 1→0 on the old scene over ~0.5s.',
};
const COLOR_MAP = {
  'dark-neon':  'PALETTE: bg=#040408, primary=#a855f7, secondary=#06b6d4, accent=#c084fc, text=#f0f0ff',
  'fire':       'PALETTE: bg=#080300, primary=#f59e0b, secondary=#ef4444, accent=#fde68a, text=#ffffff',
  'ocean':      'PALETTE: bg=#020c14, primary=#0ea5e9, secondary=#0d9488, accent=#38bdf8, text=#e0f2fe',
  'matrix':     'PALETTE: bg=#000d00, primary=#22c55e, secondary=#4ade80, accent=#86efac, text=#dcfce7',
  'cinematic':  'PALETTE: bg=#0a0806, primary=#d4a574, secondary=#a8835c, accent=#f5f0e8, text=#fef9f0',
  'clean-white':'PALETTE: bg=#f8fafc, primary=#e11d48, secondary=#2563eb, accent=#f43f5e, text=#0f172a',
};
const TEXT_MAP = {
  'slam':       'TEXT ANIMATION: Words crash in from off-screen. Use translate + easeOut. Scale from 2→1 on entry.',
  'typewriter': 'TEXT ANIMATION: Reveal text character by character using text.slice(0, Math.floor(progress*text.length)).',
  'kinetic':    'TEXT ANIMATION: Each word flies in from a different direction with rotation that settles to 0.',
  'fade-up':    'TEXT ANIMATION: Text fades in (globalAlpha) while translating from +30px to 0 on Y.',
  'glitch':     'TEXT ANIMATION: Draw text 3 times: red at -glitchAmt, cyan at +glitchAmt, white at 0. Resolve over time.',
  'outline':    'TEXT ANIMATION: First draw strokeText (outline only), then gradually fill using a clip/gradient trick.',
};

// ── Build the full code-generation prompt ─────────────────────────────────
function buildCodePrompt(topic, options) {
  const { duration, pace, cutStyle, textStyle, colorMood, animStyle, template, appliedComponents } = options;

  const paceDesc  = PACE_MAP[pace]      || pace;
  const cutDesc   = CUT_MAP[cutStyle]   || cutStyle;
  const textDesc  = TEXT_MAP[textStyle] || textStyle;
  const colorDesc = COLOR_MAP[colorMood] || colorMood;

  const sceneCount = Math.max(3, Math.round(duration / (
    pace === 'ultra-fast' ? 3 : pace === 'rapid-fire' ? 5 :
    pace === 'punchy' ? 8 : pace === 'moderate' ? 14 : 20
  )));

  const templateNote = template
    ? `\nINSPIRATION: "${template.name}" — ${template.desc || ''}. Implement its visual signature.`
    : '';

  const componentNote = appliedComponents && appliedComponents.length
    ? `\nINCLUDE THESE COMPONENTS: ${appliedComponents.join(', ')}`
    : '';

  return `${HYPERFRAMES_API}

═══════════════════════════════════════════════
VIDEO BRIEF — Generate HyperFrames render function
═══════════════════════════════════════════════
TOPIC:         ${topic}
DURATION:      ${duration} seconds
SCENE COUNT:   ~${sceneCount} scenes
ANIMATION:     ${animStyle}

PACING:        ${paceDesc}
TRANSITIONS:   ${cutDesc}
TEXT SYSTEM:   ${textDesc}
COLOR SYSTEM:  ${colorDesc}
${templateNote}${componentNote}

═══════════════════════════════════════════════
WHAT TO GENERATE
═══════════════════════════════════════════════

Write a complete, stunning, production-quality HyperFrames render function for the topic: "${topic}"

The animation must:
1. Be visually SPECTACULAR — not generic. Draw actual topic-specific visuals (e.g. for "photosynthesis": animated chloroplasts, light beams, glucose molecules)
2. Use the EXACT color palette specified above
3. Implement the EXACT pacing and cut style
4. Use the EXACT text animation style for all on-screen text
5. Have ~${sceneCount} distinct scenes tied to time ranges
6. Each scene must illuminate a specific concept about: ${topic}
7. Include particle systems, gradient backgrounds, geometric shapes, animated diagrams
8. On-screen text must narrate/explain as it animates
9. Make it feel like it was edited by the world's best motion graphics designer

Output ONLY the JavaScript function — no markdown, no explanation, no comments outside the function:

function render(ctx, W, H, t, totalDuration) {
  // YOUR COMPLETE ANIMATION CODE HERE
}`;
}

// ── Execute generated code safely ─────────────────────────────────────────

/**
 * Takes the raw string of JS code from the LLM, extracts the render function,
 * and returns a callable (ctx, W, H, t, totalDuration) => void.
 */
export function compileRenderCode(codeString) {
  // Extract just the function body or the whole function
  let fnBody = codeString.trim();

  // Strip any markdown fences
  fnBody = fnBody.replace(/^```(?:javascript|js)?\s*/i, '').replace(/```\s*$/i, '');

  // If it starts with "function render", wrap it and return
  if (fnBody.startsWith('function render')) {
    // Wrap: call the function inside a closure that returns it
    const wrapper = new Function(`
      ${fnBody}
      return render;
    `);
    return wrapper();
  }

  // If it's an arrow function or just the body, wrap it
  const wrapper = new Function('ctx', 'W', 'H', 't', 'totalDuration', fnBody);
  return wrapper;
}

// ── Main API call ──────────────────────────────────────────────────────────

/**
 * Ask Nemotron to generate a complete HyperFrames render function.
 * @returns {{ code: string, renderFn: Function, meta: object }}
 */
export async function generateHyperFramesCode(topic, options = {}) {
  const opts = {
    duration:   options.duration   || 60,
    animStyle:  options.animStyle  || 'kinetic',
    pace:       options.pace       || 'punchy',
    cutStyle:   options.cutStyle   || 'zoom-blend',
    textStyle:  options.textStyle  || 'kinetic',
    colorMood:  options.colorMood  || 'dark-neon',
    template:   options.template   || null,
    appliedComponents: options.appliedComponents || [],
  };

  const systemPrompt =
    'You are an expert Canvas2D animation engineer and motion graphics director. ' +
    'You write production-quality JavaScript animation code that renders directly to HTML Canvas. ' +
    'Your code is always syntactically correct, visually stunning, and topic-specific. ' +
    'Output ONLY the JavaScript function body — no markdown fences, no explanations.';

  const userPrompt = buildCodePrompt(topic, opts);

  const apiKey = getApiKey();
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://astrahcontent.ai',
      'X-Title':       'AstrahContent HyperFrames',
    },
    body: JSON.stringify({
      model:       OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      temperature: 0.9,
      max_tokens:  8192,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${err}`);
  }

  const data    = await response.json();
  const rawCode = data.choices?.[0]?.message?.content ?? '';

  if (!rawCode.trim()) throw new Error('LLM returned empty response');

  // Compile
  const renderFn = compileRenderCode(rawCode);

  return {
    code:     rawCode,
    renderFn,
    meta: {
      topic,
      ...opts,
      generatedAt: new Date().toISOString(),
      model: OPENROUTER_MODEL,
    },
  };
}

// ── Fallback: hardcoded beautiful render for when API is offline ───────────

export function getFallbackRenderFn(topic, opts = {}) {
  const color = {
    'dark-neon':  { bg: '#040408', p: '#a855f7', s: '#06b6d4', t: '#f0f0ff' },
    'fire':       { bg: '#080300', p: '#f59e0b', s: '#ef4444', t: '#fff' },
    'ocean':      { bg: '#020c14', p: '#0ea5e9', s: '#0d9488', t: '#e0f2fe' },
    'matrix':     { bg: '#000d00', p: '#22c55e', s: '#4ade80', t: '#dcfce7' },
    'cinematic':  { bg: '#0a0806', p: '#d4a574', s: '#a8835c', t: '#fef9f0' },
    'clean-white':{ bg: '#f8fafc', p: '#e11d48', s: '#2563eb', t: '#0f172a' },
  }[opts.colorMood || 'dark-neon'] || { bg: '#040408', p: '#a855f7', s: '#06b6d4', t: '#f0f0ff' };

  return function render(ctx, W, H, t, totalDuration) {
    const easeOut = (v) => 1 - Math.pow(1 - Math.min(1, Math.max(0, v)), 3);
    const lerp = (a, b, v) => a + (b - a) * v;

    // Background
    ctx.fillStyle = color.bg;
    ctx.fillRect(0, 0, W, H);

    // Ambient glow
    const g = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W*0.6);
    g.addColorStop(0, color.p + '25');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Particles
    for (let i = 0; i < 40; i++) {
      const seed = Math.sin(i * 127.1) * 43758.5;
      const px = ((seed % 1 + 1) / 2 * W + t * 20 * (i % 2 ? 1 : -1)) % W;
      const py = (((Math.sin(i * 311.7) * 43758.5) % 1 + 1) / 2 * H + t * 8) % H;
      const alpha = 0.2 + 0.3 * Math.abs(Math.sin(t + i));
      ctx.beginPath(); ctx.arc(px, py, 1.5 + i%3, 0, Math.PI*2);
      ctx.fillStyle = (i%2 ? color.p : color.s) + Math.floor(alpha*255).toString(16).padStart(2,'0');
      ctx.fill();
    }

    const dur = totalDuration || 60;
    const pct = t / dur;

    // Scene 1: Title (0-25%)
    if (pct < 0.25) {
      const p = pct / 0.25;
      const yOff = lerp(60, 0, easeOut(p));
      ctx.globalAlpha = easeOut(p);
      ctx.textAlign = 'center';
      ctx.shadowColor = color.p; ctx.shadowBlur = 40;
      ctx.fillStyle = color.t;
      ctx.font = 'bold 90px "Space Grotesk", sans-serif';
      ctx.fillText(topic.length > 30 ? topic.slice(0,30)+'…' : topic, W/2, H/2 - 20 + yOff);
      ctx.shadowBlur = 0;
      ctx.fillStyle = color.s; ctx.font = '28px Inter, sans-serif';
      ctx.globalAlpha = easeOut(Math.max(0, p - 0.3));
      ctx.fillText('An animated breakdown', W/2, H/2 + 60 + yOff);
      ctx.globalAlpha = 1;

    // Scene 2: Key concept (25-60%)
    } else if (pct < 0.6) {
      const p = (pct - 0.25) / 0.35;
      // Animated diagram: orbiting nodes
      ctx.save(); ctx.translate(W*0.35, H*0.5);
      for (let i = 0; i < 6; i++) {
        const ang = (i/6)*Math.PI*2 + t*0.6;
        const r = 160 * easeOut(Math.min(1, p*3 - i*0.1));
        const nx = Math.cos(ang) * r, ny = Math.sin(ang) * r;
        ctx.strokeStyle = color.p + '40'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(nx,ny); ctx.stroke();
        const pulse = 1 + 0.15*Math.sin(t*2+i);
        ctx.beginPath(); ctx.arc(nx, ny, 22*pulse, 0, Math.PI*2);
        const cg = ctx.createRadialGradient(nx,ny,0,nx,ny,22*pulse);
        cg.addColorStop(0, color.p); cg.addColorStop(1, color.s+'00');
        ctx.fillStyle = cg; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(0,0,32,0,Math.PI*2);
      const cg2 = ctx.createRadialGradient(0,0,0,0,0,32);
      cg2.addColorStop(0,color.s); cg2.addColorStop(1,color.p);
      ctx.fillStyle = cg2; ctx.fill();
      ctx.restore();

      ctx.textAlign = 'left'; ctx.globalAlpha = easeOut(Math.min(1, p*2));
      ctx.fillStyle = color.p; ctx.font = 'bold 14px Inter';
      ctx.fillText('CORE CONCEPT', W*0.55, H*0.3);
      ctx.fillStyle = color.t; ctx.font = 'bold 52px "Space Grotesk", sans-serif';
      ctx.shadowColor = color.p; ctx.shadowBlur = 20;
      ctx.fillText('How It Works', W*0.55, H*0.42);
      ctx.shadowBlur = 0;
      ctx.fillStyle = color.s + 'cc'; ctx.font = '22px Inter';
      const words = `Understanding ${topic} requires seeing the connections between its parts.`;
      ctx.fillText(words.slice(0, Math.floor(p * words.length)), W*0.55, H*0.54);
      ctx.globalAlpha = 1;

    // Scene 3: Summary (60-100%)
    } else {
      const p = (pct - 0.6) / 0.4;
      ctx.textAlign = 'center'; ctx.globalAlpha = easeOut(p);
      ctx.shadowColor = color.s; ctx.shadowBlur = 30;
      ctx.fillStyle = color.t; ctx.font = 'bold 72px "Space Grotesk", sans-serif';
      ctx.fillText('Now You Know', W/2, H/2 - 30);
      ctx.shadowBlur = 0;
      ctx.fillStyle = color.p; ctx.font = '26px Inter';
      ctx.fillText(topic, W/2, H/2 + 40);
      ctx.fillStyle = color.s + 'aa'; ctx.font = '18px Inter';
      ctx.fillText('Generated by AstrahContent × HyperFrames AI', W/2, H*0.85);
      ctx.globalAlpha = 1;
    }

    // Timestamp
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '18px Inter';
    const m = Math.floor(t/60), s = Math.floor(t%60);
    ctx.fillText(`${m}:${s.toString().padStart(2,'0')}`, W-20, H-16);
  };
}

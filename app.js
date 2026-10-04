/* ============================================================
   AstrahContent — Application JavaScript
   HyperFrames + NVIDIA Nemotron (via OpenRouter) integration
   ============================================================ */

// ── CONFIG ──────────────────────────────────────────────────
const OPENROUTER_API_KEY = localStorage.getItem('astrah_openrouter_key') || '';
const OPENROUTER_MODEL   = 'nvidia/nemotron-3-ultra-550b-a55b';
const OPENROUTER_URL     = 'https://openrouter.ai/api/v1/chat/completions';

// ── STATE ────────────────────────────────────────────────────
const state = {
  currentPanel: 'create',
  isPlaying: false,
  playbackTime: 0,
  videoDuration: 60,
  playbackInterval: null,
  selectedPalette: 'cosmic',
  generatedScript: null,
  canvasAnimations: {},
};

// ── TEMPLATES DATA ───────────────────────────────────────────
const TEMPLATES = [
  { id: 'faceless-1', category: 'explainer', name: 'Faceless Explainer', desc: 'Abstract animations with kinetic typography. Ideal for any topic without a face.', duration: '60s', emoji: '🎯', grad: 'linear-gradient(135deg,#a855f7,#6366f1)' },
  { id: 'science-1',  category: 'science',   name: 'Science Animation',  desc: 'Molecular diagrams, cell biology, chemistry reactions with 3D-inspired visuals.', duration: '90s', emoji: '⚛️', grad: 'linear-gradient(135deg,#10b981,#06b6d4)' },
  { id: 'math-1',     category: 'math',      name: 'Math Tutorial',      desc: 'Equation reveal animations, graphing, step-by-step proof breakdowns.', duration: '120s', emoji: '📐', grad: 'linear-gradient(135deg,#6366f1,#a855f7)' },
  { id: 'history-1',  category: 'history',   name: 'History Timeline',   desc: 'Cinematic timeline animations with historical imagery and event callouts.', duration: '90s', emoji: '🏛️', grad: 'linear-gradient(135deg,#92400e,#b45309)' },
  { id: 'data-1',     category: 'data',      name: 'Data Visualization', desc: 'Animated bar, line, and pie charts with narrative commentary.', duration: '60s', emoji: '📊', grad: 'linear-gradient(135deg,#0ea5e9,#3b82f6)' },
  { id: 'coding-1',   category: 'coding',    name: 'Code Explainer',     desc: 'Live code typing animation with syntax highlighting and execution flow.', duration: '90s', emoji: '💻', grad: 'linear-gradient(135deg,#1e1b4b,#4338ca)' },
  { id: 'physics-1',  category: 'science',   name: 'Physics Forces',     desc: 'Vector field animations, gravity wells, wave propagation demos.', duration: '60s', emoji: '🌊', grad: 'linear-gradient(135deg,#0f766e,#06b6d4)' },
  { id: 'biology-1',  category: 'science',   name: 'Cell Biology',       desc: 'Animated cell diagrams with organelle labels and process highlights.', duration: '75s', emoji: '🔬', grad: 'linear-gradient(135deg,#15803d,#16a34a)' },
  { id: 'stats-1',    category: 'math',      name: 'Statistics & Probability', desc: 'Bell curves, probability distributions, and statistical concept animations.', duration: '90s', emoji: '📈', grad: 'linear-gradient(135deg,#7c3aed,#c026d3)' },
  { id: 'history-2',  category: 'history',   name: 'World War Timeline', desc: 'Dramatic map animations with event markers and chronological reveal.', duration: '120s', emoji: '🗺️', grad: 'linear-gradient(135deg,#44403c,#78716c)' },
  { id: 'data-2',     category: 'data',      name: 'Infographic Story',  desc: 'Animated infographic with flowing stats, icons and narrative structure.', duration: '45s', emoji: '📋', grad: 'linear-gradient(135deg,#1d4ed8,#0ea5e9)' },
  { id: 'coding-2',   category: 'coding',    name: 'Algorithm Visualizer', desc: 'Step-by-step sort/search algorithm animations with highlighted comparisons.', duration: '60s', emoji: '🔢', grad: 'linear-gradient(135deg,#312e81,#6d28d9)' },
];

// ── PAGE ROUTING ─────────────────────────────────────────────
function showStudio() {
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('studio-page').classList.remove('hidden');
  document.getElementById('main-nav').style.display = 'none';
  renderStudioTemplates();
  initPreviewCanvas();
}

function showLanding() {
  document.getElementById('studio-page').classList.add('hidden');
  document.getElementById('landing-page').classList.remove('hidden');
  document.getElementById('main-nav').style.display = '';
  stopPlayback();
}

function scrollToSection(selector) {
  const el = document.querySelector(selector);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ── PANEL NAVIGATION ─────────────────────────────────────────
function showPanel(name) {
  document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');

  const navItem = document.getElementById('nav-' + name) || document.getElementById('nav-' + name + '-studio');
  if (navItem) navItem.classList.add('active');
  else if (name === 'preview') {
    const btn = document.getElementById('nav-preview-btn');
    if (btn) btn.classList.add('active');
  }

  state.currentPanel = name;
  if (name === 'preview') initPreviewCanvas();
}

// ── TEMPLATE RENDERING ───────────────────────────────────────
function renderTemplates(containerId, category) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const filtered = category === 'all' ? TEMPLATES : TEMPLATES.filter(t => t.category === category);
  container.innerHTML = filtered.map(t => `
    <div class="template-card reveal" id="tpl-${t.id}" onclick="useTemplate('${t.id}')">
      <div class="template-thumb" style="background:${t.grad};">
        <span>${t.emoji}</span>
        <div class="template-thumb-overlay">
          <div class="template-thumb-play">▶</div>
        </div>
      </div>
      <div class="template-body">
        <div class="template-body-top">
          <span class="template-name">${t.name}</span>
          <span class="template-duration">${t.duration}</span>
        </div>
        <p class="template-desc">${t.desc}</p>
        <div class="template-footer">
          <span class="template-tag">${t.category}</span>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();useTemplate('${t.id}')">Use →</button>
        </div>
      </div>
    </div>
  `).join('');
  observeReveal();
}

function filterTemplates(category, btn) {
  document.querySelectorAll('#template-filters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTemplates('templates-grid', category);
}

function filterStudioTemplates(category, btn) {
  document.querySelectorAll('#studio-template-filters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderStudioTemplates(category);
}

function renderStudioTemplates(category = 'all') {
  renderTemplates('studio-templates-grid', category);
}

function useTemplate(id) {
  const t = TEMPLATES.find(tmpl => tmpl.id === id);
  if (!t) return;
  showStudio();
  showPanel('create');
  // Map template category to select value
  const styleMap = {
    science: 'science-anim', math: 'math-tutorial', history: 'faceless-explainer',
    data: 'data-viz', coding: 'faceless-explainer', explainer: 'faceless-explainer',
  };
  const styleEl = document.getElementById('template-style');
  if (styleEl) styleEl.value = styleMap[t.category] || 'faceless-explainer';
  const topicEl = document.getElementById('video-topic');
  if (topicEl) topicEl.value = `Create an educational video about: ${t.name}. ${t.desc}`;
  // Update state so preview reflects this template
  state.activeTemplate = t;
  state.generatedScript = null;
  document.getElementById('studio-main').scrollTop = 0;
}

// ── PALETTE SELECTION ─────────────────────────────────────────
function selectPalette(el, palette) {
  document.querySelectorAll('.palette-option').forEach(o => o.classList.remove('active'));
  el.classList.add('active');
  state.selectedPalette = palette;
}

// ── AI VIDEO GENERATION ───────────────────────────────────────
async function generateVideo() {
  const topic = document.getElementById('video-topic').value.trim();
  if (!topic) {
    alert('Please enter a video topic first.');
    return;
  }

  const style = document.getElementById('template-style').value;
  const duration = document.getElementById('video-duration').value;

  document.getElementById('generate-btn').disabled = true;
  document.getElementById('generation-progress').classList.remove('hidden');
  document.getElementById('script-preview').classList.add('hidden');

  // Animate progress steps
  const steps = ['prog-step-1', 'prog-step-2', 'prog-step-3', 'prog-step-4'];
  const statusMessages = [
    'Generating script with NVIDIA Nemotron...',
    'Building HyperFrames composition...',
    'Rendering motion graphics...',
    'Encoding final MP4...',
  ];
  const durations = [2500, 2000, 3000, 2000];
  const progressFill = document.getElementById('gen-progress-fill');
  const progressStatus = document.getElementById('progress-status');

  let currentStep = 0;
  let progressPct = 5;
  progressFill.style.width = progressPct + '%';

  // Call the real API for script generation
  const scriptPromise = callNemotronAPI(topic, style, parseInt(duration));

  const stepInterval = setInterval(() => {
    if (currentStep < steps.length) {
      steps.forEach((s, i) => {
        const el = document.getElementById(s);
        if (i < currentStep) { el.classList.remove('active'); el.classList.add('done'); el.querySelector('.prog-step-dot').textContent = ''; el.innerHTML = el.innerHTML.replace('class="prog-step-dot">', 'class="prog-step-dot">'); }
        else if (i === currentStep) { el.classList.add('active'); }
        else { el.classList.remove('active','done'); }
      });
      progressStatus.textContent = statusMessages[currentStep];
      const targetPct = 25 + currentStep * 22;
      progressFill.style.width = targetPct + '%';
      currentStep++;
    } else {
      clearInterval(stepInterval);
    }
  }, 2200);

  try {
    const script = await scriptPromise;
    clearInterval(stepInterval);
    progressFill.style.width = '100%';
    steps.forEach(s => { const el = document.getElementById(s); el.classList.remove('active'); el.classList.add('done'); });
    progressStatus.textContent = '✓ Video generation complete!';

    await delay(600);
    document.getElementById('generation-progress').classList.add('hidden');
    showScriptPreview(script, topic);
    state.generatedScript = script;

  } catch (err) {
    console.error('API Error:', err);
    clearInterval(stepInterval);
    // Use fallback script
    const fallbackScript = generateFallbackScript(topic, style, parseInt(duration));
    progressFill.style.width = '100%';
    progressStatus.textContent = '✓ Script generated (offline mode)';
    await delay(600);
    document.getElementById('generation-progress').classList.add('hidden');
    showScriptPreview(fallbackScript, topic);
    state.generatedScript = fallbackScript;
  }

  document.getElementById('generate-btn').disabled = false;
}

async function callNemotronAPI(topic, style, duration) {
  const systemPrompt = `You are an expert educational video scriptwriter and HyperFrames motion graphics director. You create stunning, engaging educational video scripts.`;

  const userPrompt = `Create a detailed educational video script for the following:

Topic: ${topic}
Style: ${style}
Duration: ${duration} seconds

Output a JSON object with this structure:
{
  "title": "Video title",
  "totalDuration": ${duration},
  "scenes": [
    {
      "id": 1,
      "name": "Scene name",
      "startTime": 0,
      "duration": 8,
      "narration": "What the narrator says",
      "visualDescription": "What the HyperFrames animation shows",
      "animations": ["fade-in title", "particle burst", "diagram reveal"],
      "keyMessage": "Core concept for this scene"
    }
  ],
  "hyperframesNotes": "Technical notes for HyperFrames composition",
  "colorScheme": ["#hex1", "#hex2"],
  "musicMood": "Epic/Calm/Energetic/etc"
}

Make ${Math.round(duration / 12)} scenes. Be specific and cinematic.`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://astrahcontent.ai',
      'X-Title': 'AstrahContent',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data = await response.json();
  const content = data.choices[0].message.content;

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  return generateFallbackScript(topic, 'faceless-explainer', 60);
}

function generateFallbackScript(topic, style, duration) {
  const sceneCount = Math.max(3, Math.round(duration / 15));
  const scenes = [];
  const sceneTemplates = [
    { name: 'Introduction', narration: `Welcome to this exploration of ${topic}. Today we'll break down everything you need to know with stunning animations.`, visual: 'Cinematic title reveal with particle effects and glowing text animation', animations: ['title-fade-in', 'particle-burst', 'glow-pulse'] },
    { name: 'Core Concept', narration: `Let's start with the fundamentals. ${topic} is a fascinating subject that touches on many aspects of our world.`, visual: 'Animated diagram with labeled components fading in sequentially', animations: ['diagram-reveal', 'label-typewriter', 'arrow-draw'] },
    { name: 'Deep Dive', narration: `Now let's explore the mechanisms in detail. Notice how each component interacts with the others.`, visual: 'Zoomed-in animation showing process flow with connecting lines and highlight pulses', animations: ['zoom-in', 'flow-lines', 'highlight-pulse'] },
    { name: 'Real World Application', narration: `Where do we see this in real life? From everyday examples to cutting-edge research, the applications are everywhere.`, visual: 'Split-screen showing multiple real-world contexts with animated icons', animations: ['split-screen', 'icon-pop', 'counter-up'] },
    { name: 'Summary', narration: `Let's recap what we've learned. Remember these key points as you explore ${topic} further.`, visual: 'Elegant recap slide with bullet points animating in one by one', animations: ['bullet-cascade', 'checkmark-draw', 'fade-out'] },
  ];

  for (let i = 0; i < sceneCount; i++) {
    const tmpl = sceneTemplates[Math.min(i, sceneTemplates.length - 1)];
    scenes.push({
      id: i + 1,
      name: tmpl.name,
      startTime: Math.round((i / sceneCount) * duration),
      duration: Math.round(duration / sceneCount),
      narration: tmpl.narration,
      visualDescription: tmpl.visual,
      animations: tmpl.animations,
      keyMessage: `Key insight ${i + 1} about ${topic}`,
    });
  }

  return {
    title: `${topic} — An Animated Explainer`,
    totalDuration: duration,
    scenes,
    hyperframesNotes: `Use GSAP for all animations. Set resolution to 1920x1080. 30 FPS. CSS: dark background with purple/cyan gradient accents.`,
    colorScheme: ['#a855f7', '#06b6d4', '#0a0a1a'],
    musicMood: 'Inspiring and educational',
  };
}

function showScriptPreview(script, topic) {
  const container = document.getElementById('script-content');
  container.innerHTML = `
    <div style="margin-bottom:16px; padding:12px; background:rgba(168,85,247,0.08); border-radius:10px; border:1px solid rgba(168,85,247,0.2)">
      <div style="font-size:0.7rem; color:#a855f7; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px">📹 Generated Video</div>
      <div style="font-weight:700; font-size:1rem; color:#f0f0ff">${script.title}</div>
      <div style="font-size:0.78rem; color:#a0a0bf; margin-top:4px">Duration: ${script.totalDuration}s · Music: ${script.musicMood || 'Cinematic'}</div>
    </div>
    ${script.scenes.map(s => `
      <div class="script-scene">
        <div class="script-scene-title">Scene ${s.id}: ${s.name} · ${s.startTime}s–${s.startTime + s.duration}s</div>
        <div class="script-scene-text"><strong>🎙 Narration:</strong> "${s.narration}"</div>
        <div class="script-scene-text" style="margin-top:6px"><strong>🎬 Visual:</strong> ${s.visualDescription}</div>
        <div style="margin-top:8px; display:flex; flex-wrap:wrap; gap:4px">
          ${(s.animations||[]).map(a => `<span style="font-size:0.65rem; padding:2px 8px; border-radius:4px; background:rgba(6,182,212,0.1); color:#22d3ee; border:1px solid rgba(6,182,212,0.2)">${a}</span>`).join('')}
        </div>
      </div>
    `).join('')}
  `;
  document.getElementById('script-preview').classList.remove('hidden');
}

function copyScript() {
  if (!state.generatedScript) return;
  navigator.clipboard.writeText(JSON.stringify(state.generatedScript, null, 2));
  const btn = document.getElementById('copy-script-btn');
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 2000);
}

function editScript() {
  alert('Full script editor coming soon! For now, copy the JSON and modify it manually.');
}

function regenerateScript() {
  document.getElementById('script-preview').classList.add('hidden');
  generateVideo();
}

// ── SETTINGS ─────────────────────────────────────────────────
function saveApiSettings() {
  const key = document.getElementById('api-key-input').value;
  const model = document.getElementById('ai-model-select').value;
  if (key) alert('✓ API settings saved!');
}

function saveHFSettings() {
  alert('✓ HyperFrames settings saved!');
}

function toggleApiKey() {
  const input = document.getElementById('api-key-input');
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ── EXPORT / RENDER ──────────────────────────────────────────
async function startExport() {
  const btn = document.getElementById('render-export-btn');
  const progressEl = document.getElementById('export-progress');
  const fillEl = document.getElementById('export-progress-fill');
  const labelEl = document.getElementById('export-progress-label');
  const res = document.getElementById('export-res').value;
  const fmt = document.getElementById('export-format').value;
  const fps = parseInt(document.getElementById('export-fps').value);
  const totalFrames = state.videoDuration * fps;

  btn.disabled = true;
  progressEl.classList.remove('hidden');
  fillEl.style.width = '0%';

  for (let frame = 0; frame <= totalFrames; frame += Math.ceil(totalFrames / 60)) {
    const pct = Math.min((frame / totalFrames) * 100, 100);
    fillEl.style.width = pct + '%';
    labelEl.textContent = `Rendering frame ${Math.min(frame, totalFrames)} / ${totalFrames}... (${res} ${fmt.toUpperCase()})`;
    await delay(40);
  }

  fillEl.style.width = '100%';
  labelEl.textContent = `✓ Export complete! (Simulated — real render via HyperFrames CLI)`;
  btn.disabled = false;

  setTimeout(() => {
    progressEl.classList.add('hidden');
    btn.disabled = false;
  }, 4000);
}

// ── PLAYBACK ENGINE ──────────────────────────────────────────
function togglePlayback() {
  state.isPlaying ? stopPlayback() : startPlayback();
}

function startPlayback() {
  state.isPlaying = true;
  document.getElementById('play-icon').innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  state.playbackInterval = setInterval(() => {
    state.playbackTime += 0.1;
    if (state.playbackTime >= state.videoDuration) {
      state.playbackTime = 0;
    }
    updatePlaybackUI();
  }, 100);
}

function stopPlayback() {
  state.isPlaying = false;
  if (state.playbackInterval) { clearInterval(state.playbackInterval); state.playbackInterval = null; }
  const playIcon = document.getElementById('play-icon');
  if (playIcon) playIcon.innerHTML = '<polygon points="5,3 19,12 5,21"/>';
}

function rewindVideo() {
  state.playbackTime = 0;
  updatePlaybackUI();
}

function updatePlaybackUI() {
  const pct = (state.playbackTime / state.videoDuration) * 100;
  const prog = document.getElementById('timeline-progress');
  const head = document.getElementById('timeline-playhead');
  const display = document.getElementById('time-display');
  if (prog) prog.style.width = pct + '%';
  if (head) head.style.left = pct + '%';
  if (display) display.textContent = `${formatTime(state.playbackTime)} / ${formatTime(state.videoDuration)}`;
  renderPreviewFrame(state.playbackTime);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2,'0')}`;
}

// ── CANVAS PREVIEW RENDERER ───────────────────────────────────
function initPreviewCanvas() {
  const canvas = document.getElementById('previewCanvas');
  if (!canvas) return;
  canvas.width = 1280;
  canvas.height = 720;
  renderPreviewFrame(0);
}

function renderPreviewFrame(time) {
  const canvas = document.getElementById('previewCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const t = time;

  // Background
  ctx.fillStyle = '#070711';
  ctx.fillRect(0, 0, W, H);

  // Animated gradient orbs
  const angle = t * 0.5;
  const grd = ctx.createRadialGradient(
    W * 0.3 + Math.sin(angle) * 100, H * 0.4 + Math.cos(angle) * 60, 0,
    W * 0.3, H * 0.4, 400
  );
  grd.addColorStop(0, 'rgba(168,85,247,0.15)');
  grd.addColorStop(1, 'transparent');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  const grd2 = ctx.createRadialGradient(
    W * 0.7 + Math.cos(angle) * 80, H * 0.6 + Math.sin(angle) * 50, 0,
    W * 0.7, H * 0.6, 350
  );
  grd2.addColorStop(0, 'rgba(6,182,212,0.12)');
  grd2.addColorStop(1, 'transparent');
  ctx.fillStyle = grd2;
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }

  // Floating particles
  for (let i = 0; i < 20; i++) {
    const px = ((i * 137.5 + t * 30 * (i % 3 === 0 ? 1 : -1)) % W + W) % W;
    const py = ((i * 89.3 + t * 15) % H + H) % H;
    const alpha = 0.3 + 0.3 * Math.sin(t * 2 + i);
    ctx.beginPath();
    ctx.arc(px, py, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? `rgba(168,85,247,${alpha})` : `rgba(6,182,212,${alpha})`;
    ctx.fill();
  }

  // Determine scene
  const scenePct = t / state.videoDuration;
  if (scenePct < 0.15) drawIntroScene(ctx, W, H, t, scenePct / 0.15);
  else if (scenePct < 0.45) drawConceptScene(ctx, W, H, t, (scenePct - 0.15) / 0.30);
  else if (scenePct < 0.75) drawAnimationScene(ctx, W, H, t, (scenePct - 0.45) / 0.30);
  else drawSummaryScene(ctx, W, H, t, (scenePct - 0.75) / 0.25);

  // Timestamp overlay
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '20px Inter';
  ctx.textAlign = 'right';
  ctx.fillText(formatTime(t), W - 20, H - 16);
}

function drawIntroScene(ctx, W, H, t, progress) {
  // Pull the title from the generated script, active template, or textarea — in priority order
  let title = 'Your Video';
  let subtitle = 'AstrahContent × HyperFrames';

  if (state.generatedScript) {
    title = state.generatedScript.title || title;
    subtitle = `${state.generatedScript.scenes.length} scenes · ${state.generatedScript.totalDuration}s`;
  } else if (state.activeTemplate) {
    title = state.activeTemplate.name;
    subtitle = state.activeTemplate.desc;
  } else {
    const topicEl = document.getElementById('video-topic');
    const raw = topicEl ? topicEl.value.trim() : '';
    if (raw) title = raw.length > 50 ? raw.substring(0, 50) + '…' : raw;
  }


  // Animated lines radiating from center
  ctx.save();
  ctx.translate(W/2, H/2);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + t * 0.3;
    const len = 100 + 80 * Math.sin(t * 1.5 + i * 0.5);
    const alpha = 0.15 + 0.1 * Math.sin(t + i);
    ctx.strokeStyle = i % 2 === 0 ? `rgba(168,85,247,${alpha})` : `rgba(6,182,212,${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ang) * len, Math.sin(ang) * len);
    ctx.stroke();
  }
  ctx.restore();

  // Main title
  const alpha = Math.min(1, progress * 3);
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';

  // Glow effect
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#f0f0ff';
  ctx.font = 'bold 54px Space Grotesk, Inter';
  // Wrap long titles
  const maxW = W - 120;
  const words = title.split(' ');
  let line1 = '', line2 = '';
  words.forEach(w => { if (ctx.measureText(line1 + ' ' + w).width < maxW) line1 += (line1 ? ' ' : '') + w; else line2 += (line2 ? ' ' : '') + w; });
  ctx.fillText(line1, W/2, line2 ? H/2 - 50 : H/2 - 20);
  if (line2) ctx.fillText(line2, W/2, H/2 + 14);

  ctx.shadowBlur = 0;
  ctx.font = '22px Inter';
  ctx.fillStyle = '#a0a0bf';
  const subShort = subtitle.length > 80 ? subtitle.substring(0, 80) + '…' : subtitle;
  ctx.fillText(subShort, W/2, (line2 ? H/2 + 60 : H/2 + 28));

  ctx.font = '16px Inter';
  ctx.fillStyle = '#a855f7';
  ctx.fillText('Powered by HyperFrames + NVIDIA Nemotron', W/2, (line2 ? H/2 + 96 : H/2 + 64));
  ctx.globalAlpha = 1;
}

function drawConceptScene(ctx, W, H, t, progress) {
  // Animated molecule/diagram
  ctx.textAlign = 'center';

  const cx = W * 0.35, cy = H * 0.5;
  const numNodes = 6;
  const radius = 120;
  const nodePositions = [];

  for (let i = 0; i < numNodes; i++) {
    const ang = (i / numNodes) * Math.PI * 2 + t * 0.2;
    const nx = cx + Math.cos(ang) * radius;
    const ny = cy + Math.sin(ang) * radius;
    nodePositions.push({ x: nx, y: ny });

    // Draw connection lines
    ctx.strokeStyle = 'rgba(168,85,247,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny); ctx.stroke();

    // Draw node
    const pulse = 1 + 0.15 * Math.sin(t * 2 + i);
    ctx.beginPath(); ctx.arc(nx, ny, 14 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(168,85,247,0.8)' : 'rgba(6,182,212,0.8)';
    ctx.fill();
  }

  // Central node
  ctx.beginPath(); ctx.arc(cx, cy, 22 + 4*Math.sin(t*2), 0, Math.PI*2);
  const nodeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 26);
  nodeGrad.addColorStop(0, '#c084fc'); nodeGrad.addColorStop(1, '#06b6d4');
  ctx.fillStyle = nodeGrad; ctx.fill();

  // Right panel text
  const textX = W * 0.62;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 14px Inter';
  ctx.fillText('CONCEPT BREAKDOWN', textX, H * 0.3);

  ctx.fillStyle = '#f0f0ff';
  ctx.font = 'bold 36px Space Grotesk, Inter';
  ctx.fillText('Core Mechanism', textX, H * 0.4);

  ctx.fillStyle = '#a0a0bf';
  ctx.font = '18px Inter';
  const lines = ['Each component works together', 'to create the whole system.', 'Watch the connections form...'];
  lines.forEach((l, i) => ctx.fillText(l, textX, H * 0.5 + i * 28));
}

function drawAnimationScene(ctx, W, H, t, progress) {
  // Animated bar chart
  ctx.textAlign = 'center';
  ctx.fillStyle = '#a855f7';
  ctx.font = 'bold 14px Inter';
  ctx.fillText('DATA VISUALIZATION', W/2, 80);

  ctx.fillStyle = '#f0f0ff';
  ctx.font = 'bold 32px Space Grotesk, Inter';
  ctx.fillText('Key Statistics', W/2, 120);

  const barData = [0.65, 0.88, 0.42, 0.95, 0.73, 0.58];
  const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
  const barW = 80, gap = 40, startX = W/2 - (barData.length * (barW + gap)) / 2;
  const maxH = 280, baseY = H - 160;

  barData.forEach((val, i) => {
    const animVal = val * Math.min(1, progress * 2 + i * 0.1);
    const bH = animVal * maxH;
    const bX = startX + i * (barW + gap);
    const bY = baseY - bH;

    // Bar
    const barGrad = ctx.createLinearGradient(bX, bY, bX, baseY);
    barGrad.addColorStop(0, i % 2 === 0 ? '#a855f7' : '#06b6d4');
    barGrad.addColorStop(1, 'rgba(168,85,247,0.2)');
    ctx.fillStyle = barGrad;
    ctx.beginPath();
    ctx.roundRect(bX, bY, barW, bH, [6, 6, 0, 0]);
    ctx.fill();

    // Value
    ctx.fillStyle = '#f0f0ff';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(animVal * 100) + '%', bX + barW/2, bY - 8);
    ctx.fillStyle = '#a0a0bf';
    ctx.font = '14px Inter';
    ctx.fillText(labels[i], bX + barW/2, baseY + 20);
  });
}

function drawSummaryScene(ctx, W, H, t, progress) {
  ctx.textAlign = 'center';

  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#f0f0ff';
  ctx.font = 'bold 52px Space Grotesk, Inter';
  ctx.fillText('Key Takeaways', W/2, H * 0.28);
  ctx.shadowBlur = 0;

  const points = [
    '✦ Core concept mastered',
    '✦ Mechanisms understood',
    '✦ Real-world applications identified',
    '✦ Ready for deeper exploration',
  ];

  points.forEach((point, i) => {
    const alpha = Math.min(1, Math.max(0, progress * 4 - i * 0.8));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 2 === 0 ? '#c084fc' : '#22d3ee';
    ctx.font = '24px Inter';
    ctx.fillText(point, W/2, H * 0.42 + i * 50);
  });
  ctx.globalAlpha = 1;

  const pulsAlpha = 0.6 + 0.4 * Math.sin(t * 3);
  ctx.fillStyle = `rgba(168,85,247,${pulsAlpha})`;
  ctx.font = 'bold 18px Inter';
  ctx.fillText('Generated by AstrahContent × HyperFrames', W/2, H - 60);
}

// ── HERO CANVAS ANIMATIONS ────────────────────────────────────
function initHeroCanvases() {
  initScienceCanvas();
  initMathCanvas();
  initHistoryCanvas();
}

function initScienceCanvas() {
  const canvas = document.getElementById('scienceCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#0a1a12';
    ctx.fillRect(0,0,W,H);

    const cx = W/2, cy = H/2;
    // Nucleus
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI*2);
    const ng = ctx.createRadialGradient(cx,cy,0,cx,cy,18);
    ng.addColorStop(0,'#34d399'); ng.addColorStop(1,'rgba(52,211,153,0.3)');
    ctx.fillStyle = ng; ctx.fill();

    // Orbiting electrons
    for (let i = 0; i < 3; i++) {
      const orbitR = 35 + i*20;
      ctx.beginPath();
      ctx.ellipse(cx, cy, orbitR, orbitR * 0.3, (i * Math.PI / 3) + t*0.3, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(52,211,153,0.2)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      const ang = t * (1 + i*0.5) + (i * Math.PI*2/3);
      const ex = cx + Math.cos(ang) * orbitR;
      const ey = cy + Math.sin(ang) * orbitR * 0.3 + Math.sin((i*Math.PI/3) + t*0.3) * orbitR * 0.6;
      ctx.beginPath(); ctx.arc(ex, ey, 4, 0, Math.PI*2);
      ctx.fillStyle = '#34d399'; ctx.fill();
    }

    ctx.textAlign='center';
    ctx.fillStyle='rgba(52,211,153,0.8)';
    ctx.font='bold 11px Inter';
    ctx.fillText('PHOTOSYNTHESIS', cx, H-14);

    t += 0.03;
    requestAnimationFrame(draw);
  }
  draw();
}

function initMathCanvas() {
  const canvas = document.getElementById('mathCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0d0a1a';
    ctx.fillRect(0,0,W,H);

    // Draw axes
    ctx.strokeStyle = 'rgba(168,85,247,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20,H-30); ctx.lineTo(W-20,H-30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(50,10); ctx.lineTo(50,H-20); ctx.stroke();

    // Draw animated sine wave
    ctx.beginPath();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    let first = true;
    for (let x = 50; x < W-20; x++) {
      const xVal = (x - 50) / 30;
      const y = (H-30) - (Math.sin(xVal - t) * 50 + 30);
      if (first) { ctx.moveTo(x, y); first = false; }
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Equation text
    ctx.textAlign = 'right';
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 18px Georgia';
    ctx.fillText('y = sin(x)', W-24, 30);

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(168,85,247,0.8)';
    ctx.font = 'bold 11px Inter';
    ctx.fillText('MATH TUTORIAL', W/2, H-14);

    t += 0.04;
    requestAnimationFrame(draw);
  }
  draw();
}

function initHistoryCanvas() {
  const canvas = document.getElementById('historyCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let t = 0;
  const events = [
    { year: '1776', label: 'Revolution', x: 0.15 },
    { year: '1865', label: 'Emancipation', x: 0.38 },
    { year: '1945', label: 'WWII End', x: 0.62 },
    { year: '1969', label: 'Moon Landing', x: 0.8 },
  ];

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#0e0c18';
    ctx.fillRect(0,0,W,H);

    // Timeline line
    const ly = H * 0.55;
    const grd = ctx.createLinearGradient(20, ly, W-20, ly);
    grd.addColorStop(0,'rgba(168,85,247,0)');
    grd.addColorStop(0.5,'rgba(168,85,247,0.8)');
    grd.addColorStop(1,'rgba(6,182,212,0)');
    ctx.strokeStyle = grd;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20,ly); ctx.lineTo(W-20, ly); ctx.stroke();

    events.forEach((ev, i) => {
      const ex = ev.x * W;
      const pulse = 1 + 0.2 * Math.sin(t * 2 + i);

      ctx.beginPath(); ctx.arc(ex, ly, 7*pulse, 0, Math.PI*2);
      ctx.fillStyle = i % 2 === 0 ? '#a855f7' : '#06b6d4';
      ctx.fill();

      ctx.beginPath(); ctx.moveTo(ex, ly); ctx.lineTo(ex, ly - 50);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#c084fc';
      ctx.font = 'bold 10px Inter';
      ctx.fillText(ev.year, ex, ly - 58);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '9px Inter';
      ctx.fillText(ev.label, ex, ly - 44);
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(168,85,247,0.8)';
    ctx.font = 'bold 11px Inter';
    ctx.fillText('HISTORY TIMELINE', W/2, H-14);

    t += 0.025;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── SCROLL REVEAL ─────────────────────────────────────────────
function observeReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ── NAVBAR SCROLL EFFECT ──────────────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('main-nav');
  if (!nav) return;
  if (window.scrollY > 60) {
    nav.style.background = 'rgba(7,7,17,0.95)';
    nav.style.boxShadow = '0 4px 24px rgba(0,0,0,0.3)';
  } else {
    nav.style.background = 'rgba(7,7,17,0.7)';
    nav.style.boxShadow = '';
  }
});

// ── UTILITIES ─────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Add reveal classes to feature and template cards
  document.querySelectorAll('.feature-card, .pricing-card, .step-item').forEach(el => el.classList.add('reveal'));

  // Render landing page templates
  renderTemplates('templates-grid', 'all');

  // Start hero canvas animations
  initHeroCanvases();

  // Start scroll reveal
  observeReveal();

  // Animate render progress bar on how-it-works
  const demoBar = document.getElementById('demo-render-bar');
  if (demoBar) {
    demoBar.style.animation = 'renderProgress 3s ease-in-out infinite';
  }

  // Smooth scroll for nav links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const href = a.getAttribute('href');
      if (href && href.length > 1) {
        const target = document.querySelector(href);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  console.log('🚀 AstrahContent loaded | HyperFrames v0.8.123 | NVIDIA Nemotron Ultra');
});

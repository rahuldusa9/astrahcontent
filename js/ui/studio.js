/**
 * AstrahContent — Studio Application UI Controller
 */
import { state } from '../state.js';
import { TEMPLATES } from '../data/templates.js';
import { callNemotronAPI } from '../api/openrouter.js';
import {
  initPreviewCanvas,
  renderPreviewFrame,
  togglePlayback,
  startPlayback,
  stopPlayback,
  rewindVideo
} from '../canvas/player.js';

export function initStudio() {
  initPanelNavigation();
  initTemplateGallery();
  initGenerator();
  initScriptControls();
  initPlaybackControls();
  initExportEngine();
  initSettings();
  initTimelineScrubber();
  handleUrlQueryParams();

  // Initialize preview canvas immediately
  initPreviewCanvas();
}

/**
 * Handle URL query params like ?template=science-1
 */
function handleUrlQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const templateId = params.get('template');
  if (templateId) {
    applyTemplate(templateId);
  }
}

/**
 * Panel switching
 */
export function showPanel(name) {
  document.querySelectorAll('.studio-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-nav-item').forEach(b => b.classList.remove('active'));

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');

  const navItem = document.getElementById('nav-' + name) || document.getElementById('nav-' + name + '-studio');
  if (navItem) navItem.classList.add('active');

  state.currentPanel = name;
  if (name === 'preview') {
    initPreviewCanvas();
  }
}

function initPanelNavigation() {
  const navMap = [
    { btnId: 'nav-create', panel: 'create' },
    { btnId: 'nav-preview', panel: 'preview' },
    { btnId: 'nav-templates', panel: 'templates' },
    { btnId: 'nav-script', panel: 'script' },
    { btnId: 'nav-export', panel: 'export' },
    { btnId: 'nav-settings', panel: 'settings' },
  ];

  navMap.forEach(({ btnId, panel }) => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        showPanel(panel);
      });
    }
  });

  // Global exposure for onclick handlers
  window.showPanel = showPanel;
}

/**
 * Template gallery in studio
 */
function initTemplateGallery() {
  renderStudioTemplates('all');

  const filterBtns = document.querySelectorAll('.studio-tpl-filter');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-cat') || 'all';
      renderStudioTemplates(cat);
    });
  });
}

export function renderStudioTemplates(category = 'all') {
  const container = document.getElementById('studio-templates-grid');
  if (!container) return;

  const filtered = category === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === category);

  container.innerHTML = filtered.map(t => `
    <div class="template-card" id="studio-tpl-${t.id}" onclick="applyTemplate('${t.id}')">
      <div class="template-thumb" style="background:${t.grad};">
        <span>${t.emoji}</span>
      </div>
      <div class="template-body">
        <div class="template-body-top">
          <span class="template-name">${t.name}</span>
          <span class="template-duration">${t.duration}</span>
        </div>
        <p class="template-desc">${t.desc}</p>
        <div class="template-footer">
          <span class="template-tag">${t.category}</span>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();applyTemplate('${t.id}')">Use Template</button>
        </div>
      </div>
    </div>
  `).join('');
}

export function applyTemplate(id) {
  const tpl = TEMPLATES.find(t => t.id === id);
  if (!tpl) return;

  state.activeTemplate = tpl;

  const topicInput = document.getElementById('video-topic');
  if (topicInput) {
    topicInput.value = `${tpl.name}: Deep dive into core concepts and visual demonstration.`;
  }

  const styleSelect = document.getElementById('anim-style');
  if (styleSelect) {
    if (tpl.category === 'science') styleSelect.value = 'science';
    else if (tpl.category === 'math') styleSelect.value = 'math';
    else if (tpl.category === 'history') styleSelect.value = 'history';
    else styleSelect.value = 'kinetic';
  }

  showPanel('create');
}
window.applyTemplate = applyTemplate;
window.useTemplate = applyTemplate;

/**
 * AI Video Generator
 */
function initGenerator() {
  const genBtn = document.getElementById('btn-generate');
  if (genBtn) {
    genBtn.addEventListener('click', generateVideo);
  }

  // Preset topic chips
  document.querySelectorAll('.topic-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const topic = chip.getAttribute('data-topic');
      const topicInput = document.getElementById('video-topic');
      if (topicInput && topic) topicInput.value = topic;
    });
  });

  // Palette buttons
  document.querySelectorAll('.palette-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.palette-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      state.selectedPalette = opt.getAttribute('data-palette') || 'cosmic';
    });
  });
}

export async function generateVideo() {
  const topicEl = document.getElementById('video-topic');
  const topic = topicEl ? topicEl.value.trim() : '';

  if (!topic) {
    alert('Please enter a topic or concept for your video.');
    if (topicEl) topicEl.focus();
    return;
  }

  const style = document.getElementById('anim-style')?.value || 'kinetic';
  const duration = document.getElementById('video-duration')?.value || '60';
  state.videoDuration = parseInt(duration, 10) || 60;

  const genBtn = document.getElementById('btn-generate');
  const statusContainer = document.getElementById('generate-status');
  const statusText = document.getElementById('status-text');
  const statusProgressBar = document.getElementById('status-progress-bar');

  if (genBtn) {
    genBtn.disabled = true;
    genBtn.innerHTML = `
      <span class="spinner"></span>
      Generating with Nemotron...
    `;
  }

  if (statusContainer) statusContainer.classList.remove('hidden');

  const updateStatus = (text, progress) => {
    if (statusText) statusText.textContent = text;
    if (statusProgressBar) statusProgressBar.style.width = `${progress}%`;
  };

  try {
    updateStatus('Connecting to NVIDIA Nemotron Ultra via OpenRouter...', 20);
    await new Promise(r => setTimeout(r, 600));

    updateStatus('Analyzing pedagogy & generating scene storyboard...', 50);
    const script = await callNemotronAPI(topic, style, duration);

    updateStatus('Compiling HyperFrames motion graphics code...', 85);
    await new Promise(r => setTimeout(r, 500));

    state.generatedScript = script;
    showScriptPreview(script, topic);

    updateStatus('Video generated successfully! Ready to preview.', 100);
    await new Promise(r => setTimeout(r, 400));

    // Jump to preview panel
    showPanel('preview');
  } catch (err) {
    console.error('Generation error:', err);
    updateStatus(`Error: ${err.message || 'Generation failed'}`, 100);
  } finally {
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
        Generate Video with AI
      `;
    }
  }
}
window.generateVideo = generateVideo;

/**
 * Script & Storyboard display
 */
export function showScriptPreview(script, topic) {
  const container = document.getElementById('script-content');
  if (!container) return;

  const cleanScript = script || '';
  container.innerHTML = `
    <div class="script-header-card">
      <div class="script-meta-badge">NVIDIA Nemotron 3 Ultra 550B</div>
      <h3>${topic}</h3>
      <div class="script-meta-row">
        <span>⏱ Duration: ${state.videoDuration}s</span>
        <span>🎨 Palette: ${state.selectedPalette}</span>
        <span>🚀 HyperFrames Engine v0.8</span>
      </div>
    </div>
    <div class="script-body-text">
      <pre>${escapeHtml(cleanScript)}</pre>
    </div>
  `;

  // Also update raw editor if present
  const rawEditor = document.getElementById('script-editor');
  if (rawEditor) rawEditor.value = cleanScript;
}

function initScriptControls() {
  const copyBtn = document.getElementById('btn-copy-script');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = state.generatedScript || '';
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy Script'; }, 2000);
      });
    });
  }

  const regenBtn = document.getElementById('btn-regenerate');
  if (regenBtn) {
    regenBtn.addEventListener('click', () => {
      showPanel('create');
      generateVideo();
    });
  }
}

/**
 * Playback engine controls
 */
function initPlaybackControls() {
  const playBtn = document.getElementById('play-btn');
  if (playBtn) playBtn.addEventListener('click', togglePlayback);

  const rewindBtn = document.getElementById('rewind-btn');
  if (rewindBtn) rewindBtn.addEventListener('click', rewindVideo);

  // Jump to preview button from studio top bar
  const navPreviewBtn = document.getElementById('nav-preview-btn');
  if (navPreviewBtn) {
    navPreviewBtn.addEventListener('click', () => showPanel('preview'));
  }
}

/**
 * Timeline scrubber interaction
 */
function initTimelineScrubber() {
  const timelineTrack = document.getElementById('timeline-track');
  if (!timelineTrack) return;

  timelineTrack.addEventListener('click', (e) => {
    const rect = timelineTrack.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    state.playbackTime = pct * state.videoDuration;

    const prog = document.getElementById('timeline-progress');
    const head = document.getElementById('timeline-playhead');
    const disp = document.getElementById('time-display');

    if (prog) prog.style.width = (pct * 100) + '%';
    if (head) head.style.left = (pct * 100) + '%';
    if (disp) {
      const curM = Math.floor(state.playbackTime / 60);
      const curS = Math.floor(state.playbackTime % 60).toString().padStart(2, '0');
      const durM = Math.floor(state.videoDuration / 60);
      const durS = Math.floor(state.videoDuration % 60).toString().padStart(2, '0');
      disp.textContent = `${curM}:${curS} / ${durM}:${durS}`;
    }

    renderPreviewFrame(state.playbackTime);
  });
}

/**
 * Export and CLI rendering engine simulation
 */
function initExportEngine() {
  const exportBtn = document.getElementById('btn-start-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const res = document.getElementById('export-res')?.value || '1080p';
      const fps = document.getElementById('export-fps')?.value || '60';
      const fmt = document.getElementById('export-fmt')?.value || 'mp4';

      const progressEl = document.getElementById('export-progress');
      const exportStatus = document.getElementById('export-status');
      if (progressEl) progressEl.classList.remove('hidden');

      const steps = [
        'Parsing HyperFrames motion keyframes...',
        'Synthesizing narration & audio waveform...',
        `Rendering canvas frames at ${fps} FPS (${res})...`,
        `Encoding to ${fmt.toUpperCase()} with hardware acceleration...`,
        'Export completed! Ready for download.'
      ];

      for (let i = 0; i < steps.length; i++) {
        if (exportStatus) exportStatus.textContent = steps[i];
        const bar = document.getElementById('export-bar');
        if (bar) bar.style.width = `${((i + 1) / steps.length) * 100}%`;
        await new Promise(r => setTimeout(r, 650));
      }

      const downloadArea = document.getElementById('export-download-area');
      if (downloadArea) downloadArea.classList.remove('hidden');
    });
  }

  // Copy CLI command
  const copyCliBtn = document.getElementById('btn-copy-cli');
  if (copyCliBtn) {
    copyCliBtn.addEventListener('click', () => {
      const code = document.getElementById('cli-code')?.textContent || '';
      navigator.clipboard.writeText(code).then(() => {
        copyCliBtn.textContent = '✓ Copied Command!';
        setTimeout(() => { copyCliBtn.textContent = 'Copy Command'; }, 2000);
      });
    });
  }
}

/**
 * Settings
 */
function initSettings() {
  const saveBtn = document.getElementById('btn-save-settings');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const key = document.getElementById('setting-api-key')?.value;
      if (key) {
        localStorage.setItem('astrah_openrouter_key', key);
      }
      alert('Settings saved successfully!');
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

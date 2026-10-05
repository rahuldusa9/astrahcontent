/**
 * AstrahContent — Studio Application UI Controller
 */
import { state } from '../state.js';
import { TEMPLATES } from '../data/templates.js';
import { callNemotronAPI } from '../api/openrouter.js';
import {
  generateCustomTemplate,
  getCustomTemplates,
  saveCustomTemplate,
  deleteCustomTemplate,
} from '../api/template-generator.js';
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
  initCustomTemplateCreator();
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
  // Check both built-in and custom templates
  let tpl = TEMPLATES.find(t => t.id === id);
  if (!tpl) {
    tpl = getCustomTemplates().find(t => t.id === id);
  }
  if (!tpl) return;

  state.activeTemplate = tpl;

  const topicInput = document.getElementById('video-topic');
  if (topicInput) {
    topicInput.value = `${tpl.name}: Deep dive into core concepts and visual demonstration.`;
  }

  const styleSelect = document.getElementById('anim-style');
  if (styleSelect) {
    if (tpl.style) {
      const styleMapping = {
        'kinetic': 'kinetic', 'science': 'science', 'math': 'math',
        'history': 'history', 'data': 'data',
        'science-anim': 'science', 'math-tutorial': 'math',
        'faceless-explainer': 'kinetic', 'data-viz': 'data',
      };
      styleSelect.value = styleMapping[tpl.style] || 'kinetic';
    } else if (tpl.category === 'science') styleSelect.value = 'science';
    else if (tpl.category === 'math') styleSelect.value = 'math';
    else if (tpl.category === 'history') styleSelect.value = 'history';
    else styleSelect.value = 'kinetic';
  }

  // Update active template badge
  const badge = document.getElementById('active-template-badge');
  const badgeName = document.getElementById('active-tpl-name');
  if (badge) badge.classList.remove('hidden');
  if (badgeName) badgeName.textContent = `${tpl.emoji || '✦'} ${tpl.name}`;

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

/* ================================================================
   AI Custom Template Creator — Modal & Gallery Controller
   ================================================================ */

/** Temp store for the currently previewed template (not yet saved) */
let pendingCustomTemplate = null;

function initCustomTemplateCreator() {
  // Open modal
  const openBtn = document.getElementById('btn-open-custom-tpl');
  if (openBtn) openBtn.addEventListener('click', openCustomTemplateModal);

  // Close modal
  const closeBtn = document.getElementById('btn-close-custom-tpl');
  if (closeBtn) closeBtn.addEventListener('click', closeCustomTemplateModal);

  // Close on backdrop click
  const overlay = document.getElementById('custom-tpl-modal');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeCustomTemplateModal();
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCustomTemplateModal();
  });

  // Inspiration chip clicks
  document.querySelectorAll('.inspiration-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const desc = chip.getAttribute('data-desc');
      const textarea = document.getElementById('custom-tpl-description');
      if (textarea && desc) {
        textarea.value = desc;
        textarea.focus();
      }
    });
  });

  // Generate button
  const genBtn = document.getElementById('btn-generate-custom-tpl');
  if (genBtn) genBtn.addEventListener('click', handleGenerateCustomTemplate);

  // Save button
  const saveBtn = document.getElementById('btn-save-custom-tpl');
  if (saveBtn) saveBtn.addEventListener('click', handleSaveCustomTemplate);

  // Retry button
  const retryBtn = document.getElementById('btn-retry-custom-tpl');
  if (retryBtn) retryBtn.addEventListener('click', () => {
    pendingCustomTemplate = null;
    showModalStep('input');
  });

  // Render any existing custom templates on load
  renderCustomTemplatesGallery();
}

function openCustomTemplateModal() {
  const modal = document.getElementById('custom-tpl-modal');
  if (modal) {
    modal.classList.remove('hidden');
    showModalStep('input');
    pendingCustomTemplate = null;
  }
}

function closeCustomTemplateModal() {
  const modal = document.getElementById('custom-tpl-modal');
  if (modal) modal.classList.add('hidden');
}

function showModalStep(step) {
  ['input', 'progress', 'preview'].forEach(s => {
    const el = document.getElementById(`custom-tpl-step-${s}`);
    if (el) el.classList.toggle('hidden', s !== step);
  });
}

async function handleGenerateCustomTemplate() {
  const description = document.getElementById('custom-tpl-description')?.value?.trim();
  if (!description) {
    alert('Please describe the template you want to create.');
    document.getElementById('custom-tpl-description')?.focus();
    return;
  }

  const category = document.getElementById('custom-tpl-category')?.value || '';
  const duration = document.getElementById('custom-tpl-duration')?.value || '';

  // Show progress
  showModalStep('progress');

  const progressTitle = document.getElementById('custom-tpl-progress-title');
  const progressText = document.getElementById('custom-tpl-progress-text');
  const progressBar = document.getElementById('custom-tpl-progress-bar');

  const progressSteps = [
    { title: 'Analyzing your description...', text: 'Understanding the visual style, mood, and structure', pct: 20 },
    { title: 'Designing color palette...', text: 'Selecting harmonious colors and gradient combinations', pct: 45 },
    { title: 'Choreographing animations...', text: 'Planning scene transitions and motion sequences', pct: 65 },
    { title: 'Composing scene structure...', text: 'Building the complete storyboard layout', pct: 85 },
  ];

  // Animate progress while API call runs
  let stepIdx = 0;
  const progressInterval = setInterval(() => {
    if (stepIdx < progressSteps.length) {
      const s = progressSteps[stepIdx];
      if (progressTitle) progressTitle.textContent = s.title;
      if (progressText) progressText.textContent = s.text;
      if (progressBar) progressBar.style.width = s.pct + '%';
      stepIdx++;
    }
  }, 1800);

  try {
    const template = await generateCustomTemplate(description, {
      targetCategory: category || undefined,
      targetDuration: duration || undefined,
    });

    clearInterval(progressInterval);
    if (progressBar) progressBar.style.width = '100%';
    if (progressTitle) progressTitle.textContent = 'Template designed!';
    if (progressText) progressText.textContent = 'Review your custom template below';

    await new Promise(r => setTimeout(r, 500));

    pendingCustomTemplate = template;
    renderTemplatePreview(template);
    showModalStep('preview');

  } catch (err) {
    clearInterval(progressInterval);
    console.error('Custom template generation failed:', err);

    if (progressTitle) progressTitle.textContent = 'Generation failed';
    if (progressText) progressText.textContent = err.message || 'Could not connect to AI model';
    if (progressBar) progressBar.style.width = '100%';

    // Show a retry after 2s
    await new Promise(r => setTimeout(r, 2000));
    showModalStep('input');
    alert(`Template generation failed: ${err.message}\n\nMake sure your API key is configured in Settings.`);
  }
}

function renderTemplatePreview(tpl) {
  const container = document.getElementById('custom-tpl-preview-content');
  if (!container) return;

  const colors = tpl.colorScheme
    ? Object.values(tpl.colorScheme).filter(c => c && typeof c === 'string' && c.startsWith('#'))
    : [];

  container.innerHTML = `
    <div class="custom-tpl-preview-gradient" style="background:${tpl.grad};">
      <span>${tpl.emoji}</span>
    </div>
    <div class="custom-tpl-preview-body">
      <div class="custom-tpl-preview-name">${escapeHtml(tpl.name)}</div>
      <div class="custom-tpl-preview-desc">${escapeHtml(tpl.desc)}</div>

      <div class="custom-tpl-preview-meta">
        <span class="custom-tpl-preview-tag">${tpl.category}</span>
        <span class="custom-tpl-preview-tag cyan">${tpl.duration}</span>
        ${tpl.musicMood ? `<span class="custom-tpl-preview-tag emerald">♫ ${escapeHtml(tpl.musicMood)}</span>` : ''}
        ${tpl.pacing ? `<span class="custom-tpl-preview-tag">${escapeHtml(tpl.pacing)}</span>` : ''}
        ${tpl.particleEffect && tpl.particleEffect !== 'none' ? `<span class="custom-tpl-preview-tag cyan">✦ ${escapeHtml(tpl.particleEffect)}</span>` : ''}
      </div>

      ${colors.length > 0 ? `
        <div class="custom-tpl-colors">
          ${colors.map(c => `<div class="custom-tpl-color-swatch" style="background:${c};" title="${c}"></div>`).join('')}
          <span class="custom-tpl-colors-label">AI-generated palette</span>
        </div>
      ` : ''}

      ${tpl.scenes && tpl.scenes.length > 0 ? `
        <div style="margin-top:20px;">
          <div class="custom-tpl-scenes-title">Scene Storyboard (${tpl.scenes.length} scenes)</div>
          ${tpl.scenes.map((scene, i) => `
            <div class="custom-tpl-scene-item">
              <div class="custom-tpl-scene-num">${i + 1}</div>
              <div class="custom-tpl-scene-info">
                <strong>${escapeHtml(scene.name)}</strong>
                ${scene.duration ? `<span style="font-size:0.7rem; color:var(--text-muted); margin-left:6px;">${scene.duration}s</span>` : ''}
                <p>${escapeHtml(scene.visualConcept || scene.visualDescription || '')}</p>
                ${scene.animations && scene.animations.length ? `
                  <div class="custom-tpl-scene-anims">
                    ${scene.animations.map(a => `<span class="custom-tpl-scene-anim-tag">${escapeHtml(a)}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${tpl.typography ? `
        <div style="margin-top:16px; padding:12px; background:rgba(255,255,255,0.02); border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:6px;">Typography</div>
          <div style="font-size:0.82rem; color:var(--text-secondary);">
            Heading: ${escapeHtml(tpl.typography.headingFont || '—')} ·
            Body: ${escapeHtml(tpl.typography.bodyFont || '—')} ·
            Effect: ${escapeHtml(tpl.typography.titleEffect || '—')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

function handleSaveCustomTemplate() {
  if (!pendingCustomTemplate) return;

  saveCustomTemplate(pendingCustomTemplate);

  // Apply it immediately
  applyTemplate(pendingCustomTemplate.id);

  closeCustomTemplateModal();
  renderCustomTemplatesGallery();

  pendingCustomTemplate = null;
}

/**
 * Render saved custom templates in the "Your AI-Generated Templates" section
 */
function renderCustomTemplatesGallery() {
  const section = document.getElementById('custom-templates-section');
  const grid = document.getElementById('custom-templates-grid');
  const count = document.getElementById('custom-tpl-count');
  if (!section || !grid) return;

  const customs = getCustomTemplates();

  if (customs.length === 0) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  if (count) count.textContent = `${customs.length} template${customs.length !== 1 ? 's' : ''}`;

  grid.innerHTML = customs.map(t => `
    <div class="template-card" id="studio-tpl-${t.id}" onclick="applyTemplate('${t.id}')" style="position:relative;">
      <span class="custom-badge">AI ✦</span>
      <button class="custom-delete-btn" onclick="event.stopPropagation(); window._deleteCustomTemplate('${t.id}')" title="Delete template">✕</button>
      <div class="template-thumb" style="background:${t.grad};">
        <span>${t.emoji}</span>
      </div>
      <div class="template-body">
        <div class="template-body-top">
          <span class="template-name">${escapeHtml(t.name)}</span>
          <span class="template-duration">${t.duration}</span>
        </div>
        <p class="template-desc">${escapeHtml(t.desc)}</p>
        <div class="template-footer">
          <span class="template-tag">${t.category}</span>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();applyTemplate('${t.id}')">Use Template</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Expose delete handler globally
window._deleteCustomTemplate = function(id) {
  if (confirm('Delete this custom template?')) {
    deleteCustomTemplate(id);
    renderCustomTemplatesGallery();
  }
};

function escapeHtml(str) {
  if (!str) return '';
  if (typeof str !== 'string') return String(str);
  return str.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

/**
 * AstrahContent — Pro Templates Panel Controller
 * Handles: template gallery, live canvas previews, component browser, style picker
 */
import { PRO_TEMPLATES, TEMPLATE_CATEGORIES, COMPONENTS, VIDEO_STYLES } from '../data/pro-templates.js';
import { RENDER_FNS } from '../canvas/template-renderers.js';
import { state } from '../state.js';
import { getCustomTemplates } from '../api/template-generator.js';

// Track live preview animations
const previewAnimations = {};  // canvasId → rafId

// ─────────────────────────────────────────────────────────────────
// MAIN INIT
// ─────────────────────────────────────────────────────────────────
export function initProTemplatesPanel() {
  buildCategoryFilters();
  renderProTemplateGrid('all');
  initBuildTemplate();
}

// ─────────────────────────────────────────────────────────────────
// CATEGORY FILTERS
// ─────────────────────────────────────────────────────────────────
function buildCategoryFilters() {
  const container = document.getElementById('pro-template-filters');
  if (!container) return;
  container.innerHTML = TEMPLATE_CATEGORIES.map(cat => `
    <button class="pro-filter-btn ${cat.id === 'all' ? 'active' : ''}" data-cat="${cat.id}">
      <span class="pro-filter-icon">${cat.icon}</span>
      <span>${cat.label}</span>
      <span class="pro-filter-count">${cat.count}</span>
    </button>
  `).join('');

  container.querySelectorAll('.pro-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.pro-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      stopAllPreviews();
      renderProTemplateGrid(btn.dataset.cat);
    });
  });
}

// ─────────────────────────────────────────────────────────────────
// TEMPLATE GRID
// ─────────────────────────────────────────────────────────────────
export function renderProTemplateGrid(category = 'all') {
  const container = document.getElementById('pro-templates-grid');
  if (!container) return;

  stopAllPreviews();

  let templates = category === 'all'
    ? PRO_TEMPLATES
    : PRO_TEMPLATES.filter(t => t.category === category);

  // Prepend custom templates
  const customs = getCustomTemplates();
  if (category === 'all' && customs.length) {
    // Custom templates rendered separately (own section)
  }

  container.innerHTML = templates.map(t => buildTemplateCard(t)).join('');

  // Start animated previews after DOM is ready
  requestAnimationFrame(() => {
    templates.forEach(t => startMiniPreview(t));
  });
}

function buildTemplateCard(t) {
  return `
    <div class="pro-template-card" id="ptpl-${t.id}" data-id="${t.id}">
      <div class="ptpl-canvas-wrap">
        <canvas class="ptpl-canvas" id="canvas-${t.id}" width="480" height="270"></canvas>
        <div class="ptpl-canvas-overlay">
          <div class="ptpl-live-badge">● LIVE</div>
          <div class="ptpl-hover-actions">
            <button class="ptpl-action-btn ptpl-preview-btn" onclick="window.openTemplatePreview('${t.id}')" title="Full preview">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5,3 19,12 5,21"/></svg>
              Preview
            </button>
            <button class="ptpl-action-btn ptpl-components-btn" onclick="window.openComponentBrowser('${t.id}')" title="Browse components">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
              Components
            </button>
          </div>
        </div>
      </div>
      <div class="ptpl-info">
        <div class="ptpl-info-top">
          <div>
            <div class="ptpl-name">${t.emoji} ${t.name}</div>
            <div class="ptpl-creator">${t.creator}</div>
          </div>
          <div class="ptpl-duration-badge">${t.duration}</div>
        </div>
        <p class="ptpl-desc">${t.desc}</p>
        <div class="ptpl-tags">
          <span class="ptpl-tag ptpl-tag-pace">${t.pace.replace(/-/g, ' ')}</span>
          <span class="ptpl-tag ptpl-tag-cut">${t.cutStyle.replace(/-/g, ' ')}</span>
          ${t.tags.slice(0, 2).map(tag => `<span class="ptpl-tag">${tag}</span>`).join('')}
        </div>
        <div class="ptpl-actions">
          <button class="btn btn-primary ptpl-use-btn" onclick="window.useProTemplate('${t.id}')">
            Use Template →
          </button>
          <button class="btn btn-ghost ptpl-save-btn" onclick="window.saveProTemplate('${t.id}')" title="Save to My Templates">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────
// MINI PREVIEW ANIMATION
// ─────────────────────────────────────────────────────────────────
function startMiniPreview(tpl) {
  const canvas = document.getElementById(`canvas-${tpl.id}`);
  if (!canvas) return;

  const renderFn = RENDER_FNS[tpl.renderFn];
  if (!renderFn) {
    // Fallback: draw gradient static
    drawStaticFallback(canvas, tpl);
    return;
  }

  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  let startTime = null;
  let rafId;

  function frame(timestamp) {
    if (!startTime) startTime = timestamp;
    const t = ((timestamp - startTime) / 1000) % 8; // loop every 8s
    renderFn(ctx, W, H, t);
    rafId = requestAnimationFrame(frame);
    previewAnimations[tpl.id] = rafId;
  }

  rafId = requestAnimationFrame(frame);
  previewAnimations[tpl.id] = rafId;
}

function drawStaticFallback(canvas, tpl) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const g = ctx.createLinearGradient(0, 0, W, H);
  const [c1, c2] = tpl.grad.match(/#[0-9a-f]{6}/gi) || ['#a855f7', '#06b6d4'];
  g.addColorStop(0, c1); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = `bold 24px "Space Grotesk", sans-serif`;
  ctx.fillText(tpl.name, W / 2, H / 2);
}

function stopAllPreviews() {
  Object.values(previewAnimations).forEach(id => cancelAnimationFrame(id));
  Object.keys(previewAnimations).forEach(k => delete previewAnimations[k]);
}

// ─────────────────────────────────────────────────────────────────
// FULL PREVIEW MODAL
// ─────────────────────────────────────────────────────────────────
export function openTemplatePreview(id) {
  const tpl = PRO_TEMPLATES.find(t => t.id === id);
  if (!tpl) return;

  const modal = document.getElementById('template-preview-modal');
  if (!modal) return;

  // Populate modal
  document.getElementById('tpl-preview-title').textContent = `${tpl.emoji} ${tpl.name}`;
  document.getElementById('tpl-preview-creator').textContent = tpl.creator;
  document.getElementById('tpl-preview-desc').textContent = tpl.desc;

  // Tags
  const tagsEl = document.getElementById('tpl-preview-tags');
  tagsEl.innerHTML = [
    `<span class="ptpl-tag ptpl-tag-pace">${tpl.pace.replace(/-/g, ' ')}</span>`,
    `<span class="ptpl-tag ptpl-tag-cut">${tpl.cutStyle.replace(/-/g, ' ')}</span>`,
    ...tpl.tags.map(tag => `<span class="ptpl-tag">${tag}</span>`),
  ].join('');

  // Components list
  const compsEl = document.getElementById('tpl-preview-components');
  compsEl.innerHTML = tpl.components.map(cid => {
    const comp = Object.values(COMPONENTS).flat().find(c => c.id === cid);
    if (!comp) return '';
    return `
      <div class="tpl-preview-comp-item">
        <span class="tpl-preview-comp-icon">${comp.icon}</span>
        <span>${comp.name}</span>
      </div>
    `;
  }).join('');

  // Start big preview canvas
  const bigCanvas = document.getElementById('tpl-preview-canvas');
  if (bigCanvas) {
    bigCanvas.width = 1280; bigCanvas.height = 720;
    const renderFn = RENDER_FNS[tpl.renderFn];
    if (renderFn) {
      let startTime = null;
      function bigFrame(ts) {
        if (!startTime) startTime = ts;
        const t = ((ts - startTime) / 1000) % 12;
        const ctx = bigCanvas.getContext('2d');
        renderFn(ctx, bigCanvas.width, bigCanvas.height, t);
        previewAnimations['__big__'] = requestAnimationFrame(bigFrame);
      }
      cancelAnimationFrame(previewAnimations['__big__']);
      previewAnimations['__big__'] = requestAnimationFrame(bigFrame);
    } else {
      drawStaticFallback(bigCanvas, tpl);
    }
  }

  // Wire up "Use Template" in modal
  document.getElementById('tpl-preview-use-btn').onclick = () => {
    useProTemplate(id);
    closeTemplatePreview();
  };

  modal.classList.remove('hidden');
}

export function closeTemplatePreview() {
  const modal = document.getElementById('template-preview-modal');
  if (modal) modal.classList.add('hidden');
  cancelAnimationFrame(previewAnimations['__big__']);
  delete previewAnimations['__big__'];
}

// ─────────────────────────────────────────────────────────────────
// USE TEMPLATE
// ─────────────────────────────────────────────────────────────────
export function useProTemplate(id) {
  const tpl = PRO_TEMPLATES.find(t => t.id === id);
  if (!tpl) return;

  state.activeTemplate = tpl;

  // Map template style to form fields
  const topicInput = document.getElementById('video-topic');
  if (topicInput && !topicInput.value.trim()) {
    topicInput.value = tpl.preview?.headline || tpl.name;
  }

  // Set video style controls if they exist
  const paceSelect = document.getElementById('video-pace');
  if (paceSelect) paceSelect.value = tpl.pace;

  const cutSelect = document.getElementById('video-cut-style');
  if (cutSelect) cutSelect.value = tpl.cutStyle;

  const animStyleSelect = document.getElementById('anim-style');
  if (animStyleSelect) {
    const catMap = { viral: 'kinetic', educational: 'kinetic', coding: 'kinetic', data: 'data', science: 'science', history: 'kinetic', cinematic: 'kinetic', personal: 'kinetic', motivation: 'kinetic' };
    animStyleSelect.value = catMap[tpl.category] || 'kinetic';
  }

  // Store applied components in state
  state.appliedComponents = tpl.components;
  state.videoStyle = { pace: tpl.pace, cutStyle: tpl.cutStyle, colorMood: tpl.colors };

  // Navigate to create panel
  window.showPanel('create');

  // Show feedback toast
  showToast(`✦ ${tpl.name} applied! Now enter your topic and generate.`, '#a855f7');
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT BROWSER
// ─────────────────────────────────────────────────────────────────
export function openComponentBrowser(templateId) {
  const tpl = PRO_TEMPLATES.find(t => t.id === templateId);
  const modal = document.getElementById('component-browser-modal');
  if (!modal) return;

  // Set active template context
  document.getElementById('comp-browser-title').textContent =
    tpl ? `${tpl.emoji} ${tpl.name} — Components` : 'Component Browser';

  // Render all component categories
  const container = document.getElementById('comp-browser-body');
  const appliedIds = new Set(tpl?.components || state.appliedComponents || []);

  container.innerHTML = Object.entries(COMPONENTS).map(([category, comps]) => `
    <div class="comp-category">
      <div class="comp-category-title">${categoryLabel(category)}</div>
      <div class="comp-category-grid">
        ${comps.map(comp => `
          <div class="comp-item ${appliedIds.has(comp.id) ? 'active' : ''}" data-id="${comp.id}"
               onclick="window.toggleComponent('${comp.id}', this)">
            <div class="comp-item-header">
              <span class="comp-item-icon">${comp.icon}</span>
              <span class="comp-item-name">${comp.name}</span>
              ${appliedIds.has(comp.id) ? '<span class="comp-active-dot">✓</span>' : ''}
            </div>
            <p class="comp-item-desc">${comp.desc}</p>
            <div class="comp-item-tags">
              ${comp.tags.map(tag => `<span class="comp-tag">${tag}</span>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  modal.classList.remove('hidden');
}

function categoryLabel(cat) {
  const labels = { intros: '🎬 Intros & Openers', transitions: '⚡ Transitions', overlays: '📰 Overlays & Cards', effects: '✨ Visual Effects', typography: '🔤 Typography Styles' };
  return labels[cat] || cat;
}

export function closeComponentBrowser() {
  document.getElementById('component-browser-modal')?.classList.add('hidden');
}

export function toggleComponent(id, el) {
  if (!state.appliedComponents) state.appliedComponents = [];
  const idx = state.appliedComponents.indexOf(id);
  if (idx === -1) {
    state.appliedComponents.push(id);
    el.classList.add('active');
    el.querySelector('.comp-active-dot') || (el.querySelector('.comp-item-header').insertAdjacentHTML('beforeend', '<span class="comp-active-dot">✓</span>'));
  } else {
    state.appliedComponents.splice(idx, 1);
    el.classList.remove('active');
    el.querySelector('.comp-active-dot')?.remove();
  }
}

// ─────────────────────────────────────────────────────────────────
// BUILD A TEMPLATE (component forge)
// ─────────────────────────────────────────────────────────────────
function initBuildTemplate() {
  const btn = document.getElementById('btn-build-template');
  if (btn) btn.addEventListener('click', openBuildTemplateModal);

  const closeBtn = document.getElementById('btn-close-build-template');
  if (closeBtn) closeBtn.addEventListener('click', closeBuildTemplateModal);

  const createBtn = document.getElementById('btn-create-from-components');
  if (createBtn) createBtn.addEventListener('click', createTemplateFromComponents);

  // Style selectors
  buildStyleSelectors();
}

function buildStyleSelectors() {
  renderStyleGroup('pace-selector', VIDEO_STYLES.pace, 'pace');
  renderStyleGroup('cut-selector', VIDEO_STYLES.cutStyle, 'cut');
  renderStyleGroup('text-selector', VIDEO_STYLES.textStyle, 'text');
  renderStyleGroup('color-selector', VIDEO_STYLES.colorMood, 'color');
}

function renderStyleGroup(containerId, options, groupName) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = options.map(opt => `
    <div class="style-option" data-group="${groupName}" data-value="${opt.value}"
         onclick="window.selectStyleOption('${groupName}', '${opt.value}', this)">
      <div class="style-option-label">${opt.label}</div>
      <div class="style-option-desc">${opt.desc}</div>
    </div>
  `).join('');
  // Pre-select first option
  el.querySelector('.style-option')?.classList.add('selected');
}

const selectedStyles = { pace: '', cut: '', text: '', color: '' };

export function selectStyleOption(group, value, el) {
  selectedStyles[group] = value;
  el.closest('.style-selector-group').querySelectorAll('.style-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

export function openBuildTemplateModal() {
  document.getElementById('build-template-modal')?.classList.remove('hidden');
}

export function closeBuildTemplateModal() {
  document.getElementById('build-template-modal')?.classList.add('hidden');
}

function createTemplateFromComponents() {
  const name = document.getElementById('build-tpl-name')?.value?.trim() || 'My Custom Template';
  const category = document.getElementById('build-tpl-category')?.value || 'explainer';

  // Find the best matching pro template as base
  const base = PRO_TEMPLATES.find(t => t.pace === selectedStyles.pace) || PRO_TEMPLATES[0];

  const customTpl = {
    ...base,
    id: 'built-' + Date.now(),
    name,
    category,
    isCustom: true,
    pace: selectedStyles.pace || base.pace,
    cutStyle: selectedStyles.cut || base.cutStyle,
    appliedComponents: [...(state.appliedComponents || base.components)],
    createdAt: new Date().toISOString(),
  };

  // Save to localStorage
  const existing = JSON.parse(localStorage.getItem('astrah_built_templates') || '[]');
  existing.unshift(customTpl);
  localStorage.setItem('astrah_built_templates', JSON.stringify(existing));

  closeBuildTemplateModal();
  state.activeTemplate = customTpl;
  window.showPanel('create');
  showToast(`✦ "${name}" created and applied!`, '#06b6d4');
}

// ─────────────────────────────────────────────────────────────────
// TOAST NOTIFICATION
// ─────────────────────────────────────────────────────────────────
function showToast(message, color = '#a855f7') {
  let toast = document.getElementById('astrah-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'astrah-toast';
    document.body.appendChild(toast);
  }
  toast.style.cssText = `
    position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
    background:rgba(10,10,20,0.95); color:#fff;
    padding:14px 28px; border-radius:40px;
    border:1px solid ${color}40; box-shadow:0 0 30px ${color}30;
    font-size:0.9rem; font-weight:600; z-index:99999;
    animation:toastIn 0.3s ease; white-space:nowrap;
  `;
  toast.textContent = message;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.style.opacity = '0'; toast.style.transition = 'opacity 0.4s';
    setTimeout(() => { toast.style.opacity = ''; toast.style.transition = ''; }, 400);
  }, 3000);
}

// Save/bookmark a template
export function saveProTemplate(id) {
  const tpl = PRO_TEMPLATES.find(t => t.id === id);
  if (!tpl) return;
  const saved = JSON.parse(localStorage.getItem('astrah_saved_templates') || '[]');
  if (!saved.find(t => t.id === id)) {
    saved.push({ id, savedAt: Date.now() });
    localStorage.setItem('astrah_saved_templates', JSON.stringify(saved));
    showToast(`Saved "${tpl.name}" to your collection`, '#06b6d4');
  } else {
    showToast(`Already in your collection`, '#6b7280');
  }
}

// Expose to global scope for onclick handlers
window.openTemplatePreview   = openTemplatePreview;
window.closeTemplatePreview  = closeTemplatePreview;
window.openComponentBrowser  = openComponentBrowser;
window.closeComponentBrowser = closeComponentBrowser;
window.toggleComponent       = toggleComponent;
window.useProTemplate        = useProTemplate;
window.saveProTemplate       = saveProTemplate;
window.selectStyleOption     = selectStyleOption;
window.openBuildTemplateModal  = openBuildTemplateModal;
window.closeBuildTemplateModal = closeBuildTemplateModal;

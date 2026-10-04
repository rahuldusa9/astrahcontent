/**
 * AstrahContent — Landing Page UI Controller
 */
import { TEMPLATES } from '../data/templates.js';

export function initLandingPage() {
  renderLandingTemplates('all');
  initCategoryFilters();
  initScrollObservers();
  initNavbarScroll();
  initSmoothScroll();
}

export function renderLandingTemplates(category = 'all') {
  const container = document.getElementById('templates-grid');
  if (!container) return;

  const filtered = category === 'all'
    ? TEMPLATES
    : TEMPLATES.filter(t => t.category === category);

  container.innerHTML = filtered.map(t => `
    <div class="template-card reveal visible" id="tpl-${t.id}">
      <div class="template-thumb" style="background:${t.grad};">
        <span class="template-emoji">${t.emoji}</span>
        <div class="template-thumb-overlay">
          <a href="studio.html?template=${encodeURIComponent(t.id)}" class="template-thumb-play" title="Open in Studio">▶</a>
        </div>
      </div>
      <div class="template-body">
        <div class="template-body-top">
          <span class="template-name">${escapeHtml(t.name)}</span>
          <span class="template-duration">${t.duration}</span>
        </div>
        <p class="template-desc">${escapeHtml(t.desc)}</p>
        <div class="template-footer">
          <span class="template-tag">${t.category}</span>
          <a href="studio.html?template=${encodeURIComponent(t.id)}" class="btn btn-primary btn-sm">Use →</a>
        </div>
      </div>
    </div>
  `).join('');
}

export function initCategoryFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-cat') || 'all';
      renderLandingTemplates(cat);
    });
  });
}

export function initScrollObservers() {
  const elements = document.querySelectorAll('.feature-card, .pricing-card, .step-item');
  elements.forEach(el => el.classList.add('reveal'));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

export function initNavbarScroll() {
  const nav = document.getElementById('main-nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      nav.style.background = 'rgba(7, 7, 17, 0.95)';
      nav.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
    } else {
      nav.style.background = 'rgba(7, 7, 17, 0.7)';
      nav.style.boxShadow = 'none';
    }
  }, { passive: true });
}

export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const targetId = a.getAttribute('href');
      if (targetId && targetId !== '#') {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
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

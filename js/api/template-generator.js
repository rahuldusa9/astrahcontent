/**
 * AstrahContent — AI-Powered Custom Template Generator
 * Uses NVIDIA Nemotron (via OpenRouter) to create full template configurations
 * from a natural language description.
 */
import { getApiKey, OPENROUTER_MODEL, OPENROUTER_URL } from '../config.js';

/**
 * Generate a complete custom template via AI.
 * @param {string} description  Natural-language description of the desired template
 * @param {object} [options]    Optional overrides (targetDuration, targetCategory, etc.)
 * @returns {Promise<object>}   A fully-formed template object ready to inject into the catalog
 */
export async function generateCustomTemplate(description, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Go to Settings to add your OpenRouter key.');
  }

  const systemPrompt = `You are a world-class motion-graphics template designer for AstrahContent, an educational video platform that uses HyperFrames rendering engine.

Your job is to design creative, visually stunning video templates based on user descriptions. You understand color theory, animation choreography, typography, and educational pedagogy.

You always return valid JSON and nothing else.`;

  const userPrompt = `Design a custom educational video template based on this description:

"${description}"

${options.targetDuration ? `Target Duration: ${options.targetDuration} seconds` : ''}
${options.targetCategory ? `Category hint: ${options.targetCategory}` : ''}

Return ONLY a valid JSON object with this exact structure (no markdown, no commentary):
{
  "name": "Creative template name (2-4 words, catchy and descriptive)",
  "category": "one of: science, math, history, data, coding, explainer, creative",
  "desc": "1-2 sentence description of what this template does and who it's for",
  "duration": "60s",
  "emoji": "A single relevant emoji",
  "gradientColors": ["#hex1", "#hex2"],
  "colorScheme": {
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "background": "#hex (dark)",
    "text": "#hex (light)"
  },
  "animationStyle": "one of: kinetic, science, math, history, data",
  "typography": {
    "headingFont": "font name suggestion",
    "bodyFont": "font name suggestion",
    "titleEffect": "one of: glow, neon, gradient-fill, typewriter, glitch, holographic"
  },
  "scenes": [
    {
      "name": "Scene name",
      "duration": 10,
      "visualConcept": "What the viewer sees — be specific and cinematic",
      "animations": ["animation-name-1", "animation-name-2"],
      "transitionIn": "one of: fade, slide-left, zoom-in, wipe, dissolve, morph",
      "transitionOut": "one of: fade, slide-right, zoom-out, wipe, dissolve, morph",
      "mood": "emotional tone for this scene"
    }
  ],
  "musicMood": "Overall music mood description",
  "particleEffect": "one of: stars, bubbles, sparks, fireflies, snow, matrix, molecules, none",
  "backgroundStyle": "one of: gradient-orbs, grid-lines, geometric-shapes, nebula, circuit-board, minimal-dark",
  "pacing": "one of: slow-cinematic, medium-educational, fast-energetic, dynamic-mixed",
  "hyperframesConfig": {
    "fps": 60,
    "resolution": "1920x1080",
    "renderNotes": "Technical notes for the HyperFrames engine"
  }
}

Generate 4-6 scenes that are creative and specific to the description. Make the color choices harmonious and visually striking. The template should feel premium and unique.`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://astrahcontent.ai',
      'X-Title': 'AstrahContent Template Generator',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      temperature: 0.9,   // Higher creativity for template design
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${errBody}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  // Extract JSON block
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No valid template JSON returned by AI');

  const raw = JSON.parse(jsonMatch[0]);

  // Normalize into a TEMPLATES-compatible object with AI-enriched extras
  return normalizeAITemplate(raw);
}

/**
 * Normalize raw AI output into a template object compatible with
 * our existing TEMPLATES array format + extended fields.
 */
function normalizeAITemplate(raw) {
  const id = 'custom-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const [g1, g2] = raw.gradientColors || ['#a855f7', '#06b6d4'];

  return {
    // Standard TEMPLATES fields
    id,
    category:  raw.category || 'creative',
    name:      raw.name || 'Custom Template',
    desc:      raw.desc || 'AI-generated custom template',
    duration:  raw.duration || '60s',
    emoji:     raw.emoji || '✨',
    grad:      `linear-gradient(135deg, ${g1}, ${g2})`,
    style:     raw.animationStyle || 'kinetic',
    isCustom:  true,
    createdAt: new Date().toISOString(),

    // AI-enriched extended fields
    colorScheme:   raw.colorScheme || null,
    typography:    raw.typography || null,
    scenes:        raw.scenes || [],
    musicMood:     raw.musicMood || 'Inspiring',
    particleEffect:  raw.particleEffect || 'stars',
    backgroundStyle: raw.backgroundStyle || 'gradient-orbs',
    pacing:          raw.pacing || 'medium-educational',
    hyperframesConfig: raw.hyperframesConfig || { fps: 60, resolution: '1920x1080', renderNotes: '' },
  };
}

// ── Local persistence for custom templates ──────────────────────

const STORAGE_KEY = 'astrah_custom_templates';

/** Retrieve all saved custom templates from localStorage. */
export function getCustomTemplates() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/** Save a custom template to localStorage. */
export function saveCustomTemplate(template) {
  const existing = getCustomTemplates();
  existing.unshift(template);       // newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/** Delete a custom template by ID. */
export function deleteCustomTemplate(id) {
  const remaining = getCustomTemplates().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}

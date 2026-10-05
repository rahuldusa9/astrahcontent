/**
 * AstrahContent — OpenRouter / NVIDIA Nemotron API Client
 *
 * The LLM receives ALL video style parameters and generates a full
 * director-level script: scene choreography, text animations, cut timings,
 * overlay specs, and color palette — all matching the exact style the user chose.
 */
import { getApiKey, OPENROUTER_MODEL, OPENROUTER_URL } from '../config.js';
import { state } from '../state.js';

// ── Style vocabulary the LLM understands ──────────────────────────────────

const PACE_DESCRIPTIONS = {
  'ultra-fast':  'Ultra-fast TikTok/Reels pace. Cuts every 1-2 seconds. Maximum energy. No scene stays on screen longer than 2s. Text appears and disappears instantly. Designed to keep thumb from scrolling.',
  'rapid-fire':  'Rapid-fire information density. Cuts every 2-3 seconds. Think Fireship YouTube. Pack maximum info per second. Code, diagrams, and text alternate in quick succession.',
  'punchy':      'Punchy YouTube standard. Cuts every 3-5 seconds. High energy but breathable. Each scene has one clear visual beat. Engaging but not exhausting.',
  'moderate':    'Balanced educational pacing. Scenes last 8-15 seconds. Enough time to read and absorb diagrams. Standard explainer video rhythm.',
  'cinematic':   'Slow, dramatic, cinematic. Scenes breathe for 15-25 seconds. Let moments land. Camera dwells on important concepts. Like a Netflix documentary.',
  'atmospheric': 'Atmospheric and immersive. Slow reveals. Environmental storytelling. Music-driven mood. Like a nature documentary or art film.',
};

const CUT_DESCRIPTIONS = {
  'smash-cuts':  'Hard smash cuts. 1-frame flash of white/color between every scene. Aggressive, punchy, attention-grabbing. Like a music video.',
  'whip-pan':    'Whip-pan transitions. Horizontal motion blur between scenes. Energy never dies. Camera always moving.',
  'zoom-blend':  'Zoom blur transitions. Radial zoom into or out of scenes. Creates cinematic depth between ideas.',
  'morph':       'Shape morph transitions. Geometric shapes (circles, hexagons, triangles) morph between scenes. Clean and premium.',
  'glitch':      'Glitch transitions. RGB channel split + digital noise between scenes. Cyberpunk/tech aesthetic.',
  'dissolve':    'Smooth cross-dissolve. Elegant, classic. One scene gently fades into the next. Professional and timeless.',
};

const TEXT_DESCRIPTIONS = {
  'slam':        'Text slam animations. Bold words crash in from top/bottom/edges. Impact on screen like a punch. Every key word gets its own dramatic entrance.',
  'typewriter':  'Typewriter reveal. Text types on character by character. Feels live and coded. Great for code, stats, and quotes.',
  'kinetic':     'Kinetic typography. Each word flies in on a unique path and angle, then settles. Dynamic and modern.',
  'fade-up':     'Elegant fade-up. Text fades in while drifting up slightly. Clean, professional, never distracting.',
  'glitch':      'Glitch text reveal. RGB split scramble that resolves into clean text. Techy, edgy, and modern.',
  'outline':     'Outline-to-fill animation. Text starts as a transparent outline, then fills with color. Premium and distinctive.',
};

const COLOR_DESCRIPTIONS = {
  'dark-neon':    'Dark background (#040408) with vibrant neon accents — electric purple (#a855f7) and cyan (#06b6d4). High contrast, premium feel.',
  'fire':         'Pure black background with fire tones — amber (#f59e0b), orange (#f97316), and red (#ef4444). Hot, urgent, powerful.',
  'ocean':        'Deep dark blue (#020c14) with ocean tones — cyan (#0ea5e9), teal (#0d9488), and aqua (#38bdf8). Calm but rich.',
  'matrix':       'Pure black (#000d00) with terminal green (#22c55e) and bright green (#4ade80). Hacker/code aesthetic.',
  'cinematic':    'Dark charcoal (#0a0806) with warm cinema tones — gold (#d4a574), sepia (#a8835c), and cream (#f5f0e8). Film grade.',
  'clean-white':  'Near-white (#f8fafc) background with one strong accent color (#e11d48 red or #2563eb blue). Bold, editorial, minimal.',
};

// ── Build the full director prompt ────────────────────────────────────────

function buildDirectorPrompt(topic, options) {
  const {
    duration,
    animStyle,
    pace,
    cutStyle,
    textStyle,
    colorMood,
    palette,
    template,
    appliedComponents,
  } = options;

  const sceneCount = Math.max(3, Math.round(duration / (
    pace === 'ultra-fast' ? 6 :
    pace === 'rapid-fire' ? 8 :
    pace === 'punchy'     ? 10 :
    pace === 'moderate'   ? 14 :
    pace === 'cinematic'  ? 20 : 15
  )));

  const paceDesc   = PACE_DESCRIPTIONS[pace]    || pace;
  const cutDesc    = CUT_DESCRIPTIONS[cutStyle]  || cutStyle;
  const textDesc   = TEXT_DESCRIPTIONS[textStyle] || textStyle;
  const colorDesc  = COLOR_DESCRIPTIONS[colorMood] || colorMood;

  const templateContext = template
    ? `\nINSPIRATION TEMPLATE: "${template.name}" (${template.creator || ''}) — ${template.desc || ''}`
    : '';

  const componentContext = appliedComponents && appliedComponents.length > 0
    ? `\nAPPLIED COMPONENTS: ${appliedComponents.join(', ')}`
    : '';

  return `You are the world's best motion graphics director and video editor, with 20 years of experience creating viral educational content. You think like a combination of MrBeast's editor, Kurzgesagt's creative director, and Veritasium's storyteller.

Your job: write a COMPLETE, DIRECTOR-LEVEL video production script for this exact topic and style. Every single detail must match the style parameters precisely. The LLM output is fed DIRECTLY to the HyperFrames animation engine which renders it to video.

═══════════════════════════════════════════════
PRODUCTION BRIEF
═══════════════════════════════════════════════
Topic:          ${topic}
Total Duration: ${duration} seconds
Scene Count:    ${sceneCount} scenes
Animation Base: ${animStyle}${templateContext}${componentContext}

PACING RULE — MANDATORY:
${paceDesc}

TRANSITION RULE — MANDATORY:
${cutDesc}

TEXT ANIMATION RULE — MANDATORY:
${textDesc}

COLOR SYSTEM — MANDATORY:
${colorDesc}

═══════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════
Generate a complete video production JSON. Every scene must:
1. Have narration that matches the pace (short punchy sentences for fast, longer for cinematic)
2. Specify EXACTLY which text animations to use (matching the text style above)
3. Specify EXACTLY how each transition happens (matching the cut style above)
4. Specify the visual choreography step-by-step (what appears, when, how)
5. Include overlay specs (lower thirds, stat cards, annotations if applicable)
6. Include timing in milliseconds for key animation beats

Return ONLY valid JSON — no markdown fences, no explanations before or after:

{
  "title": "Compelling video title that matches the style",
  "hook": "First 3 seconds — the exact opening hook that stops scrolling",
  "totalDuration": ${duration},
  "pace": "${pace}",
  "cutStyle": "${cutStyle}",
  "textStyle": "${textStyle}",
  "colorMood": "${colorMood}",
  "colorPalette": {
    "background": "#hex",
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "text": "#hex"
  },
  "musicMood": "Specific music direction (e.g. 'Aggressive hip-hop beat at 140BPM' or 'Slow ambient piano')",
  "musicBPM": 120,
  "scenes": [
    {
      "id": 1,
      "name": "Scene name",
      "type": "hook|intro|concept|example|data|transition|climax|outro",
      "startTime": 0,
      "duration": 8,
      "paceNote": "How fast this specific scene feels and why",
      "narration": "Exact narration — match the pace, use short sentences for fast pacing",
      "visualDescription": "Detailed visual description — what is on screen, where, how large",
      "textOnScreen": [
        {
          "text": "EXACT TEXT",
          "animation": "slam|typewriter|kinetic|fade-up|glitch|outline",
          "timing": "0ms",
          "size": "hero|large|medium|small|caption",
          "position": "center|top|bottom|left|right|lower-third",
          "color": "#hex",
          "emphasis": true
        }
      ],
      "transition": {
        "type": "smash-cut|whip-pan|zoom-blur|morph|glitch|dissolve",
        "duration": "200ms",
        "direction": "left|right|up|down|in|out",
        "flashColor": "#hex or null"
      },
      "animations": [
        "step-by-step list of HyperFrames animation calls in order"
      ],
      "overlays": [
        {
          "type": "lower-third|stat-card|quote|annotation|ticker|chapter-title",
          "content": "Text content",
          "timing": "2000ms",
          "duration": "3000ms"
        }
      ],
      "cameraMove": "zoom-in|zoom-out|pan-left|pan-right|static|tilt-up|tilt-down",
      "keyBeat": "The single most impactful visual moment in this scene",
      "keyMessage": "Core takeaway"
    }
  ],
  "hyperframesDirectorNotes": "Technical rendering notes, special effects, post-processing",
  "editorNotes": "Why this structure works for the chosen style — brief edit rationale"
}

Generate exactly ${sceneCount} scenes. Make it so good that a viewer watches to the end. Every detail must match the style parameters above.`;
}

// ── Main API call ──────────────────────────────────────────────────────────

/**
 * Call the Nemotron model to generate a full director-level video script.
 * @param {string} topic
 * @param {string} animStyle  - animation style from the dropdown
 * @param {number|string} duration - seconds
 * @param {object} styleOptions - pace, cutStyle, textStyle, colorMood, template, components
 * @returns {Promise<object>} Parsed script JSON
 */
export async function callNemotronAPI(topic, animStyle, duration, styleOptions = {}) {
  // Merge with global state so style dropdowns are always included
  const options = {
    duration:          Number(duration) || 60,
    animStyle,
    pace:              styleOptions.pace        || state.videoStyle?.pace      || 'punchy',
    cutStyle:          styleOptions.cutStyle    || state.videoStyle?.cutStyle  || 'zoom-blend',
    textStyle:         styleOptions.textStyle   || state.videoStyle?.textStyle || 'kinetic',
    colorMood:         styleOptions.colorMood   || state.videoStyle?.colorMood || 'dark-neon',
    palette:           styleOptions.palette     || state.selectedPalette       || 'cosmic',
    template:          styleOptions.template    || state.activeTemplate        || null,
    appliedComponents: styleOptions.components  || state.appliedComponents     || [],
  };

  const systemPrompt =
    'You are an elite motion graphics director and video editor. ' +
    'You produce director-level video scripts that are fed directly to animation engines. ' +
    'You always return valid JSON only — no prose, no markdown code fences. ' +
    'Your scripts are cinematic, precise, and optimised for maximum audience retention.';

  const userPrompt = buildDirectorPrompt(topic, options);

  const apiKey = getApiKey();
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'HTTP-Referer':  'https://astrahcontent.ai',
      'X-Title':       'AstrahContent',
    },
    body: JSON.stringify({
      model:       OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      temperature: 0.85,
      max_tokens:  4096,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${errBody}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  // Extract JSON — model may still occasionally add backtick fences
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in model response');

  let parsed;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    // Try to fix common JSON issues (trailing commas, etc.)
    const fixed = jsonMatch[0]
      .replace(/,(\s*[}\]])/g, '$1')   // trailing commas
      .replace(/\n/g, ' ');
    parsed = JSON.parse(fixed);
  }

  return parsed;
}

// ── Offline fallback — used when API key is missing or API is down ─────────

export function generateFallbackScript(topic, animStyle, duration, styleOptions = {}) {
  const pace      = styleOptions.pace     || state.videoStyle?.pace     || 'punchy';
  const cutStyle  = styleOptions.cutStyle || state.videoStyle?.cutStyle || 'zoom-blend';
  const textStyle = styleOptions.textStyle|| state.videoStyle?.textStyle|| 'kinetic';
  const colorMood = styleOptions.colorMood|| state.videoStyle?.colorMood|| 'dark-neon';

  const sceneCount = Math.max(3, Math.round(duration / 12));

  const colorPalettes = {
    'dark-neon':   { background: '#040408', primary: '#a855f7', secondary: '#06b6d4', accent: '#c084fc', text: '#f0f0ff' },
    'fire':        { background: '#080300', primary: '#f59e0b', secondary: '#ef4444', accent: '#fde68a', text: '#ffffff' },
    'ocean':       { background: '#020c14', primary: '#0ea5e9', secondary: '#0d9488', accent: '#38bdf8', text: '#e0f2fe' },
    'matrix':      { background: '#000d00', primary: '#22c55e', secondary: '#4ade80', accent: '#86efac', text: '#dcfce7' },
    'cinematic':   { background: '#0a0806', primary: '#d4a574', secondary: '#a8835c', accent: '#f5f0e8', text: '#fef9f0' },
    'clean-white': { background: '#f8fafc', primary: '#e11d48', secondary: '#2563eb', accent: '#f43f5e', text: '#0f172a' },
  };

  const palette = colorPalettes[colorMood] || colorPalettes['dark-neon'];

  const sceneTemplates = [
    { type: 'hook',    name: 'The Hook',           narration: `What if everything you knew about ${topic} was wrong? Watch this.` },
    { type: 'intro',   name: 'Introduction',       narration: `${topic} is one of the most fascinating concepts in the world. Let me show you why.` },
    { type: 'concept', name: 'Core Concept',       narration: `At its core, ${topic} works like this — and once you see it, you can't unsee it.` },
    { type: 'example', name: 'Real Example',       narration: `Here's a real-world example that makes this crystal clear.` },
    { type: 'data',    name: 'The Numbers',        narration: `The data doesn't lie. Look at these statistics about ${topic}.` },
    { type: 'climax',  name: 'The Big Reveal',     narration: `This is the part that changes everything. Pay attention.` },
    { type: 'outro',   name: 'Summary & CTA',      narration: `So that's ${topic} — broken down, animated, and made real. What's your biggest takeaway?` },
  ];

  const scenes = Array.from({ length: sceneCount }, (_, i) => {
    const tmpl = sceneTemplates[Math.min(i, sceneTemplates.length - 1)];
    return {
      id:         i + 1,
      name:       tmpl.name,
      type:       tmpl.type,
      startTime:  Math.round((i / sceneCount) * duration),
      duration:   Math.round(duration / sceneCount),
      paceNote:   `${pace} — scene ${i + 1} of ${sceneCount}`,
      narration:  tmpl.narration,
      visualDescription: `${textStyle} text animation with ${colorMood} color scheme. ${cutStyle} transition into next scene.`,
      textOnScreen: [
        { text: tmpl.name.toUpperCase(), animation: textStyle, timing: '0ms', size: 'hero', position: 'center', color: palette.primary, emphasis: true },
      ],
      transition: { type: cutStyle, duration: '300ms', direction: 'right', flashColor: null },
      animations: [`${textStyle}-reveal`, `${cutStyle}-transition`, 'particle-ambient'],
      overlays: [],
      cameraMove: i === 0 ? 'zoom-in' : 'static',
      keyBeat:    `${textStyle} reveal of scene title at 0ms`,
      keyMessage: `Key insight about ${topic}`,
    };
  });

  return {
    title:            `${topic} — ${pace.replace('-', ' ')} breakdown`,
    hook:             `"What if you could understand ${topic} in ${duration} seconds?"`,
    totalDuration:    duration,
    pace,
    cutStyle,
    textStyle,
    colorMood,
    colorPalette:     palette,
    musicMood:        pace === 'ultra-fast' || pace === 'rapid-fire' ? 'High-energy electronic at 130-140BPM' : 'Ambient cinematic score',
    musicBPM:         pace === 'ultra-fast' ? 140 : pace === 'punchy' ? 120 : 90,
    scenes,
    hyperframesDirectorNotes: `Render at 1920×1080 60fps. Use ${colorMood} palette. Apply ${textStyle} text system globally. ${cutStyle} between all scenes.`,
    editorNotes: `${pace} pacing with ${cutStyle} cuts optimised for ${duration}s attention span.`,
  };
}

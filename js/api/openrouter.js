/**
 * AstrahContent — OpenRouter / NVIDIA Nemotron API Client
 */
import { getApiKey, OPENROUTER_MODEL, OPENROUTER_URL } from '../config.js';

/**
 * Call the Nemotron model to generate a full video script & storyboard.
 * @param {string} topic
 * @param {string} style
 * @param {number} duration  seconds
 * @returns {Promise<object>} Parsed script JSON
 */
export async function callNemotronAPI(topic, style, duration) {
  const systemPrompt =
    'You are an expert educational video scriptwriter and HyperFrames motion-graphics director. ' +
    'You create stunning, engaging educational video scripts that are cinematic and precise.';

  const sceneCount = Math.max(3, Math.round(duration / 12));

  const userPrompt = `Create a detailed educational video script:

Topic:    ${topic}
Style:    ${style}
Duration: ${duration} seconds

Return ONLY a valid JSON object with this exact shape (no markdown, no prose around it):
{
  "title": "Video title",
  "totalDuration": ${duration},
  "scenes": [
    {
      "id": 1,
      "name": "Scene name",
      "startTime": 0,
      "duration": 10,
      "narration": "What the narrator says",
      "visualDescription": "What the HyperFrames animation shows",
      "animations": ["fade-in title", "particle burst"],
      "keyMessage": "Core takeaway"
    }
  ],
  "hyperframesNotes": "Technical notes for the HyperFrames composition",
  "colorScheme": ["#hex1", "#hex2"],
  "musicMood": "Inspiring"
}

Generate exactly ${sceneCount} scenes. Be specific and cinematic.`;

  const apiKey = getApiKey();
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://astrahcontent.ai',
      'X-Title': 'AstrahContent',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      temperature: 0.8,
      max_tokens:  2048,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`OpenRouter ${response.status}: ${errBody}`);
  }

  const data    = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';

  // Extract JSON block — model may wrap in ```json ... ```
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found in model response');

  return JSON.parse(jsonMatch[0]);
}

/**
 * Offline fallback — deterministic script when the API is unavailable.
 */
export function generateFallbackScript(topic, style, duration) {
  const sceneCount = Math.max(3, Math.round(duration / 15));
  const templates  = [
    {
      name: 'Introduction',
      narration: `Welcome to this exploration of ${topic}. Today we'll break it down with stunning animations.`,
      visual: 'Cinematic title reveal with particle effects and glowing text.',
      animations: ['title-fade-in', 'particle-burst', 'glow-pulse'],
    },
    {
      name: 'Core Concept',
      narration: `Let's start with the fundamentals. ${topic} is a fascinating subject that shapes our world.`,
      visual: 'Animated diagram with labelled components fading in sequentially.',
      animations: ['diagram-reveal', 'label-typewriter', 'arrow-draw'],
    },
    {
      name: 'Deep Dive',
      narration: `Now let's explore the mechanisms in detail — notice how each part interacts.`,
      visual: 'Zoomed-in flow animation with connecting lines and highlight pulses.',
      animations: ['zoom-in', 'flow-lines', 'highlight-pulse'],
    },
    {
      name: 'Real World Application',
      narration: `Where do we see this in real life? Applications are everywhere.`,
      visual: 'Split-screen with animated icons showing multiple contexts.',
      animations: ['split-screen', 'icon-pop', 'counter-up'],
    },
    {
      name: 'Summary',
      narration: `Let's recap what we've learned about ${topic}.`,
      visual: 'Elegant recap slide with bullet points animating in one by one.',
      animations: ['bullet-cascade', 'checkmark-draw', 'fade-out'],
    },
  ];

  const scenes = Array.from({ length: sceneCount }, (_, i) => {
    const tmpl = templates[Math.min(i, templates.length - 1)];
    const startTime = Math.round((i / sceneCount) * duration);
    return {
      id:                 i + 1,
      name:               tmpl.name,
      startTime,
      duration:           Math.round(duration / sceneCount),
      narration:          tmpl.narration,
      visualDescription:  tmpl.visual,
      animations:         tmpl.animations,
      keyMessage:         `Key insight ${i + 1} about ${topic}`,
    };
  });

  return {
    title:            `${topic} — An Animated Explainer`,
    totalDuration:    duration,
    scenes,
    hyperframesNotes: 'GSAP for all animations. 1920×1080, 30 FPS. Dark bg with purple/cyan gradient accents.',
    colorScheme:      ['#a855f7', '#06b6d4', '#0a0a1a'],
    musicMood:        'Inspiring and educational',
  };
}

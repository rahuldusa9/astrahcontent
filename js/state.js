/**
 * AstrahContent — Shared Application State
 * Single source of truth. Import and mutate directly; no framework needed at this scale.
 */
export const state = {
  // Playback
  isPlaying:       false,
  playbackTime:    0,
  videoDuration:   60,
  playbackInterval: null,

  // Creation
  selectedPalette:    'cosmic',
  generatedScript:    null,   // { title, totalDuration, scenes[], ... }
  activeTemplate:     null,   // PRO_TEMPLATES entry or custom

  // Video Style (from style pickers)
  videoStyle: {
    pace:      'punchy',
    cutStyle:  'zoom-blend',
    textStyle: 'kinetic',
    colorMood: 'dark-neon',
  },

  // Components
  appliedComponents:  [],     // array of component IDs from COMPONENTS registry

  // Full AI Mode
  aiGeneratedCode:  null,   // raw JS string from LLM
  aiGeneratedMeta:  null,   // { topic, pace, cutStyle, ... generatedAt }

  // UI
  currentPanel:    'create',
};


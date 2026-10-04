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
  selectedPalette:  'cosmic',
  generatedScript:  null,   // { title, totalDuration, scenes[], ... }
  activeTemplate:   null,   // TEMPLATES entry

  // UI
  currentPanel:    'create',
};

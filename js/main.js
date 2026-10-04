/**
 * AstrahContent — Landing Page Main Entry Point
 */
import { initHeroCanvases } from './canvas/hero.js';
import { initLandingPage } from './ui/landing.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize landing page UI
  initLandingPage();

  // Initialize interactive canvas previews in hero section
  initHeroCanvases();

  console.log('🚀 AstrahContent Landing Page initialized with HyperFrames v0.8 & Nemotron AI');
});

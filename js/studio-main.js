/**
 * AstrahContent — Studio Application Main Entry Point
 */
import { initStudio } from './ui/studio.js';
import { initProTemplatesPanel } from './ui/pro-templates.js';

document.addEventListener('DOMContentLoaded', () => {
  initStudio();
  initProTemplatesPanel();
  console.log('🎬 AstrahContent Video Studio initialized | HyperFrames Engine Ready');
});

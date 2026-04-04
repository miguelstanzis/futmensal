import { initNav } from './nav.js';
import { initHero } from './hero.js';
import { initUniformes } from './uniformes.js';
import { initGaleria } from './galeria.js';
import { initEstatisticas, renderAllYears } from './estatisticas.js';
import { initScrollReveal } from './animations.js';

async function loadJSON(path) {
  try {
    const res = await fetch(path);
    return await res.json();
  } catch {
    console.warn(`Failed to load ${path}`);
    return null;
  }
}

async function init() {
  // Load data
  const [statsData, galleryData] = await Promise.all([
    loadJSON('./data/stats.json'),
    loadJSON('./data/gallery.json'),
  ]);

  // Init modules
  initNav();
  initHero();
  initUniformes();
  initGaleria(galleryData);

  if (statsData) {
    renderAllYears(statsData);
    initEstatisticas(statsData);
  }

  initScrollReveal();
}

document.addEventListener('DOMContentLoaded', init);

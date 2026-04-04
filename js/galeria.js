const VISIBLE_LIMIT = 6;
let expanded = false;

export function initGaleria(galleryData) {
  if (!galleryData) return;

  renderGallery(galleryData);
  initFilters(galleryData);
  initLightbox(galleryData);
  initShowMore(galleryData);
}

function renderGallery(data, filter = 'todos') {
  const grid = document.querySelector('.galeria__grid');
  if (!grid) return;

  const fotos = filter === 'todos'
    ? data.fotos
    : data.fotos.filter(f => f.categoria === filter);

  grid.innerHTML = fotos.map((foto, i) => {
    const encodedSrc = foto.src.split('/').map(s => encodeURIComponent(s)).join('/');
    const hidden = !expanded && i >= VISIBLE_LIMIT ? 'galeria__item--hidden' : '';
    return `
    <div class="galeria__item ${hidden}" data-categoria="${foto.categoria}" data-index="${i}" style="transition-delay: ${Math.min(i * 50, 400)}ms">
      <img src="${encodedSrc}" alt="${foto.titulo}" loading="lazy">
      <div class="galeria__item-overlay">
        <div class="galeria__item-title">${foto.titulo}</div>
        <div class="galeria__item-date">${foto.data}</div>
      </div>
    </div>
  `;
  }).join('');

  // Update show-more button visibility
  const btn = document.querySelector('.galeria__show-more');
  if (btn) {
    btn.style.display = fotos.length > VISIBLE_LIMIT && !expanded ? '' : 'none';
  }

  // Re-observe for scroll reveal
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  grid.querySelectorAll('.galeria__item:not(.galeria__item--hidden)').forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = `opacity var(--duration-normal) var(--ease-out) ${item.style.transitionDelay}, transform var(--duration-normal) var(--ease-out) ${item.style.transitionDelay}`;
    observer.observe(item);
  });
}

function initShowMore(data) {
  const btn = document.querySelector('.galeria__show-more');
  if (!btn) return;

  btn.addEventListener('click', () => {
    expanded = true;
    const activeFilter = document.querySelector('.galeria__filters .filter-pill.active')?.dataset.filter || 'todos';
    renderGallery(data, activeFilter);
    initLightbox(data);
  });
}

function initFilters(data) {
  const pills = document.querySelectorAll('.filter-pill');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      expanded = false;
      renderGallery(data, pill.dataset.filter);
      initLightbox(data);
    });
  });
}

function initLightbox(data) {
  const lightbox = document.querySelector('.lightbox');
  const lightboxImg = lightbox?.querySelector('.lightbox__img');
  const lightboxCaption = lightbox?.querySelector('.lightbox__caption');
  const closeBtn = lightbox?.querySelector('.lightbox__close');
  const prevBtn = lightbox?.querySelector('.lightbox__nav--prev');
  const nextBtn = lightbox?.querySelector('.lightbox__nav--next');

  if (!lightbox) return;

  let currentItems = [];
  let currentIndex = 0;

  function open(src, title, items, index) {
    currentItems = items;
    currentIndex = index;
    lightboxImg.src = src;
    lightboxCaption.textContent = title;
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function navigate(dir) {
    currentIndex = (currentIndex + dir + currentItems.length) % currentItems.length;
    const item = currentItems[currentIndex];
    lightboxImg.src = item.querySelector('img').src;
    lightboxCaption.textContent = item.querySelector('.galeria__item-title')?.textContent || '';
  }

  document.querySelector('.galeria__grid')?.addEventListener('click', e => {
    const item = e.target.closest('.galeria__item');
    if (!item) return;
    const img = item.querySelector('img');
    const title = item.querySelector('.galeria__item-title')?.textContent || '';
    const items = [...document.querySelectorAll('.galeria__item')];
    const index = items.indexOf(item);
    open(img.src, title, items, index);
  });

  closeBtn?.addEventListener('click', close);
  lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) close();
  });
  prevBtn?.addEventListener('click', () => navigate(-1));
  nextBtn?.addEventListener('click', () => navigate(1));

  document.addEventListener('keydown', e => {
    if (!lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight') navigate(1);
  });
}

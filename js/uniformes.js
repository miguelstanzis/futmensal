export function initUniformes() {
  initKitThumbs();
}

function initKitThumbs() {
  const thumbs = document.querySelectorAll('.kit-thumb');
  const detail = document.querySelector('.kit-detail');
  const closeBtn = detail?.querySelector('.kit-detail__close');
  if (!detail || !thumbs.length) return;

  const titleEl = detail.querySelector('.kit-detail__title');
  const img = detail.querySelector('.kit-detail__img');

  let activeThumb = null;

  function openDetail(thumb) {
    const title = thumb.dataset.title || '';
    const front = thumb.dataset.front || '';

    titleEl.textContent = title;
    img.src = front;
    img.alt = title;

    thumbs.forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
    activeThumb = thumb;

    detail.style.display = '';
    detail.style.animation = 'none';
    detail.offsetHeight;
    detail.style.animation = '';

    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function closeDetail() {
    detail.style.display = 'none';
    thumbs.forEach(t => t.classList.remove('active'));
    activeThumb = null;
  }

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      if (activeThumb === thumb) {
        closeDetail();
      } else {
        openDetail(thumb);
      }
    });
  });

  closeBtn?.addEventListener('click', closeDetail);
}

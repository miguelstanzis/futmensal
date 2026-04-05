const INTERVAL = 3000;

export function initPatrocinadores() {
  const track = document.querySelector('.carousel__track');
  const dotsContainer = document.querySelector('.carousel__dots');
  if (!track) return;

  const slides = [...track.querySelectorAll('.carousel__slide')];
  const dots = dotsContainer ? [...dotsContainer.querySelectorAll('.carousel__dot')] : [];
  const count = slides.length;
  if (!count) return;

  let current = 0;
  let timer = null;
  let paused = false;
  let visible = false;

  const POSITIONS = ['left', 'center', 'right'];

  function layout() {
    slides.forEach((slide, i) => {
      // Remove all position classes
      slide.classList.remove(
        'carousel__slide--center',
        'carousel__slide--left',
        'carousel__slide--right',
        'carousel__slide--hidden'
      );

      // Calculate relative position
      let rel = (i - current + count) % count;
      if (count === 3) {
        // 3 items: 0=center, 1=right, 2=left
        if (rel === 0) slide.classList.add('carousel__slide--center');
        else if (rel === 1) slide.classList.add('carousel__slide--right');
        else slide.classList.add('carousel__slide--left');
      } else {
        // generic
        if (rel === 0) slide.classList.add('carousel__slide--center');
        else if (rel === 1) slide.classList.add('carousel__slide--right');
        else if (rel === count - 1) slide.classList.add('carousel__slide--left');
        else slide.classList.add('carousel__slide--hidden');
      }
    });

    dots.forEach((dot, i) => dot.classList.toggle('active', i === current));
  }

  function advance() {
    if (paused || !visible) return;
    current = (current + 1) % count;
    layout();
    scheduleNext();
  }

  function goTo(index) {
    current = index;
    layout();
    scheduleNext();
  }

  function scheduleNext() {
    clearTimeout(timer);
    if (visible && !paused) {
      timer = setTimeout(advance, INTERVAL);
    }
  }

  function stop() {
    clearTimeout(timer);
  }

  // Hover pauses
  track.addEventListener('mouseenter', () => { paused = true; stop(); });
  track.addEventListener('mouseleave', () => { paused = false; scheduleNext(); });

  // Click on side slides to navigate
  slides.forEach((slide, i) => {
    slide.addEventListener('click', (e) => {
      if (i !== current) {
        e.preventDefault();
        goTo(i);
      }
      // If current, let the link navigate
    });
  });

  // Dots
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goTo(i));
  });

  // Arrow buttons
  const prevBtn = document.querySelector('.carousel__arrow--prev');
  const nextBtn = document.querySelector('.carousel__arrow--next');
  if (prevBtn) prevBtn.addEventListener('click', () => goTo((current - 1 + count) % count));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo((current + 1) % count));

  // Swipe support (touch)
  let touchStartX = 0;
  let touchEndX = 0;
  const SWIPE_THRESHOLD = 40;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    paused = true;
    stop();
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) >= SWIPE_THRESHOLD) {
      if (diff > 0) {
        goTo((current + 1) % count); // swipe left → next
      } else {
        goTo((current - 1 + count) % count); // swipe right → prev
      }
    }
    paused = false;
    scheduleNext();
  }, { passive: true });

  // Only animate when section is in viewport
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) {
      scheduleNext();
    } else {
      stop();
    }
  }, { threshold: 0.2 });

  observer.observe(track);

  // Initial layout
  layout();
}

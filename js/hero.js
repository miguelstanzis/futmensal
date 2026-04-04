export function initHero() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const scrollIndicator = hero.querySelector('.hero__scroll');
  const logoStatic = hero.querySelector('.hero__logo-static');
  const navLogo = document.querySelector('.nav__logo');

  function getActiveVideo() {
    const isMobile = window.innerWidth <= 768;
    const selector = isMobile ? '.hero__video--mobile' : '.hero__video--desktop';
    return document.querySelector(selector);
  }

  function showLogo() {
    if (logoStatic) logoStatic.classList.add('visible');
  }

  function hideLogo() {
    if (logoStatic) logoStatic.classList.remove('visible');
  }

  function playOnce() {
    const video = getActiveVideo();
    if (!video) return;
    hideLogo();
    video.currentTime = 0;
    video.play().catch(() => {});
  }

  // Setup videos: muted, no loop
  hero.querySelectorAll('.hero__video').forEach(v => {
    v.muted = true;
    v.loop = false;
    v.pause();

    // Show static logo when video ends
    v.addEventListener('ended', showLogo);
  });

  // Play on page load
  const video = getActiveVideo();
  if (video) {
    if (video.readyState >= 2) {
      playOnce();
    } else {
      video.addEventListener('loadeddata', () => playOnce(), { once: true });
      video.load();
    }
  }

  // Replay when clicking the nav logo
  if (navLogo) {
    navLogo.addEventListener('click', () => {
      setTimeout(playOnce, 100);
    });
  }

  // Replay when clicking the static logo overlay
  if (logoStatic) {
    logoStatic.addEventListener('click', playOnce);
  }

  // Hide scroll indicator once user scrolls a bit
  function onScroll() {
    if (!scrollIndicator) return;
    const rect = hero.getBoundingClientRect();
    const progress = -rect.top / hero.offsetHeight;
    scrollIndicator.classList.toggle('hidden', progress > 0.05);
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // Handle resize (switch between desktop/mobile video)
  let lastIsMobile = window.innerWidth <= 768;
  window.addEventListener('resize', () => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile !== lastIsMobile) {
      lastIsMobile = isMobile;
      hero.querySelectorAll('.hero__video').forEach(v => v.pause());
    }
  });
}

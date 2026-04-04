export function initNav() {
  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav__hamburger');
  const overlay = document.querySelector('.nav__overlay');
  const links = document.querySelectorAll('.nav__link');
  const sections = document.querySelectorAll('section[id]');

  // Scroll - add background
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        nav.classList.toggle('scrolled', window.scrollY > 50);
        updateActiveLink();
        ticking = false;
      });
      ticking = true;
    }
  });

  // Scroll spy
  function updateActiveLink() {
    const scrollY = window.scrollY + window.innerHeight / 3;
    let current = '';
    sections.forEach(section => {
      if (scrollY >= section.offsetTop) {
        current = section.id;
      }
    });
    links.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
    });
  }

  // Mobile menu
  hamburger?.addEventListener('click', () => {
    const isOpen = hamburger.classList.toggle('open');
    overlay.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';

    if (isOpen) {
      const overlayLinks = overlay.querySelectorAll('.nav__link');
      overlayLinks.forEach((link, i) => {
        link.classList.remove('visible');
        setTimeout(() => link.classList.add('visible'), 100 + i * 80);
      });
    }
  });

  // Close menu on link click
  overlay?.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Smooth scroll for nav links
  links.forEach(link => {
    link.addEventListener('click', e => {
      const href = link.getAttribute('href');
      if (href?.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  updateActiveLink();
}

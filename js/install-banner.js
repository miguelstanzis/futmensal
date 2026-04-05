function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function createBanner() {
  const isIOSDevice = isIOS();
  const isAndroidDevice = isAndroid();

  if ((!isIOSDevice && !isAndroidDevice) || isStandalone()) return;

  const stepsHTML = isIOSDevice ? `
    <div class="install-banner__step">
      <span class="install-banner__step-num">1</span>
      <span>Toque em <svg class="install-banner__safari-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="12" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="18" cy="12" r="2.5"/></svg> na barra do Safari</span>
    </div>
    <div class="install-banner__step">
      <span class="install-banner__step-num">2</span>
      <span>Toque em <svg class="install-banner__safari-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="14" rx="2"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="14"/></svg> <strong>Compartilhar</strong></span>
    </div>
    <div class="install-banner__step">
      <span class="install-banner__step-num">3</span>
      <span>Toque em <svg class="install-banner__safari-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg> <strong>Ver Mais</strong></span>
    </div>
    <div class="install-banner__step">
      <span class="install-banner__step-num">4</span>
      <span>Toque em <svg class="install-banner__safari-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="9" y1="12" x2="15" y2="12"/></svg> <strong>Adicionar à Tela de Início</strong></span>
    </div>
    <div class="install-banner__step">
      <span class="install-banner__step-num">5</span>
      <span>Toque em <strong>Adicionar</strong></span>
    </div>
  ` : `
    <div class="install-banner__step">
      <span class="install-banner__step-num">1</span>
      <span>Toque em <svg class="install-banner__safari-icon" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2.5"/><circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="19" r="2.5"/></svg> no menu do Chrome</span>
    </div>
    <div class="install-banner__step">
      <span class="install-banner__step-num">2</span>
      <span>Toque em <strong>Adicionar à tela inicial</strong></span>
    </div>
  `;

  const banner = document.createElement('div');
  banner.className = 'install-banner';
  banner.innerHTML = `
    <button class="install-banner__close" aria-label="Fechar">&times;</button>
    <div class="install-banner__header">
      <img class="install-banner__icon" src="./apple-touch-icon.png" alt="Fut Mensal" width="48" height="48">
      <div class="install-banner__text">
        <strong>Instalar Fut Mensal</strong>
        <span>Adicione o app do Fut Mensal à tela de início</span>
      </div>
    </div>
    <div class="install-banner__steps">
      ${stepsHTML}
    </div>
  `;

  document.body.appendChild(banner);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.classList.add('install-banner--visible');
    });
  });

  const header = banner.querySelector('.install-banner__header');
  header.addEventListener('click', () => {
    banner.classList.toggle('install-banner--expanded');
  });

  banner.querySelector('.install-banner__close').addEventListener('click', (e) => {
    e.stopPropagation();
    banner.classList.remove('install-banner--visible');
    banner.addEventListener('transitionend', () => banner.remove(), { once: true });
  });
}

export function initInstallBanner() {
  createBanner();
}

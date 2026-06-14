// App shell loader — sidebar + Lucide icons
const LUCIDE_SRC = 'https://unpkg.com/lucide@0.469.0/dist/umd/lucide.min.js';
const FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Bungee&family=Inter:wght@400;500;600;700&family=Pliant:wght@400;500;600;700&display=swap';

const PHOSPHOR_FILL_HREF = 'https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css';

function loadPhosphorFill() {
  if (document.getElementById('phosphor-fill')) return;
  const link = document.createElement('link');
  link.id = 'phosphor-fill';
  link.rel = 'stylesheet';
  link.href = PHOSPHOR_FILL_HREF;
  document.head.appendChild(link);
}

function loadFonts() {
  if (document.getElementById('cluster-fonts')) return;
  if (!document.querySelector('link[href*="fonts.googleapis.com"][href*="Pliant"]')) {
    const pre1 = document.createElement('link');
    pre1.rel = 'preconnect';
    pre1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(pre1);
    const pre2 = document.createElement('link');
    pre2.rel = 'preconnect';
    pre2.href = 'https://fonts.gstatic.com';
    pre2.crossOrigin = '';
    document.head.appendChild(pre2);
    const link = document.createElement('link');
    link.id = 'cluster-fonts';
    link.rel = 'stylesheet';
    link.href = FONTS_HREF;
    document.head.appendChild(link);
  }
}

function setActiveNav() {
  const currentPath = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach((link) => link.classList.remove('active'));

  const map = [
    { match: (p) => p === '/' || p === '/index.html', page: 'home' },
    { match: (p) => p.includes('/editor') || p.includes('/manager'), page: 'blog' },
    { match: (p) => p.includes('/faq-manager'), page: 'faq' },
    { match: (p) => p.includes('/job-manager'), page: 'job' },
    { match: (p) => p.includes('/creator_showcase'), page: 'creator' },
    { match: (p) => p.includes('/tweets'), page: 'tweets' },
    { match: (p) => p.includes('/settings') || p.includes('/test-header'), page: 'settings' },
  ];

  document.querySelectorAll('.sidebar-footer-link').forEach((link) => link.classList.remove('active'));

  for (const { match, page } of map) {
    if (match(currentPath)) {
      const link = document.querySelector(`.sidebar-link[data-page="${page}"]`)
        || document.querySelector(`.sidebar-footer-link[data-page="${page}"]`);
      if (link) link.classList.add('active');
      break;
    }
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

window.refreshIcons = function refreshIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({ attrs: { 'stroke-width': 1.75 } });
  }
};

function bindSidebarPasswordGuard() {
  document.querySelectorAll('.sidebar-link, .sidebar-promo a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href.includes('/settings')) return;
    link.addEventListener('click', (e) => {
      if (!window.AdminPassword?.isUnlocked?.()) {
        e.preventDefault();
        window.location.href = '/settings';
      }
    });
  });
}

function updateSidebarLockState() {
  const locked = !window.AdminPassword?.isUnlocked?.();

  document.querySelectorAll('.sidebar-link, .sidebar-promo a').forEach((link) => {
    const href = link.getAttribute('href') || '';
    if (href.includes('/settings')) return;

    link.classList.toggle('sidebar-link-locked', locked);

    let lockIcon = link.querySelector('.sidebar-lock-icon');
    if (locked) {
      if (!lockIcon) {
        lockIcon = document.createElement('i');
        lockIcon.className = 'ph-fill ph-lock sidebar-lock-icon';
        lockIcon.setAttribute('aria-hidden', 'true');
        lockIcon.setAttribute('title', 'Save admin password in Settings to unlock');
        link.appendChild(lockIcon);
      }
    } else if (lockIcon) {
      lockIcon.remove();
    }
  });
}

window.updateSidebarLockState = updateSidebarLockState;

async function injectAppShell(sidebarHTML) {
  const body = document.body;
  const isEditor = body.classList.contains('editor-page');

  if (isEditor) {
    body.classList.add('editor-shell');
    return;
  }

  const scripts = [...body.querySelectorAll('script')];
  const nodes = [...body.childNodes].filter(
    (n) => n.nodeType === 1 && n.tagName !== 'SCRIPT'
  );

  body.innerHTML = '';
  body.classList.add('app-shell');
  body.insertAdjacentHTML('afterbegin', sidebarHTML);

  const main = document.createElement('main');
  main.className = 'app-main';
  nodes.forEach((n) => main.appendChild(n));
  body.appendChild(main);
  scripts.forEach((s) => body.appendChild(s));
}

async function loadAppShell() {
  loadPhosphorFill();
  loadFonts();
  await loadScript('/js/admin-password.js');
  await loadScript('/js/admin-confirm.js');

  if (!window.AdminPassword?.guard?.()) {
    return;
  }

  try {
    const response = await fetch('/components/sidebar.html');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await injectAppShell(await response.text());
  } catch (error) {
    console.error('Sidebar load failed:', error);
  }

  setActiveNav();
  bindSidebarPasswordGuard();
  updateSidebarLockState();
  await loadScript(LUCIDE_SRC);
  window.refreshIcons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadAppShell);
} else {
  loadAppShell();
}

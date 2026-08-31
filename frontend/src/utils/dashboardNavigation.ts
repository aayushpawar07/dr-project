const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

const candidateSectionLabels = new Set([
  'dashboard',
  'home',
  'saved jobs',
  'saved',
  'my applications',
  'applications',
  'apps',
  'recommended',
  'notifications',
  'interviews',
  'shortlisted',
  'selected',
  'unread alerts',
  'see all',
  'view all',
]);

const employerSectionLabels = new Set([
  'dashboard',
  'my jobs',
  'applications',
  'shortlisted',
  'interviews',
  'verification',
  'plans & billing',
  'plans',
  'notifications',
]);

const sectionButtonSelector = [
  '.candidate-sidebar__group nav button',
  '.candidate-bottom-nav button',
  '.candidate-stat-card',
  '.candidate-section-heading button',
  '.candidate-mobile-notification',
  '.candidate-icon-button',
  '.employer-nav-item',
  '.dashboard-section-switcher button',
  '.dashboard-desktop-notification',
  '.employer-dashboard__mobile-bar .icon-button--notification',
].join(',');

function normalizedLabel(element: HTMLElement) {
  return (element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function addFocusFeedback(target: HTMLElement) {
  target.classList.remove('dashboard-nav-target--flash');
  // Force the animation to restart when a user clicks the same item repeatedly.
  void target.offsetWidth;
  target.classList.add('dashboard-nav-target--flash');

  window.setTimeout(() => {
    target.classList.remove('dashboard-nav-target--flash');
  }, 900);
}

function scrollToTarget(target: HTMLElement) {
  const behavior: ScrollBehavior = window.matchMedia(reducedMotionQuery).matches ? 'auto' : 'smooth';
  target.scrollIntoView({ behavior, block: 'start', inline: 'nearest' });
  addFocusFeedback(target);
}

function getCandidateTarget(dashboard: HTMLElement, label: string) {
  if (label === 'dashboard' || label === 'home') {
    return dashboard.querySelector<HTMLElement>('.candidate-page-header') ||
      dashboard.querySelector<HTMLElement>('.candidate-main');
  }

  return dashboard.querySelector<HTMLElement>('.candidate-content-panel') ||
    dashboard.querySelector<HTMLElement>('.candidate-dashboard-section') ||
    dashboard.querySelector<HTMLElement>('.candidate-greeting-card');
}

function getEmployerTarget(dashboard: HTMLElement, label: string) {
  if (label === 'dashboard') {
    return dashboard.querySelector<HTMLElement>('.dashboard-page-header') ||
      dashboard.querySelector<HTMLElement>('.employer-main');
  }

  return dashboard.querySelector<HTMLElement>('.employer-main .dashboard-panel') ||
    dashboard.querySelector<HTMLElement>('.dashboard-section-switcher') ||
    dashboard.querySelector<HTMLElement>('.employer-verification-card');
}

function scheduleSectionScroll(dashboard: HTMLElement, type: 'candidate' | 'employer', label: string) {
  // Let the click handler update React state first, then find the section that was rendered.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if (!document.body.contains(dashboard)) return;

      const target = type === 'candidate'
        ? getCandidateTarget(dashboard, label)
        : getEmployerTarget(dashboard, label);

      if (target) scrollToTarget(target);
    });
  });
}

function installDashboardNavigation() {
  if ((window as any).__medexDashboardNavigationInstalled) return;
  (window as any).__medexDashboardNavigationInstalled = true;

  document.addEventListener('click', (event) => {
    const clicked = event.target instanceof Element
      ? event.target.closest<HTMLElement>(sectionButtonSelector)
      : null;

    if (!clicked) return;

    const label = normalizedLabel(clicked);
    const candidateDashboard = clicked.closest<HTMLElement>('.candidate-dashboard');
    if (candidateDashboard && candidateSectionLabels.has(label)) {
      scheduleSectionScroll(candidateDashboard, 'candidate', label);
      return;
    }

    const employerDashboard = clicked.closest<HTMLElement>('.employer-dashboard');
    if (employerDashboard && employerSectionLabels.has(label)) {
      scheduleSectionScroll(employerDashboard, 'employer', label);
    }
  });
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installDashboardNavigation();
}

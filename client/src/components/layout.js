import { escapeHtml, initials } from '../utils.js';

const nav = [
  ['dashboard', 'layout-dashboard', 'Dashboard', 'all'], ['lost-items', 'bell', 'Lost Items', 'all'], ['found-items', 'shopping-bag', 'Found Items', 'all'], ['matches', 'git-compare-arrows', 'Possible Matches', 'all'], ['claims', 'hand', 'Claims', 'all'], ['locations', 'map-pin', 'Locations', 'admin'], ['categories', 'briefcase-business', 'Categories', 'admin'],
  ['users', 'users', 'Users', 'admin'], ['reports', 'chart-no-axes-column-increasing', 'Reports & Analytics', 'admin'], ['settings', 'settings', 'System Settings', 'all'], ['activity', 'notebook-tabs', 'Activity Logs', 'admin']
];
const groups = [['MAIN', 0, 7], ['MANAGEMENT', 7, 9], ['SETTINGS', 9, 11]];

export function layout(user, route, title, subtitle, content) {
  const allowed = nav.filter((entry) => entry[3] === 'all' || user.role === 'ADMIN');
  const navHtml = groups.map(([label, from, to]) => {
    const entries = nav.slice(from, to).filter((entry) => allowed.includes(entry));
    return entries.length ? `<div class="nav-label">${label}</div><nav class="nav-list">${entries.map(([id, icon, text]) => `<button class="nav-item ${route === id ? 'active' : ''}" data-route="${id}"><i data-lucide="${icon}"></i>${text}</button>`).join('')}</nav>` : '';
  }).join('');
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-logo"><span class="brand-search">🔎</span><div><h1>Lost <b>&amp;</b><br>Found</h1><span>ITEM RECOVERY</span></div></div><div class="brand-mascot"><img src="/assets/sidebar-dog-mascot.png" alt="Lost and Found puppy mascot"></div></div>${navHtml}<div class="sidebar-bottom"><div class="sidebar-profile"><div class="avatar">${initials(user)}</div><div><strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong><span>${escapeHtml(user.role[0] + user.role.slice(1).toLowerCase())}</span></div><i data-lucide="chevron-down"></i></div><button class="btn sidebar-logout" data-action="logout"><i data-lucide="log-out"></i>Logout</button><div class="kind-note">Good deeds find their<br>way back home. <span>♥</span></div></div></aside>
    <header class="topbar"><div style="display:flex;align-items:center;gap:13px"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Open menu"><i data-lucide="menu"></i></button><div class="page-icon"><i data-lucide="shopping-bag"></i></div><div class="title"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div></div><div class="top-actions"><div class="header-cloud" aria-hidden="true">☁</div><button class="icon-btn notification-btn" aria-label="Notifications"><i data-lucide="bell"></i><span>3</span></button></div></header>
    <main class="content">${content}</main></div>`;
}

export function bindLayout(onRoute, onLogout) {
  document.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => onRoute(button.dataset.route)));
  document.querySelector('[data-action="menu"]')?.addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
  document.querySelector('[data-action="profile-menu"]')?.addEventListener('click', onLogout);
  document.querySelector('[data-action="logout"]')?.addEventListener('click', onLogout);
}

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
    <aside class="sidebar" id="sidebar"><div class="brand"><div class="brand-mark"><i data-lucide="shopping-bag"></i></div><div><h1>Lost &amp; Found</h1><span>Management System</span></div></div>${navHtml}<div class="sidebar-bottom"><button class="nav-item help-btn" data-route="settings"><i data-lucide="circle-help"></i>Need Help?</button><div class="copyright">© 2026 Lost &amp; Found System<br>All rights reserved.</div></div></aside>
    <header class="topbar"><div style="display:flex;align-items:center;gap:13px"><button class="icon-btn mobile-menu" data-action="menu" aria-label="Open menu"><i data-lucide="menu"></i></button><div class="title"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></div></div><div class="top-actions"><div class="search-wrap global-search"><i data-lucide="search"></i><input data-global-search placeholder="Search anything…" aria-label="Search anything"></div><button class="icon-btn" aria-label="Notifications"><i data-lucide="bell"></i></button><div class="profile"><div><strong>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</strong><span>${escapeHtml(user.role[0] + user.role.slice(1).toLowerCase())}</span></div><div class="avatar">${initials(user)}</div><button class="icon-btn" data-action="profile-menu" aria-label="Profile menu"><i data-lucide="chevron-down"></i></button></div></div></header>
    <main class="content">${content}</main></div>`;
}

export function bindLayout(onRoute, onLogout) {
  document.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => onRoute(button.dataset.route)));
  document.querySelector('[data-action="menu"]')?.addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
  document.querySelector('[data-action="profile-menu"]')?.addEventListener('click', onLogout);
}

import { createIcons, ArrowRightLeft, Backpack, Bell, BriefcaseBusiness, CalendarDays, ChartNoAxesColumnIncreasing, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleHelp, CircleMinus, ClipboardList, Database, Ellipsis, Eye, GitCompareArrows, Glasses, Hand, Heart, ImageOff, ImageUp, KeyRound, Laptop, LayoutDashboard, ListFilter, LogOut, MapPin, Menu, NotebookTabs, Package, PackageOpen, Pencil, Plus, Search, Settings, ShieldCheck, ShoppingBag, Smartphone, Trash2, UserX, Users, WalletCards, X } from 'lucide';
import './styles/global.css';
import './styles/components.css';
import './styles/responsive.css';
import { api } from './services/api.js';
import { layout, bindLayout } from './components/layout.js';
import { dashboardPage, foundPage, lostPage, matchesPage, claimsPage, adminListPage } from './pages.js';
import { escapeHtml, toast } from './utils.js';

const app = document.querySelector('#app');
const pageState = new Map();
let user = null;
const iconSet = { ArrowRightLeft, Backpack, Bell, BriefcaseBusiness, CalendarDays, ChartNoAxesColumnIncreasing, ChevronDown, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, CircleHelp, CircleMinus, ClipboardList, Database, Ellipsis, Eye, GitCompareArrows, Glasses, Hand, Heart, ImageOff, ImageUp, KeyRound, Laptop, LayoutDashboard, ListFilter, LogOut, MapPin, Menu, NotebookTabs, Package, PackageOpen, Pencil, Plus, Search, Settings, ShieldCheck, ShoppingBag, Smartphone, Trash2, UserX, Users, WalletCards, X };
window.refreshIcons = () => createIcons({ icons: iconSet, attrs: { 'aria-hidden': 'true' } });

function route() { return location.hash.replace('#/','') || 'dashboard'; }
window.go = (path) => { location.hash = `#/${path}`; document.querySelector('#sidebar')?.classList.remove('open'); };

async function logout() { try { await api.post('/auth/logout'); } catch {} user = null; location.hash = ''; renderLogin(); }
function renderLogin() {
  app.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;padding:24px"><section class="panel" style="width:min(420px,100%);padding:32px"><div class="brand" style="margin:0 0 28px"><div class="brand-mark"><i data-lucide="shopping-bag"></i></div><div><h1>Lost &amp; Found</h1><span>Management System</span></div></div><h2>Welcome back</h2><p class="muted">Sign in to manage reports, matches, and claims.</p><form id="login-form"><div class="field"><label>Email</label><input name="email" type="email" autocomplete="username" value="admin@lostfound.test" required></div><div class="field" style="margin-top:16px"><label>Password</label><input name="password" type="password" autocomplete="current-password" value="Admin123!" required></div><button class="btn btn-primary" style="width:100%;margin-top:22px">Sign in</button></form><div class="private-box" style="margin-top:22px"><small class="muted">Demo accounts</small><p style="font-size:11px;line-height:1.7;margin-bottom:0">Admin: admin@lostfound.test / Admin123!<br>Staff: staff@lostfound.test / Staff123!<br>User: user@lostfound.test / User123!</p></div></section></main>`;
  window.refreshIcons(); document.querySelector('#login-form').addEventListener('submit', async (event) => { event.preventDefault(); const button=event.target.querySelector('button');button.disabled=true;try{const result=await api.post('/auth/login',Object.fromEntries(new FormData(event.target)));user=result.user;window.go('found-items');}catch(error){toast(error.message,'error');button.disabled=false;} });
}

window.renderRoute = async () => {
  if (!user) return renderLogin();
  const current = route();
  const state = pageState.get(current) || { page: 1, search: '', status: '', selectedId: null }; pageState.set(current,state);
  app.innerHTML='<div class="page-state">Loading page…</div>';
  try {
    let page;
    if(current==='found-items')page=await foundPage(state,user);else if(current==='lost-items')page=await lostPage(state,user);else if(current==='matches')page=await matchesPage(state,user);else if(current==='claims')page=await claimsPage(state,user);else if(current==='dashboard')page=await dashboardPage(state,user);else page=await adminListPage(current,user);
    app.innerHTML=layout(user,current,page.title,page.subtitle,page.html);bindLayout(window.go,logout);page.bind();window.refreshIcons();window.scrollTo(0,0);const sidebar=document.querySelector('#sidebar');if(sidebar)sidebar.scrollTop=0;
  } catch(error){if(error.status===401){user=null;return renderLogin();}app.innerHTML=layout(user,current,'Something went wrong','The page could not be loaded.',`<div class="panel empty-state"><i data-lucide="circle-alert"></i><h3>${escapeHtml(error.message)}</h3><button class="btn" data-retry>Try again</button></div>`);bindLayout(window.go,logout);document.querySelector('[data-retry]').addEventListener('click',window.renderRoute);window.refreshIcons();}
};

addEventListener('hashchange',window.renderRoute);
async function bootstrap() {
  try { user=(await api.get('/auth/me')).user; await window.renderRoute(); } catch { renderLogin(); }
}
bootstrap();

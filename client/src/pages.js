import { api } from './services/api.js';
import { escapeHtml, formatDate, iconForCategory, statusTone, toast } from './utils.js';
import { openModal } from './components/modal.js';
import { openItemForm } from './components/itemForm.js';

const badge = (status) => `<span class="badge ${statusTone(status)}">${escapeHtml(status)}</span>`;
const thumb = (item) => `<div class="thumb">${item.image ? `<img src="${escapeHtml(item.image)}" alt="">` : `<i data-lucide="${iconForCategory(item.category)}"></i>`}</div>`;
const empty = (title, copy) => `<div class="empty-state"><i data-lucide="package-open"></i><h3>${title}</h3><p>${copy}</p></div>`;
const stat = (icon, tone, label, count, caption) => `<div class="stat-card"><div class="stat-icon ${tone}"><i data-lucide="${icon}"></i></div><div><small>${label}</small><strong>${count}</strong><span>${caption}</span></div></div>`;

export async function loadMeta() { const [categories, locations] = await Promise.all([api.get('/categories'), api.get('/locations')]); return { categories, locations }; }

export async function foundPage(state, user) {
  const query = new URLSearchParams({ page: state.page || 1, limit: 5, ...(state.search ? { search: state.search } : {}), ...(state.status ? { status: state.status } : {}) });
  const [result, matches, analytics, meta] = await Promise.all([api.get(`/found-items?${query}`), api.get('/matches'), api.get('/analytics'), loadMeta()]);
  state.pageData = result; state.matches = matches; state.meta = meta;
  if (state.selectedId && !result.items.some((item) => item.id === state.selectedId)) state.selectedId = null;
  if (!state.selectedId && result.items.length) state.selectedId = result.items[0].id;
  const selected = result.items.find((item) => item.id === state.selectedId);
  const rows = result.items.map((item) => itemRow(item, selected?.id === item.id, matches, user)).join('');
  const mobile = result.items.map((item) => `<article class="mobile-item ${selected?.id === item.id ? 'selected' : ''}" data-select-item="${item.id}">${thumb(item)}<div class="item-meta"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.location)}</span><div style="margin-top:8px">${badge(item.status)}</div></div><button class="action-btn" aria-label="View ${escapeHtml(item.name)}"><i data-lucide="eye"></i></button></article>`).join('');
  const statuses = ['', 'Unclaimed', 'Possible Match', 'Claim Pending', 'Claimed', 'Disposed'];
  const related = matches.filter((match) => match.foundItemId === selected?.id).slice(0, 2);
  return {
    title: 'Found Items', subtitle: 'Manage and track all reported found items.',
    html: `<div class="workspace ${selected ? 'with-details' : ''}"><section class="main-column"><div class="stats">${stat('shopping-bag','green','Total Found',analytics.totalFound,'')}${stat('package-open','orange','Unclaimed',analytics.foundByStatus.Unclaimed || 0,'')}${stat('heart','purple','Possible Matches',matches.filter((m) => !['Rejected'].includes(m.status)).length,'')}${stat('clipboard-list','red','Claim Pending',analytics.foundByStatus['Claim Pending'] || 0,'')}${stat('shield-check','blue','Returned',analytics.returned,'')}</div>
      <div class="panel list-panel"><div class="toolbar"><button class="btn btn-primary" data-report="found"><i data-lucide="plus"></i>Report Found Item</button><div class="toolbar-right"><div class="search-wrap"><i data-lucide="search"></i><input id="item-search" value="${escapeHtml(state.search)}" placeholder="Search found items…"></div><button class="btn" data-filter><i data-lucide="list-filter"></i>Filter</button></div></div><div class="tabs">${statuses.map((status) => `<button class="tab ${state.status === status ? 'active' : ''}" data-status="${status}">${status || 'All Items'}</button>`).join('')}</div>
      ${result.items.length ? `<table class="data-table found-table"><thead><tr><th>ITEM</th><th>FOUND LOCATION</th><th>DATE FOUND</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${rows}</tbody></table><div class="mobile-cards">${mobile}</div>` : empty('No found items yet', 'Try changing the active filters or report a found item.')}
      ${pagination(result)}</div></section>${selected ? detailPanel(selected, related, user) : ''}</div>`,
    bind: () => bindFound(state, user)
  };
}

function itemRow(item, selected, matches, user) {
  const count = matches.filter((match) => match.foundItemId === item.id && match.status !== 'Rejected').length;
  const sub = item.status === 'Possible Match' ? `${count} matches` : item.status === 'Claim Pending' ? '1 claim pending' : item.status === 'Claimed' ? formatDate(item.date) : 'No matches';
  return `<tr class="${selected ? 'selected' : ''}" data-select-item="${item.id}"><td><div class="item-cell">${thumb(item)}<div class="item-meta"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.category)} • ${escapeHtml(item.brand || item.color || '—')}</span></div></div></td><td><span class="cell-icon"><i data-lucide="map-pin"></i></span>${escapeHtml(item.location)}</td><td class="date-cell"><span class="cell-icon"><i data-lucide="calendar-days"></i></span>${formatDate(item.date, true)}</td><td class="status-cell">${badge(item.status)}<span class="subline">${sub}</span></td><td><div class="action-row"><button class="btn view-btn" data-select-item="${item.id}" aria-label="View item">View</button></div></td></tr>`;
}

function detailPanel(item, matches, user) {
  return `<aside class="panel details-panel"><button class="detail-close" data-close-detail aria-label="Close details"><i data-lucide="x"></i></button><div class="detail-hero">${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">` : `<div class="empty-state"><i data-lucide="image-off"></i><span>Image unavailable</span></div>`}</div><div class="detail-title"><h3>${escapeHtml(item.name)}</h3>${badge(item.status)}</div>
    <dl class="key-values"><dt>Item ID</dt><dd>${escapeHtml(item.readableId)}</dd><dt>Category</dt><dd>${escapeHtml(item.category)}</dd><dt>Color</dt><dd>${escapeHtml(item.color || '—')}</dd><dt>Brand</dt><dd>${escapeHtml(item.brand || '—')}</dd><dt>Status</dt><dd>${escapeHtml(item.status)}</dd><dt>Found Date</dt><dd>${formatDate(item.date).replace('<br>',' ')}</dd><dt>Found Location</dt><dd>${escapeHtml(item.location)}</dd></dl>
    <section class="detail-section"><h4>Description</h4><p>${escapeHtml(item.description)}</p></section>
    <section class="detail-section"><h4>Possible Matches (${matches.length})</h4>${matches.length ? matches.map((match) => `<div class="match-card"><div class="score-ring" style="--score:${match.score}%">${match.score}%</div><div><strong>${escapeHtml(match.lostItem.name)}</strong><span>Lost on ${formatDate(match.lostItem.date)}<br>${escapeHtml(match.lostItem.location)}</span></div><button class="btn btn-primary btn-sm" data-compare="${match.id}">Compare</button></div>`).join('') : '<p>No possible matches found.</p>'}</section>
    ${['STAFF','ADMIN'].includes(user.role) ? `<section class="detail-section"><div class="private-box"><h4>Private Details <span class="muted" style="float:right;font-weight:400">Staff only</span></h4>${item.privateDetails ? `<ul>${item.privateDetails.split('\n').map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>` : '<p>No private details recorded.</p>'}</div></section>` : ''}
    <div class="detail-actions">${['STAFF','ADMIN'].includes(user.role) || item.reporterId === user.id ? `<button class="btn" data-edit-item="${item.id}"><i data-lucide="pencil"></i>Edit Item</button>` : ''}${['STAFF','ADMIN'].includes(user.role) ? `<button class="btn btn-danger" data-mark-claimed="${item.id}"><i data-lucide="circle-check"></i>Mark as Claimed</button>` : `<button class="btn btn-primary" data-claim-item="${item.id}">This might be mine</button>`}</div></aside>`;
}

function pagination(result) { const pages = Math.max(1, Math.ceil(result.total / result.limit)); const start = result.total ? (result.page - 1) * result.limit + 1 : 0; const end = Math.min(result.page * result.limit, result.total); return `<div class="pagination"><span>Showing ${start} to ${end} of ${result.total} items</span><div class="pages"><button class="page-btn" data-page="${Math.max(1,result.page-1)}" ${result.page === 1 ? 'disabled' : ''}><i data-lucide="chevron-left"></i></button>${Array.from({length: Math.min(5,pages)},(_,index) => `<button class="page-btn ${index+1 === result.page ? 'active' : ''}" data-page="${index+1}">${index+1}</button>`).join('')}<button class="page-btn" data-page="${Math.min(pages,result.page+1)}" ${result.page === pages ? 'disabled' : ''}><i data-lucide="chevron-right"></i></button></div></div>`; }

function bindFound(state, user) {
  const reload = () => window.renderRoute();
  document.querySelectorAll('[data-select-item]').forEach((element) => element.addEventListener('click', (event) => { if (event.target.closest('[data-edit-item]')) return; state.selectedId = Number(element.dataset.selectItem); reload(); }));
  document.querySelector('[data-close-detail]')?.addEventListener('click', () => { state.selectedId = null; reload(); });
  document.querySelector('[data-report]')?.addEventListener('click', () => openItemForm('found', state.meta, null, reload));
  document.querySelectorAll('[data-edit-item]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); openItemForm('found', state.meta, state.pageData.items.find((item) => item.id === Number(button.dataset.editItem)), reload); }));
  document.querySelectorAll('[data-status]').forEach((button) => button.addEventListener('click', () => { state.status = button.dataset.status; state.page = 1; reload(); }));
  document.querySelectorAll('[data-page]').forEach((button) => button.addEventListener('click', () => { state.page = Number(button.dataset.page); reload(); }));
  let timer; document.querySelector('#item-search')?.addEventListener('input', (event) => { clearTimeout(timer); timer = setTimeout(() => { state.search = event.target.value; state.page = 1; reload(); }, 300); });
  document.querySelector('[data-filter]')?.addEventListener('click', () => openFilter(state, reload));
  document.querySelectorAll('[data-compare]').forEach((button) => button.addEventListener('click', () => openCompare(state.matches.find((match) => match.id === button.dataset.compare), user, reload)));
  document.querySelector('[data-mark-claimed]')?.addEventListener('click', async () => { const item = state.pageData.items.find((entry) => entry.id === state.selectedId); await api.put(`/found-items/${item.id}`, { ...item, status: 'Claimed', custodyStatus: 'Returned' }); toast('Item marked as claimed'); reload(); });
  document.querySelector('[data-claim-item]')?.addEventListener('click', () => openClaim(state.selectedId, reload));
}

function openFilter(state, reload) { const close = openModal('Filter Found Items', `<form id="filter-form"><div class="field"><label>Status</label><select name="status"><option value="">All statuses</option>${['Unclaimed','Possible Match','Claim Pending','Claimed','Disposed'].map((status) => `<option ${state.status===status?'selected':''}>${status}</option>`).join('')}</select></div><div class="form-actions"><button class="btn" type="button" data-clear>Clear</button><button class="btn btn-primary">Apply Filter</button></div></form>`, { fixed: true }); const form=document.querySelector('#filter-form'); form.querySelector('[data-clear]').addEventListener('click',()=>{state.status='';close();reload();}); form.addEventListener('submit',(event)=>{event.preventDefault();state.status=form.elements.status.value;state.page=1;close();reload();}); }

function openCompare(match, user, reload) {
  if (!match) return;
  const fields = [['Category','category'],['Color','color'],['Location','location'],['Date','date'],['Brand','brand']];
  const body = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><div><div class="split-title">MATCH SCORE</div><div class="big-score">${match.score}%</div></div>${badge(match.status)}</div><div class="compare-grid"><div><span class="split-title">LOST ITEM</span><h3>${escapeHtml(match.lostItem.name)}</h3></div><div class="compare-label">COMPARE</div><div><span class="split-title">FOUND ITEM</span><h3>${escapeHtml(match.foundItem.name)}</h3></div>${fields.map(([label,key]) => `<div><span class="split-title">${label}</span><p>${key==='date'?formatDate(match.lostItem[key]):escapeHtml(match.lostItem[key]||'—')}</p></div><div class="compare-label"><i data-lucide="${String(match.lostItem[key]).toLowerCase()===String(match.foundItem[key]).toLowerCase()?'circle-check':'circle-minus'}"></i><br>${match[`${key}Score`] ?? ''}</div><div><span class="split-title">${label}</span><p>${key==='date'?formatDate(match.foundItem[key]):escapeHtml(match.foundItem[key]||'—')}</p></div>`).join('')}</div>${['STAFF','ADMIN'].includes(user.role)?`<div class="form-actions"><button class="btn btn-danger" data-reject>Not a Match</button><button class="btn btn-success" data-confirm>Confirm Possible Match</button></div>`:''}`;
  const close = openModal('Compare Items', body, { wide: true });
  document.querySelector('[data-confirm]')?.addEventListener('click', async()=>{await api.post(`/matches/${match.id}/confirm`);toast('Match confirmed');close();reload();});
  document.querySelector('[data-reject]')?.addEventListener('click', async()=>{await api.post(`/matches/${match.id}/reject`);toast('Match rejected');close();reload();});
}

function openClaim(foundItemId, reload) { const close = openModal('Submit Ownership Claim', `<form id="claim-form"><p class="muted">Your answers are private and will be compared with the item details by staff.</p><div class="field"><label>What brand is the item?</label><input name="brand" required></div><div class="field"><label>What was inside?</label><textarea name="contents" required></textarea></div><div class="field"><label>Describe any unique marks.</label><textarea name="marks" required></textarea></div><div class="form-actions"><button class="btn btn-primary">Submit Claim</button></div></form>`, { fixed: true }); const form=document.querySelector('#claim-form');form.addEventListener('submit',async(event)=>{event.preventDefault();try{await api.post('/claims',{foundItemId,answers:Object.fromEntries(new FormData(form))});toast('Claim submitted for staff review');close();reload();}catch(error){toast(error.message,'error')}}); }

export async function lostPage(state, user) {
  const result = await api.get(`/lost-items?${new URLSearchParams({ page: state.page || 1, limit: 10, ...(state.search ? {search:state.search}:{}), ...(state.status?{status:state.status}:{}) })}`); const matches = await api.get('/matches'); state.pageData=result; state.meta=await loadMeta();
  const rows=result.items.map((item)=>`<tr><td><div class="item-cell">${thumb(item)}<div class="item-meta"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.category)} • ${escapeHtml(item.brand||item.color||'—')}</span></div></div></td><td>${escapeHtml(item.location)}</td><td>${formatDate(item.date,true)}</td><td>${matches.filter((match)=>match.lostItemId===item.id&&match.status!=='Rejected').length}</td><td>${badge(item.status)}</td><td><button class="action-btn" data-edit-lost="${item.id}"><i data-lucide="pencil"></i></button></td></tr>`).join('');
  return {title:'Lost Items',subtitle:user.role==='USER'?'Track your lost item reports and possible matches.':'Manage all reported lost items.',html:`<div class="panel list-panel"><div class="toolbar"><button class="btn btn-primary" data-report-lost><i data-lucide="plus"></i>Report Lost Item</button><div class="search-wrap"><i data-lucide="search"></i><input id="lost-search" value="${escapeHtml(state.search)}" placeholder="Search lost items…"></div></div><div class="tabs">${['','Open','Possible Match','Claim Submitted','Resolved','Closed'].map(s=>`<button class="tab ${state.status===s?'active':''}" data-lost-status="${s}">${s||'All Items'}</button>`).join('')}</div>${rows?`<table class="data-table"><thead><tr><th>ITEM</th><th>LOST LOCATION</th><th>DATE LOST</th><th>MATCHES</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${rows}</tbody></table>`:empty('No lost reports','Report a lost item to start matching.')}${pagination(result)}</div>`,bind:()=>{const reload=()=>window.renderRoute();document.querySelector('[data-report-lost]').addEventListener('click',()=>openItemForm('lost',state.meta,null,reload));document.querySelectorAll('[data-edit-lost]').forEach(b=>b.addEventListener('click',()=>openItemForm('lost',state.meta,result.items.find(i=>i.id===Number(b.dataset.editLost)),reload)));document.querySelectorAll('[data-lost-status]').forEach(b=>b.addEventListener('click',()=>{state.status=b.dataset.lostStatus;reload()}));let timer;document.querySelector('#lost-search').addEventListener('input',e=>{clearTimeout(timer);timer=setTimeout(()=>{state.search=e.target.value;reload()},300)});}};
}

export async function matchesPage(_state, user) { const matches=await api.get('/matches'); return {title:'Possible Matches',subtitle:'Review automatically scored lost and found item pairs.',html:matches.length?`<div class="cards-grid">${matches.map(match=>`<article class="panel feature-card"><div class="big-score">${match.score}% MATCH</div><div class="match-feature"><div><span class="split-title">Lost</span><h3>${escapeHtml(match.lostItem.name)}</h3><p class="muted">${escapeHtml(match.lostItem.location)}<br>${formatDate(match.lostItem.date)}</p></div><i data-lucide="arrow-right-left"></i><div><span class="split-title">Found</span><h3>${escapeHtml(match.foundItem.name)}</h3><p class="muted">${escapeHtml(match.foundItem.location)}<br>${formatDate(match.foundItem.date)}</p></div></div><div class="feature-actions">${badge(match.status)}<button class="btn btn-primary btn-sm" data-match-card="${match.id}">Compare</button></div></article>`).join('')}</div>`:empty('No possible matches found','New matches appear after reports are created.'),bind:()=>document.querySelectorAll('[data-match-card]').forEach(b=>b.addEventListener('click',()=>openCompare(matches.find(m=>m.id===b.dataset.matchCard),user,()=>window.renderRoute()))) }; }

export async function claimsPage(_state,user) { const claims=await api.get('/claims'); const rows=claims.map(c=>`<tr><td>${escapeHtml(`${c.claimant?.firstName||''} ${c.claimant?.lastName||''}`)}</td><td>${escapeHtml(c.item?.name||'Unknown item')}</td><td>${formatDate(c.submittedAt)}</td><td>${badge(c.status)}</td><td>${escapeHtml(c.reviewer?`${c.reviewer.firstName} ${c.reviewer.lastName}`:'—')}</td><td><button class="btn btn-sm" data-review-claim="${c.id}">Review</button></td></tr>`).join(''); return {title:'Claims',subtitle:user.role==='USER'?'Track your ownership claims.':'Review and verify item ownership claims.',html:`<div class="panel list-panel">${rows?`<table class="data-table"><thead><tr><th>CLAIMANT</th><th>ITEM</th><th>SUBMITTED</th><th>STATUS</th><th>REVIEWER</th><th>ACTIONS</th></tr></thead><tbody>${rows}</tbody></table>`:empty('No pending claims','Claims will appear here when submitted.')}</div>`,bind:()=>document.querySelectorAll('[data-review-claim]').forEach(b=>b.addEventListener('click',()=>reviewClaim(claims.find(c=>c.id===Number(b.dataset.reviewClaim)),user))) }; }

function reviewClaim(claim,user){const answers=claim.answers||{};const canReview=['STAFF','ADMIN'].includes(user.role);const close=openModal('Claim Review',`<p><span class="split-title">Claimant</span><br><strong>${escapeHtml(`${claim.claimant.firstName} ${claim.claimant.lastName}`)}</strong></p><p><span class="split-title">Item</span><br><strong>${escapeHtml(claim.item.name)}</strong></p><div class="private-box"><h4>Verification answers</h4><p><b>Brand:</b> ${escapeHtml(answers.brand||'—')}<br><b>Contents:</b> ${escapeHtml(answers.contents||'—')}<br><b>Unique marks:</b> ${escapeHtml(answers.marks||'—')}</p>${canReview?`<hr style="border-color:var(--line)"><p><b>Staff reference:</b><br>${escapeHtml(claim.item.privateDetails||'No private details recorded.')}</p>`:''}</div>${canReview&&claim.status!=='Returned'?`<div class="form-actions"><button class="btn btn-danger" data-claim-reject>Reject</button><button class="btn btn-success" data-claim-approve>Approve</button>${claim.status==='Approved'?'<button class="btn btn-primary" data-claim-return>Mark Item Returned</button>':''}</div>`:''}`); const act=async(action,body={})=>{await api.post(`/claims/${claim.id}/${action}`,body);toast(`Claim ${action === 'return' ? 'marked returned' : `${action}d`}`);close();window.renderRoute();};document.querySelector('[data-claim-approve]')?.addEventListener('click',()=>act('approve'));document.querySelector('[data-claim-return]')?.addEventListener('click',()=>act('return'));document.querySelector('[data-claim-reject]')?.addEventListener('click',()=>{const reason=prompt('Rejection reason:');if(reason?.trim())act('reject',{reason});});}

const dashboardDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (date.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
};

const dashboardStat = (icon, tone, label, count, caption, index) => `<article class="dashboard-stat">
  <div class="stat-icon ${tone}"><i data-lucide="${icon}"></i></div>
  <div class="dashboard-stat-copy"><small>${escapeHtml(label)}</small><strong>${count}</strong><span>${escapeHtml(caption)}</span></div>
  <svg class="mini-trend trend-${index}" viewBox="0 0 84 32" aria-hidden="true"><path d="M2 25 C10 ${22-index*2}, 13 ${8+index*2}, 22 17 S35 ${29-index}, 43 14 S55 ${5+index*3}, 62 17 S74 ${23-index*2}, 82 10"/></svg>
</article>`;

const dashboardEmpty = (copy) => `<div class="dashboard-empty"><i data-lucide="package-open"></i><span>${escapeHtml(copy)}</span></div>`;

const reportRow = (entry) => `<button class="dashboard-report-row" data-go="${entry.type === 'lost' ? 'lost-items' : 'found-items'}">
  ${thumb(entry.item)}<span class="dashboard-item-name"><strong>${escapeHtml(entry.item.name)}</strong><em class="report-kind ${entry.type}">${entry.type === 'lost' ? 'Lost' : 'Found'}</em></span>
  <span class="dashboard-location"><i data-lucide="map-pin"></i>${escapeHtml(entry.item.location)}</span>
  <time>${dashboardDate(entry.item.createdAt || entry.item.date)}</time>${badge(entry.item.status)}
</button>`;

const claimRow = (claim) => `<button class="dashboard-claim-row" data-dashboard-claim="${claim.id}">
  ${thumb(claim.item || {})}<span><strong>${escapeHtml(claim.item?.name || 'Unknown item')}</strong><small>Claimed by: ${escapeHtml(`${claim.claimant?.firstName || ''} ${claim.claimant?.lastName || ''}`.trim() || 'Unknown user')}</small></span>
  <time>${dashboardDate(claim.submittedAt)}</time>${badge(claim.status)}
</button>`;

const matchRow = (match) => `<button class="dashboard-match-row" data-dashboard-match="${escapeHtml(match.id)}">
  <span class="match-side">${thumb(match.lostItem)}<span><strong>${escapeHtml(match.lostItem.name)}</strong><small>Lost • ${dashboardDate(match.lostItem.date).split(', ')[0]}</small></span></span>
  <span class="dashboard-match-score"><strong>${match.score}%</strong><small>Match</small></span>
  <span class="match-side found">${thumb(match.foundItem)}<span><strong>${escapeHtml(match.foundItem.name)}</strong><small>Found • ${dashboardDate(match.foundItem.date).split(', ')[0]}</small></span></span>
</button>`;

function activityLabel(action = '') {
  const labels = { 'found_item.create': 'New found item reported', 'lost_item.create': 'New lost item reported', 'claim.submit': 'New claim submitted', 'claim.approved': 'Claim approved', 'claim.rejected': 'Claim rejected', 'claim.returned': 'Item returned to owner', 'match.confirmed': 'Possible match confirmed', 'match.rejected': 'Possible match rejected' };
  return labels[action] || action.replace(/[._]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function dashboardPage(_state, user) {
  const canManage = ['ADMIN', 'STAFF'].includes(user.role);
  const [analytics, lostResult, foundResult, matchesResult, claims, meta, logs] = await Promise.all([
    api.get('/analytics'),
    api.get('/lost-items?page=1&limit=50'),
    api.get('/found-items?page=1&limit=50'),
    api.get('/matches'),
    api.get('/claims'),
    loadMeta(),
    user.role === 'ADMIN' ? api.get('/admin/activity-logs') : Promise.resolve([])
  ]);
  const lostItems = lostResult.items;
  const foundItems = user.role === 'USER' ? foundResult.items.filter((item) => item.reporterId === user.id) : foundResult.items;
  const matches = user.role === 'USER' ? matchesResult.filter((match) => match.lostItem?.userId === user.id) : matchesResult;
  const recent = [...lostItems.map((item) => ({ type: 'lost', item })), ...foundItems.map((item) => ({ type: 'found', item }))]
    .sort((a, b) => new Date(b.item.createdAt || b.item.date) - new Date(a.item.createdAt || a.item.date)).slice(0, 5);
  const pendingClaims = claims.filter((claim) => ['Pending', 'Under Review', 'Approved'].includes(claim.status)).slice(0, 3);
  const possibleMatches = matches.filter((match) => match.status !== 'Rejected').sort((a, b) => b.score - a.score).slice(0, 2);
  const statusData = [
    ['Open', lostItems.filter((item) => item.status === 'Open').length + foundItems.filter((item) => ['Reported', 'In Custody', 'Unclaimed'].includes(item.status)).length, '#3489df'],
    ['Match Found', [...lostItems, ...foundItems].filter((item) => item.status === 'Possible Match').length, '#45b84d'],
    ['Pending', [...lostItems, ...foundItems].filter((item) => ['Claim Submitted', 'Claim Pending'].includes(item.status)).length, '#ffa51f'],
    ['Returned', foundItems.filter((item) => item.status === 'Claimed').length, '#a965df'],
    ['Closed', lostItems.filter((item) => ['Resolved', 'Closed'].includes(item.status)).length + foundItems.filter((item) => item.status === 'Disposed').length, '#36b7c4']
  ];
  const statusTotal = statusData.reduce((sum, [, count]) => sum + count, 0);
  let cursor = 0;
  const segments = statusData.map(([, count, color]) => { const start = cursor; cursor += statusTotal ? count / statusTotal * 100 : 0; return `${color} ${start}% ${cursor}%`; }).join(', ');
  const itemByEntity = new Map([...lostItems.map((item) => [`lost:${item.id}`, item]), ...foundItems.map((item) => [`found:${item.id}`, item])]);
  const activity = logs.slice(0, 3);
  return {
    title: 'Dashboard',
    subtitle: `Welcome back, ${user.firstName}. Here’s what needs attention today.`,
    html: `<div class="dashboard-page">
      <div class="dashboard-stats">${dashboardStat('bell','blue',canManage?'Total Lost Reports':'My Lost Reports',analytics.totalLost,'Active reports',0)}${dashboardStat('shopping-bag','green',canManage?'Total Found Items':'My Found Reports',analytics.totalFound,'Items reported',1)}${dashboardStat('hand','orange','Open Claims',analytics.openClaims,'Awaiting resolution',2)}${dashboardStat('circle-check','purple','Returned Items',analytics.returned,'Successfully returned',3)}</div>
      <div class="dashboard-grid">
        <section class="panel dashboard-card status-overview"><div class="dashboard-card-head"><div><h3>Items by Status</h3><p>Current report distribution.</p></div></div><div class="status-chart-wrap"><div class="donut-chart" style="--segments:${segments || '#e6e8eb 0 100%'}"><div><small>Total</small><strong>${statusTotal}</strong></div></div><div class="status-legend">${statusData.map(([label,count,color]) => `<div><i style="--legend:${color}"></i><span>${escapeHtml(label)}</span><strong>${count}</strong><small>${statusTotal ? Math.round(count/statusTotal*100) : 0}%</small></div>`).join('')}</div><img class="dashboard-dog status-dog" src="/assets/dashboard-dog-box.png" alt="Lost and found puppy mascot"></div></section>
        <section class="panel dashboard-card quick-actions"><img class="dashboard-dog action-dog" src="/assets/dashboard-dog-detective.png" alt="Detective puppy mascot"><div class="dashboard-card-head"><div><h3><i data-lucide="circle-alert"></i>Quick Actions</h3><p>Report or document items quickly.</p></div></div><div class="quick-action-grid"><button data-new-report="found"><span class="quick-icon found"><i data-lucide="shopping-bag"></i></span><span><strong>Found item</strong><small>Report an item found</small></span></button><button data-new-report="lost"><span class="quick-icon lost"><i data-lucide="bell"></i></span><span><strong>Lost item</strong><small>Report an item lost</small></span></button></div></section>
        <section class="panel dashboard-card recent-reports"><div class="dashboard-card-head"><div><h3>Recent Reports</h3></div><button class="text-link" data-go="found-items">View all</button></div><div class="dashboard-list">${recent.length ? recent.map(reportRow).join('') : dashboardEmpty('No reports have been submitted yet.')}</div></section>
        <section class="panel dashboard-card pending-claims"><div class="dashboard-card-head"><div><h3><i data-lucide="hand"></i>Pending Claims</h3><p>Review and resolve open claims.</p></div><button class="text-link" data-go="claims">View all</button></div><div class="dashboard-list">${pendingClaims.length ? pendingClaims.map(claimRow).join('') : dashboardEmpty('No claims are waiting for review.')}</div></section>
        <section class="panel dashboard-card possible-matches"><div class="dashboard-card-head"><div><h3><i data-lucide="git-compare-arrows"></i>Possible Matches</h3><p>Items that might belong together.</p></div><button class="text-link" data-go="matches">View all</button></div><div class="dashboard-list">${possibleMatches.length ? possibleMatches.map(matchRow).join('') : dashboardEmpty('No possible matches right now.')}</div></section>
        ${user.role === 'ADMIN' ? `<section class="panel dashboard-card recent-activity"><div class="dashboard-card-head"><div><h3><i data-lucide="notebook-tabs"></i>Recent Activity</h3><p>Latest actions across the system.</p></div><button class="text-link" data-go="activity">View all activity</button></div><div class="activity-list">${activity.length ? activity.map((log, index) => { const item = itemByEntity.get(`${log.entityType}:${log.entityId}`); return `<div><i class="activity-dot dot-${index}"></i><strong>${escapeHtml(activityLabel(log.action))}</strong><span>${escapeHtml(item?.name || `${log.entityType || 'Record'} #${log.entityId || '—'}`)}</span><span>${escapeHtml(`${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim() || 'System')}</span><time>${dashboardDate(log.createdAt)}</time></div>`; }).join('') : dashboardEmpty('No activity has been recorded yet.')}</div></section>` : ''}
      </div>
    </div>`,
    bind: () => {
      const reload = () => window.renderRoute();
      document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => window.go(button.dataset.go)));
      document.querySelector('[data-new-report="found"]')?.addEventListener('click', () => openItemForm('found', meta, null, reload));
      document.querySelector('[data-new-report="lost"]')?.addEventListener('click', () => openItemForm('lost', meta, null, reload));
      document.querySelectorAll('[data-dashboard-claim]').forEach((button) => button.addEventListener('click', () => reviewClaim(claims.find((claim) => claim.id === Number(button.dataset.dashboardClaim)), user)));
      document.querySelectorAll('[data-dashboard-match]').forEach((button) => button.addEventListener('click', () => openCompare(matches.find((match) => match.id === button.dataset.dashboardMatch), user, reload)));
    }
  };
}

export async function adminListPage(route,user){
  if(route==='reports') return dashboardPage({},user);
  if(route==='settings') return {title:'System Settings',subtitle:'Application configuration and account controls.',html:`<div class="cards-grid"><section class="panel feature-card"><i data-lucide="database"></i><h3>Storage mode</h3><p class="muted">Set DB_MODE=sql for SQL Server deployment.</p></section><section class="panel feature-card"><i data-lucide="shield-check"></i><h3>Session security</h3><p class="muted">HTTP-only, same-site sessions are enabled.</p></section><section class="panel feature-card"><i data-lucide="log-out"></i><h3>Account</h3><button class="btn btn-danger" data-logout-page>Log out</button></section></div>`,bind:()=>document.querySelector('[data-logout-page]').addEventListener('click',()=>document.querySelector('[data-action="logout"]').click())};
  if(route==='activity'){const logs=await api.get('/admin/activity-logs');return simpleTable('Activity Logs','Review important staff and administrative actions.',['ACTION','ENTITY','USER','TIME'],logs.map(l=>[escapeHtml(l.action),`${escapeHtml(l.entityType)} #${l.entityId}`,escapeHtml(`${l.user.firstName||''} ${l.user.lastName||''}`),formatDate(l.createdAt)]));}
  if(route==='users') return manageUsersPage(await api.get('/admin/users'));
  return manageMetaPage(route,await api.get(`/${route}`));
}
function simpleTable(title,subtitle,headers,rows){return {title,subtitle,html:`<div class="panel list-panel">${rows.length?`<table class="data-table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`:empty(`No ${title.toLowerCase()} yet`,'New records will appear here.')}</div>`,bind:()=>{}};}
function manageUsersPage(users){return {title:'Users',subtitle:'Manage system access and role assignments.',html:`<div class="panel list-panel"><div class="toolbar"><button class="btn btn-primary" data-new-user><i data-lucide="plus"></i>Add User</button></div><table class="data-table"><thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${users.map(u=>`<tr><td>${escapeHtml(`${u.firstName} ${u.lastName}`)}</td><td>${escapeHtml(u.email)}</td><td>${badge(u.role)}</td><td>${escapeHtml(u.status)}</td><td><div class="action-row"><button class="action-btn" data-edit-user="${u.id}"><i data-lucide="pencil"></i></button><button class="action-btn" data-disable-user="${u.id}" ${u.status==='Inactive'?'disabled':''}><i data-lucide="user-x"></i></button></div></td></tr>`).join('')}</tbody></table></div>`,bind:()=>{document.querySelector('[data-new-user]').addEventListener('click',()=>openUserEditor(null));document.querySelectorAll('[data-edit-user]').forEach(b=>b.addEventListener('click',()=>openUserEditor(users.find(u=>u.id===Number(b.dataset.editUser)))));document.querySelectorAll('[data-disable-user]').forEach(b=>b.addEventListener('click',async()=>{if(confirm('Deactivate this user account?')){await api.delete(`/admin/users/${b.dataset.disableUser}`);toast('User deactivated');window.renderRoute();}}));}};}
function openUserEditor(user){const close=openModal(user?'Edit User':'Add User',`<form id="user-form"><div class="form-grid"><div class="field"><label>First name *</label><input name="firstName" value="${escapeHtml(user?.firstName)}" required></div><div class="field"><label>Last name *</label><input name="lastName" value="${escapeHtml(user?.lastName)}" required></div><div class="field full"><label>Email *</label><input type="email" name="email" value="${escapeHtml(user?.email)}" required></div><div class="field"><label>Role</label><select name="role">${['USER','STAFF','ADMIN'].map(role=>`<option ${user?.role===role?'selected':''}>${role}</option>`).join('')}</select></div><div class="field"><label>Password ${user?'(leave blank to keep)':'*'}</label><input type="password" name="password" ${user?'':'required'}></div></div><div class="form-actions"><button class="btn btn-primary">Save User</button></div></form>`, { fixed: true });const form=document.querySelector('#user-form');form.addEventListener('submit',async event=>{event.preventDefault();const body=Object.fromEntries(new FormData(form));if(!body.password)delete body.password;try{user?await api.put(`/admin/users/${user.id}`,body):await api.post('/admin/users',body);toast(`User ${user?'updated':'created'}`);close();window.renderRoute();}catch(error){toast(error.message,'error')}});}
function manageMetaPage(route,rows){const title=route[0].toUpperCase()+route.slice(1);return {title,subtitle:`Manage active ${route} used by reports.`,html:`<div class="panel list-panel"><div class="toolbar"><button class="btn btn-primary" data-new-meta><i data-lucide="plus"></i>Add ${route==='categories'?'Category':'Location'}</button></div><table class="data-table"><thead><tr><th>NAME</th><th>DESCRIPTION</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.description||'—')}</td><td>${badge(row.status)}</td><td><div class="action-row"><button class="action-btn" data-edit-meta="${row.id}"><i data-lucide="pencil"></i></button><button class="action-btn" data-delete-meta="${row.id}"><i data-lucide="trash-2"></i></button></div></td></tr>`).join('')}</tbody></table></div>`,bind:()=>{document.querySelector('[data-new-meta]').addEventListener('click',()=>openMetaEditor(route,null));document.querySelectorAll('[data-edit-meta]').forEach(b=>b.addEventListener('click',()=>openMetaEditor(route,rows.find(row=>row.id===Number(b.dataset.editMeta)))));document.querySelectorAll('[data-delete-meta]').forEach(b=>b.addEventListener('click',async()=>{if(confirm('Delete this record?'))try{await api.delete(`/${route}/${b.dataset.deleteMeta}`);toast('Record deleted');window.renderRoute();}catch(error){toast(error.message,'error')}}));}};}
function openMetaEditor(route,row){const label=route==='categories'?'Category':'Location';const close=openModal(`${row?'Edit':'Add'} ${label}`,`<form id="meta-form"><div class="field"><label>Name *</label><input name="name" value="${escapeHtml(row?.name)}" required></div><div class="field"><label>Description</label><textarea name="description">${escapeHtml(row?.description)}</textarea></div><div class="field"><label>Status</label><select name="status"><option ${row?.status!=='Inactive'?'selected':''}>Active</option><option ${row?.status==='Inactive'?'selected':''}>Inactive</option></select></div><div class="form-actions"><button class="btn btn-primary">Save ${label}</button></div></form>`, { fixed: true });const form=document.querySelector('#meta-form');form.addEventListener('submit',async event=>{event.preventDefault();try{row?await api.put(`/${route}/${row.id}`,Object.fromEntries(new FormData(form))):await api.post(`/${route}`,Object.fromEntries(new FormData(form)));toast(`${label} saved`);close();window.renderRoute();}catch(error){toast(error.message,'error')}});}

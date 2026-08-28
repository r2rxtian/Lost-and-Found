export const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
export const formatDate = (value, time = false) => {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '—';
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${time ? `<br>${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}` : ''}`;
};
export const statusTone = (status = '') => status.includes('Match') || status === 'Pending' ? 'warning' : ['Claimed', 'Returned', 'Resolved', 'Approved', 'Confirmed', 'Unclaimed'].includes(status) ? 'success' : ['Claim Pending', 'Under Review'].includes(status) ? 'purple' : ['Rejected', 'Disposed'].includes(status) ? 'danger' : 'neutral';
export const iconForCategory = (category = '') => ({ Wallet: 'wallet-cards', Keys: 'key-round', Bag: 'backpack', Phone: 'smartphone', Accessories: 'glasses', Electronics: 'laptop' })[category] || 'package';
export function toast(message, tone = 'success') { const region = document.querySelector('#toast-region'); const element = document.createElement('div'); element.className = `toast ${tone}`; element.innerHTML = `<i data-lucide="${tone === 'error' ? 'circle-alert' : 'circle-check'}"></i><span>${escapeHtml(message)}</span>`; region.append(element); window.refreshIcons?.(); setTimeout(() => element.remove(), 3600); }
export const initials = (user) => `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

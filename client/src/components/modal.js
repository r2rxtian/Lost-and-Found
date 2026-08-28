export function openModal(title, body, { wide = false } = {}) {
  const root = document.querySelector('#modal-root');
  root.innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><h3 id="modal-title">${title}</h3><button class="modal-close" aria-label="Close dialog"><i data-lucide="x"></i></button></header><div class="modal-body">${body}</div></section></div>`;
  const close = () => { root.innerHTML = ''; document.removeEventListener('keydown', escape); };
  const escape = (event) => { if (event.key === 'Escape') close(); };
  root.querySelector('.modal-close').addEventListener('click', close);
  root.querySelector('.modal-backdrop').addEventListener('click', (event) => { if (event.target.classList.contains('modal-backdrop')) close(); });
  document.addEventListener('keydown', escape); window.refreshIcons?.(); root.querySelector('input, select, textarea, button')?.focus();
  return close;
}

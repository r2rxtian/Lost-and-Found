import { api } from '../services/api.js';
import { escapeHtml, toast } from '../utils.js';
import { openModal } from './modal.js';

export function openItemForm(type, meta, existing, onSaved) {
  const word = type === 'found' ? 'Found' : 'Lost';
  const item = existing || {};
  const body = `<form id="item-form"><div class="form-grid">
    <div class="field"><label>Item Name *</label><input name="name" value="${escapeHtml(item.name)}" required></div>
    <div class="field"><label>Category *</label><select name="category" required><option value="">Select category</option>${meta.categories.map((entry) => `<option ${item.category === entry.name ? 'selected' : ''}>${escapeHtml(entry.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Color</label><input name="color" value="${escapeHtml(item.color)}"></div><div class="field"><label>Brand</label><input name="brand" value="${escapeHtml(item.brand)}"></div>
    <div class="field"><label>${word} Location *</label><select name="location" required><option value="">Select location</option>${meta.locations.map((entry) => `<option ${item.location === entry.name ? 'selected' : ''}>${escapeHtml(entry.name)}</option>`).join('')}</select></div>
    <div class="field"><label>${word} Date &amp; Time *</label><input name="date" type="datetime-local" value="${item.date ? new Date(item.date).toISOString().slice(0,16) : ''}" required></div>
    <div class="field full"><label>Description *</label><textarea name="description" required>${escapeHtml(item.description)}</textarea></div>
    <div class="field full"><label>Private Verification Details</label><textarea name="privateDetails">${escapeHtml(item.privateDetails)}</textarea><small>Enter identifying details that should NOT be shown publicly, such as exact contents, serial numbers, unique markings, or damage.</small></div>
    ${type === 'found' ? `<div class="field"><label>Custody Status</label><select name="custodyStatus"><option>In Custody</option><option>With Finder</option><option>Transferred</option></select></div>` : ''}
    ${existing ? `<div class="field"><label>Status</label><select name="status">${(type === 'found' ? ['Reported','In Custody','Unclaimed','Possible Match','Claim Pending','Claimed','Disposed'] : ['Open','Possible Match','Claim Submitted','Resolved','Closed']).map((status) => `<option ${item.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>` : ''}
    <div class="field full"><label>${existing ? 'Replace Photo' : type === 'found' ? 'Upload Photo' : 'Optional Photo'}</label><label class="upload-zone" id="upload-zone"><input hidden type="file" name="image" accept="image/jpeg,image/png,image/webp"><div id="upload-copy"><i data-lucide="image-up"></i><p>Drop an image here or click to browse</p><small>JPG, PNG, or WEBP · up to 5 MB</small></div></label></div>
  </div><div class="form-actions"><button type="button" class="btn btn-ghost" data-cancel>Cancel</button><button class="btn btn-primary" type="submit">${existing ? 'Save Changes' : `Report ${word} Item`}</button></div></form>`;
  const close = openModal(`${existing ? 'Edit' : 'Report'} ${word} Item`, body);
  const form = document.querySelector('#item-form'); const input = form.elements.image; const zone = form.querySelector('#upload-zone');
  const preview = (file) => { if (!file) return; if (file.size > 5 * 1024 * 1024) { input.value = ''; return toast('Image must be 5 MB or smaller', 'error'); } const url = URL.createObjectURL(file); form.querySelector('#upload-copy').innerHTML = `<img class="upload-preview" src="${url}" alt="Selected image"><small>${escapeHtml(file.name)}</small>`; };
  input.addEventListener('change', () => preview(input.files[0]));
  ['dragenter','dragover'].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.add('dragging'); }));
  ['dragleave','drop'].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.remove('dragging'); }));
  zone.addEventListener('drop', (event) => { if (event.dataTransfer.files[0]) { const transfer = new DataTransfer(); transfer.items.add(event.dataTransfer.files[0]); input.files = transfer.files; preview(input.files[0]); } });
  form.querySelector('[data-cancel]').addEventListener('click', close);
  form.addEventListener('submit', async (event) => { event.preventDefault(); const submit = form.querySelector('[type="submit"]'); submit.disabled = true; try { const values = Object.fromEntries(new FormData(form)); delete values.image; if (existing) await api.put(`/${type}-items/${existing.id}`, values); else { const payload = new FormData(); payload.append('payload', JSON.stringify(values)); if (input.files[0]) payload.append('image', input.files[0]); await api.post(`/${type}-items`, payload); } toast(`${word} item ${existing ? 'updated' : 'reported'} successfully`); close(); await onSaved(); } catch (error) { toast(error.message, 'error'); submit.disabled = false; } });
}

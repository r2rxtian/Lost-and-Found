import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('auth, privacy, authorization and CRUD workflow', async () => {
  const testFile = path.resolve('data/integration-test-store.json');
  process.env.DEMO_DATA_FILE = testFile;
  const { default: app } = await import('./app.js');
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = '';
  const call = async (url, options = {}) => {
    const response = await fetch(`${base}${url}`, { ...options, headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...options.headers } });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return { response, body: response.status === 204 ? null : await response.json() };
  };
  try {
    let result = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: 'user@lostfound.test', password: 'User123!' }) });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.user.role, 'USER');
    result = await call('/found-items?search=wallet');
    assert.equal(result.body.total, 1);
    assert.equal('privateDetails' in result.body.items[0], false);
    result = await call('/admin/activity-logs');
    assert.equal(result.response.status, 403);
    result = await call('/lost-items', { method: 'POST', body: JSON.stringify({ name: 'Test Folder', category: 'Documents', location: 'Library - 2nd Floor', date: '2026-08-29T12:00:00+08:00', description: 'Integration test report.' }) });
    assert.equal(result.response.status, 201);
    const id = result.body.id;
    result = await call(`/lost-items/${id}`, { method: 'DELETE' });
    assert.equal(result.response.status, 204);
    result = await call('/found-items', { method: 'POST', body: JSON.stringify({ name: 'Test Key Tag', category: 'Keys', location: 'Main Entrance', date: '2026-08-29T12:00:00+08:00', description: 'Integration upload test report.' }) });
    assert.equal(result.body.status, 'Reported');
    const foundId = result.body.id;
    const form = new FormData();
    form.append('images', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ', 'base64')], { type: 'image/png' }), 'pixel.png');
    let uploadResponse = await fetch(`${base}/found-items/${foundId}/images`, { method: 'POST', headers: { cookie }, body: form });
    assert.equal(uploadResponse.status, 201);
    const uploaded = await uploadResponse.json();
    const uploadedPath = path.resolve(`.${uploaded.images[0]}`);
    const badForm = new FormData(); badForm.append('images', new Blob(['not an image'], { type: 'text/plain' }), 'notes.txt');
    uploadResponse = await fetch(`${base}/found-items/${foundId}/images`, { method: 'POST', headers: { cookie }, body: badForm });
    assert.equal(uploadResponse.status, 415);
    result = await call(`/found-items/${foundId}`, { method: 'DELETE' });
    assert.equal(result.response.status, 204);
    await fs.rm(uploadedPath, { force: true });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(testFile, { force: true });
  }
});

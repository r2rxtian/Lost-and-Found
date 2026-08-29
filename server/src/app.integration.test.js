import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const runSqlIntegration = process.env.RUN_SQL_INTEGRATION === '1';

test('SQL auth, privacy, authorization, CRUD and upload workflow', { skip: !runSqlIntegration }, async () => {
  const [{ default: app, store }, { getPool }] = await Promise.all([import('./app.js'), import('./config/database.js')]);
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const password = 'Integration123!';
  let admin;
  let user;
  let location;
  let uploadedPath;
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  let cookie = '';
  const call = async (url, options = {}) => {
    const isForm = options.body instanceof FormData;
    const response = await fetch(`${base}${url}`, { ...options, headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { cookie } : {}), ...options.headers } });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return { response, body: response.status === 204 ? null : await response.json() };
  };
  try {
    admin = await store.addUser({ firstName: 'Integration', lastName: 'Admin', email: `integration-admin-${suffix}@test.local`, password, role: 'ADMIN' });
    user = await store.addUser({ firstName: 'Integration', lastName: 'User', email: `integration-user-${suffix}@test.local`, password, role: 'USER' });

    let result = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: admin.email, password }) });
    assert.equal(result.response.status, 200);
    result = await call('/locations', { method: 'POST', body: JSON.stringify({ name: `Integration Location ${suffix}`, description: 'Temporary automated-test location', status: 'Active' }) });
    assert.equal(result.response.status, 201);
    location = result.body;
    result = await call('/locations', { method: 'POST', body: JSON.stringify({ name: location.name, description: 'Duplicate location', status: 'Active' }) });
    assert.equal(result.response.status, 409);
    assert.match(result.body.error, /already exists/i);

    cookie = '';
    result = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: user.email, password }) });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.user.role, 'USER');
    result = await call('/admin/activity-logs');
    assert.equal(result.response.status, 403);

    result = await call('/lost-items', { method: 'POST', body: JSON.stringify({ name: 'Integration Test Document Folder', category: 'Documents', color: 'Blue', brand: 'Test Brand', location: location.name, date: '2026-08-29T12:00:00+08:00', description: 'Blue document folder with a white label.', privateDetails: 'This must remain private.' }) });
    assert.equal(result.response.status, 201);
    const lostId = result.body.id;
    result = await call('/lost-items');
    assert.equal('privateDetails' in result.body.items.find((item) => item.id === lostId), false);

    cookie = '';
    result = await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: admin.email, password }) });
    assert.equal(result.body.user.role, 'ADMIN');
    result = await call('/found-items', { method: 'POST', body: JSON.stringify({ name: 'Integration Test Document Folder', category: 'Documents', color: 'Blue', brand: 'Test Brand', location: location.name, date: '2026-08-29T12:20:00+08:00', description: 'Blue document folder with a white label.', privateDetails: 'Temporary private mark.' }) });
    assert.equal(result.body.status, 'Unclaimed');
    const foundId = result.body.id;
    const form = new FormData();
    form.append('images', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ', 'base64')], { type: 'image/png' }), 'pixel.png');
    const uploadResponse = await fetch(`${base}/found-items/${foundId}/images`, { method: 'POST', headers: { cookie }, body: form });
    assert.equal(uploadResponse.status, 201);
    const uploaded = await uploadResponse.json();
    uploadedPath = path.resolve(`.${uploaded.images[0]}`);
    result = await call('/matches');
    const match = result.body.find((entry) => entry.lostItemId === lostId && entry.foundItemId === foundId);
    assert.ok(match.score >= 80);
    result = await call(`/matches/${match.id}/confirm`, { method: 'POST', body: '{}' });
    assert.equal(result.body.status, 'Confirmed');

    cookie = '';
    await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: user.email, password }) });
    result = await call('/claims', { method: 'POST', body: JSON.stringify({ foundItemId: foundId, answers: { brand: 'Test Brand', contents: 'Documents', marks: 'White label' } }) });
    assert.equal(result.body.status, 'Pending');
    const claimId = result.body.id;

    cookie = '';
    await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: admin.email, password }) });
    result = await call(`/claims/${claimId}/approve`, { method: 'POST', body: '{}' });
    assert.equal(result.body.status, 'Approved');
    result = await call(`/claims/${claimId}/return`, { method: 'POST', body: '{}' });
    assert.equal(result.body.status, 'Returned');
    result = await call(`/found-items/${foundId}`);
    assert.equal(result.body.status, 'Claimed');
    result = await call(`/lost-items/${lostId}`);
    assert.equal(result.body.status, 'Resolved');
    result = await call(`/found-items/${foundId}`, { method: 'DELETE' });
    assert.equal(result.response.status, 204);
    result = await call(`/lost-items/${lostId}`, { method: 'DELETE' });
    assert.equal(result.response.status, 204);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    if (uploadedPath) await fs.rm(uploadedPath, { force: true });
    const pool = await getPool();
    if (admin && user) {
      const request = pool.request(); request.input('adminId', admin.id); request.input('userId', user.id);
      await request.query(`
        DELETE lf_claim_verification WHERE claim_id IN (SELECT claim_id FROM lf_claims WHERE claimant_user_id IN (@adminId,@userId) OR found_item_id IN (SELECT found_item_id FROM lf_found_items WHERE reported_by_user_id IN (@adminId,@userId)));
        DELETE lf_claims WHERE claimant_user_id IN (@adminId,@userId) OR found_item_id IN (SELECT found_item_id FROM lf_found_items WHERE reported_by_user_id IN (@adminId,@userId));
        DELETE lf_matches WHERE lost_item_id IN (SELECT lost_item_id FROM lf_lost_items WHERE user_id IN (@adminId,@userId)) OR found_item_id IN (SELECT found_item_id FROM lf_found_items WHERE reported_by_user_id IN (@adminId,@userId));
        DELETE lf_item_images WHERE (item_type='lost' AND item_id IN (SELECT lost_item_id FROM lf_lost_items WHERE user_id IN (@adminId,@userId))) OR (item_type='found' AND item_id IN (SELECT found_item_id FROM lf_found_items WHERE reported_by_user_id IN (@adminId,@userId)));
        DELETE lf_found_items WHERE reported_by_user_id IN (@adminId,@userId);
        DELETE lf_lost_items WHERE user_id IN (@adminId,@userId);
        DELETE lf_activity_logs WHERE user_id IN (@adminId,@userId);
        DELETE lf_users WHERE user_id IN (@adminId,@userId);
      `);
    }
    if (location) { const request = pool.request(); request.input('locationId', location.id); await request.query('DELETE lf_locations WHERE location_id=@locationId'); }
    await pool.close();
  }
});

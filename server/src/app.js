import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'node:path';
import { SqlStore } from './services/sqlStore.js';
import { requireAuth, allowRoles } from './middleware/auth.js';
import { upload } from './middleware/upload.js';
import { validateItem } from './utils/validators.js';

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) throw new Error('SESSION_SECRET must be configured with at least 32 characters');
export const store = new SqlStore();
await store.init();
const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({ name: 'lf.sid', secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 } }));
app.use('/uploads', express.static(path.resolve('uploads'), { fallthrough: false }));

app.get('/api/health', (_req, res) => res.json({ ok: true, database: 'sqlserver' }));
app.post('/api/auth/login', async (req, res) => { const user = await store.authenticate(req.body.email || '', req.body.password || ''); if (!user) return res.status(401).json({ error: 'Invalid email or password' }); req.session.user = user; res.json({ user }); });
app.post('/api/auth/logout', requireAuth, (req, res, next) => req.session.destroy((error) => error ? next(error) : res.status(204).end()));
app.get('/api/auth/me', (req, res) => req.session.user ? res.json({ user: req.session.user }) : res.status(401).json({ error: 'Not signed in' }));

const itemPermission = (type) => (req, res, next) => {
  if (['STAFF', 'ADMIN'].includes(req.session.user.role)) return next();
  const item = store.data[type === 'found' ? 'foundItems' : 'lostItems'].find((entry) => entry.id === Number(req.params.id));
  const ownerId = type === 'found' ? item?.reporterId : item?.userId;
  if (!item || ownerId !== req.session.user.id) return res.status(403).json({ error: `You can only change your own ${type} reports` });
  next();
};
for (const type of ['found', 'lost']) {
  app.get(`/api/${type}-items`, requireAuth, (req, res) => res.json(store.list(type, { user: req.session.user, ...req.query })));
  app.get(`/api/${type}-items/:id`, requireAuth, (req, res) => { const item = store.get(type, req.params.id, req.session.user); item ? res.json(item) : res.status(404).json({ error: 'Item not found' }); });
  app.post(`/api/${type}-items`, requireAuth, upload.single('image'), async (req, res, next) => { try { const body = JSON.parse(req.body.payload || JSON.stringify(req.body)); const errors = validateItem(body, type); if (errors.length) return res.status(422).json({ error: errors.join('. '), fields: errors }); res.status(201).json(await store.create(type, body, req.session.user, req.file)); } catch (error) { next(error); } });
  app.put(`/api/${type}-items/:id`, requireAuth, itemPermission(type), async (req, res, next) => { try { const body = { ...req.body }; if (req.session.user.role === 'USER') { const current = store.data[type === 'found' ? 'foundItems' : 'lostItems'].find((entry) => entry.id === Number(req.params.id)); body.status = current.status; if (type === 'found') body.custodyStatus = current.custodyStatus; delete body.privateDetails; } const errors = validateItem(body, type); if (errors.length) return res.status(422).json({ error: errors.join('. ') }); const item = await store.update(type, req.params.id, body, req.session.user); item ? res.json(item) : res.status(404).json({ error: 'Item not found' }); } catch (error) { next(error); } });
  app.delete(`/api/${type}-items/:id`, requireAuth, itemPermission(type), async (req, res) => (await store.remove(type, req.params.id, req.session.user)) ? res.status(204).end() : res.status(404).json({ error: 'Item not found' }));
}
app.post('/api/found-items/:id/images', requireAuth, itemPermission('found'), upload.array('images', 4), async (req, res) => { if (!req.files?.length) return res.status(422).json({ error: 'At least one image is required' }); const images = await store.attachImages('found', req.params.id, req.files, req.session.user); images ? res.status(201).json({ images }) : res.status(404).json({ error: 'Item not found' }); });

app.get('/api/matches', requireAuth, (req, res) => res.json(store.getMatches({ user: req.session.user, ...req.query })));
app.get('/api/matches/:id', requireAuth, (req, res) => { const match = store.getMatches({ user: req.session.user }).find((entry) => entry.id === req.params.id); match ? res.json(match) : res.status(404).json({ error: 'Match not found' }); });
app.post('/api/matches/:id/confirm', allowRoles('STAFF', 'ADMIN'), async (req, res) => res.json(await store.setMatch(req.params.id, 'Confirmed', req.session.user)));
app.post('/api/matches/:id/reject', allowRoles('STAFF', 'ADMIN'), async (req, res) => res.json(await store.setMatch(req.params.id, 'Rejected', req.session.user)));

app.get('/api/claims', requireAuth, (req, res) => res.json(store.listClaims(req.session.user, req.query.status)));
app.get('/api/claims/:id', requireAuth, (req, res) => { const claim = store.listClaims(req.session.user).find((entry) => entry.id === Number(req.params.id)); claim ? res.json(claim) : res.status(404).json({ error: 'Claim not found' }); });
app.post('/api/claims', requireAuth, async (req, res, next) => { try { if (!req.body.foundItemId || !req.body.answers) return res.status(422).json({ error: 'Item and verification answers are required' }); res.status(201).json(await store.createClaim(req.body, req.session.user)); } catch (error) { next(error); } });
app.post('/api/claims/:id/approve', allowRoles('STAFF', 'ADMIN'), async (req, res) => res.json(await store.transitionClaim(req.params.id, 'Approved', req.session.user)));
app.post('/api/claims/:id/reject', allowRoles('STAFF', 'ADMIN'), async (req, res) => { if (!req.body.reason?.trim()) return res.status(422).json({ error: 'A rejection reason is required' }); res.json(await store.transitionClaim(req.params.id, 'Rejected', req.session.user, req.body.reason)); });
app.post('/api/claims/:id/return', allowRoles('STAFF', 'ADMIN'), async (req, res) => res.json(await store.transitionClaim(req.params.id, 'Returned', req.session.user)));

app.get('/api/categories', requireAuth, (_req, res) => res.json(store.meta().categories));
app.get('/api/locations', requireAuth, (_req, res) => res.json(store.meta().locations));
for (const type of ['categories', 'locations']) {
  app.post(`/api/${type}`, allowRoles('ADMIN'), async (req, res, next) => {
    try {
      const body = normalizeMeta(req.body);
      const error = validateMeta(body, type);
      if (error) return res.status(422).json({ error });
      res.status(201).json(await store.metaCreate(type, body, req.session.user));
    } catch (error) { next(error); }
  });
  app.put(`/api/${type}/:id`, allowRoles('ADMIN'), async (req, res, next) => {
    try {
      const body = normalizeMeta(req.body);
      const error = validateMeta(body, type);
      if (error) return res.status(422).json({ error });
      const updated = await store.metaUpdate(type, req.params.id, body, req.session.user);
      updated ? res.json(updated) : res.status(404).json({ error: 'Record not found' });
    } catch (error) { next(error); }
  });
  app.delete(`/api/${type}/:id`, allowRoles('ADMIN'), async (req, res, next) => { try { (await store.metaDelete(type, req.params.id, req.session.user)) ? res.status(204).end() : res.status(404).json({ error: 'Record not found' }); } catch (error) { next(error); } });
}
app.get('/api/admin/users', allowRoles('ADMIN'), (_req, res) => res.json(store.users()));
app.post('/api/admin/users', allowRoles('ADMIN'), async (req, res, next) => { try { if (!req.body.firstName?.trim() || !req.body.lastName?.trim() || !req.body.email?.trim() || !req.body.password || !['USER','STAFF','ADMIN'].includes(req.body.role)) return res.status(422).json({ error: 'First name, last name, email, password, and a valid role are required' }); const created = await store.addUser(req.body); await store.log(req.session.user.id, 'user.create', 'user', created.id); res.status(201).json(created); } catch (error) { next(error); } });
app.put('/api/admin/users/:id', allowRoles('ADMIN'), async (req, res, next) => { try { if (req.body.role && !['USER','STAFF','ADMIN'].includes(req.body.role)) return res.status(422).json({ error: 'Invalid role' }); const updated = await store.updateUser(req.params.id, req.body); if (!updated) return res.status(404).json({ error: 'User not found' }); await store.log(req.session.user.id, 'user.update', 'user', updated.id); res.json(updated); } catch (error) { next(error); } });
app.delete('/api/admin/users/:id', allowRoles('ADMIN'), async (req, res, next) => { try { if (Number(req.params.id) === req.session.user.id) return res.status(409).json({ error: 'You cannot deactivate your own active session' }); if (!(await store.disableUser(req.params.id))) return res.status(404).json({ error: 'User not found' }); await store.log(req.session.user.id, 'user.update', 'user', Number(req.params.id), 'Account deactivated'); res.status(204).end(); } catch (error) { next(error); } });
app.get('/api/admin/activity-logs', allowRoles('ADMIN'), (_req, res) => res.json(store.logs()));
app.get('/api/analytics', requireAuth, (req, res) => res.json(store.analytics(req.session.user)));

function normalizeMeta(body = {}) {
  return { name: String(body.name || '').trim(), description: String(body.description || '').trim(), status: body.status || 'Active' };
}

function validateMeta(body, type) {
  const label = type === 'locations' ? 'Location' : 'Category';
  const maxName = type === 'locations' ? 150 : 100;
  if (!body.name) return `${label} name is required`;
  if (body.name.length > maxName) return `${label} name must be ${maxName} characters or fewer`;
  if (body.description.length > 500) return 'Description must be 500 characters or fewer';
  if (!['Active', 'Inactive'].includes(body.status)) return 'Status must be Active or Inactive';
  return null;
}

app.use((error, _req, res, _next) => { const uploadTypeError = error.message?.startsWith('Only JPG'); const sqlNumber = error.number ?? error.originalError?.info?.number ?? error.precedingErrors?.find((entry) => entry.number)?.number; const duplicate = [2601, 2627].includes(sqlNumber); const status = error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : uploadTypeError ? 415 : duplicate ? 409 : 500); if (status >= 500) console.error(error); res.status(status).json({ error: duplicate ? 'A record with that name already exists' : error.message || 'Unexpected server error' }); });
export default app;

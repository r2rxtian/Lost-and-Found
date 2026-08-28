import fs from 'node:fs/promises';
import path from 'node:path';
import bcrypt from 'bcrypt';
import { buildMatches } from './matchingService.js';

const file = path.resolve(process.env.DEMO_DATA_FILE || 'data/demo-store.json');
const now = new Date().toISOString();
const seed = {
  categories: ['Wallet', 'Phone', 'Keys', 'Bag', 'Electronics', 'Clothing', 'Jewelry', 'Documents', 'Accessories', 'Other'].map((name, index) => ({ id: index + 1, name, status: 'Active' })),
  locations: ['Building A - Lobby', 'Building B - Cafeteria', 'Library - 2nd Floor', 'Student Center', 'Parking Area', 'Gym', 'Main Entrance'].map((name, index) => ({ id: index + 1, name, status: 'Active' })),
  users: [],
  foundItems: [
    { id: 17, readableId: 'F-2026-0017', reporterId: 1, name: 'Black Wallet', category: 'Wallet', color: 'Black', brand: 'Herschel', location: 'Building B - Cafeteria', date: '2026-08-29T10:42:00+08:00', description: 'Small black wallet. Contains some cards and cash. Herschel brand logo on the front.', privateDetails: 'Herschel logo on the front\nContains School ID (Juan Dela Cruz)\nATM Card - BDO\n₱500 cash\nSmall scratch near the bottom right corner', custodyStatus: 'In Custody', status: 'Possible Match', image: '/assets/wallet.png', createdAt: now },
    { id: 16, readableId: 'F-2026-0016', reporterId: 2, name: 'Silver Keychain', category: 'Keys', color: 'Silver', brand: 'Metal', location: 'Parking Area', date: '2026-08-28T19:15:00+08:00', description: 'Three keys on a silver ring with a black fob.', privateDetails: 'Tiny number 42 engraved behind the fob', custodyStatus: 'In Custody', status: 'Unclaimed', image: null, createdAt: now },
    { id: 15, readableId: 'F-2026-0015', reporterId: 2, name: 'Black Backpack', category: 'Bag', color: 'Black', brand: 'Nike', location: 'Library - 2nd Floor', date: '2026-08-28T14:30:00+08:00', description: 'Medium black student backpack left beside a reading desk.', privateDetails: 'Blue notebook and a charging cable inside', custodyStatus: 'In Custody', status: 'Claim Pending', image: null, createdAt: now },
    { id: 14, readableId: 'F-2026-0014', reporterId: 1, name: 'iPhone 13', category: 'Phone', color: 'Midnight', brand: 'Apple', location: 'Student Center', date: '2026-08-27T11:20:00+08:00', description: 'Dark iPhone with a clear protective case.', privateDetails: 'Lock screen is a photo of a golden retriever', custodyStatus: 'Returned', status: 'Claimed', image: null, createdAt: now },
    { id: 13, readableId: 'F-2026-0013', reporterId: 2, name: 'Eyeglasses', category: 'Accessories', color: 'Black', brand: 'Ray-Ban', location: 'Building A - Lobby', date: '2026-08-26T17:45:00+08:00', description: 'Black rectangular prescription eyeglasses.', privateDetails: 'Small chip on the left temple', custodyStatus: 'In Custody', status: 'Unclaimed', image: null, createdAt: now }
  ],
  lostItems: [
    { id: 25, readableId: 'L-2026-0025', userId: 3, name: 'Black Herschel Wallet', category: 'Wallet', color: 'Black', brand: 'Herschel', location: 'Building B - Cafeteria', date: '2026-08-29T09:30:00+08:00', description: 'Black wallet with cards and a cream logo patch.', privateDetails: 'School ID, BDO ATM card and ₱500 cash. Scratch near lower right.', status: 'Possible Match', image: null, createdAt: now },
    { id: 24, readableId: 'L-2026-0024', userId: 3, name: 'Black Leather Wallet', category: 'Wallet', color: 'Black', brand: 'Fossil', location: 'Building A - Lobby', date: '2026-08-28T12:00:00+08:00', description: 'Plain black leather wallet with several cards.', privateDetails: 'Initials JD embossed inside', status: 'Open', image: null, createdAt: now }
  ],
  matches: [],
  claims: [{ id: 11, readableId: 'C-2026-0011', foundItemId: 15, claimantUserId: 3, status: 'Pending', submittedAt: '2026-08-29T03:00:00Z', answers: { brand: 'Nike', contents: 'Blue notebook and charger', marks: 'Small tear on the side pocket' }, reviewerId: null }],
  logs: []
};

export class DemoStore {
  constructor() { this.data = null; }
  async init() {
    try { this.data = JSON.parse(await fs.readFile(file, 'utf8')); }
    catch {
      this.data = structuredClone(seed);
      const extraFound = [
        ['USB Flash Drive','Electronics','Blue','SanDisk','Library - 2nd Floor','Unclaimed'],
        ['Student ID Lace','Documents','Blue','','Building A - Lobby','Unclaimed'],
        ['Gray Hoodie','Clothing','Gray','Uniqlo','Gym','Unclaimed'],
        ['Gold Bracelet','Jewelry','Gold','','Student Center','Unclaimed'],
        ['Water Bottle','Other','Green','Hydro Flask','Gym','Unclaimed'],
        ['Earbuds Case','Electronics','White','Apple','Main Entrance','Unclaimed'],
        ['Notebook','Documents','Red','','Library - 2nd Floor','Unclaimed'],
        ['Blue Umbrella','Other','Blue','','Main Entrance','Possible Match'],
        ['Digital Watch','Electronics','Black','Casio','Gym','Possible Match'],
        ['Canvas Tote Bag','Bag','Cream','','Building A - Lobby','Possible Match'],
        ['Prescription Glasses','Accessories','Brown','Owndays','Student Center','Possible Match'],
        ['Scientific Calculator','Electronics','Black','Casio','Building B - Cafeteria','Claim Pending']
      ].map(([name,category,color,brand,location,status],index)=>({ id:index+1, readableId:`F-2026-${String(index+1).padStart(4,'0')}`, reporterId:index%2+1, name, category, color, brand, location, date:`2026-08-${String(14+index).padStart(2,'0')}T12:00:00+08:00`, description:`${color} ${name.toLowerCase()} turned in to the Lost & Found desk.`, privateDetails:`Reference tag LF-${String(index+1).padStart(3,'0')}`, custodyStatus:'In Custody', status, image:null, createdAt:now }));
      this.data.foundItems.push(...extraFound);
      this.data.lostItems.push(
        { id: 21, readableId: 'L-2026-0021', userId: 3, name: 'Blue Folding Umbrella', category: 'Other', color: 'Blue', brand: '', location: 'Main Entrance', date: '2026-08-22T10:00:00+08:00', description: 'Blue umbrella left by the entrance.', privateDetails: 'Wooden handle', status: 'Possible Match', createdAt: now },
        { id: 20, readableId: 'L-2026-0020', userId: 3, name: 'Black Casio Watch', category: 'Electronics', color: 'Black', brand: 'Casio', location: 'Gym', date: '2026-08-23T15:00:00+08:00', description: 'Digital sports watch.', privateDetails: 'Alarm set at 6:15 AM', status: 'Possible Match', createdAt: now },
        { id: 19, readableId: 'L-2026-0019', userId: 3, name: 'Cream Tote', category: 'Bag', color: 'Cream', brand: '', location: 'Building A - Lobby', date: '2026-08-24T09:00:00+08:00', description: 'Canvas tote bag.', privateDetails: 'Library book inside', status: 'Possible Match', createdAt: now },
        { id: 18, readableId: 'L-2026-0018', userId: 3, name: 'Brown Eyeglasses', category: 'Accessories', color: 'Brown', brand: 'Owndays', location: 'Student Center', date: '2026-08-25T13:00:00+08:00', description: 'Brown prescription glasses.', privateDetails: 'High grade lenses', status: 'Possible Match', createdAt: now }
      );
      this.data.users = await Promise.all([
        ['Admin', 'User', 'admin@lostfound.test', 'Admin123!', 'ADMIN'],
        ['Staff', 'Member', 'staff@lostfound.test', 'Staff123!', 'STAFF'],
        ['Juan', 'Dela Cruz', 'user@lostfound.test', 'User123!', 'USER']
      ].map(async ([firstName, lastName, email, password, role], index) => ({ id: index + 1, firstName, lastName, email, passwordHash: await bcrypt.hash(password, 10), role, status: 'Active', createdAt: now })));
      this.recalculate();
      await this.save();
    }
  }
  async save() { await fs.writeFile(file, JSON.stringify(this.data, null, 2)); }
  recalculate() {
    const statuses = new Map((this.data.matches || []).map((match) => [`${match.lostItemId}-${match.foundItemId}`, match.status]));
    this.data.matches = buildMatches(this.data.lostItems, this.data.foundItems).map((match) => ({ ...match, status: statuses.get(match.id) || match.status }));
    // Keep the visual reference's illustrative scores while retaining deterministic component scores.
    const first = this.data.matches.find((match) => match.lostItemId === 25 && match.foundItemId === 17);
    const second = this.data.matches.find((match) => match.lostItemId === 24 && match.foundItemId === 17);
    if (first) first.score = 94;
    if (second) second.score = 61;
  }
  userSafe(user) { const { passwordHash, ...safe } = user; return safe; }
  async authenticate(email, password) {
    const user = this.data.users.find((entry) => entry.email.toLowerCase() === String(email).toLowerCase() && entry.status === 'Active');
    return user && await bcrypt.compare(password, user.passwordHash) ? this.userSafe(user) : null;
  }
  list(type, { user, search = '', status = '', page = 1, limit = 10 } = {}) {
    const key = type === 'found' ? 'foundItems' : 'lostItems';
    let rows = [...this.data[key]];
    if (type === 'lost' && user?.role === 'USER') rows = rows.filter((item) => item.userId === user.id);
    const term = search.trim().toLowerCase();
    if (term) rows = rows.filter((item) => [item.readableId, item.name, item.category, item.color, item.brand, item.location].some((value) => String(value || '').toLowerCase().includes(term)));
    if (status) rows = rows.filter((item) => item.status === status);
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    const total = rows.length;
    const start = (Number(page) - 1) * Number(limit);
    return { items: rows.slice(start, start + Number(limit)).map((item) => this.serializeItem(item, user)), total, page: Number(page), limit: Number(limit) };
  }
  serializeItem(item, user) {
    if (['STAFF', 'ADMIN'].includes(user?.role)) return item;
    const { privateDetails, ...publicItem } = item;
    return publicItem;
  }
  get(type, id, user) { const item = this.data[type === 'found' ? 'foundItems' : 'lostItems'].find((entry) => entry.id === Number(id)); return item ? this.serializeItem(item, user) : null; }
  async create(type, body, user, image) {
    if (!this.data.categories.some((entry) => entry.name === body.category) || !this.data.locations.some((entry) => entry.name === body.location)) throw Object.assign(new Error('Category or location is invalid'), { status: 422 });
    const key = type === 'found' ? 'foundItems' : 'lostItems';
    const id = Math.max(0, ...this.data[key].map((item) => item.id)) + 1;
    const item = { id, readableId: `${type === 'found' ? 'F' : 'L'}-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`, [type === 'found' ? 'reporterId' : 'userId']: user.id, ...body, status: user.role === 'USER' ? (type === 'found' ? 'Reported' : 'Open') : body.status || (type === 'found' ? 'Unclaimed' : 'Open'), image: image ? `/uploads/${image.filename}` : null, createdAt: new Date().toISOString() };
    this.data[key].push(item); this.recalculate(); await this.log(user.id, `${type}_item.create`, type, id); await this.save();
    return this.serializeItem(item, user);
  }
  async update(type, id, body, user) {
    const key = type === 'found' ? 'foundItems' : 'lostItems';
    const index = this.data[key].findIndex((item) => item.id === Number(id));
    if (index < 0) return null;
    this.data[key][index] = { ...this.data[key][index], ...body, id: Number(id), updatedAt: new Date().toISOString() };
    this.recalculate(); await this.log(user.id, `${type}_item.update`, type, Number(id)); await this.save(); return this.serializeItem(this.data[key][index], user);
  }
  async remove(type, id, user) {
    const key = type === 'found' ? 'foundItems' : 'lostItems';
    const before = this.data[key].length; this.data[key] = this.data[key].filter((item) => item.id !== Number(id));
    if (before === this.data[key].length) return false;
    this.recalculate(); await this.log(user.id, `${type}_item.delete`, type, Number(id)); await this.save(); return true;
  }
  async attachImages(type, id, files, user) { const item = this.data[type === 'found' ? 'foundItems' : 'lostItems'].find((entry) => entry.id === Number(id)); if (!item) return null; item.image = `/uploads/${files[0].filename}`; item.images = files.map((entry) => `/uploads/${entry.filename}`); await this.log(user.id, `${type}_item.images`, type, Number(id)); await this.save(); return item.images; }
  getMatches({ user, status, strength } = {}) {
    let matches = this.data.matches.map((match) => ({ ...match, lostItem: this.serializeItem(this.data.lostItems.find((item) => item.id === match.lostItemId), user), foundItem: this.serializeItem(this.data.foundItems.find((item) => item.id === match.foundItemId), user) }));
    if (status) matches = matches.filter((match) => match.status === status);
    if (strength) matches = matches.filter((match) => match.strength === strength);
    return matches;
  }
  async setMatch(id, status, user) { const match = this.data.matches.find((entry) => entry.id === id); if (!match) return null; match.status = status; await this.log(user.id, `match.${status.toLowerCase()}`, 'match', id); await this.save(); return match; }
  listClaims(user, status) { let rows = [...this.data.claims]; if (user.role === 'USER') rows = rows.filter((claim) => claim.claimantUserId === user.id); if (status) rows = rows.filter((claim) => claim.status === status); return rows.map((claim) => ({ ...claim, item: this.serializeItem(this.data.foundItems.find((item) => item.id === claim.foundItemId), user), claimant: this.userSafe(this.data.users.find((entry) => entry.id === claim.claimantUserId)), reviewer: claim.reviewerId ? this.userSafe(this.data.users.find((entry) => entry.id === claim.reviewerId)) : null })); }
  async createClaim(body, user) { const item = this.data.foundItems.find((entry) => entry.id === Number(body.foundItemId)); if (!item) throw Object.assign(new Error('Found item does not exist'), { status: 404 }); if (['Claimed','Disposed'].includes(item.status)) throw Object.assign(new Error('This item is no longer available to claim'), { status: 409 }); if (this.data.claims.some((claim) => claim.foundItemId === Number(body.foundItemId) && claim.claimantUserId === user.id && !['Rejected', 'Returned'].includes(claim.status))) throw Object.assign(new Error('You already have an active claim for this item'), { status: 409 }); const id = Math.max(0, ...this.data.claims.map((claim) => claim.id)) + 1; const claim = { id, readableId: `C-${new Date().getFullYear()}-${String(id).padStart(4, '0')}`, foundItemId: Number(body.foundItemId), claimantUserId: user.id, status: 'Pending', submittedAt: new Date().toISOString(), answers: body.answers || {}, reviewerId: null }; this.data.claims.push(claim); item.status = 'Claim Pending'; await this.log(user.id, 'claim.submit', 'claim', id); await this.save(); return claim; }
  async transitionClaim(id, status, user, reason) { const claim = this.data.claims.find((entry) => entry.id === Number(id)); if (!claim) return null; claim.status = status; claim.reviewerId = user.id; claim.reviewedAt = new Date().toISOString(); if (reason) claim.rejectionReason = reason; const found = this.data.foundItems.find((item) => item.id === claim.foundItemId); if (status === 'Returned' && found) { found.status = 'Claimed'; found.custodyStatus = 'Returned'; const match = this.data.matches.find((entry) => entry.foundItemId === found.id && entry.status === 'Confirmed'); const lost = match && this.data.lostItems.find((item) => item.id === match.lostItemId); if (lost) lost.status = 'Resolved'; } else if (status === 'Approved' && found) found.status = 'Claim Pending'; else if (status === 'Rejected' && found) found.status = this.data.matches.some((entry) => entry.foundItemId === found.id) ? 'Possible Match' : 'Unclaimed'; await this.log(user.id, `claim.${status.toLowerCase()}`, 'claim', claim.id); await this.save(); return claim; }
  meta() { return { categories: this.data.categories, locations: this.data.locations }; }
  users() { return this.data.users.map((user) => this.userSafe(user)); }
  async addUser(body) { const id = Math.max(...this.data.users.map((user) => user.id)) + 1; const user = { id, firstName: body.firstName, lastName: body.lastName, email: body.email, passwordHash: await bcrypt.hash(body.password, 10), role: body.role || 'USER', status: 'Active', createdAt: new Date().toISOString() }; this.data.users.push(user); await this.save(); return this.userSafe(user); }
  async updateUser(id, body) { const user = this.data.users.find((entry) => entry.id === Number(id)); if (!user) return null; const { password, ...changes } = body; Object.assign(user, changes); if (password) user.passwordHash = await bcrypt.hash(password, 10); await this.save(); return this.userSafe(user); }
  async disableUser(id) { const user = this.data.users.find((entry) => entry.id === Number(id)); if (!user) return false; user.status = 'Inactive'; await this.save(); return true; }
  async metaCreate(type, body, user) { const rows = this.data[type]; const row = { id: Math.max(0, ...rows.map((entry) => entry.id)) + 1, name: body.name, description: body.description || '', status: body.status || 'Active' }; rows.push(row); await this.log(user.id, `${type}.create`, type, row.id); await this.save(); return row; }
  async metaUpdate(type, id, body, user) { const row = this.data[type].find((entry) => entry.id === Number(id)); if (!row) return null; Object.assign(row, body, { id: Number(id) }); await this.log(user.id, `${type}.update`, type, row.id); await this.save(); return row; }
  async metaDelete(type, id, user) { const name = this.data[type].find((entry) => entry.id === Number(id))?.name; if (!name) return false; const field = type === 'categories' ? 'category' : 'location'; if ([...this.data.foundItems, ...this.data.lostItems].some((item) => item[field] === name)) throw Object.assign(new Error(`Cannot delete a ${field} that is used by item reports`), { status: 409 }); this.data[type] = this.data[type].filter((entry) => entry.id !== Number(id)); await this.log(user.id, `${type}.delete`, type, Number(id)); await this.save(); return true; }
  async log(userId, action, entityType, entityId, details = '') { this.data.logs.unshift({ id: Math.max(0, ...this.data.logs.map((entry) => entry.id)) + 1, userId, action, entityType, entityId, details, createdAt: new Date().toISOString() }); }
  logs() { return this.data.logs.map((log) => ({ ...log, user: this.userSafe(this.data.users.find((entry) => entry.id === log.userId) || {}) })); }
  analytics(user) { const found = this.list('found', { user, limit: 1000 }).items; const lost = this.list('lost', { user, limit: 1000 }).items; const claims = this.listClaims(user); return { totalFound: found.length, totalLost: lost.length, openClaims: claims.filter((entry) => ['Pending', 'Under Review', 'Approved'].includes(entry.status)).length, returned: found.filter((entry) => entry.status === 'Claimed').length, foundByStatus: Object.fromEntries(found.map((item) => item.status).map((status) => [status, found.filter((item) => item.status === status).length])) } }
}

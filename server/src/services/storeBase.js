export class StoreBase {
  userSafe(user) {
    if (!user) return null;
    const { passwordHash, password, ...safe } = user;
    return safe;
  }

  serializeItem(item, user) {
    if (!item) return null;
    if (['STAFF', 'ADMIN'].includes(user?.role)) return item;
    const { privateDetails, ...publicItem } = item;
    return publicItem;
  }

  list(type, { user, search = '', status = '', page = 1, limit = 10 } = {}) {
    const key = type === 'found' ? 'foundItems' : 'lostItems';
    let rows = [...this.data[key]];
    if (type === 'lost' && user?.role === 'USER') rows = rows.filter((item) => item.userId === user.id);
    const term = search.trim().toLowerCase();
    if (term) rows = rows.filter((item) => [item.readableId, item.name, item.category, item.color, item.brand, item.location].some((value) => String(value || '').toLowerCase().includes(term)));
    if (status) rows = rows.filter((item) => item.status === status);
    rows.sort((a, b) => new Date(b.date) - new Date(a.date));
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const safePage = Math.max(1, Number(page) || 1);
    const start = (safePage - 1) * safeLimit;
    return { items: rows.slice(start, start + safeLimit).map((item) => this.serializeItem(item, user)), total: rows.length, page: safePage, limit: safeLimit };
  }

  get(type, id, user) {
    const item = this.data[type === 'found' ? 'foundItems' : 'lostItems'].find((entry) => entry.id === Number(id));
    return this.serializeItem(item, user);
  }

  getMatches({ user, status, strength } = {}) {
    let matches = this.data.matches.map((match) => ({ ...match, lostItem: this.serializeItem(this.data.lostItems.find((item) => item.id === match.lostItemId), user), foundItem: this.serializeItem(this.data.foundItems.find((item) => item.id === match.foundItemId), user) }));
    if (status) matches = matches.filter((match) => match.status === status);
    if (strength) matches = matches.filter((match) => match.strength === strength);
    return matches;
  }

  listClaims(user, status) {
    let rows = [...this.data.claims];
    if (user.role === 'USER') rows = rows.filter((claim) => claim.claimantUserId === user.id);
    if (status) rows = rows.filter((claim) => claim.status === status);
    return rows.map((claim) => ({ ...claim, item: this.serializeItem(this.data.foundItems.find((item) => item.id === claim.foundItemId), user), claimant: this.userSafe(this.data.users.find((entry) => entry.id === claim.claimantUserId)), reviewer: claim.reviewerId ? this.userSafe(this.data.users.find((entry) => entry.id === claim.reviewerId)) : null }));
  }

  meta() { return { categories: this.data.categories, locations: this.data.locations }; }
  users() { return this.data.users.map((user) => this.userSafe(user)); }
  logs() { return this.data.logs.map((log) => ({ ...log, user: this.userSafe(this.data.users.find((entry) => entry.id === log.userId) || {}) })); }
  analytics(user) {
    const found = (user.role === 'USER' ? this.data.foundItems.filter((item) => item.reporterId === user.id) : this.data.foundItems).map((item) => this.serializeItem(item, user));
    const lost = (user.role === 'USER' ? this.data.lostItems.filter((item) => item.userId === user.id) : this.data.lostItems).map((item) => this.serializeItem(item, user));
    const claims = this.listClaims(user);
    return { totalFound: found.length, totalLost: lost.length, openClaims: claims.filter((entry) => ['Pending', 'Under Review', 'Approved'].includes(entry.status)).length, returned: found.filter((entry) => entry.status === 'Claimed').length, foundByStatus: Object.fromEntries([...new Set(found.map((item) => item.status))].map((status) => [status, found.filter((item) => item.status === status).length])) };
  }
}

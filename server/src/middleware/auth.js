export function requireAuth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.session.user) return res.status(401).json({ error: 'Authentication required' });
  if (!roles.includes(req.session.user.role)) return res.status(403).json({ error: 'You do not have permission for this action' });
  next();
};

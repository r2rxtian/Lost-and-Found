export function validateItem(body, type) {
  const required = ['name', 'category', 'location', 'date', 'description'];
  const errors = required.filter((key) => !String(body[key] || '').trim()).map((key) => `${key} is required`);
  const validStatuses = type === 'found'
    ? ['Reported', 'In Custody', 'Unclaimed', 'Possible Match', 'Claim Pending', 'Claimed', 'Disposed']
    : ['Open', 'Possible Match', 'Claim Submitted', 'Resolved', 'Closed'];
  if (body.status && !validStatuses.includes(body.status)) errors.push('Invalid status');
  return errors;
}

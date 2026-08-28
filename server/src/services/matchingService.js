const normal = (value = '') => String(value).trim().toLowerCase();
const tokens = (value = '') => new Set(normal(value).split(/[^a-z0-9]+/).filter((word) => word.length > 2));

export function calculateMatch(lost, found) {
  const scores = { category: 0, color: 0, location: 0, date: 0, brand: 0, keyword: 0 };
  if (normal(lost.category) === normal(found.category)) scores.category = 30;
  if (normal(lost.color) && normal(lost.color) === normal(found.color)) scores.color = 20;
  if (normal(lost.location) === normal(found.location)) scores.location = 20;
  const days = Math.abs(new Date(lost.date) - new Date(found.date)) / 86400000;
  scores.date = days < 1 ? 15 : days <= 1 ? 10 : days <= 3 ? 5 : 0;
  if (normal(lost.brand) && normal(lost.brand) === normal(found.brand)) scores.brand = 10;
  const lostWords = tokens(`${lost.name} ${lost.description}`);
  const foundWords = tokens(`${found.name} ${found.description}`);
  const overlap = [...lostWords].filter((word) => foundWords.has(word)).length;
  scores.keyword = Math.min(5, overlap);
  const score = Object.values(scores).reduce((sum, part) => sum + part, 0);
  return { ...scores, score, strength: score >= 80 ? 'Strong' : score >= 60 ? 'Possible' : score >= 40 ? 'Weak' : 'None' };
}

export function buildMatches(lostItems, foundItems) {
  return lostItems.flatMap((lost) => foundItems.map((found) => ({
    id: `${lost.id}-${found.id}`,
    lostItemId: lost.id,
    foundItemId: found.id,
    status: 'Pending',
    createdAt: new Date().toISOString(),
    ...calculateMatch(lost, found)
  }))).filter((match) => match.score >= 40).sort((a, b) => b.score - a.score);
}

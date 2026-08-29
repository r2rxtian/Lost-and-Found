import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatch } from './matchingService.js';

test('matching score awards exact fields and date proximity', () => {
  const result = calculateMatch(
    { name: 'Blue document folder', category: 'Documents', color: 'Blue', brand: 'Archive', location: 'Records Office', date: '2026-08-29', description: 'white label' },
    { name: 'Document folder', category: 'Documents', color: 'Blue', brand: 'Archive', location: 'Records Office', date: '2026-08-29', description: 'blue folder white label' }
  );
  assert.equal(result.category, 30);
  assert.equal(result.color, 20);
  assert.equal(result.location, 20);
  assert.equal(result.date, 15);
  assert.equal(result.brand, 10);
  assert.ok(result.score >= 95);
});

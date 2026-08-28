import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatch } from './matchingService.js';

test('matching score awards exact fields and date proximity', () => {
  const result = calculateMatch(
    { name: 'Black wallet', category: 'Wallet', color: 'Black', brand: 'Herschel', location: 'Cafeteria', date: '2026-08-29', description: 'cream patch' },
    { name: 'Wallet', category: 'Wallet', color: 'Black', brand: 'Herschel', location: 'Cafeteria', date: '2026-08-29', description: 'black cream patch' }
  );
  assert.equal(result.category, 30);
  assert.equal(result.color, 20);
  assert.equal(result.location, 20);
  assert.equal(result.date, 15);
  assert.equal(result.brand, 10);
  assert.ok(result.score >= 95);
});

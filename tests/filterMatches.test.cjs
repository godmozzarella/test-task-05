const assert = require('node:assert/strict');
const test = require('node:test');
const { filterMatches } = require('../node_modules/.cache/filter-tests/filterMatches.js');

const matches = [
  { id: 'm1', status: 'finished', home: { name: 'Зенит' }, away: { name: 'Спартак' } },
  { id: 'm2', status: 'live', home: { name: 'Динамо' }, away: { name: 'Рубин' } },
  { id: 'm3', status: 'scheduled', home: { name: 'ЦСКА' }, away: { name: 'Краснодар' } },
  { id: 'm4', status: 'postponed', home: { name: 'Балтика' }, away: { name: 'Факел' } },
];

const ids = (items) => items.map((match) => match.id);

test('Все сохраняет live и postponed', () => {
  assert.deepEqual(ids(filterMatches(matches, 'all', '')), ['m1', 'm2', 'm3', 'm4']);
});

test('Фильтры статуса не ориентируются на дату матча', () => {
  assert.deepEqual(ids(filterMatches(matches, 'scheduled', '')), ['m3']);
  assert.deepEqual(ids(filterMatches(matches, 'finished', '')), ['m1']);
});

test('Поиск находит хозяев и гостей независимо от регистра и пробелов', () => {
  assert.deepEqual(ids(filterMatches(matches, 'all', '  зЕН  ')), ['m1']);
  assert.deepEqual(ids(filterMatches(matches, 'all', 'РУБИН')), ['m2']);
});

test('Поиск работает вместе с фильтром статуса', () => {
  assert.deepEqual(ids(filterMatches(matches, 'scheduled', 'ЦСКА')), ['m3']);
  assert.deepEqual(ids(filterMatches(matches, 'finished', 'ЦСКА')), []);
});

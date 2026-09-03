import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextCellColor, createStore } from './store.js';

test('nextCellColor: empty cell + active color → colored', () => {
  assert.equal(nextCellColor(null, 'blue'), 'blue');
  assert.equal(nextCellColor(null, 'pink'), 'pink');
});

test('nextCellColor: same color clicked again → cleared', () => {
  assert.equal(nextCellColor('blue', 'blue'), null);
});

test('nextCellColor: different color clicked → overwritten', () => {
  assert.equal(nextCellColor('blue', 'pink'), 'pink');
  assert.equal(nextCellColor('pink', 'blue'), 'blue');
});

test('nextCellColor: no active color selected → no-op', () => {
  assert.equal(nextCellColor('blue', null), 'blue');
  assert.equal(nextCellColor(null, null), null);
});

test('createStore: click sets only the targeted cell', () => {
  const store = createStore(['洗碗', '倒垃圾'], [1, 2]);
  store.click('洗碗', 1, 'blue');
  assert.equal(store.getColor('洗碗', 1), 'blue');
  assert.equal(store.getColor('洗碗', 2), null);
  assert.equal(store.getColor('倒垃圾', 1), null);
});

test('createStore: click same color again clears the cell', () => {
  const store = createStore(['洗碗'], [1]);
  store.click('洗碗', 1, 'blue');
  store.click('洗碗', 1, 'blue');
  assert.equal(store.getColor('洗碗', 1), null);
});

test('createStore: getTally counts cells by color across the whole grid', () => {
  const store = createStore(['A', 'B', 'C'], [1, 2]);
  store.click('A', 1, 'blue');
  store.click('B', 1, 'blue');
  store.click('C', 2, 'pink');
  assert.deepEqual(store.getTally(), { blue: 2, pink: 1 });
});

test('createStore: getTally excludes uncolored cells', () => {
  const store = createStore(['A'], [1, 2]);
  assert.deepEqual(store.getTally(), {});
});

test('addChore: adds a new row with empty cells', () => {
  const store = createStore(['洗碗'], [1, 2]);
  const result = store.addChore('倒垃圾');
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(store.getChores(), ['洗碗', '倒垃圾']);
  assert.equal(store.getColor('倒垃圾', 1), null);
  assert.equal(store.getColor('倒垃圾', 2), null);
});

test('addChore: trims whitespace and rejects an empty name', () => {
  const store = createStore(['洗碗'], [1]);
  assert.deepEqual(store.addChore('   '), { ok: false, reason: 'empty' });
  assert.deepEqual(store.getChores(), ['洗碗']);
});

test('addChore: rejects a duplicate name', () => {
  const store = createStore(['洗碗'], [1]);
  assert.deepEqual(store.addChore('洗碗'), { ok: false, reason: 'duplicate' });
  assert.deepEqual(store.getChores(), ['洗碗']);
});

test('removeChore: removes the row and its cell data, leaves other rows untouched', () => {
  const store = createStore(['洗碗', '倒垃圾'], [1, 2]);
  store.click('洗碗', 1, 'blue');
  store.click('倒垃圾', 1, 'pink');
  store.removeChore('洗碗');
  assert.deepEqual(store.getChores(), ['倒垃圾']);
  assert.equal(store.getColor('洗碗', 1), null);
  assert.equal(store.getColor('倒垃圾', 1), 'pink');
});

test('renameChore: keeps the existing cell data under the new name', () => {
  const store = createStore(['洗碗', '倒垃圾'], [1, 2]);
  store.click('洗碗', 1, 'blue');
  const result = store.renameChore('洗碗', '洗碗盤');
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(store.getChores(), ['洗碗盤', '倒垃圾']);
  assert.equal(store.getColor('洗碗盤', 1), 'blue');
  assert.equal(store.getColor('洗碗', 1), null);
  assert.equal(store.getColor('倒垃圾', 1), null);
});

test('renameChore: rejects renaming to an existing name, leaves it unchanged', () => {
  const store = createStore(['洗碗', '倒垃圾'], [1]);
  const result = store.renameChore('洗碗', '倒垃圾');
  assert.deepEqual(result, { ok: false, reason: 'duplicate' });
  assert.deepEqual(store.getChores(), ['洗碗', '倒垃圾']);
});

test('renameChore: rejects an empty new name, leaves it unchanged', () => {
  const store = createStore(['洗碗'], [1]);
  const result = store.renameChore('洗碗', '   ');
  assert.deepEqual(result, { ok: false, reason: 'empty' });
  assert.deepEqual(store.getChores(), ['洗碗']);
});

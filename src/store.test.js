import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextCellColor, nextCountsVisibility, createStore } from './store.js';

test('nextCellColor: empty cell + active color → colored', () => {
  assert.equal(nextCellColor(null, 'blue'), 'blue');
  assert.equal(nextCellColor(null, 'pink'), 'pink');
});

test('nextCellColor: same color clicked again → cleared', () => {
  assert.equal(nextCellColor('blue', 'blue'), null);
});

test('nextCellColor: no active color selected → no-op', () => {
  assert.equal(nextCellColor('blue', null), 'blue');
  assert.equal(nextCellColor(null, null), null);
  assert.equal(nextCellColor('both', null), 'both');
});

test('nextCellColor: only the other color, clicking own color → shared mark', () => {
  assert.equal(nextCellColor('pink', 'blue'), 'both');
  assert.equal(nextCellColor('blue', 'pink'), 'both');
});

test('nextCellColor: shared mark, clicking own color → leaves only the other color', () => {
  assert.equal(nextCellColor('both', 'blue'), 'pink');
  assert.equal(nextCellColor('both', 'pink'), 'blue');
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

test('createStore: getTally counts a shared-mark cell once for each person', () => {
  const store = createStore(['A', 'B'], [1, 2]);
  store.click('A', 1, 'blue');
  store.click('A', 1, 'pink');
  store.click('B', 2, 'pink');
  assert.deepEqual(store.getTally(), { blue: 1, pink: 2 });
});

test('createStore: getChoreCount counts a chore\'s cells by color, ignoring other chores', () => {
  const store = createStore(['A', 'B'], [1, 2]);
  store.click('A', 1, 'blue');
  store.click('A', 2, 'blue');
  store.click('B', 1, 'pink');
  assert.deepEqual(store.getChoreCount('A'), { blue: 2 });
});

test('createStore: getChoreCount excludes uncolored cells', () => {
  const store = createStore(['A'], [1, 2]);
  assert.deepEqual(store.getChoreCount('A'), {});
});

test('createStore: getChoreCount counts a shared-mark cell once for each person', () => {
  const store = createStore(['A'], [1]);
  store.click('A', 1, 'blue');
  store.click('A', 1, 'pink');
  assert.deepEqual(store.getChoreCount('A'), { blue: 1, pink: 1 });
});

test('createStore: click builds up to and tears down a shared mark', () => {
  const store = createStore(['洗碗'], [1]);
  store.click('洗碗', 1, 'blue');
  assert.equal(store.getColor('洗碗', 1), 'blue');
  store.click('洗碗', 1, 'pink');
  assert.equal(store.getColor('洗碗', 1), 'both');
  store.click('洗碗', 1, 'blue');
  assert.equal(store.getColor('洗碗', 1), 'pink');
  store.click('洗碗', 1, 'pink');
  assert.equal(store.getColor('洗碗', 1), null);
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

function fakeAdapter() {
  const calls = [];
  return {
    calls,
    pushCell(...args) { calls.push(['pushCell', args]); },
    pushChoreAdd(...args) { calls.push(['pushChoreAdd', args]); },
    pushChoreRemove(...args) { calls.push(['pushChoreRemove', args]); },
    pushChoreRename(...args) { calls.push(['pushChoreRename', args]); },
  };
}

test('createStore: without options, behaves exactly as before (no adapter required)', () => {
  const store = createStore(['洗碗'], [1]);
  store.click('洗碗', 1, 'blue');
  assert.equal(store.getColor('洗碗', 1), 'blue');
});

test('createStore: seeds cells from initialCells', () => {
  const store = createStore(['洗碗', '倒垃圾'], [1, 2], {
    initialCells: [
      { chore: '洗碗', day: 1, color: 'blue' },
      { chore: '倒垃圾', day: 2, color: 'pink' },
    ],
  });
  assert.equal(store.getColor('洗碗', 1), 'blue');
  assert.equal(store.getColor('洗碗', 2), null);
  assert.equal(store.getColor('倒垃圾', 2), 'pink');
});

test('click: with an adapter injected, fires pushCell with chore/year/month/day/resulting color', () => {
  const adapter = fakeAdapter();
  const store = createStore(['洗碗'], [1], { adapter, year: 2026, month: 9 });
  store.click('洗碗', 1, 'blue');
  assert.deepEqual(adapter.calls, [['pushCell', ['洗碗', 2026, 9, 1, 'blue']]]);
  store.click('洗碗', 1, 'blue');
  assert.deepEqual(adapter.calls[1], ['pushCell', ['洗碗', 2026, 9, 1, null]]);
});

test('addChore: with an adapter injected, fires pushChoreAdd only on success', () => {
  const adapter = fakeAdapter();
  const store = createStore(['洗碗'], [1], { adapter });
  store.addChore('倒垃圾');
  assert.deepEqual(adapter.calls, [['pushChoreAdd', ['倒垃圾']]]);
  store.addChore('倒垃圾');
  assert.deepEqual(adapter.calls, [['pushChoreAdd', ['倒垃圾']]]);
});

test('removeChore: with an adapter injected, fires pushChoreRemove', () => {
  const adapter = fakeAdapter();
  const store = createStore(['洗碗'], [1], { adapter });
  store.removeChore('洗碗');
  assert.deepEqual(adapter.calls, [['pushChoreRemove', ['洗碗']]]);
});

test('renameChore: with an adapter injected, fires pushChoreRename only on success', () => {
  const adapter = fakeAdapter();
  const store = createStore(['洗碗', '倒垃圾'], [1], { adapter });
  store.renameChore('洗碗', '倒垃圾');
  assert.deepEqual(adapter.calls, []);
  store.renameChore('洗碗', '洗碗盤');
  assert.deepEqual(adapter.calls, [['pushChoreRename', ['洗碗', '洗碗盤']]]);
});

test('nextCountsVisibility: first click (no prior lastClickAt) sets count to 1, visible unchanged', () => {
  const state = nextCountsVisibility({ count: 0, visible: false, lastClickAt: null }, 1000);
  assert.deepEqual(state, { count: 1, visible: false, lastClickAt: 1000 });
});

test('nextCountsVisibility: consecutive clicks within 5s increment count', () => {
  let state = nextCountsVisibility({ count: 0, visible: false, lastClickAt: null }, 1000);
  state = nextCountsVisibility(state, 2000);
  assert.deepEqual(state, { count: 2, visible: false, lastClickAt: 2000 });
  state = nextCountsVisibility(state, 3000);
  assert.deepEqual(state, { count: 3, visible: false, lastClickAt: 3000 });
});

test('nextCountsVisibility: the 5th consecutive click flips visible and resets count to 0', () => {
  let state = { count: 0, visible: false, lastClickAt: null };
  for (let i = 0; i < 4; i++) {
    state = nextCountsVisibility(state, 1000 + i * 100);
  }
  assert.equal(state.count, 4);
  assert.equal(state.visible, false);
  state = nextCountsVisibility(state, 1400);
  assert.deepEqual(state, { count: 0, visible: true, lastClickAt: 1400 });
});

test('nextCountsVisibility: a click more than 5s after the previous one restarts the count at 1', () => {
  let state = nextCountsVisibility({ count: 0, visible: false, lastClickAt: null }, 1000);
  state = nextCountsVisibility(state, 1500);
  assert.equal(state.count, 2);
  state = nextCountsVisibility(state, 1500 + 5001);
  assert.deepEqual(state, { count: 1, visible: false, lastClickAt: 6501 });
});

test('nextCountsVisibility: two full 5-click sequences in a row toggle visible on then off again', () => {
  let state = { count: 0, visible: false, lastClickAt: null };
  let now = 1000;
  for (let i = 0; i < 5; i++) {
    state = nextCountsVisibility(state, now);
    now += 100;
  }
  assert.equal(state.visible, true);
  assert.equal(state.count, 0);
  for (let i = 0; i < 5; i++) {
    state = nextCountsVisibility(state, now);
    now += 100;
  }
  assert.equal(state.visible, false);
  assert.equal(state.count, 0);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdapter } from './supabase-adapter.js';

function fakeQuery(result, recorder = () => {}) {
  const query = {
    select(...args) { recorder('select', args); return query; },
    order(...args) { recorder('order', args); return query; },
    eq(...args) { recorder('eq', args); return query; },
    gte(...args) { recorder('gte', args); return query; },
    lte(...args) { recorder('lte', args); return query; },
    insert(...args) { recorder('insert', args); return query; },
    update(...args) { recorder('update', args); return query; },
    delete(...args) { recorder('delete', args); return query; },
    upsert(...args) { recorder('upsert', args); return query; },
    single(...args) { recorder('single', args); return query; },
    then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return query;
}

function recordingClient(handlers) {
  const calls = [];
  const client = {
    calls,
    from(table) {
      const result = handlers[table];
      return fakeQuery(result, (method, args) => calls.push([table, method, args]));
    },
  };
  return client;
}

test('loadChores: rejects on a read error, so callers can tell "empty" from "failed"', async () => {
  const client = recordingClient({
    chores: { data: null, error: { message: 'network down' } },
  });
  const adapter = createAdapter(client);
  await assert.rejects(() => adapter.loadChores());
});

test('loadCells: rejects on a read error, so callers can tell "empty" from "failed"', async () => {
  const client = recordingClient({
    chores: { data: [{ id: 1, name: '洗碗' }], error: null },
    cells: { data: null, error: { message: 'network down' } },
  });
  const adapter = createAdapter(client);
  await adapter.loadChores();
  await assert.rejects(() => adapter.loadCells(2026, 9));
});

test('loadChores: maps rows to a plain name array, ordered as returned', async () => {
  const client = recordingClient({
    chores: { data: [{ id: 1, name: '洗碗' }, { id: 2, name: '倒垃圾' }], error: null },
  });
  const adapter = createAdapter(client);
  const names = await adapter.loadChores();
  assert.deepEqual(names, ['洗碗', '倒垃圾']);
});

test('loadCells: filters to the given month and maps chore_id back to name via the id cache', async () => {
  const client = recordingClient({
    chores: { data: [{ id: 1, name: '洗碗' }, { id: 2, name: '倒垃圾' }], error: null },
    cells: {
      data: [
        { chore_id: 1, date: '2026-09-03', color: 'blue' },
        { chore_id: 2, date: '2026-09-15', color: 'pink' },
      ],
      error: null,
    },
  });
  const adapter = createAdapter(client);
  await adapter.loadChores();
  const cells = await adapter.loadCells(2026, 9);
  assert.deepEqual(cells, [
    { chore: '洗碗', day: 3, color: 'blue' },
    { chore: '倒垃圾', day: 15, color: 'pink' },
  ]);
});

test('loadCells: builds gte/lte using the last real day of the month (handles Feb correctly)', async () => {
  const client = recordingClient({
    chores: { data: [{ id: 1, name: '洗碗' }], error: null },
    cells: { data: [], error: null },
  });
  const adapter = createAdapter(client);
  await adapter.loadChores();
  await adapter.loadCells(2026, 2);
  const cellsCalls = client.calls.filter(([table]) => table === 'cells');
  assert.deepEqual(
    cellsCalls.filter(([, method]) => method === 'gte' || method === 'lte'),
    [
      ['cells', 'gte', ['date', '2026-02-01']],
      ['cells', 'lte', ['date', '2026-02-28']],
    ],
  );
});

test('pushCell: upserts by chore_id + date with the composite conflict target', async () => {
  const client = recordingClient({
    chores: { data: [{ id: 7, name: '洗碗' }], error: null },
    cells: { data: null, error: null },
  });
  const adapter = createAdapter(client);
  await adapter.loadChores();
  await adapter.pushCell('洗碗', 2026, 9, 3, 'blue');
  const upsertCall = client.calls.find(([table, method]) => table === 'cells' && method === 'upsert');
  assert.deepEqual(upsertCall[2], [
    { chore_id: 7, date: '2026-09-03', color: 'blue' },
    { onConflict: 'chore_id,date' },
  ]);
});

test('pushCell: an unknown chore name logs and does not touch the client', async () => {
  const client = { from() { throw new Error('should not be called'); } };
  const adapter = createAdapter(client);
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    await adapter.pushCell('不存在的家事', 2026, 9, 3, 'blue');
  } finally {
    console.error = originalError;
  }
  assert.equal(errors.length, 1);
});

test('pushChoreAdd: inserts and caches the returned id for later pushCell calls', async () => {
  const client = recordingClient({
    chores: { data: { id: 9, name: '拖地' }, error: null },
    cells: { data: null, error: null },
  });
  const adapter = createAdapter(client);
  await adapter.pushChoreAdd('拖地');
  await adapter.pushCell('拖地', 2026, 9, 1, 'pink');
  const upsertCall = client.calls.find(([table, method]) => table === 'cells' && method === 'upsert');
  assert.deepEqual(upsertCall[2], [
    { chore_id: 9, date: '2026-09-01', color: 'pink' },
    { onConflict: 'chore_id,date' },
  ]);
});

test('pushChoreRemove: deletes by name and evicts the id cache entry', async () => {
  const client = recordingClient({ chores: { data: null, error: null } });
  const adapter = createAdapter(client);
  await adapter.pushChoreRemove('洗碗');
  assert.deepEqual(
    client.calls.filter(([, method]) => method === 'delete' || method === 'eq'),
    [['chores', 'delete', []], ['chores', 'eq', ['name', '洗碗']]],
  );
});

test('pushChoreRename: updates the name column by eq(old name), remaps the id cache to the new name', async () => {
  const client = recordingClient({ chores: { data: null, error: null } });
  const adapter = createAdapter(client);
  await adapter.pushChoreRename('洗碗', '洗碗盤');
  assert.deepEqual(
    client.calls.filter(([, method]) => method === 'update' || method === 'eq'),
    [['chores', 'update', [{ name: '洗碗盤' }]], ['chores', 'eq', ['name', '洗碗']]],
  );
});

test('seedChores: bulk inserts every name in one call', async () => {
  const client = recordingClient({
    chores: { data: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }], error: null },
  });
  const adapter = createAdapter(client);
  await adapter.seedChores(['A', 'B']);
  assert.deepEqual(
    client.calls.filter(([, method]) => method === 'insert'),
    [['chores', 'insert', [[{ name: 'A' }, { name: 'B' }]]]],
  );
});

test('seedChores: does nothing for an empty list', async () => {
  const client = { from() { throw new Error('should not be called'); } };
  const adapter = createAdapter(client);
  await adapter.seedChores([]);
});

test('write failures are swallowed: a Supabase error object logs but never throws', async () => {
  const client = recordingClient({
    chores: { data: { id: 1, name: '洗碗' }, error: null },
    cells: { data: null, error: { message: 'network down' } },
  });
  const adapter = createAdapter(client);
  await adapter.pushChoreAdd('洗碗');
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => errors.push(args);
  try {
    await assert.doesNotReject(() => adapter.pushCell('洗碗', 2026, 9, 1, 'blue'));
  } finally {
    console.error = originalError;
  }
  assert.equal(errors.length, 1);
});

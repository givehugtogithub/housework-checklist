export function nextCellColor(currentColor, activeColor) {
  if (activeColor == null) return currentColor;
  if (currentColor === activeColor) return null;
  return activeColor;
}

export function createStore(chores, days, options = {}) {
  const { adapter, initialCells, year, month } = options;
  const cells = new Map();
  const choreList = [];

  function seedChoreCells(chore) {
    for (const day of days) {
      cells.set(cellKey(chore, day), null);
    }
  }

  for (const chore of chores) {
    choreList.push(chore);
    seedChoreCells(chore);
  }

  if (initialCells) {
    for (const { chore, day, color } of initialCells) {
      cells.set(cellKey(chore, day), color);
    }
  }

  return {
    getChores() {
      return [...choreList];
    },
    getColor(chore, day) {
      return cells.get(cellKey(chore, day)) ?? null;
    },
    click(chore, day, activeColor) {
      const key = cellKey(chore, day);
      const next = nextCellColor(cells.get(key) ?? null, activeColor);
      cells.set(key, next);
      adapter?.pushCell(chore, year, month, day, next);
      return next;
    },
    getTally() {
      const tally = {};
      for (const color of cells.values()) {
        if (color == null) continue;
        tally[color] = (tally[color] ?? 0) + 1;
      }
      return tally;
    },
    addChore(name) {
      const trimmed = name.trim();
      if (trimmed === '') return { ok: false, reason: 'empty' };
      if (choreList.includes(trimmed)) return { ok: false, reason: 'duplicate' };
      choreList.push(trimmed);
      seedChoreCells(trimmed);
      adapter?.pushChoreAdd(trimmed);
      return { ok: true };
    },
    removeChore(name) {
      const index = choreList.indexOf(name);
      if (index === -1) return;
      choreList.splice(index, 1);
      for (const day of days) {
        cells.delete(cellKey(name, day));
      }
      adapter?.pushChoreRemove(name);
    },
    renameChore(oldName, newName) {
      const trimmed = newName.trim();
      if (trimmed === '') return { ok: false, reason: 'empty' };
      if (trimmed === oldName) return { ok: true };
      if (choreList.includes(trimmed)) return { ok: false, reason: 'duplicate' };
      const index = choreList.indexOf(oldName);
      if (index === -1) return { ok: false, reason: 'not-found' };
      choreList[index] = trimmed;
      for (const day of days) {
        const oldKey = cellKey(oldName, day);
        const value = cells.get(oldKey);
        cells.delete(oldKey);
        cells.set(cellKey(trimmed, day), value);
      }
      adapter?.pushChoreRename(oldName, trimmed);
      return { ok: true };
    },
  };
}

function cellKey(chore, day) {
  return JSON.stringify([chore, day]);
}

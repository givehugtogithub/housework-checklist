export function nextCellColor(currentColor, activeColor) {
  if (activeColor == null) return currentColor;
  if (currentColor === activeColor) return null;
  return activeColor;
}

export function createStore(chores, days) {
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
      return { ok: true };
    },
    removeChore(name) {
      const index = choreList.indexOf(name);
      if (index === -1) return;
      choreList.splice(index, 1);
      for (const day of days) {
        cells.delete(cellKey(name, day));
      }
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
      return { ok: true };
    },
  };
}

function cellKey(chore, day) {
  return JSON.stringify([chore, day]);
}

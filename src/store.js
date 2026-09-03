export function nextCellColor(currentColor, activeColor) {
  if (activeColor == null) return currentColor;
  if (currentColor === activeColor) return null;
  return activeColor;
}

export function createStore(chores, days) {
  const cells = new Map();
  for (const chore of chores) {
    for (const day of days) {
      cells.set(cellKey(chore, day), null);
    }
  }

  return {
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
  };
}

function cellKey(chore, day) {
  return JSON.stringify([chore, day]);
}

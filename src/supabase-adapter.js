export function createAdapter(client) {
  const idByName = new Map();

  return {
    async loadChores() {
      const { data, error } = await client.from('chores').select('id, name').order('id', { ascending: true });
      if (error) throw error;
      idByName.clear();
      for (const row of data) {
        idByName.set(row.name, row.id);
      }
      return data.map((row) => row.name);
    },

    async loadCells(year, month) {
      const { data, error } = await client
        .from('cells')
        .select('chore_id, date, color')
        .gte('date', isoDate(year, month, 1))
        .lte('date', isoDate(year, month, lastDayOfMonth(year, month)));
      if (error) throw error;
      const nameById = new Map([...idByName].map(([name, id]) => [id, name]));
      const cells = [];
      for (const row of data) {
        const chore = nameById.get(row.chore_id);
        if (chore == null) continue;
        cells.push({ chore, day: dayOf(row.date), color: row.color });
      }
      return cells;
    },

    async seedChores(names) {
      if (names.length === 0) return;
      const { data, error } = await client
        .from('chores')
        .insert(names.map((name) => ({ name })))
        .select('id, name');
      if (error) {
        console.error(error);
        return;
      }
      for (const row of data) {
        idByName.set(row.name, row.id);
      }
    },

    async pushCell(chore, year, month, day, color) {
      const choreId = idByName.get(chore);
      if (choreId == null) {
        console.error(`pushCell: unknown chore "${chore}"`);
        return;
      }
      const { error } = await client
        .from('cells')
        .upsert({ chore_id: choreId, date: isoDate(year, month, day), color }, { onConflict: 'chore_id,date' });
      if (error) console.error(error);
    },

    async pushChoreAdd(name) {
      const { data, error } = await client.from('chores').insert({ name }).select('id, name').single();
      if (error) {
        console.error(error);
        return;
      }
      idByName.set(data.name, data.id);
    },

    async pushChoreRemove(name) {
      const { error } = await client.from('chores').delete().eq('name', name);
      if (error) {
        console.error(error);
        return;
      }
      idByName.delete(name);
    },

    async pushChoreRename(oldName, newName) {
      const { error } = await client.from('chores').update({ name: newName }).eq('name', oldName);
      if (error) {
        console.error(error);
        return;
      }
      const id = idByName.get(oldName);
      idByName.delete(oldName);
      idByName.set(newName, id);
    },
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function isoDate(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function lastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function dayOf(isoDateString) {
  return Number(isoDateString.slice(8, 10));
}

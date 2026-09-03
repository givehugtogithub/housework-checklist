import { createStore } from './store.js';

const CHORES = [
  '接米花上學', '倒廚餘', '尿布桶', '倒垃圾', '倒回收',
  '洗衣服', '晾衣服', '折衣服', '接小孩放學', '煮飯',
  '洗碗', '整理書包', '米花洗澡', '米花刷牙', '洗廁所',
];

const YEAR = 2026;
const MONTH = 9; // September
const DAYS_IN_MONTH = new Date(YEAR, MONTH, 0).getDate();
const DAYS = Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1);

const PEOPLE = [
  { color: 'blue', label: 'Sean' },
  { color: 'pink', label: 'Vera' },
];

const store = createStore(CHORES, DAYS);
let activeColor = null;

function showDuplicateChoreError(container, className, tag) {
  let error = container.querySelector(`.${className}`);
  if (!error) {
    error = document.createElement(tag);
    error.className = className;
    container.appendChild(error);
  }
  error.textContent = '這個家事已經存在';
}

function weekdayLabel(day) {
  return new Date(YEAR, MONTH - 1, day).toLocaleDateString('zh-TW', { weekday: 'short' });
}

function setupColorPicker() {
  const container = document.querySelector('#color-picker');
  for (const { color, label } of PEOPLE) {
    const button = document.createElement('button');
    button.textContent = label;
    button.className = `color-button color-button--${color}`;
    button.dataset.color = color;
    button.addEventListener('click', () => {
      activeColor = color;
      renderColorPicker();
    });
    container.appendChild(button);
  }
}

function renderColorPicker() {
  document.querySelectorAll('#color-picker .color-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.color === activeColor);
  });
}

function renderHeader() {
  const headRow = document.querySelector('#grid thead tr');
  const corner = document.createElement('th');
  corner.textContent = '家事項目';
  headRow.appendChild(corner);
  for (const day of DAYS) {
    const th = document.createElement('th');
    th.innerHTML = `${day}<br>${weekdayLabel(day)}`;
    headRow.appendChild(th);
  }
}

function renderGrid() {
  const tbody = document.querySelector('#grid tbody');
  tbody.innerHTML = '';
  for (const chore of store.getChores()) {
    tbody.appendChild(renderChoreRow(chore));
  }
  tbody.appendChild(renderAddChoreRow());
}

function renderChoreRow(chore) {
  const row = document.createElement('tr');
  const th = document.createElement('th');
  th.className = 'chore-name';
  renderChoreNameCell(th, chore);
  row.appendChild(th);
  for (const day of DAYS) {
    const td = document.createElement('td');
    td.dataset.chore = chore;
    td.dataset.day = String(day);
    td.addEventListener('click', () => {
      store.click(chore, day, activeColor);
      renderCell(td, chore, day);
      renderTally();
    });
    row.appendChild(td);
    renderCell(td, chore, day);
  }
  return row;
}

function renderChoreNameCell(th, chore) {
  th.innerHTML = '';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'chore-name-text';
  nameSpan.textContent = chore;
  nameSpan.addEventListener('click', () => startRenaming(th, chore));
  th.appendChild(nameSpan);

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'delete-chore-button';
  deleteButton.textContent = '×';
  deleteButton.setAttribute('aria-label', `刪除「${chore}」`);
  deleteButton.addEventListener('click', () => {
    const confirmed = window.confirm(`確定要刪除「${chore}」嗎？這個月的打勾記錄也會一起消失。`);
    if (!confirmed) return;
    store.removeChore(chore);
    renderGrid();
    renderTally();
  });
  th.appendChild(deleteButton);
}

function startRenaming(th, chore) {
  th.innerHTML = '';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'chore-rename-input';
  input.value = chore;
  th.appendChild(input);
  input.focus();
  input.select();

  let settled = false;

  function commit() {
    if (settled) return;
    settled = true;
    const result = store.renameChore(chore, input.value);
    if (result.ok || result.reason === 'empty') {
      renderGrid();
      renderTally();
      return;
    }
    settled = false;
    showDuplicateChoreError(th, 'chore-name-error', 'div');
    input.focus();
  }

  function cancel() {
    settled = true;
    renderGrid();
  }

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
  });
  input.addEventListener('blur', commit);
}

function renderAddChoreRow() {
  const row = document.createElement('tr');
  row.className = 'add-chore-row';
  const th = document.createElement('th');
  const form = document.createElement('form');
  form.className = 'add-chore-form';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'add-chore-input';
  input.placeholder = '新增家事…';

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.textContent = '新增';

  input.addEventListener('input', () => {
    form.querySelector('.add-chore-error')?.remove();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const result = store.addChore(input.value);
    if (result.ok) {
      renderGrid();
      renderTally();
      document.querySelector('.add-chore-input')?.focus();
      return;
    }
    if (result.reason === 'duplicate') {
      showDuplicateChoreError(form, 'add-chore-error', 'span');
      return;
    }
    input.value = '';
  });

  form.appendChild(input);
  form.appendChild(submitButton);
  th.appendChild(form);
  row.appendChild(th);

  const td = document.createElement('td');
  td.colSpan = DAYS.length;
  row.appendChild(td);

  return row;
}

function renderCell(td, chore, day) {
  const color = store.getColor(chore, day);
  td.className = 'cell' + (color ? ` cell--${color}` : '');
}

function renderTally() {
  const tally = store.getTally();
  const parts = PEOPLE.map(({ color, label }) => `${label}：${tally[color] ?? 0} 次`);
  document.querySelector('#tally').textContent = parts.join('、');
}

setupColorPicker();
renderHeader();
renderGrid();
renderTally();

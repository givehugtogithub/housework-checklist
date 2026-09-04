import { createStore } from './store.js';
import { createSupabaseClient } from './supabase-client.js';
import { createAdapter } from './supabase-adapter.js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const DEFAULT_CHORES = [
  '接孩子上學', '倒廚餘', '尿布桶', '倒垃圾', '倒回收',
  '洗衣服', '晾衣服', '折衣服', '接孩子放學', '煮飯',
  '洗碗', '整理書包', '孩子洗澡', '孩子刷牙', '洗廁所',
];

const PEOPLE = [
  { color: 'blue', label: 'Sean' },
  { color: 'pink', label: 'Vera' },
];

let adapter = null;
let store;
let activeColor = null;
let year;
let month;
let todayYear;
let todayMonth;
let todayDay;

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function daysArray(y, m) {
  return Array.from({ length: daysInMonth(y, m) }, (_, i) => i + 1);
}

function weekdayLabel(day) {
  return new Date(year, month - 1, day).toLocaleDateString('zh-TW', { weekday: 'short' });
}

function isToday(day) {
  return year === todayYear && month === todayMonth && day === todayDay;
}

function showDuplicateChoreError(container, className, tag) {
  let error = container.querySelector(`.${className}`);
  if (!error) {
    error = document.createElement(tag);
    error.className = className;
    container.appendChild(error);
  }
  error.textContent = '這個家事已經存在';
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

function setupMonthSwitcher() {
  document.querySelector('#prev-month').addEventListener('click', () => switchMonth(-1));
  document.querySelector('#next-month').addEventListener('click', () => switchMonth(1));
}

function renderMonthLabel() {
  document.querySelector('#month-label').textContent = `${year} 年 ${month} 月`;
}

function renderHeader() {
  const headRow = document.querySelector('#grid thead tr');
  headRow.innerHTML = '';
  const corner = document.createElement('th');
  corner.textContent = '家事項目';
  headRow.appendChild(corner);
  for (const day of daysArray(year, month)) {
    const th = document.createElement('th');
    th.innerHTML = `${day}<br>${weekdayLabel(day)}`;
    if (isToday(day)) th.classList.add('today');
    headRow.appendChild(th);
  }
}

function scrollToToday() {
  if (year !== todayYear || month !== todayMonth) return;
  const wrapper = document.querySelector('.grid-wrapper');
  const stickyHeader = document.querySelector('#grid thead th:first-child');
  const todayHeader = document.querySelector('#grid thead th.today');
  if (!wrapper || !stickyHeader || !todayHeader) return;
  wrapper.scrollLeft = todayHeader.offsetLeft - stickyHeader.getBoundingClientRect().width;
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
  for (const day of daysArray(year, month)) {
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
  deleteButton.innerHTML =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>';
  deleteButton.setAttribute('aria-label', `刪除「${chore}」`);
  deleteButton.addEventListener('click', () => {
    const confirmed = window.confirm(`確定要刪除「${chore}」嗎？這個家事所有月份的打勾記錄也會一起消失。`);
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

  const label = document.createElement('label');
  label.className = 'sr-only';
  label.htmlFor = 'add-chore-input';
  label.textContent = '新增家事名稱';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'add-chore-input';
  input.className = 'add-chore-input';
  input.placeholder = '新增家事…';

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.innerHTML =
    '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"></path></svg><span>新增</span>';

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

  form.appendChild(label);
  form.appendChild(input);
  form.appendChild(submitButton);
  th.appendChild(form);
  row.appendChild(th);

  const td = document.createElement('td');
  td.colSpan = daysInMonth(year, month);
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

function renderAll() {
  renderMonthLabel();
  renderHeader();
  renderGrid();
  renderTally();
}

async function loadInitialChores() {
  if (!adapter) return [...DEFAULT_CHORES];
  try {
    const names = await adapter.loadChores();
    if (names.length > 0) return names;
    await adapter.seedChores(DEFAULT_CHORES);
    return [...DEFAULT_CHORES];
  } catch (err) {
    console.error('讀取家事清單失敗，改用本地預設清單', err);
    return [...DEFAULT_CHORES];
  }
}

async function loadInitialCells() {
  if (!adapter) return [];
  try {
    return await adapter.loadCells(year, month);
  } catch (err) {
    console.error('讀取格子紀錄失敗，本月將顯示空白', err);
    return [];
  }
}

async function buildStoreForMonth(chores) {
  const initialCells = await loadInitialCells();
  store = createStore(chores, daysArray(year, month), {
    adapter,
    initialCells,
    year,
    month,
  });
}

async function switchMonth(delta) {
  const currentChores = store.getChores();
  month += delta;
  if (month < 1) {
    month = 12;
    year -= 1;
  } else if (month > 12) {
    month = 1;
    year += 1;
  }
  await buildStoreForMonth(currentChores);
  renderAll();
}

function setupAdapter() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('尚未設定 Supabase（src/supabase-config.js），以本地模式執行，重新整理後資料不會保留。');
    return;
  }
  try {
    const client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    adapter = createAdapter(client);
  } catch (err) {
    console.error('Supabase client 初始化失敗，以本地模式執行', err);
  }
}

async function init() {
  const today = new Date();
  year = today.getFullYear();
  month = today.getMonth() + 1;
  todayYear = year;
  todayMonth = month;
  todayDay = today.getDate();

  setupAdapter();
  const chores = await loadInitialChores();
  await buildStoreForMonth(chores);

  setupColorPicker();
  setupMonthSwitcher();
  renderAll();
  scrollToToday();
}

init();

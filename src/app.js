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
  for (const chore of CHORES) {
    const row = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = chore;
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
    tbody.appendChild(row);
  }
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

// renderer/renderer.js

// DOM
const rootDirInput = document.getElementById('rootDirInput');
const chooseBtn = document.getElementById('chooseBtn');
const newTargetInput = document.getElementById('newTargetInput');
const addTargetBtn = document.getElementById('addTargetBtn');
const targetsList = document.getElementById('targetsList');
const scanBtn = document.getElementById('scanBtn');
const resultsEl = document.getElementById('results');
const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');
const searchInput = document.getElementById('searchInput');
const groupBySel = document.getElementById('groupBy');
const sortBySel = document.getElementById('sortBy');
const copyBtn = document.getElementById('copyBtn');

// State
let targets = loadTargets();
let rawResults = []; // absolute paths from main
let currentRoot = '';
let lastRenderedFlat = [];

// Init
renderTargetsList();

chooseBtn.addEventListener('click', async () => {
  statusEl.textContent = '';
  const dir = await window.api.chooseRoot();
  if (dir) {
    rootDirInput.value = dir;
    currentRoot = dir;
  }
});

addTargetBtn.addEventListener('click', () => {
  const val = (newTargetInput.value || '').trim();
  if (!val) return;
  if (targets.includes(val)) {
    toast('Already in list.');
    return;
  }
  targets.push(val);
  saveTargets();
  newTargetInput.value = '';
  renderTargetsList();
});

targetsList.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-del]');
  if (!btn) return;
  const name = btn.getAttribute('data-del');
  targets = targets.filter(t => t !== name);
  saveTargets();
  renderTargetsList();
});

scanBtn.addEventListener('click', async () => {
  const rootDir = rootDirInput.value.trim();
  if (!rootDir) {
    statusEl.textContent = 'Please choose a root directory first.';
    return;
  }
  if (!targets.length) {
    statusEl.textContent = 'Add at least one target folder name.';
    return;
  }

  resultsEl.textContent = '';
  countEl.textContent = '0';
  statusEl.textContent = 'Scanning…';

  try {
    const { count, results } = await window.api.runScan({ rootDir, targets });
    rawResults = results || [];
    countEl.textContent = String(count || 0);
    statusEl.textContent = 'Done.';
    renderResults();
  } catch (e) {
    statusEl.textContent = `Error: ${e.message || e}`;
  }
});

// Live controls
searchInput.addEventListener('input', renderResults);
groupBySel.addEventListener('change', renderResults);
sortBySel.addEventListener('change', renderResults);
copyBtn.addEventListener('click', () => {
  if (!lastRenderedFlat.length) return;
  navigator.clipboard.writeText(lastRenderedFlat.join('\n')).then(() => {
    toast('Copied to clipboard.');
  });
});

// Helpers
function renderTargetsList() {
  targetsList.innerHTML = '';
  if (!targets.length) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="muted">No targets yet. Add some above.</span>`;
    targetsList.appendChild(li);
    return;
  }
  for (const name of targets) {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="name">${escapeHtml(name)}</span>
      <button class="del" data-del="${escapeAttr(name)}">Delete</button>
    `;
    targetsList.appendChild(li);
  }
}

function renderResults() {
  const term = searchInput.value.trim().toLowerCase();
  // filter
  let filtered = rawResults.filter(p => !term || p.toLowerCase().includes(term));

  // sort
  const sortBy = sortBySel.value;
  filtered.sort((a, b) => {
    if (sortBy === 'az') return a.localeCompare(b);
    if (sortBy === 'za') return b.localeCompare(a);
    if (sortBy === 'lenAsc') return a.length - b.length;
    if (sortBy === 'lenDesc') return b.length - a.length;
    return 0;
  });

  // group
  const groupBy = groupBySel.value;
  let grouped = new Map(); // key -> list
  const rel = (p) => (currentRoot && p.startsWith(currentRoot)) ? p.slice(currentRoot.length).replace(/^[/\\]/,'') : p;

  if (groupBy === 'none') {
    grouped.set('All results', filtered);
  } else if (groupBy === 'target') {
    for (const p of filtered) {
      const key = inferTargetName(p);
      pushGroup(grouped, key, p);
    }
  } else if (groupBy === 'parent') {
    for (const p of filtered) {
      const key = parentDir(rel(p)) || '(root)';
      pushGroup(grouped, key, p);
    }
  } else if (groupBy === 'top') {
    for (const p of filtered) {
      const key = topLevel(rel(p)) || '(root)';
      pushGroup(grouped, key, p);
    }
  }

  // render
  resultsEl.innerHTML = '';
  lastRenderedFlat = [];

  for (const [key, list] of grouped) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'group';
    const header = document.createElement('h4');
    header.textContent = `${key} — ${list.length}`;
    groupDiv.appendChild(header);

    for (const item of list) {
      const div = document.createElement('div');
      div.className = 'item';
      const relPath = rel(item);
      div.textContent = relPath || item;
      groupDiv.appendChild(div);
      lastRenderedFlat.push(relPath || item);
    }

    resultsEl.appendChild(groupDiv);
  }

  // Update count (post-filter)
  countEl.textContent = String(filtered.length);
}

function pushGroup(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function parentDir(relPath) {
  const sep = relPath.includes('\\') && !relPath.includes('/') ? '\\' : '/';
  const parts = relPath.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join(sep);
}

function topLevel(relPath) {
  const parts = relPath.split(/[\\/]/).filter(Boolean);
  return parts[0] || '';
}

function inferTargetName(absPath) {
  // target name is the last segment of the path
  const parts = absPath.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || '(unknown)';
}

function loadTargets() {
  try {
    const s = localStorage.getItem('targets');
    if (s) {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  // default
  return ['node_modules', 'Pods', '.git', 'dist', 'build'];
}

function saveTargets() {
  localStorage.setItem('targets', JSON.stringify(targets));
}

function toast(msg) {
  statusEl.textContent = msg;
  setTimeout(() => { if (statusEl.textContent === msg) statusEl.textContent = ''; }, 1500);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s) {
  return s.replace(/"/g, '&quot;');
}
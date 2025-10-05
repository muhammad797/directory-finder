// renderer/renderer.js

// DOM
const rootDirInput = document.getElementById('rootDirInput');
const chooseBtn = document.getElementById('chooseBtn');
const newTargetInput = document.getElementById('newTargetInput');
const addTargetBtn = document.getElementById('addTargetBtn');
const targetsList = document.getElementById('targetsList');
const scanModeSel = document.getElementById('scanMode');
const targetsLabel = document.getElementById('targetsLabel');
const targetsRow = document.getElementById('targetsRow');
const extensionsRow = document.getElementById('extensionsRow');
const extensionsInput = document.getElementById('extensionsInput');
const applyExtBtn = document.getElementById('applyExtBtn');
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
let mode = 'dirs';
let extensions = loadExtensions();

// Init
renderTargetsList();
if (scanModeSel) scanModeSel.value = 'dirs';
extensionsInput.value = (extensions || []).join(', ');
updateModeUI();

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

if (scanModeSel) {
  scanModeSel.addEventListener('change', () => {
    mode = scanModeSel.value === 'files' ? 'files' : 'dirs';
    updateModeUI();
    statusEl.textContent = '';
  });
}

applyExtBtn.addEventListener('click', () => {
  const arr = parseExtensionsInput(extensionsInput.value);
  extensions = arr;
  saveExtensions();
  toast('Extensions updated');
});

extensionsInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    applyExtBtn.click();
  }
});

scanBtn.addEventListener('click', async () => {
  const rootDir = rootDirInput.value.trim();
  if (!rootDir) {
    statusEl.textContent = 'Please choose a root directory first.';
    return;
  }
  if (mode === 'dirs') {
    if (!targets.length) {
      statusEl.textContent = 'Add at least one target folder name.';
      return;
    }
  } else {
    if (!extensions.length) {
      statusEl.textContent = 'Add at least one extension (e.g., .zip).';
      return;
    }
  }

  resultsEl.textContent = '';
  countEl.textContent = '0';
  statusEl.textContent = 'Scanning…';

  try {
    const payload = mode === 'files'
      ? { rootDir, mode: 'files', extensions }
      : { rootDir, targets };
    const { count, results } = await window.api.runScan(payload);
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

      const left = document.createElement('span');
      left.textContent = relPath || item;
      div.appendChild(left);

      const actions = document.createElement('span');
      actions.style.float = 'right';

      const openBtn = document.createElement('button');
      openBtn.textContent = 'Show in Finder';
      openBtn.style.marginLeft = '8px';
      openBtn.addEventListener('click', () => {
        window.api.revealInFolder(item);
      });

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.style.marginLeft = '8px';
      delBtn.addEventListener('click', async () => {
        const noun = (mode === 'files') ? 'file' : 'folder';
        const ok = confirm(`Delete this ${noun}? This cannot be undone.`);
        if (!ok) return;
        const res = await window.api.deleteFile(item);
        if (!res || !res.ok) {
          toast(`Failed: ${res && res.error ? res.error : 'Unknown error'}`);
          return;
        }
        rawResults = rawResults.filter(p => p !== item);
        renderResults();
      });

      actions.appendChild(openBtn);
      actions.appendChild(delBtn);
      div.appendChild(actions);

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

function parseExtensionsInput(s) {
  return String(s || '')
    .split(/[,\s]+/)
    .map(x => x.trim().toLowerCase())
    .filter(Boolean);
}

function loadExtensions() {
  try {
    const s = localStorage.getItem('fileExtensions');
    if (s) {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr;
    }
  } catch {}
  return [];
}

function saveExtensions() {
  localStorage.setItem('fileExtensions', JSON.stringify(extensions));
}

function updateModeUI() {
  const isFiles = mode === 'files';
  if (targetsLabel) targetsLabel.style.display = isFiles ? 'none' : '';
  if (targetsRow) targetsRow.style.display = isFiles ? 'none' : '';
  if (targetsList) targetsList.style.display = isFiles ? 'none' : '';
  if (extensionsRow) extensionsRow.style.display = isFiles ? '' : 'none';
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
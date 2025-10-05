// renderer/renderer.js
const rootDirInput = document.getElementById('rootDirInput');
const chooseBtn = document.getElementById('chooseBtn');
const targetsInput = document.getElementById('targetsInput');
const scanBtn = document.getElementById('scanBtn');
const resultsEl = document.getElementById('results');
const countEl = document.getElementById('count');
const statusEl = document.getElementById('status');

chooseBtn.addEventListener('click', async () => {
  statusEl.textContent = '';
  const dir = await window.api.chooseRoot();
  if (dir) rootDirInput.value = dir;
});

scanBtn.addEventListener('click', async () => {
  const rootDir = rootDirInput.value.trim();
  if (!rootDir) {
    statusEl.textContent = 'Please choose a root directory first.';
    return;
  }
  const targets = targetsInput.value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  resultsEl.textContent = '';
  countEl.textContent = '0';
  statusEl.textContent = 'Scanning…';

  try {
    const { count, results } = await window.api.runScan({ rootDir, targets });
    countEl.textContent = String(count);
    resultsEl.textContent = count
      ? results.map(p => `• ${p}`).join('\n')
      : '(No matching directories found)';
    statusEl.textContent = 'Done.';
  } catch (e) {
    statusEl.textContent = `Error: ${e.message || e}`;
  }
});
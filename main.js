// main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { findTargetDirs, findFilesByExtensions } = require('./scanner');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 900,
    height: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps commonly stay active until Cmd+Q
  if (process.platform !== 'darwin') app.quit();
});

// IPC: open directory picker
ipcMain.handle('dialog:choose-root', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory', 'dontAddToRecent']
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// IPC: run scan
ipcMain.handle('scan:run', async (_evt, payload) => {
  const { rootDir } = payload || {};
  if (!rootDir) {
    throw new Error('Root directory is required.');
  }

  const mode = (payload && payload.mode) || 'dirs';

  if (mode === 'files') {
    const extensions = Array.isArray(payload.extensions) ? payload.extensions : [];
    const exclude = Array.isArray(payload.exclude) && payload.exclude.length
      ? payload.exclude
      : ['node_modules', 'Pods', '.git', 'dist', 'build'];
    const results = findFilesByExtensions(rootDir, extensions, exclude);
    return { count: results.length, results };
  }

  // default: directories mode
  const targetList = Array.isArray(payload.targets) && payload.targets.length
    ? payload.targets
    : ['node_modules', 'Pods', '.git', 'dist', 'build'];
  const results = findTargetDirs(rootDir, targetList);
  return { count: results.length, results };
});

// IPC: reveal file in system folder
ipcMain.handle('file:reveal', async (_evt, absPath) => {
  if (!absPath) throw new Error('Path is required.');
  shell.showItemInFolder(absPath);
  return true;
});

// IPC: delete file (permanent)
ipcMain.handle('file:delete', async (_evt, absPath) => {
  if (!absPath) throw new Error('Path is required.');
  try {
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      // Delete directory recursively
      fs.rmSync(absPath, { recursive: true });
    } else if (stat.isFile()) {
      fs.unlinkSync(absPath);
    } else {
      throw new Error('Unsupported path type.');
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e && e.message ? e.message : String(e) };
  }
});
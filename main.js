// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { findTargetDirs } = require('./scanner');

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
ipcMain.handle('scan:run', async (_evt, { rootDir, targets }) => {
  if (!rootDir) {
    throw new Error('Root directory is required.');
  }
  const targetList = Array.isArray(targets) && targets.length ? targets : ['node_modules', 'Pods', '.git', 'dist', 'build'];
  const results = findTargetDirs(rootDir, targetList);
  return { count: results.length, results };
});
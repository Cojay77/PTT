const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

let mainWindow = null;
let currentFilePath = null;
let fileWatcher = null;
let isInternalSaving = false;
let activeLockPath = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'ptt-settings.json');
}

function getSettings() {
  try {
    const p = getSettingsPath();
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveSettings(newSettings) {
  try {
    const current = getSettings();
    const merged = { ...current, ...newSettings };
    fs.writeFileSync(getSettingsPath(), JSON.stringify(merged, null, 2), 'utf-8');
  } catch (e) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'PTT — Project Tracking Tool',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // App Menu
  setupMenu();

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5174';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (fileWatcher) {
      fileWatcher.close();
      fileWatcher = null;
    }
    releaseLock();
  });

  // Check if a file was passed as argument (e.g. double-click on .ptt file)
  handleCliArgs(process.argv);
}

function updateTitle(filePath, isLockedByOther = false) {
  if (!mainWindow) return;
  const projectName = filePath ? path.basename(filePath) : 'Untitled Project';
  const lockStatus = isLockedByOther ? ' [Read-Only Review]' : '';
  mainWindow.setTitle(`${projectName}${lockStatus} — PTT Project Tracking Tool`);
}

function handleCliArgs(argv) {
  const fileArg = argv.find(arg => arg.endsWith('.ptt') || arg.endsWith('.db'));
  if (fileArg && fs.existsSync(fileArg)) {
    setTimeout(() => {
      loadFile(fileArg);
    }, 1500);
  }
}

function watchProjectFile(filePath) {
  if (fileWatcher) {
    fileWatcher.close();
    fileWatcher = null;
  }
  if (!filePath || !fs.existsSync(filePath)) return;

  let debounceTimer = null;
  try {
    fileWatcher = fs.watch(filePath, (eventType) => {
      if (isInternalSaving) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          if (fs.existsSync(filePath)) {
            const stat = await fs.promises.stat(filePath);
            mainWindow?.webContents.send('project:external-change', {
              filePath,
              fileName: path.basename(filePath),
              modifiedTime: stat.mtimeMs,
            });
          }
        } catch (err) {}
      }, 600);
    });
  } catch (err) {
    console.error('Failed to setup file watcher:', err);
  }
}

async function acquireLock(filePath, pilotName) {
  if (!filePath) return { locked: false };
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);
  const lockPath = path.join(dir, `.${base}.lock`);

  if (fs.existsSync(lockPath)) {
    try {
      const content = await fs.promises.readFile(lockPath, 'utf-8');
      const info = JSON.parse(content);
      const lockAgeMs = Date.now() - new Date(info.timestamp).getTime();
      const myComputer = os.hostname();
      if (info.computer !== myComputer && lockAgeMs < 3 * 60 * 60 * 1000) {
        return { locked: true, lockInfo: info };
      }
    } catch (e) {}
  }

  try {
    const myLock = {
      pilot: pilotName || os.userInfo().username || 'Project Lead',
      computer: os.hostname(),
      timestamp: new Date().toISOString(),
    };
    await fs.promises.writeFile(lockPath, JSON.stringify(myLock, null, 2));
    activeLockPath = lockPath;
    return { locked: false, lockInfo: myLock };
  } catch (e) {
    return { locked: false };
  }
}

async function releaseLock(filePath) {
  const lock = activeLockPath || (filePath ? path.join(path.dirname(filePath), `.${path.basename(filePath)}.lock`) : null);
  if (lock && fs.existsSync(lock)) {
    try {
      await fs.promises.unlink(lock);
    } catch (e) {}
  }
  activeLockPath = null;
}

async function loadFile(filePath, pilotName) {
  try {
    const buffer = await fs.promises.readFile(filePath);
    await releaseLock(currentFilePath);

    const lockResult = await acquireLock(filePath, pilotName);
    currentFilePath = filePath;
    updateTitle(filePath, lockResult.locked);
    watchProjectFile(filePath);

    saveSettings({ lastOpenedFilePath: filePath });

    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('project:loaded', {
        filePath,
        fileName: path.basename(filePath),
        data: buffer,
        lockInfo: lockResult.lockInfo,
        isLockedByOther: lockResult.locked,
      });
    }
    return {
      filePath,
      fileName: path.basename(filePath),
      data: buffer,
      lockInfo: lockResult.lockInfo,
      isLockedByOther: lockResult.locked,
    };
  } catch (err) {
    dialog.showErrorBox('Error Opening Project', `Failed to read file: ${err.message}`);
    return null;
  }
}

function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: async () => {
            await releaseLock(currentFilePath);
            currentFilePath = null;
            updateTitle(null);
            if (fileWatcher) { fileWatcher.close(); fileWatcher = null; }
            mainWindow?.webContents.send('project:new');
          },
        },
        {
          label: 'Open Project File (.ptt / .db)...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const res = await dialog.showOpenDialog(mainWindow, {
              title: 'Open PTT Project File',
              filters: [
                { name: 'PTT Project Files', extensions: ['ptt', 'db'] },
                { name: 'All Files', extensions: ['*'] },
              ],
              properties: ['openFile'],
            });
            if (!res.canceled && res.filePaths.length > 0) {
              await loadFile(res.filePaths[0]);
            }
          },
        },
        {
          label: 'Set Shared Projects Folder...',
          click: async () => {
            const res = await dialog.showOpenDialog(mainWindow, {
              title: 'Select Shared Projects Folder (e.g. Google Drive)',
              properties: ['openDirectory'],
            });
            if (!res.canceled && res.filePaths.length > 0) {
              saveSettings({ sharedProjectsFolder: res.filePaths[0] });
              mainWindow?.webContents.send('folder:updated', res.filePaths[0]);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('project:request-save');
          },
        },
        {
          label: 'Save Project As (.ptt)...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: async () => {
            mainWindow?.webContents.send('project:request-save-as');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('dialog:openProject', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Project File',
    filters: [
      { name: 'PTT Project Files', extensions: ['ptt', 'db'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return await loadFile(res.filePaths[0]);
});

ipcMain.handle('file:openByPath', async (event, filePath, pilotName) => {
  if (!fs.existsSync(filePath)) return null;
  return await loadFile(filePath, pilotName);
});

ipcMain.handle('dialog:saveProjectAs', async (event, uint8Array, suggestedName) => {
  const savedFolder = getSettings().sharedProjectsFolder;
  const defaultPath = savedFolder && suggestedName
    ? path.join(savedFolder, suggestedName)
    : (suggestedName || 'MyProject.ptt');

  const res = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Project As',
    defaultPath,
    filters: [
      { name: 'PTT Project File', extensions: ['ptt'] },
      { name: 'SQLite Database', extensions: ['db'] },
    ],
  });
  if (res.canceled || !res.filePath) return null;

  isInternalSaving = true;
  await fs.promises.writeFile(res.filePath, Buffer.from(uint8Array));
  isInternalSaving = false;

  await releaseLock(currentFilePath);
  currentFilePath = res.filePath;
  await acquireLock(res.filePath);
  updateTitle(res.filePath);
  watchProjectFile(res.filePath);

  return { filePath: res.filePath, fileName: path.basename(res.filePath) };
});

ipcMain.handle('file:saveProject', async (event, uint8Array, filePath) => {
  const targetPath = filePath || currentFilePath;
  if (!targetPath) {
    return ipcMain.emit('dialog:saveProjectAs', event, uint8Array);
  }
  isInternalSaving = true;
  await fs.promises.writeFile(targetPath, Buffer.from(uint8Array));
  setTimeout(() => { isInternalSaving = false; }, 300);
  updateTitle(targetPath);
  return { filePath: targetPath, fileName: path.basename(targetPath) };
});

ipcMain.handle('folder:selectProjectsFolder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Shared Projects Folder (e.g. Google Drive)',
    properties: ['openDirectory'],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  const folderPath = res.filePaths[0];
  saveSettings({ sharedProjectsFolder: folderPath });
  return folderPath;
});

ipcMain.handle('folder:getSavedFolder', () => {
  return getSettings().sharedProjectsFolder || null;
});

ipcMain.handle('folder:listProjects', async (event, folderPath) => {
  const target = folderPath || getSettings().sharedProjectsFolder;
  if (!target || !fs.existsSync(target)) return [];

  try {
    const entries = await fs.promises.readdir(target, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
      if (entry.isFile() && (entry.name.endsWith('.ptt') || entry.name.endsWith('.db'))) {
        const fullPath = path.join(target, entry.name);
        try {
          const stat = await fs.promises.stat(fullPath);
          const lockPath = path.join(target, `.${entry.name}.lock`);
          let lockInfo = null;

          if (fs.existsSync(lockPath)) {
            try {
              const lockContent = await fs.promises.readFile(lockPath, 'utf-8');
              lockInfo = JSON.parse(lockContent);
            } catch (e) {}
          }

          results.push({
            fileName: entry.name,
            filePath: fullPath,
            modifiedTime: stat.mtimeMs,
            sizeBytes: stat.size,
            lockInfo,
          });
        } catch (e) {}
      }
    }

    results.sort((a, b) => b.modifiedTime - a.modifiedTime);
    return results;
  } catch (err) {
    console.error('Failed to list projects in folder:', err);
    return [];
  }
});

ipcMain.handle('project:acquireLock', (event, filePath, pilotName) => acquireLock(filePath, pilotName));
ipcMain.handle('project:releaseLock', (event, filePath) => releaseLock(filePath));
ipcMain.handle('app:getCurrentFilePath', () => currentFilePath);

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', async () => {
  await releaseLock(currentFilePath);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

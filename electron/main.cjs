const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let currentFilePath = null;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

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
  });

  // Check if a file was passed as argument (e.g. double-click on .ptt file)
  handleCliArgs(process.argv);
}

function updateTitle(filePath) {
  if (!mainWindow) return;
  const projectName = filePath ? path.basename(filePath) : 'Untitled Project';
  mainWindow.setTitle(`${projectName} — PTT Project Tracking Tool`);
}

function handleCliArgs(argv) {
  const fileArg = argv.find(arg => arg.endsWith('.ptt') || arg.endsWith('.db'));
  if (fileArg && fs.existsSync(fileArg)) {
    setTimeout(() => {
      loadFile(fileArg);
    }, 1500);
  }
}

async function loadFile(filePath) {
  try {
    const buffer = await fs.promises.readFile(filePath);
    currentFilePath = filePath;
    updateTitle(filePath);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('project:loaded', {
        filePath,
        fileName: path.basename(filePath),
        data: buffer,
      });
    }
  } catch (err) {
    dialog.showErrorBox('Error Opening Project', `Failed to read file: ${err.message}`);
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
          click: () => {
            currentFilePath = null;
            updateTitle(null);
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
  const filePath = res.filePaths[0];
  const buffer = await fs.promises.readFile(filePath);
  currentFilePath = filePath;
  updateTitle(filePath);
  return {
    filePath,
    fileName: path.basename(filePath),
    data: buffer,
  };
});

ipcMain.handle('dialog:saveProjectAs', async (event, uint8Array, suggestedName) => {
  const res = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Project As',
    defaultPath: suggestedName || 'MyProject.ptt',
    filters: [
      { name: 'PTT Project File', extensions: ['ptt'] },
      { name: 'SQLite Database', extensions: ['db'] },
    ],
  });
  if (res.canceled || !res.filePath) return null;
  await fs.promises.writeFile(res.filePath, Buffer.from(uint8Array));
  currentFilePath = res.filePath;
  updateTitle(res.filePath);
  return { filePath: res.filePath, fileName: path.basename(res.filePath) };
});

ipcMain.handle('file:saveProject', async (event, uint8Array, filePath) => {
  const targetPath = filePath || currentFilePath;
  if (!targetPath) {
    // If no path set, route to Save As
    return ipcMain.emit('dialog:saveProjectAs', event, uint8Array);
  }
  await fs.promises.writeFile(targetPath, Buffer.from(uint8Array));
  updateTitle(targetPath);
  return { filePath: targetPath, fileName: path.basename(targetPath) };
});

ipcMain.handle('app:getCurrentFilePath', () => currentFilePath);

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

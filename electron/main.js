// electron/main.js - Electron main process for AI Dungeon Master 3D
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        minWidth: 1280,
        minHeight: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: '#1a1a2e',
        title: 'AI Dungeon Master 3D - Watercolor Edition',
        icon: path.join(__dirname, '../game/assets/icon.png')
    });

    // Load the game
    mainWindow.loadFile(path.join(__dirname, '../game/index.html'));

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// App lifecycle
app.whenReady().then(async () => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC Handlers for game state persistence
ipcMain.handle('game:save', async (event, { state }) => {
    try {
        // Save to localStorage via renderer
        return { success: true };
    } catch (error) {
        console.error('Save error:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('game:load', async () => {
    try {
        return { success: true, state: null };
    } catch (error) {
        console.error('Load error:', error);
        return { success: false, error: error.message };
    }
});

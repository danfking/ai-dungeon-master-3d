// electron/preload.js - Secure IPC bridge for AI Dungeon Master 3D
const { contextBridge, ipcRenderer } = require('electron');

// Expose a limited API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Game state persistence
    game: {
        save: (state) => ipcRenderer.invoke('game:save', { state }),
        load: () => ipcRenderer.invoke('game:load')
    },

    // Platform info
    platform: process.platform,
    isElectron: true
});

// Log that preload script loaded successfully
console.log('AI Dungeon Master 3D: Preload script loaded');

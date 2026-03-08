// Preload script runs in an isolated context before the renderer loads.
// Exposes a minimal API to the renderer via contextBridge. The OpenAI API key
// stays in the main process; the renderer only invokes IPC.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mealPlanner', {
  version: '0.1.0',
});

contextBridge.exposeInMainWorld('mealAPI', {
  generateRecipes: (category, allergies, portionSize) => ipcRenderer.invoke('generate-recipes', category, allergies || [], portionSize),
});

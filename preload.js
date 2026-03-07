// Preload script runs in an isolated context before the renderer loads.
// Use this file to expose a small, explicit API surface into the renderer
// via `contextBridge`. For now, we only expose static metadata so that
// future features (IPC, secure file access, etc.) can be layered in cleanly.

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('mealPlanner', {
  version: '0.1.0',
});

// Main Electron entry point for the Weekly Meal Planner Prototype.
// This file owns application lifecycle and BrowserWindow setup.

const { app, BrowserWindow } = require('electron');
const path = require('path');

/**
 * Creates the main application window and loads the renderer.
 * The renderer is a simple HTML/JS/CSS bundle under the `renderer/` folder.
 */
function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      // Keep Node.js out of the renderer for security.
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

// App lifecycle
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar to stay active
  // until the user quits explicitly, but for this prototype we simply quit.
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


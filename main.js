// Main Electron entry point for the Weekly Meal Planner Prototype.
// This file owns application lifecycle and BrowserWindow setup.
// Load environment variables first so OPENAI_API_KEY is available to aiRecipeService.
require('dotenv').config();

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { generateRecipes } = require('./aiRecipeService');

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

// IPC: renderer requests AI-generated recipes; main process calls OpenAI (API key never exposed).
ipcMain.handle('generate-recipes', async (_event, category) => {
  try {
    const recipes = await generateRecipes(category);
    return { ok: true, recipes };
  } catch (err) {
    console.error('generateRecipes failed:', err);
    return { ok: false, error: err.message || 'Could not generate recipes.' };
  }
});

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


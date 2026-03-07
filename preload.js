const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('mealPlanner', {
  version: '0.1.0',
});

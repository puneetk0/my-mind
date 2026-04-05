const { ipcMain } = require('electron');
const db = require('./db');

function registerHandlers() {
  ipcMain.handle('tasks:getAll', () => db.getAllTasks());
  ipcMain.handle('tasks:add', (_e, data) => db.addTask(data));
  ipcMain.handle('tasks:complete', (_e, id) => db.completeTask(id));
  ipcMain.handle('tasks:delete', (_e, id) => db.deleteTask(id));
  ipcMain.handle('subtasks:toggle', (_e, id) => db.toggleSubtask(id));
}

module.exports = { registerHandlers };

const { ipcMain } = require('electron');
const db = require('./db');

function registerHandlers() {
  ipcMain.handle('tasks:getAll',                ()           => db.getAllTasks());
  ipcMain.handle('tasks:add',                   (_e, data)   => db.addTask(data));
  ipcMain.handle('tasks:update',                (_e, data)   => db.updateTask(data));
  ipcMain.handle('tasks:complete',              (_e, id)     => db.completeTask(id));
  ipcMain.handle('tasks:delete',                (_e, id)     => db.deleteTask(id));
  ipcMain.handle('tasks:swapLanes',             (_e, {laneA, laneB}) => db.swapLanes(laneA, laneB));
  ipcMain.handle('subtasks:toggle',             (_e, id)     => db.toggleSubtask(id));
  ipcMain.handle('subtasks:reorder',            (_e, {taskId, newIds}) => db.reorderSubtasks(taskId, newIds));
  ipcMain.handle('constructors:getAvailable',   ()           => db.getAvailableConstructors());
  ipcMain.handle('util:openExternal',           (_e, url)    => {
    const { shell } = require('electron');
    shell.openExternal(url);
  });
}

module.exports = { registerHandlers };
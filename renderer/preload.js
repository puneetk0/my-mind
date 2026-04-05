const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pond', {
  getTasks:      ()     => ipcRenderer.invoke('tasks:getAll'),
  addTask:       (data) => ipcRenderer.invoke('tasks:add', data),
  completeTask:  (id)   => ipcRenderer.invoke('tasks:complete', id),
  deleteTask:    (id)   => ipcRenderer.invoke('tasks:delete', id),
  toggleSubtask: (id)   => ipcRenderer.invoke('subtasks:toggle', id),
  escape:        ()     => ipcRenderer.send('popover:escape'),
  onShow: (cb) => {
    ipcRenderer.on('popover:show', cb);
    return () => ipcRenderer.removeListener('popover:show', cb);
  },
  onHide: (cb) => {
    ipcRenderer.on('popover:hide', cb);
    return () => ipcRenderer.removeListener('popover:hide', cb);
  },
});

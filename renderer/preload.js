const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pond', {
  getTasks:      ()     => ipcRenderer.invoke('tasks:getAll'),
  addTask:       (data) => ipcRenderer.invoke('tasks:add', data),
  updateTask:    (data) => ipcRenderer.invoke('tasks:update', data),
  completeTask:  (id)   => ipcRenderer.invoke('tasks:complete', id),
  deleteTask:    (id)   => ipcRenderer.invoke('tasks:delete', id),
  toggleSubtask: (id)   => ipcRenderer.invoke('subtasks:toggle', id),
  reorderSubtasks: (taskId, newIds) => ipcRenderer.invoke('subtasks:reorder', { taskId, newIds }),
  swapLanes:     (laneA, laneB) => ipcRenderer.invoke('tasks:swapLanes', { laneA, laneB }),
  getConstructors:()    => ipcRenderer.invoke('constructors:getAvailable'),
  openExternal:  (url)  => ipcRenderer.invoke('util:openExternal', url),
  escape:        ()     => ipcRenderer.send('popover:escape'),
  onShow: (cb) => {
    ipcRenderer.on('popover:show', cb);
    return () => ipcRenderer.removeListener('popover:show', cb);
  },
  onHide: (cb) => {
    ipcRenderer.on('popover:hide', cb);
    return () => ipcRenderer.removeListener('popover:hide', cb);
  },
  pin: () => ipcRenderer.send('popover:pin'),
onPinned: (cb) => {
  ipcRenderer.on('popover:pinned', (_e, val) => cb(val));
  return () => ipcRenderer.removeListener('popover:pinned', cb);
},
});
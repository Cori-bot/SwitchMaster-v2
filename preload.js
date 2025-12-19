const { contextBridge, ipcRenderer } = require("electron");

// Expose a minimal, controlled IPC API to the renderer
contextBridge.exposeInMainWorld("ipc", {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  on: (channel, listener) => {
    const subscription = (event, ...data) => listener(event, ...data);
    ipcRenderer.on(channel, subscription);
    return () => ipcRenderer.removeListener(channel, subscription);
  },
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
});

contextBridge.exposeInMainWorld("env", {
  isDev:
    process.env.NODE_ENV === "development" ||
    process.env.npm_lifecycle_event === "start",
});

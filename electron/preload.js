const { contextBridge, ipcRenderer } = require("electron");

const api = {
  load_workspace: () => ipcRenderer.invoke("load_workspace"),
  save_workspace: (raw) => ipcRenderer.invoke("save_workspace", raw),
  put_attachment: (id, bytes) => ipcRenderer.invoke("put_attachment", id, bytes),
  get_attachment: (id) => ipcRenderer.invoke("get_attachment", id),
  delete_attachment: (id) => ipcRenderer.invoke("delete_attachment", id),
  uninstall_app: () => ipcRenderer.invoke("uninstall_app"),
};

contextBridge.exposeInMainWorld("pywebview", { api });
contextBridge.exposeInMainWorld("flowvanti", { api });

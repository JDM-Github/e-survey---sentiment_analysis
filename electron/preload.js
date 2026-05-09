const { contextBridge, ipcRenderer } = require('electron');
const api = {};
const types = ['batch', 'category_batch', 'accuracy', 'single'];

for (const type of types) {
    api[`getAllRuns_${type}`] = () => ipcRenderer.invoke(`${type}-get-all-runs`);
    api[`saveRun_${type}`] = (run) => ipcRenderer.invoke(`${type}-save-run`, run);
    api[`clearAllRuns_${type}`] = () => ipcRenderer.invoke(`${type}-clear-all-runs`);
}

api.isElectron = true;
contextBridge.exposeInMainWorld('electronAPI', api);
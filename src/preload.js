import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
	analyzePdf: (filePath) => ipcRenderer.invoke('analyze-pdf', filePath),
	getFilePath: (file) => webUtils.getPathForFile(file),
});

// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	// 1. 让前端可以调用主进程的“选择文件”功能
	selectFile: () => ipcRenderer.invoke('select-pdf-file'),

	// 2. 让前端可以调用主进程的“分析 PDF”功能
	analyzePDF: (filePath) => ipcRenderer.invoke('analyze-pdf', filePath),
});

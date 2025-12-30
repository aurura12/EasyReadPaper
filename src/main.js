import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { spawn } from 'node:child_process';
import started from 'electron-squirrel-startup';

// Try to force-disable GPU as early as possible to avoid spawning GPU process.
// Some Chromium/Electron builds still spawn a GPU process; append multiple
// switches to increase chances of avoiding GPU usage on problematic systems.
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
app.commandLine.appendSwitch('disable-accelerated-video-decode');
app.commandLine.appendSwitch('no-sandbox');

app.disableHardwareAcceleration();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
	app.quit();
}

// --- 后端服务控制逻辑 ---
let backendProcess = null;

const startBackend = () => {
	const isDev = !app.isPackaged;
	let scriptPath;
	let command;
	let args = [];

	if (isDev) {
		// 开发模式：直接运行 python 脚本 (api.py 在 backend 目录)
		// 在 Windows 上优先使用 `py` 启动器，否则使用 `python`
		command = process.platform === 'win32' ? 'py' : 'python';
		scriptPath = path.join(process.cwd(), 'backend', 'api.py');
		args = [scriptPath];
	} else {
		// 生产模式：运行打包后的 exe
		// 注意：你需要配置 electron-builder 将 api_server.exe 复制到 resources 目录
		const exeName = 'api_server.exe';
		scriptPath = path.join(process.resourcesPath, exeName);
		command = scriptPath;
	}

	console.log(`正在启动后端服务: ${command} ${args.join(' ')}`);
	backendProcess = spawn(command, args);

	backendProcess.stdout.on('data', (data) => {
		console.log(`Backend: ${data.toString()}`);
	});

	backendProcess.stderr.on('data', (data) => {
		console.error(`Backend Error: ${data.toString()}`);
	});
};

const createWindow = () => {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
		},
	});

	// and load the index.html of the app.
	if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
	} else {
		mainWindow.loadFile(
			path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
		);
	}

	// Open the DevTools.
	mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
	// startBackend(); // 启动后端
	createWindow();

	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

// 退出应用时杀掉 Python 进程
app.on('will-quit', () => {
	if (backendProcess) {
		backendProcess.kill();
	}
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// npm start

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// --- 1. 引入 LangChain 相关依赖 ---
import { ChatOpenAI } from '@langchain/openai';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

// 禁用 GPU 配置（保持你原有的）
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-gpu-compositing');
app.commandLine.appendSwitch('no-sandbox');
app.disableHardwareAcceleration();

if (started) {
	app.quit();
}

// --- 2. 配置 AI 逻辑 (取代原来的 backendProcess) ---
const model = new ChatOpenAI({
	apiKey: 'sk-1f5b2fe065cc4a6caa62f9f984ffe97a',
	configuration: {
		baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
	},
	modelName: 'qwen-turbo',
	temperature: 0.3,
});

const parser = StructuredOutputParser.fromZodSchema(
	z.object({
		words: z.array(
			z.object({
				word: z.string().describe('英文单词'),
				translation: z.string().describe('中文释义'),
			})
		),
	})
);

const prompt = new PromptTemplate({
	template:
		'你是一个英语专家。请从以下学术论文片段中提取出6级难度的词汇。\n{format_instructions}\n内容片段：{query}',
	inputVariables: ['query'],
	partialVariables: { format_instructions: parser.getFormatInstructions() },
});

// --- 3. 定义 IPC 处理器 ---
ipcMain.handle('analyze-pdf', async (event, filePath) => {
	console.log('收到分析请求，文件路径:', filePath);
	if (!filePath) {
		return { success: false, error: '文件路径无效 (undefined)' };
	}

	try {
		const loader = new PDFLoader(filePath);
		const docs = await loader.load();

		const textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: 2000,
			chunkOverlap: 200,
		});
		const splits = await textSplitter.splitDocuments(docs);

		const allWords = [];
		const seenWords = new Set();
		const maxChunks = Math.min(splits.length, 5);

		for (let i = 0; i < maxChunks; i++) {
			console.log(`正在处理第 ${i + 1}/${maxChunks} 段...`);
			const input = await prompt.format({ query: splits[i].pageContent });
			const response = await model.invoke(input);

			try {
				const chunkResult = await parser.parse(response.content);
				if (chunkResult.words) {
					for (const item of chunkResult.words) {
						const wLower = item.word.toLowerCase();
						if (!seenWords.has(wLower)) {
							allWords.push(item);
							seenWords.add(wLower);
						}
					}
				}
			} catch (e) {
				console.error('解析 JSON 失败', e);
			}
		}
		return { success: true, data: allWords };
	} catch (error) {
		console.error('AI 处理失败:', error);
		return { success: false, error: error.message };
	}
});

// --- 4. 窗口生命周期管理 ---
const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 1000, // 稍微调宽一点方便看结果
		height: 800,
		webPreferences: {
			// 确保这里的 preload 路径正确
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: true, // 保持开启，增强安全性
			nodeIntegration: false, // 保持关闭，增强安全性
		},
	});

	// 使用 typeof 检查避免 ReferenceError，兼容开发环境和打包环境
	const devServerUrl =
		typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined'
			? MAIN_WINDOW_VITE_DEV_SERVER_URL
			: null;
	const windowName =
		typeof MAIN_WINDOW_VITE_NAME !== 'undefined'
			? MAIN_WINDOW_VITE_NAME
			: 'main_window';

	if (devServerUrl) {
		mainWindow.loadURL(devServerUrl);
	} else {
		mainWindow.loadFile(
			path.join(__dirname, `../renderer/${windowName}/index.html`)
		);
	}

	mainWindow.webContents.openDevTools();
};

app.whenReady().then(() => {
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

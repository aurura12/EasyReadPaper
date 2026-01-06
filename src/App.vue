<template>
	<div
		class="main-interface"
		@dragenter.prevent="handleDragEnter"
		@dragover.prevent
		@dragleave.prevent="handleDragLeave"
		@drop.prevent="handleDrop"
	>
		<!-- 顶部工具栏 -->
		<div class="toolbar">
			<input
				type="file"
				ref="fileInput"
				accept=".pdf"
				style="display: none"
				@change="onFileSelected"
			/>
			<button class="import-btn" @click="handleImport">
				<span class="icon">📂</span> 导入PDF文件
			</button>
			<button
				class="wordbook-btn"
				v-if="currentView === 'home'"
				@click="currentView = 'wordbook'"
			>
				<span class="icon">📓</span> 我的单词本
			</button>
			<button
				class="back-btn"
				v-if="currentView === 'wordbook'"
				@click="currentView = 'home'"
			>
				返回首页
			</button>
		</div>

		<!-- 空状态区域 -->
		<div class="empty-state">
			<div class="empty-state" v-if="currentView === 'home'">
				<div v-if="isAnalyzing" class="loading-state">
					<div class="spinner">⏳</div>
					<p>正在分析 PDF 文件，请稍候...</p>
					<button class="cancel-btn" @click="handleCancelAnalysis">取消</button>
				</div>
				<div v-else-if="analysisResult" class="result-state">
					<h3>分析结果</h3>
					<div class="word-cards-container">
						<div
							v-for="(item, index) in analysisResult"
							:key="index"
							class="word-card"
						>
							<div class="card-content">
								<div class="card-word">{{ item.word }}</div>
								<div class="card-trans">{{ item.translation }}</div>
							</div>
							<button
								class="add-btn"
								:class="{ added: item.added }"
								@click="addToWordbook(item)"
								:disabled="item.added"
							>
								{{ item.added ? '已添加' : '+ 添加' }}
							</button>
						</div>
					</div>
					<div class="result-actions">
						<button
							class="import-all-btn"
							:disabled="isAllAdded"
							@click="addAllToWordbook"
						>
							{{ isAllAdded ? '已全部导入' : '一键导入全部' }}
						</button>
						<button class="reset-btn" @click="analysisResult = null">
							返回
						</button>
					</div>
				</div>
				<div v-else class="home-content">
					<div class="recent-files">
						<span v-if="recentFiles.length != 0" class="label">最近打开:</span>
						<span
							v-for="(item, index) in recentFiles"
							:key="index"
							class="file-link"
							@click="handleRecentClick(item)"
						>
							{{ item.name }}
							<span v-if="index < recentFiles.length - 1" class="separator"
								>|</span
							>
						</span>
					</div>
					<div class="illustration">
						<!-- 这里的 emoji 可以替换为实际的 logo 图片 -->
						📚
					</div>
					<h2 class="title">WordMine</h2>
					<p class="subtitle">导入论文以开始提取生词</p>
				</div>
			</div>

			<!-- 单词本页面 -->
			<WordBook
				v-if="currentView === 'wordbook'"
				@go-home="currentView = 'home'"
			/>
		</div>

		<!-- 拖拽覆盖层 -->
		<div v-if="isDragging" class="drag-overlay">
			<div class="drag-content">
				<span class="icon">📂</span>
				<p>释放以导入 PDF 文件</p>
			</div>
		</div>
	</div>
</template>

<script>
import WordBook from './components/WordBook.vue';

export default {
	name: 'HelloWorld',
	components: {
		WordBook,
	},
	data() {
		return {
			recentFiles: [],
			currentView: 'home',
			isAnalyzing: false,
			analysisResult: null,
			isDragging: false,
			dragCounter: 0,
			currentAnalysisId: 0,
		};
	},
	computed: {
		isAllAdded() {
			return (
				this.analysisResult && this.analysisResult.every((item) => item.added)
			);
		},
	},
	created() {
		const savedRecent = localStorage.getItem('recent_files');
		if (savedRecent) {
			try {
				this.recentFiles = JSON.parse(savedRecent);
			} catch (e) {
				console.error('Failed to load recent files', e);
			}
		}
	},
	methods: {
		handleDragEnter(e) {
			this.dragCounter++;
			this.isDragging = true;
		},
		handleDragLeave(e) {
			this.dragCounter--;
			if (this.dragCounter <= 0) {
				this.dragCounter = 0;
				this.isDragging = false;
			}
		},
		handleDrop(e) {
			this.dragCounter = 0;
			this.isDragging = false;
			const file = e.dataTransfer.files[0];
			if (file) {
				if (
					file.type === 'application/pdf' ||
					file.name.toLowerCase().endsWith('.pdf')
				) {
					this.processFile(file);
				} else {
					alert('请导入 PDF 文件');
				}
			}
		},
		handleImport() {
			// 触发隐藏的文件输入框点击事件
			this.$refs.fileInput.click();
		},
		async onFileSelected(event) {
			const file = event.target.files[0];
			if (file) {
				await this.processFile(file);
			}
			// 清空 input 以便允许重复选择同一文件
			event.target.value = '';
		},
		handleCancelAnalysis() {
			this.isAnalyzing = false;
			this.currentAnalysisId++; // 使当前的分析请求失效，防止后续回调覆盖状态
		},
		async processFile(file) {
			// 获取真实路径 (Electron 环境下需要通过 webUtils 获取)
			const filePath = window.electronAPI.getFilePath(file);

			// 将新选择的文件名添加到最近文件列表的最前面
			// 移除重复项
			this.recentFiles = this.recentFiles.filter((f) => f.name !== file.name);

			// 保存 path 以便持久化后恢复 (Electron specific)
			this.recentFiles.unshift({
				name: file.name,
				file: file,
				path: filePath,
			});

			if (this.recentFiles.length > 3) {
				this.recentFiles = this.recentFiles.slice(0, 3);
			}

			// 保存到 localStorage
			this.saveRecentFiles();

			// 直接传递包含 path 的对象，确保 analyzeFile 能获取到路径
			await this.analyzeFile({ name: file.name, path: filePath });
		},
		async analyzeFile(file) {
			// 尝试获取路径：可能是直接属性，或者是 File 对象通过 API 获取
			const filePath =
				file.path ||
				(window.electronAPI &&
				window.electronAPI.getFilePath &&
				file instanceof File
					? window.electronAPI.getFilePath(file)
					: null);

			if (!filePath) {
				console.error('文件路径无效:', file);
				alert('无法获取文件路径，请重新导入文件');
				return;
			}

			const analysisId = ++this.currentAnalysisId;
			this.isAnalyzing = true;
			this.analysisResult = null;

			try {
				// 使用 preload.js 暴露的 API 调用主进程
				// file.path 是 Electron 环境下 File 对象特有的属性，指向磁盘上的真实路径
				const data = await window.electronAPI.analyzePdf(filePath);

				// 如果 ID 不匹配，说明用户已经取消或开始了新的分析，直接忽略结果
				if (analysisId !== this.currentAnalysisId) return;

				if (data.success) {
					// 主进程返回结构: { success: true, data: [...] }
					this.analysisResult = data.data.map((item) => ({
						word: item.word,
						translation: item.translation,
						added: false,
					}));
				} else {
					console.error('分析失败:', data.error);
					alert('分析失败: ' + data.error);
				}
			} catch (error) {
				if (analysisId !== this.currentAnalysisId) return;
				console.error('请求出错:', error);
				alert('请求出错: ' + error.message);
			} finally {
				// 只有当这是当前最新的分析任务时，才关闭 loading 状态
				if (analysisId === this.currentAnalysisId) {
					this.isAnalyzing = false;
				}
			}
		},
		saveRecentFiles() {
			// 只保存可序列化的数据 (不保存 file 对象)
			const dataToSave = this.recentFiles.slice(0, 3).map((item) => ({
				name: item.name,
				path: item.path,
			}));
			localStorage.setItem('recent_files', JSON.stringify(dataToSave));
		},
		async handleRecentClick(item) {
			if (item.file) {
				this.analyzeFile(item.file);
			} else if (item.path) {
				// 直接传递包含 path 的对象，不需要重新读取文件流
				// 因为后端只需要路径即可读取文件
				this.analyzeFile({
					name: item.name,
					path: item.path,
				});
			} else {
				alert('无法打开文件，请导入新的 PDF 文件。');
			}
		},
		addToWordbook(item) {
			// 读取现有的单词本数据
			const savedData = localStorage.getItem('my_wordbook_data');
			let words = savedData ? JSON.parse(savedData) : [];

			// 检查是否已存在
			const exists = words.some(
				(w) => w.text.toLowerCase() === item.word.toLowerCase()
			);
			if (exists) {
				item.added = true; // 如果已存在，直接标记为已添加
				return;
			}

			// 添加新单词
			words.push({
				id: Date.now(),
				text: item.word,
				translation: item.translation,
				timestamp: Date.now(),
			});

			// 保存回 localStorage
			localStorage.setItem('my_wordbook_data', JSON.stringify(words));

			// 更新 UI 状态
			item.added = true;
		},
		addAllToWordbook() {
			if (!this.analysisResult || this.analysisResult.length === 0) return;

			const savedData = localStorage.getItem('my_wordbook_data');
			let words = savedData ? JSON.parse(savedData) : [];
			let count = 0;

			this.analysisResult.forEach((item, index) => {
				const exists = words.some(
					(w) => w.text.toLowerCase() === item.word.toLowerCase()
				);

				if (!exists) {
					words.push({
						id: Date.now() + index, // 确保批量添加时 ID 唯一
						text: item.word,
						translation: item.translation,
						timestamp: Date.now(),
					});
					count++;
				}
				item.added = true;
			});

			localStorage.setItem('my_wordbook_data', JSON.stringify(words));
			alert(
				count > 0 ? `成功导入 ${count} 个新单词！` : '所有单词已在单词本中'
			);
		},
	},
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.main-interface {
	/* 使用绝对定位覆盖可能存在的默认 margin */
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	background-color: #f5f5f5;
	font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
	color: #2c3e50;
}

.toolbar {
	display: flex;
	align-items: center;
	padding: 12px 20px;
	background-color: #ffffff;
	border-bottom: 1px solid #e0e0e0;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.import-btn {
	background-color: #42b983;
	color: white;
	border: none;
	padding: 8px 16px;
	border-radius: 6px;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	display: flex;
	align-items: center;
	gap: 8px;
	transition: background-color 0.2s;
}

.import-btn:hover {
	background-color: #3aa876;
}

.wordbook-btn {
	background-color: #3498db;
	color: white;
	border: none;
	padding: 8px 16px;
	border-radius: 6px;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	display: flex;
	align-items: center;
	gap: 8px;
	margin-left: 12px;
	transition: background-color 0.2s;
}

.wordbook-btn:hover {
	background-color: #2980b9;
}

.back-btn {
	background-color: #95a5a6;
	color: white;
	border: none;
	padding: 8px 16px;
	border-radius: 6px;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
	display: flex;
	align-items: center;
	gap: 8px;
	margin-left: 12px;
	transition: background-color 0.2s;
}

.back-btn:hover {
	background-color: #7f8c8d;
}

.recent-files {
	margin-left: 24px;
	font-size: 14px;
	color: #666;
	display: flex;
	align-items: center;
}

.label {
	margin-right: 8px;
	font-weight: 600;
	color: #444;
}

.file-link {
	cursor: pointer;
	color: #555;
	transition: color 0.2s;
}

.file-link:hover {
	color: #42b983;
}

.separator {
	margin: 0 8px;
	color: #ddd;
}

.empty-state {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	background-color: #fafafa;
}

.illustration {
	font-size: 64px;
	margin-bottom: 24px;
	opacity: 0.8;
}

.title {
	margin: 0;
	font-size: 28px;
	font-weight: 700;
	color: #2c3e50;
}

.subtitle {
	margin-top: 12px;
	color: #888;
	font-size: 16px;
}

.home-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
}

.loading-state,
.result-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
}

/* 单独设置 .result-state 撑满父元素 */
.result-state {
	width: 100%; /* 宽度等于父元素宽度 */
	/* 移除 max-width，取消宽度上限 */
}

/* 保留 .loading-state 原来的宽度限制（如果需要） */
.loading-state {
	max-width: 80%;
	width: 100%;
}

.spinner {
	font-size: 40px;
	margin-bottom: 20px;
	animation: spin 2s linear infinite;
}

@keyframes spin {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.cancel-btn {
	margin-top: 16px;
	padding: 8px 24px;
	background-color: #e74c3c;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
	transition: background-color 0.2s;
}

.cancel-btn:hover {
	background-color: #c0392b;
}

.word-cards-container {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 20px;
	width: 98%;
	margin: 20px 0;
	max-height: 600px;
	overflow-y: auto;
	padding: 10px;
}

.word-card {
	background: white;
	padding: 16px;
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: 12px;
	transition: transform 0.2s;
}

.word-card:hover {
	transform: translateY(-2px);
}

.card-word {
	font-size: 18px;
	font-weight: bold;
	color: #2c3e50;
	margin-bottom: 4px;
}

.card-trans {
	font-size: 14px;
	color: #666;
	line-height: 1.4;
}

.result-actions {
	display: flex;
	gap: 16px;
	margin-top: 10px;
}

.reset-btn {
	padding: 8px 20px;
	background-color: #3498db;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
}

.import-all-btn {
	padding: 8px 20px;
	background-color: #42b983;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	font-size: 14px;
	font-weight: 500;
}

.import-all-btn:disabled {
	background-color: #bdc3c7;
	cursor: not-allowed;
}

.add-btn {
	padding: 6px 12px;
	background-color: #eafaf1;
	color: #42b983;
	border: 1px solid #42b983;
	border-radius: 4px;
	cursor: pointer;
	font-size: 13px;
	transition: all 0.2s;
}

.add-btn:hover:not(:disabled) {
	background-color: #42b983;
	color: white;
}

.add-btn.added {
	background-color: #f5f5f5;
	color: #999;
	border-color: #ddd;
	cursor: default;
}

.drag-overlay {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(255, 255, 255, 0.9);
	z-index: 1000;
	display: flex;
	justify-content: center;
	align-items: center;
	border: 4px dashed #42b983;
	box-sizing: border-box;
}

.drag-content {
	text-align: center;
	pointer-events: none;
}

.drag-content .icon {
	font-size: 64px;
	display: block;
	margin-bottom: 16px;
}

.drag-content p {
	font-size: 24px;
	color: #42b983;
	font-weight: bold;
	margin: 0;
}
</style>

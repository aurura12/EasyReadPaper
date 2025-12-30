<template>
	<div class="main-interface">
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
					<button class="reset-btn" @click="analysisResult = null">返回</button>
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
		};
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
		handleImport() {
			// 触发隐藏的文件输入框点击事件
			this.$refs.fileInput.click();
		},
		async onFileSelected(event) {
			const file = event.target.files[0];
			if (!file) return;

			// 将新选择的文件名添加到最近文件列表的最前面
			// 移除重复项
			this.recentFiles = this.recentFiles.filter((f) => f.name !== file.name);

			// 保存 path 以便持久化后恢复 (Electron specific)
			this.recentFiles.unshift({
				name: file.name,
				file: file,
				path: file.path,
			});

			if (this.recentFiles.length > 3) {
				this.recentFiles = this.recentFiles.slice(0, 3);
			}

			// 保存到 localStorage
			this.saveRecentFiles();

			await this.analyzeFile(file);

			// 清空 input 以便允许重复选择同一文件
			event.target.value = '';
		},
		async analyzeFile(file) {
			this.isAnalyzing = true;
			this.analysisResult = null;

			const formData = new FormData();
			formData.append('file', file);

			try {
				const response = await fetch('http://127.0.0.1:8000/analyze_pdf', {
					method: 'POST',
					body: formData,
				});

				const data = await response.json();

				if (data.status === 'success') {
					// 假设后端返回的是一个包含 word 和 translation 的对象数组
					// 我们给每个对象添加一个 added 状态用于 UI 显示
					this.analysisResult = data.result.map((item) => ({
						word: item.word, // 对应后端 key
						translation: item.translation,
						added: false, // UI 状态控制
					}));
				} else {
					console.error('分析失败:', data.detail);
					alert('分析失败: ' + data.detail);
				}
			} catch (error) {
				console.error('请求出错:', error);
				alert('请求出错: ' + error.message);
			} finally {
				this.isAnalyzing = false;
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
				try {
					// 尝试通过路径重新加载文件 (适用于 Electron)
					const response = await fetch(`file://${item.path}`);
					const blob = await response.blob();
					const file = new File([blob], item.name, { type: 'application/pdf' });
					this.analyzeFile(file);
				} catch (error) {
					console.error(error);
					alert('无法自动重新加载文件，请重新导入: ' + item.name);
				}
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

.reset-btn {
	padding: 8px 20px;
	background-color: #3498db;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
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
</style>

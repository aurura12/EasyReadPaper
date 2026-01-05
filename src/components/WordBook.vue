<template>
	<div class="wordbook-page">
		<h2>我的单词本</h2>

		<div class="controls">
			<input
				v-model="searchQuery"
				type="text"
				placeholder="搜索单词..."
				class="search-input"
			/>

			<div class="action-bar">
				<div class="batch-controls">
					<label class="select-all-label">
						<input
							type="checkbox"
							:checked="isAllSelected"
							@change="toggleSelectAll"
							:disabled="filteredAndSortedWords.length === 0"
						/>
						全选
					</label>
					<button
						v-if="selectedWordIds.length > 0"
						@click="deleteSelected"
						class="batch-delete-btn"
					>
						删除选中 ({{ selectedWordIds.length }})
					</button>
					<button
						v-if="selectedWordIds.length > 0"
						@click="exportSelected"
						class="batch-export-btn"
					>
						导出选中 ({{ selectedWordIds.length }})
					</button>
				</div>
				<select v-model="sortBy" class="sort-select">
					<option value="time">按添加时间排序</option>
					<option value="alpha">按首字母排序</option>
				</select>
			</div>
		</div>

		<div class="word-list" v-if="filteredAndSortedWords.length > 0">
			<div
				v-for="word in filteredAndSortedWords"
				:key="word.id"
				class="word-item"
			>
				<div class="word-left-section">
					<input
						type="checkbox"
						:value="word.id"
						v-model="selectedWordIds"
						class="word-checkbox"
					/>
					<div class="word-content">
						<div class="word-main">
							<span class="word-text">{{ word.text }}</span>
							<button
								class="speak-btn"
								@click="speakWord(word.text)"
								title="点击发音"
							>
								🔊
							</button>
							<span class="word-translation">{{ word.translation }}</span>
						</div>
						<div class="word-date">
							添加于: {{ formatDate(word.timestamp) }}
						</div>
					</div>
				</div>
				<button
					class="delete-btn"
					@click="removeWord(word.id)"
					title="删除单词"
				>
					&times;
				</button>
			</div>
		</div>

		<div v-else class="empty-state">
			<p v-if="searchQuery">找不到与 "{{ searchQuery }}" 相关的单词</p>
			<p v-else>单词本空空如也，快去添加新单词吧！</p>
		</div>
	</div>
</template>

<script>
export default {
	name: 'WordBook',
	data() {
		return {
			searchQuery: '', // 搜索关键词
			sortBy: 'time', // 排序规则
			selectedWordIds: [], // 选中单词的ID列表
			words: [
				{
					id: 1,
					text: 'epiphany',
					translation: '顿悟',
					timestamp: 1714521600000,
				},
				{
					id: 2,
					text: 'serendipity',
					translation: '意外发现珍奇事物的本领',
					timestamp: 1714608000000,
				},
				{
					id: 3,
					text: 'petrichor',
					translation: '雨后泥土的芳香',
					timestamp: 1714694400000,
				},
			], // 初始化为空数组
		};
	},
	computed: {
		// 核心逻辑：先过滤，后排序
		filteredAndSortedWords() {
			// 1. 过滤搜索结果
			let result = this.words.filter((word) =>
				word.text.toLowerCase().includes(this.searchQuery.toLowerCase())
			);

			// 2. 进行排序
			return result.sort((a, b) => {
				if (this.sortBy === 'time') {
					return b.timestamp - a.timestamp;
				} else {
					return a.text.localeCompare(b.text);
				}
			});
		},
		isAllSelected() {
			if (this.filteredAndSortedWords.length === 0) return false;
			// 检查当前筛选后的所有单词是否都在选中列表中
			return this.filteredAndSortedWords.every((word) =>
				this.selectedWordIds.includes(word.id)
			);
		},
	},
	watch: {
		// 深度监听 words 数组的变化
		words: {
			handler(newWords) {
				localStorage.setItem('my_wordbook_data', JSON.stringify(newWords));
			},
			deep: true,
		},
	},
	created() {
		// 组件创建时加载本地数据
		const savedData = localStorage.getItem('my_wordbook_data');
		if (savedData) {
			this.words = JSON.parse(savedData);
		}
	},
	methods: {
		removeWord(id) {
			if (confirm('确定要删除这个单词吗？')) {
				this.words = this.words.filter((word) => word.id !== id);
			}
		},
		formatDate(ts) {
			const d = new Date(ts);
			return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
		},
		speakWord(text) {
			window.speechSynthesis.cancel(); // 播放前先停止之前的发音，防止堆积
			const utterance = new SpeechSynthesisUtterance(text);
			utterance.lang = 'en-US'; // 设置为美式英语发音
			window.speechSynthesis.speak(utterance);
		},
		toggleSelectAll() {
			if (this.isAllSelected) {
				// 取消选中当前列表中的所有单词
				const currentIds = this.filteredAndSortedWords.map((w) => w.id);
				this.selectedWordIds = this.selectedWordIds.filter(
					(id) => !currentIds.includes(id)
				);
			} else {
				// 选中当前列表中的所有单词
				const currentIds = this.filteredAndSortedWords.map((w) => w.id);
				this.selectedWordIds = [
					...new Set([...this.selectedWordIds, ...currentIds]),
				];
			}
		},
		deleteSelected() {
			if (
				confirm(`确定要删除选中的 ${this.selectedWordIds.length} 个单词吗？`)
			) {
				this.words = this.words.filter(
					(word) => !this.selectedWordIds.includes(word.id)
				);
				this.selectedWordIds = [];
			}
		},
		exportSelected() {
			const selectedWords = this.words.filter((word) =>
				this.selectedWordIds.includes(word.id)
			);
			if (selectedWords.length === 0) return;

			// 提取单词文本，用换行符连接
			const content = selectedWords.map((w) => w.text).join('\n');

			// 创建 Blob 对象并下载
			const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `words_export_${new Date().toISOString().slice(0, 10)}.txt`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		},
	},
};
</script>

<style scoped>
.wordbook-page {
	max-width: 600px;
	margin: 0 auto;
	padding: 20px;
	font-family: sans-serif;
}

.controls {
	margin-bottom: 20px;
	display: flex;
	flex-direction: column;
	gap: 15px;
}

.search-input {
	padding: 12px;
	border: 1px solid #ddd;
	border-radius: 8px;
	font-size: 16px;
}

.action-bar {
	display: flex;
	justify-content: space-between;
	gap: 10px;
	align-items: center;
}

.batch-controls {
	display: flex;
	align-items: center;
	gap: 12px;
}

.select-all-label {
	display: flex;
	align-items: center;
	gap: 6px;
	cursor: pointer;
	font-size: 14px;
	user-select: none;
}

.batch-delete-btn {
	background-color: #ff4d4f;
	color: white;
	border: none;
	padding: 6px 12px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 13px;
}

.batch-export-btn {
	background-color: #8179d9;
	color: white;
	border: none;
	padding: 6px 12px;
	border-radius: 4px;
	cursor: pointer;
	font-size: 13px;
}

.sort-select,
.back-btn {
	padding: 8px 12px;
	border: 1px solid #ccc;
	border-radius: 4px;
	background: white;
}

/* 列表样式 */
.word-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px;
	border-bottom: 1px solid #eee;
	background: #fff;
	transition: background 0.2s;
}

.word-item:hover {
	background: #f9f9f9;
}

.word-left-section {
	display: flex;
	align-items: center;
	gap: 12px;
}

.word-checkbox {
	cursor: pointer;
	transform: scale(1.2);
}

.word-main {
	margin-bottom: 4px;
}

.word-text {
	font-weight: bold;
	font-size: 1.1em;
	margin-right: 12px;
	color: #2c3e50;
}

.speak-btn {
	background: none;
	border: none;
	cursor: pointer;
	font-size: 18px;
	margin-right: 10px;
	padding: 0;
	vertical-align: middle;
	transition: transform 0.1s;
}

.speak-btn:active {
	transform: scale(0.9);
}

.word-translation {
	color: #666;
}

.word-date {
	font-size: 0.8em;
	color: #999;
}

.delete-btn {
	background: #ffeded;
	color: #ff4d4f;
	border: none;
	width: 30px;
	height: 30px;
	border-radius: 50%;
	cursor: pointer;
	font-size: 20px;
	line-height: 1;
}

.delete-btn:hover {
	background: #ff4d4f;
	color: white;
}

.empty-state {
	text-align: center;
	color: #999;
	margin-top: 50px;
}
</style>

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
				<div class="word-content">
					<div class="word-main">
						<span class="word-text">{{ word.text }}</span>
						<span class="word-translation">{{ word.translation }}</span>
					</div>
					<div class="word-date">添加于: {{ formatDate(word.timestamp) }}</div>
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

.word-main {
	margin-bottom: 4px;
}

.word-text {
	font-weight: bold;
	font-size: 1.1em;
	margin-right: 12px;
	color: #2c3e50;
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

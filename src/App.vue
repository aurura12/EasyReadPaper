<template>
	<div class="main-interface">
		<!-- 顶部工具栏 -->
		<div class="toolbar">
			<button class="import-btn" @click="handleImport">
				<span class="icon">📂</span> 导入PDF文件
			</button>
			<div class="recent-files">
				<span class="label">最近打开:</span>
				<span
					v-for="(file, index) in recentFiles"
					:key="index"
					class="file-link"
				>
					{{ file }}
					<span v-if="index < recentFiles.length - 1" class="separator">|</span>
				</span>
			</div>
		</div>

		<!-- 空状态区域 -->
		<div class="empty-state">
			<div class="illustration">
				<!-- 这里的 emoji 可以替换为实际的 logo 图片 -->
				📚
			</div>
			<h2 class="title">WordMine</h2>
			<p class="subtitle">导入论文以开始提取生词</p>
		</div>
	</div>
</template>

<script>
export default {
	name: 'HelloWorld',
	data() {
		return {
			recentFiles: ['ML.pdf', 'QI.pdf'],
		};
	},
	methods: {
		handleImport() {
			console.log('Import PDF clicked');
			// TODO: 这里后续将集成 Electron 的文件选择对话框
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
</style>

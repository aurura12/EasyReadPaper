<template>
	<div class="mine-page">
		<h2>我的统计</h2>

		<ActivityHeatmap
			title="已添加单词"
			action="添加"
			unit="单词"
			:data="extractData('added')"
			:colorLevel="[{ min: 1 }, { min: 5 }, { min: 10 }, { min: 20 }]"
		/>

		<ActivityHeatmap
			title="已导出单词"
			action="导出"
			unit="单词"
			:data="extractData('exported')"
			:colorLevel="[{ min: 1 }, { min: 2 }, { min: 5 }, { min: 10 }]"
		/>

		<ActivityHeatmap
			title="已分析论文"
			action="分析"
			unit="论文"
			:data="extractData('analyzed')"
			:colorLevel="[{ min: 1 }, { min: 2 }, { min: 3 }, { min: 4 }]"
		/>
	</div>
</template>

<script>
import ActivityHeatmap from './ActivityHeatmap.vue';

export default {
	components: { ActivityHeatmap },
	data() {
		return { stats: {} };
	},
	mounted() {
		const data = localStorage.getItem('user_activity_stats');
		this.stats = data ? JSON.parse(data) : {};
	},
	methods: {
		extractData(key) {
			const result = {};
			for (const date in this.stats) {
				result[date] = this.stats[date][key] || 0;
			}
			return result;
		},
	},
};
</script>

<template>
	<div class="heatmap-wrapper">
		<div class="heatmap-header">
			<span class="total-count"
				>在去年 {{ action }} {{ totalCount }} {{ unit }}</span
			>
		</div>

		<div class="heatmap-main">
			<div class="days-labels">
				<div class="label-spacer"></div>
				<div class="day-label"></div>
				<div class="day-label">Mon</div>
				<div class="day-label"></div>
				<div class="day-label">Wed</div>
				<div class="day-label"></div>
				<div class="day-label">Fri</div>
				<div class="day-label"></div>
			</div>

			<div class="heatmap-content">
				<div class="months-labels">
					<span
						v-for="(month, index) in monthLabels"
						:key="index"
						:style="{ gridColumnStart: month.col }"
					>
						{{ month.name }}
					</span>
				</div>

				<div class="grid">
					<div class="week" v-for="(week, i) in weeks" :key="i">
						<div
							class="day"
							v-for="(day, j) in week"
							:key="j"
							:class="day.isFuture ? 'level-future' : getLevelClass(day.count)"
							:title="day.isFuture ? '' : `${day.date}: ${day.count} ${unit}`"
						></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	props: ['data', 'action', 'unit', 'colorLevel'],
	computed: {
		totalCount() {
			return this.weeks.flat().reduce((acc, day) => acc + (day.count || 0), 0);
		},
		// 3. 优化月份显示逻辑
		monthLabels() {
			const labels = [];
			const monthNames = [
				'Jan',
				'Feb',
				'Mar',
				'Apr',
				'May',
				'Jun',
				'Jul',
				'Aug',
				'Sep',
				'Oct',
				'Nov',
				'Dec',
			];

			this.weeks.forEach((week, index) => {
				// 使用该周的最后一天来判断月份（更符合热力图习惯：新月份开始即显示标签）
				const date = new Date(week[6].date);
				const monthName = monthNames[date.getMonth()];

				if (index === 0) {
					labels.push({ name: monthName, col: 1 });
				} else {
					const prevDate = new Date(this.weeks[index - 1][6].date);
					if (date.getMonth() !== prevDate.getMonth()) {
						labels.push({ name: monthName, col: index + 1 });
					}
				}
			});
			return labels;
		},
		weeks() {
			const weeks = [];
			let currentWeek = [];
			const now = new Date();
			// 强制使用本地时间今天
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

			// 网格终点：本周六
			const lastDayOfGrid = new Date(today);
			lastDayOfGrid.setDate(today.getDate() + (6 - today.getDay()));

			// 网格起点：往前推 52 周（共 53 列）
			const startDate = new Date(lastDayOfGrid);
			startDate.setDate(lastDayOfGrid.getDate() - (53 * 7 - 1));

			let curr = new Date(startDate);
			while (curr <= lastDayOfGrid) {
				const y = curr.getFullYear();
				const m = String(curr.getMonth() + 1).padStart(2, '0');
				const d = String(curr.getDate()).padStart(2, '0');
				const dateStr = `${y}-${m}-${d}`;

				currentWeek.push({
					date: dateStr,
					count: this.data[dateStr] || 0,
					isFuture: curr > today,
				});

				if (currentWeek.length === 7) {
					weeks.push(currentWeek);
					currentWeek = [];
				}
				curr.setDate(curr.getDate() + 1);
			}
			return weeks;
		},
	},
	methods: {
		getLevelClass(count) {
			if (!count) return 'level-0';
			for (let i = this.colorLevel.length - 1; i >= 0; i--) {
				if (count >= this.colorLevel[i].min) return `level-${i + 1}`;
			}
			return 'level-0';
		},
	},
};
</script>

<style scoped>
.heatmap-wrapper {
	font-family:
		-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
	color: #24292f;
	background: #ffffff;
	padding: 20px;
	border: 1px solid #d0d7de;
	border-radius: 6px;
	margin-bottom: 20px;
}

.total-count {
	font-size: 14px;
	font-weight: 600;
	margin-bottom: 12px;
	display: block;
}

.heatmap-main {
	display: flex;
}

/* --- 星期标签精准对齐样式 --- */
.days-labels {
	display: flex;
	flex-direction: column;
	margin-right: 8px;
	color: #57606a;
	font-size: 9px;
}

.label-spacer {
	height: 20px; /* 严格等于月份标签行高度 */
	margin-bottom: 4px; /* 严格等于月份标签下间距 */
}

.day-label {
	height: 11px; /* 方块高度 */
	line-height: 11px;
	margin-bottom: 2px; /* 方块间距 */
}

.heatmap-content {
	display: flex;
	flex-direction: column;
	overflow-x: auto;
}

/* --- 月份标签精准对齐样式 --- */
.months-labels {
	display: grid;
	/* 11px(方块) + 2px(gap) = 13px。如果方块是11，间距是2，这里应为 13px */
	grid-template-columns: repeat(53, 13px);
	height: 20px;
	margin-bottom: 4px;
	color: #57606a;
	font-size: 10px;
}

.grid {
	display: flex;
	gap: 2px;
}

.week {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.day {
	width: 11px;
	height: 11px;
	border-radius: 2px;
	outline: 1px solid rgba(27, 31, 35, 0.06);
	outline-offset: -1px;
}

.level-0 {
	background-color: #ebedf0;
}
.level-1 {
	background-color: #9be9a8;
}
.level-2 {
	background-color: #40c463;
}
.level-3 {
	background-color: #30a14e;
}
.level-4 {
	background-color: #216e39;
}

.level-future {
	background-color: transparent;
	outline: none;
}

.heatmap-content::-webkit-scrollbar {
	height: 5px;
}
.heatmap-content::-webkit-scrollbar-thumb {
	background: #d0d7de;
	border-radius: 10px;
}
</style>

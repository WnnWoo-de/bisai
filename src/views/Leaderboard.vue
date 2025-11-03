<template>
  <section class="container">
    <div class="section-header">
      <h2>排行榜</h2>
      <p class="muted">数据基于本地参与记录，默认展示打卡排行。</p>
    </div>

    <!-- 概览与图表类型切换 -->
    <div class="summary card">
      <div class="sum-item">
        <span class="label">我的排名</span>
        <span class="value">{{ myRank ? '#' + myRank : '—' }}</span>
      </div>
      <div class="sum-item">
        <span class="label">{{ metricLabel }}</span>
        <span class="value">{{ myValue }}</span>
      </div>
      <div class="sum-item">
        <span class="label">参与用户</span>
        <span class="value">{{ participantCount }}</span>
      </div>
      <div class="sum-item">
        <span class="label">Top 1</span>
        <span class="value">{{ top1?.username || '—' }}<span v-if="top1">｜{{ top1.value }}</span></span>
      </div>
    </div>

    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="tab"
        :class="{ active: activeTab === t.key }"
        @click="activeTab = t.key"
      >{{ t.label }}</button>
    </div>

    <div class="controls">
      <div class="chart-type">
        <button class="pill" :class="{ active: chartType === 'bar' }" @click="chartType = 'bar'">柱状图</button>
        <button class="pill" :class="{ active: chartType === 'doughnut' }" @click="chartType = 'doughnut'">饼图</button>
      </div>
      <div class="filters">
        <input class="input" type="text" v-model="filterText" placeholder="搜索用户…" />
        <label class="switch">
          <input type="checkbox" v-model="ascending" />
          <span>升序</span>
        </label>
        <label class="switch">
          <input type="checkbox" v-model="anonymize" />
          <span>匿名显示</span>
        </label>
        <select class="select" v-model.number="topN">
          <option :value="10">前 10</option>
          <option :value="15">前 15</option>
          <option :value="20">前 20</option>
        </select>
      </div>
      <div class="export">
        <button class="pill" @click="exportExcel">导出 Excel</button>
        <button class="pill" @click="exportJSON">导出 JSON</button>
        <button class="pill" @click="downloadChartPNG">下载图表 PNG</button>
        <button class="pill" @click="copyRanking">复制榜单</button>
      </div>
    </div>

    <div class="card" v-reveal>
      <h3 class="name">排行规则说明</h3>
      <p class="muted">打卡、活动、成就、兑换四项分别统计，切换上方标签查看不同维度。</p>
      <p class="muted">排行榜数据基于本地记录，若清理浏览器数据将导致重置。</p>
      <p class="muted">想提升排名？去<router-link :to="ctaLink">{{ ctaText }}</router-link>参与以积累。</p>
    </div>

    <div class="layout">
      <div class="left">
        <!-- 领奖台 Top 3 -->
        <div class="podium" v-if="topThree.length">
          <article v-for="(u, i) in topThree" :key="u.username" class="card podium-item" :class="'pos-' + (i + 1)" v-reveal>
            <div class="medal">{{ i === 0 ? '🥇' : (i === 1 ? '🥈' : '🥉') }}</div>
            <div class="info">
              <h3 class="name" :class="{ me: u.username === auth.user?.username }">{{ displayName(u) }}</h3>
              <p class="muted">{{ metricLabel }}：<strong>{{ u.value }}</strong></p>
            </div>
          </article>
        </div>

        <!-- 其他选手 4~ -->
        <div class="list others">
          <article v-for="(u, idx) in others" :key="u.username" class="card item" :class="{ me: u.username === auth.user?.username }" v-reveal>
            <div class="rank">#{{ idx + 4 }}</div>
            <div class="info">
              <h3 class="name">{{ displayName(u) }}</h3>
              <p class="muted">{{ metricLabel }}：<strong>{{ u.value }}</strong></p>
            </div>
          </article>
          <p v-if="!activeRanks.length" class="muted empty">暂无数据，去<router-link :to="ctaLink">{{ ctaText }}</router-link>试试吧～</p>
        </div>
      </div>

      <div class="chart" v-reveal>
        <canvas ref="chartRef"></canvas>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCheckinStore } from '@/stores/checkin'
import { useActivityStore } from '@/stores/activity'
import { useShopStore } from '@/stores/shop'
import { useAchievementsStore } from '@/stores/achievements'
import { useNotifyStore } from '@/stores/notify'

const auth = useAuthStore()
const checkin = useCheckinStore()
const activity = useActivityStore()
const shop = useShopStore()
const achievements = useAchievementsStore()
const notify = useNotifyStore()

const tabs = [
  { key: 'checkins', label: '打卡排行' },
  { key: 'activities', label: '活动排行' },
  { key: 'achievements', label: '成就排行' },
  { key: 'redeems', label: '兑换排行' },
]
const activeTab = ref('checkins')

const knownUsers = computed(() => {
  const set = new Set()
  const keys = [
    Object.keys(checkin.checkinsByUser ?? {}),
    Object.keys(activity.registrationsByUser ?? {}),
    Object.keys(shop.redemptionsByUser ?? {}),
    Object.keys(achievements.awardsByUser ?? {}),
  ]
  keys.forEach(arr => arr.forEach(u => set.add(u)))
  if (auth.user?.username) set.add(auth.user.username)
  return Array.from(set)
})

function sortRanks(arr, asc = false) {
  const items = [...arr]
  items.sort((a, b) => asc ? (a.value - b.value) : (b.value - a.value))
  return items
}

const checkinRanks = computed(() => {
  return sortRanks(knownUsers.value.map(u => ({
    username: u,
    value: (checkin.checkinsByUser?.[u]?.length ?? 0)
  })).filter(x => x.value > 0), ascending.value)
})

const activityRanks = computed(() => {
  return sortRanks(knownUsers.value.map(u => ({
    username: u,
    value: (activity.registrationsByUser?.[u]?.length ?? 0)
  })).filter(x => x.value > 0), ascending.value)
})

const achievementRanks = computed(() => {
  return sortRanks(knownUsers.value.map(u => ({
    username: u,
    value: (achievements.awardsByUser?.[u]?.length ?? 0)
  })).filter(x => x.value > 0), ascending.value)
})

const redeemRanks = computed(() => {
  return sortRanks(knownUsers.value.map(u => ({
    username: u,
    value: (shop.redemptionsByUser?.[u]?.length ?? 0)
  })).filter(x => x.value > 0), ascending.value)
})

const metricLabel = computed(() => {
  switch (activeTab.value) {
    case 'checkins': return '打卡次数'
    case 'activities': return '报名次数'
    case 'achievements': return '成就数量'
    case 'redeems': return '兑换次数'
  }
  return '数量'
})

const activeRanks = computed(() => {
  switch (activeTab.value) {
    case 'checkins': return checkinRanks.value
    case 'activities': return activityRanks.value
    case 'achievements': return achievementRanks.value
    case 'redeems': return redeemRanks.value
  }
  return []
})

const filterText = ref('')
const ascending = ref(false)
const anonymize = ref(false)
const topN = ref(15)

const filteredRanks = computed(() => {
  const ft = filterText.value.trim().toLowerCase()
  if (!ft) return activeRanks.value
  return activeRanks.value.filter(x => (x.username || '').toLowerCase().includes(ft))
})

const topThree = computed(() => filteredRanks.value.slice(0, 3))
const others = computed(() => filteredRanks.value.slice(3, topN.value))
const participantCount = computed(() => filteredRanks.value.length)
const top1 = computed(() => topThree.value[0])
const myRank = computed(() => {
  const me = auth.user?.username
  if (!me) return 0
  const idx = activeRanks.value.findIndex(r => r.username === me)
  return idx >= 0 ? (idx + 1) : 0
})
const myValue = computed(() => {
  const me = auth.user?.username
  if (!me) return 0
  const item = activeRanks.value.find(r => r.username === me)
  return item?.value ?? 0
})

const chartType = ref('bar')
const accentColor = computed(() => {
  switch (activeTab.value) {
    case 'checkins': return '#66a6ff'
    case 'activities': return '#6fcf97'
    case 'achievements': return '#f9a825'
    case 'redeems': return '#ab47bc'
  }
  return '#66a6ff'
})

const ctaLink = computed(() => {
  switch (activeTab.value) {
    case 'checkins': return '/checkin'
    case 'activities': return '/activity'
    case 'achievements': return '/achievements'
    case 'redeems': return '/store'
  }
  return '/'
})
const ctaText = computed(() => {
  switch (activeTab.value) {
    case 'checkins': return '打卡'
    case 'activities': return '报名活动'
    case 'achievements': return '解锁成就'
    case 'redeems': return '兑换商品'
  }
  return '参与'
})

const anonNameMap = computed(() => {
  const map = new Map()
  activeRanks.value.forEach((x, i) => {
    if (x.username) map.set(x.username, `用户${i + 1}`)
  })
  return map
})

function displayName(u) {
  if (anonymize.value) return anonNameMap.value.get(u.username) || '匿名用户'
  return u.username || '匿名用户'
}

let Chart
let chartInst
const chartRef = ref(null)

async function ensureChart() {
  if (!Chart) {
    const mod = await import('chart.js/auto')
    Chart = mod.default || mod
  }
}

function renderChart() {
  if (!chartRef.value) return
  const top = filteredRanks.value.slice(0, 6)
  const labels = top.map(x => anonymize.value ? (anonNameMap.value.get(x.username) || '匿名') : (x.username || '匿名'))
  const data = top.map(x => x.value)
  const colors = {
    checkins: '#66a6ff',
    activities: '#6fcf97',
    achievements: '#f9a825',
    redeems: '#ab47bc',
  }
  const color = colors[activeTab.value] || '#66a6ff'

  if (chartInst) {
    chartInst.destroy()
    chartInst = null
  }
  const ctx = chartRef.value.getContext('2d')
  const isBar = chartType.value === 'bar'
  chartInst = new Chart(ctx, {
    type: chartType.value,
    data: {
      labels,
      datasets: [{ label: metricLabel.value, data, backgroundColor: color }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      ...(isBar ? { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } : {})
    }
  })
}

onMounted(async () => {
  await ensureChart()
  await nextTick()
  renderChart()
})

watch([activeTab, activeRanks, chartType], async () => {
  await nextTick()
  renderChart()
})

// 当筛选、匿名、TopN变化时，更新图表以反映当前列表
watch([filterText, anonymize, topN], async () => {
  await nextTick()
  renderChart()
})

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}


function exportExcel() {
  const rows = filteredRanks.value.map((x, i) => ({ 
    排名: i + 1, 
    用户名: anonymize.value ? (anonNameMap.value.get(x.username) || '匿名') : (x.username || '匿名'), 
    [metricLabel.value]: x.value 
  }))
  
  import('xlsx').then(XLSX => {
    // 创建工作簿
    const wb = XLSX.utils.book_new()
    // 创建工作表
    const ws = XLSX.utils.json_to_sheet(rows)
    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, tabs.find(t => t.key === activeTab.value)?.label || '排行榜')
    // 生成xlsx文件并下载
    XLSX.writeFile(wb, `leaderboard-${activeTab.value}.xlsx`)
    notify.success('已导出 Excel')
  }).catch(err => {
    console.error('导出Excel失败:', err)
    notify.error('导出失败，请重试')
  })
}

function exportJSON() {
  const rows = filteredRanks.value.map((x, i) => ({ rank: i + 1, username: anonymize.value ? (anonNameMap.value.get(x.username) || '匿名') : (x.username || '匿名'), value: x.value, metric: metricLabel.value, tab: activeTab.value }))
  const json = JSON.stringify(rows, null, 2)
  downloadBlob(new Blob([json], { type: 'application/json' }), `leaderboard-${activeTab.value}.json`)
  notify.success('已导出 JSON')
}

function downloadChartPNG() {
  if (!chartInst) { notify.info('图表尚未生成'); return }
  const url = chartInst.toBase64Image()
  const a = document.createElement('a')
  a.href = url
  a.download = `chart-${activeTab.value}-${chartType.value}.png`
  a.click()
  notify.success('已下载图表 PNG')
}

async function copyRanking() {
  try {
    const lines = filteredRanks.value.slice(0, topN.value).map((x, i) => `${i + 1}. ${(anonymize.value ? (anonNameMap.value.get(x.username) || '匿名') : (x.username || '匿名'))} - ${x.value}`)
    const title = `【${metricLabel.value}】排行榜（${tabs.find(t => t.key === activeTab.value)?.label || ''}）`
    const text = [title, ...lines].join('\n')
    await navigator.clipboard.writeText(text)
    notify.success('榜单已复制到剪贴板')
  } catch {
    notify.error('复制失败，请手动选择文本复制')
  }
}
</script>

<style scoped>
.container { max-width: 960px; margin: 80px auto 40px; padding: 0 20px; }
.section-header { display: flex; align-items: baseline; justify-content: space-between; }
.section-header h2 { font-size: 1.6rem; margin: 0 0 6px; }
.muted { color: #666; }

.summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 12px; border: 1px solid rgba(238, 238, 238, 0.5); border-radius: 10px; margin: 8px 0 12px; background: transparent; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.summary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-color: rgba(102, 166, 255, 0.3); }
.sum-item { display: grid; gap: 4px; }
.sum-item .label { color: #666; font-size: 0.9rem; }
.sum-item .value { font-weight: 600; }

.tabs { display: flex; gap: 8px; margin: 10px 0 16px; flex-wrap: wrap; }
.tab { padding: 8px 12px; border-radius: 20px; border: 1px solid rgba(224, 224, 224, 0.5); background: transparent; cursor: pointer; transition: transform 0.2s ease; }
.tab:hover:not(.active) { transform: translateY(-1px); border-color: rgba(102, 166, 255, 0.3); }
.tab.active { background: #66a6ff; color: #fff; border-color: #66a6ff; }

.controls { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; margin: -4px 0 12px; }
.chart-type { display: flex; gap: 6px; }
.pill { padding: 6px 10px; border: 1px solid rgba(224, 224, 224, 0.5); border-radius: 16px; background: transparent; cursor: pointer; font-size: 0.9rem; transition: transform 0.2s ease; }
.pill:hover:not(.active) { transform: translateY(-1px); border-color: rgba(102, 166, 255, 0.3); }
.pill.active { background: #66a6ff; color: #fff; border-color: #66a6ff; }
.filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.export { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.input { padding: 6px 10px; border: 1px solid #ddd; border-radius: 8px; min-width: 160px; }
.select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 8px; }
.switch { display: inline-flex; gap: 6px; align-items: center; color: #333; }

.layout { display: grid; grid-template-columns: 1.2fr 1fr; gap: 16px; align-items: start; }
.left { display: grid; gap: 14px; }
.list { display: grid; gap: 10px; }
.card.item { display: grid; grid-template-columns: 56px 1fr; align-items: center; gap: 10px; padding: 12px; border: 1px solid rgba(238, 238, 238, 0.5); border-radius: 10px; background: transparent; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-color: rgba(102, 166, 255, 0.3); }
.card.item { display: grid; grid-template-columns: 56px 1fr; align-items: center; gap: 10px; padding: 12px; border: 1px solid rgba(238, 238, 238, 0.5); border-radius: 10px; background: transparent; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.card.item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-color: rgba(102, 166, 255, 0.3); }
.card.item.me { border-color: #66a6ff; box-shadow: 0 0 0 2px rgba(102,166,255,0.12) inset; }
.rank { font-size: 1.1rem; font-weight: bold; color: #66a6ff; }
.name { margin: 0; font-size: 1.05rem; }
.name.me { color: #2e7d32; }

.podium { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.podium-item { display: grid; grid-template-columns: 40px 1fr; align-items: center; gap: 10px; padding: 12px; border: 1px solid rgba(238, 238, 238, 0.5); border-radius: 10px; background: transparent; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.podium-item:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.podium-item.pos-1 { border-color: rgba(255, 213, 79, 0.7); }
.podium-item.pos-2 { border-color: rgba(176, 190, 197, 0.7); }
.podium-item.pos-3 { border-color: rgba(188, 170, 164, 0.7); }
.medal { font-size: 1.2rem; }
.others .empty { margin-top: 8px; }

.chart { height: 320px; border: 1px solid rgba(238, 238, 238, 0.5); border-radius: 10px; padding: 8px; background: transparent; }

@media (max-width: 768px) {
  .layout { grid-template-columns: 1fr; }
  .summary { grid-template-columns: repeat(2, 1fr); }
  .podium { grid-template-columns: 1fr; }
  .chart { height: 240px; }
}
</style>
<template>
  <section class="container">
    <h2>碳足迹分析</h2>
    <p class="desc">填写常见生活数据，估算每周碳排放并获取环保建议。</p>

    <div class="grid two">
      <div class="card">
        <h3 class="title">基础信息</h3>
        <div class="form-grid">
          <label class="field">
            <span>通勤方式</span>
            <select v-model="form.commuteMode">
              <option value="car">小汽车</option>
              <option value="bus">公交</option>
              <option value="metro">地铁</option>
              <option value="bike">自行车</option>
              <option value="walk">步行</option>
            </select>
          </label>
          <label class="field">
            <span>单日通勤距离（km）</span>
            <input type="number" v-model.number="form.commuteKmPerDay" min="0" step="0.1" />
          </label>
          <label class="field">
            <span>每周通勤天数</span>
            <input type="number" v-model.number="form.commuteDaysPerWeek" min="0" max="7" />
          </label>

          <label class="field">
            <span>月用电量（kWh）</span>
            <input type="number" v-model.number="form.electricityMonthlyKwh" min="0" step="0.1" />
          </label>
          <label class="field">
            <span>月用气量（m³）</span>
            <input type="number" v-model.number="form.gasMonthlyM3" min="0" step="0.1" />
          </label>

          <label class="field">
            <span>每周荤食次数（餐）</span>
            <input type="number" v-model.number="form.meatMealsPerWeek" min="0" />
          </label>
          <label class="field">
            <span>每周素食次数（餐）</span>
            <input type="number" v-model.number="form.plantMealsPerWeek" min="0" />
          </label>

          <div class="field-group">
            <span class="label">每周回收</span>
            <div class="row">
              <label class="field small">
                <span>塑料瓶（个）</span>
                <input type="number" v-model.number="form.recycle.plasticBottles" min="0" />
              </label>
              <label class="field small">
                <span>易拉罐（个）</span>
                <input type="number" v-model.number="form.recycle.aluminumCans" min="0" />
              </label>
              <label class="field small">
                <span>纸张（kg）</span>
                <input type="number" v-model.number="form.recycle.paperKg" min="0" step="0.1" />
              </label>
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="btn glow" @click="onCompute">计算</button>
          <button class="btn btn-primary glow" :disabled="!result" @click="onSave">保存本次结果</button>
        </div>
        <div v-if="hint" class="hint">{{ hint }}</div>
      </div>

      <div class="card" v-if="result">
        <h3 class="title">结果（每周）</h3>
        <ul class="breakdown">
          <li><span>通勤</span><strong>{{ result.breakdown.commute }} kg</strong></li>
          <li><span>用电</span><strong>{{ result.breakdown.electricity }} kg</strong></li>
          <li><span>用气</span><strong>{{ result.breakdown.gas }} kg</strong></li>
          <li><span>饮食</span><strong>{{ result.breakdown.diet }} kg</strong></li>
          <li><span>回收抵扣</span><strong>{{ result.breakdown.recycle }} kg</strong></li>
          <li class="total"><span>总计</span><strong>{{ result.total }} kg CO2e</strong></li>
        </ul>
        <div class="chart-wrap">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </div>
    </div>

    <div class="card" v-if="auth.isLoggedIn">
      <h3 class="title">每周目标与进度</h3>
      <div class="form-grid">
        <div>
          <label>每周减碳目标（kg CO2e）</label>
          <input type="number" min="1" step="1" v-model.number="goalInput" />
        </div>
        <div style="align-self: end;">
          <button class="btn btn-secondary" @click="onSaveGoal">保存目标</button>
        </div>
      </div>
      <div v-if="goalInput > 0 && result" class="progress-wrap">
        <div class="desc">当前总量：<strong>{{ result.total }} kg</strong>，目标：<strong>{{ goalInput }} kg</strong></div>
        <div class="progress-bar">
          <div class="progress-inner" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="muted">达成度：{{ progressPercent }}%</div>
      </div>
      <p v-else class="muted">设置每周目标后可实时看到达成进度。</p>
    </div>

    <div class="card" v-if="result">
      <h3 class="title">环保建议</h3>
      <ul class="tips">
        <li v-for="(t, i) in tips" :key="i">{{ t }}</li>
      </ul>
      <router-link class="link" :to="{ path: '/ai-advice', query: { q: '回收', category: 'recyclable' } }">查看更多分类建议 →</router-link>
    </div>

    <div class="card">
      <h3 class="title">历史记录</h3>
      <p class="desc">保存的计算会显示在这里，仅对当前登录用户可见。</p>
      <div v-if="history.length === 0" class="muted">暂无记录</div>
      <div v-else class="history">
        <div v-for="(rec, i) in history" :key="i" class="history-item">
          <div class="meta">{{ new Date(rec.date).toLocaleString() }}</div>
          <div class="val"><strong>{{ rec.total }} kg</strong></div>
          <div class="mini">
            <span>通勤 {{ rec.breakdown.commute }}｜电 {{ rec.breakdown.electricity }}｜气 {{ rec.breakdown.gas }}｜食 {{ rec.breakdown.diet }}｜回收 {{ rec.breakdown.recycle }}</span>
          </div>
        </div>
        <div class="actions" style="margin-top: 8px;">
          <button class="btn" @click="copySummary">复制本次结果</button>
          <button class="btn btn-primary" @click="onClear">清空历史</button>
        </div>
      </div>
    </div>

    <div class="card" v-if="history.length > 0">
      <h3 class="title">历史趋势</h3>
      <div class="chart-wrap"><Line :data="trendData" :options="trendOptions" /></div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useFootprintStore } from '@/stores/footprint'
import { useNotifyStore } from '@/stores/notify'
import { Bar, Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const auth = useAuthStore()
const footprint = useFootprintStore()
const notify = useNotifyStore()
const hint = ref('')

const form = ref({
  commuteMode: 'metro',
  commuteKmPerDay: 10,
  commuteDaysPerWeek: 5,
  electricityMonthlyKwh: 120,
  gasMonthlyM3: 20,
  meatMealsPerWeek: 7,
  plantMealsPerWeek: 7,
  recycle: { plasticBottles: 4, aluminumCans: 2, paperKg: 1 },
})

const resultRef = ref(null)
const result = computed(() => resultRef.value)

// 每周目标（kg CO2e），按用户持久化
const username = computed(() => auth.user?.username ?? '')
const goalInput = ref(0)
onMounted(() => {
  const savedGoal = footprint.goalOf(username.value)
  if (savedGoal) goalInput.value = savedGoal
})

function onSaveGoal() {
  if (!auth.isLoggedIn) { hint.value = '请先登录'; return }
  const res = footprint.setGoal(username.value, goalInput.value)
  hint.value = res.message
  if (res.ok) notify.success(res.message)
  else notify.error(res.message)
}

const progressPercent = computed(() => {
  const goal = footprint.goalOf(username.value)
  const total = result.value?.total ?? null
  if (!goal || !total) return 0
  const p = ((goal - total) / goal) * 100
  return Math.max(0, Math.min(100, Math.round(p)))
})

function onCompute() {
  hint.value = ''
  const r = footprint.computeWeekly(form.value)
  resultRef.value = r
}

function onSave() {
  if (!auth.isLoggedIn) { hint.value = '请先登录'; return }
  if (!result.value) { hint.value = '请先计算'; return }
  footprint.saveRecord(auth.user?.username ?? '', result.value, form.value)
  notify.success('已保存本次碳足迹结果')
}

const history = computed(() => footprint.records(auth.user?.username ?? ''))

const trendData = computed(() => {
  const items = history.value.slice(-12)
  return {
    labels: items.map(r => new Date(r.date).toLocaleDateString()),
    datasets: [{
      label: '历史总量 (kg/周)',
      data: items.map(r => r.total),
      borderColor: accent.value,
      backgroundColor: `${accent.value}22`,
      fill: true,
      tension: 0.25,
      pointRadius: 3,
    }],
  }
})

const trendOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false }, ticks: { color: textColor.value, font: { size: 12 } } },
    y: { grid: { color: borderColor.value }, ticks: { color: textColor.value } },
  },
  plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.6)' } },
}))

// 主题颜色
function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
const accent = ref('#388e3c')
const textColor = ref('#333')
const borderColor = ref('#eee')
onMounted(() => {
  accent.value = cssVar('--ray-accent-2', accent.value)
  textColor.value = cssVar('--text', textColor.value)
  borderColor.value = cssVar('--border', borderColor.value)
})

const chartData = computed(() => {
  const b = result.value?.breakdown || { commute: 0, electricity: 0, gas: 0, diet: 0, recycle: 0 }
  return {
    labels: ['通勤', '用电', '用气', '饮食', '回收抵扣'],
    datasets: [{
      label: 'kg CO2e / 周',
      data: [b.commute, b.electricity, b.gas, b.diet, b.recycle],
      backgroundColor: accent.value,
      borderRadius: 6,
      barThickness: 18,
    }],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false }, ticks: { color: textColor.value, font: { size: 12 } } },
    y: { grid: { color: borderColor.value }, ticks: { display: false } },
  },
  plugins: { legend: { display: false }, title: { display: false }, tooltip: { backgroundColor: 'rgba(0,0,0,0.6)' } },
}))

const tips = computed(() => {
  const r = result.value
  if (!r) return []
  const t = []
  // 动态识别最大来源，给出针对性建议
  const breakdown = r.breakdown
  const entries = [
    ['通勤', breakdown.commute, '考虑地铁/公交或拼车，减少驾车里程。'],
    ['用电', breakdown.electricity, '更换节能设备，优化空调和待机能耗。'],
    ['用气', breakdown.gas, '改善保温与密封，缩短热水器使用时长。'],
    ['饮食', breakdown.diet, '减少红肉，提高植物性餐比例。'],
  ]
  const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a), entries[0])
  if (max[1] > 0) t.push(`主要来源为「${max[0]}」：${max[2]}`)
  if (r.breakdown.commute > 10) t.push('通勤排放偏高：考虑地铁/公交或拼车，减少驾车里程。')
  if (r.breakdown.electricity > 15) t.push('用电排放偏高：更换 LED 灯泡、关闭待机、提升空调设定温度。')
  if (r.breakdown.gas > 10) t.push('用气排放偏高：检查保温与漏风，优化热水器使用时长与温度。')
  if (r.breakdown.diet > 8) t.push('饮食排放偏高：增加每周植物性餐次数，减少红肉摄入。')
  if (r.breakdown.recycle >= 0) t.push('回收抵扣较少：尝试按四分类投放，增加纸张与金属回收。')
  if (!t.length) t.push('表现良好：继续保持绿色生活方式，并分享给更多人。')
  return t
})

function copySummary() {
  if (!result.value) { hint.value = '请先计算'; return }
  const b = result.value.breakdown
  const text = `本周碳足迹：${result.value.total} kg CO2e\n通勤 ${b.commute}｜电 ${b.electricity}｜气 ${b.gas}｜食 ${b.diet}｜回收 ${b.recycle}`
  navigator.clipboard.writeText(text).then(() => notify.success('已复制本次结果'))
    .catch(() => notify.error('复制失败'))
}

function onClear() {
  if (!auth.isLoggedIn) { hint.value = '请先登录'; return }
  footprint.clearRecords(username.value)
  notify.success('已清空历史记录')
}
</script>

<style lang="scss" scoped>
.container { max-width: 960px; margin: 0 auto; padding: 24px 20px; }
.desc { color: var(--muted); }
.grid.two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .card { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: transparent; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
  .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: var(--ray-accent-2, var(--blue)); }
  .title { color: var(--text); }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.progress-wrap { display: grid; gap: 8px; }
.progress-bar { height: 12px; background: var(--border); border-radius: 8px; overflow: hidden; }
.progress-inner { height: 100%; background: var(--ray-accent-2, #66a6ff); width: 0%; transition: width .4s ease; }
.actions { display: flex; gap: 10px; }
.btn { padding: 10px 14px; border: none; border-radius: 6px; background: var(--blue); color: #fff; cursor: pointer; }
.btn.btn-primary { background: var(--blue); }
.btn.btn-secondary { background: var(--ray-accent-2, #66a6ff); }
.muted { color: var(--muted); }
.field { display: grid; gap: 6px; color: var(--text); }
.field span { color: var(--muted); font-size: 0.9rem; }
.field input, .field select { border: 1px solid var(--border); background: transparent; color: var(--text); border-radius: 10px; padding: 8px 10px; }
.field-group { display: grid; gap: 6px; }
.field.small { grid-template-columns: 1fr; }
.row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }

.actions { display: flex; gap: 10px; align-items: center; }
.hint { color: var(--muted); }

.breakdown { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.breakdown li { display: flex; justify-content: space-between; color: var(--text); }
.breakdown li.total strong { color: var(--ray-accent-2, var(--blue)); }
.chart-wrap { height: 200px; margin-top: 8px; }

.tips { list-style: disc; margin-left: 18px; color: var(--text); }
.tips li { margin: 4px 0; }

.history { display: grid; gap: 10px; }
.history-item { display: grid; grid-template-columns: 2fr 1fr; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
.history-item .meta { color: var(--muted); font-size: 0.85rem; }
.history-item .val { color: var(--text); }
.history-item .mini { grid-column: 1 / -1; color: var(--muted); font-size: 0.85rem; }

@media (max-width: 840px) {
  .grid.two { grid-template-columns: 1fr; }
}
</style>
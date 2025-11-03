<template>
  <section class="community">
    <header class="hero">
      <h1 class="title">社区</h1>
      <p class="subtitle">分享绿色生活、AI识别成果与公益行动故事</p>
      <div class="filters">
        <button :class="['chip', { active: activeTab==='all' }]" @click="activeTab='all'">全部</button>
        <button :class="['chip', { active: activeTab==='hot' }]" @click="activeTab='hot'">热门</button>
        <button :class="['chip', { active: activeTab==='latest' }]" @click="activeTab='latest'">最新</button>
      </div>
    </header>

    <div class="compose card">
      <div class="compose-header">
        <img class="avatar" src="@/assets/images/avatar.png" alt="头像" />
        <div class="placeholder">分享你今天的绿色行动...</div>
      </div>
      <textarea
        v-model="content"
        class="composer"
        rows="4"
        :maxlength="charLimit"
        :placeholder="auth.isLoggedIn ? '例如：骑行通勤、分类投递、低碳菜谱...' : '请先登录后再发布内容'"
      />
      <div class="compose-meta">
        <div class="counter" :class="{ warn: charCount > charLimit * 0.9 }">{{ charCount }} / {{ charLimit }}</div>
        <div class="tips" v-if="!auth.isLoggedIn">未登录，无法发布。</div>
      </div>
      <div class="compose-media">
        <button class="btn glow" @click="triggerSelectImage" :disabled="attachments.length >= maxImages">添加图片</button>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onSelectImage" />
        <div v-if="attachments.length" class="thumbs">
          <div v-for="(img, i) in attachments" :key="i" class="thumb">
            <img :src="img" alt="预览" />
            <button class="remove" @click="removeImage(i)" aria-label="移除图片">✕</button>
          </div>
        </div>
      </div>
      <div class="compose-actions">
        <div class="tag-suggestions">
          <button class="chip small" v-for="t in suggestedTags" :key="t" @click="addTag(t)">#{{ t }}</button>
        </div>
        <button class="btn btn-primary glow" :disabled="!canPublish" @click="publish">发布</button>
      </div>
      <div v-if="tags.length" class="tag-list">
        <button v-for="t in tags" :key="t" class="chip small tag-remove" @click="removeTag(t)">#{{ t }} ✕</button>
      </div>
    </div>

    <!-- 碳足迹分析与记录（主题联动） -->
    <div class="card carbon">
      <div class="carbon-header">
        <h3 class="sub">碳足迹记录</h3>
        <p class="desc">每天打卡可获积分：<strong>{{ checkin.pointsPerCheckin }}</strong></p>
      </div>
      <div class="actions">
        <button
          ref="carbonBtn"
          class="btn btn-primary glow btn-carbon-record"
          :disabled="!auth.isLoggedIn || checkedToday || loading"
          @click="onCarbonRecord"
        >
          {{ checkedToday ? '已记录' : (auth.isLoggedIn ? '记录足迹' : '请先登录') }}
        </button>
        <div v-if="hint" class="hint">{{ hint }}</div>
      </div>

      <div class="streak">
        <div class="streak-bar">
          <div class="streak-bar-fill" :style="{ width: streakPercent + '%' }"></div>
        </div>
        <div class="streak-meta">最近 7 天连续：<strong>{{ streakCount }}</strong> 天</div>
      </div>

      <div class="chart-wrap">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <div class="feed">
      <article v-for="post in filteredPosts" :key="post.id" class="post card">
        <div class="post-header">
          <img class="avatar" :src="post.avatar" alt="头像" />
          <div class="meta">
            <h3 class="author">{{ post.author }}</h3>
            <div class="time">{{ post.time }}</div>
          </div>
          <div class="tags">
            <span v-for="t in post.tags" :key="t" class="chip small">#{{ t }}</span>
          </div>
        </div>
        <div class="content" v-text="post.content" />
        <div v-if="post.images?.length" class="post-images">
          <img v-for="(img, i) in post.images" :key="i" :src="img" alt="配图" />
        </div>
        <div class="post-actions">
          <button class="action" @click="like(post)">👍 {{ post.likes }}</button>
          <button class="action" @click="comment(post)">💬 {{ post.comments }}</button>
          <button class="action" @click="share(post)">↗ 分享</button>
        </div>
      </article>
    </div>
    <!-- 庆祝彩带层 -->
    <div ref="fxLayer" class="fx-layer" aria-hidden="true"></div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCheckinStore } from '@/stores/checkin'
import { useNotifyStore } from '@/stores/notify'
import { useAchievementsStore } from '@/stores/achievements'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const activeTab = ref('all')
const content = ref('')
const tags = ref<string[]>([])
const attachments = ref<string[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const maxImages = 3
const charLimit = 280
const charCount = computed(() => content.value.length)
const suggestedTags = ['绿色行动','垃圾分类','低碳生活','AI识别','公益活动']
const COMMUNITY_STORAGE_KEY = 'community-posts'

const addTag = (t: string) => { if (!tags.value.includes(t)) tags.value.push(t) }
const removeTag = (t: string) => { tags.value = tags.value.filter(x => x !== t) }
const triggerSelectImage = () => fileInput.value?.click()
const onSelectImage = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  for (const f of files) {
    if (!f.type.startsWith('image/')) { notify.info('仅支持图片文件'); continue }
    if (attachments.value.length >= maxImages) { notify.info(`最多添加 ${maxImages} 张图片`); break }
    const url = await readFileAsDataURL(f)
    attachments.value.push(url)
  }
  input.value = ''
}
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
const removeImage = (i: number) => { attachments.value.splice(i, 1) }
const canPublish = computed(() => auth.isLoggedIn && content.value.trim().length > 0)
const publish = () => {
  if (!canPublish.value) { hint.value = auth.isLoggedIn ? '请输入内容' : '请先登录'; return }
  const now = new Date()
  posts.value.unshift({
    id: Date.now(),
    author: auth.user?.username || '我',
    avatar: '/src/static/logo.png',
    time: now.toLocaleString(),
    content: content.value,
    tags: [...tags.value],
    images: [...attachments.value],
    likes: 0,
    comments: 0,
    hot: false
  })
  savePosts()
  content.value = ''
  tags.value = []
  attachments.value = []
  notify.success('发布成功')
}

function loadPosts() {
  try {
    const raw = localStorage.getItem(COMMUNITY_STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch (e) { return [] }
}
function savePosts() {
  try { localStorage.setItem(COMMUNITY_STORAGE_KEY, JSON.stringify(posts.value)) } catch (_) {}
}

const posts = ref([
    { id: 1, author: '绿我同行 GreenSight-小林', avatar: '/src/static/logo.png', time: '今天 08:12', content: '清晨步行上班，顺手捡拾小区塑料瓶。', tags: ['绿色行动', '步行通勤'], likes: 18, comments: 5, hot: true },
  { id: 2, author: 'Eco AI', avatar: '/src/static/logo.png', time: '昨天 21:05', content: '用 AI 识别图像中的垃圾类型，指导分类投放。', tags: ['AI识别', '垃圾分类'], likes: 42, comments: 12, hot: true },
  { id: 3, author: 'Sunny', avatar: '/src/static/logo.png', time: '昨天 13:27', content: '今天尝试低碳菜谱：蔬菜沙拉 + 零一次性餐具。', tags: ['低碳生活'], likes: 9, comments: 2, hot: false },
])
onMounted(() => {
  // 载入历史帖子并追加到当前列表顶部
  const history = loadPosts()
  if (history.length) {
    posts.value = [...history, ...posts.value]
  }
})

const filteredPosts = computed(() => {
  switch (activeTab.value) {
    case 'hot': return posts.value.filter(p => p.hot)
    case 'latest': return posts.value
    default: return posts.value
  }
})

const like = (post) => { post.likes++ }
const comment = (post) => { post.comments++ }
const share = (post) => { /* 可接入分享 */ }

// ---- 碳足迹分析与记录 ----
const auth = useAuthStore()
const checkin = useCheckinStore()
const notify = useNotifyStore()
const achievements = useAchievementsStore()
const loading = ref(false)
const hint = ref('')
const carbonBtn = ref<HTMLButtonElement | null>(null)
const fxLayer = ref<HTMLElement | null>(null)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const username = computed(() => auth.user?.username ?? '')
const checkedToday = computed(() => checkin.isChecked(username.value))
const recentDays = computed(() => checkin.recent(username.value, 7))

const streakCount = computed(() => {
  const days = recentDays.value || []
  let count = 0
  for (let i = 0; i < days.length; i++) {
    if (days[i].checked) count++
    else break
  }
  return count
})
const streakPercent = computed(() => Math.round(Math.min(100, (streakCount.value / 7) * 100)))

async function onCarbonRecord() {
  hint.value = ''
  if (!auth.isLoggedIn) return
  loading.value = true
  const res = await checkin.checkIn(username.value)
  hint.value = res.message
  if (res.ok) {
    notify.success(res.message)
    pulseButton()
    celebrate()
    const a1 = achievements.award(username.value, 'first_checkin')
    if (a1.ok) notify.success(a1.message)
    const msgs = achievements.checkThresholds(username.value, auth.points)
    msgs.forEach(m => notify.success(m))
  } else {
    notify.info(res.message)
  }
  loading.value = false
}

function pulseButton() {
  const el = carbonBtn.value
  if (!el) return
  el.classList.add('pulse')
  setTimeout(() => el.classList.remove('pulse'), 500)
}

function celebrate() {
  if (reduceMotion) return
  const root = fxLayer.value
  const btn = carbonBtn.value
  if (!root) return
  const rect = btn?.getBoundingClientRect()
  const originX = (rect?.left ?? window.innerWidth / 2) + (rect?.width ?? 0) / 2
  const originY = (rect?.top ?? window.innerHeight * 0.4) + (rect?.height ?? 0) / 2
  const count = 24
  const palette = ['🌍','🌱','♻️','🌿','💚','🍃','✨']
  for (let i = 0; i < count; i++) {
    const span = document.createElement('span')
    span.className = 'confetti'
    span.textContent = palette[i % palette.length]
    const dx = (Math.random() * 2 - 1) * 140
    const dy = 60 + Math.random() * 160
    const rot = (Math.random() * 90 - 45)
    span.style.left = originX + 'px'
    span.style.top = originY + 'px'
    span.style.setProperty('--dx', dx + 'px')
    span.style.setProperty('--dy', dy + 'px')
    span.style.setProperty('--rot', rot + 'deg')
    span.style.animationDelay = (Math.random() * 0.1).toFixed(2) + 's'
    root.appendChild(span)
    span.addEventListener('animationend', () => span.remove())
  }
}

// 主题颜色 → 图表颜色
function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}
const accent1 = ref('#66bb6a')
const accent2 = ref('#388e3c')
const textColor = ref<string>('#333')
const mutedColor = ref<string>('#666')
const borderColor = ref<string>('#eee')
onMounted(() => {
  accent1.value = cssVar('--ray-accent-1', accent1.value)
  accent2.value = cssVar('--ray-accent-2', accent2.value)
  textColor.value = cssVar('--text', textColor.value)
  mutedColor.value = cssVar('--muted', mutedColor.value)
  borderColor.value = cssVar('--border', borderColor.value)
})

const chartData = computed(() => {
  const labels = recentDays.value.map(d => d.date.slice(5)).reverse()
  const values = recentDays.value.map(d => (d.checked ? 1 : 0)).reverse()
  return {
    labels,
    datasets: [
      {
        label: '打卡',
        data: values,
        backgroundColor: accent2.value,
        borderRadius: 6,
        barThickness: 18,
      },
    ],
  }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: textColor.value, font: { size: 12 } },
    },
    y: {
      grid: { color: borderColor.value },
      ticks: { display: false },
      suggestedMin: 0,
      suggestedMax: 1,
    },
  },
  plugins: {
    legend: { display: false },
    title: { display: false },
    tooltip: { backgroundColor: 'rgba(0,0,0,0.6)' },
  },
}))
</script>

<style lang="scss" scoped>
.community { max-width: 920px; margin: 0 auto; padding: 24px 20px; }

.hero {
  padding: 24px 8px 8px;
  color: var(--text);
  .title { font-size: 1.6rem; margin-bottom: 6px; }
  .subtitle { color: var(--muted); opacity: 1; margin-bottom: 14px; }
  .filters { display: flex; gap: 10px; }
}

.chip {
  display: inline-flex; align-items: center;
  padding: 6px 12px; border-radius: 999px;
  color: var(--text); background: transparent;
  border: 1px solid var(--border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
  &.active, &:hover { transform: translateY(-1px); border-color: var(--ray-accent-2, var(--blue)); box-shadow: 0 8px 22px var(--ray-shadow, rgba(102,166,255,0.35)); }
  &.small { padding: 4px 8px; font-size: 0.9em; }
}

.card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--ray-accent-2, var(--blue));
}

.compose { margin-bottom: 18px; }
.compose-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.compose .avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); }
.compose .placeholder { color: var(--muted); }
.composer { width: 100%; margin-top: 6px; resize: vertical; border-radius: 10px; border: 1px solid var(--border); background: transparent; color: var(--text); padding: 10px; }
.compose-meta { display: flex; align-items: center; justify-content: space-between; }
.counter { color: var(--muted); font-size: 0.85rem; }
.counter.warn { color: var(--ray-accent-2, var(--blue)); }
.tips { color: var(--muted); font-size: 0.85rem; }
.compose-media { display: grid; gap: 10px; margin-top: 8px; }
.thumbs { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; }
.thumb { position: relative; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
.thumb img { width: 100%; height: 90px; object-fit: cover; display: block; }
.thumb .remove { position: absolute; right: 6px; top: 6px; border: 1px solid var(--border); background: rgba(255,255,255,0.06); color: var(--text); border-radius: 999px; width: 22px; height: 22px; line-height: 18px; text-align: center; cursor: pointer; }
.compose-actions { display: flex; gap: 10px; margin-top: 10px; }
.tag-suggestions { display: flex; gap: 8px; flex-wrap: wrap; }
.tag-list { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 8px; }
.tag-remove { border-color: var(--border); color: var(--text); background: transparent; }

.btn { border: 1px solid var(--border); color: var(--text); background: transparent; border-radius: 10px; padding: 8px 14px; transition: box-shadow .25s ease, transform .25s ease, border-color .25s ease, color .25s ease; }
.btn.glow:hover { transform: translateY(-1px); box-shadow: 0 8px 22px var(--ray-shadow, rgba(102,166,255,0.35)); border-color: var(--ray-accent-2, var(--blue)); color: var(--text); }
.btn-primary { color: var(--text); background: linear-gradient(135deg, var(--ray-accent-2, var(--blue)), var(--ray-accent-1, var(--green))); border-color: var(--ray-accent-2, var(--blue)); }

.btn-carbon-record { position: relative; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.12); padding-left: 36px; }
.btn-carbon-record::before { content: "🌍"; position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 16px; opacity: 0.9; }
.btn-carbon-record::after { content: ""; position: absolute; inset: 0; background: linear-gradient(120deg, rgba(255,255,255,0.0) 30%, rgba(255,255,255,0.35) 50%, rgba(255,255,255,0.0) 70%); transform: translateX(-100%); animation: shine 2.4s ease-in-out infinite; }
.btn-carbon-record.pulse { box-shadow: 0 0 0 0 var(--ray-accent-2); animation: pulse 0.5s ease-out; }

.carbon { margin-bottom: 18px; }
.carbon .desc { color: var(--muted); }
.actions { display: flex; gap: 10px; align-items: center; }
.hint { color: var(--muted); }

.streak { display: grid; gap: 8px; margin-top: 10px; }
.streak-bar { height: 8px; border-radius: 999px; background: rgba(241,243,245,0.12); overflow: hidden; }
.streak-bar-fill { height: 100%; background: linear-gradient(90deg, var(--ray-accent-2), var(--ray-accent-1)); box-shadow: inset 0 -1px 0 rgba(255,255,255,0.4); transition: width .4s ease; }
.streak-meta { color: var(--muted); font-size: 0.9rem; }

.chart-wrap { height: 160px; margin-top: 12px; }

/* 庆祝彩带（环保符号） */
.fx-layer { position: fixed; inset: 0; pointer-events: none; z-index: 999; }
.confetti { position: absolute; font-size: 18px; will-change: transform, opacity; animation: confetti 1.1s ease-out forwards; }
@keyframes confetti { to { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); opacity: 0; } }
@keyframes shine { 0% { transform: translateX(-100%); } 60% { transform: translateX(100%); } 100% { transform: translateX(100%); } }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 var(--ray-accent-2); } 100% { box-shadow: 0 0 0 16px rgba(76, 175, 80, 0); } }

.feed { display: flex; flex-direction: column; gap: 16px; }
.post-header { display: flex; align-items: center; gap: 12px; }
.post .avatar { width: 40px; height: 40px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); }
.post .meta { display: flex; flex-direction: column; }
.post .author { margin: 0; font-size: 1rem; color: var(--text); }
.post .time { font-size: 0.85rem; color: var(--muted); }
.post .tags { margin-left: auto; display: flex; gap: 8px; }
.post .content { color: var(--text); margin-top: 10px; }
.post-images { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; margin-top: 8px; }
.post-images img { width: 100%; height: 140px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border); }
.post-actions { display: flex; gap: 12px; margin-top: 12px; }
.action { color: var(--text); background: transparent; border: 1px solid var(--border); border-radius: 10px; padding: 6px 10px; transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease; }
.action:hover { transform: translateY(-1px); border-color: var(--ray-accent-2, var(--blue)); box-shadow: 0 8px 22px var(--ray-shadow, rgba(102,166,255,0.35)); }

@media (max-width: 768px) { .community { padding: 14px 12px; } .post .tags { display: none; } }
</style>
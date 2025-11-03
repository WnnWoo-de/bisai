<template>
  <section class="container">
    <h2 v-reveal>公益活动</h2>
    <p class="desc" v-reveal>浏览并报名参加环保公益活动。报名需登录。</p>

    <!-- 搜索栏 -->
    <div class="search-bar" v-reveal>
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索活动标题或地点..." 
          class="search-input"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>

    <!-- 筛选和排序栏 -->
    <div class="filter-bar" v-reveal>
      <div class="filter-section">
        <div class="chips">
          <button
            v-for="cat in allCategories"
            :key="cat"
            class="chip"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = cat"
          >{{ cat }}</button>
        </div>
        
        <!-- 状态筛选 -->
        <div class="status-filter">
          <select v-model="statusFilter" class="status-select">
            <option value="all">全部状态</option>
            <option value="upcoming">即将开始</option>
            <option value="registered">已报名</option>
            <option value="ended">已结束</option>
          </select>
        </div>
      </div>

      <div class="sort-section">
        <select v-model="sortBy" class="sort-select">
          <option value="date">按时间排序</option>
          <option value="points">按积分排序</option>
          <option value="category">按分类排序</option>
        </select>
        <span class="counter">共 {{ filteredActivities.length }} 项</span>
      </div>
    </div>

    <!-- 快速操作栏 -->
    <div class="quick-actions" v-reveal v-if="auth.isLoggedIn">
      <button 
        class="quick-btn" 
        :class="{ active: showOnlyRegistered }"
        @click="toggleRegisteredFilter"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 12l2 2 4-4"></path>
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
        我的报名 ({{ registeredCount }})
      </button>
    </div>

    <!-- 活动列表 -->
    <div v-if="isLoading" class="loading-state">
      <div class="skeleton-grid">
        <div v-for="i in 6" :key="i" class="skeleton-card">
          <div class="skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton-title"></div>
            <div class="skeleton-subtitle"></div>
            <div class="skeleton-meta"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="filteredActivities.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 class="empty-title">{{ getEmptyStateTitle() }}</h3>
      <p class="empty-desc">{{ getEmptyStateDesc() }}</p>
      <button v-if="hasActiveFilters" @click="clearAllFilters" class="btn btn-primary">
        清除筛选条件
      </button>
    </div>

    <div v-else class="grid">
      <ImageCard
        v-for="(act, index) in filteredActivities"
        :key="act.id"
        :img="act.image || logoUrl"
        :alt="act.title"
        :title="act.title"
        :subtitle="fmtDate(act.date) + '｜地点：' + act.location"
        :meta="'参与可获积分：' + act.points"
        :revealOptions="{ duration: 0.6, distance: 10, delay: index * 0.05 }"
      >
        <template #actions>
          <button v-if="isPast(act.date)" class="btn" disabled>已结束</button>
          <button v-else-if="isRegistered(act.id)" class="btn" @click="onUnregister(act.id)">取消报名</button>
          <button v-else class="btn btn-primary" @click="onRegister(act.id)">报名参加</button>
        </template>
      </ImageCard>
    </div>

    <div v-if="hint" class="hint">{{ hint }}</div>

    <div class="card" v-reveal>
      <h3 class="title">报名指南</h3>
      <ul>
        <li>浏览活动详情，确认时间与地点。</li>
        <li>登录后点击“报名参加”，成功后会获得积分。</li>
        <li>若无法参加请及时“取消报名”，将名额留给他人。</li>
      </ul>
    </div>

    <div class="grid">
      <ImageCard
        img="@/assets/images/logo.svg"
        alt="环保小贴士 · 出行"
        title="环保小贴士 · 出行"
        subtitle="优先步行、骑行或公共交通，减少碳排放。"
        :revealOptions="{ duration: 0.6, distance: 10 }"
      />
      <ImageCard
        img="@/assets/images/logo.svg"
        alt="环保小贴士 · 垃圾分类"
        title="环保小贴士 · 垃圾分类"
        subtitle="现场按'四分类'投放：可回收、厨余、有害、其他。"
        :revealOptions="{ duration: 0.6, distance: 10, delay: 0.08 }"
      />
      <ImageCard
        img="@/assets/images/logo.svg"
        alt="环保小贴士 · 减塑"
        title="环保小贴士 · 减塑"
        subtitle="自带水杯和餐具，减少一次性用品使用。"
        :revealOptions="{ duration: 0.6, distance: 10, delay: 0.16 }"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActivityStore } from '@/stores/activity'
import { useNotifyStore } from '@/stores/notify'
import { useAchievementsStore } from '@/stores/achievements'
import ImageCard from '@/components/ui/ImageCard.vue'
import logoUrl from '@/assets/images/logo.svg'

const router = useRouter()
const auth = useAuthStore()
const activity = useActivityStore()
const notify = useNotifyStore()
const achievements = useAchievementsStore()
const hint = ref('')

// 响应式状态
const searchQuery = ref('')
const activeCategory = ref('全部')
const statusFilter = ref('all')
const sortBy = ref('date')
const showOnlyRegistered = ref(false)
const isLoading = ref(false)

const username = computed(() => auth.user?.username ?? '')

// 分类选项
const allCategories = computed(() => {
  const set = new Set(activity.activities.map(a => a.category).filter(Boolean))
  return ['全部', ...Array.from(set)]
})

// 已报名活动数量
const registeredCount = computed(() => {
  return activity.activities.filter(act => isRegistered(act.id)).length
})

// 是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  return searchQuery.value || 
         activeCategory.value !== '全部' || 
         statusFilter.value !== 'all' ||
         showOnlyRegistered.value
})

// 筛选和排序后的活动列表
const filteredActivities = computed(() => {
  let items = [...activity.activities]
  
  // 搜索筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(act => 
      act.title.toLowerCase().includes(query) || 
      act.location.toLowerCase().includes(query)
    )
  }
  
  // 分类筛选
  if (activeCategory.value !== '全部') {
    items = items.filter(act => act.category === activeCategory.value)
  }
  
  // 状态筛选
  if (statusFilter.value !== 'all') {
    items = items.filter(act => {
      switch (statusFilter.value) {
        case 'upcoming':
          return !isPast(act.date) && !isRegistered(act.id)
        case 'registered':
          return isRegistered(act.id)
        case 'ended':
          return isPast(act.date)
        default:
          return true
      }
    })
  }
  
  // 已报名筛选
  if (showOnlyRegistered.value) {
    items = items.filter(act => isRegistered(act.id))
  }
  
  // 排序
  items.sort((a, b) => {
    switch (sortBy.value) {
      case 'points':
        return b.points - a.points
      case 'category':
        return a.category.localeCompare(b.category)
      case 'date':
      default:
        return new Date(a.date) - new Date(b.date)
    }
  })
  
  return items
})

function fmtDate(dateStr) {
  const d = new Date(dateStr)
  const days = ['日','一','二','三','四','五','六']
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}月${day}日 周${days[d.getDay()]}`
}

function isPast(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = new Date(dateStr)
  return d < today
}



function isRegistered(id) {
  return activity.isRegistered(username.value, id)
}

function onRegister(id) {
  hint.value = ''
  if (!auth.isLoggedIn) {
    router.push({ path: '/login', query: { redirect: '/activity' } })
    return
  }
  activity.register(username.value, id)
  const act = activity.getById(id)
  if (act) {
    auth.addPoints(act.points, `报名参与「${act.title}」`)
  }
  const msg = `报名成功！获得积分 +${act?.points ?? 0}`
  hint.value = msg
  notify.success(msg)

  const a1 = achievements.award(username.value, 'first_activity')
  if (a1.ok) notify.success(a1.message)
  const msgs = achievements.checkThresholds(username.value, auth.points)
  msgs.forEach(m => notify.success(m))
}

function onUnregister(id) {
  hint.value = ''
  if (!auth.isLoggedIn) return
  activity.unregister(username.value, id)
  hint.value = '已取消报名。欢迎下次继续参与！'
  notify.info('已取消报名')
}

// 切换已报名筛选
function toggleRegisteredFilter() {
  showOnlyRegistered.value = !showOnlyRegistered.value
  if (showOnlyRegistered.value) {
    statusFilter.value = 'all'
    activeCategory.value = '全部'
  }
}

// 清除所有筛选条件
function clearAllFilters() {
  searchQuery.value = ''
  activeCategory.value = '全部'
  statusFilter.value = 'all'
  showOnlyRegistered.value = false
  sortBy.value = 'date'
}

// 获取空状态标题
function getEmptyStateTitle() {
  if (searchQuery.value) {
    return '未找到相关活动'
  }
  if (showOnlyRegistered.value) {
    return '暂无已报名活动'
  }
  if (statusFilter.value !== 'all') {
    const statusMap = {
      'upcoming': '暂无即将开始的活动',
      'registered': '暂无已报名活动', 
      'ended': '暂无已结束活动'
    }
    return statusMap[statusFilter.value] || '暂无活动'
  }
  if (activeCategory.value !== '全部') {
    return `暂无「${activeCategory.value}」类活动`
  }
  return '暂无活动'
}

// 获取空状态描述
function getEmptyStateDesc() {
  if (searchQuery.value) {
    return '尝试使用其他关键词搜索，或清除筛选条件查看全部活动'
  }
  if (showOnlyRegistered.value) {
    return '快去报名参加感兴趣的环保活动吧！'
  }
  if (hasActiveFilters.value) {
    return '尝试调整筛选条件，或查看其他类型的活动'
  }
  return '暂时没有可参与的活动，请稍后再来查看'
}
</script>

<style scoped>
.container { max-width: 960px; margin: 80px auto 40px; padding: 0 20px; }
h2 { font-size: 1.6rem; margin-bottom: 8px; }
.desc { color: #666; margin-bottom: 24px; }

/* 搜索栏样式 */
.search-bar { margin-bottom: 20px; }
.search-input-wrapper { 
  position: relative; 
  max-width: 400px; 
  margin: 0 auto;
}
.search-input { 
  width: 100%; 
  padding: 12px 16px 12px 44px; 
  border: 2px solid #e5e7eb; 
  border-radius: 24px; 
  font-size: 14px; 
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: transparent;
}
.search-input:focus { 
  outline: none; 
  border-color: #66a6ff; 
  box-shadow: 0 0 0 3px rgba(102, 166, 255, 0.1);
}
.search-icon { 
  position: absolute; 
  left: 14px; 
  top: 50%; 
  transform: translateY(-50%); 
  width: 18px; 
  height: 18px; 
  color: #9ca3af; 
}
.clear-btn { 
  position: absolute; 
  right: 8px; 
  top: 50%; 
  transform: translateY(-50%); 
  width: 28px; 
  height: 28px; 
  border: none; 
  background: #f3f4f6; 
  border-radius: 50%; 
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  justify-content: center;
  transition: background 0.2s ease;
}
.clear-btn:hover { background: #e5e7eb; }
.clear-btn svg { width: 14px; height: 14px; color: #6b7280; }

/* 筛选栏样式 */
.filter-bar { 
  display: flex; 
  gap: 16px; 
  align-items: flex-start; 
  justify-content: space-between; 
  margin-bottom: 16px; 
  flex-wrap: wrap;
}
.filter-section { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.sort-section { display: flex; gap: 12px; align-items: center; }

.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { 
  padding: 8px 16px; 
  border: 1px solid #e5e7eb; 
  border-radius: 20px; 
  background: transparent; 
  color: #374151; 
  cursor: pointer; 
  font-size: 14px;
  transition: all 0.2s ease; 
}
.chip:hover { 
  background: #f9fafb; 
  border-color: #d1d5db; 
  transform: translateY(-1px); 
}
.chip.active { 
  background: #66a6ff; 
  color: #fff; 
  border-color: #66a6ff; 
  box-shadow: 0 2px 4px rgba(102, 166, 255, 0.2);
}

.status-filter { display: flex; align-items: center; }
.status-select, .sort-select { 
  padding: 8px 12px; 
  border: 1px solid #e5e7eb; 
  border-radius: 8px; 
  background: transparent; 
  color: #374151; 
  font-size: 14px;
  cursor: pointer;
  transition: border-color 0.2s ease;
}
.status-select:focus, .sort-select:focus { 
  outline: none; 
  border-color: #66a6ff; 
}

.counter { 
  color: #6b7280; 
  font-size: 14px; 
  font-weight: 500;
}

/* 快速操作栏 */
.quick-actions { 
  margin-bottom: 20px; 
  display: flex; 
  gap: 12px; 
}
.quick-btn { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  padding: 10px 16px; 
  border: 1px solid #e5e7eb; 
  border-radius: 12px; 
  background: transparent; 
  color: #374151; 
  cursor: pointer; 
  font-size: 14px;
  transition: all 0.2s ease;
}
.quick-btn:hover { 
  background: #f9fafb; 
  border-color: #d1d5db; 
}
.quick-btn.active { 
  background: #eff6ff; 
  border-color: #66a6ff; 
  color: #1d4ed8; 
}
.quick-btn svg { width: 16px; height: 16px; }

/* 空状态样式 */
.empty-state { 
  text-align: center; 
  padding: 60px 20px; 
  color: #6b7280; 
}
.empty-icon { 
  margin: 0 auto 20px; 
  width: 64px; 
  height: 64px; 
  color: #d1d5db; 
}
.empty-icon svg { width: 100%; height: 100%; }
.empty-title { 
  font-size: 18px; 
  font-weight: 600; 
  color: #374151; 
  margin: 0 0 8px; 
}
.empty-desc { 
  font-size: 14px; 
  margin: 0 0 24px; 
  max-width: 400px; 
  margin-left: auto; 
  margin-right: auto; 
}

/* 骨架屏样式 */
.loading-state { margin-bottom: 24px; }
.skeleton-grid { 
  display: grid; 
  gap: 16px; 
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
}
.skeleton-card { 
  border: 1px solid #f3f4f6; 
  border-radius: 12px; 
  padding: 16px; 
  background: transparent;
}
.skeleton-image { 
  width: 100%; 
  height: 160px; 
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); 
  background-size: 200% 100%; 
  animation: skeleton-loading 1.5s infinite; 
  border-radius: 8px; 
  margin-bottom: 12px; 
}
.skeleton-content { display: flex; flex-direction: column; gap: 8px; }
.skeleton-title { 
  height: 20px; 
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); 
  background-size: 200% 100%; 
  animation: skeleton-loading 1.5s infinite; 
  border-radius: 4px; 
  width: 80%; 
}
.skeleton-subtitle { 
  height: 16px; 
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); 
  background-size: 200% 100%; 
  animation: skeleton-loading 1.5s infinite; 
  border-radius: 4px; 
  width: 60%; 
}
.skeleton-meta { 
  height: 14px; 
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%); 
  background-size: 200% 100%; 
  animation: skeleton-loading 1.5s infinite; 
  border-radius: 4px; 
  width: 40%; 
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 原有样式 */
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.card { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 10px; }
.title { margin: 0; font-size: 1.1rem; }
.meta { color: #666; }
.actions { display: flex; gap: 10px; }

.btn { 
  padding: 10px 16px; 
  border: none; 
  border-radius: 8px; 
  background: #6fcf97; 
  color: #fff; 
  cursor: pointer; 
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn:hover { 
  transform: translateY(-1px); 
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
}
.btn.btn-primary { background: #66a6ff; }
.btn.btn-primary:hover { background: #5a96ff; }
.btn:disabled { 
  background: #e5e7eb; 
  color: #9ca3af; 
  cursor: not-allowed; 
  transform: none; 
  box-shadow: none; 
}

.hint { 
  color: #059669; 
  margin-top: 12px; 
  padding: 12px; 
  background: #ecfdf5; 
  border-radius: 8px; 
  border-left: 4px solid #10b981; 
}

/* 响应式设计 */
@media (max-width: 768px) {
  .filter-bar { flex-direction: column; align-items: stretch; }
  .filter-section { justify-content: center; }
  .sort-section { justify-content: space-between; }
  .search-input-wrapper { max-width: none; }
  .chips { justify-content: center; }
}

/* 透明化 ImageCard，适配全局 LightRays 背景 */
:deep(.image-card) { background: transparent; border-color: rgba(255,255,255,0.22); box-shadow: none; }
:deep(.image-card .media) { background: none; }
:deep(.image-card .title) { color: #e8f0fb; }
:deep(.image-card .subtitle), :deep(.image-card .meta) { color: rgba(232,240,251,0.8); }
:deep(.image-card .link) { color: #9ec3ff; }
</style>
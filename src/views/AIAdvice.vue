<template>
  <section class="container">
    <h2 v-reveal>环保建议</h2>
    <p class="desc" v-reveal>根据识别分类或关键字，查看具体投放与减碳建议。</p>

    <div class="controls" v-reveal>
      <div class="query">
        <input v-model="query" type="text" placeholder="输入物品或材质，例如：电池、塑料瓶" />
        <button class="btn btn-primary" @click="runSearch">查询建议</button>
        <button class="btn btn-outline" @click="clear">清空</button>
      </div>
      <div class="chips">
        <button
          v-for="c in categories"
          :key="c.key"
          :class="['chip', { active: selectedCategory === c.key }]"
          @click="selectCategory(c.key)"
        >{{ c.name }}</button>
      </div>
    </div>

    <div class="card" v-reveal>
      <h3>建议结果</h3>
      <ul class="tips">
        <li v-for="(t, i) in tips" :key="i">{{ t }}</li>
      </ul>
      <div class="actions">
        <button class="btn btn-outline" @click="copyTips" :disabled="!tips.length">复制建议</button>
        <router-link class="btn" to="/community">去社区分享</router-link>
      </div>
      <p class="small">提示：建议基于规则库与关键词匹配生成，复杂物品请参考本地分类指引或咨询社区。</p>
    </div>

    <div class="card" v-reveal>
      <h3>历史查询</h3>
      <ul class="history">
        <li v-for="(h, i) in history" :key="i">
          <span class="meta">{{ formatTime(h.at) }}</span>
          <span class="text">{{ h.q || h.key }}</span>
        </li>
      </ul>
      <button class="btn btn-outline" @click="advice.clearHistory" :disabled="!history.length">清空历史</button>
    </div>
  </section>
  
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAdviceStore } from '@/stores/advice'

const route = useRoute()
const advice = useAdviceStore()
const query = ref('')
const selectedCategory = ref('')

const categories = [
  { key: 'recyclable', name: '可回收物' },
  { key: 'kitchen', name: '厨余垃圾' },
  { key: 'hazardous', name: '有害垃圾' },
  { key: 'other', name: '其他垃圾' },
]

const result = ref({ key: '', tips: [] })
const tips = computed(() => result.value.tips || [])
const history = computed(() => advice.history)

function runSearch() {
  if (query.value.trim()) {
    result.value = advice.searchAdviceByQuery(query.value.trim())
    selectedCategory.value = result.value.key
  } else if (selectedCategory.value) {
    result.value = { key: selectedCategory.value, tips: advice.getAdviceByCategory(selectedCategory.value) }
    advice.recordInteraction({ type: 'category', key: selectedCategory.value, count: result.value.tips.length })
  }
}

function clear() {
  query.value = ''
  selectedCategory.value = ''
  result.value = { key: '', tips: [] }
}

function selectCategory(key) {
  selectedCategory.value = key
  runSearch()
}

function copyTips() {
  const text = tips.value.join('\n')
  try { navigator.clipboard.writeText(text) } catch (_) {}
}

function formatTime(ts) {
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(() => {
  advice.loadHistory()
  const cat = route.query.category
  const q = route.query.q
  if (typeof q === 'string' && q.trim()) {
    query.value = q.trim()
    runSearch()
  } else if (typeof cat === 'string' && cat) {
    selectedCategory.value = cat
    runSearch()
  }
})
</script>

<style scoped>
.container { max-width: 960px; margin: 80px auto 40px; padding: 0 20px; }
h2 { font-size: 1.6rem; margin-bottom: 8px; }
.desc { color: var(--muted); margin-bottom: 16px; }
.controls { display: grid; gap: 12px; margin-bottom: 12px; }
.query { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; }
.query input { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; background: transparent; color: var(--text); }
.btn { border: 1px solid var(--border); color: var(--text); background: transparent; border-radius: 10px; padding: 8px 14px; transition: box-shadow .25s ease, transform .25s ease, border-color .25s ease, color .25s ease; }
.btn.btn-primary { background: linear-gradient(90deg, #66a6ff, #6fcf97); }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { padding: 8px 12px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--text); cursor: pointer; }
.chip.active { background: rgba(102, 166, 255, 0.12); border-color: #66a6ff; }

.card { border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: grid; gap: 10px; }
.tips { display: grid; gap: 8px; color: var(--text); }
.small { color: var(--muted); font-size: 0.85rem; }
.actions { display: flex; gap: 10px; }
.history { display: grid; gap: 6px; color: var(--muted); }
.history .meta { color: var(--muted); margin-right: 8px; }

@media (max-width: 640px) { .query { grid-template-columns: 1fr; } }
</style>
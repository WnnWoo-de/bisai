<template>
  <section class="container">
    <h2>帮助中心</h2>
    <p class="desc">使用指南、常见问题与意见反馈。</p>

    <div class="tabs">
      <button :class="['chip', { active: tab==='guide' }]" @click="tab='guide'">使用指南</button>
      <button :class="['chip', { active: tab==='faq' }]" @click="tab='faq'">常见问题</button>
      <button :class="['chip', { active: tab==='feedback' }]" @click="tab='feedback'">意见反馈</button>
    </div>

    <div v-if="tab==='guide'" class="card">
      <h3 class="title">使用指南</h3>
      <ol class="guide">
        <li><strong>注册 / 登录：</strong>前往“登录/注册”，完善个人信息。</li>
        <li><strong>每日打卡：</strong>在“社区”页记录足迹，积累绿色积分。</li>
        <li><strong>参与活动：</strong>在“公益活动”浏览并报名本地环保行动。</li>
        <li><strong>兑换奖励：</strong>在“积分商城”使用积分兑换环保好物。</li>
        <li><strong>碳足迹分析：</strong>在“碳足迹分析”填写数据并保存结果。</li>
      </ol>
    </div>

    <div v-if="tab==='faq'" class="card">
      <h3 class="title">常见问题</h3>
      <div class="faq">
        <details>
          <summary>如何获得积分？</summary>
          <p>每日打卡、报名参与公益活动、完成成就任务等都可获得积分。</p>
        </details>
        <details>
          <summary>为什么需要登录？</summary>
          <p>登录用于关联个人数据（积分、活动报名、分析记录），以便跨设备保存。</p>
        </details>
        <details>
          <summary>碳足迹分析是否精确？</summary>
          <p>当前分析基于通用排放因子，仅用于趋势参考，非审计级数据。</p>
        </details>
        <details>
          <summary>如何删除我的数据？</summary>
          <p>在相关页面提供清空入口，或联系反馈说明，我们会提供指引。</p>
        </details>
      </div>
    </div>

    <div v-if="tab==='feedback'" class="card">
      <h3 class="title">意见反馈</h3>
      <div class="form-grid">
        <label class="field">
          <span>类别</span>
          <select v-model="feedback.category">
            <option value="功能建议">功能建议</option>
            <option value="界面体验">界面体验</option>
            <option value="性能问题">性能问题</option>
            <option value="其他">其他</option>
          </select>
        </label>
        <label class="field">
          <span>主题</span>
          <input type="text" v-model="feedback.subject" placeholder="简要说明" />
        </label>
        <label class="field full">
          <span>内容</span>
          <textarea v-model="feedback.message" rows="5" placeholder="详细描述你的建议或问题"></textarea>
        </label>
        <label class="field">
          <span>联系方式（选填）</span>
          <input type="text" v-model="feedback.contact" placeholder="邮箱/微信/手机号" />
        </label>
        <label class="field">
          <span>满意度评分（1-5）</span>
          <input type="number" v-model.number="feedback.rating" min="1" max="5" />
        </label>
      </div>
      <div class="actions">
        <button class="btn btn-primary glow" :disabled="!canSubmit" @click="onSubmit">提交反馈</button>
        <button class="btn glow" :disabled="!auth.isLoggedIn || list.length===0" @click="onClear">清空我的反馈</button>
      </div>
      <div v-if="hint" class="hint">{{ hint }}</div>

      <div class="history" v-if="list.length">
        <h4 class="title">我的反馈</h4>
        <div v-for="item in list" :key="item.id" class="history-item">
          <div class="meta">{{ new Date(item.date).toLocaleString() }}｜{{ item.category }}</div>
          <div class="val"><strong>{{ item.subject }}</strong></div>
          <div class="mini">{{ item.message }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useFeedbackStore } from '@/stores/feedback'
import { useNotifyStore } from '@/stores/notify'

const auth = useAuthStore()
const fb = useFeedbackStore()
const notify = useNotifyStore()

const route = useRoute()
const router = useRouter()
const tab = ref('guide')
const hint = ref('')

const feedback = ref({ category: '功能建议', subject: '', message: '', contact: '', rating: 5 })
const canSubmit = computed(() => !!feedback.value.subject && !!feedback.value.message)
const list = computed(() => fb.list(auth.user?.username ?? ''))

function onSubmit() {
  hint.value = ''
  if (!auth.isLoggedIn) { hint.value = '请先登录'; return }
  if (!canSubmit.value) { hint.value = '请填写主题与内容'; return }
  fb.submit(auth.user?.username ?? '', feedback.value)
  notify.success('反馈已提交，感谢你的建议！')
  feedback.value = { category: '功能建议', subject: '', message: '', contact: '', rating: 5 }
}

function onClear() {
  fb.clear(auth.user?.username ?? '')
  notify.success('已清空我的反馈')
}

onMounted(() => {
  const t = route.query.tab
  if (t === 'guide' || t === 'faq' || t === 'feedback') {
    tab.value = String(t)
  }
})
</script>

<style lang="scss" scoped>
.container { max-width: 960px; margin: 0 auto; padding: 24px 20px; }
.desc { color: var(--muted); }
.tabs { display: flex; gap: 10px; margin-bottom: 12px; }

.card { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: transparent; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
.card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: var(--ray-accent-2, var(--blue)); }
.title { color: var(--text); }

.guide { color: var(--text); }
.guide li { margin: 6px 0; }

.faq details { border: 1px solid var(--border); border-radius: 8px; padding: 10px; margin: 8px 0; }
.faq summary { cursor: pointer; color: var(--text); }
.faq p { color: var(--muted); margin-top: 6px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: grid; gap: 6px; color: var(--text); }
.field span { color: var(--muted); font-size: 0.9rem; }
.field input, .field select, .field textarea { border: 1px solid var(--border); background: transparent; color: var(--text); border-radius: 10px; padding: 8px 10px; }
.field.full { grid-column: 1 / -1; }
.actions { display: flex; gap: 10px; align-items: center; }
.hint { color: var(--muted); }

.history { display: grid; gap: 10px; }
.history-item { display: grid; grid-template-columns: 2fr 1fr; align-items: center; gap: 6px; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; }
.history-item .meta { color: var(--muted); font-size: 0.85rem; }
.history-item .val { color: var(--text); }
.history-item .mini { grid-column: 1 / -1; color: var(--muted); font-size: 0.85rem; }

@media (max-width: 840px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
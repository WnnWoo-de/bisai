<template>
  <section class="container">
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'chat' }" @click="activeTab = 'chat'">聊天助手</button>
      <button class="tab" :class="{ active: activeTab === 'recognition' }" @click="activeTab = 'recognition'">图片识别</button>
    </div>
    <div v-if="activeTab === 'recognition'">
      <h2 v-reveal>AI 识别</h2>
    <p class="desc" v-reveal>上传（或拖拽）一张图片，演示识别为垃圾分类类型。</p>

    <div class="uploader" @dragover.prevent="onDragOver" @drop.prevent="onDrop" v-reveal>
      <input id="file" type="file" accept="image/*" capture="environment" @change="onFileChange" />
      <label for="file" class="dropzone">
        <span v-if="!previewUrl">点击或拖拽图片到此</span>
        <img v-else :src="previewUrl" alt="预览" />
      </label>
    </div>

    <div class="actions" v-reveal>
      <button class="btn btn-primary" :disabled="!file || loading" @click="classify">开始识别</button>
      <button class="btn btn-outline" :disabled="loading" @click="reset">重置</button>
      <router-link
        v-if="result"
        class="btn btn-outline"
        :to="{ path: '/ai-advice', query: { category: result.key, q: result.category } }"
      >查看环保建议</router-link>
    </div>

    <div v-if="loading" class="hint">正在分析图片，请稍候…</div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="result" class="result" v-reveal>
      <h3>识别结果：{{ result.category }}</h3>
      <p class="tip">投放建议：{{ result.tip }}</p>
      <div class="scores">
        <span>平均色值 R: {{ result.scores.r }}</span>
        <span>G: {{ result.scores.g }}</span>
        <span>B: {{ result.scores.b }}</span>
      </div>
      <p class="small">说明：当前为演示版，基于图像平均色值的启发式判断，后续将接入真实模型或服务端识别。</p>
    </div>

    <div class="card" v-reveal v-if="activeTab === 'recognition'">
      <h3>使用指南</h3>
      <ul>
        <li>选择清晰的物品图片，避免过暗或过亮。</li>
        <li>识别结果为演示，用投放建议作为参考，具体以实际分类为准。</li>
        <li>遇到复杂物品，可切换“聊天助手”咨询更详细建议。</li>
      </ul>
    </div>

    <div class="card" v-reveal v-if="activeTab === 'recognition'">
      <h3>分类知识</h3>
      <p class="small">四类垃圾：可回收物、厨余垃圾、有害垃圾、其他垃圾。</p>
    </div>
    </div>
    <!-- AI 助手聊天 -->
    <div class="chat" v-if="activeTab === 'chat'">
      <h2 v-reveal>AI 助手聊天</h2>
      <div class="chat-card" v-reveal>
        <div class="messages">
          <div v-for="(m, i) in messages" :key="i" :class="['bubble', m.role]">
            <span class="sender">{{ m.role === 'assistant' ? '助手' : '我' }}</span>
            <p class="text">{{ m.text }}</p>
          </div>
        </div>
        <div class="composer">
          <input type="text" v-model="userText" :disabled="loadingChat" placeholder="例如：电池怎么丢？、塑料瓶如何处理？" />
          <button class="btn btn-primary" :disabled="!canSend" @click="sendMessage">发送</button>
          <button class="btn btn-outline" :disabled="!messages.length" @click="clearChat">清空</button>
        </div>
        <div class="suggests">
          <button class="chip" v-for="q in suggests" :key="q" @click="useSuggest(q)">{{ q }}</button>
        </div>
      </div>
    </div>
    <div class="card" v-reveal v-if="activeTab === 'chat'">
      <h3>提问建议</h3>
      <p class="small">描述物品名称或材质，让助手给出分类与投放建议。</p>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as tf from '@tensorflow/tfjs'

const file = ref(null)
const previewUrl = ref('')
const loading = ref(false)
const error = ref('')
const result = ref(null)
const activeTab = ref('chat')

const categories = [
  { key: 'recyclable', name: '可回收物', tip: '投入可回收物桶，如纸、塑料、金属、玻璃。' },
  { key: 'kitchen', name: '厨余垃圾', tip: '湿垃圾，沥干投放，如剩菜、果皮。' },
  { key: 'hazardous', name: '有害垃圾', tip: '投放至有害垃圾桶，如电池、灯管、药品。' },
  { key: 'other', name: '其他垃圾', tip: '干垃圾，难以回收的日常垃圾。' },
]

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  file.value = f
  previewUrl.value = URL.createObjectURL(f)
  error.value = ''
  result.value = null
}

function reset() {
  file.value = null
  previewUrl.value = ''
  error.value = ''
  result.value = null
}

async function classify() {
  if (!file.value) return
  loading.value = true
  error.value = ''
  result.value = null
  try {
    await tf.ready()

    // 尝试使用 createImageBitmap，更快更省内存；不支持则回退到 Image
    let imgBitmap
    try {
      imgBitmap = await createImageBitmap(file.value)
    } catch (_) {
      imgBitmap = await loadImageFallback(file.value)
    }

    const tensor = tf.browser.fromPixels(imgBitmap).toFloat()
    const mean = tensor.mean([0, 1]) // [r, g, b]
    const [r, g, b] = await mean.array()

    let cat
    if (g > r && g > b) cat = categories[1] // 厨余垃圾
    else if (b > r && b > g) cat = categories[2] // 有害垃圾
    else if (r > g && r > b) cat = categories[3] // 其他垃圾
    else cat = categories[0] // 可回收物

    result.value = {
      key: cat.key,
      category: cat.name,
      tip: cat.tip,
      scores: { r: Math.round(r), g: Math.round(g), b: Math.round(b) },
    }

    tensor.dispose()
    mean.dispose()
  } catch (e) {
    console.error(e)
    error.value = '识别失败，请更换图片重试'
  } finally {
    loading.value = false
  }
}

function onDrop(e) {
  const f = e.dataTransfer?.files?.[0]
  if (!f) return
  file.value = f
  previewUrl.value = URL.createObjectURL(f)
  error.value = ''
  result.value = null
}

function onDragOver(e) {
  // 仅阻止默认行为即可启用拖拽样式
}

function loadImageFallback(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// —— Chat assistant ——
const messages = ref([
  { role: 'assistant', text: '你好，我是环保 AI 助手。可向我咨询垃圾分类与投放建议～' },
])
const userText = ref('')
const loadingChat = ref(false)
const suggests = [
  '塑料瓶怎么丢？',
  '电池怎么处理？',
  '厨余如何投放？',
  '旧衣物怎么分类？',
]
const canSend = computed(() => userText.value.trim().length > 0 && !loadingChat.value)

function sendMessage() {
  const q = userText.value.trim()
  if (!q) return
  messages.value.push({ role: 'user', text: q })
  userText.value = ''
  loadingChat.value = true
  setTimeout(() => {
    const reply = generateReply(q)
    messages.value.push({ role: 'assistant', text: reply })
    loadingChat.value = false
  }, 350)
}

function clearChat() {
  messages.value = [{ role: 'assistant', text: '已清空历史。继续问我垃圾分类与环保建议吧～' }]
}

function useSuggest(q) {
  userText.value = q
  sendMessage()
}

function normalize(str) { return (str || '').toLowerCase() }

function generateReply(q) {
  const s = normalize(q)
  const tips = []
  const add = (t) => tips.push(t)

  if (/电池|纽扣电池|蓄电池|充电宝/.test(s)) {
    add('电池属于有害垃圾，应送至有害垃圾收集点或有害垃圾桶。')
    add('请用胶带封住电池极，避免泄漏与短路。')
  } else if (/塑料|瓶|矿泉水|饮料瓶|pet/.test(s)) {
    add('清洗并沥干后投入可回收物桶，压扁更省空间。')
  } else if (/剩菜|果皮|厨余|茶叶|骨头/.test(s)) {
    add('厨余垃圾应沥干投放，避免异味与虫害。')
  } else if (/纸巾|陶瓷|灰尘|烟蒂|破损/.test(s)) {
    add('属于其他（干）垃圾，应密封投放，减少扬尘。')
  } else if (/衣服|旧衣|衣物|布料/.test(s)) {
    add('完好衣物建议捐赠或旧衣回收；破损严重可按其他垃圾处理。')
  } else if (/药品|灯管|油漆|指甲油|胶水/.test(s)) {
    add('有害垃圾，请交由有害垃圾回收点，勿混入其他垃圾。')
  }

  if (result.value) {
    add(`结合当前图片识别结果：${result.value.category}。${result.value.tip}`)
  }

  if (tips.length === 0) {
    add('垃圾大致分为：可回收物、厨余垃圾、有害垃圾、其他垃圾。')
    add('描述物品名称或材质，我会给出分类与投放建议。')
  }

  return tips.join(' ')
}
</script>

<style scoped>
.container { max-width: 960px; margin: 80px auto 40px; padding: 0 20px; }
h2 { font-size: 1.6rem; margin-bottom: 8px; }
.desc { color: var(--muted); margin-bottom: 16px; }
/* tabs */
.tabs { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.tab { padding: 8px 12px; border: 1px solid var(--border); background: transparent; color: var(--text); border-radius: 999px; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.tab:hover:not(.active) { transform: translateY(-1px); border-color: rgba(102, 166, 255, 0.3); }
.tab.active { background: rgba(102, 166, 255, 0.12); border-color: #66a6ff; color: var(--text); }

.uploader { margin-bottom: 16px; }
.dropzone {
  display: grid;
  place-items: center;
  width: 100%;
  height: 240px;
  border: 2px dashed var(--border);
  border-radius: 12px;
  color: var(--muted);
  cursor: pointer;
  overflow: hidden;
  background: transparent;
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.dropzone:hover {
  transform: translateY(-2px);
  border-color: rgba(102, 166, 255, 0.5);
}
.dropzone img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.uploader input[type="file"] { display: none; }

.actions { display: flex; gap: 12px; margin-bottom: 12px; }
.btn { padding: 10px 14px; border-radius: 10px; cursor: pointer; transition: box-shadow .25s ease, transform .25s ease, border-color .25s ease, color .25s ease; }
.btn[disabled] { opacity: 0.6; cursor: not-allowed; }
.btn.btn-outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
.btn.btn-primary { border: 1px solid var(--border); background: linear-gradient(90deg, #66a6ff, #6fcf97); color: var(--text); }

.hint { color: var(--muted); }
.error { color: var(--danger, #e64a19); }

.result { border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: grid; gap: 10px; background: transparent; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.result:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); border-color: rgba(102, 166, 255, 0.3); }
.result h3 { margin: 0; }
.tip { color: var(--text); }
.scores { display: flex; gap: 12px; color: var(--muted); }
.small { color: var(--muted); font-size: 0.85rem; }

/* Chat assistant */
.chat { margin-top: 28px; }
.chat h2 { font-size: 1.4rem; margin-bottom: 10px; }
.chat-card { border: 1px solid var(--border); border-radius: 8px; padding: 14px; display: grid; gap: 10px; }
.messages { max-height: 280px; overflow: auto; display: grid; gap: 8px; padding-right: 6px; scrollbar-width: none; -ms-overflow-style: none; }
.messages::-webkit-scrollbar { display: none; }
.bubble { max-width: 86%; padding: 10px 12px; border-radius: 12px; line-height: 1.5; }
.bubble.assistant { background: rgba(244, 248, 244, 0.7); color: var(--text); border: 1px solid rgba(229, 239, 229, 0.5); justify-self: start; }
.bubble.user { background: rgba(231, 240, 255, 0.7); color: var(--text); border: 1px solid rgba(213, 230, 255, 0.5); justify-self: end; }
.bubble .sender { display: block; font-size: 0.8rem; color: var(--muted); margin-bottom: 4px; }
.composer { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; }
.composer input { padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px; color: var(--text); background: transparent; }
.chip { display: inline-block; padding: 6px 10px; border: 1px solid var(--border); border-radius: 999px; background: transparent; color: var(--text); cursor: pointer; margin-right: 8px; margin-top: 2px; font-size: 0.9rem; transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease; }
.chip:hover { transform: translateY(-1px); background: rgba(248, 250, 252, 0.3); border-color: rgba(102, 166, 255, 0.3); }

@media (max-width: 640px) {
  .messages { max-height: 220px; }
}
</style>
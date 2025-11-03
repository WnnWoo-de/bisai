<template>
  <section class="container">
    <h2 v-reveal>个人中心</h2>
    <div class="card" v-if="auth.isLoggedIn" v-reveal>
      <p>欢迎，{{ auth.user?.username }}！</p>
      <p v-if="auth.user?.email">邮箱：{{ auth.user.email }}</p>
      <p>当前积分：<strong>{{ auth.points }}</strong></p>

      <h3 class="sub">已报名活动</h3>
      <ul v-if="registeredActs.length" class="list">
        <li v-for="a in registeredActs" :key="a.id" v-reveal>{{ a.title }}｜{{ a.date }}｜{{ a.location }}</li>
      </ul>
      <p v-else class="muted">暂未报名任何活动。</p>

      <h3 class="sub">积分历史</h3>
      <ul v-if="auth.history.length" class="list">
        <li v-for="(h, idx) in auth.history" :key="idx" v-reveal>
          <span>{{ h.type === 'income' ? '收入 +' : '支出 -' }}{{ h.amount }}</span>
          <span class="muted">｜{{ formatTime(h.at) }}｜{{ h.reason }}</span>
        </li>
      </ul>
      <p v-else class="muted">暂无积分记录。</p>

      <h3 class="sub">我的兑换</h3>
      <ul v-if="redeemedProducts.length" class="list">
        <li v-for="p in redeemedProducts" :key="p.id" v-reveal>{{ p.name }}｜消耗积分：{{ p.price }}｜兑换时间：{{ redeemTime(p.id) }}</li>
      </ul>
      <p v-else class="muted">尚未兑换任何商品。</p>

      <h3 class="sub">我的成就</h3>
      <ul v-if="myAwards.length" class="list">
        <li v-for="a in myAwards" :key="a.id" v-reveal>{{ achNameMap.get(a.id) || a.id }}｜解锁时间：{{ formatTime(a.at) }}</li>
      </ul>
      <p v-else class="muted">尚未解锁任何成就。</p>

      <button class="btn" @click="onLogout">退出登录</button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useActivityStore } from '@/stores/activity'
import { useShopStore } from '@/stores/shop'
import { useAchievementsStore } from '@/stores/achievements'

const router = useRouter()
const auth = useAuthStore()
const activity = useActivityStore()
const shop = useShopStore()
const achievements = useAchievementsStore()

const registeredActs = computed(() => {
  const ids = activity.userRegistrations(auth.user?.username ?? '')
  return ids.map(id => activity.getById(id)).filter(Boolean)
})

const redeemedProducts = computed(() => {
  const ids = shop.userRedemptions(auth.user?.username ?? '')
  return ids.map(id => shop.productById(id)).filter(Boolean)
})

function extractProductName(reason) {
  const start = reason.indexOf('兑换「')
  const end = reason.indexOf('」', start + 3)
  if (start >= 0 && end > start) return reason.slice(start + 3, end)
  return null
}

const redeemTimeMap = computed(() => {
  const map = new Map()
  for (const h of auth.history) {
    if (h.type === 'expense') {
      const name = extractProductName(h.reason || '')
      if (name) {
        const product = shop.products.find(p => p.name === name)
        if (product) map.set(product.id, h.at)
      }
    }
  }
  return map
})

function redeemTime(id) {
  const at = redeemTimeMap.value.get(id)
  return at ? formatTime(at) : '未知时间'
}

const myAwards = computed(() => achievements.userAwards(auth.user?.username ?? ''))
const achNameMap = computed(() => {
  const map = new Map()
  achievements.all.forEach(a => map.set(a.id, a.name))
  return map
})

function formatTime(ts) {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

function onLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.container { max-width: 640px; margin: 80px auto 40px; padding: 0 20px; }
h2 { font-size: 1.6rem; margin-bottom: 16px; }
.card { display: grid; gap: 10px; padding: 16px; border: 1px solid #eee; border-radius: 8px; }
.sub { margin: 10px 0 6px; font-size: 1.1rem; }
.list { display: grid; gap: 6px; padding-left: 18px; }
.btn { width: fit-content; padding: 10px 14px; border: none; border-radius: 6px; background: #6fcf97; color: #fff; cursor: pointer; }
</style>
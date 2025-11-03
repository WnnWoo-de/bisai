<template>
  <section class="container">
    <h2 v-reveal>积分商城</h2>
    <p class="desc" v-reveal>使用绿色积分兑换环保商品。当前积分：<strong>{{ auth.points }}</strong></p>

    <div class="grid">
      <ImageCard
        v-for="p in shop.products"
        :key="p.id"
        img="@/assets/images/logo.svg"
        :alt="p.name"
        :title="p.name"
        :subtitle="p.desc"
        :meta="'所需积分：' + p.price"
        :revealOptions="{ duration: 0.6, distance: 10 }"
      >
        <template #actions>
          <button
            class="btn btn-primary"
            :disabled="!auth.isLoggedIn || shop.isRedeemed(username, p.id) || loading"
            @click="onRedeem(p.id)"
          >
            {{ shop.isRedeemed(username, p.id) ? '已兑换' : '兑换' }}
          </button>
        </template>
      </ImageCard>
    </div>

    <div v-if="hint" class="hint">{{ hint }}</div>

    <div class="card" v-reveal>
      <h3 class="title">兑换指南</h3>
      <p class="meta">选择商品并点击“兑换”。兑换将消耗相应积分，并记录在“个人中心 → 我的兑换”。</p>
      <p class="meta">注意：请先登录；若积分不足或已兑换，将无法重复兑换。</p>
    </div>

    <div class="grid">
      <ImageCard
        img="@/assets/images/logo.svg"
        alt="积分获取 · 打卡"
        title="积分获取 · 打卡"
        subtitle="每日打卡可获积分，连续打卡更易达成阈值成就。"
        :revealOptions="{ duration: 0.6, distance: 10 }"
      />
      <ImageCard
        img="@/assets/images/logo.svg"
        alt="积分获取 · 活动"
        title="积分获取 · 活动"
        subtitle="报名并参与公益活动，完成后获得额外积分奖励。"
        :revealOptions="{ duration: 0.6, distance: 10, delay: 0.08 }"
      />
      <ImageCard
        img="@/assets/images/logo.svg"
        alt="积分获取 · 成就"
        title="积分获取 · 成就"
        subtitle="达成成就将获得提示与鼓励，助你持续成长。"
        :revealOptions="{ duration: 0.6, distance: 10, delay: 0.16 }"
      />
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useShopStore } from '@/stores/shop'
import { useNotifyStore } from '@/stores/notify'
import { useAchievementsStore } from '@/stores/achievements'
import ImageCard from '@/components/ui/ImageCard.vue'

const auth = useAuthStore()
const shop = useShopStore()
const notify = useNotifyStore()
const achievements = useAchievementsStore()
const loading = ref(false)
const hint = ref('')
const username = computed(() => auth.user?.username ?? '')

async function onRedeem(id) {
  hint.value = ''
  if (!auth.isLoggedIn) {
    hint.value = '请先登录后再兑换'
    return
  }
  loading.value = true
  const res = await shop.redeem(username.value, id)
  hint.value = res.message
  if (res.ok) notify.success(res.message)
  else notify.error(res.message)

  if (res.ok) {
    const a1 = achievements.award(username.value, 'first_redeem')
    if (a1.ok) notify.success(a1.message)
    const msgs = achievements.checkThresholds(username.value, auth.points)
    msgs.forEach(m => notify.success(m))
  }
  loading.value = false
}
</script>

<style scoped>
.container { max-width: 960px; margin: 80px auto 40px; padding: 0 20px; }
h2 { font-size: 1.6rem; margin-bottom: 8px; }
.desc { color: #666; margin-bottom: 16px; }

.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
.card { border: 1px solid #eee; border-radius: 8px; padding: 16px; display: grid; gap: 10px; }
.title { margin: 0; font-size: 1.1rem; }
.meta { color: #666; }
.actions { display: flex; gap: 10px; }

.btn { padding: 10px 14px; border: none; border-radius: 6px; background: #6fcf97; color: #fff; cursor: pointer; }
.btn.btn-primary { background: #66a6ff; }
.hint { color: #666; margin-top: 8px; }

/* 透明化 ImageCard，适配全局 LightRays 背景 */
:deep(.image-card) { background: transparent; border-color: rgba(255,255,255,0.22); box-shadow: none; }
:deep(.image-card .media) { background: none; }
:deep(.image-card .title) { color: #e8f0fb; }
:deep(.image-card .subtitle), :deep(.image-card .meta) { color: rgba(232,240,251,0.8); }
:deep(.image-card .link) { color: #9ec3ff; }
</style>
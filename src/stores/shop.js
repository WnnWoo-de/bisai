import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const STORAGE_KEY = 'shop-state'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { redemptionsByUser: {} }
    const parsed = JSON.parse(raw)
    return {
      redemptionsByUser: parsed?.redemptionsByUser ?? {},
    }
  } catch (e) {
    return { redemptionsByUser: {} }
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useShopStore = defineStore('shop', {
  state: () => ({
    products: [
      { id: 101, name: '可降解购物袋', price: 20, desc: '环保材质，坚固耐用。' },
      { id: 102, name: '不锈钢保温杯', price: 80, desc: '减少一次性杯具，保温保冷。' },
      { id: 103, name: '竹制牙刷套装', price: 40, desc: '天然材质，低碳环保。' },
      { id: 104, name: '环保帆布袋', price: 50, desc: '可重复使用，时尚耐用。' },
    ],
    ...loadState(),
  }),
  getters: {
    productById: (state) => (id) => state.products.find(p => p.id === id),
    userRedemptions: (state) => (username) => state.redemptionsByUser[username] ?? [],
    isRedeemed: (state) => (username, productId) => {
      const list = state.redemptionsByUser[username] ?? []
      return list.includes(productId)
    },
  },
  actions: {
    redeem(username, productId) {
      if (!username) return { ok: false, message: '请先登录' }
      const product = this.productById(productId)
      if (!product) return { ok: false, message: '商品不存在' }
      const auth = useAuthStore()
      const success = auth.spendPoints(product.price, `兑换「${product.name}」`)
      if (!success) return { ok: false, message: '积分不足，兑换失败' }
      const list = this.redemptionsByUser[username] ?? []
      this.redemptionsByUser[username] = [...list, productId]
      save({ redemptionsByUser: this.redemptionsByUser })
      return { ok: true, message: '兑换成功！请前往个人中心查看明细' }
    },
  },
})
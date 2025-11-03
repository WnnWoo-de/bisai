import { defineStore } from 'pinia'

const STORAGE_KEY = 'achievements-state'

const ACHIEVEMENTS = [
  { id: 'first_checkin', name: '首次打卡', desc: '完成第一次每日打卡' },
  { id: 'first_activity', name: '首次活动报名', desc: '报名参与一次公益活动' },
  { id: 'first_redeem', name: '首次积分兑换', desc: '兑换一次积分商品' },
  { id: 'points_50', name: '积分达人 50', desc: '累计积分达到 50' },
  { id: 'points_100', name: '积分达人 100', desc: '累计积分达到 100' },
]

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { awardsByUser: {} }
    const parsed = JSON.parse(raw)
    return { awardsByUser: parsed?.awardsByUser ?? {} }
  } catch (e) {
    return { awardsByUser: {} }
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useAchievementsStore = defineStore('achievements', {
  state: () => ({
    ...loadState(),
  }),
  getters: {
    all: () => ACHIEVEMENTS,
    byId: () => (id) => ACHIEVEMENTS.find(a => a.id === id),
    userAwards: (state) => (username) => state.awardsByUser[username] ?? [],
    has: (state) => (username, id) => (state.awardsByUser[username]?.some(a => a.id === id)) || false,
  },
  actions: {
    award(username, id) {
      if (!username) return { ok: false, message: '请先登录' }
      if (this.has(username, id)) {
        const meta = ACHIEVEMENTS.find(a => a.id === id)
        return { ok: false, message: `已获得成就「${meta?.name ?? id}」` }
      }
      const meta = ACHIEVEMENTS.find(a => a.id === id)
      const list = this.awardsByUser[username] ?? []
      const at = Date.now()
      this.awardsByUser[username] = [...list, { id, at }]
      save({ awardsByUser: this.awardsByUser })
      return { ok: true, message: `解锁成就「${meta?.name ?? id}」` }
    },
    checkThresholds(username, points) {
      const messages = []
      if (!username) return messages
      if (points >= 50 && !this.has(username, 'points_50')) {
        const r = this.award(username, 'points_50'); if (r.ok) messages.push(r.message)
      }
      if (points >= 100 && !this.has(username, 'points_100')) {
        const r = this.award(username, 'points_100'); if (r.ok) messages.push(r.message)
      }
      return messages
    },
  },
})
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'

const STORAGE_KEY = 'checkin-state'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { checkinsByUser: {} }
    const parsed = JSON.parse(raw)
    return {
      checkinsByUser: parsed?.checkinsByUser ?? {},
    }
  } catch (e) {
    return { checkinsByUser: {} }
  }
}

function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function toYMD(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export const useCheckinStore = defineStore('checkin', {
  state: () => ({
    ...loadState(),
    pointsPerCheckin: 5,
  }),
  getters: {
    today: () => toYMD(new Date()),
    isChecked: (state) => (username, dateStr) => {
      if (!username) return false
      const day = dateStr || toYMD(new Date())
      const list = state.checkinsByUser[username] ?? []
      return list.includes(day)
    },
    recent: (state) => (username, days = 7) => {
      const res = []
      const base = new Date()
      for (let i = 0; i < days; i++) {
        const d = new Date(base)
        d.setDate(base.getDate() - i)
        const ymd = toYMD(d)
        res.push({ date: ymd, checked: state.checkinsByUser[username]?.includes(ymd) || false })
      }
      return res
    },
  },
  actions: {
    checkIn(username) {
      if (!username) return { ok: false, message: '请先登录' }
      const today = toYMD(new Date())
      const list = this.checkinsByUser[username] ?? []
      if (list.includes(today)) return { ok: false, message: '今天已打卡' }
      this.checkinsByUser[username] = [...list, today]
      save({ checkinsByUser: this.checkinsByUser })
      const auth = useAuthStore()
      auth.addPoints(this.pointsPerCheckin, '每日打卡')
      return { ok: true, message: `打卡成功！获得积分 +${this.pointsPerCheckin}` }
    },
  },
})
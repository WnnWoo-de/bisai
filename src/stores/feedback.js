import { defineStore } from 'pinia'

const STORAGE_KEY = 'feedback-state'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { itemsByUser: {} }
    const parsed = JSON.parse(raw)
    return {
      itemsByUser: parsed?.itemsByUser ?? {},
    }
  } catch (e) {
    return { itemsByUser: {} }
  }
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch (_) {}
}

export const useFeedbackStore = defineStore('feedback', {
  state: () => ({
    ...loadState(),
  }),
  getters: {
    list: (state) => (username) => state.itemsByUser[username] ?? [],
  },
  actions: {
    submit(username, item) {
      const entry = {
        id: Date.now(),
        date: new Date().toISOString(),
        category: item.category || '其他',
        subject: item.subject || '',
        message: item.message || '',
        contact: item.contact || '',
        rating: item.rating ?? null,
      }
      const list = this.itemsByUser[username] ?? []
      list.push(entry)
      this.itemsByUser[username] = list
      save({ itemsByUser: this.itemsByUser })
      return entry
    },
    clear(username) {
      this.itemsByUser[username] = []
      save({ itemsByUser: this.itemsByUser })
    },
  },
})
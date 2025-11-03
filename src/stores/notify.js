import { defineStore } from 'pinia'

export const useNotifyStore = defineStore('notify', {
  state: () => ({
    items: [],
    nextId: 1,
  }),
  actions: {
    push(type, message, duration = 3000) {
      const id = this.nextId++
      this.items.push({ id, type, message })
      if (duration > 0) {
        setTimeout(() => this.remove(id), duration)
      }
      return id
    },
    success(message, duration) { return this.push('success', message, duration) },
    error(message, duration) { return this.push('error', message, duration) },
    info(message, duration) { return this.push('info', message, duration) },
    remove(id) {
      this.items = this.items.filter(i => i.id !== id)
    },
    clear() { this.items = [] },
  },
})
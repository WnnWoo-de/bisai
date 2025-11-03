import { defineStore } from 'pinia'

const STORAGE_KEY = 'activity-state'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { registrationsByUser: {} }
    const parsed = JSON.parse(raw)
    return {
      registrationsByUser: parsed?.registrationsByUser ?? {},
    }
  } catch (e) {
    return { registrationsByUser: {} }
  }
}

export const useActivityStore = defineStore('activity', {
  state: () => ({
    activities: [
      { id: 1, title: '城市绿化植树', date: '2025-11-10', location: '杭州西湖', points: 20, category: '植树', image: '' },
      { id: 2, title: '海滩清洁行动', date: '2025-11-18', location: '厦门曾厝垵', points: 15, category: '清洁行动', image: '' },
      { id: 3, title: '社区垃圾分类宣讲', date: '2025-11-25', location: '上海浦东新区', points: 10, category: '宣讲', image: '' },
      { id: 4, title: '河道护坡与垃圾清理', date: '2025-12-02', location: '苏州古运河', points: 18, category: '清洁行动', image: '' },
      { id: 5, title: '城市步道捡跑（Plogging）', date: '2025-12-06', location: '成都锦城绿道', points: 16, category: '清洁行动', image: '' },
      { id: 6, title: '旧衣回收与再利用集市', date: '2025-12-12', location: '深圳南山区', points: 12, category: '回收', image: '' },
      { id: 7, title: '环保屋顶花园养护', date: '2025-12-15', location: '北京朝阳区', points: 14, category: '园艺', image: '' },
      { id: 8, title: '电子废弃物集中回收日', date: '2025-12-20', location: '南京江宁区', points: 22, category: '回收', image: '' },
      { id: 9, title: '校园低碳生活宣讲', date: '2025-12-28', location: '武汉华中科技大学', points: 10, category: '宣讲', image: '' },
    ],
    ...loadState(),
  }),
  getters: {
    userRegistrations: (state) => (username) => state.registrationsByUser[username] ?? [],
    isRegistered: (state) => (username, activityId) => {
      const list = state.registrationsByUser[username] ?? []
      return list.includes(activityId)
    },
    getById: (state) => (id) => state.activities.find(a => a.id === id),
  },
  actions: {
    register(username, activityId) {
      if (!username) return
      const list = this.registrationsByUser[username] ?? []
      if (!list.includes(activityId)) {
        this.registrationsByUser[username] = [...list, activityId]
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ registrationsByUser: this.registrationsByUser }))
      }
    },
    unregister(username, activityId) {
      if (!username) return
      const list = this.registrationsByUser[username] ?? []
      if (list.includes(activityId)) {
        this.registrationsByUser[username] = list.filter((id) => id !== activityId)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ registrationsByUser: this.registrationsByUser }))
      }
    },
  },
})
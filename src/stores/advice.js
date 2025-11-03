import { defineStore } from 'pinia'

export const useAdviceStore = defineStore('advice', {
  state: () => ({
    rules: {
      recyclable: [
        '可清洗后投放可回收物桶，避免二次污染。',
        '压扁体积（如塑料瓶、易拉罐）节省空间。',
        '纸类避免混入油污或湿垃圾，保持干燥整洁。',
      ],
      kitchen: [
        '沥干后投放湿垃圾，减少异味与渗漏。',
        '肉骨头、茶叶渣也归为厨余垃圾。',
        '尽量减少一次性餐具使用，源头减量。',
      ],
      hazardous: [
        '投放有害垃圾点或有害垃圾桶，勿混入其他垃圾。',
        '电池请用胶带封住极点，防止短路或泄漏。',
        '药品、灯管、油漆应密封并交付正规回收渠道。',
      ],
      other: [
        '干垃圾需密封后投放，减少扬尘与异味。',
        '被油污污染的纸、餐盒通常归为其他垃圾。',
        '优先考虑减量与替代，减少不可回收物。',
      ],
      battery: [
        '电池属于有害垃圾，送至有害垃圾收集点。',
        '用胶带封住电池极，避免接触与短路。',
        '集中投放，避免散落造成环境风险。',
      ],
      plastic_bottle: [
        '清洗沥干后投放可回收物桶，瓶盖和标签可一并回收。',
        '压扁节省空间；尽量购买可重复使用水杯。',
      ],
      glass: [
        '完整玻璃制品可回收，破碎需密封并标注后安全投放。',
        '避免与厨余混合，防止污染与安全风险。',
      ],
    },
    history: [],
  }),
  actions: {
    getAdviceByCategory(key) {
      const list = this.rules[key] || []
      const general = this.rules.recyclable.concat(this.rules.other)
      return list.length ? list : general.slice(0, 3)
    },
    searchAdviceByQuery(q = '') {
      const s = (q || '').toLowerCase()
      let key = ''
      if (/电池|battery|纽扣电池|蓄电池/.test(s)) key = 'battery'
      else if (/塑料|瓶|pet|矿泉水|饮料瓶/.test(s)) key = 'plastic_bottle'
      else if (/玻璃|玻璃瓶|玻璃杯/.test(s)) key = 'glass'
      else if (/厨余|剩菜|果皮|茶叶|骨头/.test(s)) key = 'kitchen'
      else if (/有害|药品|灯管|油漆|指甲油/.test(s)) key = 'hazardous'
      else if (/纸巾|陶瓷|灰尘|烟蒂|破损/.test(s)) key = 'other'

      const list = key ? this.getAdviceByCategory(key) : this.rules.other
      this.recordInteraction({ type: 'query', q, key, count: list.length })
      return { key: key || 'other', tips: list }
    },
    recordInteraction(entry) {
      this.history.unshift({ ...entry, at: Date.now() })
      this.history = this.history.slice(0, 50)
      try {
        localStorage.setItem('advice_history', JSON.stringify(this.history))
      } catch (_) {}
    },
    loadHistory() {
      try {
        const raw = localStorage.getItem('advice_history')
        if (raw) this.history = JSON.parse(raw)
      } catch (_) {}
    },
    clearHistory() {
      this.history = []
      try { localStorage.removeItem('advice_history') } catch (_) {}
    },
  },
})
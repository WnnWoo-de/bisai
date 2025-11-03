import { defineStore } from 'pinia'

const STORAGE_KEY = 'footprint-state'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { recordsByUser: {}, goalsByUser: {} }
    const parsed = JSON.parse(raw)
    return {
      recordsByUser: parsed?.recordsByUser ?? {},
      goalsByUser: parsed?.goalsByUser ?? {},
    }
  } catch (e) {
    return { recordsByUser: {}, goalsByUser: {} }
  }
}

function save(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch (_) {}
}

// 简化的排放因子（kg CO2e）
const FACTORS = {
  commute: { car: 0.21, bus: 0.10, metro: 0.05, bike: 0.0, walk: 0.0 }, // 每公里
  electricity: 0.65, // 每 kWh
  gas: 2.10, // 每 m^3
  diet: { meatMeal: 1.5, plantMeal: 0.5 }, // 每餐
  recycle: { plasticBottle: -0.05, aluminumCan: -0.06, paperKg: -1.2 }, // 每件或每公斤，负值为减排
}

export const useFootprintStore = defineStore('footprint', {
  state: () => ({
    factors: FACTORS,
    ...loadState(),
  }),
  getters: {
    records: (state) => (username) => state.recordsByUser[username] ?? [],
    lastRecord: (state) => (username) => {
      const arr = state.recordsByUser[username] ?? []
      return arr.length ? arr[arr.length - 1] : null
    },
    goalOf: (state) => (username) => state.goalsByUser[username] ?? null,
  },
  actions: {
    computeWeekly(form) {
      // form: { commuteMode, commuteKmPerDay, commuteDaysPerWeek, electricityMonthlyKwh, gasMonthlyM3, meatMealsPerWeek, plantMealsPerWeek, recycle: { bottles, cans, paperKg } }
      const f = this.factors
      const commute = Number(form.commuteKmPerDay || 0) * Number(form.commuteDaysPerWeek || 0) * (f.commute[form.commuteMode] ?? 0)
      const electricityWeekly = Number(form.electricityMonthlyKwh || 0) / 4.345 // 月转周
      const electricity = electricityWeekly * f.electricity
      const gasWeekly = Number(form.gasMonthlyM3 || 0) / 4.345
      const gas = gasWeekly * f.gas
      const diet = Number(form.meatMealsPerWeek || 0) * f.diet.meatMeal + Number(form.plantMealsPerWeek || 0) * f.diet.plantMeal
      const recycle = (Number(form.recycle?.plasticBottles || 0) * f.recycle.plasticBottle) + (Number(form.recycle?.aluminumCans || 0) * f.recycle.aluminumCan) + (Number(form.recycle?.paperKg || 0) * f.recycle.paperKg)
      const breakdown = { commute, electricity, gas, diet, recycle }
      const total = Object.values(breakdown).reduce((s, v) => s + Number(v || 0), 0)
      return { total: Math.max(0, Number(total.toFixed(2))), breakdown: Object.fromEntries(Object.entries(breakdown).map(([k, v]) => [k, Number(v.toFixed(2))])) }
    },
    saveRecord(username, result, form) {
      const entry = { date: new Date().toISOString(), total: result.total, breakdown: result.breakdown, form }
      const list = this.recordsByUser[username] ?? []
      list.push(entry)
      this.recordsByUser[username] = list
      save({ recordsByUser: this.recordsByUser, goalsByUser: this.goalsByUser })
      return entry
    },
    clearRecords(username) {
      this.recordsByUser[username] = []
      save({ recordsByUser: this.recordsByUser, goalsByUser: this.goalsByUser })
    },
    setGoal(username, goalKg) {
      if (!username) return { ok: false, message: '未登录无法设置目标' }
      const value = Number(goalKg)
      if (!isFinite(value) || value <= 0) return { ok: false, message: '目标需为正数' }
      this.goalsByUser[username] = value
      save({ recordsByUser: this.recordsByUser, goalsByUser: this.goalsByUser })
      return { ok: true, message: '已更新每周减碳目标' }
    },
  },
})
import axios from 'axios'

// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  // 允许跨域携带凭据（Cookies）
  withCredentials: true,
  // CSRF 配置：让axios自动把 Cookie 中的令牌写入请求头
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'x-xsrf-token'
})

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  async (config) => {
    // 在发送变更类请求前，确保已获取 CSRF Cookie
    const method = (config.method || 'get').toLowerCase()
    const needCsrf = ['post', 'put', 'delete', 'patch'].includes(method)
    if (needCsrf && typeof document !== 'undefined') {
      const hasCsrf = document.cookie.split('; ').some(c => c.startsWith('XSRF-TOKEN='))
      if (!hasCsrf) {
        try {
          // 直接请求后端健康检查以获取 CSRF Cookie（不走 /api 前缀）
          await axios.get('http://localhost:3001/health', { withCredentials: true })
        } catch (e) {
          // 静默处理，后续请求如果仍失败会在响应拦截器处理
        }
      }
      // 显式把 Cookie 中的 CSRF 写入请求头（跨端口不属于同源，axios不会自动设置）
      const tokenCookie = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='))
      if (tokenCookie) {
        const tokenVal = decodeURIComponent(tokenCookie.split('=')[1])
        config.headers['x-xsrf-token'] = tokenVal
      }
    }
    const token = localStorage.getItem('auth-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 处理错误和token过期
api.interceptors.response.use(
  (response) => {
    return response
  },
  async (error) => {
    // 移除自动重试，避免因 GET 刷新 CSRF 导致令牌不一致的循环
    if (error.response?.status === 401) {
      // Token过期或无效，清除本地存储并跳转到登录页
      localStorage.removeItem('auth-token')
      localStorage.removeItem('auth-state')
      
      // 如果不在登录页面，则跳转到登录页
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export default api
export { API_BASE_URL }

<template>
  <section class="container">
    <h2 v-reveal>关于我们</h2>
    <p class="desc" v-reveal>绿我同行 GreenSight AI —— 面向公众的绿色生活助手，让可持续更简单。</p>

    <div class="card" v-reveal>
      <h3 class="title">项目介绍</h3>
      <p class="text">
        绿我同行 GreenSight AI 致力于帮助用户在日常生活中更便捷地践行环保：
        通过垃圾识别与分类建议、碳足迹分析与趋势展示，以及 AI 环保建议规则库与社区分享，
        构建一套轻量、友好的绿色行动支持体系。
      </p>
      <ul class="list">
        <li>垃圾识别：上传或拍摄图片，给出分类与投放建议</li>
        <li>碳足迹分析：通勤/用电/用气/饮食/回收估算每周排放，支持目标与历史趋势</li>
        <li>环保建议：按分类与关键词查询，复制分享并记录历史</li>
        <li>社区与积分：参与活动与每日打卡，记录成长并解锁成就</li>
      </ul>
      <div class="actions">
        <router-link class="btn btn-primary" to="/ai-recognition">立即体验垃圾识别</router-link>
        <router-link class="btn" to="/carbon-footprint">查看碳足迹分析</router-link>
      </div>
    </div>

    <div class="card" v-reveal>
      <h3 class="title">技术栈与设计</h3>
      <ul class="list">
        <li>前端框架：Vue 3 + Vite</li>
        <li>状态管理：Pinia（本地持久化 localStorage）</li>
        <li>数据可视化：Chart.js + vue-chartjs</li>
        <li>样式与主题：CSS 变量 + SCSS，适配暗/亮主题</li>
        <li>路由：Vue Router，支持登录校验与滚动行为</li>
      </ul>
      <p class="small">说明：当前识别演示基于简化策略，用于交互与流程验证，并非生产级模型。</p>
    </div>

    <div class="card" v-reveal>
      <h3 class="title">愿景</h3>
      <p class="text">让每个人都能轻松参与环境保护，用科技推动绿色生活方式的普及与实践。</p>
    </div>
  </section>
</template>

<script setup>
// 关于我们 · 项目介绍页
</script>

<style scoped>
.container { max-width: 960px; margin: 0 auto; padding: 24px 20px; }
.desc { color: var(--muted); }
.card { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: transparent; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
.card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: var(--ray-accent-2, var(--blue)); }
.title { color: var(--text); }
.text { color: var(--text); }
.small { color: var(--muted); font-size: 0.9rem; }
.list { margin: 0; padding-left: 18px; color: var(--text); }
.list li { margin: 6px 0; }
.actions { display: flex; gap: 10px; align-items: center; }
.btn { padding: 10px 14px; border: none; border-radius: 6px; background: var(--blue); color: #fff; cursor: pointer; text-decoration: none; }
.btn.btn-primary { background: var(--blue); }
</style>
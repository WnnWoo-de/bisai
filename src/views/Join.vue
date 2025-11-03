<template>
  <section class="container">
    <h2 v-reveal>加入我们</h2>
    <p class="desc" v-reveal>与绿我同行 GreenSight AI 一起，用科技推动绿色生活。</p>

    <div class="card" v-reveal>
      <h3 class="title">正在招募</h3>
      <ul class="list">
        <li>前端开发（Vue）：参与页面与交互优化，提升用户体验</li>
        <li>社区运营：组织绿色主题活动，维护社区内容与氛围</li>
        <li>公益志愿者：线下环保行动支持与宣传</li>
      </ul>
    </div>

    <div class="card" v-reveal>
      <h3 class="title">我们在寻找</h3>
      <ul class="list">
        <li>认同可持续理念，乐于推进环保实践</li>
        <li>良好的沟通协作，愿意开放分享与学习</li>
        <li>有责任心，能稳定参与项目推进与活动</li>
      </ul>
    </div>

    <div class="card" v-reveal>
      <h3 class="title">联系方式</h3>
      <p class="text">欢迎通过意见反馈提交“加入我们”意向，我们会尽快与您联系。</p>
      <div class="actions">
        <router-link class="btn btn-primary" :to="{ path: '/help', query: { tab: 'feedback' } }">提交加入意向</router-link>
        <router-link class="btn" to="/about">了解项目简介</router-link>
      </div>
    </div>
  </section>
</template>

<script setup>
// 加入我们 · 招募页
</script>

<style scoped>
.container { max-width: 960px; margin: 0 auto; padding: 24px 20px; }
.desc { color: var(--muted); }
.card { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--border); border-radius: 8px; background: transparent; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease; }
.card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: var(--ray-accent-2, var(--blue)); }
.title { color: var(--text); }
.text { color: var(--text); }
.list { margin: 0; padding-left: 18px; color: var(--text); }
.list li { margin: 6px 0; }
.actions { display: flex; gap: 10px; align-items: center; }
.btn { padding: 10px 14px; border: none; border-radius: 6px; background: var(--blue); color: #fff; cursor: pointer; text-decoration: none; }
.btn.btn-primary { background: var(--blue); }
</style>
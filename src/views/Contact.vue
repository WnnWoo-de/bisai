<template>
  <section class="container">
    <h2 v-reveal>联系方式</h2>
    <p class="desc" v-reveal>欢迎联系绿我同行 GreenSight AI，反馈问题或合作交流。</p>

    <div class="card" v-reveal>
      <h3 class="title">联系渠道</h3>
      <ul class="list">
        <li>意见反馈：使用反馈表单提交问题与建议</li>
        <li>邮箱：team@greensight.local</li>
        <li>社区：在社区发布帖子或私信管理员</li>
      </ul>
      <div class="actions">
        <router-link class="btn btn-primary" :to="{ path: '/help', query: { tab: 'feedback' } }">打开意见反馈</router-link>
        <a class="btn" href="mailto:team@greensight.local">发送邮件</a>
      </div>
      <p class="small">说明：联系方式用于演示，请根据实际情况替换。</p>
    </div>

    <div class="card" v-reveal>
      <h3 class="title">响应时间</h3>
      <p class="text">工作日内尽快回复，复杂问题可能需要 3–5 个工作日。</p>
    </div>
  </section>
</template>

<script setup>
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
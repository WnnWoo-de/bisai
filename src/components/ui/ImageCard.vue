<template>
  <article class="image-card reveal" v-reveal="revealOptions">
    <div class="media">
      <img :src="img" :alt="alt || title || '图片'" loading="lazy" />
      <span v-if="badge" class="badge" :class="badgeClass">{{ badge }}</span>
      <span v-if="status" class="ribbon" :class="statusClass">{{ status }}</span>
    </div>
    <div class="body">
      <h3 class="title">{{ title }}</h3>
      <p v-if="subtitle" class="subtitle">{{ subtitle }}</p>
      <p v-if="meta" class="meta">{{ meta }}</p>
      <div class="actions">
        <router-link v-if="link" :to="link" class="card-link">{{ linkText || '查看详情' }}</router-link>
        <slot name="actions"></slot>
      </div>
    </div>
  </article>
</template>

<script setup>
const props = defineProps({
  img: { type: String, required: true },
  alt: { type: String, default: '' },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  meta: { type: String, default: '' },
  link: { type: String, default: '' },
  linkText: { type: String, default: '' },
  badge: { type: String, default: '' },
  badgeClass: { type: String, default: '' },
  status: { type: String, default: '' },
  statusClass: { type: String, default: '' },
  revealOptions: { type: [Object, Boolean], default: () => ({ duration: 0.6, distance: 10 }) },
})
</script>

<style scoped>
.image-card { display: grid; gap: 10px; border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: #fff; transition: transform .2s ease, box-shadow .2s ease; }
.image-card:hover { transform: translateY(-2px); box-shadow: 0 12px 24px rgba(0,0,0,0.08); }
.media { position: relative; aspect-ratio: 16 / 9; background: linear-gradient(135deg, rgba(111,207,151,0.08), rgba(102,166,255,0.1)); }
.media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.badge { position: absolute; top: 10px; left: 10px; display: inline-block; padding: 4px 8px; border-radius: 999px; background: rgba(102,166,255,0.12); color: #2f3b4a; font-size: 12px; backdrop-filter: blur(3px); border: 1px solid rgba(102,166,255,0.22); }
.badge.clean { background: rgba(102,166,255,0.12); border-color: rgba(102,166,255,0.28); }
.badge.recycle { background: rgba(111,207,151,0.16); border-color: rgba(111,207,151,0.30); }
.badge.talk { background: rgba(155,135,245,0.14); border-color: rgba(155,135,245,0.28); }
.badge.plant { background: rgba(120,200,120,0.16); border-color: rgba(120,200,120,0.30); }
.badge.garden { background: rgba(72, 187, 164, 0.16); border-color: rgba(72, 187, 164, 0.30); }
.badge.default { background: rgba(47, 59, 74, 0.12); border-color: rgba(47, 59, 74, 0.22); }
.ribbon { position: absolute; top: 10px; right: 10px; display: inline-block; padding: 4px 8px; border-radius: 8px; font-size: 12px; }
.ribbon.registered { background: #2ecc71; color: #fff; }
.ribbon.ended { background: #9aa4af; color: #fff; }
.body { padding: 12px 14px; display: grid; gap: 8px; }
.title { margin: 0; font-size: 1.05rem; color: #2f3b4a; }
.subtitle { margin: 0; color: #666; }
.meta { color: #888; font-size: 0.9rem; }
.actions { display: flex; gap: 10px; align-items: center; }
.card-link { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; border: 1px solid #e5e7eb; color: #2f3b4a; text-decoration: none; transition: background .2s ease, border-color .2s ease, transform .2s ease; }
.card-link:hover { background: #f3f5f7; border-color: #d1d5db; transform: translateY(-1px); }
@media (prefers-reduced-motion: reduce) {
  .image-card { transition: none; }
  .card-link { transition: none; }
}
</style>
<template>
  <div class="toast-wrap">
    <div v-for="n in notify.items" :key="n.id" class="toast" :class="n.type">
      <span class="msg">{{ n.message }}</span>
      <button class="close" @click="notify.remove(n.id)">×</button>
    </div>
  </div>
</template>

<script setup>
import { useNotifyStore } from '@/stores/notify'
const notify = useNotifyStore()
</script>

<style scoped>
.toast-wrap {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: grid;
  gap: 8px;
  z-index: 2000;
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.toast.success { background: #2ecc71; }
.toast.error { background: #e74c3c; }
.toast.info { background: #3498db; }
.msg { flex: 1; }
.close { background: transparent; border: none; color: #fff; font-size: 18px; cursor: pointer; }
</style>
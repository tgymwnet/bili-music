<template>
  <div class="title-bar" v-if="isElectron">
    <div class="title-drag-area">
      <q-icon name="mdi-music-circle" size="16px" color="primary" />
      <span class="title-text">BiliMusic</span>
    </div>
    <div class="title-controls">
      <button class="ctrl-btn" @click="minimize" title="最小化">
        <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
      </button>
      <button class="ctrl-btn" @click="maximize" title="最大化/还原">
        <svg v-if="!isMaximized" width="10" height="10" viewBox="0 0 10 10"><rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor"/></svg>
        <svg v-else width="10" height="10" viewBox="0 0 10 10"><rect x="2" y="0" width="8" height="8" fill="none" stroke="currentColor"/><rect x="0" y="2" width="8" height="8" fill="none" stroke="currentColor" style="fill:var(--color-bg-secondary)"/></svg>
      </button>
      <button class="ctrl-btn close-btn" @click="close" title="关闭">
        <svg width="10" height="10" viewBox="0 0 10 10"><line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="1.2"/></svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const win = (window as Window & { electronAPI?: {
  isElectron: boolean
  minimize: () => void
  maximize: () => void
  close: () => void
  onMaximized: (cb: (val: boolean) => void) => void
} }).electronAPI

const isElectron = !!win?.isElectron
const isMaximized = ref(false)

function minimize() { win?.minimize() }
function maximize() { win?.maximize() }
function close() { win?.close() }

onMounted(() => {
  win?.onMaximized((val) => { isMaximized.value = val })
})
</script>

<style lang="scss" scoped>
.title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  position: relative;
  z-index: 2000;
}

.title-drag-area {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  flex: 1;
  -webkit-app-region: drag;  // 这个区域可以拖动窗口
  user-select: none;

  .title-text {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-muted);
    letter-spacing: 0.3px;
  }
}

.title-controls {
  display: flex;
  align-items: center;
  -webkit-app-region: no-drag;
  flex-shrink: 0;
}

.ctrl-btn {
  width: 46px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-text);
  }

  &.close-btn:hover {
    background: #e81123;
    color: white;
  }
}
</style>

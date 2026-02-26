<template>
  <q-page class="favorites-page">
    <div class="page-header">
      <div class="page-title">
        <q-icon name="mdi-heart" color="primary" size="24px" />
        我的收藏
        <span class="count-badge">{{ favStore.list.length }}</span>
      </div>
      <q-btn v-if="favStore.list.length" flat dense icon="mdi-delete-sweep-outline" color="grey-6" label="清空" size="sm" @click="confirmClear" />
    </div>

    <div v-if="favStore.list.length === 0" class="empty-state">
      <q-icon name="mdi-heart-outline" size="64px" color="grey-8" />
      <p>收藏夹是空的</p>
      <p class="sub">在搜索页面点击 ❤ 收藏喜欢的音乐</p>
      <q-btn flat color="primary" label="去搜索" to="/search" />
    </div>

    <div v-else class="track-list">
      <div
        v-for="(track, index) in favStore.list"
        :key="track.bvid"
        class="track-item"
        :class="{ playing: playerStore.currentTrack?.bvid === track.bvid }"
        @click="handlePlay(track)"
      >
        <div class="track-index">
          <span v-if="playerStore.currentTrack?.bvid !== track.bvid">{{ index + 1 }}</span>
          <div v-else class="eq-bars">
            <div class="bar" v-for="i in 4" :key="i" />
          </div>
        </div>
        <img :src="track.cover" :alt="track.title" class="track-cover" />
        <div class="track-info">
          <div class="track-title">{{ track.title }}</div>
          <div class="track-author">{{ track.author }}</div>
        </div>
        <div class="track-actions" @click.stop>
          <q-btn flat round dense icon="mdi-playlist-plus" color="grey-6" size="xs" @click="playerStore.addToPlaylist(track)" />
          <q-btn flat round dense icon="mdi-heart" color="primary" size="xs" @click="favStore.remove(track.bvid)" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { Notify, useQuasar } from 'quasar'
import { useFavoritesStore } from '../stores/favorites'
import { usePlayerStore } from '../stores/player'
import { getVideoCid, getAudioUrl } from '../api/bilibili'
import type { Track } from '../stores/player'

const favStore = useFavoritesStore()
const playerStore = usePlayerStore()
const $q = useQuasar()

async function handlePlay(track: Track) {
  try {
    const cid = await getVideoCid(track.bvid)
    const url = await getAudioUrl(track.bvid, cid)
    playerStore.addToPlaylist(track)
    await playerStore.playTrack(track, url)
  } catch (e: unknown) {
    Notify.create({ type: 'negative', message: '播放失败：' + (e instanceof Error ? e.message : '未知错误') })
  }
}

function confirmClear() {
  $q.dialog({
    title: '确认清空',
    message: '确定要清空所有收藏吗？',
    cancel: true,
    persistent: true,
    dark: true,
  }).onOk(() => {
    favStore.clear()
    Notify.create({ message: '已清空收藏', color: 'dark', timeout: 1500 })
  })
}
</script>

<style lang="scss" scoped>
.favorites-page { background: var(--color-bg); min-height: 100vh; }
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px;
  border-bottom: 1px solid var(--color-border);
  .page-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 22px;
    font-weight: 700;
    color: var(--color-text);
  }
  .count-badge {
    font-size: 13px;
    font-weight: 500;
    background: rgba(251,114,153,0.15);
    color: var(--color-primary);
    padding: 2px 8px;
    border-radius: 10px;
  }
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  gap: 12px;
  text-align: center;
  p { font-size: 18px; font-weight: 500; color: var(--color-text); margin: 0; }
  .sub { font-size: 14px; color: var(--color-text-muted); font-weight: 400; }
}
.track-list { padding: 12px 16px; }
.track-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: var(--color-bg-card); .track-actions { opacity: 1; } }
  &.playing { background: rgba(251,114,153,0.07); .track-title { color: var(--color-primary); } }
}
.track-index {
  width: 28px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-muted);
  flex-shrink: 0;
  .eq-bars {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 2px;
    height: 16px;
    .bar {
      width: 3px;
      background: var(--color-primary);
      border-radius: 2px;
      animation: equalize 0.8s ease-in-out infinite alternate;
      &:nth-child(1) { height: 60%; animation-delay: 0s; }
      &:nth-child(2) { height: 100%; animation-delay: 0.2s; }
      &:nth-child(3) { height: 70%; animation-delay: 0.4s; }
      &:nth-child(4) { height: 40%; animation-delay: 0.1s; }
    }
  }
}
.track-cover { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.track-info {
  flex: 1;
  overflow: hidden;
  .track-title { font-size: 14px; font-weight: 500; color: var(--color-text); transition: color 0.2s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .track-author { font-size: 12px; color: var(--color-text-muted); margin-top: 2px; }
}
.track-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
@keyframes equalize {
  from { transform: scaleY(0.4); }
  to { transform: scaleY(1); }
}
</style>

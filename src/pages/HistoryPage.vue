<template>
  <q-page class="history-page">
    <div class="page-header">
      <div class="page-title">
        <q-icon name="mdi-history" color="secondary" size="24px" />
        最近播放
      </div>
    </div>

    <div v-if="playerStore.playlist.length === 0" class="empty-state">
      <q-icon name="mdi-playlist-music-outline" size="64px" color="grey-8" />
      <p>暂无播放记录</p>
      <p class="sub">去搜索音乐并播放吧</p>
      <q-btn flat color="primary" label="去搜索" to="/search" />
    </div>

    <div v-else class="history-list">
      <div
        v-for="(track, index) in playerStore.playlist"
        :key="track.bvid"
        class="history-item"
        :class="{ active: playerStore.currentTrack?.bvid === track.bvid }"
      >
        <div class="item-index">{{ index + 1 }}</div>
        <img :src="track.cover" :alt="track.title" class="item-cover" />
        <div class="item-info">
          <div class="item-title">{{ track.title }}</div>
          <div class="item-author">{{ track.author }}</div>
        </div>
        <div v-if="playerStore.currentTrack?.bvid === track.bvid" class="playing-indicator">
          <div class="bar" v-for="i in 4" :key="i" />
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { usePlayerStore } from '../stores/player'
const playerStore = usePlayerStore()
</script>

<style lang="scss" scoped>
.history-page {
  background: var(--color-bg);
  min-height: 100vh;
}

.page-header {
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
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  gap: 12px;
  text-align: center;

  p {
    font-size: 18px;
    font-weight: 500;
    color: var(--color-text);
    margin: 0;
  }

  .sub {
    font-size: 14px;
    color: var(--color-text-muted);
  }
}

.history-list {
  padding: 16px 24px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--color-bg-card);
  }

  &.active {
    background: rgba(251, 114, 153, 0.08);

    .item-title {
      color: var(--color-primary);
    }
  }

  .item-index {
    width: 24px;
    text-align: center;
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .item-cover {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    object-fit: cover;
  }

  .item-info {
    flex: 1;

    .item-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text);
    }

    .item-author {
      font-size: 12px;
      color: var(--color-text-muted);
      margin-top: 2px;
    }
  }

  .playing-indicator {
    display: flex;
    align-items: flex-end;
    gap: 2px;
    height: 20px;

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

@keyframes equalize {
  from { transform: scaleY(0.4); }
  to { transform: scaleY(1); }
}
</style>

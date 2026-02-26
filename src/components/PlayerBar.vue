<template>
  <div class="player-bar glass" :class="{ 'has-track': playerStore.currentTrack }">
    <!-- 当前曲目信息 -->
    <div class="track-info">
      <template v-if="currentTrackInfo">
        <div class="cover-wrap" @click="showNowPlaying = true">
          <img
            :src="currentTrackInfo.cover"
            :alt="currentTrackInfo.title"
            class="track-cover"
            :class="{ spinning: playerStore.isPlaying }"
          />
          <div class="cover-overlay">
            <q-icon name="mdi-music-note" size="16px" />
          </div>
        </div>
        <div class="track-meta">
          <div class="track-title text-ellipsis">{{ currentTrackInfo.title }}</div>
          <div class="track-artist text-ellipsis">{{ currentTrackInfo.author }}</div>
        </div>
        <q-btn
          flat round dense
          :icon="isFav ? 'mdi-heart' : 'mdi-heart-outline'"
          :color="isFav ? 'primary' : 'grey-6'"
          size="sm"
          @click.stop="toggleCurrentFav"
        >
          <q-tooltip>{{ isFav ? '取消收藏' : '收藏' }}</q-tooltip>
        </q-btn>
      </template>
      <template v-else>
        <div class="no-track">
          <q-icon name="mdi-music-note-outline" size="24px" color="grey-7" />
          <span class="no-track-text">未在播放</span>
        </div>
      </template>
    </div>

    <!-- 播放控制（中间：模式 + 上/下一首 + 播放 + 进度条） -->
    <div class="player-controls">
      <!-- 播放模式 -->
      <q-btn flat round dense :icon="playModeIcon" :color="playModeColor" size="sm"
        @click="playerStore.togglePlayMode()">
        <q-tooltip>{{ playModeLabel }}</q-tooltip>
      </q-btn>

      <!-- 上一首 -->
      <q-btn flat round dense icon="mdi-skip-previous" color="grey-5" size="sm"
        :disable="!playerStore.hasPrev" @click="playerStore.playPrev()">
        <q-tooltip>上一首</q-tooltip>
      </q-btn>

      <!-- 播放/暂停 -->
      <q-btn unelevated round
        :icon="playerStore.isPlaying ? 'mdi-pause' : 'mdi-play'"
        color="primary" size="md" class="play-btn"
        :loading="playerStore.isLoading"
        :disable="!playerStore.currentTrack"
        @click="playerStore.togglePlay()"
      />

      <!-- 下一首 -->
      <q-btn flat round dense icon="mdi-skip-next" color="grey-5" size="sm"
        :disable="!playerStore.hasNext" @click="playerStore.playNext()">
        <q-tooltip>下一首</q-tooltip>
      </q-btn>

      <!-- 进度条 -->
      <div class="progress-section">
        <span class="time-text">{{ playerStore.formatTime(seekingProgress ?? playerStore.progress) }}</span>
        <q-slider
          :model-value="seekingProgress ?? playerStore.progress"
          :min="0" :max="playerStore.duration || 100" :step="1"
          color="primary" track-color="grey-9" class="progress-slider"
          @update:model-value="onSeekDrag"
          @change="onSeekCommit"
        />
        <span class="time-text">{{ playerStore.formatTime(playerStore.duration) }}</span>
      </div>
    </div>

    <!-- 右侧：队列 / 音量 -->
    <div class="right-section">
      <!-- 播放队列 -->
      <q-btn flat round dense icon="mdi-playlist-music" size="sm"
        :color="showQueue ? 'primary' : 'grey-6'"
        @click="showQueue = !showQueue">
        <q-tooltip>播放队列</q-tooltip>
      </q-btn>

      <!-- 音量 -->
      <q-btn flat round dense :icon="volumeIcon" color="grey-6" size="sm"
        @click="playerStore.toggleMute()">
        <q-tooltip>{{ playerStore.isMuted ? '取消静音' : '静音' }}</q-tooltip>
      </q-btn>
      <q-slider
        v-model="volumeModel"
        :min="0" :max="1" :step="0.01"
        color="primary" track-color="grey-9"
        class="volume-slider"
      />
    </div>

    <!-- 播放队列面板 -->
    <transition name="slide-up">
      <div v-if="showQueue" class="queue-panel glass">
        <div class="queue-header">
          <span class="queue-title">播放队列</span>
          <span class="queue-count">{{ playerStore.playlist.length }} 首</span>
          <q-btn flat round dense icon="mdi-delete-sweep-outline" color="grey-6" size="sm" @click="clearQueue">
            <q-tooltip>清空队列</q-tooltip>
          </q-btn>
          <q-btn flat round dense icon="mdi-close" color="grey-6" size="sm" @click="showQueue = false" />
        </div>
        <div class="queue-list" ref="queueListRef">
          <div
            v-for="(track, index) in playerStore.playlist"
            :key="track.bvid"
            class="queue-item"
            :class="{ active: playerStore.currentTrack?.bvid === track.bvid }"
            @click="playFromQueue(track)"
          >
            <div class="queue-index">
              <span v-if="playerStore.currentTrack?.bvid !== track.bvid">{{ index + 1 }}</span>
              <div v-else class="eq-mini">
                <div class="bar" v-for="i in 3" :key="i" />
              </div>
            </div>
            <img :src="track.cover" class="queue-cover" />
            <div class="queue-info">
              <div class="queue-name">{{ track.title }}</div>
              <div class="queue-author">{{ track.author }}</div>
            </div>
            <q-btn
              flat round dense icon="mdi-close" color="grey-7" size="xs"
              class="queue-remove"
              @click.stop="removeFromQueue(index)"
            />
          </div>
          <div v-if="!playerStore.playlist.length" class="queue-empty">
            <q-icon name="mdi-playlist-music-outline" size="36px" color="grey-8" />
            <p>队列为空</p>
          </div>
        </div>
      </div>
    </transition>
  </div>

  <!-- 正在播放面板（Teleport 到 body 避免 backdrop-filter 影响 fixed 定位） -->
  <Teleport to="body">
    <transition name="fade">
      <NowPlayingPanel v-if="showNowPlaying && currentTrackInfo" @close="showNowPlaying = false" />
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'

import { usePlayerStore } from '../stores/player'
import { useFavoritesStore } from '../stores/favorites'
import { getVideoCid, getAudioUrl } from '../api/bilibili'
import { Notify } from 'quasar'
import NowPlayingPanel from './NowPlayingPanel.vue'
import type { Track } from '../stores/player'

const playerStore = usePlayerStore()
const favStore = useFavoritesStore()
const showQueue = ref(false)
const showNowPlaying = ref(false)
const queueListRef = ref<HTMLElement | null>(null)

const currentTrackInfo = computed(() => playerStore.currentTrack)
const isFav = computed(() => {
  const t = playerStore.currentTrack
  return t ? favStore.isFavorited(t.bvid) : false
})

watch(() => playerStore.autoPlayTrigger, async () => {
  const track = playerStore.playlist[playerStore.currentIndex]
  if (!track) return
  await playFromQueue(track)
})

watch(() => playerStore.currentTrack, async () => {
  if (!showQueue.value) return
  await nextTick()
  const activeEl = queueListRef.value?.querySelector('.queue-item.active')
  activeEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

function toggleCurrentFav() {
  try {
    const track = playerStore.currentTrack
    if (!track) return
    const added = favStore.toggle({ ...track })
    Notify.create({
      message: added ? '已加入收藏' : '已取消收藏',
      icon: added ? 'mdi-heart' : 'mdi-heart-outline',
      color: added ? 'primary' : 'grey-7',
      position: 'top',
      timeout: 1500,
    })
  } catch (e) {
    console.error('toggleCurrentFav error:', e)
  }
}

let _skipRetryCount = 0
const MAX_SKIP_RETRY = 3

async function playFromQueue(track: Track) {
  try {
    const cid = await getVideoCid(track.bvid)
    const url = await getAudioUrl(track.bvid, cid)
    await playerStore.playTrack(track, url)
    _skipRetryCount = 0
  } catch (e: unknown) {
    Notify.create({ type: 'negative', message: '播放失败，跳到下一首：' + (e instanceof Error ? e.message : ''), timeout: 3000 })
    if (_skipRetryCount < MAX_SKIP_RETRY && playerStore.playlist.length > 1) {
      _skipRetryCount++
      playerStore.playNext()
    } else {
      _skipRetryCount = 0
    }
  }
}

function removeFromQueue(index: number) {
  playerStore.playlist.splice(index, 1)
}

function clearQueue() {
  playerStore.playlist.splice(0)
  playerStore.currentTrack && (playerStore.playlist.length === 0)
}

const seekingProgress = ref<number | null>(null)

function onSeekDrag(val: number) {
  playerStore.isSeeking = true
  seekingProgress.value = val
}

function onSeekCommit(val: number) {
  playerStore.seekTo(val)
  seekingProgress.value = null
  playerStore.isSeeking = false
}

const volumeModel = computed({
  get: () => playerStore.volume,
  set: (val) => playerStore.setVolume(val),
})

const volumeIcon = computed(() => {
  if (playerStore.isMuted || playerStore.volume === 0) return 'mdi-volume-mute'
  if (playerStore.volume < 0.5) return 'mdi-volume-low'
  return 'mdi-volume-high'
})

const playModeIcon = computed(() => {
  switch (playerStore.playMode) {
    case 'shuffle': return 'mdi-shuffle'
    case 'repeat': return 'mdi-repeat-once'
    default: return 'mdi-repeat'
  }
})

const playModeColor = computed(() => {
  return playerStore.playMode !== 'sequence' ? 'primary' : 'grey-6'
})

const playModeLabel = computed(() => {
  switch (playerStore.playMode) {
    case 'shuffle': return '随机播放'
    case 'repeat': return '单曲循环'
    default: return '顺序播放'
  }
})
</script>

<style lang="scss" scoped>
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--player-height);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 20px;
  background: rgba(13, 13, 13, 0.95) !important;
  border-top: 1px solid var(--color-border);
  z-index: 1000;
}

.track-info {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 260px;
  flex-shrink: 0;

  .no-track {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-muted);

    .no-track-text {
      font-size: 13px;
    }
  }
}

.cover-wrap {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;

  .track-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;

    &.spinning {
      animation: spin 8s linear infinite;
    }
  }

  .cover-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .cover-overlay {
    opacity: 1;
  }
}

.track-meta {
  flex: 1;
  overflow: hidden;

  .track-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
  }

  .track-artist {
    font-size: 12px;
    color: var(--color-text-muted);
    margin-top: 2px;
  }
}

.player-controls {
  flex: 1;
  min-width: 0;          /* 防止 flex item 不收缩 */
  display: flex;
  align-items: center;
  gap: 8px;
}

.play-btn {
  width: 44px;
  height: 44px;
}

.progress-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;          /* 允许进度条区域真正撑开 */

  .time-text {
    font-size: 11px;
    color: var(--color-text-muted);
    font-variant-numeric: tabular-nums;
    min-width: 36px;
    text-align: center;
  }

  .progress-slider {
    flex: 1;
  }
}

.right-section {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 200px;
  flex-shrink: 0;
  justify-content: flex-end;

  .volume-slider {
    width: 80px;
    flex-shrink: 0;
  }
}

.queue-panel {
  position: fixed;
  bottom: var(--player-height);
  right: 0;
  width: 360px;
  height: 420px;
  z-index: 999;
  background: rgba(14, 14, 14, 0.97) !important;
  border-top: 1px solid var(--color-border);
  border-left: 1px solid var(--color-border);
  border-radius: 12px 0 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.queue-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;

  .queue-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
  }

  .queue-count {
    font-size: 12px;
    color: var(--color-text-muted);
    background: var(--color-bg-hover);
    padding: 1px 7px;
    border-radius: 10px;
  }

  .q-btn:last-child { margin-left: auto; }
}

.queue-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
}

.queue-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 10px;
  color: var(--color-text-muted);
  p { font-size: 14px; margin: 0; }
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: var(--color-bg-hover);
    .queue-remove { opacity: 1; }
  }

  &.active {
    background: rgba(251, 114, 153, 0.1);
    .queue-name { color: var(--color-primary); }
  }
}

.queue-index {
  width: 22px;
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
  flex-shrink: 0;

  .eq-mini {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 2px;
    height: 14px;
    .bar {
      width: 3px;
      background: var(--color-primary);
      border-radius: 1px;
      animation: equalize 0.8s ease-in-out infinite alternate;
      &:nth-child(1) { height: 60%; animation-delay: 0s; }
      &:nth-child(2) { height: 100%; animation-delay: 0.2s; }
      &:nth-child(3) { height: 70%; animation-delay: 0.4s; }
    }
  }
}

.queue-cover {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.queue-info {
  flex: 1;
  overflow: hidden;

  .queue-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: color 0.2s;
  }

  .queue-author {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: 2px;
  }
}

.queue-remove {
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

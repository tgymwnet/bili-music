<template>
  <div class="now-playing" @click.self="$emit('close')">
    <div class="bg-blur" :style="bgStyle" />
    <div class="bg-overlay" />

    <q-btn flat round icon="mdi-chevron-down" color="white" size="sm" class="close-btn" @click="$emit('close')" />

    <div class="np-content">
      <div class="np-title">{{ track.title }}</div>
      <div class="np-artist">{{ track.author }}</div>

      <div class="np-cover-wrap">
        <div class="np-cover" :class="{ spinning: playerStore.isPlaying }">
          <img :src="track.cover" :alt="track.title" />
        </div>
      </div>

      <!-- 音频可视化条 -->
      <div class="np-visualizer">
        <div
          v-for="i in barCount" :key="i"
          class="vis-bar"
          :class="{ active: playerStore.isPlaying }"
          :style="barStyle(i)"
        />
      </div>

      <!-- 进度条 -->
      <div class="np-progress">
        <span class="np-time">{{ playerStore.formatTime(playerStore.progress) }}</span>
        <q-slider
          v-model="progressModel"
          :min="0" :max="playerStore.duration || 100" :step="1"
          color="white" track-color="rgba(255,255,255,0.2)"
          class="np-slider"
          @change="(val: number) => playerStore.seekTo(val)"
        />
        <span class="np-time">{{ playerStore.formatTime(playerStore.duration) }}</span>
      </div>

      <!-- 控制按钮 -->
      <div class="np-controls">
        <q-btn flat round
          :icon="isFav ? 'mdi-heart' : 'mdi-heart-outline'"
          :color="isFav ? 'primary' : 'rgba(255,255,255,0.6)'"
          size="sm" @click.stop="toggleFav"
        />

        <q-btn flat round icon="mdi-skip-previous" color="white" size="md"
          :disable="!playerStore.hasPrev" @click="playerStore.playPrev()" />

        <q-btn unelevated round
          :icon="playerStore.isPlaying ? 'mdi-pause' : 'mdi-play'"
          color="white" text-color="black" size="lg" class="np-play-btn"
          :loading="playerStore.isLoading"
          @click="playerStore.togglePlay()"
        />

        <q-btn flat round icon="mdi-skip-next" color="white" size="md"
          :disable="!playerStore.hasNext" @click="playerStore.playNext()" />

        <q-btn flat round :icon="playModeIcon" :color="playModeColor" size="sm"
          @click="playerStore.togglePlayMode()">
          <q-tooltip>{{ playModeLabel }}</q-tooltip>
        </q-btn>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player'
import { useFavoritesStore } from '../stores/favorites'
import { Notify } from 'quasar'

defineEmits(['close'])

const playerStore = usePlayerStore()
const favStore = useFavoritesStore()
const track = computed(() => playerStore.currentTrack!)

const isFav = computed(() => {
  const t = playerStore.currentTrack
  return t ? favStore.isFavorited(t.bvid) : false
})

const bgStyle = computed(() => ({
  backgroundImage: `url(${track.value?.cover})`,
}))

const progressModel = computed({
  get: () => playerStore.progress,
  set: (val) => playerStore.seekTo(val),
})

const barCount = 64

function barStyle(i: number) {
  const seed = (i * 7 + 13) % 100
  const h = 20 + seed * 0.6
  const delay = ((i * 37) % 100) / 100
  return { '--h': `${h}%`, '--delay': `${delay}s` }
}

function toggleFav() {
  try {
    const t = playerStore.currentTrack
    if (!t) return
    const added = favStore.toggle({ ...t })
    Notify.create({
      message: added ? '已加入收藏' : '已取消收藏',
      icon: added ? 'mdi-heart' : 'mdi-heart-outline',
      color: added ? 'primary' : 'grey-7',
      position: 'top', timeout: 1500,
    })
  } catch (e) { console.error(e) }
}

const playModeIcon = computed(() => {
  switch (playerStore.playMode) {
    case 'shuffle': return 'mdi-shuffle'
    case 'repeat': return 'mdi-repeat-once'
    default: return 'mdi-repeat'
  }
})
const playModeColor = computed(() => playerStore.playMode !== 'sequence' ? 'primary' : 'rgba(255,255,255,0.6)')
const playModeLabel = computed(() => {
  switch (playerStore.playMode) {
    case 'shuffle': return '随机播放'
    case 'repeat': return '单曲循环'
    default: return '顺序播放'
  }
})
const volumeIcon = computed(() => {
  if (playerStore.isMuted || playerStore.volume === 0) return 'mdi-volume-mute'
  if (playerStore.volume < 0.5) return 'mdi-volume-low'
  return 'mdi-volume-high'
})
</script>

<style lang="scss" scoped>
.now-playing {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.bg-blur {
  position: absolute;
  inset: -40px;
  background-size: cover;
  background-position: center;
  filter: blur(60px) saturate(1.4) brightness(0.4);
  transform: scale(1.2);
}

.bg-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 20px;
  z-index: 10;
  opacity: 0.7;
  transition: opacity 0.2s;
  &:hover { opacity: 1; }
}

.np-content {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 500px;
  padding: 0 24px;
}

.np-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  text-align: center;
  text-shadow: 0 2px 12px rgba(0,0,0,0.5);
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.np-artist {
  font-size: 14px;
  color: rgba(255,255,255,0.65);
  text-shadow: 0 1px 6px rgba(0,0,0,0.4);
  margin-bottom: 12px;
}

.np-cover-wrap {
  perspective: 800px;
  margin-bottom: 12px;
}

.np-cover {
  width: 220px;
  height: 220px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);

  &.spinning { animation: float 4s ease-in-out infinite; }

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

.np-visualizer {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 2px;
  height: 60px;
  width: 100%;
  max-width: 420px;
  margin-bottom: 4px;
}

.vis-bar {
  flex: 1;
  max-width: 5px;
  min-width: 2px;
  background: var(--color-primary);
  border-radius: 2px 2px 0 0;
  height: 4px;
  opacity: 0.4;
  transition: height 0.15s ease, opacity 0.3s;

  &.active {
    opacity: 0.85;
    animation: visBounce 0.8s ease-in-out infinite alternate;
    animation-delay: var(--delay);
  }
}

.np-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 420px;

  .np-time {
    font-size: 12px;
    color: rgba(255,255,255,0.55);
    font-variant-numeric: tabular-nums;
    min-width: 36px;
    text-align: center;
  }

  .np-slider { flex: 1; }
}

.np-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.np-play-btn {
  width: 56px;
  height: 56px;
  margin: 0 8px;
}

@keyframes visBounce {
  0% { height: 4px; }
  100% { height: var(--h); }
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-6px) scale(1.01); }
}
</style>

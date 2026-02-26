<template>
  <div class="lyrics-panel glass">
    <div v-if="!playerStore.currentTrack" class="lyrics-empty">
      <q-icon name="mdi-music-note-outline" size="48px" color="grey-8" />
      <p>暂无播放内容</p>
    </div>

    <template v-else>
      <!-- 专辑封面 -->
      <div class="lyrics-cover-side">
        <div class="cover-container" :class="{ spinning: playerStore.isPlaying }">
          <img
            :src="playerStore.currentTrack.cover"
            :alt="playerStore.currentTrack.title"
            class="cover-img"
          />
          <div class="cover-disc-hole" />
        </div>
        <div class="track-info-large">
          <div class="track-title-large">{{ playerStore.currentTrack.title }}</div>
          <div class="track-artist-large">{{ playerStore.currentTrack.author }}</div>
        </div>
      </div>

      <!-- 歌词内容 -->
      <div class="lyrics-content" ref="lyricsContainer">
        <div v-if="!playerStore.lyrics.length" class="lyrics-empty">
          <q-icon name="mdi-text-box-outline" size="36px" color="grey-8" />
          <p>暂无歌词</p>
        </div>

        <div v-else class="lyrics-list">
          <div
            v-for="(line, index) in playerStore.lyrics"
            :key="index"
            :ref="(el) => setLyricRef(el, index)"
            class="lyric-line"
            :class="{
              active: index === playerStore.currentLyricIndex,
              past: index < playerStore.currentLyricIndex,
            }"
            @click="playerStore.seekTo(line.time)"
          >
            {{ line.text }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { usePlayerStore } from '../stores/player'

const playerStore = usePlayerStore()
const lyricsContainer = ref<HTMLElement | null>(null)
const lyricRefs = ref<(HTMLElement | null)[]>([])

function setLyricRef(el: unknown, index: number) {
  lyricRefs.value[index] = el as HTMLElement | null
}

watch(
  () => playerStore.currentLyricIndex,
  async (index) => {
    await nextTick()
    if (index >= 0 && lyricRefs.value[index] && lyricsContainer.value) {
      lyricRefs.value[index]!.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }
)
</script>

<style lang="scss" scoped>
.lyrics-panel {
  display: flex;
  align-items: stretch;
  background: rgba(10, 10, 10, 0.96) !important;
  border-top: 1px solid var(--color-border);
  height: 340px;
  overflow: hidden;
}

.lyrics-cover-side {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  border-right: 1px solid var(--color-border);
}

.cover-container {
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(251, 114, 153, 0.3);

  &.spinning {
    animation: spin 12s linear infinite;
  }

  .cover-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-disc-hole {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--color-bg);
    border: 2px solid var(--color-border);
  }
}

.track-info-large {
  margin-top: 16px;
  text-align: center;

  .track-title-large {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 4px;
  }

  .track-artist-large {
    font-size: 13px;
    color: var(--color-text-muted);
  }
}

.lyrics-content {
  flex: 1;
  overflow-y: auto;
  padding: 40px 60px;
  display: flex;
  align-items: flex-start;

  .lyrics-empty {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--color-text-muted);
    gap: 12px;

    p {
      font-size: 14px;
    }
  }
}

.lyrics-list {
  width: 100%;
}

.lyric-line {
  font-size: 16px;
  line-height: 2;
  color: var(--color-text-muted);
  transition: all 0.4s ease;
  cursor: pointer;
  padding: 4px 0;

  &:hover {
    color: var(--color-text);
  }

  &.past {
    color: rgba(255, 255, 255, 0.3);
  }

  &.active {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-primary);
    text-shadow: 0 0 20px rgba(251, 114, 153, 0.5);
  }
}

.lyrics-empty {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--color-text-muted);
  gap: 12px;

  p {
    font-size: 14px;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>

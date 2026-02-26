<template>
  <q-page class="playlist-page">
    <template v-if="playlist">
      <!-- 歌单头部 -->
      <div class="playlist-header">
        <div class="playlist-cover">
          <img v-if="playlist.cover" :src="playlist.cover" :alt="playlist.name" />
          <div v-else class="cover-placeholder">
            <q-icon name="mdi-music-note" size="48px" color="grey-6" />
          </div>
        </div>
        <div class="playlist-meta">
          <div class="playlist-tag">歌单</div>
          <h1 class="playlist-name">{{ playlist.name }}</h1>
          <div class="playlist-stats">
            {{ playlist.tracks.length }} 首歌曲 · 创建于 {{ formatDate(playlist.createdAt) }}
          </div>
          <div class="playlist-actions">
            <q-btn unelevated color="primary" icon="mdi-play" label="播放全部" rounded @click="playAll" />
            <q-btn flat icon="mdi-shuffle" label="随机播放" rounded color="grey-4" @click="shuffleAll" />
            <q-btn flat round dense icon="mdi-pencil-outline" color="grey-6" @click="renameDialog">
              <q-tooltip>重命名</q-tooltip>
            </q-btn>
            <q-btn flat round dense icon="mdi-delete-outline" color="grey-6" @click="deleteDialog">
              <q-tooltip>删除歌单</q-tooltip>
            </q-btn>
          </div>
        </div>
      </div>

      <!-- 曲目列表 -->
      <div class="track-list-wrap">
        <div v-if="playlist.tracks.length === 0" class="empty-tracks">
          <q-icon name="mdi-music-note-plus" size="56px" color="grey-8" />
          <p>歌单是空的</p>
          <p class="sub">在搜索页面点击 <q-icon name="mdi-playlist-plus" /> 添加歌曲</p>
          <q-btn flat color="primary" label="去搜索" to="/search" />
        </div>

        <div v-else class="track-list">
          <div class="track-list-header">
            <span class="col-index">#</span>
            <span class="col-title">标题</span>
            <span class="col-author">UP主</span>
            <span class="col-action"></span>
          </div>
          <div
            v-for="(track, index) in playlist.tracks"
            :key="track.bvid"
            class="track-row"
            :class="{ playing: playerStore.currentTrack?.bvid === track.bvid }"
            @click="handlePlay(track)"
          >
            <div class="col-index">
              <span v-if="playerStore.currentTrack?.bvid !== track.bvid" class="index-num">{{ index + 1 }}</span>
              <div v-else class="eq-bars">
                <div class="bar" v-for="i in 4" :key="i" />
              </div>
            </div>
            <div class="col-title">
              <img :src="track.cover" class="track-thumb" />
              <span class="track-title-text">{{ track.title }}</span>
            </div>
            <div class="col-author">{{ track.author }}</div>
            <div class="col-action" @click.stop>
              <q-btn flat round dense icon="mdi-delete-outline" color="grey-7" size="xs"
                @click="libraryStore.removeTrackFromPlaylist(playlist!.id, track.bvid)" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="not-found">
      <q-icon name="mdi-playlist-remove" size="64px" color="grey-8" />
      <p>歌单不存在</p>
      <q-btn flat color="primary" label="返回" @click="router.back()" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuasar, Notify } from 'quasar'
import { useLibraryStore } from '../stores/library'
import { usePlayerStore } from '../stores/player'
import { getVideoCid, getAudioUrl } from '../api/bilibili'
import type { Track } from '../stores/player'

const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const libraryStore = useLibraryStore()
const playerStore = usePlayerStore()

const playlist = computed(() =>
  libraryStore.playlists.find((p) => p.id === route.params.id)
)

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN')
}

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

async function playAll() {
  if (!playlist.value?.tracks.length) return
  const first = playlist.value.tracks[0]!
  playlist.value.tracks.forEach((t) => playerStore.addToPlaylist(t))
  await handlePlay(first)
}

async function shuffleAll() {
  if (!playlist.value?.tracks.length) return
  playerStore.togglePlayMode()
  await playAll()
}

function renameDialog() {
  if (!playlist.value) return
  $q.dialog({
    title: '重命名歌单',
    prompt: { model: playlist.value.name, type: 'text' },
    cancel: true, dark: true,
  }).onOk((name: string) => {
    if (name?.trim()) libraryStore.renamePlaylist(playlist.value!.id, name.trim())
  })
}

function deleteDialog() {
  if (!playlist.value) return
  $q.dialog({
    title: '删除歌单',
    message: `确定要删除「${playlist.value.name}」吗？`,
    cancel: true, dark: true,
  }).onOk(() => {
    libraryStore.deletePlaylist(playlist.value!.id)
    router.push('/discover')
  })
}
</script>

<style lang="scss" scoped>
.playlist-page { background: var(--color-bg); min-height: 100vh; }

.playlist-header {
  display: flex;
  gap: 24px;
  padding: 32px 28px 24px;
  background: linear-gradient(to bottom, rgba(251,114,153,0.08), transparent);
  border-bottom: 1px solid var(--color-border);
}

.playlist-cover {
  width: 160px;
  height: 160px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  img { width: 100%; height: 100%; object-fit: cover; }
  .cover-placeholder {
    width: 100%;
    height: 100%;
    background: var(--color-bg-card);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.playlist-meta {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  .playlist-tag { font-size: 12px; color: var(--color-primary); text-transform: uppercase; letter-spacing: 1px; }
  .playlist-name { font-size: 28px; font-weight: 700; color: var(--color-text); margin: 0; }
  .playlist-stats { font-size: 13px; color: var(--color-text-muted); }
  .playlist-actions { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
}

.track-list-wrap { padding: 16px 20px; }

.empty-tracks {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  gap: 10px;
  color: var(--color-text-muted);
  p { margin: 0; font-size: 16px; }
  .sub { font-size: 13px; }
}

.track-list-header {
  display: grid;
  grid-template-columns: 40px 1fr 160px 48px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
}

.track-row {
  display: grid;
  grid-template-columns: 40px 1fr 160px 48px;
  align-items: center;
  padding: 7px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover { background: var(--color-bg-card); .col-action { opacity: 1; } }
  &.playing .track-title-text { color: var(--color-primary); }
}

.col-index {
  font-size: 13px;
  color: var(--color-text-muted);
  .index-num { display: block; text-align: center; }
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

.col-title {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  .track-thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
  .track-title-text { font-size: 14px; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: color 0.2s; }
}

.col-author { font-size: 13px; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-action { opacity: 0; transition: opacity 0.2s; display: flex; justify-content: flex-end; }

.not-found {
  display: flex; flex-direction: column; align-items: center; padding: 80px 0; gap: 12px;
  color: var(--color-text-muted);
  p { font-size: 18px; color: var(--color-text); margin: 0; }
}

@keyframes equalize {
  from { transform: scaleY(0.4); }
  to { transform: scaleY(1); }
}
</style>

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { Howl } from 'howler'

type ElectronAPI = {
  isElectron: boolean
  notifyPlayState: (playing: boolean) => void
  onPlayerControl: (cb: (cmd: string) => void) => void
}
const electronAPI = (window as Window & { electronAPI?: ElectronAPI }).electronAPI

export interface Track {
  id: string
  bvid: string
  cid?: number
  title: string
  author: string
  cover: string
  duration: number
  url?: string
}

export type PlayMode = 'sequence' | 'shuffle' | 'repeat'

const LS_PLAYLIST = 'bili-music:playlist'

function loadPlaylist(): Track[] {
  try { return JSON.parse(localStorage.getItem(LS_PLAYLIST) ?? '[]') } catch { return [] }
}

export const usePlayerStore = defineStore('player', () => {
  const currentTrack = ref<Track | null>(null)
  const playlist = ref<Track[]>(loadPlaylist())
  const currentIndex = ref(-1)
  const isPlaying = ref(false)
  // PlayerBar 监听此值变化来自动加载并播放新曲目
  const autoPlayTrigger = ref(0)
  const progress = ref(0)
  const duration = ref(0)
  const volume = ref(0.8)
  const isMuted = ref(false)
  const playMode = ref<PlayMode>('sequence')
  const isLoading = ref(false)
  const isSeeking = ref(false)
  const showLyrics = ref(false)
  const lyrics = ref<{ time: number; text: string }[]>([])
  const currentLyricIndex = ref(-1)

  let howl: Howl | null = null
  let progressTimer: ReturnType<typeof setInterval> | null = null

  watch(playlist, (val) => {
    localStorage.setItem(LS_PLAYLIST, JSON.stringify(val))
  }, { deep: true })

  // Electron：播放状态变化时通知主进程更新任务栏按钮
  if (electronAPI?.isElectron) {
    watch(isPlaying, (val) => electronAPI.notifyPlayState(val))
    // 监听任务栏按钮的控制指令
    electronAPI.onPlayerControl((cmd) => {
      if (cmd === 'toggle') togglePlay()
      else if (cmd === 'next') playNext()
      else if (cmd === 'prev') playPrev()
    })
  }

  const hasNext = computed(() => {
    if (playMode.value === 'shuffle') return playlist.value.length > 1
    return currentIndex.value < playlist.value.length - 1
  })

  const hasPrev = computed(() => {
    if (playMode.value === 'shuffle') return playlist.value.length > 1
    return currentIndex.value > 0
  })

  function startProgressTimer() {
    if (progressTimer) clearInterval(progressTimer)
    progressTimer = setInterval(() => {
      if (howl && isPlaying.value && !isSeeking.value) {
        const seek = howl.seek() as number
        progress.value = seek
        updateLyricIndex(seek)
      }
    }, 500)
  }

  function updateLyricIndex(currentTime: number) {
    if (!lyrics.value.length) return
    for (let i = lyrics.value.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics.value[i]!.time) {
        currentLyricIndex.value = i
        return
      }
    }
    currentLyricIndex.value = 0
  }

  async function playTrack(track: Track, audioUrl: string) {
    if (howl) {
      howl.stop()
      howl.unload()
    }
    if (progressTimer) clearInterval(progressTimer)

    currentTrack.value = track
    const idx = playlist.value.findIndex((t) => t.bvid === track.bvid)
    if (idx >= 0) currentIndex.value = idx
    isLoading.value = true
    isPlaying.value = false

    howl = new Howl({
      src: [audioUrl],
      html5: true,
      volume: isMuted.value ? 0 : volume.value,
      onload: () => {
        duration.value = howl?.duration() ?? 0
        isLoading.value = false
      },
      onplay: () => {
        isPlaying.value = true
        startProgressTimer()
      },
      onpause: () => {
        isPlaying.value = false
      },
      onstop: () => {
        isPlaying.value = false
        progress.value = 0
      },
      onend: () => {
        isPlaying.value = false
        playNext()
      },
      onloaderror: () => {
        isLoading.value = false
      },
    })

    howl.play()
  }

  function togglePlay() {
    if (!howl) return
    if (isPlaying.value) {
      howl.pause()
    } else {
      howl.play()
    }
  }

  function seekTo(seconds: number) {
    if (!howl) return
    howl.seek(seconds)
    progress.value = seconds
  }

  function setVolume(val: number) {
    volume.value = val
    if (howl && !isMuted.value) {
      howl.volume(val)
    }
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    if (howl) {
      howl.volume(isMuted.value ? 0 : volume.value)
    }
  }

  function playNext() {
    if (!playlist.value.length) return
    if (playMode.value === 'repeat') {
      if (howl) {
        howl.stop()
        howl.seek(0)
        howl.play()
      }
      return
    }
    if (playMode.value === 'shuffle') {
      const len = playlist.value.length
      if (len <= 1) {
        currentIndex.value = 0
      } else {
        let next = currentIndex.value
        while (next === currentIndex.value) {
          next = Math.floor(Math.random() * len)
        }
        currentIndex.value = next
      }
    } else {
      currentIndex.value = currentIndex.value < playlist.value.length - 1
        ? currentIndex.value + 1
        : 0
    }
    autoPlayTrigger.value++
  }

  function playPrev() {
    if (!playlist.value.length) return
    if (playMode.value === 'shuffle') {
      currentIndex.value = Math.floor(Math.random() * playlist.value.length)
    } else {
      currentIndex.value = currentIndex.value > 0
        ? currentIndex.value - 1
        : playlist.value.length - 1
    }
    autoPlayTrigger.value++   // 通知 PlayerBar 加载新曲目
  }

  function togglePlayMode() {
    const modes: PlayMode[] = ['sequence', 'shuffle', 'repeat']
    const currentIdx = modes.indexOf(playMode.value)
    playMode.value = modes[(currentIdx + 1) % modes.length]!
  }

  function addToPlaylist(track: Track) {
    const exists = playlist.value.findIndex((t) => t.bvid === track.bvid)
    if (exists === -1) {
      playlist.value.push(track)
    }
  }

  function setLyrics(lyricsData: { time: number; text: string }[]) {
    lyrics.value = lyricsData
    currentLyricIndex.value = -1
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return {
    currentTrack,
    playlist,
    currentIndex,
    isPlaying,
    autoPlayTrigger,
    progress,
    duration,
    volume,
    isMuted,
    playMode,
    isLoading,
    isSeeking,
    showLyrics,
    lyrics,
    currentLyricIndex,
    hasNext,
    hasPrev,
    playTrack,
    togglePlay,
    seekTo,
    setVolume,
    toggleMute,
    playNext,
    playPrev,
    togglePlayMode,
    addToPlaylist,
    setLyrics,
    formatTime,
  }
})

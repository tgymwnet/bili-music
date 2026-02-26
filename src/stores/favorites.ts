import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Track } from './player'

const LS_KEY = 'bili-music:favorites'

export const useFavoritesStore = defineStore('favorites', () => {
  const list = ref<Track[]>(loadFromStorage())

  function loadFromStorage(): Track[] {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
    } catch {
      return []
    }
  }

  watch(list, (val) => {
    localStorage.setItem(LS_KEY, JSON.stringify(val))
  }, { deep: true })

  function isFavorited(bvid: string): boolean {
    return list.value.some((t) => t.bvid === bvid)
  }

  function toggle(track: Track): boolean {
    const idx = list.value.findIndex((t) => t.bvid === track.bvid)
    if (idx >= 0) {
      list.value.splice(idx, 1)
      return false
    } else {
      list.value.unshift(track)
      return true
    }
  }

  function remove(bvid: string) {
    const idx = list.value.findIndex((t) => t.bvid === bvid)
    if (idx >= 0) list.value.splice(idx, 1)
  }

  function clear() {
    list.value = []
  }

  return { list, isFavorited, toggle, remove, clear }
})

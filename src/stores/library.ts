import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { Track } from './player'

const LS_KEY = 'bili-music:library'

export interface Playlist {
  id: string
  name: string
  cover: string
  tracks: Track[]
  createdAt: number
}

export const useLibraryStore = defineStore('library', () => {
  const playlists = ref<Playlist[]>(loadFromStorage())

  function loadFromStorage(): Playlist[] {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]')
    } catch {
      return []
    }
  }

  watch(playlists, (val) => {
    localStorage.setItem(LS_KEY, JSON.stringify(val))
  }, { deep: true })

  function createPlaylist(name: string): Playlist {
    const pl: Playlist = {
      id: Date.now().toString(),
      name,
      cover: '',
      tracks: [],
      createdAt: Date.now(),
    }
    playlists.value.unshift(pl)
    return pl
  }

  function deletePlaylist(id: string) {
    const idx = playlists.value.findIndex((p) => p.id === id)
    if (idx >= 0) playlists.value.splice(idx, 1)
  }

  function addTrackToPlaylist(playlistId: string, track: Track) {
    const pl = playlists.value.find((p) => p.id === playlistId)
    if (!pl) return
    if (!pl.tracks.some((t) => t.bvid === track.bvid)) {
      pl.tracks.push(track)
      if (!pl.cover && track.cover) pl.cover = track.cover
    }
  }

  function removeTrackFromPlaylist(playlistId: string, bvid: string) {
    const pl = playlists.value.find((p) => p.id === playlistId)
    if (!pl) return
    const idx = pl.tracks.findIndex((t) => t.bvid === bvid)
    if (idx >= 0) pl.tracks.splice(idx, 1)
  }

  function renamePlaylist(id: string, name: string) {
    const pl = playlists.value.find((p) => p.id === id)
    if (pl) pl.name = name
  }

  return {
    playlists,
    createPlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
    renamePlaylist,
  }
})

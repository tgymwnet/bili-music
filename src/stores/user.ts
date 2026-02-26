import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserInfo {
  mid: number
  name: string
  face: string
  isLogin: boolean
}

const LS_KEY = 'bilimusic_user'

function loadSaved(): UserInfo | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as UserInfo) : null
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', () => {
  const saved = loadSaved()
  const userInfo = ref<UserInfo | null>(saved)
  const isLoggedIn = ref(!!saved)
  const qrCodeUrl = ref('')
  const qrCodeKey = ref('')

  function setUser(info: UserInfo) {
    userInfo.value = info
    isLoggedIn.value = true
    localStorage.setItem(LS_KEY, JSON.stringify(info))
  }

  function logout() {
    userInfo.value = null
    isLoggedIn.value = false
    localStorage.removeItem(LS_KEY)
  }

  return {
    userInfo,
    isLoggedIn,
    qrCodeUrl,
    qrCodeKey,
    setUser,
    logout,
  }
})

import axios from 'axios'
import { signParams, clearWbiCache } from '../utils/wbi'

const isElectron = typeof window !== 'undefined' &&
  !!(window as Window & { electronAPI?: { isElectron: boolean } }).electronAPI?.isElectron

// Electron：走本地代理（Node.js Cookie Jar，彻底解决 412 风控）
// Web：走 Vite dev server 代理
const PROXY_BASE = 'http://127.0.0.1:25588'
const BASE = isElectron ? `${PROXY_BASE}/bili-api` : '/bili-api'
const PASSPORT_BASE = isElectron ? `${PROXY_BASE}/bili-passport` : '/bili-passport'

const http = axios.create({ timeout: 8000 })   // 8 秒超时，快速失败

// ─── buvid 初始化 ─────────────────────────────────────────────────────────────
let buvidInited = false
let buvidPending: Promise<void> | null = null   // 防止并发重复初始化

export function initBuvid(force = false): Promise<void> {
  if (buvidInited && !force) return Promise.resolve()
  if (buvidPending && !force) return buvidPending
  buvidPending = (async () => {
    try {
      // 代理服务器自动保存 Set-Cookie；3 秒内没响应就放弃（不阻塞后续请求）
      await Promise.race([
        http.get(`${BASE}/x/frontend/finger/spi`),
        new Promise((_, rej) => setTimeout(() => rej(new Error('buvid timeout')), 3000)),
      ])
      buvidInited = true
    } catch (e) {
      console.warn('[buvid] init failed:', e instanceof Error ? e.message : e)
    } finally {
      buvidPending = null
    }
  })()
  return buvidPending
}

// ─── 412 自动重试（代理 Cookie Jar 刷新后重试）────────────────────────────────
let _retrying = false
http.interceptors.response.use(
  (r) => r,
  async (error) => {
    if (error.response?.status === 412 && !_retrying) {
      _retrying = true
      buvidInited = false
      clearWbiCache()
      await new Promise((r) => setTimeout(r, 1000))
      try { await initBuvid(true) } finally { _retrying = false }
      return Promise.reject(new Error('412_RETRY'))
    }
    return Promise.reject(error)
  },
)

// ─── 搜索 ───────────────────────────────────────────────────────────────────

export interface SearchResult {
  bvid: string
  title: string
  author: string
  authorFace: string
  cover: string
  duration: string
  play: number
  pubdate: string
  description: string
}

async function _doSearch(keyword: string, page: number): Promise<SearchResult[]> {
  const qs = await signParams({
    search_type: 'video',
    keyword,
    page,
    page_size: 20,
    order: 'default',
  })
  const res = await http.get(`${BASE}/x/web-interface/search/type?${qs}`)
  const list = res.data?.data?.result ?? []
  return list.map((item: Record<string, unknown>) => ({
    bvid: item.bvid as string,
    title: String(item.title ?? '').replace(/<[^>]+>/g, ''),
    author: item.author as string,
    authorFace: String(item.upic ?? '').replace('http://', 'https://'),
    cover: 'https:' + String(item.pic ?? ''),
    duration: formatDuration(item.duration as string),
    play: item.play as number,
    pubdate: formatDate(item.pubdate as number),
    description: item.description as string,
  }))
}

export async function searchVideos(keyword: string, page = 1): Promise<SearchResult[]> {
  await initBuvid()
  try {
    return await _doSearch(keyword, page)
  } catch (e: unknown) {
    // 412 被拦截器处理后抛出 412_RETRY，重新签名再试一次
    const msg = e instanceof Error ? e.message : ''
    if (msg === '412_RETRY') {
      await new Promise((r) => setTimeout(r, 500))
      return await _doSearch(keyword, page)
    }
    throw e
  }
}

function formatDuration(raw: string): string {
  if (!raw) return '0:00'
  if (raw.includes(':')) return raw
  const sec = parseInt(raw)
  return `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`
}

function formatDate(ts: number): string {
  if (!ts) return ''
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

// ─── 获取 CID ────────────────────────────────────────────────────────────────

export async function getVideoCid(bvid: string): Promise<number> {
  const res = await http.get(`${BASE}/x/web-interface/view?bvid=${bvid}`)
  return res.data?.data?.cid as number
}

// ─── 音乐分区排行榜（无需 WBI 签名，比 search 快很多）────────────────────────

// B站分区 ID：3=音乐，193=翻唱，29=音乐综合，130=说唱，28=电音
export async function getMusicRanking(rid = 3, limit = 10): Promise<SearchResult[]> {
  await initBuvid()
  const res = await http.get(`${BASE}/x/web-interface/ranking/v2?rid=${rid}&type=all`)
  const list: Record<string, unknown>[] = res.data?.data?.list ?? []
  return list.slice(0, limit).map((item) => ({
    bvid: item.bvid as string,
    title: String(item.title ?? ''),
    author: (item.owner as Record<string, unknown>)?.name as string ?? '',
    authorFace: String((item.owner as Record<string, unknown>)?.face ?? '').replace('http://', 'https://'),
    cover: String(item.pic ?? '').replace('http://', 'https://'),
    duration: formatDuration2(item.duration as number),
    play: (item.stat as Record<string, unknown>)?.view as number ?? 0,
    pubdate: formatDate(item.pubdate as number),
    description: item.desc as string ?? '',
  }))
}

// 音乐分区最新投稿
export async function getMusicNewList(rid = 3, limit = 10): Promise<SearchResult[]> {
  await initBuvid()
  const res = await http.get(`${BASE}/x/web-interface/newlist?rid=${rid}&pn=1&ps=${limit}&type=0`)
  const list: Record<string, unknown>[] = res.data?.data?.archives ?? []
  return list.map((item) => ({
    bvid: item.bvid as string,
    title: String(item.title ?? ''),
    author: (item.owner as Record<string, unknown>)?.name as string ?? '',
    authorFace: String((item.owner as Record<string, unknown>)?.face ?? '').replace('http://', 'https://'),
    cover: String(item.pic ?? '').replace('http://', 'https://'),
    duration: formatDuration2(item.duration as number),
    play: (item.stat as Record<string, unknown>)?.view as number ?? 0,
    pubdate: formatDate(item.pubdate as number),
    description: item.desc as string ?? '',
  }))
}

function formatDuration2(seconds: number): string {
  if (!seconds) return '0:00'
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`
}

// ─── 获取音频流 URL ───────────────────────────────────────────────────────────

export async function getAudioUrl(bvid: string, cid: number): Promise<string> {
  // 优先用 HTML5 兼容格式（platform=html5），浏览器直接可播放
  const res = await http.get(
    `${BASE}/x/player/playurl?bvid=${bvid}&cid=${cid}&fnval=0&qn=64&platform=html5&high_quality=1`,
  )
  const durl = res.data?.data?.durl
  if (durl?.length) {
    // 确保使用 HTTPS
    return String(durl[0].url).replace('http://', 'https://')
  }
  // 回退到 DASH 格式
  const res2 = await http.get(
    `${BASE}/x/player/playurl?bvid=${bvid}&cid=${cid}&fnval=16&qn=64`,
  )
  const dash = res2.data?.data?.dash
  if (dash?.audio?.length) {
    const audios: { id: number; baseUrl: string; backupUrl: string[] }[] = dash.audio
    audios.sort((a, b) => b.id - a.id)
    const url = audios[0]!.baseUrl || audios[0]!.backupUrl?.[0]
    if (url) return String(url).replace('http://', 'https://')
  }
  const code = res.data?.code
  const msg = res.data?.message
  throw new Error(`获取音频失败(${code}): ${msg ?? '未知错误'}`)
}

// ─── 登录二维码 ───────────────────────────────────────────────────────────────

export interface QRCodeData {
  url: string
  qrcodeKey: string
}

export async function generateQRCode(): Promise<QRCodeData> {
  const res = await http.get(`${PASSPORT_BASE}/x/passport-login/web/qrcode/generate`)
  return {
    url: res.data.data.url as string,
    qrcodeKey: res.data.data.qrcode_key as string,
  }
}

export type QRStatus = 'waiting' | 'scanned' | 'success' | 'expired'

export interface QRPollResult {
  status: QRStatus
  name?: string
  face?: string
  mid?: number
}

export async function pollQRCode(qrcodeKey: string): Promise<QRPollResult> {
  const res = await http.get(`${PASSPORT_BASE}/x/passport-login/web/qrcode/poll?qrcode_key=${qrcodeKey}`)
  const code = res.data?.data?.code as number
  if (code === 0) {
    const nav = await http.get(`${BASE}/x/web-interface/nav`)
    const u = nav.data?.data
    return { status: 'success', name: u?.uname, face: u?.face, mid: u?.mid }
  }
  if (code === 86090) return { status: 'scanned' }
  if (code === 86038) return { status: 'expired' }
  return { status: 'waiting' }
}

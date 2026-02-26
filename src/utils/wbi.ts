import { md5 } from './md5'
import axios from 'axios'

const MIXIN_KEY_ENC_TAB = [
  46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,
  14,39,12,38,41,13,37,48,7,16,24,55,40,61,26,17,0,1,60,51,30,4,22,25,54,21,
  56,59,6,63,57,62,11,36,20,34,44,52,
]

let cachedMixinKey = ''
let cacheExpiry = 0

export function clearWbiCache() {
  cachedMixinKey = ''
  cacheExpiry = 0
}

function getMixinKey(imgKey: string, subKey: string): string {
  const raw = imgKey + subKey
  return MIXIN_KEY_ENC_TAB.map((i) => raw[i]).join('').slice(0, 32)
}

const isElectron = typeof window !== 'undefined' && !!(window as Window & { electronAPI?: { isElectron: boolean } }).electronAPI?.isElectron
// Electron 走本地代理，保持和 bilibili.ts 一致
const NAV_URL = isElectron
  ? 'http://127.0.0.1:25588/bili-api/x/web-interface/nav'
  : '/bili-api/x/web-interface/nav'

async function fetchMixinKey(): Promise<string> {
  if (cachedMixinKey && Date.now() < cacheExpiry) return cachedMixinKey
  const res = await axios.get(NAV_URL, {
    headers: { Referer: 'https://www.bilibili.com' },
  })
  const { img_url, sub_url } = res.data?.data?.wbi_img ?? {}
  if (!img_url || !sub_url) throw new Error('获取 WBI key 失败')
  const imgKey = (img_url as string).split('/').pop()!.replace('.png', '')
  const subKey = (sub_url as string).split('/').pop()!.replace('.png', '')
  cachedMixinKey = getMixinKey(imgKey, subKey)
  cacheExpiry = Date.now() + 10 * 60 * 1000 // 缓存 10 分钟
  return cachedMixinKey
}

export async function signParams(params: Record<string, string | number>): Promise<string> {
  const mixinKey = await fetchMixinKey()
  const wts = Math.floor(Date.now() / 1000)
  const query = { ...params, wts }
  const sorted = Object.keys(query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(query[k]))}`)
    .join('&')
  const wRid = md5(sorted + mixinKey)
  return `${sorted}&w_rid=${wRid}`
}

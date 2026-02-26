/**
 * 生成 BiliMusic 应用图标
 *   electron/icon.png  → 256×256 PNG（Electron 窗口/托盘用）
 *   build/icon.ico     → 多尺寸 ICO（Windows 打包用，含 16/32/48/256）
 */
const fs   = require('fs')
const zlib = require('zlib')
const path = require('path')

// ─── PNG 编码 ────────────────────────────────────────────────────────────────
function u32be(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b }
function u32le(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }
function u16le(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b }

function crc32(buf) {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let v = i
    for (let j = 0; j < 8; j++) v = (v & 1) ? 0xEDB88320 ^ (v >>> 1) : (v >>> 1)
    t[i] = v
  }
  let c = 0xFFFFFFFF
  for (const byte of buf) c = t[(c ^ byte) & 0xFF] ^ (c >>> 8)
  return (c ^ 0xFFFFFFFF) >>> 0
}
function pngChunk(type, data) {
  const t = Buffer.from(type), d = Buffer.isBuffer(data) ? data : Buffer.from(data)
  return Buffer.concat([u32be(d.length), t, d, u32be(crc32(Buffer.concat([t, d])))])
}
function encodePNG(pixels, size) {
  const rows = []
  for (let y = 0; y < size; y++) {
    rows.push(0)
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      rows.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3])
    }
  }
  const ihdr = Buffer.concat([u32be(size), u32be(size), Buffer.from([8, 6, 0, 0, 0])])
  const sig  = Buffer.from([137,80,78,71,13,10,26,10])
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(Buffer.from(rows))), pngChunk('IEND', Buffer.alloc(0))])
}

// ─── 绘制图标像素 ─────────────────────────────────────────────────────────────
function drawIcon(size) {
  const pixels = new Uint8Array(size * size * 4)
  const set = (x, y, r, g, b, a) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const i = (y * size + x) * 4; pixels[i]=r; pixels[i+1]=g; pixels[i+2]=b; pixels[i+3]=a
  }
  const CX = size / 2, CY = size / 2
  const corner = size * 0.22

  // 圆角矩形背景（渐变粉色）
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = Math.max(0, Math.abs(x - CX) - (size/2 - corner - size*0.016))
      const dy = Math.max(0, Math.abs(y - CY) - (size/2 - corner - size*0.016))
      if (dx*dx + dy*dy > corner*corner) { set(x,y,0,0,0,0); continue }
      const t = (x + y) / (size * 2)
      set(x, y, Math.round(0xff*(1-t)+0xe8*t), Math.round(0x8f*(1-t)+0x43*t), Math.round(0xb5*(1-t)+0x93*t), 255)
    }
  }

  // 音符（按比例缩放到 size）
  const s = size / 256
  const W = 255, A = 255

  function fillRect(x1,y1,x2,y2) {
    for (let y=Math.round(y1*s);y<=Math.round(y2*s);y++)
      for (let x=Math.round(x1*s);x<=Math.round(x2*s);x++) set(x,y,W,W,W,A)
  }
  function fillEllipse(cx,cy,rx,ry) {
    cx*=s; cy*=s; rx*=s; ry*=s
    for (let dy=-ry;dy<=ry;dy++) for (let dx=-rx;dx<=rx;dx++)
      if ((dx/rx)**2+(dy/ry)**2<=1) set(Math.round(cx+dx),Math.round(cy+dy),W,W,W,A)
  }

  fillRect(90,88,102,162)         // 左竖线
  fillEllipse(86,166,20,13)       // 左音符头
  fillRect(90,88,160,100)         // 顶部横线
  fillRect(148,88,160,150)        // 右竖线
  fillEllipse(144,154,20,13)      // 右音符头

  return pixels
}

// ─── 生成 PNG ────────────────────────────────────────────────────────────────
const pngPath = path.join(__dirname, 'icon.png')
const px256 = drawIcon(256)
fs.writeFileSync(pngPath, encodePNG(px256, 256))
console.log('✓ icon.png:', pngPath)

// ─── 生成 ICO (16/32/48/256) ─────────────────────────────────────────────────
// ICO 格式: ICONDIR + ICONDIRENTRY[] + PNG/BMP data[]
// 使用 PNG 嵌入（Vista+ 支持）
const sizes = [16, 32, 48, 256]
const pngBuffers = sizes.map(sz => encodePNG(drawIcon(sz), sz))

// ICONDIR header (6 bytes)
const icondir = Buffer.concat([
  u16le(0),           // reserved
  u16le(1),           // type = ICO
  u16le(sizes.length) // count
])

// ICONDIRENTRY: 16 bytes each
// data offset starts after all headers
const headerSize = 6 + 16 * sizes.length
let offset = headerSize
const entries = pngBuffers.map((buf, i) => {
  const sz = sizes[i]
  const entry = Buffer.concat([
    Buffer.from([sz === 256 ? 0 : sz, sz === 256 ? 0 : sz, 0, 0]), // w, h, colorCount, reserved
    u16le(1),        // planes
    u16le(32),       // bitCount
    u32le(buf.length),
    u32le(offset),
  ])
  offset += buf.length
  return entry
})

const buildDir = path.join(__dirname, '..', 'build')
if (!fs.existsSync(buildDir)) fs.mkdirSync(buildDir, { recursive: true })
const icoPath = path.join(buildDir, 'icon.ico')

fs.writeFileSync(icoPath, Buffer.concat([icondir, ...entries, ...pngBuffers]))
console.log('✓ icon.ico:', icoPath)

// 同时把 png 复制一份到 build/
const buildPngPath = path.join(buildDir, 'icon.png')
fs.copyFileSync(pngPath, buildPngPath)
console.log('✓ build/icon.png:', buildPngPath)

const { app, BrowserWindow, dialog, net, session, shell, ipcMain, nativeImage, nativeTheme, Tray, Menu, protocol } = require('electron')
const path = require('path')
const zlib = require('zlib')
const http = require('http')
const https = require('https')
const fs = require('fs')
const { pathToFileURL } = require('url')

const isDev = !app.isPackaged
const DEV_PORT = process.env.VITE_DEV_PORT || '9000'
const DEV_URL = `http://localhost:${DEV_PORT}`
const PROXY_PORT = 25588   // 本地代理端口，渲染进程通过此端口请求 B 站

// ─── 本地代理服务器（带 Cookie Jar）─────────────────────────────────────────
// 原理：Node.js 层面管理 cookie，完全绕过 Chromium 的 SameSite 限制
// 这是解决 B 站 412 问题的根本方案

const cookieJar = {}   // { 'api.bilibili.com': { name: value, ... } }

function parseCookieHeader(setCookieArray) {
  const result = {}
  for (const line of setCookieArray || []) {
    const [kv] = line.split(';')
    if (!kv) continue
    const eq = kv.indexOf('=')
    if (eq > 0) result[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim()
  }
  return result
}

function mergeCookies(domain, incoming) {
  if (!cookieJar[domain]) cookieJar[domain] = {}
  Object.assign(cookieJar[domain], incoming)
  // 同步到其他 bilibili.com 子域
  const siblings = ['api.bilibili.com', 'www.bilibili.com', 'passport.bilibili.com']
  for (const s of siblings) {
    if (s !== domain) {
      if (!cookieJar[s]) cookieJar[s] = {}
      Object.assign(cookieJar[s], incoming)
    }
  }
}

function getCookieStr(domain) {
  const jar = cookieJar[domain] || {}
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ')
}

function startProxy() {
  return new Promise((resolve) => {   // 返回 Promise，等服务真正监听后再继续
  const server = http.createServer((req, res) => {
    // 路由：/bili-api/* → api.bilibili.com，/bili-passport/* → passport.bilibili.com
    let targetHost, targetPath
    if (req.url.startsWith('/bili-passport')) {
      targetHost = 'passport.bilibili.com'
      targetPath = req.url.slice('/bili-passport'.length) || '/'
    } else {
      targetHost = 'api.bilibili.com'
      targetPath = req.url.startsWith('/bili-api')
        ? req.url.slice('/bili-api'.length) || '/'
        : req.url
    }

    const cookieStr = getCookieStr(targetHost)
    const reqHeaders = {
      host: targetHost,
      referer: 'https://www.bilibili.com',
      origin: 'https://www.bilibili.com',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      accept: 'application/json, text/plain, */*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'accept-encoding': 'gzip, deflate, br',   // 让服务端正常压缩
    }
    if (cookieStr) reqHeaders.cookie = cookieStr

    // 透传部分请求头（如 Content-Type）
    if (req.headers['content-type']) reqHeaders['content-type'] = req.headers['content-type']

    const options = { hostname: targetHost, path: targetPath, method: req.method, headers: reqHeaders }

    const proxyReq = https.request(options, (proxyRes) => {
      // 保存 Set-Cookie 到 jar
      const incoming = parseCookieHeader(proxyRes.headers['set-cookie'])
      if (Object.keys(incoming).length) mergeCookies(targetHost, incoming)

      // 重写响应头，允许跨域
      const resHeaders = {}
      for (const [k, v] of Object.entries(proxyRes.headers)) {
        if (k.toLowerCase() === 'set-cookie') continue
        resHeaders[k] = v
      }
      resHeaders['access-control-allow-origin'] = '*'
      resHeaders['access-control-allow-credentials'] = 'true'

      const encoding = (proxyRes.headers['content-encoding'] || '').toLowerCase()
      delete resHeaders['content-encoding']

      if (!res.headersSent) res.writeHead(proxyRes.statusCode, resHeaders)

      function safePipe(src, dest) {
        src.on('error', (e) => {
          console.error('[proxy] pipe error:', e.message)
          if (!res.writableEnded) res.end()
        })
        src.pipe(dest)
      }

      if (encoding === 'gzip') {
        const gz = zlib.createGunzip()
        gz.on('error', (e) => { console.error('[proxy] gunzip error:', e.message); if (!res.writableEnded) res.end() })
        safePipe(proxyRes, gz); gz.pipe(res)
      } else if (encoding === 'br') {
        const br = zlib.createBrotliDecompress()
        br.on('error', (e) => { console.error('[proxy] br error:', e.message); if (!res.writableEnded) res.end() })
        safePipe(proxyRes, br); br.pipe(res)
      } else if (encoding === 'deflate') {
        const df = zlib.createInflate()
        df.on('error', (e) => { console.error('[proxy] deflate error:', e.message); if (!res.writableEnded) res.end() })
        safePipe(proxyRes, df); df.pipe(res)
      } else {
        safePipe(proxyRes, res)
      }
    })

    // 出站请求超时：8 秒无响应则中断
    proxyReq.setTimeout(8000, () => {
      console.error('[proxy] upstream timeout:', targetHost, targetPath)
      proxyReq.destroy(new Error('upstream timeout'))
    })

    proxyReq.on('error', (err) => {
      console.error('[proxy] request error:', err.message)
      if (!res.headersSent) res.writeHead(502)
      if (!res.writableEnded) res.end(JSON.stringify({ code: -1, message: err.message }))
    })

    req.on('error', () => { proxyReq.destroy() })
    req.pipe(proxyReq)
  })

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[proxy] 端口 ${PROXY_PORT} 已被占用，跳过启动（可能已有实例运行）`)
        resolve(null)   // 不阻塞，假设已有代理在运行
      } else {
        console.error('[proxy] 启动失败:', err.message)
        resolve(null)   // 同样不阻塞窗口创建
      }
    })

    server.listen(PROXY_PORT, '127.0.0.1', () => {
      console.log(`[proxy] 本地 B站代理已启动：http://127.0.0.1:${PROXY_PORT}`)
      resolve(server)
    })
  }) // end new Promise
}

// ─── 生成图标 PNG ─────────────────────────────────────────────────────────────
function u32(n) { const b = Buffer.allocUnsafe(4); b.writeUInt32BE(n, 0); return b }
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) { c ^= byte; for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0) }
  return (c ^ 0xffffffff) >>> 0
}
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  return Buffer.concat([u32(data.length), t, data, u32(crc32(Buffer.concat([t, data])))])
}
function makePNG(w, h, getPixel) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = pngChunk('IHDR', Buffer.concat([u32(w), u32(h), Buffer.from([8,6,0,0,0])]))
  const rows = []
  for (let y = 0; y < h; y++) {
    rows.push(0)
    for (let x = 0; x < w; x++) { const [r,g,b,a] = getPixel(x,y); rows.push(r,g,b,a) }
  }
  return Buffer.concat([sig, ihdr, pngChunk('IDAT', zlib.deflateSync(Buffer.from(rows))), pngChunk('IEND', Buffer.alloc(0))])
}
function inTri(px, py, ax, ay, bx, by, cx, cy) {
  const d1=(px-bx)*(ay-by)-(ax-bx)*(py-by), d2=(px-cx)*(by-cy)-(bx-cx)*(py-cy), d3=(px-ax)*(cy-ay)-(cx-ax)*(py-ay)
  return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0))
}

const SZ = 24, W = 255, T = 0
const prevIcon  = nativeImage.createFromBuffer(makePNG(SZ,SZ,(x,y)=>x>=2&&x<=5&&y>=3&&y<=SZ-4?[W,W,W,W]:inTri(x,y,SZ-3,3,SZ-3,SZ-4,6,SZ/2)?[W,W,W,W]:[0,0,0,T]))
const playIcon  = nativeImage.createFromBuffer(makePNG(SZ,SZ,(x,y)=>inTri(x,y,4,2,4,SZ-3,SZ-3,SZ/2)?[W,W,W,W]:[0,0,0,T]))
const pauseIcon = nativeImage.createFromBuffer(makePNG(SZ,SZ,(x,y)=>y>=3&&y<=SZ-4&&((x>=3&&x<=8)||(x>=13&&x<=18))?[W,W,W,W]:[0,0,0,T]))
const nextIcon  = nativeImage.createFromBuffer(makePNG(SZ,SZ,(x,y)=>inTri(x,y,3,3,3,SZ-4,SZ-6,SZ/2)?[W,W,W,W]:x>=SZ-5&&x<=SZ-2&&y>=3&&y<=SZ-4?[W,W,W,W]:[0,0,0,T]))

// ─── 任务栏缩略图 & 托盘 ──────────────────────────────────────────────────────
function setThumbbar(win, playing) {
  if (process.platform !== 'win32') return
  win.setThumbarButtons([
    { tooltip: '上一曲', icon: prevIcon, click() { win.webContents.send('player-control', 'prev') } },
    { tooltip: playing ? '暂停' : '播放', icon: playing ? pauseIcon : playIcon, click() { win.webContents.send('player-control', 'toggle') } },
    { tooltip: '下一曲', icon: nextIcon, click() { win.webContents.send('player-control', 'next') } },
  ])
}

let tray = null, isPlaying = false

function buildTrayMenu(win) {
  return Menu.buildFromTemplate([
    { label: isPlaying ? '⏸  暂停' : '▶  播放', click() { win.webContents.send('player-control', 'toggle') } },
    { label: '⏮  上一曲', click() { win.webContents.send('player-control', 'prev') } },
    { label: '⏭  下一曲', click() { win.webContents.send('player-control', 'next') } },
    { type: 'separator' },
    { label: win.isVisible() ? '隐藏界面' : '显示界面', click() { win.isVisible() ? win.hide() : (win.show(), win.focus()); tray.setContextMenu(buildTrayMenu(win)) } },
    { type: 'separator' },
    { label: '退出程序', click() { app.isQuiting = true; app.quit() } },
  ])
}

function createTray(win) {
  const iconPath = path.join(__dirname, 'icon.png')
  tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }))
  tray.setToolTip('BiliMusic')
  tray.setContextMenu(buildTrayMenu(win))
  tray.on('click', () => { win.isVisible() ? win.hide() : (win.show(), win.focus()); tray.setContextMenu(buildTrayMenu(win)) })
}

// ─── 主窗口 ────────────────────────────────────────────────────────────────────
function createWindow() {
  const appIcon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'))

  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 960, minHeight: 640,
    backgroundColor: '#0a0a0a', title: 'BiliMusic', icon: appIcon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
    show: false,
  })

  win.once('ready-to-show', () => { win.show(); setThumbbar(win, false) })

  win.on('close', (e) => {
    if (app.isQuiting) return
    e.preventDefault()
    dialog.showMessageBox(win, {
      type: 'question',
      buttons: ['最小化到托盘', '退出程序'],
      defaultId: 0,
      cancelId: 0,
      title: 'BiliMusic',
      message: '你想要关闭窗口还是退出程序？',
      detail: '选择"最小化到托盘"将在后台继续播放音乐。',
    }).then(({ response }) => {
      if (response === 1) {
        app.isQuiting = true
        app.quit()
      } else {
        win.hide()
        if (tray) tray.setContextMenu(buildTrayMenu(win))
      }
    })
  })

  ipcMain.on('play-state-changed', (_, playing) => {
    isPlaying = playing; setThumbbar(win, playing); tray.setContextMenu(buildTrayMenu(win))
  })

  ipcMain.handle('open-external', (_, url) => shell.openExternal(url))
  ipcMain.handle('get-proxy-port', () => PROXY_PORT)

  if (isDev) {
    win.loadURL(DEV_URL)
  } else {
    // extraResources 把 dist/ 复制到：resources/dist/index.html
    const distIndex = path.join(process.resourcesPath, 'dist', 'index.html')
    console.log('[main] 加载生产页面:', distIndex, '| 存在:', fs.existsSync(distIndex))
    win.loadFile(distIndex).catch(err => {
      console.error('[main] loadFile 失败:', err.message)
    })
  }

  // 调试：页面加载失败时显示错误页，方便直接看到原因
  win.webContents.on('did-fail-load', (_e, code, desc, url) => {
    console.error(`[main] 页面加载失败 code=${code} desc=${desc} url=${url}`)
    if (!isDev) {
      win.loadURL(
        `data:text/html;charset=utf-8,` +
        `<body style="background:%230a0a0a;color:%23fb7299;font:16px sans-serif;padding:40px">` +
        `<h2>BiliMusic 加载失败</h2>` +
        `<p>错误码: ${code}</p>` +
        `<p>描述: ${desc}</p>` +
        `<p>URL: ${url}</p>` +
        `</body>`
      )
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
  return win
}

if (process.platform === 'win32') app.setAppUserModelId('com.bilimusic.app')

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'
  await startProxy()
  const win = createWindow()
  createTray(win)
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform === 'darwin') app.quit() })

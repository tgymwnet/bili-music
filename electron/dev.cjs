/**
 * 开发模式启动脚本
 * 自动启动 Vite dev server，解析出实际端口后打开 Electron 窗口
 */
const { spawn } = require('child_process')
const http = require('http')

const PREFERRED_PORT = 9000
const MAX_WAIT_MS = 40000
const CHECK_INTERVAL = 500

console.log('[dev] 正在启动 Vite dev server...')

let actualPort = PREFERRED_PORT  // 从 Vite stdout 解析到的真实端口

// 启动 Vite，pipe stdout 以便解析端口
const vite = spawn('npx', ['vite', '--port', String(PREFERRED_PORT)], {
  stdio: ['inherit', 'pipe', 'inherit'],
  shell: true,
  cwd: process.cwd(),
})

vite.stdout.on('data', (chunk) => {
  const text = chunk.toString()
  process.stdout.write(text)  // 透传给终端

  // 解析 Vite 输出的 "Local: http://localhost:XXXX/"
  const m = text.match(/Local:\s+http:\/\/localhost:(\d+)/)
  if (m) {
    const parsed = parseInt(m[1], 10)
    if (parsed && parsed !== actualPort) {
      actualPort = parsed
      console.log(`[dev] Vite 使用端口 ${actualPort}`)
    }
  }
})

vite.on('error', (err) => {
  console.error('[dev] Vite 启动失败:', err)
  process.exit(1)
})

// 等待 Vite 服务就绪（轮询 actualPort）
function waitForVite(elapsed) {
  if (elapsed >= MAX_WAIT_MS) {
    console.error('[dev] 等待 Vite 超时')
    vite.kill()
    process.exit(1)
  }

  http.get(`http://localhost:${actualPort}`, () => {
    console.log(`[dev] Vite 已就绪（http://localhost:${actualPort}），正在启动 Electron...`)
    launchElectron()
  }).on('error', () => {
    setTimeout(() => waitForVite(elapsed + CHECK_INTERVAL), CHECK_INTERVAL)
  })
}

function launchElectron() {
  const electron = spawn(
    'npx',
    ['electron', 'electron/main.cjs'],
    {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      env: { ...process.env, VITE_DEV_PORT: String(actualPort) },
    },
  )

  electron.on('error', (err) => {
    console.error('[dev] Electron 启动失败:', err)
    vite.kill()
    process.exit(1)
  })

  electron.on('close', (code) => {
    console.log('[dev] Electron 已关闭，退出开发模式')
    vite.kill()
    process.exit(code || 0)
  })
}

// 1 秒后开始检测
setTimeout(() => waitForVite(0), 1000)

process.on('SIGINT', () => { vite.kill(); process.exit(0) })

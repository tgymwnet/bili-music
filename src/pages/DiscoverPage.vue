<template>
  <q-page class="about-page">
    <div class="about-container">

      <!-- Logo 区域 -->
      <div class="app-logo-wrap">
        <div class="app-logo">
          <q-icon name="mdi-music-circle" size="72px" color="primary" />
        </div>
        <h1 class="app-name">BiliMusic</h1>
        <div class="app-version">版本 1.0.0</div>
      </div>

      <!-- 简介 -->
      <div class="about-card">
        <p class="about-desc">
          一款基于 B 站的桌面音乐播放器，支持搜索、播放 B 站音乐视频，
          本地收藏歌曲与自定义歌单，数据全部保存在本地。
        </p>
      </div>

      <!-- 技术栈 -->
      <div class="section-title">技术栈</div>
      <div class="tech-grid">
        <div v-for="tech in techs" :key="tech.name" class="tech-item">
          <q-icon :name="tech.icon" :color="tech.color" size="24px" />
          <span>{{ tech.name }}</span>
        </div>
      </div>

      <!-- 功能列表 -->
      <div class="section-title">功能特性</div>
      <div class="feature-list">
        <div v-for="f in features" :key="f" class="feature-item">
          <q-icon name="mdi-check-circle" color="primary" size="16px" />
          <span>{{ f }}</span>
        </div>
      </div>

      <!-- 版权信息 -->
      <div class="copyright-card">
        <div class="copyright-row">
          <q-icon name="mdi-code-tags" size="18px" color="primary" />
          <span>由 <strong>TG源码网</strong> 原创开发</span>
        </div>
        <div class="copyright-row">
          <q-icon name="mdi-web" size="18px" color="secondary" />
          <span>官网：</span>
          <a class="site-link" href="#" @click.prevent="openUrl('https://tgymw.net')">https://tgymw.net</a>
          <q-btn flat dense round icon="mdi-content-copy" size="xs" color="grey-5" @click="copyUrl">
            <q-tooltip>复制链接</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- 免责声明 -->
      <div class="disclaimer">
        <q-icon name="mdi-alert-circle-outline" size="16px" color="grey-6" />
        <div>
          <p>本项目为非官方项目，与哔哩哔哩无任何官方关联或背书。</p>
          <p>仅供学习交流，所有音频内容版权归 B 站及其创作者所有，请勿用于商业用途。</p>
        </div>
      </div>

    </div>
  </q-page>
</template>

<script setup lang="ts">
import { Notify } from 'quasar'

function openUrl(url: string) {
  const api = (window as Window & { electronAPI?: { openExternal: (u: string) => void } }).electronAPI
  if (api?.openExternal) {
    api.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}

function copyUrl() {
  navigator.clipboard.writeText('https://tgymw.net').then(() => {
    Notify.create({ message: '链接已复制', icon: 'mdi-check', color: 'primary', position: 'top', timeout: 1500 })
  })
}

const techs = [
  { name: 'Vue 3',     icon: 'mdi-vuejs',       color: 'green-5'  },
  { name: 'Electron',  icon: 'mdi-electron-framework', color: 'blue-4' },
  { name: 'Quasar',    icon: 'mdi-quora',        color: 'cyan-5'   },
  { name: 'Pinia',     icon: 'mdi-pine-tree',    color: 'yellow-7' },
  { name: 'Vite',      icon: 'mdi-lightning-bolt', color: 'purple-4'},
  { name: 'TypeScript',icon: 'mdi-language-typescript', color: 'blue-6'},
]

const features = [
  '搜索并播放 B 站音乐视频',
  '本地收藏歌曲，数据不丢失',
  '自定义歌单，随意整理',
  '系统托盘后台运行',
  '任务栏媒体控制按钮',
  '扫码登录 B 站账号',
  '深色主题，护眼美观',
]
</script>

<style lang="scss" scoped>
.about-page {
  background: var(--color-bg);
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 24px;
}

.about-container {
  width: 100%;
  max-width: 600px;
}

// ── Logo ──────────────────────────────────────────────────────────────────
.app-logo-wrap {
  text-align: center;
  margin-bottom: 32px;

  .app-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 96px;
    height: 96px;
    border-radius: 28px;
    background: rgba(251, 114, 153, 0.12);
    border: 1px solid rgba(251, 114, 153, 0.25);
    margin-bottom: 16px;
  }

  .app-name {
    font-size: 28px;
    font-weight: 700;
    color: var(--color-text);
    margin: 0 0 6px;
  }

  .app-version {
    font-size: 13px;
    color: var(--color-text-muted);
    background: var(--color-bg-card);
    display: inline-block;
    padding: 2px 12px;
    border-radius: 20px;
  }
}

// ── 简介卡片 ──────────────────────────────────────────────────────────────
.about-card {
  background: var(--color-bg-card);
  border-radius: 14px;
  padding: 20px 24px;
  margin-bottom: 28px;

  .about-desc {
    font-size: 14px;
    color: var(--color-text-muted);
    line-height: 1.8;
    margin: 0;
    text-align: center;
  }
}

// ── 分区标题 ─────────────────────────────────────────────────────────────
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 12px;
}

// ── 技术栈 ───────────────────────────────────────────────────────────────
.tech-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 28px;
}

.tech-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-bg-card);
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
  transition: background 0.2s;

  &:hover { background: var(--color-bg-hover); }
}

// ── 功能列表 ─────────────────────────────────────────────────────────────
.feature-list {
  background: var(--color-bg-card);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 28px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  font-size: 14px;
  color: var(--color-text);

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }
}

// ── 版权信息 ─────────────────────────────────────────────────────────────
.copyright-card {
  background: var(--color-bg-card);
  border-radius: 14px;
  padding: 18px 22px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.copyright-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text);

  strong {
    color: var(--color-primary);
  }
}

.site-link {
  color: var(--color-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.2s;
  user-select: all;

  &:hover { opacity: 0.8; text-decoration: underline; }
}

// ── 免责声明 ─────────────────────────────────────────────────────────────
.disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.7;
  padding: 0 4px;

  p { margin: 0; }
}
</style>

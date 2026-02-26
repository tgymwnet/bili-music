<template>
  <q-layout view="lHh lpR lFf" class="main-layout">
    <!-- 侧边栏 -->
    <q-drawer
      v-model="drawer"
      :width="220"
      :breakpoint="0"
      bordered
      class="sidebar"
      :overlay="false"
      persistent
    >
      <!-- Logo -->
      <div class="sidebar-logo">
        <q-icon name="mdi-music-circle" size="28px" color="primary" />
        <span class="logo-text gradient-text">BiliMusic</span>
      </div>

      <!-- 可滚动的中间内容 -->
      <div class="sidebar-scroll">
        <!-- 主导航 -->
        <div class="nav-section">
          <div class="nav-label">应用</div>
          <q-list>
            <q-item
              v-for="item in mainNavItems"
              :key="item.path"
              clickable
              :to="item.path"
              active-class="nav-item-active"
              class="nav-item"
            >
              <q-item-section avatar>
                <q-icon :name="item.icon" size="18px" />
              </q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- 我的音乐 -->
        <div class="nav-section">
          <div class="nav-label">我的音乐</div>
          <q-list>
            <q-item
              v-for="item in myNavItems"
              :key="item.path"
              clickable
              :to="item.path"
              active-class="nav-item-active"
              class="nav-item"
            >
              <q-item-section avatar>
                <q-icon :name="item.icon" size="18px" />
              </q-item-section>
              <q-item-section>{{ item.label }}</q-item-section>
            </q-item>
          </q-list>
        </div>

        <!-- 我的歌单 -->
        <div class="nav-section">
          <div class="nav-label-row">
            <span class="nav-label">我的歌单</span>
            <q-btn flat round dense icon="mdi-plus" size="xs" color="grey-6" @click="handleCreatePlaylist">
              <q-tooltip>新建歌单</q-tooltip>
            </q-btn>
          </div>
          <q-list>
            <q-item
              v-for="pl in libraryStore.playlists"
              :key="pl.id"
              clickable
              :to="`/playlist/${pl.id}`"
              active-class="nav-item-active"
              class="nav-item"
            >
              <q-item-section avatar>
                <q-avatar size="20px" rounded>
                  <img v-if="pl.cover" :src="pl.cover" />
                  <q-icon v-else name="mdi-music-note" size="14px" color="grey-6" />
                </q-avatar>
              </q-item-section>
              <q-item-section class="playlist-name">{{ pl.name }}</q-item-section>
            </q-item>
            <div v-if="!libraryStore.playlists.length" class="no-playlist">
              点击 + 新建歌单
            </div>
          </q-list>
        </div>
      </div>

      <!-- 已登录：底部用户信息 -->
      <div v-if="userStore.isLoggedIn" class="sidebar-bottom">
        <div class="user-info">
          <q-avatar size="34px">
            <img :src="userStore.userInfo?.face" referrerpolicy="no-referrer" />
          </q-avatar>
          <div class="user-detail">
            <div class="user-name">{{ userStore.userInfo?.name }}</div>
            <div class="user-sub">已登录</div>
          </div>
          <q-btn flat round dense icon="mdi-logout" size="sm" color="grey-6" @click="handleLogout">
            <q-tooltip>退出登录</q-tooltip>
          </q-btn>
        </div>
      </div>
    </q-drawer>

    <!-- 主内容 -->
    <q-page-container class="page-container">
      <!-- 顶部栏 -->
      <div class="top-bar glass">
        <q-input
          v-model="searchQuery"
          dense
          rounded
          outlined
          placeholder="搜索 B 站音乐..."
          class="search-input"
          @keyup.enter="handleSearch"
          bg-color="transparent"
        >
          <template #prepend>
            <q-icon name="mdi-magnify" color="grey-6" />
          </template>
          <template #append>
            <q-btn
              v-if="searchQuery"
              flat round dense
              icon="mdi-close"
              size="xs"
              @click="searchQuery = ''"
            />
          </template>
        </q-input>

        <div class="top-bar-actions">

          <!-- 未登录：显示登录按钮 -->
          <template v-if="!userStore.isLoggedIn">
            <q-btn
              unelevated
              color="primary"
              class="login-btn-header"
              icon="mdi-qrcode-scan"
              label="登录"
              size="sm"
              @click="showLoginDialog = true"
            />
          </template>

          <!-- 已登录：显示头像 + 昵称 -->
          <template v-else>
            <div class="header-user" @click="showUserMenu = true">
              <q-avatar size="30px" class="header-avatar">
                <img :src="userStore.userInfo?.face" referrerpolicy="no-referrer" />
              </q-avatar>
              <span class="header-username">{{ userStore.userInfo?.name }}</span>
              <q-icon name="mdi-chevron-down" size="16px" color="grey-6" />

              <!-- 用户菜单 -->
              <q-menu v-model="showUserMenu" anchor="bottom right" self="top right" class="user-menu">
                <div class="user-menu-header">
                  <q-avatar size="40px">
                    <img :src="userStore.userInfo?.face" referrerpolicy="no-referrer" />
                  </q-avatar>
                  <div>
                    <div class="menu-name">{{ userStore.userInfo?.name }}</div>
                    <div class="menu-mid">UID: {{ userStore.userInfo?.mid }}</div>
                  </div>
                </div>
                <q-separator color="grey-9" />
                <q-list dense>
                  <q-item clickable @click="handleLogout">
                    <q-item-section avatar>
                      <q-icon name="mdi-logout" color="grey-5" size="18px" />
                    </q-item-section>
                    <q-item-section>退出登录</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </div>
          </template>
        </div>
      </div>

      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </q-page-container>

    <!-- 底部播放器 -->
    <PlayerBar />

    <!-- 登录对话框 -->
    <LoginDialog v-model="showLoginDialog" />

    <!-- 启动引导：未登录时显示 -->
    <StartupLoginPrompt />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useUserStore } from '../stores/user'
import { useLibraryStore } from '../stores/library'
import PlayerBar from '../components/PlayerBar.vue'
import LoginDialog from '../components/LoginDialog.vue'
import StartupLoginPrompt from '../components/StartupLoginPrompt.vue'

const router = useRouter()
const $q = useQuasar()
const userStore = useUserStore()
const libraryStore = useLibraryStore()

const drawer = ref(true)
const searchQuery = ref('')
const showLoginDialog = ref(false)
const showUserMenu = ref(false)

const mainNavItems = [
  { path: '/discover', label: '关于', icon: 'mdi-information-outline' },
  { path: '/search', label: '搜索', icon: 'mdi-magnify' },
]

const myNavItems = [
  { path: '/favorites', label: '我的收藏', icon: 'mdi-heart-outline' },
  { path: '/history', label: '最近播放', icon: 'mdi-history' },
]

function handleSearch() {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value.trim() } })
  }
}

function handleLogout() {
  $q.dialog({ title: '退出登录', message: '确定要退出登录吗？', cancel: true, dark: true })
    .onOk(() => userStore.logout())
}

function handleCreatePlaylist() {
  $q.dialog({
    title: '新建歌单',
    prompt: { model: '', placeholder: '请输入歌单名称', type: 'text' },
    cancel: true,
    dark: true,
  }).onOk((name: string) => {
    if (name?.trim()) {
      const pl = libraryStore.createPlaylist(name.trim())
      router.push(`/playlist/${pl.id}`)
    }
  })
}
</script>

<style lang="scss" scoped>
.main-layout { background: var(--color-bg); }

:deep(.sidebar) {
  background: var(--color-bg-secondary) !important;
  border-right: 1px solid var(--color-border) !important;
}

:deep(.q-drawer__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px 14px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
}

.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  // 底部留出登录状态区的高度
  padding-bottom: 68px;
}

.nav-section {
  padding: 10px 0 2px;
}

.nav-label {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0 16px;
  margin-bottom: 2px;
}

.nav-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 0 16px;
  margin-bottom: 2px;
}

.nav-item {
  margin: 1px 8px;
  border-radius: 8px;
  color: var(--color-text-muted);
  min-height: 36px;
  font-size: 13px;
  transition: all 0.2s;

  &:hover {
    background: var(--color-bg-hover);
    color: var(--color-text);
  }
}

:deep(.nav-item-active) {
  background: rgba(251, 114, 153, 0.15) !important;
  color: var(--color-primary) !important;
}

.playlist-name {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.no-playlist {
  padding: 6px 16px;
  font-size: 12px;
  color: var(--color-text-muted);
  font-style: italic;
}

// 已登录用户信息区，绝对贴底
.sidebar-bottom {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 14px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  z-index: 5;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;

  .user-detail {
    flex: 1;
    overflow: hidden;

    .user-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-sub {
      font-size: 11px;
      color: var(--color-text-muted);
    }
  }
}

.page-container {
  padding-left: 220px !important;
  padding-bottom: 0 !important;
  // 高度 = 全屏 - 播放器底栏，超出部分在此容器内滚动
  height: calc(100vh - var(--player-height)) !important;
  max-height: calc(100vh - var(--player-height)) !important;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  border-bottom: 1px solid var(--color-border);

  .search-input {
    flex: 1;
    max-width: 420px;

    :deep(.q-field__control) {
      background: var(--color-bg-card);
      border-radius: 24px;
    }
  }

  .top-bar-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  .top-bar-divider {
    width: 1px;
    height: 18px;
    background: var(--color-border);
    margin: 0 6px;
    flex-shrink: 0;
  }

  .login-btn-header {
    border-radius: 20px;
    font-size: 12px;
    padding: 0 14px;
    height: 30px;
  }

  .header-user {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 8px;
    border-radius: 20px;
    cursor: pointer;
    transition: background 0.2s;

    &:hover { background: var(--color-bg-hover); }

    .header-avatar {
      flex-shrink: 0;
      ring: 2px solid var(--color-primary);
      img { object-fit: cover; }
    }

    .header-username {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text);
      max-width: 100px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

// 用户下拉菜单
:deep(.user-menu) {
  background: var(--color-bg-card) !important;
  border: 1px solid var(--color-border) !important;
  border-radius: 12px !important;
  min-width: 200px;
  overflow: hidden;

  .user-menu-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;

    .menu-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text);
    }
    .menu-mid {
      font-size: 12px;
      color: var(--color-text-muted);
      margin-top: 2px;
    }
  }

  .q-item {
    color: var(--color-text-muted);
    font-size: 13px;
    padding: 8px 16px;

    &:hover { background: var(--color-bg-hover); color: var(--color-text); }
  }
}
</style>

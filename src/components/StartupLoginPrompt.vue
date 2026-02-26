<template>
  <q-dialog v-model="show" persistent>
    <q-card class="prompt-card">
      <!-- 顶部装饰 -->
      <div class="prompt-hero">
        <div class="hero-glow" />
        <q-icon name="mdi-bilibili" size="52px" color="primary" />
        <div class="hero-title">登录以获得最佳体验</div>
      </div>

      <q-card-section class="prompt-body">
        <!-- 优势列表 -->
        <div class="benefit-list">
          <div class="benefit-item">
            <q-icon name="mdi-shield-check" color="positive" size="20px" />
            <div>
              <div class="benefit-title">降低 412 风控</div>
              <div class="benefit-sub">登录后请求携带身份凭证，大幅降低被 B 站风控拦截的概率</div>
            </div>
          </div>
          <div class="benefit-item">
            <q-icon name="mdi-music-note-plus" color="secondary" size="20px" />
            <div>
              <div class="benefit-title">完整音频质量</div>
              <div class="benefit-sub">解锁更高码率音频流，收听效果更佳</div>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="prompt-actions">
          <q-btn
            unelevated
            color="primary"
            class="login-now-btn"
            icon="mdi-qrcode-scan"
            label="立即扫码登录"
            @click="onLogin"
          />
          <q-btn
            flat
            class="skip-btn"
            :label="countdown > 0 ? `稍后登录 (${countdown}s)` : '稍后登录'"
            :disable="countdown > 0"
            @click="onSkip"
          />
        </div>

        <p class="prompt-note">登录信息仅保存在本地，不上传至任何服务器</p>
      </q-card-section>
    </q-card>
  </q-dialog>

  <!-- 登录对话框 -->
  <LoginDialog v-model="showLoginDialog" @logged-in="onLoggedIn" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import LoginDialog from './LoginDialog.vue'
import { useUserStore } from '../stores/user'

const emit = defineEmits(['done'])
const userStore = useUserStore()

const show = ref(false)
const showLoginDialog = ref(false)
const countdown = ref(5)
let timer: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer!)
      timer = null
    }
  }, 1000)
}

function onLogin() {
  show.value = false
  showLoginDialog.value = true
}

function onSkip() {
  show.value = false
  emit('done')
}

function onLoggedIn() {
  showLoginDialog.value = false
  emit('done')
}

onMounted(() => {
  // 已登录则不显示
  if (!userStore.isLoggedIn) {
    // 延迟 800ms 让主界面先渲染完
    setTimeout(() => {
      show.value = true
      startCountdown()
    }, 800)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style lang="scss" scoped>
.prompt-card {
  width: 380px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  overflow: hidden;
}

.prompt-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 24px 20px;
  background: linear-gradient(160deg, rgba(251,114,153,0.12) 0%, transparent 60%);
  border-bottom: 1px solid var(--color-border);
  overflow: hidden;

  .hero-glow {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 200px;
    background: radial-gradient(circle, rgba(251,114,153,0.25) 0%, transparent 70%);
    pointer-events: none;
  }

  .hero-title {
    margin-top: 12px;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text);
    letter-spacing: 0.3px;
  }
}

.prompt-body {
  padding: 20px 24px 24px;
}

.benefit-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}

.benefit-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;

  .benefit-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 2px;
  }

  .benefit-sub {
    font-size: 12px;
    color: var(--color-text-muted);
    line-height: 1.4;
  }
}

.prompt-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .login-now-btn {
    border-radius: 12px;
    height: 44px;
    font-size: 15px;
    font-weight: 600;
  }

  .skip-btn {
    border-radius: 12px;
    color: var(--color-text-muted);
    font-size: 13px;
    height: 36px;
  }
}

.prompt-note {
  margin: 14px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
  opacity: 0.7;
}
</style>

<template>
  <q-dialog v-model="show" class="login-dialog">
    <q-card class="login-card">
      <q-card-section class="login-header">
        <div class="login-title">
          <q-icon name="mdi-bilibili" size="28px" color="primary" />
          <span>登录 Bilibili</span>
        </div>
        <q-btn flat round dense icon="mdi-close" @click="show = false" />
      </q-card-section>

      <q-card-section class="login-body">
        <template v-if="qrLoading">
          <div class="qr-loading">
            <q-spinner-dots color="primary" size="40px" />
            <p>正在获取二维码...</p>
          </div>
        </template>

        <template v-else-if="qrDataUrl">
          <div class="qr-container">
            <img :src="qrDataUrl" alt="扫码登录" class="qr-code" />
            <div v-if="loginStatus === 'expired'" class="qr-expired" @click="refreshQrCode">
              <q-icon name="mdi-refresh" size="36px" />
              <p>二维码已过期</p>
              <p>点击刷新</p>
            </div>
          </div>
          <div class="qr-tips">
            <q-icon name="mdi-cellphone" size="16px" color="grey-6" />
            <span>使用 Bilibili App 扫码登录</span>
          </div>
          <div class="login-status" :class="statusClass">
            <q-icon :name="statusIcon" size="16px" />
            <span>{{ statusText }}</span>
          </div>
        </template>

        <template v-else-if="qrError">
          <div class="qr-loading">
            <q-icon name="mdi-wifi-off" size="40px" color="grey-7" />
            <p>{{ qrError }}</p>
            <q-btn flat color="primary" label="重试" @click="getQrCode" />
          </div>
        </template>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import QRCode from 'qrcode'
import { generateQRCode, pollQRCode } from '../api/bilibili'
import { useUserStore } from '../stores/user'
import { Notify } from 'quasar'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue', 'logged-in'])

const userStore = useUserStore()

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const qrLoading = ref(false)
const qrDataUrl = ref('')
const qrError = ref('')
const loginStatus = ref<'waiting' | 'scanned' | 'success' | 'expired'>('waiting')
let qrcodeKey = ''
let pollTimer: ReturnType<typeof setInterval> | null = null

const statusText = computed(() => {
  switch (loginStatus.value) {
    case 'scanned': return '已扫码，请在 App 确认'
    case 'success': return '登录成功！'
    case 'expired': return '二维码已过期'
    default: return '等待扫码...'
  }
})
const statusIcon = computed(() => {
  switch (loginStatus.value) {
    case 'scanned': return 'mdi-cellphone-check'
    case 'success': return 'mdi-check-circle'
    case 'expired': return 'mdi-clock-alert'
    default: return 'mdi-qrcode-scan'
  }
})
const statusClass = computed(() => ({
  'status-scanned': loginStatus.value === 'scanned',
  'status-success': loginStatus.value === 'success',
  'status-expired': loginStatus.value === 'expired',
}))

async function getQrCode() {
  qrLoading.value = true
  qrError.value = ''
  qrDataUrl.value = ''
  loginStatus.value = 'waiting'
  stopPolling()

  try {
    const data = await generateQRCode()
    qrcodeKey = data.qrcodeKey
    qrDataUrl.value = await QRCode.toDataURL(data.url, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
    startPolling()
  } catch (e) {
    qrError.value = '获取二维码失败，请检查网络'
  } finally {
    qrLoading.value = false
  }
}

function startPolling() {
  pollTimer = setInterval(async () => {
    try {
      const result = await pollQRCode(qrcodeKey)
      loginStatus.value = result.status
      if (result.status === 'success') {
        stopPolling()
        userStore.setUser({
          mid: result.mid!,
          name: result.name!,
          face: result.face!,
          isLogin: true,
        })
        Notify.create({ type: 'positive', message: `欢迎，${result.name}！`, icon: 'mdi-check-circle' })
        setTimeout(() => {
          show.value = false
          emit('logged-in')
        }, 1000)
      } else if (result.status === 'expired') {
        stopPolling()
      }
    } catch {}
  }, 2000)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

function refreshQrCode() { getQrCode() }

watch(show, (val) => {
  if (val) getQrCode()
  else stopPolling()
})

onUnmounted(() => stopPolling())
</script>

<style lang="scss" scoped>
.login-card {
  width: 320px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 16px;
}
.login-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  .login-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text);
  }
}
.login-body { padding: 24px 20px; }
.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  color: var(--color-text-muted);
  p { font-size: 14px; margin: 0; }
}
.qr-container {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  background: white;
  .qr-code { width: 100%; height: 100%; object-fit: contain; }
  .qr-expired {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    cursor: pointer;
    color: white;
    p { font-size: 13px; margin: 0; }
  }
}
.qr-tips {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 13px;
  color: var(--color-text-muted);
}
.login-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
  &.status-scanned { color: var(--color-secondary); }
  &.status-success { color: #21BA45; }
  &.status-expired { color: #F2C037; }
}
</style>

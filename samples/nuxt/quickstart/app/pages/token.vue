<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useThunderID } from '@thunderid/vue'

const dark = useState('dark', () => false)
const { getAccessToken } = useThunderID()

function decodeJwtPart(part) {
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

const rawToken = ref(null)
const copied = ref(false)
const now = ref(Math.floor(Date.now() / 1000))
let tickerId = null

const tokenParts = computed(() => rawToken.value ? rawToken.value.split('.') : [])
const jwtHeader = computed(() => tokenParts.value[0] ? decodeJwtPart(tokenParts.value[0]) : null)
const jwtPayload = computed(() => tokenParts.value[1] ? decodeJwtPart(tokenParts.value[1]) : null)

const tokenExp = computed(() => jwtPayload.value?.exp)
const expiresIn = computed(() => tokenExp.value ? tokenExp.value - now.value : null)
const tokenExpired = computed(() => expiresIn.value !== null && expiresIn.value <= 0)
const minsLeft = computed(() => expiresIn.value !== null ? Math.abs(Math.floor(expiresIn.value / 60)) : null)

const issuer = computed(() => jwtPayload.value?.iss)
const audience = computed(() => {
  const aud = jwtPayload.value?.aud
  return Array.isArray(aud) ? aud.join(', ') : aud
})
const scopes = computed(() => jwtPayload.value?.scope)

onMounted(() => {
  getAccessToken().then(t => { rawToken.value = t }).catch(() => {})
  tickerId = setInterval(() => { now.value = Math.floor(Date.now() / 1000) }, 1000)
})

onUnmounted(() => {
  if (tickerId) clearInterval(tickerId)
})

function handleCopy() {
  if (rawToken.value && navigator.clipboard) {
    navigator.clipboard.writeText(rawToken.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  }
}
</script>

<template>
  <div :class="['app', { dark }]">
    <AppNav />
    <div class="home-shell">
      <main class="token-main">
        <div class="token-header">
          <div>
            <h1 class="token-title">Token debug</h1>
            <p class="token-subtitle">Inspect your access token and decoded claims.</p>
          </div>
          <div
            v-if="expiresIn !== null"
            :class="['token-badge', tokenExpired ? 'token-badge--expired' : 'token-badge--valid']"
          >
            <span class="token-badge-dot" />
            <span>{{ tokenExpired ? 'Expired' : `Valid · expires in ${minsLeft} min` }}</span>
          </div>
        </div>

        <div class="token-raw-section">
          <div class="token-raw-label-row">
            <span class="token-section-label">Access token</span>
            <button v-if="rawToken" class="token-copy-btn" @click="handleCopy">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {{ copied ? 'Copied!' : 'Copy' }}
            </button>
          </div>
          <code v-if="rawToken" class="token-raw">
            <span class="token-part--header">{{ tokenParts[0] }}</span>
            <span class="token-dot">.</span>
            <span class="token-part--payload">{{ tokenParts[1] }}</span>
            <span class="token-dot">.</span>
            <span class="token-part--signature">{{ tokenParts[2] }}</span>
          </code>
          <code v-else class="token-raw token-raw--loading">Loading…</code>
        </div>

        <div class="token-decoded-grid">
          <div class="token-code-box">
            <div class="token-code-box-header token-code-box-header--header">JWT Header</div>
            <pre class="token-code-pre">{{ jwtHeader ? JSON.stringify(jwtHeader, null, 2) : '…' }}</pre>
          </div>
          <div class="token-code-box">
            <div class="token-code-box-header token-code-box-header--payload">JWT Payload</div>
            <pre class="token-code-pre">{{ jwtPayload ? JSON.stringify(jwtPayload, null, 2) : '…' }}</pre>
          </div>
        </div>

        <div v-if="issuer || audience || scopes" class="token-meta-row">
          <div v-if="issuer" class="token-meta-item">
            <div class="token-meta-label">Issuer</div>
            <div class="token-meta-value">{{ issuer }}</div>
          </div>
          <div v-if="audience" class="token-meta-item">
            <div class="token-meta-label">Audience</div>
            <div class="token-meta-value">{{ audience }}</div>
          </div>
          <div v-if="scopes" class="token-meta-item">
            <div class="token-meta-label">Scopes</div>
            <div class="token-meta-value">{{ scopes }}</div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

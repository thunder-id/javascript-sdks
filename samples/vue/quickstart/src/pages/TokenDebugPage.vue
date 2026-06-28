<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useThunderID } from '@thunderid/vue'

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
let timerInterval = null

const tokenParts = computed(() => rawToken.value ? rawToken.value.split('.') : [])
const jwtHeader = computed(() => tokenParts.value[0] ? decodeJwtPart(tokenParts.value[0]) : null)
const jwtPayload = computed(() => tokenParts.value[1] ? decodeJwtPart(tokenParts.value[1]) : null)

const tokenExpiresIn = computed(() => jwtPayload.value?.exp ? jwtPayload.value.exp - now.value : null)
const tokenExpired = computed(() => tokenExpiresIn.value !== null && tokenExpiresIn.value <= 0)
const tokenMinsLeft = computed(() => tokenExpiresIn.value !== null ? Math.abs(Math.floor(tokenExpiresIn.value / 60)) : null)

const tokenIssuer = computed(() => jwtPayload.value?.iss)
const tokenAudience = computed(() => {
  const aud = jwtPayload.value?.aud
  return Array.isArray(aud) ? aud.join(', ') : aud
})
const tokenScopes = computed(() => jwtPayload.value?.scope)

onMounted(() => {
  getAccessToken().then(t => { rawToken.value = t }).catch(() => {})
  timerInterval = setInterval(() => { now.value = Math.floor(Date.now() / 1000) }, 1000)
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
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
  <main class="token-main">
    <div class="token-header">
      <div>
        <h1 class="token-title">Token debug</h1>
        <p class="token-subtitle">Inspect your access token and decoded claims.</p>
      </div>
      <div
        v-if="tokenExpiresIn !== null"
        :class="['token-badge', tokenExpired ? 'token-badge--expired' : 'token-badge--valid']"
      >
        <span class="token-badge-dot"></span>
        <span>{{ tokenExpired ? 'Expired' : `Valid · expires in ${tokenMinsLeft} min` }}</span>
      </div>
    </div>

    <div class="token-raw-section">
      <div class="token-raw-label-row">
        <span class="token-section-label">Access token</span>
        <button v-if="rawToken" class="token-copy-btn" @click="handleCopy">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
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

    <div v-if="tokenIssuer || tokenAudience || tokenScopes" class="token-meta-row">
      <div v-if="tokenIssuer" class="token-meta-item">
        <div class="token-meta-label">Issuer</div>
        <div class="token-meta-value">{{ tokenIssuer }}</div>
      </div>
      <div v-if="tokenAudience" class="token-meta-item">
        <div class="token-meta-label">Audience</div>
        <div class="token-meta-value">{{ tokenAudience }}</div>
      </div>
      <div v-if="tokenScopes" class="token-meta-item">
        <div class="token-meta-label">Scopes</div>
        <div class="token-meta-value">{{ tokenScopes }}</div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useThunderID } from '@thunderid/vue'

const dark = useState('dark', () => false)
const { getDecodedIdToken, organizationHandle } = useThunderID()

const markTopFill = computed(() => dark.value ? '#E8F4FF' : '#05213F')

function greeting(name) {
  const h = new Date().getHours()
  const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${tod}, ${name}.`
}

function formatTime(unixSeconds) {
  if (!unixSeconds) return '—'
  return new Date(unixSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatCountdown(secsLeft) {
  if (secsLeft <= 0) return { text: 'Expired', color: '#d95757' }
  if (secsLeft < 300) {
    const m = Math.floor(secsLeft / 60), s = secsLeft % 60
    return { text: `${m}m ${s}s`, color: '#e88b3a' }
  }
  if (secsLeft < 3600) {
    const m = Math.floor(secsLeft / 60), s = secsLeft % 60
    return { text: `${m}m ${s}s`, color: '#2fbd6b' }
  }
  const hr = Math.floor(secsLeft / 3600), m = Math.floor((secsLeft % 3600) / 60)
  return { text: `${hr}h ${m}m`, color: '#2fbd6b' }
}

const NEXT_STEPS = [
  {
    n: '01',
    title: 'Explore use cases',
    body: 'See what you can build — auth flows for web, mobile, APIs, and agents.',
    cta: 'Browse use cases',
    href: 'https://thunderid.dev/docs/next/use-cases/overview/',
  },
  {
    n: '02',
    title: 'Learn about flows',
    body: 'Understand how authorization code, PKCE, client credentials, and device flows work.',
    cta: 'Read guide',
    href: 'https://thunderid.dev/docs/next/guides/guides/flows/what-are-flows/',
  },
  {
    n: '03',
    title: 'Style your experience',
    body: 'Customize the login UI, branding, and email templates to match your product.',
    cta: 'Design guide',
    href: 'https://thunderid.dev/docs/next/guides/guides/design/overview/',
  },
  {
    n: '04',
    title: 'Explore SDK APIs',
    body: 'Full Nuxt SDK reference — composables, components, and configuration options.',
    cta: 'SDK reference',
    href: 'https://thunderid.dev/docs/next/sdks/nuxt/overview/',
  },
]

const idToken = ref(null)
const now = ref(Math.floor(Date.now() / 1000))
let tickerId = null

const authTime = computed(() => idToken.value?.auth_time)
const idExp = computed(() => idToken.value?.exp)
const secsLeft = computed(() => idExp.value ? Math.max(0, idExp.value - now.value) : null)
const countdown = computed(() => secsLeft.value !== null ? formatCountdown(secsLeft.value) : null)

onMounted(() => {
  getDecodedIdToken().then(t => { idToken.value = t }).catch(() => {})
  tickerId = setInterval(() => { now.value = Math.floor(Date.now() / 1000) }, 1000)
})

onUnmounted(() => {
  if (tickerId) clearInterval(tickerId)
})
</script>

<template>
  <div :class="['app', { dark }]">
    <AppNav />

    <SignedOut>
      <section class="hero">
        <div class="hero-inner">
          <svg width="35" height="44" viewBox="0 0 207 257" fill="none" aria-hidden="true">
            <path d="M55.4763 26.4391L58.8866 0H0V26.4391H55.4763Z" :fill="markTopFill" />
            <path d="M39.8438 147.407L49.5455 72.2839H4.9909e-05V256.743H60.5602L80.048 147.407H39.8438Z" fill="#3688FF" />
            <path d="M192.42 59.361C182.782 40.2307 168.929 25.5705 150.903 15.3381C145.501 12.2662 139.761 9.6605 133.703 7.5208L115.401 103.702H159.757L76.2987 256.743H83.3735C109.449 256.743 131.69 251.574 150.14 241.236C168.569 230.897 182.634 216.131 192.356 196.959C202.058 177.765 206.909 154.8 206.909 128.043C206.909 101.286 202.079 78.5123 192.441 59.3821L192.42 59.361Z" fill="#3688FF" />
          </svg>

          <div class="hero-badge">
            <span class="hero-badge-line" />
            <span>v1.0 · Open source</span>
            <span class="hero-badge-line" />
          </div>

          <h1 class="hero-title">Auth for the Modern Dev</h1>

          <p class="hero-subtitle">
            ThunderID gives you OAuth&nbsp;2.0, PKCE, MFA, and JWT out of
            the box. Clone the Quickstart and ship auth before lunch.
          </p>

          <div class="hero-ctas">
            <SignUpButton>
              <template #default="{ signUp, isLoading }">
                <button class="btn-primary btn-lg" @click="signUp" :disabled="isLoading">
                  {{ isLoading ? 'Signing up…' : 'Get started' }}
                </button>
              </template>
            </SignUpButton>
            <SignInButton>
              <template #default="{ signIn, isLoading }">
                <button class="btn-outline btn-lg" @click="signIn" :disabled="isLoading">
                  {{ isLoading ? 'Signing in…' : 'Sign in' }}
                </button>
              </template>
            </SignInButton>
          </div>

          <hr class="hero-divider" />

          <div class="hero-stats">
            <div class="hero-stat">
              <span class="hero-stat-value">OAuth 2.0</span>
              <span class="hero-stat-label">Authorization standard</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">&lt;&nbsp;5 min</span>
              <span class="hero-stat-label">Integration time</span>
            </div>
            <div class="hero-stat">
              <span class="hero-stat-value">MIT</span>
              <span class="hero-stat-label">License</span>
            </div>
          </div>
        </div>
      </section>
    </SignedOut>

    <SignedIn>
      <div class="home-shell">
        <User>
          <template #default="{ user }">
            <main class="home-main">
              <div class="home-greeting">
                <UserAvatar :user="user" :size="52" />
                <div class="home-greeting-text">
                  <h1 class="home-greeting-name">
                    {{ greeting(user?.givenName || user?.given_name || user?.displayName || user?.username || 'there') }}
                  </h1>
                  <div class="home-greeting-meta">
                    <span v-if="user?.email">{{ user.email }}</span>
                    <span v-if="user?.email" class="home-dot" />
                    <span class="home-session-active">
                      <span class="home-session-dot" />
                      Session active
                    </span>
                  </div>
                </div>
              </div>

              <div class="home-stats">
                <div class="home-stat">
                  <div class="home-stat-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <div class="home-stat-value">{{ formatTime(authTime) }}</div>
                    <div class="home-stat-label">Signed in at</div>
                  </div>
                </div>
                <div class="home-stat home-stat--bordered">
                  <div class="home-stat-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M10 2h4" /><path d="M12 14v-4" />
                      <path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6" />
                      <path d="M9 17H4v5" />
                    </svg>
                  </div>
                  <div>
                    <div
                      class="home-stat-value home-stat-value--mono"
                      :style="countdown ? { color: countdown.color } : undefined"
                    >
                      {{ countdown ? countdown.text : '—' }}
                    </div>
                    <div class="home-stat-label">Session expires in</div>
                  </div>
                </div>
                <div class="home-stat home-stat--bordered">
                  <div class="home-stat-icon">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18" /><path d="M9 21V9" />
                    </svg>
                  </div>
                  <div>
                    <div class="home-stat-value">{{ organizationHandle || user?.ouName || user?.org || 'Default' }}</div>
                    <div class="home-stat-label">Organisation</div>
                  </div>
                </div>
              </div>

              <div class="home-next-label">What's next</div>
              <div class="home-next-list">
                <a
                  v-for="step in NEXT_STEPS"
                  :key="step.n"
                  :href="step.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="home-next-item"
                >
                  <span class="home-next-n">{{ step.n }}</span>
                  <div class="home-next-body">
                    <div class="home-next-title">{{ step.title }}</div>
                    <div class="home-next-desc">{{ step.body }}</div>
                  </div>
                  <span class="home-next-cta">
                    {{ step.cta }}
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M7 17L17 7" /><path d="M7 7h10v10" />
                    </svg>
                  </span>
                </a>
              </div>
            </main>
          </template>
        </User>
      </div>
    </SignedIn>
  </div>
</template>

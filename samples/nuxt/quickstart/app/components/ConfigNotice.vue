<script setup>
defineProps({
  missing: { type: Array, required: true },
})

const dark = useState('dark', () => false)

function toggleDark() {
  dark.value = !dark.value
}
</script>

<template>
  <div :class="['app', { dark }]">
    <nav class="nav">
      <NuxtLink to="/" class="nav-logo" aria-label="ThunderID home">
        <svg width="24" height="24" viewBox="0 0 300 300" aria-hidden="true">
          <path
            fill="#00DC82"
            d="M168 250h111c3.542 0 6.932-1.244 10-3 3.068-1.756 6.23-3.959 8-7 1.77-3.041 3.002-6.49 3-10.001-.002-3.511-1.227-6.959-3-9.998L222 91c-1.77-3.04-3.933-5.245-7-7s-7.458-3-11-3-6.933 1.245-10 3-5.23 3.96-7 7l-19 33-38-64.002c-1.772-3.04-3.932-6.243-7-7.998s-6.458-2-10-2-6.932.245-10 2c-3.068 1.755-6.228 4.958-8 7.998L2 220c-1.773 3.039-1.998 6.487-2 9.998-.002 3.511.23 6.96 2 10.001 1.77 3.04 4.932 5.244 8 7 3.068 1.756 6.458 3 10 3h70c27.737 0 47.925-12.442 62-36l34-59 18-31 55 94h-73l-18 32Zm-79-32H40l73-126 37 63-24.509 42.725C116.144 213.01 105.488 218 89 218Z"
          />
        </svg>
        <span class="wordmark-name">Quickstart</span>
      </NuxtLink>

      <div class="nav-actions">
        <button
          class="dark-toggle"
          :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleDark"
        >
          <svg v-if="dark" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        </button>
      </div>
    </nav>

    <section class="hero">
      <div class="hero-inner">
        <svg width="35" height="44" viewBox="0 0 207 257" fill="none" aria-hidden="true">
          <path d="M55.4763 26.4391L58.8866 0H0V26.4391H55.4763Z" fill="#05213F" />
          <path d="M39.8438 147.407L49.5455 72.2839H4.9909e-05V256.743H60.5602L80.048 147.407H39.8438Z" fill="#3688FF" />
          <path d="M192.42 59.361C182.782 40.2307 168.929 25.5705 150.903 15.3381C145.501 12.2662 139.761 9.6605 133.703 7.5208L115.401 103.702H159.757L76.2987 256.743H83.3735C109.449 256.743 131.69 251.574 150.14 241.236C168.569 230.897 182.634 216.131 192.356 196.959C202.058 177.765 206.909 154.8 206.909 128.043C206.909 101.286 202.079 78.5123 192.441 59.3821L192.42 59.361Z" fill="#3688FF" />
        </svg>

        <div class="hero-badge config-badge">
          <span class="hero-badge-line" />
          <span>Setup required</span>
          <span class="hero-badge-line" />
        </div>

        <h1 class="hero-title">Configuration needed</h1>

        <p class="hero-subtitle">
          This quickstart can't reach ThunderID yet. Set the following
          environment variable(s), then restart the dev server.
        </p>

        <ul class="config-list">
          <li v-for="key in missing" :key="key" class="config-list-item">{{ key }}</li>
        </ul>

        <p class="config-hint">
          Copy <code>.env.example</code> to <code>.env</code>, fill in the
          values from your ThunderID application, then run <code>npm run dev</code> again.
        </p>
      </div>
    </section>
  </div>
</template>

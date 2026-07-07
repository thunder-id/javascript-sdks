<script setup>
const dark = useState('dark', () => false)
</script>

<template>
  <div :class="['app', { dark }]">
    <AppNav />

    <ThunderIDSignedIn>
      <main class="auth-main">
        <div class="auth-card">
          <p class="auth-subtitle">You're already signed in.</p>
          <NuxtLink to="/" class="btn-primary">Go home</NuxtLink>
        </div>
      </main>
    </ThunderIDSignedIn>

    <ThunderIDSignedOut>
      <main class="auth-main">
        <ThunderIDSignIn />
      </main>
    </ThunderIDSignedOut>
  </div>
</template>

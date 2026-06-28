<script setup>
const dark = useState('dark', () => false)
</script>

<template>
  <div :class="['app', { dark }]">
    <AppNav />
    <div class="home-shell">
      <main class="profile-main">
        <ThunderIDUserProfile />
      </main>
    </div>
  </div>
</template>

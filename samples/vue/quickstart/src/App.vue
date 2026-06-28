<script setup>
import { ref } from 'vue'
import { ThunderIDProvider, Loading } from '@thunderid/vue'
import Nav from './components/Nav.vue'
import HomePage from './pages/HomePage.vue'
import ProfilePage from './pages/ProfilePage.vue'
import TokenDebugPage from './pages/TokenDebugPage.vue'

const clientId = import.meta.env.VITE_THUNDERID_CLIENT_ID
const baseUrl = import.meta.env.VITE_THUNDERID_BASE_URL

const page = ref('home')
const dark = ref(false)
</script>

<template>
  <ThunderIDProvider :client-id="clientId" :base-url="baseUrl">
    <div :class="['app', { dark }]">
      <Nav
        :page="page"
        :dark="dark"
        @update:page="page = $event"
        @update:dark="dark = $event"
      />

      <Loading>
        <div class="loading-screen">Loading…</div>
      </Loading>

      <HomePage v-if="page === 'home'" :dark="dark" />
      <ProfilePage v-else-if="page === 'profile'" />
      <TokenDebugPage v-else-if="page === 'token'" />
    </div>
  </ThunderIDProvider>
</template>

<script setup>
import { ThunderIDProvider, SignedIn, SignedOut, SignInButton, SignOutButton, User } from '@thunderid/vue'

const clientId = import.meta.env.VITE_THUNDERID_CLIENT_ID
const baseUrl = import.meta.env.VITE_THUNDERID_BASE_URL
</script>

<template>
  <ThunderIDProvider :client-id="clientId" :base-url="baseUrl">
    <main>
      <SignedOut>
        <h1>Welcome</h1>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <User v-slot="{ user }">
          <h1>Hello, {{ user.given_name || user.username }}.</h1>
        </User>
        <SignOutButton />
      </SignedIn>
    </main>
  </ThunderIDProvider>
</template>

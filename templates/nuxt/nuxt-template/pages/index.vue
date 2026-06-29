<template>
  <main>
    <ThunderIDSignedOut>
      <h1>Welcome</h1>
      <ThunderIDSignInButton />
    </ThunderIDSignedOut>
    <ThunderIDSignedIn>
      <ThunderIDUser v-slot="{ user }">
        <h1>Hello, {{ user.given_name || user.username }}.</h1>
      </ThunderIDUser>
      <ThunderIDSignOutButton />
    </ThunderIDSignedIn>
  </main>
</template>

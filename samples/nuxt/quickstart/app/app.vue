<script setup>
const publicConfig = useRuntimeConfig().public.thunderid
const REQUIRED_ENV_VARS = [
  { key: 'clientId', env: 'NUXT_PUBLIC_THUNDERID_CLIENT_ID' },
  { key: 'baseUrl', env: 'NUXT_PUBLIC_THUNDERID_BASE_URL' },
]
const missingEnvVars = REQUIRED_ENV_VARS.filter((v) => !publicConfig?.[v.key]).map((v) => v.env)
</script>

<template>
  <ConfigNotice v-if="missingEnvVars.length > 0" :missing="missingEnvVars" />
  <ThunderIDRoot v-else>
    <NuxtPage />
  </ThunderIDRoot>
</template>

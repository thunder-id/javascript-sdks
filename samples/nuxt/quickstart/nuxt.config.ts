export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  css: ['~/assets/styles.css'],
  devtools: { enabled: true },
  modules: ['@thunderid/nuxt'],
  thunderid: {
    tokenRequest: {
      authMethod: 'client_secret_post',
    },
  },
})

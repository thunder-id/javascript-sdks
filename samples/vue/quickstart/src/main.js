import { createApp } from 'vue'
import { ThunderIDPlugin } from '@thunderid/vue'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(ThunderIDPlugin)
app.mount('#app')

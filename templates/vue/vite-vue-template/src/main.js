import { createApp } from 'vue'
import { ThunderIDPlugin } from '@thunderid/vue'
import App from './App.vue'
import './style.css'

createApp(App).use(ThunderIDPlugin).mount('#app')

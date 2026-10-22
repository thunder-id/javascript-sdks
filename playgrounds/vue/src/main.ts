// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import Aura from '@primeuix/themes/aura';
import {ThunderIDPlugin} from '@thunderid/vue';
import PrimeVue from 'primevue/config';
import {createApp} from 'vue';
import App from './App.vue';
import './styles.css';

// PrimeVue backs the "Custom rendering" stories, which draw the SDK's admin components through their
// default scoped slots. It is a playground dependency only.
createApp(App)
  .use(ThunderIDPlugin)
  .use(PrimeVue, {theme: {options: {darkModeSelector: '.pg-prime-dark'}, preset: Aura}})
  .mount('#app');

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import Aura from '@primeuix/themes/aura';
import PrimeVue from 'primevue/config';

// PrimeVue backs the "Custom rendering" stories, which draw the SDK's admin components through their
// default scoped slots. It is a playground dependency only.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, {theme: {options: {darkModeSelector: '.pg-prime-dark'}, preset: Aura}});
});

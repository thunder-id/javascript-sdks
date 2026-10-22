<script setup lang="ts">
// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDProvider} from '@thunderid/vue';
import playgroundConfig from './config';
import Shell from './Shell.vue';
</script>

<template>
  <ThunderIDProvider
    :after-sign-in-url="playgroundConfig.afterSignInUrl"
    :after-sign-out-url="playgroundConfig.afterSignOutUrl"
    :application-id="playgroundConfig.applicationId"
    :base-url="playgroundConfig.baseUrl"
    :client-id="playgroundConfig.clientId"
    :endpoints="playgroundConfig.endpoints"
    :scopes="playgroundConfig.scopes"
    :storage="playgroundConfig.storage"
  >
    <Shell />
  </ThunderIDProvider>
</template>

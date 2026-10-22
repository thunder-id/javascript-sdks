<script setup lang="ts">
// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {computed, ref, type ComputedRef, type Ref} from 'vue';
import {useFlow, useFlowMeta, useTheme, useThunderID, useThunderIDI18n, useUser} from '#imports';
import {describeError, track} from '~/lib/events';

const sdk = useThunderID();
const user = useUser();
const i18n = useThunderIDI18n();
const theme = useTheme();
const flow = useFlow();
const flowMeta = useFlowMeta();
const error: Ref<string | null> = ref<string | null>(null);

const call = (label: string, run: () => Promise<unknown>): void => {
  error.value = null;
  track(label, run).catch((caught: unknown) => {
    error.value = describeError(caught);
  });
};

const languages: ComputedRef<string[]> = computed(() => Object.keys(i18n.bundles.value));

const i18nValue: ComputedRef<Record<string, unknown>> = computed(() => ({
  ...i18n,
  bundles: languages.value,
  "t('elements.buttons.signin.text')": i18n.t('elements.buttons.signin.text'),
  "t('elements.buttons.signout.text')": i18n.t('elements.buttons.signout.text'),
}));

const themeValue: ComputedRef<Record<string, unknown>> = computed(() => {
  const variables: Record<string, string> = theme.theme.value.cssVariables ?? {};

  return {
    colorScheme: theme.colorScheme.value,
    cssVariables: `${Object.keys(variables).length} variables`,
    direction: theme.direction.value,
    sample: Object.fromEntries(Object.entries(variables).slice(0, 8)),
    toggleTheme: theme.toggleTheme,
  };
});

const flowMetaValue: ComputedRef<Record<string, unknown>> = computed(() => ({
  ...flowMeta,
  meta: flowMeta.meta.value ? `${Object.keys(flowMeta.meta.value).join(', ')}` : null,
}));
</script>

<template>
  <main class="pg-main">
    <div class="pg-heading">
      <div>
        <h1>Composables</h1>
        <p>
          Live values from every composable <span class="pg-accent">@thunderid/nuxt</span> auto-imports. Refs show their
          current value and functions are shown as signatures; use the buttons to call them.
        </p>
      </div>
    </div>

    <div v-if="error" class="pg-warning" role="alert">{{ error }}</div>

    <div class="pg-grid-2">
      <ComposableCard
        name="useThunderID()"
        signature="ThunderIDContext: state, config, and auth functions bound to Nuxt routes"
        :value="sdk"
      >
        <template #actions>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            :disabled="sdk.isSignedIn.value"
            @click="call('signIn', () => sdk.signIn())"
          >
            signIn()
          </button>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            :disabled="!sdk.isSignedIn.value"
            @click="call('getAccessToken', () => sdk.getAccessToken())"
          >
            getAccessToken()
          </button>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            :disabled="!sdk.isSignedIn.value"
            @click="call('signOut', () => sdk.signOut())"
          >
            signOut()
          </button>
        </template>
        <p class="pg-empty">
          getIdToken, getDecodedIdToken, signInSilently, exchangeToken and http are no-ops in the Nuxt module: tokens
          stay in the server-side session.
        </p>
      </ComposableCard>
      <ComposableCard
        name="useUser()"
        signature="{profile, flattenedProfile, userSchema, revalidateProfile, updateProfile, onUpdateProfile}"
        :value="user"
      >
        <template #actions>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            :disabled="!sdk.isSignedIn.value"
            @click="call('revalidateProfile', () => user.revalidateProfile())"
          >
            revalidateProfile()
          </button>
        </template>
      </ComposableCard>
      <ComposableCard
        name="useThunderIDI18n()"
        signature="useI18n of @thunderid/vue: {currentLanguage, fallbackLanguage, bundles, setLanguage, injectBundles, t}"
        :value="i18nValue"
      >
        <template #actions>
          <button
            v-for="language in languages"
            :key="language"
            type="button"
            class="pg-btn"
            data-size="sm"
            :aria-pressed="language === i18n.currentLanguage.value"
            @click="i18n.setLanguage(language)"
          >
            {{ language }}
          </button>
        </template>
      </ComposableCard>
      <ComposableCard name="useTheme()" signature="{theme, colorScheme, direction, toggleTheme}" :value="themeValue">
        <template #actions>
          <button type="button" class="pg-btn" data-size="sm" @click="theme.toggleTheme()">toggleTheme()</button>
        </template>
      </ComposableCard>
      <ComposableCard
        name="useFlowMeta()"
        signature="{meta, isLoading, error, fetchFlowMeta, switchLanguage}: loaded through GET /api/auth/meta"
        :value="flowMetaValue"
      >
        <template #actions>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            @click="call('fetchFlowMeta', () => flowMeta.fetchFlowMeta())"
          >
            fetchFlowMeta()
          </button>
        </template>
      </ComposableCard>
      <ComposableCard
        name="useFlow()"
        signature="FlowContextValue: current step, title, messages for embedded flows"
        :value="flow"
      />
      <EventLog />
    </div>

    <ManagementComposables />
  </main>
</template>

<script setup lang="ts">
// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useManagementEndpoint, type ManagementEndpoint, type ManagementEndpointKey} from '@thunderid/vue';
import {computed, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref} from 'vue';
import {
  useFlowMeta,
  useGrantedPermissions,
  useRuntimeConfig,
  useState,
  useTheme,
  useThunderID,
  useThunderIDI18n,
  useUser,
} from '#imports';
import {
  CAPABILITIES,
  runCapability,
  type Capability,
  type CapabilityContext,
  type CapabilityResult,
  type CapabilityStatus,
  type PublicThunderIDConfig,
} from '~/lib/capabilities';
import {logEvent} from '~/lib/events';
import {health} from '~/lib/health';
import {
  MANAGEMENT_COLLECTIONS,
  MANAGEMENT_ROUTE,
  describeHosts,
  resolveManagementEndpoints,
  type ResolvedEndpoint,
} from '~/lib/management';
import type {SsrSnapshot} from '~/lib/types';

interface CapabilityState {
  note: string;
  status: CapabilityStatus;
}

type Filter = 'all' | 'pass' | 'fail' | 'idle' | 'unavailable';

interface LastRun {
  at: number;
  durationMs: number;
}

const RESULTS_KEY = 'playground:nuxt:results';

const runtimeConfig = useRuntimeConfig();
const config: PublicThunderIDConfig = runtimeConfig.public.thunderid as PublicThunderIDConfig;
const sdk = useThunderID();

// Composables only run in setup, so the endpoint of every management collection is resolved here once.
const endpoints: Record<string, ManagementEndpoint> = Object.fromEntries(
  MANAGEMENT_COLLECTIONS.map(({key}: {key: ManagementEndpointKey}) => [key, useManagementEndpoint(key)]),
);
const ssr: Ref<SsrSnapshot | null> = useState<SsrSnapshot | null>('playground:ssr');
const context: CapabilityContext = {
  config,
  flowMeta: useFlowMeta(),
  i18n: useThunderIDI18n(),
  management: {
    endpoint: (key: ManagementEndpointKey): ManagementEndpoint => endpoints[key],
    permissions: useGrantedPermissions(),
  },
  sdk,
  ssr: ssr.value,
  theme: useTheme(),
  user: useUser(),
};

const results: Ref<Record<string, CapabilityState>> = ref<Record<string, CapabilityState>>({});
const lastRun: Ref<LastRun | null> = ref<LastRun | null>(null);
const filter: Ref<Filter> = ref<Filter>('all');
const runningAll: Ref<boolean> = ref<boolean>(false);
const now: Ref<number> = ref<number>(0);
let timer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
  // Results survive the sign-in redirect; they are read after hydration so the server and the
  // first client render agree.
  try {
    const raw: string | null = sessionStorage.getItem(RESULTS_KEY);

    if (raw) {
      const stored = JSON.parse(raw) as {lastRun: LastRun | null; results: Record<string, CapabilityState>};

      results.value = stored.results;
      lastRun.value = stored.lastRun;
    }
  } catch {
    // Storage can be blocked; start fresh.
  }

  now.value = Date.now();
  timer = setInterval(() => {
    now.value = Date.now();
  }, 15000);

  watch(
    [results, lastRun],
    () => {
      try {
        sessionStorage.setItem(RESULTS_KEY, JSON.stringify({lastRun: lastRun.value, results: results.value}));
      } catch {
        // Persisting results is a convenience only.
      }
    },
    {deep: true},
  );
});

onBeforeUnmount(() => clearInterval(timer));

const statusOf = (id: string): CapabilityStatus => results.value[id]?.status ?? 'idle';

const noteOf = (id: string): string => results.value[id]?.note ?? (statusOf(id) === 'idle' ? 'not run yet' : '');

const matchesFilter = (status: CapabilityStatus, value: Filter): boolean => {
  if (value === 'all') return true;
  if (value === 'idle') return status === 'idle' || status === 'skip';

  return status === value;
};

const runOne = async (capability: Capability, interactive: boolean): Promise<CapabilityResult> => {
  results.value = {...results.value, [capability.id]: {note: 'running…', status: 'running'}};

  const result: CapabilityResult = await runCapability(capability, context, {interactive});

  results.value = {...results.value, [capability.id]: result};
  logEvent(`check:${capability.id}`, `${result.status}: ${result.note}`, result.status === 'fail' ? 'error' : 'ok');

  return result;
};

const runAll = async (): Promise<void> => {
  if (runningAll.value) return;

  runningAll.value = true;
  logEvent('checks:started', `${CAPABILITIES.length} capabilities`, 'info');

  const started: number = Date.now();

  results.value = Object.fromEntries(
    CAPABILITIES.map((capability: Capability) => [capability.id, {note: 'queued', status: 'running'}]),
  );

  for (const capability of CAPABILITIES) {
    // Sequential on purpose: several checks depend on the state earlier ones settle.
    await runOne(capability, false);
  }

  const finished: number = Date.now();

  lastRun.value = {at: finished, durationMs: finished - started};
  now.value = finished;
  runningAll.value = false;
  logEvent('checks:finished', `${((finished - started) / 1000).toFixed(1)} s`, 'ok');
};

const counts: ComputedRef<Record<CapabilityStatus, number>> = computed(() => {
  const next: Record<CapabilityStatus, number> = {fail: 0, idle: 0, pass: 0, running: 0, skip: 0, unavailable: 0};

  CAPABILITIES.forEach((capability: Capability) => {
    next[statusOf(capability.id)] += 1;
  });

  return next;
});

const total: number = CAPABILITIES.length;

const filters: ComputedRef<[Filter, string][]> = computed(() => [
  ['all', `All ${total}`],
  ['pass', `Passed ${counts.value.pass}`],
  ['fail', `Failed ${counts.value.fail}`],
  ['idle', `Not run ${counts.value.idle + counts.value.skip}`],
  ['unavailable', `Unavailable ${counts.value.unavailable}`],
]);

const sections: ComputedRef<{items: Capability[]; name: string}[]> = computed(() =>
  Array.from(new Set(CAPABILITIES.map((capability: Capability) => capability.section)))
    .map((name: string) => ({
      items: CAPABILITIES.filter(
        (capability: Capability) => capability.section === name && matchesFilter(statusOf(capability.id), filter.value),
      ),
      name,
    }))
    .filter((section: {items: Capability[]}) => section.items.length > 0),
);

const host: string = String(config.baseUrl ?? '(not set)').replace(/^https?:\/\//, '');

const timeAgo = (at: number): string => {
  const seconds: number = Math.max(0, Math.round((now.value - at) / 1000));

  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;

  return `${Math.round(seconds / 3600)} h`;
};

const orNotSet = (value: string | undefined): string => (value === undefined || value === '' ? '(not set)' : value);

const configText: string = [
  ['baseUrl', orNotSet(config.baseUrl)],
  ['clientId', orNotSet(config.clientId)],
  ['applicationId', orNotSet(config.applicationId)],
  ['scopes', Array.isArray(config.scopes) ? config.scopes.join(' ') : orNotSet(config.scopes)],
  ['callback', '/api/auth/callback'],
  ['session', 'signed cookie (THUNDERID_SESSION_SECRET)'],
  ['pickers', 'users, authFlows, userTypes'],
  ['backchannel', '/api/auth/backchannel-logout'],
  ['management', config.management ? `on · POST ${MANAGEMENT_ROUTE}` : 'off'],
]
  .map(([key, value]: string[]) => `${key.padEnd(14)}${value}`)
  .join('\n');

// Where the management composables send each collection, as useManagementEndpoint() resolves it.
const resolvedEndpoints: ResolvedEndpoint[] = resolveManagementEndpoints(
  (key: ManagementEndpointKey) => endpoints[key],
);

const endpointsText: string = [
  ...describeHosts(config.baseUrl, resolvedEndpoints),
  '',
  ...resolvedEndpoints.map(
    (item: ResolvedEndpoint) => `${item.key.padEnd(11)}${item.url}\n${''.padEnd(11)}↳ ${item.source}`,
  ),
].join('\n');
</script>

<template>
  <main class="pg-main">
    <div class="pg-heading">
      <div>
        <h1>Nuxt SDK playground</h1>
        <p>
          Exercise every capability of <span class="pg-accent">@thunderid/nuxt</span>, in the browser and on the Nuxt
          server, against your local ThunderID server.
        </p>
      </div>
      <div class="pg-row">
        <button type="button" class="pg-btn" data-variant="primary" :disabled="runningAll" @click="runAll">
          <PgIcon :name="runningAll ? 'spinner' : 'play'" />
          {{ runningAll ? 'Running checks' : 'Run all checks' }}
        </button>
      </div>
    </div>

    <div v-if="!config.clientId && !config.applicationId" class="pg-warning" role="status">
      No client ID or application ID configured. Copy <code>.env.example</code> to <code>.env</code>, set
      <code>NUXT_PUBLIC_THUNDERID_CLIENT_ID</code> (and <code>NUXT_PUBLIC_THUNDERID_APPLICATION_ID</code> for the
      app-native flows), and restart <code>pnpm dev</code>. Until then the ThunderID Nitro plugin does not initialize
      and checks that need a session fail.
    </div>

    <div class="pg-stats">
      <div class="pg-stat">
        <div class="pg-stat-label">Capabilities passing</div>
        <div class="pg-stat-value">
          <strong>{{ counts.pass }} / {{ total }}</strong>
          <span>{{ Math.round((counts.pass / total) * 100) }}%</span>
        </div>
      </div>
      <div class="pg-stat">
        <div class="pg-stat-label">Failing</div>
        <div class="pg-stat-value">
          <strong :style="{color: counts.fail ? 'var(--pg-err)' : 'var(--pg-ok)'}">{{ counts.fail }}</strong>
          <span>{{ counts.fail ? 'needs attention' : 'all good' }}</span>
        </div>
      </div>
      <div class="pg-stat">
        <div class="pg-stat-label">Server (seen from Nuxt)</div>
        <div class="pg-stat-value">
          <strong
            :style="{
              color: health.state === 'down' ? 'var(--pg-err)' : health.state === 'up' ? 'var(--pg-ok)' : undefined,
            }"
          >
            {{ health.state === 'up' ? 'Healthy' : health.state === 'down' ? 'Down' : 'Checking' }}
          </strong>
          <span>{{ host }}</span>
        </div>
      </div>
      <div class="pg-stat">
        <div class="pg-stat-label">Last full run</div>
        <div class="pg-stat-value">
          <strong>{{ lastRun ? timeAgo(lastRun.at) : 'Never' }}</strong>
          <span>{{ lastRun ? `ago · ${(lastRun.durationMs / 1000).toFixed(1)} s` : 'press Run all checks' }}</span>
        </div>
      </div>
    </div>

    <div class="pg-columns">
      <section aria-label="Capability checks" class="pg-card pg-col-main">
        <div class="pg-card-head">
          <h2>Capabilities</h2>
          <div role="group" aria-label="Filter" class="pg-segmented">
            <button
              v-for="[id, label] in filters"
              :key="id"
              type="button"
              :aria-pressed="filter === id"
              @click="filter = id"
            >
              {{ label }}
            </button>
          </div>
        </div>
        <div v-for="section in sections" :key="section.name">
          <div class="pg-section-label">{{ section.name }}</div>
          <div v-for="capability in section.items" :key="capability.id" class="pg-cap">
            <span class="pg-status-icon" :data-status="statusOf(capability.id)" :aria-label="statusOf(capability.id)">
              <PgIcon v-if="statusOf(capability.id) === 'pass'" name="check" :size="12" />
              <PgIcon v-else-if="statusOf(capability.id) === 'fail'" name="cross" :size="12" />
              <PgIcon v-else-if="statusOf(capability.id) === 'running'" name="spinner" :size="12" />
              <PgIcon v-else-if="statusOf(capability.id) === 'unavailable'" name="bang" :size="12" />
              <PgIcon v-else name="dash" :size="12" />
            </span>
            <div class="pg-cap-text">
              <span class="pg-cap-name">{{ capability.name }}</span>
              <span class="pg-cap-api">{{ capability.api }}</span>
            </div>
            <span class="pg-cap-note" :data-status="statusOf(capability.id)">{{ noteOf(capability.id) }}</span>
            <button
              type="button"
              class="pg-btn"
              data-size="sm"
              :aria-label="`Run ${capability.name}`"
              :disabled="statusOf(capability.id) === 'running'"
              @click="runOne(capability, true)"
            >
              {{ statusOf(capability.id) === 'idle' ? 'Run' : 'Re-run' }}
            </button>
          </div>
        </div>
        <p v-if="sections.length === 0" class="pg-empty">No capabilities match this filter.</p>
      </section>

      <div class="pg-col-side">
        <SessionCard />

        <section aria-label="Configuration" class="pg-card">
          <div class="pg-card-head">
            <h2>thunderid module</h2>
            <span class="pg-card-meta">nuxt.config.ts · .env</span>
          </div>
          <pre class="pg-pre">{{ configText }}</pre>
        </section>

        <section aria-label="Management endpoints" class="pg-card">
          <div class="pg-card-head">
            <h2>Management endpoints</h2>
            <span class="pg-card-meta">thunderid.endpoints · useManagementEndpoint()</span>
          </div>
          <pre class="pg-pre">{{ endpointsText }}</pre>
        </section>

        <EventLog />
      </div>
    </div>
  </main>
</template>

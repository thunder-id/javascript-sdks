<script setup lang="ts">
// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useFlowMeta, useI18n, useTheme, useThunderID, useUser} from '@thunderid/vue';
import {computed, ComputedRef, getCurrentInstance, onBeforeUnmount, Ref, ref, watch} from 'vue';
import {
  CAPABILITIES,
  Capability,
  CapabilityContext,
  CapabilityResult,
  CapabilityStatus,
  runCapability,
} from './capabilities';
import EventLog from '../components/EventLog.vue';
import {Bang, Check, Cross, Dash, Play, Spinner} from '../components/icons';
import SessionCard from '../components/SessionCard.vue';
import playgroundConfig from '../config';
import {EndpointGroup, ResolvedEndpoint, resolveEndpoints} from '../lib/endpoints';
import {logEvent} from '../lib/events';
import {serverHealth} from '../lib/health';

interface CapabilityState {
  note: string;
  status: CapabilityStatus;
}

type Filter = 'all' | 'pass' | 'fail' | 'idle' | 'unavailable';

interface LastRun {
  at: number;
  durationMs: number;
}

interface Stored {
  lastRun: LastRun | null;
  results: Record<string, CapabilityState>;
}

const RESULTS_KEY = 'playground:vue:results';

const readStored = (): Stored => {
  try {
    const raw: string | null = sessionStorage.getItem(RESULTS_KEY);

    if (raw) return JSON.parse(raw) as Stored;
  } catch {
    // Storage can be blocked; start fresh.
  }

  return {lastRun: null, results: {}};
};

const sdk = useThunderID();
const context: CapabilityContext = {
  app: getCurrentInstance()!.appContext.app,
  flowMeta: useFlowMeta(),
  i18n: useI18n(),
  sdk,
  theme: useTheme(),
  user: useUser(),
};

const stored: Stored = readStored();
const results: Ref<Record<string, CapabilityState>> = ref(stored.results);
const lastRun: Ref<LastRun | null> = ref(stored.lastRun);
const filter: Ref<Filter> = ref<Filter>('all');
const runningAll: Ref<boolean> = ref<boolean>(false);
const now: Ref<number> = ref<number>(Date.now());

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

const timer: number = window.setInterval(() => {
  now.value = Date.now();
}, 15000);

onBeforeUnmount(() => window.clearInterval(timer));

const statusOf = (id: string): CapabilityStatus => results.value[id]?.status ?? 'idle';

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

const sections: ComputedRef<[string, Capability[]][]> = computed(() =>
  Array.from(new Set(CAPABILITIES.map((capability: Capability) => capability.section)))
    .map((section: string): [string, Capability[]] => [
      section,
      CAPABILITIES.filter(
        (capability: Capability) =>
          capability.section === section && matchesFilter(statusOf(capability.id), filter.value),
      ),
    ])
    .filter(([, items]: [string, Capability[]]) => items.length > 0),
);

const host: string = playgroundConfig.baseUrl.replace(/^https?:\/\//, '');

const timeAgo = (at: number): string => {
  const seconds: number = Math.max(0, Math.round((now.value - at) / 1000));

  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;

  return `${Math.round(seconds / 3600)} h`;
};

const healthLabel: ComputedRef<string> = computed(() => {
  if (serverHealth.value.state === 'up') return 'Healthy';

  return serverHealth.value.state === 'down' ? 'Down' : 'Checking';
});

const healthColor: ComputedRef<string | undefined> = computed(() => {
  if (serverHealth.value.state === 'down') return 'var(--pg-err)';

  return serverHealth.value.state === 'up' ? 'var(--pg-ok)' : undefined;
});

const orNotSet = (value: string | undefined): string => (value === undefined || value === '' ? '(not set)' : value);

const configText: string = [
  ['baseUrl', orNotSet(sdk.baseUrl)],
  ['clientId', orNotSet(sdk.clientId)],
  ['applicationId', orNotSet(sdk.applicationId)],
  ['afterSignIn', sdk.afterSignInUrl ?? playgroundConfig.afterSignInUrl],
  ['afterSignOut', playgroundConfig.afterSignOutUrl],
  ['scopes', Array.isArray(sdk.scopes) ? sdk.scopes.join(' ') : String(sdk.scopes ?? '')],
  ['storage', playgroundConfig.storage ?? 'SDK default'],
]
  .map(([key, value]: string[]) => `${key.padEnd(14)}${value}`)
  .join('\n');

// Read back from the context, so this shows what the provider received, not only what .env holds.
const endpoints: ResolvedEndpoint[] = resolveEndpoints(sdk.baseUrl, sdk.endpoints);
const overrideCount: number = endpoints.filter((endpoint: ResolvedEndpoint) => endpoint.source === 'override').length;

const groupText = (group: EndpointGroup): string =>
  endpoints
    .filter((endpoint: ResolvedEndpoint) => endpoint.group === group)
    .map(
      (endpoint: ResolvedEndpoint) =>
        `${endpoint.key.padEnd(20)}${endpoint.url}${endpoint.source === 'override' ? '  (override)' : ''}`,
    )
    .join('\n');

const endpointsText: string = [
  '# Management APIs',
  groupText('management'),
  '',
  '# Flows and the signed-in user',
  groupText('selfService'),
].join('\n');
</script>

<template>
  <main class="pg-main">
    <div class="pg-heading">
      <div>
        <h1>Vue SDK playground</h1>
        <p>
          Exercise every capability of <span class="pg-accent">@thunderid/vue</span> against your local ThunderID
          server.
        </p>
      </div>
      <div class="pg-row">
        <button type="button" class="pg-btn" data-variant="primary" :disabled="runningAll" @click="runAll()">
          <Spinner v-if="runningAll" />
          <Play v-else />
          {{ runningAll ? 'Running checks' : 'Run all checks' }}
        </button>
      </div>
    </div>

    <div v-if="!playgroundConfig.clientId" class="pg-warning" role="status">
      No client ID configured. Copy <code>.env.example</code> to <code>.env</code>, set
      <code>VITE_THUNDERID_CLIENT_ID</code>, and restart <code>pnpm dev</code>. Checks that need a server session will
      fail until then.
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
        <div class="pg-stat-label">Server</div>
        <div class="pg-stat-value">
          <strong :style="{color: healthColor}">{{ healthLabel }}</strong>
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
        <div v-for="[section, items] in sections" :key="section">
          <div class="pg-section-label">{{ section }}</div>
          <div v-for="capability in items" :key="capability.id" class="pg-cap">
            <span class="pg-status-icon" :data-status="statusOf(capability.id)" :aria-label="statusOf(capability.id)">
              <Check v-if="statusOf(capability.id) === 'pass'" />
              <Cross v-else-if="statusOf(capability.id) === 'fail'" />
              <Spinner v-else-if="statusOf(capability.id) === 'running'" :size="12" />
              <Bang v-else-if="statusOf(capability.id) === 'unavailable'" />
              <Dash v-else />
            </span>
            <div class="pg-cap-text">
              <span class="pg-cap-name">{{ capability.name }}</span>
              <span class="pg-cap-api">{{ capability.api }}</span>
            </div>
            <span class="pg-cap-note" :data-status="statusOf(capability.id)">
              {{ results[capability.id]?.note ?? (statusOf(capability.id) === 'idle' ? 'not run yet' : '') }}
            </span>
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
            <h2>ThunderIDProvider</h2>
            <span class="pg-card-meta">.env</span>
          </div>
          <pre class="pg-pre">{{ configText }}</pre>
        </section>

        <section aria-label="Resource endpoints" class="pg-card">
          <div class="pg-card-head">
            <h2>Resource endpoints</h2>
            <span class="pg-card-meta">{{ overrideCount ? `${overrideCount} overridden` : 'from baseUrl' }}</span>
          </div>
          <pre class="pg-pre">{{ endpointsText }}</pre>
        </section>

        <EventLog />
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {computed, onMounted, ref, watch, type ComputedRef, type Ref} from 'vue';
import {useRuntimeConfig, useState, useThunderID} from '#imports';
import {describeError, logEvent} from '~/lib/events';
import {formatDuration} from '~/lib/jwt';
import {buildRoutes, loadSource, SERVER_MIDDLEWARE_FILE, type RouteGroup, type RouteSpec} from '~/lib/serverRoutes';
import {loadServerSession, serverSession, serverSessionError, useNow} from '~/lib/session';
import type {SsrSnapshot} from '~/lib/types';

type Identity = 'anonymous' | 'session' | 'expired';
type ResponseTab = 'body' | 'headers' | 'trace';

interface TraceStep {
  detail: string;
  label: string;
  ms: number;
  status: 'ok' | 'error' | 'info';
}

interface ResponseView {
  body: string;
  durationMs: number;
  headers: [string, string][];
  redirect: boolean;
  status: number;
  statusText: string;
  trace: TraceStep[];
}

const IDENTITIES: [Identity, string, string][] = [
  ['anonymous', 'Anonymous', 'no cookies'],
  ['session', 'Signed in', 'your session cookie'],
  ['expired', 'Expired access token', 'not available'],
];

const GROUPS: RouteGroup[] = ['Module routes', 'Playground server routes', 'Protected pages'];

const config = useRuntimeConfig().public.thunderid as {
  applicationId?: string;
  baseUrl?: string;
  endpoints?: {groups?: string};
};
const {isSignedIn} = useThunderID();
const ssr: Ref<SsrSnapshot | null> = useState<SsrSnapshot | null>('playground:ssr');
const now: Ref<number> = useNow();
const routes: RouteSpec[] = buildRoutes(
  config.applicationId,
  config.endpoints?.groups ?? `${(config.baseUrl ?? '').replace(/\/+$/, '')}/groups`,
);

const selectedId: Ref<string> = ref<string>(routes[0].id);
const identity: Ref<Identity> = ref<Identity>('anonymous');
const body: Ref<string> = ref<string>('');
const sending: Ref<boolean> = ref<boolean>(false);
const response: Ref<ResponseView | null> = ref<ResponseView | null>(null);
const sendError: Ref<string | null> = ref<string | null>(null);
const responseTab: Ref<ResponseTab> = ref<ResponseTab>('body');
const showCurl: Ref<boolean> = ref<boolean>(false);
const origin: Ref<string> = ref<string>('http://localhost:3002');
const sources: Ref<Record<string, string>> = ref<Record<string, string>>({});

const selected: ComputedRef<RouteSpec> = computed(
  () => routes.find((route: RouteSpec) => route.id === selectedId.value) ?? routes[0],
);

const select = (route: RouteSpec): void => {
  selectedId.value = route.id;
  body.value = route.body ?? '';
  response.value = null;
  sendError.value = null;
  showCurl.value = false;
  responseTab.value = 'body';
};

const loadSources = async (): Promise<void> => {
  const files: string[] = [
    SERVER_MIDDLEWARE_FILE,
    ...routes.map((route: RouteSpec) => route.sourceFile).filter((file?: string): file is string => !!file),
  ];
  const texts: string[] = await Promise.all(files.map((file: string) => loadSource(file)));

  sources.value = Object.fromEntries(files.map((file: string, index: number) => [file, texts[index]]));
};

onMounted(() => {
  origin.value = window.location.origin;
  void loadSources();
  identity.value = isSignedIn.value ? 'session' : 'anonymous';
  void loadServerSession();
});

watch(isSignedIn, () => {
  void loadServerSession();
});

const prettyBody = (text: string, contentType: string | null): string => {
  if (!text) return '';
  if (contentType?.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }

  return text.length > 4000 ? `${text.slice(0, 4000)}\n… (${text.length} characters)` : text;
};

const readTrace = (header: string | null): TraceStep[] => {
  if (!header) return [];

  try {
    return JSON.parse(decodeURIComponent(header)) as TraceStep[];
  } catch {
    return [];
  }
};

const send = async (): Promise<void> => {
  const route: RouteSpec = selected.value;

  if (identity.value === 'expired') return;

  sending.value = true;
  sendError.value = null;

  const started: number = performance.now();

  try {
    const result: Response = await fetch(route.path, {
      body: route.method === 'GET' ? undefined : body.value,
      credentials: identity.value === 'anonymous' ? 'omit' : 'same-origin',
      headers: route.contentType ? {'Content-Type': route.contentType} : undefined,
      method: route.method,
      redirect: 'manual',
    });
    const durationMs: number = Math.round(performance.now() - started);
    const redirect: boolean = result.type === 'opaqueredirect';
    const text: string = redirect ? '' : await result.text();

    response.value = {
      body: redirect
        ? 'The server answered with a redirect. fetch() hides the target of a redirect; the browser would follow it.'
        : prettyBody(text, result.headers.get('content-type')),
      durationMs,
      headers: Array.from(result.headers.entries()),
      redirect,
      status: result.status,
      statusText: result.statusText,
      trace: readTrace(result.headers.get('x-playground-trace')),
    };
    logEvent(
      `${route.method} ${route.path}`,
      redirect ? 'redirect' : `${result.status} as ${identity.value}`,
      redirect || result.ok ? 'ok' : 'error',
    );

    if (route.destructive || route.id === 'signin-post') void loadServerSession();
  } catch (error) {
    sendError.value = describeError(error);
    logEvent(`${route.method} ${route.path}`, sendError.value, 'error');
  } finally {
    sending.value = false;
  }
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const curl: ComputedRef<string> = computed(() => {
  const route: RouteSpec = selected.value;
  const lines: string[] = [];

  if (identity.value === 'session') {
    lines.push('# The session cookie is HttpOnly: copy it from the browser DevTools into SESSION_COOKIE.');
  }
  lines.push(`curl -i -X ${route.method} ${shellQuote(`${origin.value}${route.path}`)}`);
  if (identity.value === 'session') lines.push('  -H "Cookie: $SESSION_COOKIE"');
  if (route.contentType) lines.push(`  -H ${shellQuote(`Content-Type: ${route.contentType}`)}`);
  if (route.method !== 'GET' && body.value) lines.push(`  --data ${shellQuote(body.value.replace(/\s*\n\s*/g, ' '))}`);

  return lines
    .map((line: string, index: number) => (index < lines.length - 1 && !line.startsWith('#') ? `${line} \\` : line))
    .join('\n');
});

const statusKind: ComputedRef<'ok' | 'warn' | 'err'> = computed(() => {
  if (!response.value) return 'ok';
  if (response.value.redirect || (response.value.status >= 300 && response.value.status < 400)) return 'warn';

  return response.value.status < 400 ? 'ok' : 'err';
});

const sessionClaims: ComputedRef<Record<string, unknown> | null> = computed(
  () => serverSession.value?.idTokenClaims ?? serverSession.value?.accessTokenClaims ?? null,
);
</script>

<template>
  <main class="pg-main">
    <div class="pg-heading">
      <div>
        <h1>Server</h1>
        <p>
          What <span class="pg-accent">@thunderid/nuxt</span> does on the Nuxt server: the context its Nitro plugin
          builds for each render, the session cookie behind <span class="pg-mono">useServerSession()</span>, and every
          route it mounts, ready to call.
        </p>
      </div>
    </div>

    <div class="pg-grid-2">
      <section class="pg-card" aria-label="Server-side context">
        <div class="pg-card-head">
          <div>
            <h2>Server-side context</h2>
            <div class="pg-hook-sig">getThunderIDContext(event) during the server render</div>
          </div>
          <span class="pg-pill" :data-state="ssr?.present ? 'ok' : 'warn'">
            {{ ssr?.present ? 'Populated' : 'Empty' }}
          </span>
        </div>
        <div class="pg-card-body">
          <dl v-if="ssr" class="pg-dl">
            <dt>rendered</dt>
            <dd>{{ ssr.path }}</dd>
            <dt>isSignedIn</dt>
            <dd>{{ ssr.present ? String(ssr.isSignedIn) : 'unknown' }}</dd>
            <dt>session</dt>
            <dd>{{ ssr.session ? `${ssr.session.sessionId.slice(0, 8)}…, sub ${ssr.session.sub}` : 'null' }}</dd>
            <dt>scopes</dt>
            <dd>{{ ssr.session?.scopes ?? '-' }}</dd>
            <dt>ssr.user</dt>
            <dd>{{ ssr.userLoaded ? 'prefetched' : 'null' }}</dd>
            <dt>ssr.userProfile</dt>
            <dd>{{ ssr.userProfileLoaded ? 'prefetched' : 'null' }}</dd>
            <dt>flowMeta</dt>
            <dd>{{ ssr.flowMeta ? 'prefetched' : 'null' }}</dd>
            <dt>resolvedBaseUrl</dt>
            <dd>{{ ssr.resolvedBaseUrl ?? '-' }}</dd>
          </dl>
          <p v-if="!ssr" class="pg-empty">This page was not server rendered. Reload it to capture the context.</p>
          <p v-else-if="!ssr.present" class="pg-cap-note" data-status="fail">
            The ThunderID Nitro plugin left the context empty. It refuses to initialize without a base URL and a client
            ID or application ID; the Nuxt server log says which.
          </p>
          <p class="pg-empty">
            Recorded by <span class="pg-mono">{{ SERVER_MIDDLEWARE_FILE }}</span> and handed to the browser in the Nuxt
            payload, seeded alongside the module's own <span class="pg-mono">useState</span> keys.
          </p>
        </div>
      </section>

      <section class="pg-card" aria-label="Server session">
        <div class="pg-card-head">
          <div>
            <h2>Server session</h2>
            <div class="pg-hook-sig">useServerSession(event) · GET /api/playground/session</div>
          </div>
          <button type="button" class="pg-btn" data-size="sm" @click="loadServerSession">Reload</button>
        </div>
        <div class="pg-card-body">
          <p v-if="serverSessionError" class="pg-cap-note" data-status="fail">{{ serverSessionError }}</p>
          <template v-else-if="serverSession?.signedIn">
            <div class="pg-stats pg-stats-tight">
              <div class="pg-stat">
                <div class="pg-stat-label">Access token</div>
                <div class="pg-stat-value">
                  <strong>
                    {{
                      serverSession.accessTokenExpiresAt && now
                        ? formatDuration(serverSession.accessTokenExpiresAt * 1000 - now)
                        : 'Unknown'
                    }}
                  </strong>
                  <span>left</span>
                </div>
              </div>
              <div class="pg-stat">
                <div class="pg-stat-label">Refresh token</div>
                <div class="pg-stat-value">
                  <strong>{{ serverSession.hasRefreshToken ? 'Present' : 'None' }}</strong>
                  <span>stays on the server</span>
                </div>
              </div>
            </div>
            <ClaimsTable v-if="sessionClaims" :claims="sessionClaims" :now="now" />
          </template>
          <p v-else class="pg-empty">
            No session cookie. Sign in, then come back to see the session the server holds: expiry, scopes, and the
            decoded ID token claims. Raw tokens never reach the browser.
          </p>
        </div>
      </section>
    </div>

    <section class="pg-card pg-api" aria-label="API explorer">
      <aside class="pg-api-routes" aria-label="Routes">
        <div v-for="group in GROUPS" :key="group">
          <div class="pg-section-label">{{ group }}</div>
          <button
            v-for="route in routes.filter((candidate: RouteSpec) => candidate.group === group)"
            :key="route.id"
            type="button"
            class="pg-route"
            :aria-current="route.id === selected.id ? 'true' : undefined"
            @click="select(route)"
          >
            <span class="pg-method" :data-method="route.method">{{ route.method }}</span>
            <span class="pg-route-path">{{ route.path }}</span>
            <span v-if="route.locked" class="pg-route-lock" title="Needs a session">session</span>
          </button>
        </div>
      </aside>

      <div class="pg-api-main">
        <div class="pg-api-title">
          <span class="pg-method" data-size="lg" :data-method="selected.method">{{ selected.method }}</span>
          <h2 class="pg-mono">{{ selected.path }}</h2>
          <span class="pg-card-meta">{{ selected.summary }}</span>
        </div>
        <p class="pg-api-desc">{{ selected.description }}</p>

        <div class="pg-api-columns">
          <div class="pg-api-request">
            <div class="pg-field-label">Send as</div>
            <div role="radiogroup" aria-label="Send as" class="pg-identities">
              <button
                v-for="[id, label, hint] in IDENTITIES"
                :key="id"
                type="button"
                role="radio"
                :aria-checked="identity === id"
                :disabled="id === 'expired' || (id === 'session' && !isSignedIn)"
                :title="
                  id === 'expired'
                    ? 'The session cookie is signed with THUNDERID_SESSION_SECRET, and @thunderid/nuxt has no public API to issue an expired copy of it.'
                    : undefined
                "
                @click="identity = id"
              >
                <strong>{{ label }}</strong>
                <span>{{ id === 'session' && !isSignedIn ? 'sign in first' : hint }}</span>
              </button>
            </div>

            <label v-if="selected.method !== 'GET'" class="pg-body-field">
              <span class="pg-field-label">Body · {{ selected.contentType ?? 'none' }}</span>
              <textarea v-model="body" class="pg-input" rows="6" spellcheck="false" />
            </label>

            <p v-if="selected.destructive && identity === 'session'" class="pg-cap-note" data-status="unavailable">
              Sending this as your session signs you out.
            </p>

            <div class="pg-row">
              <button type="button" class="pg-btn" data-variant="primary" :disabled="sending" @click="send">
                <PgIcon :name="sending ? 'spinner' : 'play'" />
                Send request
              </button>
              <button type="button" class="pg-btn" @click="showCurl = !showCurl">Copy as cURL</button>
            </div>
            <pre v-if="showCurl" class="pg-pre">{{ curl }}</pre>

            <div class="pg-field-label">
              Handler <span class="pg-handler-file">{{ selected.handler }}</span>
            </div>
            <pre v-if="selected.sourceFile" class="pg-source">{{ sources[selected.sourceFile] ?? '' }}</pre>
            <p v-else class="pg-empty">
              Mounted by the module with <span class="pg-mono">addServerHandler()</span>. Its source ships in the
              package; the SDK trace shows what the playground's server middleware saw before it ran.
            </p>
          </div>

          <div class="pg-api-response">
            <div class="pg-card-head pg-api-response-head">
              <h2>Response</h2>
              <span v-if="response" class="pg-status-badge" :data-kind="statusKind">
                {{ response.redirect ? 'Redirect' : `${response.status} ${response.statusText}` }}
              </span>
              <span v-if="response" class="pg-card-meta">{{ response.durationMs }} ms</span>
              <div class="pg-spacer" />
              <div role="tablist" class="pg-tabs pg-tabs-inline">
                <button
                  v-for="[id, label] in [
                    ['body', 'Body'],
                    ['headers', 'Headers'],
                    ['trace', 'SDK trace'],
                  ] as [ResponseTab, string][]"
                  :key="id"
                  type="button"
                  role="tab"
                  :aria-selected="responseTab === id"
                  @click="responseTab = id"
                >
                  {{ label }}
                  <span v-if="id === 'trace' && response?.trace.length" class="pg-count">
                    {{ response.trace.length }}
                  </span>
                </button>
              </div>
            </div>

            <p v-if="sendError" class="pg-cap-note" data-status="fail">{{ sendError }}</p>
            <div v-else-if="!response" class="pg-api-empty">
              <p><strong>Send the request to see the response.</strong></p>
              <p>
                The SDK trace shows each step on the server: the playground's server middleware, the session cookie as
                <span class="pg-mono">useServerSession()</span> sees it, and the SDK calls the handler made.
              </p>
            </div>
            <template v-else>
              <pre v-if="responseTab === 'body'" class="pg-source">{{ response.body || '(empty body)' }}</pre>
              <dl v-if="responseTab === 'headers'" class="pg-dl pg-headers">
                <template v-for="[name, value] in response.headers" :key="name">
                  <dt>{{ name }}</dt>
                  <dd>{{ value }}</dd>
                </template>
                <p v-if="response.headers.length === 0" class="pg-empty">fetch() exposes no headers of a redirect.</p>
              </dl>
              <ol v-if="responseTab === 'trace'" class="pg-trace">
                <li v-for="(step, index) in response.trace" :key="index" :data-status="step.status">
                  <span class="pg-trace-ms">+{{ step.ms }} ms</span>
                  <span class="pg-trace-label">{{ step.label }}</span>
                  <span class="pg-trace-detail">{{ step.detail }}</span>
                </li>
                <li v-if="response.trace.length === 0" class="pg-empty">
                  No trace: the request did not reach an API route (pages and redirects carry none).
                </li>
              </ol>
            </template>
          </div>
        </div>
      </div>
    </section>

    <details class="pg-card pg-details">
      <summary>
        <span class="pg-mono">{{ SERVER_MIDDLEWARE_FILE }}</span>
        <span class="pg-card-meta">createRouteMatcher() · useServerSession() · getThunderIDContext()</span>
      </summary>
      <pre class="pg-source">{{ sources[SERVER_MIDDLEWARE_FILE] ?? '' }}</pre>
    </details>
  </main>
</template>

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {CAPABILITIES, Capability, CapabilityResult, CapabilityStatus, runCapability} from './capabilities';
import {eventLog} from '../components/eventLog';
import {bang, check, cross, dash, play, spinner} from '../components/icons';
import {sessionCard} from '../components/sessionCard';
import playgroundConfig from '../config';
import {sdkConfig} from '../lib/client';
import {Child, h, mount} from '../lib/dom';
import {resolveEndpoints, ResolvedEndpoint} from '../lib/endpoints';
import {logEvent} from '../lib/events';
import {healthStore} from '../lib/health';
import {Scope} from '../lib/store';

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

const RESULTS_KEY = 'playground:browser:results';

const readStored = (): Stored => {
  try {
    const raw: string | null = sessionStorage.getItem(RESULTS_KEY);

    if (raw) return JSON.parse(raw) as Stored;
  } catch {
    // Storage can be blocked; start fresh.
  }

  return {lastRun: null, results: {}};
};

const writeStored = (stored: Stored): void => {
  try {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify(stored));
  } catch {
    // Persisting results is a convenience only.
  }
};

const matchesFilter = (status: CapabilityStatus, filter: Filter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'idle') return status === 'idle' || status === 'skip';

  return status === filter;
};

const statusIcon = (status: CapabilityStatus): HTMLElement => {
  let glyph: Child = dash();

  if (status === 'pass') glyph = check();
  if (status === 'fail') glyph = cross();
  if (status === 'running') glyph = spinner(12);
  if (status === 'unavailable') glyph = bang();

  return h('span', {'aria-label': status, className: 'pg-status-icon', 'data-status': status}, glyph);
};

const timeAgo = (at: number, now: number): string => {
  const seconds: number = Math.max(0, Math.round((now - at) / 1000));

  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;

  return `${Math.round(seconds / 3600)} h`;
};

const orNotSet = (value: string | undefined): string => (value === undefined || value === '' ? '(not set)' : value);

const stat = (label: string, value: Child, sub: string, color?: string): HTMLElement =>
  h(
    'div',
    {className: 'pg-stat'},
    h('div', {className: 'pg-stat-label'}, label),
    h(
      'div',
      {className: 'pg-stat-value'},
      h('strong', {style: color ? `color: ${color}` : undefined}, value),
      h('span', {}, sub),
    ),
  );

export const renderOverview = (root: HTMLElement, scope: Scope): void => {
  const stored: Stored = readStored();
  let {results, lastRun} = stored;
  let filter: Filter = 'all';
  let runningAll = false;

  const runAllButton: HTMLButtonElement = h('button', {className: 'pg-btn', 'data-variant': 'primary', type: 'button'});
  const stats: HTMLElement = h('div', {className: 'pg-stats'});
  const capsHead: HTMLElement = h('div', {className: 'pg-card-head'});
  const capsBody: HTMLElement = h('div', {});

  const statusOf = (id: string): CapabilityStatus => results[id]?.status ?? 'idle';

  const render = (): void => {
    writeStored({lastRun, results});

    runAllButton.disabled = runningAll;
    mount(runAllButton, runningAll ? spinner() : play(), runningAll ? 'Running checks' : 'Run all checks');

    const counts: Record<CapabilityStatus, number> = {fail: 0, idle: 0, pass: 0, running: 0, skip: 0, unavailable: 0};

    CAPABILITIES.forEach((capability: Capability) => {
      counts[statusOf(capability.id)] += 1;
    });

    const total: number = CAPABILITIES.length;
    const health = healthStore.get();
    const now: number = Date.now();
    let healthColor: string | undefined;

    if (health.state === 'down') healthColor = 'var(--pg-err)';
    if (health.state === 'up') healthColor = 'var(--pg-ok)';

    mount(
      stats,
      stat('Capabilities passing', `${counts.pass} / ${total}`, `${Math.round((counts.pass / total) * 100)}%`),
      stat(
        'Failing',
        String(counts.fail),
        counts.fail ? 'needs attention' : 'all good',
        counts.fail ? 'var(--pg-err)' : 'var(--pg-ok)',
      ),
      stat(
        'Server',
        health.state === 'up' ? 'Healthy' : health.state === 'down' ? 'Down' : 'Checking',
        playgroundConfig.baseUrl.replace(/^https?:\/\//, ''),
        healthColor,
      ),
      stat(
        'Last full run',
        lastRun ? timeAgo(lastRun.at, now) : 'Never',
        lastRun ? `ago · ${(lastRun.durationMs / 1000).toFixed(1)} s` : 'press Run all checks',
      ),
    );

    const filters: [Filter, string][] = [
      ['all', `All ${total}`],
      ['pass', `Passed ${counts.pass}`],
      ['fail', `Failed ${counts.fail}`],
      ['idle', `Not run ${counts.idle + counts.skip}`],
      ['unavailable', `Unavailable ${counts.unavailable}`],
    ];

    mount(
      capsHead,
      h('h2', {}, 'Capabilities'),
      h(
        'div',
        {'aria-label': 'Filter', className: 'pg-segmented', role: 'group'},
        filters.map(([id, label]: [Filter, string]) =>
          h(
            'button',
            {
              'aria-pressed': String(filter === id),
              onclick: () => {
                filter = id;
                render();
              },
              type: 'button',
            },
            label,
          ),
        ),
      ),
    );

    const sections: string[] = Array.from(new Set(CAPABILITIES.map((capability: Capability) => capability.section)));

    mount(
      capsBody,
      sections.map((section: string) => {
        const items: Capability[] = CAPABILITIES.filter(
          (capability: Capability) => capability.section === section && matchesFilter(statusOf(capability.id), filter),
        );

        if (!items.length) return null;

        return h(
          'div',
          {},
          h('div', {className: 'pg-section-label'}, section),
          items.map((capability: Capability) => {
            const status: CapabilityStatus = statusOf(capability.id);
            const note: string = results[capability.id]?.note ?? (status === 'idle' ? 'not run yet' : '');

            return h(
              'div',
              {className: 'pg-cap'},
              statusIcon(status),
              h(
                'div',
                {className: 'pg-cap-text'},
                h('span', {className: 'pg-cap-name'}, capability.name),
                h('span', {className: 'pg-cap-api'}, capability.api),
              ),
              h('span', {className: 'pg-cap-note', 'data-status': status}, note),
              h(
                'button',
                {
                  'aria-label': `Run ${capability.name}`,
                  className: 'pg-btn',
                  'data-size': 'sm',
                  disabled: status === 'running',
                  onclick: () => void runOne(capability, true),
                  type: 'button',
                },
                status === 'idle' ? 'Run' : 'Re-run',
              ),
            );
          }),
        );
      }),
      CAPABILITIES.every((capability: Capability) => !matchesFilter(statusOf(capability.id), filter)) &&
        h('p', {className: 'pg-empty'}, 'No capabilities match this filter.'),
    );
  };

  const setOne = (id: string, state: CapabilityState): void => {
    results = {...results, [id]: state};
    render();
  };

  const runOne = async (capability: Capability, interactive: boolean): Promise<void> => {
    setOne(capability.id, {note: 'running…', status: 'running'});

    const result: CapabilityResult = await runCapability(capability, {interactive});

    setOne(capability.id, result);
    logEvent(`check:${capability.id}`, `${result.status}: ${result.note}`, result.status === 'fail' ? 'error' : 'ok');
  };

  const runAll = async (): Promise<void> => {
    if (runningAll) return;

    runningAll = true;
    logEvent('checks:started', `${CAPABILITIES.length} capabilities`, 'info');

    const started: number = Date.now();

    results = Object.fromEntries(
      CAPABILITIES.map((capability: Capability) => [capability.id, {note: 'queued', status: 'running'}]),
    );
    render();

    for (const capability of CAPABILITIES) {
      // Sequential on purpose: several checks depend on the state earlier ones settle.
      await runOne(capability, false);
    }

    const finished: number = Date.now();

    lastRun = {at: finished, durationMs: finished - started};
    runningAll = false;
    render();
    logEvent('checks:finished', `${((finished - started) / 1000).toFixed(1)} s`, 'ok');
  };

  runAllButton.addEventListener('click', () => void runAll());

  const configText: string = [
    ['baseUrl', orNotSet(sdkConfig.baseUrl)],
    ['clientId', orNotSet(sdkConfig.clientId)],
    ['applicationId', orNotSet(sdkConfig.applicationId)],
    ['afterSignInUrl', orNotSet(sdkConfig.afterSignInUrl)],
    ['afterSignOutUrl', orNotSet(sdkConfig.afterSignOutUrl)],
    ['scopes', playgroundConfig.scopes.join(' ')],
    ['storage', playgroundConfig.storage ?? 'SDK default'],
  ]
    .map(([key, value]: string[]) => `${key.padEnd(17)}${value}`)
    .join('\n');

  const shortUrl = (url: string): string => url.replace(/^https?:\/\//, '');
  const endpointsText = (group: ResolvedEndpoint['group']): string =>
    resolveEndpoints(sdkConfig)
      .filter((endpoint: ResolvedEndpoint) => endpoint.group === group)
      .map(
        (endpoint: ResolvedEndpoint) =>
          `${endpoint.key.padEnd(19)}${shortUrl(endpoint.url)}${endpoint.source === 'override' ? '  (override)' : ''}`,
      )
      .join('\n');

  render();
  scope.add(healthStore.subscribe(render));
  scope.interval(render, 15000);

  mount(
    root,
    h(
      'main',
      {className: 'pg-main'},
      h(
        'div',
        {className: 'pg-heading'},
        h(
          'div',
          {},
          h('h1', {}, 'Browser SDK playground'),
          h(
            'p',
            {},
            'Exercise every capability of ',
            h('span', {className: 'pg-accent'}, '@thunderid/browser'),
            ' and its ThunderIDBrowserClient against your local ThunderID server.',
          ),
        ),
        h('div', {className: 'pg-row'}, runAllButton),
      ),
      !playgroundConfig.clientId &&
        h(
          'div',
          {className: 'pg-warning', role: 'status'},
          'No client ID configured. Copy ',
          h('code', {}, '.env.example'),
          ' to ',
          h('code', {}, '.env'),
          ', set ',
          h('code', {}, 'VITE_THUNDERID_CLIENT_ID'),
          ', and restart ',
          h('code', {}, 'pnpm dev'),
          '. Checks that need a server session will fail until then.',
        ),
      stats,
      h(
        'div',
        {className: 'pg-columns'},
        h('section', {'aria-label': 'Capability checks', className: 'pg-card pg-col-main'}, capsHead, capsBody),
        h(
          'div',
          {className: 'pg-col-side'},
          sessionCard(scope),
          h(
            'section',
            {'aria-label': 'Configuration', className: 'pg-card'},
            h(
              'div',
              {className: 'pg-card-head'},
              h('h2', {}, 'ThunderIDBrowserClient'),
              h('span', {className: 'pg-card-meta'}, 'initialize() · .env'),
            ),
            h('pre', {className: 'pg-pre'}, configText),
          ),
          h(
            'section',
            {'aria-label': 'Resolved endpoints', className: 'pg-card'},
            h(
              'div',
              {className: 'pg-card-head'},
              h('h2', {}, 'Resolved endpoints'),
              h(
                'span',
                {className: 'pg-card-meta'},
                Object.keys(playgroundConfig.endpoints).length
                  ? `${Object.keys(playgroundConfig.endpoints).length} overridden`
                  : 'no overrides',
              ),
            ),
            h('div', {className: 'pg-section-label'}, 'Management API'),
            h('pre', {className: 'pg-pre'}, endpointsText('management')),
            h('div', {className: 'pg-section-label'}, 'Sign-in and self-service'),
            h('pre', {className: 'pg-pre'}, endpointsText('selfService')),
          ),
          eventLog(scope),
        ),
      ),
    ),
  );
};

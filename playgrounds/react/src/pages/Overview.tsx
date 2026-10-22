// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useI18n, useTheme, useThunderID, useUser} from '@thunderid/react';
import {ReactElement, ReactNode, useEffect, useRef, useState} from 'react';
import {
  CAPABILITIES,
  Capability,
  CapabilityContext,
  CapabilityResult,
  CapabilityStatus,
  runCapability,
} from './capabilities';
import EventLog from '../components/EventLog';
import {Bang, Check, Cross, Dash, Play, Spinner} from '../components/Icons';
import SessionCard from '../components/SessionCard';
import playgroundConfig from '../config';
import {logEvent} from '../lib/events';
import {useServerHealth} from '../lib/health';
import {NEW_MANAGEMENT_KEYS, resolveManagementEndpoints, ResolvedEndpoint} from '../lib/management';

interface CapabilityState {
  note: string;
  status: CapabilityStatus;
}

type Filter = 'all' | 'pass' | 'fail' | 'idle' | 'unavailable';

interface LastRun {
  at: number;
  durationMs: number;
}

const RESULTS_KEY = 'playground:react:results';

const readStored = (): {lastRun: LastRun | null; results: Record<string, CapabilityState>} => {
  try {
    const raw: string | null = sessionStorage.getItem(RESULTS_KEY);

    if (raw) return JSON.parse(raw) as {lastRun: LastRun | null; results: Record<string, CapabilityState>};
  } catch {
    // Storage can be blocked; start fresh.
  }

  return {lastRun: null, results: {}};
};

const writeStored = (results: Record<string, CapabilityState>, lastRun: LastRun | null): void => {
  try {
    sessionStorage.setItem(RESULTS_KEY, JSON.stringify({lastRun, results}));
  } catch {
    // Persisting results is a convenience only.
  }
};

const orNotSet = (value: string | undefined): string => (value === undefined || value === '' ? '(not set)' : value);

const matchesFilter = (status: CapabilityStatus, filter: Filter): boolean => {
  if (filter === 'all') return true;
  if (filter === 'idle') return status === 'idle' || status === 'skip';

  return status === filter;
};

const StatusIcon = ({status}: {status: CapabilityStatus}): ReactElement => (
  <span className="pg-status-icon" data-status={status} aria-label={status}>
    {status === 'pass' && <Check />}
    {status === 'fail' && <Cross />}
    {status === 'running' && <Spinner size={12} />}
    {status === 'unavailable' && <Bang />}
    {(status === 'idle' || status === 'skip') && <Dash />}
  </span>
);

const timeAgo = (at: number, now: number): string => {
  const seconds: number = Math.max(0, Math.round((now - at) / 1000));

  if (seconds < 60) return `${seconds} s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;

  return `${Math.round(seconds / 3600)} h`;
};

// Offers a line break after each `/`, so a long URL wraps at a path boundary rather than mid-word.
const breakable = (value: string): ReactNode[] => {
  const nodes: ReactNode[] = [];
  let offset = 0;

  value.split(/(?<=\/)/).forEach((part: string) => {
    // The offset of each part is unique within the value, so it keys the <wbr> before it.
    if (offset) nodes.push(<wbr key={offset} />);
    nodes.push(part);
    offset += part.length;
  });

  return nodes;
};

const Overview = (): ReactElement => {
  const sdk = useThunderID();
  const user = useUser();
  const i18n = useI18n();
  const theme = useTheme();
  const health = useServerHealth();

  const [stored] = useState(readStored);
  const [results, setResults] = useState<Record<string, CapabilityState>>(stored.results);
  const [lastRun, setLastRun] = useState<LastRun | null>(stored.lastRun);
  const [filter, setFilter] = useState<Filter>('all');
  const [runningAll, setRunningAll] = useState<boolean>(false);
  const [now, setNow] = useState<number>(() => Date.now());

  const contextRef = useRef<CapabilityContext>({i18n, sdk, theme, user});

  useEffect(() => {
    contextRef.current = {i18n, sdk, theme, user};
  });

  useEffect(() => {
    writeStored(results, lastRun);
  }, [results, lastRun]);

  useEffect(() => {
    const timer: number = window.setInterval(() => setNow(Date.now()), 15000);

    return () => window.clearInterval(timer);
  }, []);

  const getContext = (): CapabilityContext => contextRef.current;

  const statusOf = (id: string): CapabilityStatus => results[id]?.status ?? 'idle';

  const setOne = (id: string, state: CapabilityState): void =>
    setResults((previous: Record<string, CapabilityState>) => ({...previous, [id]: state}));

  const runOne = async (capability: Capability, interactive: boolean): Promise<CapabilityResult> => {
    setOne(capability.id, {note: 'running…', status: 'running'});

    const result: CapabilityResult = await runCapability(capability, getContext, {interactive});

    setOne(capability.id, result);
    logEvent(`check:${capability.id}`, `${result.status}: ${result.note}`, result.status === 'fail' ? 'error' : 'ok');

    return result;
  };

  const runAll = async (): Promise<void> => {
    if (runningAll) return;

    setRunningAll(true);
    logEvent('checks:started', `${CAPABILITIES.length} capabilities`, 'info');

    const started: number = Date.now();

    setResults(
      Object.fromEntries(
        CAPABILITIES.map((capability: Capability) => [capability.id, {note: 'queued', status: 'running'}]),
      ),
    );

    for (const capability of CAPABILITIES) {
      // Sequential on purpose: several checks depend on the state earlier ones settle.
      await runOne(capability, false);
    }

    const finished: number = Date.now();

    setLastRun({at: finished, durationMs: finished - started});
    setNow(finished);
    setRunningAll(false);
    logEvent('checks:finished', `${((finished - started) / 1000).toFixed(1)} s`, 'ok');
  };

  const counts: Record<CapabilityStatus, number> = {fail: 0, idle: 0, pass: 0, running: 0, skip: 0, unavailable: 0};

  CAPABILITIES.forEach((capability: Capability) => {
    counts[statusOf(capability.id)] += 1;
  });

  const total: number = CAPABILITIES.length;
  const filters: [Filter, string][] = [
    ['all', `All ${total}`],
    ['pass', `Passed ${counts.pass}`],
    ['fail', `Failed ${counts.fail}`],
    ['idle', `Not run ${counts.idle + counts.skip}`],
    ['unavailable', `Unavailable ${counts.unavailable}`],
  ];

  const sections: string[] = Array.from(new Set(CAPABILITIES.map((capability: Capability) => capability.section)));
  const host: string = playgroundConfig.baseUrl.replace(/^https?:\/\//, '');

  const configRows: [string, string][] = [
    ['baseUrl', orNotSet(sdk.baseUrl)],
    ['clientId', orNotSet(sdk.clientId)],
    ['applicationId', orNotSet(sdk.applicationId)],
    ['afterSignIn', sdk.afterSignInUrl ?? playgroundConfig.afterSignInUrl],
    ['afterSignOut', playgroundConfig.afterSignOutUrl],
    ['scopes', Array.isArray(sdk.scopes) ? sdk.scopes.join(' ') : String(sdk.scopes ?? '')],
    ['storage', playgroundConfig.storage ?? 'SDK default'],
  ];

  // Where each management collection resolves, the way useManagementEndpoint() does it.
  const endpoints: ResolvedEndpoint[] = resolveManagementEndpoints(sdk.baseUrl, sdk.endpoints);
  const overrideCount: number = endpoints.filter((endpoint: ResolvedEndpoint) => endpoint.override).length;

  return (
    <main className="pg-main">
      <div className="pg-heading">
        <div>
          <h1>React SDK playground</h1>
          <p>
            Exercise every capability of <span className="pg-accent">@thunderid/react</span> against your local
            ThunderID server.
          </p>
        </div>
        <div className="pg-row">
          <button
            type="button"
            className="pg-btn"
            data-variant="primary"
            onClick={() => void runAll()}
            disabled={runningAll}
          >
            {runningAll ? <Spinner /> : <Play />}
            {runningAll ? 'Running checks' : 'Run all checks'}
          </button>
        </div>
      </div>

      {!playgroundConfig.clientId && (
        <div className="pg-warning" role="status">
          No client ID configured. Copy <code>.env.example</code> to <code>.env</code>, set{' '}
          <code>VITE_THUNDERID_CLIENT_ID</code>, and restart <code>pnpm dev</code>. Checks that need a server session
          will fail until then.
        </div>
      )}

      <div className="pg-stats">
        <div className="pg-stat">
          <div className="pg-stat-label">Capabilities passing</div>
          <div className="pg-stat-value">
            <strong>
              {counts.pass} / {total}
            </strong>
            <span>{Math.round((counts.pass / total) * 100)}%</span>
          </div>
        </div>
        <div className="pg-stat">
          <div className="pg-stat-label">Failing</div>
          <div className="pg-stat-value">
            <strong style={{color: counts.fail ? 'var(--pg-err)' : 'var(--pg-ok)'}}>{counts.fail}</strong>
            <span>{counts.fail ? 'needs attention' : 'all good'}</span>
          </div>
        </div>
        <div className="pg-stat">
          <div className="pg-stat-label">Server</div>
          <div className="pg-stat-value">
            <strong
              style={{
                color: health.state === 'down' ? 'var(--pg-err)' : health.state === 'up' ? 'var(--pg-ok)' : undefined,
              }}
            >
              {health.state === 'up' ? 'Healthy' : health.state === 'down' ? 'Down' : 'Checking'}
            </strong>
            <span>{host}</span>
          </div>
        </div>
        <div className="pg-stat">
          <div className="pg-stat-label">Last full run</div>
          <div className="pg-stat-value">
            <strong>{lastRun ? timeAgo(lastRun.at, now) : 'Never'}</strong>
            <span>{lastRun ? `ago · ${(lastRun.durationMs / 1000).toFixed(1)} s` : 'press Run all checks'}</span>
          </div>
        </div>
      </div>

      <div className="pg-columns">
        <section aria-label="Capability checks" className="pg-card pg-col-main">
          <div className="pg-card-head">
            <h2>Capabilities</h2>
            <div role="group" aria-label="Filter" className="pg-segmented">
              {filters.map(([id, label]: [Filter, string]) => (
                <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {sections.map((section: string) => {
            const items: Capability[] = CAPABILITIES.filter(
              (capability: Capability) =>
                capability.section === section && matchesFilter(statusOf(capability.id), filter),
            );

            if (!items.length) return null;

            return (
              <div key={section}>
                <div className="pg-section-label">{section}</div>
                {items.map((capability: Capability) => {
                  const status: CapabilityStatus = statusOf(capability.id);
                  const note: string = results[capability.id]?.note ?? (status === 'idle' ? 'not run yet' : '');

                  return (
                    <div key={capability.id} className="pg-cap">
                      <StatusIcon status={status} />
                      <div className="pg-cap-text">
                        <span className="pg-cap-name">{capability.name}</span>
                        <span className="pg-cap-api">{capability.api}</span>
                      </div>
                      <span className="pg-cap-note" data-status={status}>
                        {note}
                      </span>
                      <button
                        type="button"
                        className="pg-btn"
                        data-size="sm"
                        aria-label={`Run ${capability.name}`}
                        disabled={status === 'running'}
                        onClick={() => void runOne(capability, true)}
                      >
                        {status === 'idle' ? 'Run' : 'Re-run'}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {CAPABILITIES.every((capability: Capability) => !matchesFilter(statusOf(capability.id), filter)) && (
            <p className="pg-empty">No capabilities match this filter.</p>
          )}
        </section>

        <div className="pg-col-side">
          <SessionCard />

          <section aria-label="Configuration" className="pg-card">
            <div className="pg-card-head">
              <h2>ThunderIDProvider</h2>
              <span className="pg-card-meta">.env</span>
            </div>
            <dl className="pg-kv">
              {configRows.map(([key, value]: [string, string]) => (
                <div key={key} className="pg-kv-row">
                  <dt>{key}</dt>
                  <dd title={value}>{breakable(value)}</dd>
                </div>
              ))}
            </dl>
            <div className="pg-section-label">
              endpoints · {overrideCount ? `${overrideCount} overridden` : 'all under baseUrl'}
            </div>
            <dl className="pg-kv">
              {endpoints.map(({key, override, url}: ResolvedEndpoint) => (
                <div key={key} className="pg-kv-row">
                  <dt>{key}</dt>
                  <dd title={url}>
                    {breakable(url)}
                    {override && <span className="pg-kv-tag"> override</span>}
                    {NEW_MANAGEMENT_KEYS.includes(key) && <span className="pg-kv-tag"> new</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <EventLog />
        </div>
      </div>
    </main>
  );
};

export default Overview;

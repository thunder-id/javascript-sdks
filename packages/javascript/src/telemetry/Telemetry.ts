// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import TelemetryApiRules, {TelemetryApiCall} from './TelemetryApiRules';
import TelemetryEncoder from './TelemetryEncoder';
import TelemetryNames from './TelemetryNames';
import {
  TelemetryConfig,
  TelemetryEvent,
  TelemetryEventKind,
  TelemetryIdentity,
  TelemetryIdentitySource,
  TelemetryApiEventsConfig,
  TelemetryKindConfig,
  TelemetryTransport,
} from '../models/telemetry';

/**
 * The auth events the SDK reports.
 */
export type TelemetryAuthAction = 'sign-in' | 'sign-in-failed' | 'sign-out' | 'session-expired';

/**
 * How an API call ended.
 */
export type TelemetryApiOutcome = ({ok: true} | {ok: false; responseBody?: unknown; status?: number}) & {
  /**
   * The name the API gave the call in its `X-Telemetry-Event` response header, if any.
   */
  event?: string;
};

/**
 * The response header in which an API names the event for a call, such as `application.share`.
 */
export const TELEMETRY_EVENT_HEADER = 'x-telemetry-event';

/**
 * What a platform SDK gives the telemetry.
 */
export interface TelemetryDependencies {
  /**
   * The base URLs of the SDK's own API, watched for API events besides `apiEvents.apis`.
   */
  apiBases: string[];
  /**
   * Reads the current user and organization.
   */
  identity: TelemetryIdentitySource;
  /**
   * The app's origin, for relative URLs.
   */
  origin: string;
  /**
   * Sends the encoded batches.
   */
  transport: TelemetryTransport;
  /**
   * The user agent, when there is one.
   */
  userAgent?: string;
}

/**
 * A batch is sent when it reaches this many events, or after `FLUSH_INTERVAL_MS`.
 */
const BATCH_SIZE = 20;
const FLUSH_INTERVAL_MS = 5000;
/**
 * At most this many events wait for consent; the oldest are dropped first.
 */
const MAX_WAITING = 200;
/**
 * How long reading the user and organization for an event may take before the event is kept without
 * them.
 */
const IDENTITY_TIMEOUT_MS = 3000;

/**
 * Reports what people do in an app: page views, API events, auth events, external links and the app's
 * own `track()` calls. Events are batched and sent in the background; a failure is dropped and never
 * reaches the app. Built only when `TelemetryConfig.endpoint` is set.
 */
export class Telemetry {
  private readonly apiRules: TelemetryApiRules;

  private readonly encoder: TelemetryEncoder;

  private readonly names: TelemetryNames;

  private queue: TelemetryEvent[] = [];

  private timer: ReturnType<typeof setTimeout> | undefined;

  private pending: Promise<void> = Promise.resolve();

  /**
   * Sends started when a batch filled up, which `flush` also waits for.
   */
  private readonly sending = new Set<Promise<void>>();

  private disposed = false;

  /**
   * @param config - The telemetry configuration; its `endpoint` is set.
   * @param dependencies - What the platform SDK provides.
   */
  constructor(
    private readonly config: TelemetryConfig,
    private readonly dependencies: TelemetryDependencies,
  ) {
    this.names = new TelemetryNames(config.prefix);
    this.encoder = new TelemetryEncoder(config.format ?? 'otlp', config.mapping);
    this.apiRules = new TelemetryApiRules(
      [...dependencies.apiBases, ...(config.apiEvents?.apis ?? [])],
      dependencies.origin,
      {
        actions: config.apiEvents?.actions,
        addressWords: config.apiEvents?.addressWords,
        kinds: config.apiEvents?.kinds,
        parentActions: config.apiEvents?.parentActions,
      },
    );
  }

  /**
   * Whether a configuration turns telemetry on.
   */
  static isEnabled(config: TelemetryConfig | undefined): config is TelemetryConfig & {endpoint: string} {
    return typeof config?.endpoint === 'string' && config.endpoint.trim() !== '';
  }

  /**
   * The data a failed sign-in is reported with: `error_code` when the code is well formed, such as
   * `AUTH-1001`; never a message.
   */
  static signInFailureData(code: unknown): Record<string, string> {
    return TelemetryApiRules.errorCodeData(code);
  }

  private static enabled(kind: TelemetryKindConfig | undefined): boolean {
    return kind?.enabled !== false;
  }

  /**
   * Reports a page view from its matched route pattern, such as `/applications/:id`.
   */
  page(pattern: string): void {
    const pages: TelemetryKindConfig | undefined = this.config.pages;
    if (!Telemetry.enabled(pages) || TelemetryNames.matchesAny(pattern, pages?.exclude)) {
      return;
    }
    this.add('page', pages?.names?.[pattern] ?? TelemetryNames.pageName(pattern), pattern, {});
  }

  /**
   * Reports an API call the app made, when the built-in rules name it.
   *
   * @param method - The HTTP method.
   * @param url - The URL called.
   * @param body - The request body.
   * @param outcome - Whether it succeeded, and if not, the status and the response body.
   */
  api(method: string | undefined, url: string | undefined, body: unknown, outcome: TelemetryApiOutcome): void {
    const apiEvents: TelemetryApiEventsConfig | undefined = this.config.apiEvents;
    if (!Telemetry.enabled(apiEvents) || !url) {
      return;
    }
    if (apiEvents?.skipWhen?.some((field: string) => TelemetryApiRules.sets(body, field))) {
      return;
    }
    const call: TelemetryApiCall | undefined = this.apiRules.classify(method, url);
    const path: string | undefined = this.apiRules.path(url);
    const literal: string | undefined = this.apiRules.literalPath(url);
    if (!call || !path || !literal || outcome.event === 'none') {
      return;
    }
    const named: {name: string; route: string} = this.apiName(
      call,
      path,
      (method ?? '').toUpperCase(),
      body,
      outcome.event,
    );
    // Checked before `-failed` is added, so an excluded name stops its failures too.
    const exclude: string[] | undefined = apiEvents?.exclude;
    if (
      [this.withoutQuery(url), literal, path, call.name, named.name].some((value: string) =>
        TelemetryNames.matchesAny(value, exclude),
      )
    ) {
      return;
    }
    if (outcome.ok) {
      this.add('api', named.name, named.route, call.data);
    } else {
      this.add('api', `${named.name}-failed`, named.route, {
        ...call.data,
        ...TelemetryApiRules.failureData(outcome.status, outcome.responseBody),
      });
    }
  }

  /**
   * The name of an API event and its route, from the first that applies: a configured name for its
   * method and path, optionally with a body field it must set (`POST /promotions ?origin`); a configured
   * rename of the rules' name; the name the API gave in its response header, itself renamed when
   * configured; or the rules' name. Configuration always comes before the header. A configured path
   * names the route too, with each `*` as `{id}`.
   */
  private apiName(
    call: TelemetryApiCall,
    path: string,
    method: string,
    body: unknown,
    event: string | undefined,
  ): {name: string; route: string} {
    const names: Record<string, string> = this.config.apiEvents?.names ?? {};
    // A key with a body condition is more specific, so it is tried first.
    const keys: [string, string][] = Object.entries(names).sort(
      ([a]: [string, string], [b]: [string, string]) => Number(b.includes(' ?')) - Number(a.includes(' ?')),
    );
    for (const [key, value] of keys) {
      const [verb, pattern, condition] = key.split(' ');
      const field: string | undefined = condition?.startsWith('?') ? condition.slice(1) : undefined;
      if (
        pattern !== undefined &&
        verb.toUpperCase() === method &&
        TelemetryNames.matches(path, pattern) &&
        (field === undefined || TelemetryApiRules.sets(body, field))
      ) {
        return {name: value, route: pattern.replace(/\*\*?/g, '{id}')};
      }
    }
    const renamed: string | undefined = names[call.name];
    if (renamed !== undefined) {
      return {name: renamed, route: call.route};
    }
    if (event && TelemetryNames.isValidName(event)) {
      return {name: names[event] ?? event, route: call.route};
    }
    return {name: call.name, route: call.route};
  }

  /**
   * Reports an auth event.
   *
   * @param action - What happened.
   * @param data - Codes about it, such as an error code for a failed sign-in.
   */
  auth(action: TelemetryAuthAction, data: Record<string, string> = {}): void {
    const authEvents: TelemetryKindConfig | undefined = this.config.authEvents;
    // Auth actions are the SDK's own names, so an exclusion matches one exactly.
    if (!Telemetry.enabled(authEvents) || authEvents?.exclude?.includes(action)) {
      return;
    }
    this.add('auth', authEvents?.names?.[action] ?? `auth.${action}`, undefined, data);
  }

  /**
   * Reports a link that leaves the app, with its host and path only.
   *
   * @param href - The link's target.
   */
  link(href: string): void {
    const links: TelemetryKindConfig | undefined = this.config.links;
    if (!Telemetry.enabled(links)) {
      return;
    }
    let target: URL;
    try {
      target = new URL(href, this.dependencies.origin);
    } catch {
      return;
    }
    if (
      (target.protocol !== 'https:' && target.protocol !== 'http:') ||
      target.origin === new URL(this.dependencies.origin).origin
    ) {
      return;
    }
    const where = `${target.origin}${target.pathname}`;
    if (TelemetryNames.matchesAny(where, links?.exclude)) {
      return;
    }
    const renamed: string | undefined = Object.entries(links?.names ?? {}).find(([pattern]: [string, string]) =>
      TelemetryNames.matches(where, pattern),
    )?.[1];
    this.add('link', renamed ?? 'link.open', undefined, {
      host: target.host,
      path: TelemetryNames.linkPath(target.pathname),
    });
  }

  /**
   * Reports an event the app names, for what is neither a page, an API call nor a link.
   *
   * @param name - The event's name, lower-case `<type>.<action>`; the prefix is added. Any other name drops
   * the event.
   * @param data - Codes about it, never personal values. A value that looks like an email address, a URL,
   * a query or fragment, or free text is dropped, but that check is a safeguard, not a privacy filter.
   */
  track(name: string, data: Record<string, string> = {}): void {
    if (!TelemetryNames.isValidName(name)) {
      return;
    }
    this.add('custom', name, undefined, TelemetryNames.safeData(data));
  }

  /**
   * Sends what is waiting now.
   *
   * @param keepalive - Whether the page is going away.
   */
  flush(keepalive = false): Promise<void> {
    this.clearTimer();
    this.pending = this.pending.then(async () => {
      await this.send(keepalive);
      await Promise.all([...this.sending]);
    });
    return this.pending;
  }

  /**
   * Stops the timer for good, sending what is waiting.
   */
  async dispose(): Promise<void> {
    this.disposed = true;
    await this.flush(true);
    this.clearTimer();
  }

  private add(kind: TelemetryEventKind, name: string, route: string | undefined, data: Record<string, string>): void {
    const timestamp: string = new Date().toISOString();
    // A copy, so a later change by the caller does not reach the event.
    const snapshot: Record<string, string> = {...data};
    // Read now, so the event keeps the user and organization it had when it happened.
    const lookup: Promise<TelemetryIdentity> = this.identity();
    this.pending = this.pending.then(async () => {
      const identity: TelemetryIdentity = await lookup;
      this.queue.push({
        attributes: {
          data: snapshot,
          organization: identity.organizationId ? {id: identity.organizationId} : undefined,
          route,
          user: identity.userId ? {id: identity.userId} : undefined,
          userAgent: this.dependencies.userAgent,
        },
        context: {...(this.config.context ?? {})},
        id: Telemetry.newId(),
        kind,
        name: this.names.full(name),
        timestamp,
      });
      if (!this.disposed && this.queue.length >= BATCH_SIZE && this.consented()) {
        // A full batch leaves now, before any later event is added, so none is dropped while it waits.
        // Once disposal has started, its own flush sends what is waiting.
        this.clearTimer();
        const sent: Promise<void> = this.send(false);
        this.sending.add(sent);
        void sent.finally(() => this.sending.delete(sent));
        return;
      }
      if (this.queue.length > MAX_WAITING) {
        this.queue = this.queue.slice(this.queue.length - MAX_WAITING);
      }
      this.schedule();
    });
  }

  /**
   * The current user and organization, or none when they cannot be read in time.
   */
  private identity(): Promise<TelemetryIdentity> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<TelemetryIdentity>((resolve: (identity: TelemetryIdentity) => void) => {
      timer = setTimeout(() => resolve({}), IDENTITY_TIMEOUT_MS);
    });
    let read: Promise<TelemetryIdentity>;
    try {
      read = Promise.resolve(this.dependencies.identity.getIdentity());
    } catch {
      read = Promise.resolve({});
    }
    // An unattributed event is still worth having.
    return Promise.race([read.catch(() => ({})), deadline]).finally(() => clearTimeout(timer));
  }

  private clearTimer(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }

  private schedule(): void {
    if (this.disposed) {
      return;
    }
    this.timer ??= setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  private async send(keepalive: boolean): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }
    if (!this.consented()) {
      // Wait for consent: try again later, unless the page is going away.
      if (!keepalive) {
        this.schedule();
      }
      return;
    }
    const waiting: TelemetryEvent[] = this.queue;
    this.queue = [];
    // What waited for consent goes out in batches of at most `BATCH_SIZE`. A failure, whether encoding,
    // a send that throws or one that rejects, drops its batch: telemetry never affects the app, and the
    // next batch is still sent.
    const bodies: string[] = [];
    for (let start = 0; start < waiting.length; start += BATCH_SIZE) {
      try {
        bodies.push(...this.encoder.encode(waiting.slice(start, start + BATCH_SIZE)));
      } catch {
        // Dropped.
      }
    }
    await Promise.all(
      bodies.map(async (body: string) => {
        try {
          await this.dependencies.transport.send(body, keepalive);
        } catch {
          // Dropped.
        }
      }),
    );
  }

  private consented(): boolean {
    try {
      return this.config.consent ? this.config.consent() === true : true;
    } catch {
      return false;
    }
  }

  private withoutQuery(url: string): string {
    try {
      const parsed: URL = new URL(url, this.dependencies.origin);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  private static newId(): string {
    const cryptoApi: {randomUUID?: () => string} | undefined = (globalThis as {crypto?: {randomUUID?: () => string}})
      .crypto;
    if (cryptoApi?.randomUUID) {
      return cryptoApi.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char: string) => {
      const random: number = Math.floor(Math.random() * 16);
      return (char === 'x' ? random : (random % 4) + 8).toString(16);
    });
  }
}

export default Telemetry;

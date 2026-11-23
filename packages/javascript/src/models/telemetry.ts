// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * The kinds of telemetry event. All but `custom` are reported by the SDK by itself; `custom` events are
 * the ones the app reports with `track()`.
 */
export type TelemetryEventKind = 'page' | 'api' | 'auth' | 'link' | 'custom';

/**
 * How the events are encoded for the endpoint.
 *
 * - `otlp`: OpenTelemetry log records (OTLP/HTTP JSON), for an OpenTelemetry Collector.
 * - `json`: the events as they are, in an array.
 * - `mapping`: each event reshaped by `TelemetryConfig.mapping`, for any other API.
 */
export type TelemetryFormat = 'otlp' | 'json' | 'mapping';

/**
 * The settings every automatic kind shares.
 */
export interface TelemetryKindConfig {
  /**
   * Whether this kind is reported. Defaults to `true`.
   */
  enabled?: boolean;
  /**
   * What is never reported: route patterns for pages; for API events, URLs without the query, paths
   * below the API as called or with values as `{id}` (`/oauth2/**`), or event names, automatic or
   * final, which also stops their `-failed` form; URLs for links; and the exact action names (such as
   * `session-expired`) for auth events. Except for auth events, `*` matches the rest of a segment and
   * `**` the rest of the path.
   */
  exclude?: string[];
  /**
   * Renames, from a route pattern, a URL or an automatic name to the name to report instead. The
   * product prefix is still added.
   */
  names?: Record<string, string>;
}

/**
 * API events: what the app's own calls change.
 */
export interface TelemetryApiEventsConfig extends TelemetryKindConfig {
  /**
   * Words that, ending a POST to a sub-collection, are an action on the parent, besides the change
   * words `add`, `create`, `delete`, `remove` and `update`: with `['suspend']`,
   * `POST /users/{id}/agents/suspend` is `user.agent-suspend`. Any other word there is an id the caller
   * chose, so `POST /groups/{id}/members/alice` is `member.create`. Defaults to none.
   */
  actions?: string[];
  /**
   * Words that, right after a collection, start an address whose segments are never named: with
   * `['tree']`, `PUT /organization-units/tree/engineering/operations` is `organization-unit.update`,
   * with route `/organization-units/tree/{path}`. Defaults to none.
   */
  addressWords?: string[];
  /**
   * More APIs to watch with the same built-in rules as the SDK's own API: base URLs whose
   * creates, updates, deletes and other changes are reported.
   */
  apis?: string[];
  /**
   * Top-level collections whose next path word is a kind, reported as `kind` and kept in the route:
   * with `['connections']`, `POST /connections/google` is `connection.create` with `kind: google` and
   * route `/connections/google`. After any other top-level collection that word is an id, so without
   * it the route is `/connections/{id}`. Defaults to none.
   */
  kinds?: string[];
  /**
   * Renames API events. A key is either an automatic name, such as `group.create` or `api.call`, or a
   * method and a path, such as `POST /import`, where `*` matches one segment and `**` the rest, which
   * names any call that matches, including one the built-in rules do not name. A path key may end with
   * `?<field>` to match only when the request body sets that field, such as `POST /promotions ?origin`.
   * The body is read for that alone and never sent. A name is chosen from the first that applies: a
   * method and path key; a rename of the built-in rules' name; the name the API gives in its
   * `X-Telemetry-Event` response header, renamed when that name is a key; the built-in rules' name.
   * Configuration always comes before the header.
   */
  names?: Record<string, string>;
  /**
   * Sub-collections reported as an action on their parent, by change:
   * `{'sharing-policies': {create: 'share', update: 'share-update', delete: 'unshare'}}` reports
   * `POST /applications/{id}/sharing-policies` as `application.share`.
   */
  parentActions?: Record<string, {create?: string; delete?: string; update?: string}>;
  /**
   * Request body fields that mean a call changes nothing, such as `dryRun` or `preview`: a call whose
   * body sets one is not reported.
   */
  skipWhen?: string[];
}

/**
 * A mapping that reshapes each event for an API that does not take OpenTelemetry.
 */
export interface TelemetryMapping {
  /**
   * How a batch is sent: `array` sends every event of the batch in one array (the default); `each`
   * sends one request per event.
   */
  batch?: 'array' | 'each';
  /**
   * Lookup tables, for the `lookup` filter: `{{name | lookup: features}}` reads `tables.features[name]`.
   */
  tables?: Record<string, Record<string, unknown>>;
  /**
   * The shape of one event. Strings may hold `{{path}}` expressions read from the event, with filters
   * (`{{attributes.user.id | uuid}}`). A key starting with `...` spreads an object value into its parent.
   * An expression that reads nothing leaves its key out.
   */
  template: Record<string, unknown>;
}

/**
 * Where the user's and organization's ids are read from: claim names of the ID token.
 */
export interface TelemetryIdentityConfig {
  /**
   * The claim holding the organization's id. Defaults to `ouId`.
   */
  organizationClaim?: string;
  /**
   * The claim holding the user's id. Defaults to `sub`.
   */
  userClaim?: string;
}

/**
 * Telemetry: what people do in the app, reported to an endpoint the deployment configures. Off until
 * `endpoint` is set. Only codes are sent: route patterns, path templates, ids and error codes; never a
 * URL with its query, a name or anything a user typed.
 */
export interface TelemetryConfig {
  /**
   * API events: every create, update, delete and other change on the SDK's API (and on `apis`), on
   * success and on failure, named from the path, with anything particular to one API configured here.
   */
  apiEvents?: TelemetryApiEventsConfig;
  /**
   * Auth events: `auth.sign-in`, `auth.sign-in-failed`, `auth.sign-out` and `auth.session-expired`.
   */
  authEvents?: TelemetryKindConfig;
  /**
   * When set, nothing is sent until it returns true, such as when the user allows analytics cookies.
   * Events wait in memory until then.
   */
  consent?: () => boolean;
  /**
   * Codes added to every event, such as the product, the plan tier or the region.
   */
  context?: Record<string, string>;
  /**
   * Where events are sent: a path on the app's origin or a full `https` URL. Unset: telemetry is off.
   */
  endpoint?: string;
  /**
   * The encoding. Defaults to `otlp`.
   */
  format?: TelemetryFormat;
  /**
   * Where the user's and organization's ids come from.
   */
  identity?: TelemetryIdentityConfig;
  /**
   * Links that leave the app, such as docs, support or pricing, reported as `link.open`.
   */
  links?: TelemetryKindConfig;
  /**
   * The mapping, for the `mapping` format.
   */
  mapping?: TelemetryMapping;
  /**
   * Page views, named from the matched route pattern.
   */
  pages?: TelemetryKindConfig;
  /**
   * A product prefix added to every name, such as `acme` for `acme.application.create`.
   */
  prefix?: string;
  /**
   * The token the endpoint gets. A string is the only token sent; the app's own token never is.
   * `false` sends none, for an endpoint on the app's origin that a backend authenticates by its
   * session cookie. Unset: the app's own token for an endpoint on the app's origin (none when the app
   * runs behind a backend that holds the tokens), and none for any other origin.
   */
  token?: string | false;
}

/**
 * One reported event, before it is encoded.
 */
export interface TelemetryEvent {
  /**
   * What the event carries besides its name.
   */
  attributes: {
    /**
     * Codes about the event: a resource type, an HTTP status, an error code, a link's host.
     */
    data: Record<string, string>;
    /**
     * The organization, when known.
     */
    organization?: {id: string};
    /**
     * The route pattern of a page, or the path template of an API call, never the URL itself.
     */
    route?: string;
    /**
     * The signed-in user, when known.
     */
    user?: {id: string};
    /**
     * The browser's user agent.
     */
    userAgent?: string;
  };
  /**
   * The configured context codes.
   */
  context: Record<string, string>;
  /**
   * A unique id for the event.
   */
  id: string;
  /**
   * Which kind of event it is.
   */
  kind: TelemetryEventKind;
  /**
   * The full name, with the prefix: `[prefix.]<type>.<action>`.
   */
  name: string;
  /**
   * When it happened, as an ISO 8601 string.
   */
  timestamp: string;
}

/**
 * The ids an event is attributed to.
 */
export interface TelemetryIdentity {
  organizationId?: string;
  userId?: string;
}

/**
 * Sends encoded batches. A platform SDK provides it; a failure is dropped.
 */
export interface TelemetryTransport {
  /**
   * Sends one request body.
   *
   * @param body - The encoded body.
   * @param keepalive - Whether the page is going away, so the request must outlive it.
   */
  send(body: string, keepalive: boolean): Promise<void>;
}

/**
 * Reads who the current user and organization are. A platform SDK provides it.
 */
export interface TelemetryIdentitySource {
  getIdentity(): Promise<TelemetryIdentity>;
}

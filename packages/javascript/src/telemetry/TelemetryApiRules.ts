// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import TelemetryNames from './TelemetryNames';

/**
 * A call that is reported: its name before the prefix, its path template and its codes.
 */
export interface TelemetryApiCall {
  data: Record<string, string>;
  name: string;
  route: string;
}

type Change = 'create' | 'delete' | 'update';

const ERROR_CODE = /^[A-Z][A-Z0-9_]*-\d+$/;

/** A plain word in a path: letters and hyphens. Anything else, such as a UUID or a name, is a value. */
const WORD = /^[A-Za-z][A-Za-z-]{0,39}$/;

/** A path segment kept in a template: a word that may hold a version digit, such as `v2` or `oauth2`. */
const TEMPLATE_WORD = /^\.?[A-Za-z][A-Za-z0-9-]{0,39}$/;

/** An API version in a path, such as `v2`. */
const VERSION = /^v\d{1,2}$/;

/**
 * The words of the naming scheme itself. A hyphenated segment that starts with one, such as
 * `update-credentials`, is an action and not a collection, even though it ends in `s`.
 */
const CHANGE_WORDS: ReadonlySet<string> = new Set(['add', 'create', 'delete', 'remove', 'update']);

/**
 * Sub-collections reported as an action on their parent, by change: `{'sharing-policies': {create:
 * 'share'}}` reports `POST /applications/{id}/sharing-policies` as `application.share`.
 */
export type TelemetryParentActions = Record<string, Partial<Record<Change, string>>>;

/**
 * What an API's paths need beyond the generic rules, from `apiEvents` configuration.
 */
export interface TelemetryApiRulesOptions {
  /**
   * Words that, ending a POST to a sub-collection, are an action on the parent besides the change words.
   */
  actions?: string[];
  /**
   * Words that, right after a collection, start an address: everything after them is never named.
   */
  addressWords?: string[];
  /**
   * Top-level collections whose next word is a kind, such as `connections` in `/connections/google`.
   */
  kinds?: string[];
  /**
   * Sub-collections reported as an action on their parent.
   */
  parentActions?: TelemetryParentActions;
}

/**
 * Names an API call from its method and path alone, the same way for any REST API, with no knowledge
 * of a particular API:
 *
 * - `POST /<collection>` is `<type>.create`; `PUT` or `PATCH /<collection>/{id}` is `<type>.update`;
 *   `DELETE /<collection>/{id}` is `<type>.delete`. Words in front of the first collection, such as
 *   `design` in `/design/themes`, are skipped.
 * - The word right after a top-level collection listed in `kinds`, as in `/connections/google/{id}`, is
 *   reported as `kind`. After any other collection it is an item value, `{id}` in the route.
 * - A word listed in `addressWords` right after a collection starts an address: `PUT
 *   /organization-units/tree/a/b` is `organization-unit.update`, with route `/organization-units/tree/{path}`.
 * - A sub-resource is named for itself and carries `parent_type`: `POST /resource-servers/{id}/actions`
 *   is `action.create`, unless `parentActions` reports it as an action on the parent.
 * - A change word (`add`, `create`, `delete`, `remove`, `update`) or a word listed in `actions` ending a
 *   POST to a sub-collection is an action on the parent: `POST /groups/{id}/members/add` is
 *   `group.member-add`, with `sub_type: member`. Any other word there is an id the caller chose, so
 *   `POST /groups/{id}/members/alice` is `member.create`. Words after an id are an action on the item:
 *   `POST /applications/{id}/client-secret/regenerate` is `application.client-secret-regenerate`.
 * - Words after an item that is itself a word, such as the handles in `/organization-units/tree/a/b`,
 *   are part of its address and never part of a name.
 * - A path of words alone is named from them: `POST /import` is `api.import`.
 * - Any other change is `api.call`, with its method and a path template that keeps only its first
 *   word, so nothing is lost.
 *
 * Only `POST`, `PUT`, `PATCH` and `DELETE` are named. Which calls to skip, and any name an API needs
 * beyond these rules, come from configuration.
 */
export class TelemetryApiRules {
  /**
   * @param bases - The base URLs of the APIs that are watched.
   * @param origin - The app's origin, for relative URLs.
   */
  private readonly actions: ReadonlySet<string>;

  private readonly addressWords: ReadonlySet<string>;

  private readonly kinds: ReadonlySet<string>;

  private readonly parentActions: TelemetryParentActions;

  constructor(
    private readonly bases: string[],
    private readonly origin: string,
    options: TelemetryApiRulesOptions = {},
  ) {
    const lower = (words: string[] | undefined): ReadonlySet<string> =>
      new Set((words ?? []).map((word: string) => word.toLowerCase()));
    this.actions = lower(options.actions);
    this.addressWords = lower(options.addressWords);
    this.kinds = lower(options.kinds);
    this.parentActions = options.parentActions ?? {};
  }

  /**
   * Whether a request body sets `field` to a value other than `false`, `null` or an empty string; in a
   * form-encoded body, other than `'false'` or an empty string. Only read here, never sent.
   */
  static sets(body: unknown, field: string): boolean {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      const entry: FormDataEntryValue | null = body.get(field);
      return entry !== null && entry !== '' && entry !== 'false';
    }
    const value: unknown = TelemetryApiRules.parse(body)?.[field];
    return value !== undefined && value !== null && value !== false && value !== '';
  }

  /**
   * What a failed call is reported with: the HTTP status and the API's own error code, such as
   * `APP-1023`, when it gave one. Never the message, which can quote what the user typed.
   */
  static failureData(status: number | undefined, responseBody: unknown): Record<string, string> {
    const code: unknown =
      responseBody && typeof responseBody === 'object' ? (responseBody as {code?: unknown}).code : undefined;
    return {status: status === undefined ? 'network' : String(status), ...TelemetryApiRules.errorCodeData(code)};
  }

  /**
   * `error_code` for an error code that is well formed, such as `APP-1023`, or nothing.
   */
  static errorCodeData(code: unknown): Record<string, string> {
    return typeof code === 'string' && ERROR_CODE.test(code) ? {error_code: code} : {};
  }

  /**
   * The path template of a call no rule names: its first segment when that is a word, and `{id}` for
   * every other segment, which can be an id, a handle or a name someone chose.
   */
  route(url: string): string | undefined {
    const path: string[] | undefined = this.pathBelowBase(url);
    return path
      ? TelemetryApiRules.join(
          path.map((segment: string, index: number) =>
            index === 0 && TEMPLATE_WORD.test(segment) ? segment.toLowerCase() : '{id}',
          ),
        )
      : undefined;
  }

  /**
   * The path of a URL below a watched base as it was called, in lower case, with no value replaced, or
   * nothing when the URL is not under one. Used only to match `exclude`; never sent.
   */
  literalPath(url: string): string | undefined {
    const path: string[] | undefined = this.pathBelowBase(url);
    return path ? TelemetryApiRules.join(path.map((segment: string) => segment.toLowerCase())) : undefined;
  }

  /**
   * The path of a URL below a watched base, in lower case, with only what cannot be a word replaced by
   * `{id}`, or nothing when the URL is not under one. Used only to match configured patterns; never
   * sent.
   */
  path(url: string): string | undefined {
    const path: string[] | undefined = this.pathBelowBase(url);
    return path ? this.shape(path) : undefined;
  }

  private shape(path: string[]): string {
    return TelemetryApiRules.join(
      path.map((segment: string) => (TEMPLATE_WORD.test(segment) ? segment.toLowerCase() : '{id}')),
    );
  }

  /**
   * Names a call, or returns nothing when it is not reported.
   *
   * @param method - The HTTP method.
   * @param url - The URL called, absolute or relative to the app.
   */
  classify(method: string | undefined, url: string | undefined): TelemetryApiCall | undefined {
    const verb: string = (method ?? 'GET').toUpperCase();
    if (!TelemetryApiRules.change(verb) || !url) {
      return undefined;
    }
    const path: string[] | undefined = this.pathBelowBase(url);
    if (!path || path.length === 0) {
      return undefined;
    }
    return this.name(verb, path) ?? {data: {method: verb}, name: 'api.call', route: this.route(url)!};
  }

  /**
   * Names a change from its method and path segments, or returns nothing when no rule fits.
   */
  private name(verb: string, path: string[]): TelemetryApiCall | undefined {
    const change: Change = TelemetryApiRules.change(verb)!;
    const route: string[] = [];
    let index = 0;

    // Words in front of the first collection, such as `design` in `/design/themes`.
    while (index < path.length && !TelemetryApiRules.isCollection(path[index])) {
      if (!TEMPLATE_WORD.test(path[index])) {
        break;
      }
      route.push(path[index].toLowerCase());
      index += 1;
    }
    if (index === path.length || !TelemetryApiRules.isCollection(path[index])) {
      // No collection: `PUT /server-config/{name}` is a change to `server-config`.
      if (path.length === 2 && change !== 'create' && WORD.test(path[0])) {
        const type: string = path[0].toLowerCase();
        return {data: {resource_type: type}, name: `${type}.${change}`, route: `/${type}/{id}`};
      }
      // No resource type, only words: `POST /import` is `api.import`, `POST /import/managed` is
      // `api.import-managed`, and `PUT /maintenance` is `api.maintenance-update`. Only letter words and
      // versions such as `v2` make a name, so an id with digits, such as a client id, never does.
      if (
        index === path.length &&
        path.every((segment: string) => WORD.test(segment) || VERSION.test(segment.toLowerCase()))
      ) {
        const words: string = route.join('-');
        return {
          data: {},
          name: `api.${words}${verb === 'POST' ? '' : `-${change}`}`,
          route: TelemetryApiRules.join(route),
        };
      }
      return undefined;
    }

    let parent: string | undefined;
    for (;;) {
      const collection: string = path[index].toLowerCase();
      const type: string = TelemetryNames.singular(collection);
      route.push(collection);
      index += 1;
      const data: Record<string, string> = parent ? {parent_type: parent} : {};

      // The collection itself: `POST /groups`, or `PUT /flows/{id}/variables` for all of them.
      if (index === path.length) {
        return this.changeOf(change, type, collection, parent, data, route);
      }

      // A configured address word: everything after it is an address, never part of a name. The route
      // ends in `{path}` even when nothing follows the word.
      if (this.addressWords.has(path[index].toLowerCase())) {
        route.push(path[index].toLowerCase(), '{path}');
        return this.changeOf(change, type, collection, parent, data, route);
      }

      // A change word or a configured action that ends a POST to a sub-collection is an action on the
      // parent: `POST /groups/{id}/members/add` is `group.member-add`. Any other word there is an id.
      if (
        parent &&
        verb === 'POST' &&
        index === path.length - 1 &&
        WORD.test(path[index]) &&
        (CHANGE_WORDS.has(path[index].toLowerCase()) || this.actions.has(path[index].toLowerCase()))
      ) {
        const action: string = path[index].toLowerCase();
        route.push(action);
        return {
          data: {resource_type: parent, sub_type: type},
          name: `${parent}.${type}-${action}`,
          route: TelemetryApiRules.join(route),
        };
      }

      // A kind after a top-level collection listed in `kinds`: `/connections/google/{id}`, or
      // `POST /connections/google` for a new one of that kind. After any other top-level collection the
      // word is an item value.
      const segment: string = path[index];
      const isKind: boolean = !parent && this.kinds.has(collection) && WORD.test(segment);
      const itemData: Record<string, string> = isKind ? {...data, kind: segment.toLowerCase()} : data;

      // A label and its value in front of a sub-collection, such as `ns/{namespace}` in
      // `/languages/{id}/translations/ns/{namespace}/keys`: the label is kept and the value is not.
      if (
        parent &&
        !isKind &&
        WORD.test(segment) &&
        !TelemetryApiRules.isChangeWord(segment) &&
        path[index + 2] !== undefined &&
        TelemetryApiRules.isCollection(path[index + 2])
      ) {
        route.push(segment.toLowerCase(), '{id}');
        index += 2;
        parent = type;
        continue;
      }

      if (isKind) {
        route.push(segment.toLowerCase());
        index += 1;
        if (index === path.length) {
          return this.changeOf(change, type, collection, parent, itemData, route);
        }
      }

      // The item: an id, or a word that a collection or an action follows, such as `me` or `en`.
      const itemIsWord: boolean = WORD.test(path[index]);
      route.push('{id}');
      index += 1;
      if (index === path.length) {
        // `POST /<collection>/{id}` creates one at an id the caller chose.
        return this.changeOf(change, type, collection, parent, itemData, route);
      }

      const rest: string[] = path.slice(index).map((part: string) => part.toLowerCase());

      // A sub-resource of the item.
      if (TelemetryApiRules.isCollection(path[index])) {
        parent = type;
        continue;
      }

      // Words after an item that is itself a word, as in `/organization-units/tree/eng/backend`, can be
      // values someone chose, such as handles in a path, so they are part of the item's address and
      // never part of a name. One segment that starts with a change word, such as
      // `/users/me/update-credentials`, is still an action.
      if (itemIsWord && !(rest.length === 1 && TelemetryApiRules.isChangeWord(rest[0]))) {
        route.push('{path}');
        return this.changeOf(change, type, collection, parent, itemData, route);
      }

      // An action on the item: `client-secret/regenerate`, `restore`, `update-credentials`, or a
      // setting such as `PUT /projects/{id}/auto-sync`.
      if (!rest.every((part: string) => WORD.test(part))) {
        return undefined;
      }
      route.push(...rest);
      return {
        data: {...itemData, resource_type: type},
        name: `${type}.${rest.join('-')}${verb === 'POST' ? '' : `-${change}`}`,
        route: TelemetryApiRules.join(route),
      };
    }
  }

  /**
   * A create, update or delete of a collection's resource, or the parent's action for a
   * sub-resource such as a sharing policy.
   */
  private changeOf(
    change: Change,
    type: string,
    collection: string,
    parent: string | undefined,
    data: Record<string, string>,
    route: string[],
  ): TelemetryApiCall {
    const joined: string = TelemetryApiRules.join(route);
    const parentAction: string | undefined = parent ? this.parentActions[collection]?.[change] : undefined;
    if (parent && parentAction) {
      const rest: Record<string, string> = {...data};
      delete rest['parent_type'];
      return {data: {...rest, resource_type: parent}, name: `${parent}.${parentAction}`, route: joined};
    }
    return {data: {...data, resource_type: type}, name: `${type}.${change}`, route: joined};
  }

  private static change(verb: string): Change | undefined {
    if (verb === 'POST') {
      return 'create';
    }
    if (verb === 'PUT' || verb === 'PATCH') {
      return 'update';
    }
    return verb === 'DELETE' ? 'delete' : undefined;
  }

  private static join(route: string[]): string {
    return `/${route.join('/')}`;
  }

  /** Whether a segment starts with a word of the naming scheme, such as `update-credentials`. */
  private static isChangeWord(segment: string): boolean {
    return WORD.test(segment) && CHANGE_WORDS.has(segment.toLowerCase().split('-')[0]);
  }

  /** Whether a segment names a collection, such as `applications`, and is not an action. */
  private static isCollection(segment: string): boolean {
    return (
      segment.length > 2 &&
      WORD.test(segment) &&
      !TelemetryApiRules.isChangeWord(segment) &&
      TelemetryNames.isCollection(segment.toLowerCase())
    );
  }

  /**
   * A request body as an object, parsing a JSON string, or nothing.
   */
  private static parse(body: unknown): Record<string, unknown> | undefined {
    let parsed: unknown = body;
    if (typeof body === 'string') {
      try {
        parsed = JSON.parse(body);
      } catch {
        return undefined;
      }
    }
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : undefined;
  }

  /**
   * The path segments of a URL below the most specific watched base it falls under, or nothing.
   */
  private pathBelowBase(url: string): string[] | undefined {
    let called: URL;
    try {
      called = new URL(url, this.origin);
    } catch {
      return undefined;
    }
    let longest: string | undefined;
    for (const base of this.bases) {
      let root: URL;
      try {
        root = new URL(base, this.origin);
      } catch {
        continue;
      }
      const prefix: string = root.pathname.replace(/\/+$/, '');
      if (
        called.origin === root.origin &&
        (prefix === '' || called.pathname === prefix || called.pathname.startsWith(`${prefix}/`)) &&
        (longest === undefined || prefix.length > longest.length)
      ) {
        longest = prefix;
      }
    }
    return longest === undefined
      ? undefined
      : called.pathname
          .slice(longest.length)
          .split('/')
          .filter((segment: string) => segment !== '');
  }
}

export default TelemetryApiRules;

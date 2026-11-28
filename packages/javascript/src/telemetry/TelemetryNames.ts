// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * A plain word that, as the first segment of a link's path, is kept as it is.
 */
const PLAIN_SEGMENT = /^[A-Za-z_-]{1,40}$/;

/**
 * What an application's own event name must look like: lower-case words of letters, digits and `-`,
 * separated by `.`, with at least a type and an action.
 */
const EVENT_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)+$/;

/**
 * A value that looks like an email address, a URL, a query or fragment, or free text.
 */
const PERSONAL_VALUE = /[@?#\s]|:\/\//;

/**
 * Event names: `[prefix.]<type>.<action>`, the type singular and a multi-word action hyphenated, a failure
 * ending in `-failed` and a page ending in `-view`. Also matches the `exclude` patterns.
 */
export class TelemetryNames {
  /**
   * @param prefix - The product prefix, when configured.
   */
  constructor(private readonly prefix?: string) {}

  /**
   * Whether a value matches a pattern: `*` matches the rest of one path segment, `**` the rest of the
   * value, and anything else must be equal.
   */
  static matches(value: string, pattern: string): boolean {
    let expression = '';
    for (let i = 0; i < pattern.length; i += 1) {
      const char: string = pattern[i];
      if (char === '*' && pattern[i + 1] === '*') {
        expression += '.*';
        i += 1;
      } else if (char === '*') {
        expression += '[^/]*';
      } else {
        expression += char.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
      }
    }
    return new RegExp(`^${expression}$`).test(value);
  }

  /**
   * Whether a value matches any of the patterns.
   */
  static matchesAny(value: string, patterns: string[] | undefined): boolean {
    return (patterns ?? []).some((pattern: string) => TelemetryNames.matches(value, pattern));
  }

  /**
   * The singular of a collection's path segment: `applications` is `application`, `policies` is
   * `policy`, and a word that is not a collection stays as it is.
   */
  static singular(segment: string): string {
    // A word ending in `-ss` (`access`) or `-us` (`status`) is not a plural.
    if (segment.endsWith('ss') || segment.endsWith('us')) {
      return segment;
    }
    if (segment.endsWith('ies')) {
      return `${segment.slice(0, -3)}y`;
    }
    if (segment.endsWith('sses') || segment.endsWith('xes')) {
      return segment.slice(0, -2);
    }
    if (segment.endsWith('s')) {
      return segment.slice(0, -1);
    }
    return segment;
  }

  /**
   * Whether a path segment names a collection: a plural word.
   */
  static isCollection(segment: string): boolean {
    return TelemetryNames.singular(segment) !== segment;
  }

  /**
   * Whether a route segment is a parameter, such as `:id` or `{id}`.
   */
  static isParameter(segment: string): boolean {
    return segment.startsWith(':') || (segment.startsWith('{') && segment.endsWith('}')) || segment === '*';
  }

  /**
   * The name of a page from its route pattern, before the prefix:
   *
   * - `/applications` is `application.list-view`;
   * - `/applications/:id` is `application.detail-view`;
   * - `/applications/create` and `/applications/:id/status` are `application.create-view` and
   *   `application.status-view`, and `/applications/:id/settings` is `setting.list-view`;
   * - `/applications/types`, a collection right below another with no id between them, is a view of the
   *   first: `application.types-view`;
   * - `/organizations/:org/home` is `organization.home-view`, and `/` is `app.home-view`.
   */
  static pageName(pattern: string): string {
    const segments: string[] = pattern.split('/').filter((segment: string) => segment !== '');
    if (segments.length === 0) {
      return 'app.home-view';
    }
    const last: string = segments[segments.length - 1];
    const owner = (before: number): string => {
      for (let i: number = before; i >= 0; i -= 1) {
        if (!TelemetryNames.isParameter(segments[i])) {
          return TelemetryNames.singular(segments[i]);
        }
      }
      return 'app';
    };
    if (TelemetryNames.isParameter(last)) {
      return `${owner(segments.length - 2)}.detail-view`;
    }
    if (TelemetryNames.isCollection(last)) {
      const before: string | undefined = segments[segments.length - 2];
      // A collection right below another, with no id between them, belongs to it: `/applications/types`
      // is the applications' types page, not a list of types of its own.
      if (before !== undefined && !TelemetryNames.isParameter(before) && TelemetryNames.isCollection(before)) {
        return `${TelemetryNames.singular(before)}.${last}-view`;
      }
      return `${TelemetryNames.singular(last)}.list-view`;
    }
    return `${owner(segments.length - 2)}.${last}-view`;
  }

  /**
   * A link's path with only its first segment kept, when that is a plain word, and every other segment
   * replaced by `{id}`, so an id, a token or a handle in the path is never sent: `/guides/getting-started`
   * is `/guides/{id}`.
   */
  static linkPath(path: string): string {
    return path
      .split('/')
      .map((segment: string, index: number) =>
        segment === '' || (index === 1 && PLAIN_SEGMENT.test(segment)) ? segment : '{id}',
      )
      .join('/');
  }

  /**
   * Whether an application's own event name is lower-case `<type>.<action>` words.
   */
  static isValidName(name: string): boolean {
    return EVENT_NAME.test(name);
  }

  /**
   * An application's event data without the values that look like an email address, a URL, a query or
   * fragment, or free text: one longer than 64 characters, or containing `@`, `://`, `?`, `#` or
   * whitespace. Any other value is kept, including a personal one such as a single name, so this is a
   * safeguard and not a privacy boundary: the data must hold codes only.
   */
  static safeData(data: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(data).filter(
        ([, value]: [string, string]) => typeof value === 'string' && value.length <= 64 && !PERSONAL_VALUE.test(value),
      ),
    );
  }

  /**
   * The full name of an event: the prefix, when set, and the name.
   */
  full(name: string): string {
    return this.prefix ? `${this.prefix}.${name}` : name;
  }
}

export default TelemetryNames;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {TelemetryEvent, TelemetryFormat, TelemetryMapping} from '../models/telemetry';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXPRESSION = /\{\{([^}]+)\}\}/g;
const WHOLE_EXPRESSION = /^\{\{([^}]+)\}\}$/;

interface OtlpValue {
  stringValue: string;
}

interface OtlpAttribute {
  key: string;
  value: OtlpValue;
}

/**
 * Encodes a batch of events into request bodies for the configured format.
 */
export class TelemetryEncoder {
  /**
   * @param format - The format.
   * @param mapping - The mapping, for the `mapping` format.
   */
  constructor(
    private readonly format: TelemetryFormat,
    private readonly mapping?: TelemetryMapping,
  ) {}

  /**
   * The request bodies for a batch: one, or one per event for a mapping that sends each on its own.
   */
  encode(events: TelemetryEvent[]): string[] {
    if (events.length === 0) {
      return [];
    }
    if (this.format === 'json') {
      return [JSON.stringify(events)];
    }
    if (this.format === 'mapping') {
      const mapped: unknown[] = events.map((event: TelemetryEvent) => this.map(event));
      return this.mapping?.batch === 'each'
        ? mapped.map((body: unknown) => JSON.stringify(body))
        : [JSON.stringify(mapped)];
    }
    return [JSON.stringify(TelemetryEncoder.otlp(events))];
  }

  /**
   * One event reshaped by the mapping's template.
   */
  map(event: TelemetryEvent): unknown {
    return this.render(this.mapping?.template ?? {}, event);
  }

  /**
   * OpenTelemetry log records (OTLP/HTTP JSON): one record per event, named by `event.name`, with the
   * event's codes as attributes and the context as resource attributes.
   */
  private static otlp(events: TelemetryEvent[]): unknown {
    const attributes = (values: Record<string, string | undefined>): OtlpAttribute[] =>
      Object.entries(values)
        .filter((entry: [string, string | undefined]): entry is [string, string] => entry[1] !== undefined)
        .map(([key, value]: [string, string]) => ({key, value: {stringValue: value}}));

    return {
      resourceLogs: [
        {
          resource: {attributes: attributes({'service.name': 'unknown_service', ...events[0].context})},
          scopeLogs: [
            {
              logRecords: events.map((event: TelemetryEvent) => ({
                attributes: attributes({
                  'event.id': event.id,
                  'event.kind': event.kind,
                  'event.name': event.name,
                  'organization.id': event.attributes.organization?.id,
                  'url.template': event.attributes.route,
                  'user.id': event.attributes.user?.id,
                  'user_agent.original': event.attributes.userAgent,
                  ...Object.fromEntries(
                    Object.entries(event.attributes.data).map(([key, value]: [string, string]) => [
                      `event.data.${key}`,
                      value,
                    ]),
                  ),
                }),
                body: {stringValue: event.name},
                eventName: event.name,
                timeUnixNano: `${Date.parse(event.timestamp)}000000`,
              })),
              scope: {name: 'telemetry'},
            },
          ],
        },
      ],
    };
  }

  /**
   * Renders a template node: strings with expressions are filled in, objects and arrays recursively,
   * a `...` key spreads its object value, and a key whose value reads nothing is left out.
   */
  private render(node: unknown, event: TelemetryEvent): unknown {
    if (typeof node === 'string') {
      return this.fill(node, event);
    }
    if (Array.isArray(node)) {
      return node.map((item: unknown) => this.render(item, event)).filter((item: unknown) => item !== undefined);
    }
    if (node && typeof node === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        const rendered: unknown = this.render(value, event);
        if (key.startsWith('...')) {
          if (rendered && typeof rendered === 'object' && !Array.isArray(rendered)) {
            Object.assign(result, rendered);
          }
        } else if (rendered !== undefined) {
          result[key] = rendered;
        }
      }
      return result;
    }
    return node;
  }

  /**
   * A template string with its expressions filled in. A string that is a single expression keeps the
   * value's type; a string any of whose expressions reads nothing is nothing.
   */
  private fill(template: string, event: TelemetryEvent): unknown {
    const whole: RegExpMatchArray | null = WHOLE_EXPRESSION.exec(template);
    if (whole) {
      return this.evaluate(whole[1], event);
    }
    let missing = false;
    const filled: string = template.replace(EXPRESSION, (_match: string, expression: string) => {
      const value: unknown = this.evaluate(expression, event);
      if (value === undefined || value === null) {
        missing = true;
        return '';
      }
      return typeof value === 'string' ? value : JSON.stringify(value);
    });
    return missing ? undefined : filled;
  }

  /**
   * An expression's value: a dotted path into the event, through its filters.
   */
  private evaluate(expression: string, event: TelemetryEvent): unknown {
    const [path, ...filters] = expression.split('|').map((part: string) => part.trim());
    let value: unknown = path
      .split('.')
      .reduce(
        (current: unknown, key: string) =>
          current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined,
        event as unknown,
      );
    for (const filter of filters) {
      value = this.applyFilter(filter, value);
    }
    return value;
  }

  /**
   * One filter:
   *
   * - `uuid`: the value when it is a UUID, lower-cased, else nothing;
   * - `lookup: <table>`: the value's entry in one of the mapping's tables;
   * - `date`: an ISO 8601 time as milliseconds since the epoch.
   */
  private applyFilter(filter: string, value: unknown): unknown {
    const [filterName, argument] = filter.split(':').map((part: string) => part.trim());
    switch (filterName) {
      case 'uuid':
        return typeof value === 'string' && UUID.test(value) ? value.toLowerCase() : undefined;
      case 'lookup':
        return typeof value === 'string' ? this.mapping?.tables?.[argument]?.[value] : undefined;
      case 'date': {
        const time: number = typeof value === 'string' ? Date.parse(value) : NaN;
        return Number.isNaN(time) ? undefined : time;
      }
      default:
        return value;
    }
  }
}

export default TelemetryEncoder;

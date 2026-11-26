// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {TelemetryEvent} from '../../models/telemetry';
import TelemetryEncoder from '../TelemetryEncoder';

const event: TelemetryEvent = {
  attributes: {
    data: {resource_type: 'application'},
    organization: {id: 'B3A1C2D4-0000-4000-8000-000000000001'},
    route: '/applications',
    user: {id: 'not-a-uuid'},
    userAgent: 'test-agent',
  },
  context: {platform: 'Acme'},
  id: 'e1',
  kind: 'api',
  name: 'acme.application.create',
  timestamp: '2026-01-02T03:04:05.000Z',
};

describe('TelemetryEncoder', () => {
  it('encodes OpenTelemetry log records', () => {
    const [body] = new TelemetryEncoder('otlp').encode([event]);
    const parsed = JSON.parse(body) as {
      resourceLogs: {
        resource: {attributes: {key: string}[]};
        scopeLogs: {logRecords: {attributes: {key: string; value: {stringValue: string}}[]; eventName: string}[]}[];
      }[];
    };
    const record = parsed.resourceLogs[0].scopeLogs[0].logRecords[0];
    expect(record.eventName).toBe('acme.application.create');
    expect(record.attributes).toContainEqual({key: 'event.data.resource_type', value: {stringValue: 'application'}});
    expect(record.attributes).toContainEqual({key: 'url.template', value: {stringValue: '/applications'}});
    expect(parsed.resourceLogs[0].resource.attributes.map((a: {key: string}) => a.key)).toContain('platform');
  });

  it('reshapes events with a mapping, its filters and spreads', () => {
    const encoder: TelemetryEncoder = new TelemetryEncoder('mapping', {
      tables: {features: {'acme.application.create': {category: 'application', tier: 'core'}}},
      template: {
        action_name: '{{name}}',
        company_id: '{{attributes.organization.id | uuid}}',
        metadata: {
          '...': '{{attributes.data}}',
          '...context': '{{context}}',
          '...feature': '{{name | lookup: features}}',
          missing: 'x-{{attributes.nothing}}',
        },
        request: {time: '{{timestamp}}', when: '{{timestamp | date}}'},
        user_id: '{{attributes.user.id | uuid}}',
      },
    });
    expect(JSON.parse(encoder.encode([event])[0])).toEqual([
      {
        action_name: 'acme.application.create',
        company_id: 'b3a1c2d4-0000-4000-8000-000000000001',
        metadata: {category: 'application', platform: 'Acme', resource_type: 'application', tier: 'core'},
        request: {time: '2026-01-02T03:04:05.000Z', when: Date.parse('2026-01-02T03:04:05.000Z')},
      },
    ]);
  });

  it('sends each event on its own when the mapping asks, and nothing for no events', () => {
    const encoder: TelemetryEncoder = new TelemetryEncoder('mapping', {batch: 'each', template: {n: '{{name}}'}});
    expect(encoder.encode([event, event])).toEqual([
      '{"n":"acme.application.create"}',
      '{"n":"acme.application.create"}',
    ]);
    expect(encoder.encode([])).toEqual([]);
  });
});

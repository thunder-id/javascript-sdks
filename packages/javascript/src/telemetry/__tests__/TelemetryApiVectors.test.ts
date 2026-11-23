// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {TelemetryApiEventsConfig, TelemetryEvent} from '../../models/telemetry';
import Telemetry from '../Telemetry';

interface Vector {
  body?: Record<string, unknown>;
  config: string;
  expect: {data: Record<string, string>; name: string; route: string} | null;
  method: string;
  outcome: {ok: boolean; responseBody?: unknown; status?: number};
  path: string;
}

interface Vectors {
  apiBase: string;
  cases: Vector[];
  configs: Record<string, TelemetryApiEventsConfig>;
}

const vectors: Vectors = JSON.parse(
  readFileSync(new URL('./fixtures/telemetry-api-vectors.json', import.meta.url), 'utf8'),
) as Vectors;

// The same cases run in every SDK, so all of them name a call the same way.
describe('Telemetry API naming vectors', () => {
  it.each(
    vectors.cases.map((vector: Vector) => [
      `${vector.config} ${vector.method} ${vector.path} ${vector.outcome.status ?? ''}`,
      vector,
    ]),
  )('%s', async (_: string, vector: Vector) => {
    const sent: TelemetryEvent[] = [];
    const telemetry: Telemetry = new Telemetry(
      {apiEvents: vectors.configs[vector.config], endpoint: '/telemetry', format: 'json'},
      {
        apiBases: [vectors.apiBase],
        identity: {getIdentity: () => Promise.resolve({})},
        origin: 'https://app.example.com',
        transport: {
          send: (body: string) => {
            sent.push(...(JSON.parse(body) as TelemetryEvent[]));
            return Promise.resolve();
          },
        },
        userAgent: 'agent',
      },
    );
    telemetry.api(vector.method, vectors.apiBase + vector.path, vector.body, vector.outcome);
    await telemetry.flush();
    expect(
      sent[0] ? {data: sent[0].attributes.data, name: sent[0].name, route: sent[0].attributes.route} : null,
    ).toEqual(vector.expect);
  });
});

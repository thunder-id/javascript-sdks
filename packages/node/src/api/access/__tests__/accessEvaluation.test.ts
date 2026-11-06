// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import {Mock, describe, expect, it, vi} from 'vitest';
import evaluateAccess from '../evaluateAccess';
import evaluateAccesses from '../evaluateAccesses';
import searchActions from '../searchActions';

const BASE = 'https://example.com';
const META = {
  access_evaluation_endpoint: `${BASE}/access/v1/evaluation`,
  access_evaluations_endpoint: `${BASE}/access/v1/evaluations`,
  policy_decision_point: BASE,
  search_action_endpoint: `${BASE}/access/v1/search/action`,
};
const SUBJECT = {id: 'u1', type: 'user'};
const RESOURCE = {id: 'b1', type: 'https://api.example.com/booking'};
const READ = {name: 'booking:read'};

const json = (body: unknown, status = 200): Response =>
  ({
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

const fetcherFor = (...responses: Response[]): Mock => {
  const fetcher: Mock = vi.fn();

  responses.forEach((response: Response) => fetcher.mockResolvedValueOnce(response));

  return fetcher;
};

const bodyOf = (fetcher: Mock, call: number): any => JSON.parse(fetcher.mock.calls[call][1].body as string);

describe('access evaluation', () => {
  it('evaluates at the endpoint from the AuthZEN metadata with the Direct-Auth-Secret header', async () => {
    const fetcher = fetcherFor(json(META), json({decision: true}));

    const result = await evaluateAccess(
      {action: READ, resource: RESOURCE, subject: SUBJECT},
      {baseUrl: `${BASE}/`, fetcher, secret: 's3cret'},
    );

    expect(fetcher.mock.calls[0][0]).toBe(`${BASE}/.well-known/authzen-configuration`);
    expect(fetcher.mock.calls[1][0]).toBe(META.access_evaluation_endpoint);
    expect(fetcher.mock.calls[1][1].headers['Direct-Auth-Secret']).toBe('s3cret');
    expect(bodyOf(fetcher, 1)).toEqual({action: READ, resource: RESOURCE, subject: SUBJECT});
    expect(result).toEqual({decision: true});
  });

  it('returns a denial as a result, with its context', async () => {
    const denial = {context: {error: 'Unknown resource'}, decision: false};
    const fetcher = fetcherFor(json(META), json(denial));

    await expect(
      evaluateAccess({action: READ, resource: RESOURCE, subject: SUBJECT}, {baseUrl: BASE, fetcher, secret: 's'}),
    ).resolves.toEqual(denial);
  });

  it('refuses metadata whose policy decision point is another server', async () => {
    const fetcher = fetcherFor(json({...META, policy_decision_point: 'https://evil.example.com'}));

    await expect(
      evaluateAccess({action: READ, resource: RESOURCE, subject: SUBJECT}, {baseUrl: BASE, fetcher, secret: 's'}),
    ).rejects.toMatchObject({code: 'evaluateAccess-MetadataError-002'});
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('uses an override on the origin of baseUrl without reading the metadata, and refuses one elsewhere', async () => {
    const fetcher = fetcherFor(json({decision: true}));

    await evaluateAccess(
      {action: READ, resource: RESOURCE, subject: SUBJECT},
      {baseUrl: BASE, endpoints: {evaluation: `${BASE}/pdp/eval`}, fetcher, secret: 's'},
    );
    expect(fetcher.mock.calls[0][0]).toBe(`${BASE}/pdp/eval`);

    await expect(
      evaluateAccess(
        {action: READ, resource: RESOURCE, subject: SUBJECT},
        {baseUrl: BASE, endpoints: {evaluation: 'https://other.example.com/eval'}, fetcher, secret: 's'},
      ),
    ).rejects.toMatchObject({code: 'evaluateAccess-ValidationError-002'});
  });

  it('requires the secret before any request', async () => {
    const fetcher = vi.fn();

    await expect(
      evaluateAccess({action: READ, resource: RESOURCE, subject: SUBJECT}, {baseUrl: BASE, fetcher, secret: ''}),
    ).rejects.toMatchObject({code: 'evaluateAccess-ValidationError-003'});
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fails on a 4xx with the server error, keeping distinct codes for 401', async () => {
    let fetcher = fetcherFor(json(META), json({error: 'Missing subject'}, 400));

    await expect(
      evaluateAccess({action: READ, resource: RESOURCE, subject: SUBJECT}, {baseUrl: BASE, fetcher, secret: 's'}),
    ).rejects.toMatchObject({
      code: 'evaluateAccess-ResponseError-001',
      message: expect.stringContaining('Missing subject'),
      serverError: {code: 'Missing subject'},
      statusCode: 400,
    });

    fetcher = fetcherFor(json(META), json({code: 'AUTH-4010', message: {defaultValue: 'Unauthorized'}}, 401));
    await expect(
      evaluateAccess({action: READ, resource: RESOURCE, subject: SUBJECT}, {baseUrl: BASE, fetcher, secret: 'bad'}),
    ).rejects.toMatchObject({code: 'evaluateAccess-UnauthorizedError-001', serverError: {code: 'AUTH-4010'}});
  });

  it('evaluates a batch with shared defaults and returns one decision per evaluation, in order', async () => {
    const fetcher = fetcherFor(json(META), json({evaluations: [{decision: true}, {decision: false}]}));

    const result = await evaluateAccesses(
      {
        defaults: {resource: RESOURCE, subject: SUBJECT},
        evaluations: [{action: READ}, {action: {name: 'booking:delete'}, subject: {id: 'u2'}}],
      },
      {baseUrl: BASE, fetcher, secret: 's'},
    );

    expect(fetcher.mock.calls[1][0]).toBe(META.access_evaluations_endpoint);
    expect(bodyOf(fetcher, 1)).toEqual({
      evaluations: [
        {action: READ, resource: RESOURCE, subject: SUBJECT},
        {action: {name: 'booking:delete'}, resource: RESOURCE, subject: {id: 'u2'}},
      ],
    });
    expect(result).toEqual([{decision: true}, {decision: false}]);
  });

  it('searches the actions a subject may perform', async () => {
    const fetcher = fetcherFor(json(META), json({results: [READ]}));

    const result = await searchActions({resource: RESOURCE, subject: SUBJECT}, {baseUrl: BASE, fetcher, secret: 's'});

    expect(fetcher.mock.calls[1][0]).toBe(META.search_action_endpoint);
    expect(result).toEqual([READ]);
  });
});

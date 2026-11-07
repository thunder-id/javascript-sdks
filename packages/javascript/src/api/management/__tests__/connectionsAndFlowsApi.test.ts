// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {
  baseUrl,
  createFetcher,
  FetcherMock,
  itMapsForbiddenAndNotFound,
  itSendsRequests,
  requests,
} from './helpers/managementRequests';
import {ConnectionListResponse, ConnectionSummary} from '../../../models/connection';
import createConnection from '../connections/createConnection';
import deleteConnection from '../connections/deleteConnection';
import getConnection from '../connections/getConnection';
import getConnections from '../connections/getConnections';
import getConnectionsMeta from '../connections/getConnectionsMeta';
import getConnectionUsages from '../connections/getConnectionUsages';
import updateConnection from '../connections/updateConnection';
import createFlow from '../flows/createFlow';
import deleteFlow from '../flows/deleteFlow';
import getFlow from '../flows/getFlow';
import getFlowUsages from '../flows/getFlowUsages';
import getFlowVersion from '../flows/getFlowVersion';
import getFlowVersions from '../flows/getFlowVersions';
import restoreFlowVersion from '../flows/restoreFlowVersion';
import updateFlow from '../flows/updateFlow';

const connection = {clientId: 'c', name: 'Google', redirectUri: 'https://app.example.com/cb'};
const flow = {flowType: 'AUTHENTICATION', handle: 'basic', name: 'Basic', nodes: [{id: 'start', type: 'START'}]};

describe('connections API', () => {
  itSendsRequests([
    [
      'getConnections across every type',
      (fetcher) => getConnections({baseUrl, category: 'identity-provider', fetcher, limit: 10, offset: 0}),
      'GET',
      '/connections?category=identity-provider&limit=10&offset=0',
    ],
    [
      'getConnections of one organization unit',
      (fetcher) => getConnections({baseUrl, fetcher, limit: 100, ouId: 'ou-1'}),
      'GET',
      '/connections?filter=ouId+eq+%22ou-1%22&limit=100',
    ],
    [
      'getConnections of one type',
      (fetcher) => getConnections({baseUrl, fetcher, limit: 10, type: 'email-smtp'}),
      'GET',
      '/connections/email-smtp',
    ],
    [
      'getConnection',
      (fetcher) => getConnection({baseUrl, connectionId: 'c-1', fetcher, type: 'google'}),
      'GET',
      '/connections/google/c-1',
    ],
    [
      'createConnection',
      (fetcher) => createConnection({baseUrl, fetcher, payload: connection, type: 'google'}),
      'POST',
      '/connections/google',
      connection,
    ],
    [
      'updateConnection',
      (fetcher) => updateConnection({baseUrl, connectionId: 'c-1', fetcher, payload: connection, type: 'oidc'}),
      'PUT',
      '/connections/oidc/c-1',
      connection,
    ],
    [
      'deleteConnection',
      (fetcher) => deleteConnection({baseUrl, connectionId: 'c 1', fetcher, type: 'http'}),
      'DELETE',
      '/connections/http/c%201',
    ],
    [
      'getConnectionUsages',
      (fetcher) => getConnectionUsages({baseUrl, connectionId: 'c-1', fetcher, type: 'twilio'}),
      'GET',
      '/connections/twilio/c-1/usages',
    ],
    ['getConnectionsMeta', (fetcher) => getConnectionsMeta({baseUrl, fetcher}), 'GET', '/connections/meta'],
    [
      'getConnectionsMeta for a vendor',
      (fetcher) => getConnectionsMeta({baseUrl, fetcher, vendor: 'sms-gateway'}),
      'GET',
      '/connections/meta?vendor=sms-gateway',
    ],
  ]);

  itMapsForbiddenAndNotFound('getConnection', (fetcher) =>
    getConnection({baseUrl, connectionId: 'c-1', fetcher, type: 'google'}),
  );

  it('returns the listing the server returned, typed by whether a type is given', async () => {
    const all: ConnectionListResponse = await getConnections({
      baseUrl,
      fetcher: createFetcher({connections: [], count: 0, links: [], startIndex: 1, totalResults: 0}),
    });
    const google: ConnectionSummary[] = await getConnections({
      baseUrl,
      fetcher: createFetcher([{id: 'c-1', name: 'Google'}]),
      type: 'google',
    });

    expect(all.connections).toEqual([]);
    expect(google).toEqual([{id: 'c-1', name: 'Google'}]);
  });

  it('uses the connections endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = createFetcher();

    await getConnectionUsages({
      baseUrl,
      connectionId: 'c-1',
      fetcher,
      type: 'google',
      url: 'https://rs.example.com/connections',
    });

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/connections/google/c-1/usages');
  });
});

describe('flows API', () => {
  itSendsRequests([
    ['getFlow', (fetcher) => getFlow({baseUrl, fetcher, flowId: 'f-1'}), 'GET', '/flows/f-1'],
    ['createFlow', (fetcher) => createFlow({baseUrl, fetcher, payload: flow}), 'POST', '/flows', flow],
    [
      'updateFlow',
      (fetcher) => updateFlow({baseUrl, fetcher, flowId: 'f-1', payload: flow}),
      'PUT',
      '/flows/f-1',
      flow,
    ],
    ['deleteFlow', (fetcher) => deleteFlow({baseUrl, fetcher, flowId: 'f-1'}), 'DELETE', '/flows/f-1'],
    ['getFlowVersions', (fetcher) => getFlowVersions({baseUrl, fetcher, flowId: 'f-1'}), 'GET', '/flows/f-1/versions'],
    [
      'getFlowVersion',
      (fetcher) => getFlowVersion({baseUrl, fetcher, flowId: 'f-1', version: 3}),
      'GET',
      '/flows/f-1/versions/3',
    ],
    [
      'restoreFlowVersion',
      (fetcher) => restoreFlowVersion({baseUrl, fetcher, flowId: 'f-1', version: 2}),
      'POST',
      '/flows/f-1/restore',
      {version: 2},
    ],
    ['getFlowUsages', (fetcher) => getFlowUsages({baseUrl, fetcher, flowId: 'f-1'}), 'GET', '/flows/f-1/usages'],
  ]);

  itMapsForbiddenAndNotFound('getFlowVersion', (fetcher) =>
    getFlowVersion({baseUrl, fetcher, flowId: 'f-1', version: 1}),
  );

  it('uses the flows endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = createFetcher();

    await restoreFlowVersion({baseUrl, fetcher, flowId: 'f-1', url: 'https://rs.example.com/flows/', version: 1});

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/flows/f-1/restore');
  });
});

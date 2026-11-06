// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it, vi} from 'vitest';
import {
  baseUrl,
  FetcherMock,
  itMapsForbiddenAndNotFound,
  itSendsRequests,
  requests,
  respond,
  Run,
} from './helpers/managementRequests';
import AdministrationFlowError from '../../../errors/AdministrationFlowError';
import {ApiFetcher} from '../../../models/api';
import createAgentType from '../agent-types/createAgentType';
import deleteAgentType from '../agent-types/deleteAgentType';
import suspendAgent from '../agents/suspendAgent';
import unlockAgent from '../agents/unlockAgent';
import unsuspendAgent from '../agents/unsuspendAgent';
import createApplicationSharingPolicy from '../applications/createApplicationSharingPolicy';
import deleteApplicationSharingPolicy from '../applications/deleteApplicationSharingPolicy';
import getApplicationOverlayRules from '../applications/getApplicationOverlayRules';
import getApplicationSharingPolicies from '../applications/getApplicationSharingPolicies';
import getApplicationSharingPolicy from '../applications/getApplicationSharingPolicy';
import suspendApplication from '../applications/suspendApplication';
import unsuspendApplication from '../applications/unsuspendApplication';
import updateApplicationSharingPolicy from '../applications/updateApplicationSharingPolicy';
import createUserByPath from '../users/createUserByPath';
import createUserSharingPolicy from '../users/createUserSharingPolicy';
import deleteUserSharingPolicy from '../users/deleteUserSharingPolicy';
import getUserOverlayRules from '../users/getUserOverlayRules';
import getUsersByPath from '../users/getUsersByPath';
import getUserSharingPolicies from '../users/getUserSharingPolicies';
import getUserSharingPolicy from '../users/getUserSharingPolicy';
import sendUserAttributeVerification from '../users/sendUserAttributeVerification';
import suspendUser from '../users/suspendUser';
import unlockUser from '../users/unlockUser';
import unsuspendUser from '../users/unsuspendUser';
import updateUserSharingPolicy from '../users/updateUserSharingPolicy';

const policy = {childUnits: {mode: 'all' as const}};
const policyUpdate = {childUnits: {excludedOuIds: ['ou-2'], mode: 'all' as const}, version: 1};
const agentType = {displayName: 'Default', handle: 'default', ouId: 'ou-1', schema: {}};

describe('users, applications and agent types API', () => {
  itSendsRequests([
    [
      'createAgentType',
      (fetcher) => createAgentType({baseUrl, fetcher, payload: agentType}),
      'POST',
      '/agent-types',
      agentType,
    ],
    [
      'deleteAgentType',
      (fetcher) => deleteAgentType({agentTypeId: 't-1', baseUrl, fetcher}),
      'DELETE',
      '/agent-types/t-1',
    ],
    [
      'getUsersByPath',
      (fetcher) => getUsersByPath({baseUrl, fetcher, limit: 5, offset: 5, path: 'engineering/plat form'}),
      'GET',
      '/users/tree/engineering/plat%20form?include=display&limit=5&offset=5',
    ],
    [
      'createUserByPath',
      (fetcher) => createUserByPath({baseUrl, fetcher, path: 'engineering', payload: {type: 'customer'}}),
      'POST',
      '/users/tree/engineering',
      {type: 'customer'},
    ],
    [
      'getUserSharingPolicies',
      (fetcher) => getUserSharingPolicies({baseUrl, fetcher, limit: 2, userId: 'u-1'}),
      'GET',
      '/users/u-1/sharing-policies?limit=2',
    ],
    [
      'createUserSharingPolicy',
      (fetcher) => createUserSharingPolicy({baseUrl, fetcher, payload: policy, userId: 'u-1'}),
      'POST',
      '/users/u-1/sharing-policies',
      policy,
    ],
    [
      'getUserSharingPolicy',
      (fetcher) => getUserSharingPolicy({baseUrl, fetcher, policyId: 'p/1', userId: 'u-1'}),
      'GET',
      '/users/u-1/sharing-policies/p%2F1',
    ],
    [
      'updateUserSharingPolicy',
      (fetcher) => updateUserSharingPolicy({baseUrl, fetcher, payload: policyUpdate, policyId: 'p-1', userId: 'u-1'}),
      'PUT',
      '/users/u-1/sharing-policies/p-1',
      policyUpdate,
    ],
    [
      'deleteUserSharingPolicy',
      (fetcher) => deleteUserSharingPolicy({baseUrl, fetcher, policyId: 'p-1', userId: 'u-1'}),
      'DELETE',
      '/users/u-1/sharing-policies/p-1',
    ],
    [
      'getUserOverlayRules',
      (fetcher) => getUserOverlayRules({baseUrl, fetcher, ouId: 'ou-2', userId: 'u-1'}),
      'GET',
      '/users/u-1/overlay-rules?ouId=ou-2',
    ],
    [
      'getApplicationSharingPolicies',
      (fetcher) => getApplicationSharingPolicies({applicationId: 'app-1', baseUrl, fetcher, offset: 2}),
      'GET',
      '/applications/app-1/sharing-policies?offset=2',
    ],
    [
      'createApplicationSharingPolicy',
      (fetcher) => createApplicationSharingPolicy({applicationId: 'app-1', baseUrl, fetcher, payload: policy}),
      'POST',
      '/applications/app-1/sharing-policies',
      policy,
    ],
    [
      'getApplicationSharingPolicy',
      (fetcher) => getApplicationSharingPolicy({applicationId: 'app-1', baseUrl, fetcher, policyId: 'p-1'}),
      'GET',
      '/applications/app-1/sharing-policies/p-1',
    ],
    [
      'updateApplicationSharingPolicy',
      (fetcher) =>
        updateApplicationSharingPolicy({
          applicationId: 'app-1',
          baseUrl,
          fetcher,
          payload: policyUpdate,
          policyId: 'p-1',
        }),
      'PUT',
      '/applications/app-1/sharing-policies/p-1',
      policyUpdate,
    ],
    [
      'deleteApplicationSharingPolicy',
      (fetcher) => deleteApplicationSharingPolicy({applicationId: 'app-1', baseUrl, fetcher, policyId: 'p-1'}),
      'DELETE',
      '/applications/app-1/sharing-policies/p-1',
    ],
    [
      'getApplicationOverlayRules',
      (fetcher) => getApplicationOverlayRules({applicationId: 'app 1', baseUrl, fetcher, ouId: 'ou-2'}),
      'GET',
      '/applications/app%201/overlay-rules?ouId=ou-2',
    ],
  ]);

  itMapsForbiddenAndNotFound('getUserSharingPolicy', (fetcher) =>
    getUserSharingPolicy({baseUrl, fetcher, policyId: 'p-1', userId: 'u-1'}),
  );
  itMapsForbiddenAndNotFound('getApplicationSharingPolicies', (fetcher) =>
    getApplicationSharingPolicies({applicationId: 'app-1', baseUrl, fetcher}),
  );

  it('uses the users endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond({}));

    await getUserSharingPolicy({baseUrl, fetcher, policyId: 'p-1', url: 'https://rs.example.com/users', userId: 'u-1'});

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/users/u-1/sharing-policies/p-1');
  });

  it('refuses a blank policy identifier', async () => {
    await expect(
      getUserSharingPolicy({baseUrl, fetcher: vi.fn<ApiFetcher>(), policyId: ' ', userId: 'u-1'}),
    ).rejects.toMatchObject({code: 'getUserSharingPolicy-ValidationError-002'});
  });
});

/**
 * A fetcher that answers like a server with the given administration flows configured: the flow
 * configuration, the flow listing, and flow execution.
 */
const createFlowServer = (
  config: Record<string, {defaultHandle?: string}>,
  additionalData: Record<string, string> = {},
): FetcherMock =>
  vi.fn<ApiFetcher>((url: string) => {
    if (url === `${baseUrl}/server-config/flow`) {
      return Promise.resolve(respond({merged: config}));
    }
    if (url.startsWith(`${baseUrl}/flows?`)) {
      return Promise.resolve(
        respond({
          flows: Object.values(config).map(({defaultHandle}) => ({
            flowType: 'ADMINISTRATION',
            handle: defaultHandle,
            id: `flow-${defaultHandle}`,
          })),
        }),
      );
    }
    if (url === `${baseUrl}/flow/execute`) {
      return Promise.resolve(respond({data: {additionalData}, flowStatus: 'COMPLETE'}));
    }

    return Promise.reject(new Error(`unexpected request to ${url}`));
  });

describe('account lifecycle', () => {
  it.each<[string, string, (fetcher: ApiFetcher, operatorNote?: string) => Promise<unknown>]>([
    [
      'suspendUser',
      'userSuspendFlow',
      (fetcher, operatorNote) => suspendUser({baseUrl, fetcher, operatorNote, userId: 's-1'}),
    ],
    [
      'unsuspendUser',
      'userUnsuspendFlow',
      (fetcher, operatorNote) => unsuspendUser({baseUrl, fetcher, operatorNote, userId: 's-1'}),
    ],
    [
      'unlockUser',
      'userUnlockFlow',
      (fetcher, operatorNote) => unlockUser({baseUrl, fetcher, operatorNote, userId: 's-1'}),
    ],
    [
      'suspendAgent',
      'agentSuspendFlow',
      (fetcher, operatorNote) => suspendAgent({agentId: 's-1', baseUrl, fetcher, operatorNote}),
    ],
    [
      'unsuspendAgent',
      'agentUnsuspendFlow',
      (fetcher, operatorNote) => unsuspendAgent({agentId: 's-1', baseUrl, fetcher, operatorNote}),
    ],
    [
      'unlockAgent',
      'agentUnlockFlow',
      (fetcher, operatorNote) => unlockAgent({agentId: 's-1', baseUrl, fetcher, operatorNote}),
    ],
    [
      'suspendApplication',
      'applicationSuspendFlow',
      (fetcher, operatorNote) => suspendApplication({applicationId: 's-1', baseUrl, fetcher, operatorNote}),
    ],
    [
      'unsuspendApplication',
      'applicationUnsuspendFlow',
      (fetcher, operatorNote) => unsuspendApplication({applicationId: 's-1', baseUrl, fetcher, operatorNote}),
    ],
  ])('%s runs the %s flow with the subject and the note', async (_name, configKey, run) => {
    const fetcher: FetcherMock = createFlowServer({[configKey]: {defaultHandle: 'lifecycle'}}, {emailSent: 'true'});

    await expect(run(fetcher, 'Ticket 1')).resolves.toEqual({emailSent: true});
    expect(requests(fetcher).find((request) => request.url === `${baseUrl}/flow/execute`)).toEqual({
      body: {flowId: 'flow-lifecycle', inputs: {operatorNote: 'Ticket 1', subject: 's-1'}},
      method: 'POST',
      url: `${baseUrl}/flow/execute`,
    });
  });

  it.each<[string, Record<string, string>, unknown]>([
    ['"false"', {emailSent: 'false'}, {emailSent: false}],
    ['absent', {}, {}],
  ])('reads emailSent when it is %s', async (_label, additionalData, expected) => {
    const fetcher: FetcherMock = createFlowServer({userSuspendFlow: {defaultHandle: 'suspend'}}, additionalData);

    await expect(suspendUser({baseUrl, fetcher, userId: 'u-1'})).resolves.toEqual(expected);
    expect(requests(fetcher).find((request) => request.url === `${baseUrl}/flow/execute`)?.body).toEqual({
      flowId: 'flow-suspend',
      inputs: {subject: 'u-1'},
    });
  });

  it.each<[string, Run]>([
    ['suspendUser', (fetcher) => suspendUser({baseUrl, fetcher, userId: 'u-1'})],
    ['unlockAgent', (fetcher) => unlockAgent({agentId: 'a-1', baseUrl, fetcher})],
    ['unsuspendApplication', (fetcher) => unsuspendApplication({applicationId: 'app-1', baseUrl, fetcher})],
  ])('%s fails as not configured when no flow is configured, and calls nothing else', async (name, run) => {
    const fetcher: FetcherMock = createFlowServer({});
    const error: unknown = await run(fetcher).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AdministrationFlowError);
    expect(error).toMatchObject({code: `${name}-NotConfiguredError-001`});
    expect(requests(fetcher).map((request) => request.url)).toEqual([`${baseUrl}/server-config/flow`]);
  });

  it('refuses a blank subject before reading the configuration', async () => {
    const fetcher: FetcherMock = createFlowServer({});

    await expect(suspendUser({baseUrl, fetcher, userId: ''})).rejects.toMatchObject({
      code: 'suspendUser-ValidationError-002',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('sendUserAttributeVerification', () => {
  const linkSent: unknown = {
    data: {additionalData: {channel: 'email', emailSent: 'true', maskedDestination: 'j***@example.com'}},
    executionId: 'exec-1',
    flowStatus: 'INCOMPLETE',
    type: 'VIEW',
  };

  it('starts the shipped administrator-initiated flow for the user and the attribute', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond(linkSent));

    await expect(
      sendUserAttributeVerification({
        attribute: 'email',
        baseUrl,
        fetcher,
        headers: {Authorization: 'Bearer admin-token'},
        userId: 'u-1',
      }),
    ).resolves.toEqual({channel: 'email', emailSent: true, maskedDestination: 'j***@example.com'});
    expect(requests(fetcher)).toEqual([
      {
        body: {
          flowType: 'ADMIN_INITIATED',
          handle: 'default-admin-attribute-verification-flow',
          inputs: {attribute: 'email', subject: 'u-1'},
          verbose: true,
        },
        method: 'POST',
        url: `${baseUrl}/flow/execute`,
      },
    ]);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({Authorization: 'Bearer admin-token'});
  });

  it('runs the flow the caller names, at the server even when given a collection URL', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond(linkSent));

    await sendUserAttributeVerification({
      attribute: 'email',
      baseUrl,
      fetcher,
      handle: 'custom-admin-flow',
      url: `${baseUrl}/users`,
      userId: 'u-1',
    });

    expect(requests(fetcher)[0]).toMatchObject({body: {handle: 'custom-admin-flow'}, url: `${baseUrl}/flow/execute`});
  });

  it('leaves out what the flow does not report', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({data: {additionalData: {channel: 'email'}}, flowStatus: 'INCOMPLETE'}));

    await expect(sendUserAttributeVerification({attribute: 'email', baseUrl, fetcher, userId: 'u-1'})).resolves.toEqual(
      {channel: 'email'},
    );
  });

  it('reports an unsent email as not sent', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(
        respond({data: {additionalData: {channel: 'email', emailSent: 'false'}}, flowStatus: 'INCOMPLETE'}),
      );

    await expect(sendUserAttributeVerification({attribute: 'email', baseUrl, fetcher, userId: 'u-1'})).resolves.toEqual(
      {channel: 'email', emailSent: false},
    );
  });

  it('passes the refused step code through', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(
      respond({
        error: {code: 'FET-1114', message: {defaultValue: 'The account is suspended'}},
        flowStatus: 'ERROR',
      }),
    );
    const error: unknown = await sendUserAttributeVerification({
      attribute: 'email',
      baseUrl,
      fetcher,
      userId: 'u-1',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AdministrationFlowError);
    expect(error).toMatchObject({code: 'FET-1114', flowError: {code: 'FET-1114'}});
  });

  it.each<[string, unknown]>([
    ['a step that asks for input', {data: {additionalData: {}}, flowStatus: 'INCOMPLETE'}],
    ['a completed flow', {data: {additionalData: {channel: 'email'}}, flowStatus: 'COMPLETE'}],
  ])('fails on %s, since no link was reported sent', async (_label, body) => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond(body));

    await expect(
      sendUserAttributeVerification({attribute: 'email', baseUrl, fetcher, userId: 'u-1'}),
    ).rejects.toMatchObject({code: 'sendUserAttributeVerification-UnexpectedStateError-001'});
  });

  it('keeps an HTTP refusal of the start, such as a token without the permission', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({code: 'FES-1019', message: 'Forbidden'}, 403, 'Forbidden'));

    await expect(
      sendUserAttributeVerification({attribute: 'email', baseUrl, fetcher, userId: 'u-1'}),
    ).rejects.toMatchObject({code: 'sendUserAttributeVerification-ForbiddenError-001', statusCode: 403});
  });

  it.each<[string, string, string]>([
    ['a blank user', '', 'email'],
    ['a blank attribute', 'u-1', ' '],
  ])('refuses %s before calling the server', async (_label, userId, attribute) => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>();

    await expect(sendUserAttributeVerification({attribute, baseUrl, fetcher, userId})).rejects.toMatchObject({
      code: 'sendUserAttributeVerification-ValidationError-002',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('needs the server URL', async () => {
    await expect(
      sendUserAttributeVerification({
        attribute: 'email',
        fetcher: vi.fn<ApiFetcher>(),
        url: `${baseUrl}/users`,
        userId: 'u-1',
      }),
    ).rejects.toMatchObject({code: 'sendUserAttributeVerification-ValidationError-003'});
  });
});

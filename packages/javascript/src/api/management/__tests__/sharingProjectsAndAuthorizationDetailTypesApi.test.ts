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
} from './helpers/managementRequests';
import {ApiFetcher} from '../../../models/api';
import getSupportedAuthorizationDetailsType from '../../auth/getSupportedAuthorizationDetailsType';
import getSupportedAuthorizationDetailsTypes from '../../auth/getSupportedAuthorizationDetailsTypes';
import createAuthorizationDetailType from '../authorization-detail-types/createAuthorizationDetailType';
import deleteAuthorizationDetailType from '../authorization-detail-types/deleteAuthorizationDetailType';
import getAuthorizationDetailType from '../authorization-detail-types/getAuthorizationDetailType';
import getAuthorizationDetailTypes from '../authorization-detail-types/getAuthorizationDetailTypes';
import updateAuthorizationDetailType from '../authorization-detail-types/updateAuthorizationDetailType';
import createFlowSharingPolicy from '../flows/createFlowSharingPolicy';
import deleteFlowSharingPolicy from '../flows/deleteFlowSharingPolicy';
import getFlowOverlayRules from '../flows/getFlowOverlayRules';
import getFlowSharingPolicies from '../flows/getFlowSharingPolicies';
import getFlowSharingPolicy from '../flows/getFlowSharingPolicy';
import getFlowVariables from '../flows/getFlowVariables';
import updateFlowSharingPolicy from '../flows/updateFlowSharingPolicy';
import updateFlowVariables from '../flows/updateFlowVariables';
import createGroupByPath from '../groups/createGroupByPath';
import getGroupsByPath from '../groups/getGroupsByPath';
import createProject from '../projects/createProject';
import deleteProject from '../projects/deleteProject';
import getProject from '../projects/getProject';
import getProjects from '../projects/getProjects';
import updateProject from '../projects/updateProject';
import getResourceServerPermissions from '../resource-servers/getResourceServerPermissions';
import createRoleSharingPolicy from '../roles/createRoleSharingPolicy';
import deleteRoleSharingPolicy from '../roles/deleteRoleSharingPolicy';
import getRoleOverlayRules from '../roles/getRoleOverlayRules';
import getRoleSharingPolicies from '../roles/getRoleSharingPolicies';
import getRoleSharingPolicy from '../roles/getRoleSharingPolicy';
import updateRoleSharingPolicy from '../roles/updateRoleSharingPolicy';

const rolePolicy = {childUnits: {mode: 'all' as const, overlayRules: {assignments: {editable: false}}}};
const flowPolicy = {childUnits: {mode: 'all' as const, overlayRules: {'variables.supportEmail': {editable: true}}}};
const policyUpdate = {childUnits: {excludedOuIds: ['ou-2'], mode: 'all' as const}, version: 1};
const detailType = {name: 'Payment initiation', schema: {type: 'object'}, type: 'payment_initiation'};

describe('role and flow sharing API', () => {
  itSendsRequests([
    [
      'getRoleSharingPolicies',
      (fetcher) => getRoleSharingPolicies({baseUrl, fetcher, limit: 2, offset: 4, roleId: 'r-1'}),
      'GET',
      '/roles/r-1/sharing-policies?limit=2&offset=4',
    ],
    [
      'createRoleSharingPolicy',
      (fetcher) => createRoleSharingPolicy({baseUrl, fetcher, payload: rolePolicy, roleId: 'r-1'}),
      'POST',
      '/roles/r-1/sharing-policies',
      rolePolicy,
    ],
    [
      'getRoleSharingPolicy',
      (fetcher) => getRoleSharingPolicy({baseUrl, fetcher, policyId: 'p/1', roleId: 'r-1'}),
      'GET',
      '/roles/r-1/sharing-policies/p%2F1',
    ],
    [
      'updateRoleSharingPolicy',
      (fetcher) => updateRoleSharingPolicy({baseUrl, fetcher, payload: policyUpdate, policyId: 'p-1', roleId: 'r-1'}),
      'PUT',
      '/roles/r-1/sharing-policies/p-1',
      policyUpdate,
    ],
    [
      'deleteRoleSharingPolicy',
      (fetcher) => deleteRoleSharingPolicy({baseUrl, fetcher, policyId: 'p-1', roleId: 'r-1'}),
      'DELETE',
      '/roles/r-1/sharing-policies/p-1',
    ],
    [
      'getRoleOverlayRules',
      (fetcher) => getRoleOverlayRules({baseUrl, fetcher, ouId: 'ou 2', roleId: 'r 1'}),
      'GET',
      '/roles/r%201/overlay-rules?ouId=ou+2',
    ],
    [
      'getFlowSharingPolicies',
      (fetcher) => getFlowSharingPolicies({baseUrl, fetcher, flowId: 'f-1', limit: 3}),
      'GET',
      '/flows/f-1/sharing-policies?limit=3',
    ],
    [
      'createFlowSharingPolicy',
      (fetcher) => createFlowSharingPolicy({baseUrl, fetcher, flowId: 'f-1', payload: flowPolicy}),
      'POST',
      '/flows/f-1/sharing-policies',
      flowPolicy,
    ],
    [
      'getFlowSharingPolicy',
      (fetcher) => getFlowSharingPolicy({baseUrl, fetcher, flowId: 'f-1', policyId: 'p-1'}),
      'GET',
      '/flows/f-1/sharing-policies/p-1',
    ],
    [
      'updateFlowSharingPolicy',
      (fetcher) => updateFlowSharingPolicy({baseUrl, fetcher, flowId: 'f-1', payload: policyUpdate, policyId: 'p-1'}),
      'PUT',
      '/flows/f-1/sharing-policies/p-1',
      policyUpdate,
    ],
    [
      'deleteFlowSharingPolicy',
      (fetcher) => deleteFlowSharingPolicy({baseUrl, fetcher, flowId: 'f-1', policyId: 'p-1'}),
      'DELETE',
      '/flows/f-1/sharing-policies/p-1',
    ],
    [
      'getFlowOverlayRules',
      (fetcher) => getFlowOverlayRules({baseUrl, fetcher, flowId: 'f-1', ouId: 'ou-2'}),
      'GET',
      '/flows/f-1/overlay-rules?ouId=ou-2',
    ],
    [
      'getFlowVariables',
      (fetcher) => getFlowVariables({baseUrl, fetcher, flowId: 'f-1', ouId: 'ou-2'}),
      'GET',
      '/flows/f-1/variables?ouId=ou-2',
    ],
    [
      'updateFlowVariables',
      (fetcher) =>
        updateFlowVariables({
          baseUrl,
          fetcher,
          flowId: 'f-1',
          ouId: 'ou-2',
          variables: {otpValiditySeconds: 120, showRegistrationLink: true, supportEmail: 'help@example.com'},
        }),
      'PUT',
      '/flows/f-1/variables',
      {ouId: 'ou-2', values: {otpValiditySeconds: 120, showRegistrationLink: true, supportEmail: 'help@example.com'}},
    ],
    [
      'getGroupsByPath',
      (fetcher) => getGroupsByPath({baseUrl, fetcher, limit: 5, offset: 5, path: 'engineering/plat form'}),
      'GET',
      '/groups/tree/engineering/plat%20form?include=display&limit=5&offset=5',
    ],
    [
      'createGroupByPath',
      (fetcher) => createGroupByPath({baseUrl, fetcher, path: 'engineering/front?end', payload: {name: 'Sports'}}),
      'POST',
      '/groups/tree/engineering/front%3Fend',
      {name: 'Sports'},
    ],
  ]);

  itMapsForbiddenAndNotFound('getRoleOverlayRules', (fetcher) =>
    getRoleOverlayRules({baseUrl, fetcher, ouId: 'ou-2', roleId: 'r-1'}),
  );
  itMapsForbiddenAndNotFound('updateFlowVariables', (fetcher) =>
    updateFlowVariables({baseUrl, fetcher, flowId: 'f-1', ouId: 'ou-2', variables: {}}),
  );
  itMapsForbiddenAndNotFound('getGroupsByPath', (fetcher) => getGroupsByPath({baseUrl, fetcher, path: 'engineering'}));

  it('uses the flows endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond({values: {}}));

    await getFlowVariables({baseUrl, fetcher, flowId: 'f-1', ouId: 'ou-2', url: 'https://rs.example.com/flows'});

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/flows/f-1/variables?ouId=ou-2');
  });

  it('refuses a blank policy identifier', async () => {
    await expect(
      deleteRoleSharingPolicy({baseUrl, fetcher: vi.fn<ApiFetcher>(), policyId: ' ', roleId: 'r-1'}),
    ).rejects.toMatchObject({code: 'deleteRoleSharingPolicy-ValidationError-002'});
  });
});

describe('projects API', () => {
  itSendsRequests([
    [
      'getProjects',
      (fetcher) => getProjects({baseUrl, fetcher, limit: 10, offset: 20}),
      'GET',
      '/projects?limit=10&offset=20',
    ],
    ['getProject', (fetcher) => getProject({baseUrl, fetcher, projectId: 'p 1'}), 'GET', '/projects/p%201'],
    [
      'createProject',
      (fetcher) => createProject({baseUrl, fetcher, payload: {displayName: 'Shop', handle: 'shop'}}),
      'POST',
      '/projects',
      {displayName: 'Shop', handle: 'shop'},
    ],
    [
      'updateProject',
      (fetcher) => updateProject({baseUrl, fetcher, payload: {displayName: 'Online shop'}, projectId: 'p-1'}),
      'PUT',
      '/projects/p-1',
      {displayName: 'Online shop'},
    ],
    ['deleteProject', (fetcher) => deleteProject({baseUrl, fetcher, projectId: 'p-1'}), 'DELETE', '/projects/p-1'],
  ]);

  itMapsForbiddenAndNotFound('getProject', (fetcher) => getProject({baseUrl, fetcher, projectId: 'p-1'}));

  it('uses the projects endpoint override as the collection URL', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond({}));

    await getProject({baseUrl, fetcher, projectId: 'p-1', url: 'https://rs.example.com/projects/'});

    expect(requests(fetcher)[0].url).toBe('https://rs.example.com/projects/p-1');
  });
});

describe('authorization details types API', () => {
  itSendsRequests([
    [
      'getAuthorizationDetailTypes',
      (fetcher) => getAuthorizationDetailTypes({baseUrl, fetcher, limit: 10}),
      'GET',
      '/authorization-detail-types?limit=10',
    ],
    [
      'getAuthorizationDetailType',
      (fetcher) => getAuthorizationDetailType({authorizationDetailTypeId: 't-1', baseUrl, fetcher}),
      'GET',
      '/authorization-detail-types/t-1',
    ],
    [
      'createAuthorizationDetailType',
      (fetcher) => createAuthorizationDetailType({baseUrl, fetcher, payload: detailType}),
      'POST',
      '/authorization-detail-types',
      detailType,
    ],
    [
      'updateAuthorizationDetailType',
      (fetcher) =>
        updateAuthorizationDetailType({authorizationDetailTypeId: 't-1', baseUrl, fetcher, payload: detailType}),
      'PUT',
      '/authorization-detail-types/t-1',
      detailType,
    ],
    [
      'deleteAuthorizationDetailType',
      (fetcher) => deleteAuthorizationDetailType({authorizationDetailTypeId: 't-1', baseUrl, fetcher}),
      'DELETE',
      '/authorization-detail-types/t-1',
    ],
    [
      'getSupportedAuthorizationDetailsTypes',
      (fetcher) => getSupportedAuthorizationDetailsTypes({baseUrl, fetcher}),
      'GET',
      '/oauth2/authorization-details-types',
    ],
    [
      'getSupportedAuthorizationDetailsType',
      (fetcher) => getSupportedAuthorizationDetailsType({baseUrl, fetcher, type: 'https://example.com/payment'}),
      'GET',
      '/oauth2/authorization-details-types/https%3A%2F%2Fexample.com%2Fpayment',
    ],
  ]);

  itMapsForbiddenAndNotFound('deleteAuthorizationDetailType', (fetcher) =>
    deleteAuthorizationDetailType({authorizationDetailTypeId: 't-1', baseUrl, fetcher}),
  );
  itMapsForbiddenAndNotFound('getSupportedAuthorizationDetailsType', (fetcher) =>
    getSupportedAuthorizationDetailsType({baseUrl, fetcher, type: 'payment_initiation'}),
  );

  it('reads the types from the advertised endpoint when one is given', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond({types: []}));

    await getSupportedAuthorizationDetailsType({
      baseUrl,
      fetcher,
      type: 'payment_initiation',
      url: 'https://id.example.com/oauth2/authorization-details-types',
    });

    expect(requests(fetcher)[0].url).toBe(
      'https://id.example.com/oauth2/authorization-details-types/payment_initiation',
    );
  });
});

describe('getResourceServerPermissions', () => {
  it('lists the actions of the resource server and of its top-level resources, each permission once', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>((url: string) => {
      if (url === `${baseUrl}/resource-servers/rs-1/actions?limit=100`) {
        return Promise.resolve(respond({actions: [{handle: 'read', id: 'a1', name: 'Read', permission: 'read'}]}));
      }
      if (url === `${baseUrl}/resource-servers/rs-1/resources?limit=100`) {
        return Promise.resolve(
          respond({resources: [{handle: 'booking', id: 'res 1', name: 'Booking', permission: 'booking'}]}),
        );
      }
      if (url === `${baseUrl}/resource-servers/rs-1/resources/res%201/actions?limit=100`) {
        return Promise.resolve(
          respond({
            actions: [
              {handle: 'create', id: 'a2', name: 'Create', permission: 'booking:create'},
              {handle: 'read', id: 'a3', name: 'Read again', permission: 'read'},
            ],
          }),
        );
      }

      return Promise.reject(new Error(`unexpected request to ${url}`));
    });

    await expect(getResourceServerPermissions({baseUrl, fetcher, resourceServerId: 'rs-1'})).resolves.toEqual([
      {name: 'Read', permission: 'read'},
      {name: 'Create', permission: 'booking:create', resourceName: 'Booking'},
    ]);
  });
});

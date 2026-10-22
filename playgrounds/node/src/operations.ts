// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// What each operation in the explorer runs. The explorer shows an operation's source by reading
// its `#region` block in this file, so keep each runner inside its region.

import {
  getTokenPermissions,
  hasPermission,
  type AgentConfig,
  type CIBAInitiateOptions,
  type ExtendedAuthorizeRequestUrlParams,
  type ManagementListOptions,
  type RoleAssigneeType,
  type ThunderIDNodeClient,
  type TokenExchangeRequestConfig,
} from '@thunderid/node';
import resolveEndpoints from './endpoints.ts';

export interface RunContext {
  /** The JSON argument from the explorer's Arguments field, already parsed. */
  args: unknown;
  client: ThunderIDNodeClient;
  /** Values of the operation's parameters, as typed in the explorer. */
  params: Record<string, string>;
  serviceClient: ThunderIDNodeClient;
  /** The session the operation runs as (see "Run as" in the explorer). */
  sessionId: string;
}

export type Runner = (ctx: RunContext) => Promise<unknown>;

const num = (value: string | undefined): number | undefined => (value ? Number(value) : undefined);

const page = (params: Record<string, string>): ManagementListOptions => ({
  limit: num(params['limit']),
  offset: num(params['offset']),
});

// #region resolveEndpoints
// Where each resource endpoint resolves for the initialised client: resolveResourceEndpoint()
// returns the `endpoints` override, and an unset key falls back to {baseUrl}/{path}.
const resolveEndpointsOp: Runner = async ({client}) => resolveEndpoints(await client.getConfiguration());
// #endregion

// #region getOpenIDProviderEndpoints
const getOpenIDProviderEndpoints: Runner = ({client}) => client.getOpenIDProviderEndpoints();
// #endregion

// #region getDiscoveryResponse
const getDiscoveryResponse: Runner = ({client}) => client.getDiscoveryResponse();
// #endregion

// #region getConfiguration
// The playground masks the client secret before showing the configuration.
const getConfiguration: Runner = async ({client}) => {
  const {clientSecret, ...resolved} = await client.getConfiguration();
  return {...resolved, clientSecret: clientSecret ? '***' : undefined};
};
// #endregion

// #region getSignInUrl
const getSignInUrl: Runner = ({args, client, sessionId}) =>
  client.getSignInUrl(args as ExtendedAuthorizeRequestUrlParams, sessionId);
// #endregion

// #region signInStart
// Without a code, signIn() builds the authorize URL (keeping PKCE and state in the session) and
// hands it to the callback, which would normally redirect the browser.
const signInStart: Runner = async ({client, sessionId}) => {
  let authorizeUrl: string | undefined;
  const tokens = await client.signIn((url: string) => {
    authorizeUrl = url;
  }, sessionId);
  return {authorizeUrl, tokens};
};
// #endregion

// #region signInCode
// With a code and state (the redirect back from ThunderID), signIn() exchanges the code for
// tokens and stores them in the session.
const signInCode: Runner = ({client, params, sessionId}) =>
  client.signIn(undefined, sessionId, params['code'], params['state']);
// #endregion

// #region getOBOSignInURL
const getOBOSignInURL: Runner = ({client, params}) =>
  client.getOBOSignInURL({agentID: params['agentID']} as AgentConfig);
// #endregion

// #region initiateCIBA
const initiateCIBA: Runner = ({args, client}) => client.initiateCIBA(args as CIBAInitiateOptions);
// #endregion

// #region pollCIBA
// pollCIBA() keeps polling until the user decides; the signal stops it after the timeout.
const pollCIBA: Runner = ({client, params}) =>
  client.pollCIBA(params['authReqId'] ?? '', Number(params['interval'] ?? 5), {
    signal: AbortSignal.timeout(Number(params['timeoutSeconds'] ?? 30) * 1000),
  });
// #endregion

// #region isSignedIn
// Also refreshes the access token when it has expired and a refresh token is at hand.
const isSignedIn: Runner = ({client, sessionId}) => client.isSignedIn(sessionId);
// #endregion

// #region getUser
const getUser: Runner = ({client, sessionId}) => client.getUser(sessionId);
// #endregion

// #region getIdToken
const getIdToken: Runner = ({client, sessionId}) => client.getIdToken(sessionId);
// #endregion

// #region getDecodedIdToken
const getDecodedIdToken: Runner = ({client, sessionId}) => client.getDecodedIdToken(sessionId);
// #endregion

// #region getAccessToken
const getAccessToken: Runner = ({client, sessionId}) => client.getAccessToken(sessionId);
// #endregion

// #region decodeJwtToken
const decodeJwtToken: Runner = ({client, params}) => client.decodeJwtToken(params['token'] ?? '');
// #endregion

// #region clearSession
// clearSession() returns nothing and finishes in the background.
const clearSession: Runner = ({client, sessionId}) => {
  client.clearSession(sessionId);
  return Promise.resolve({cleared: sessionId});
};
// #endregion

// #region refreshAccessToken
const refreshAccessToken: Runner = ({client, sessionId}) => client.refreshAccessToken(sessionId);
// #endregion

// #region revokeAccessToken
// Revokes the access token at ThunderID and clears the session.
const revokeAccessToken: Runner = async ({client, sessionId}) => {
  const response = await client.revokeAccessToken(sessionId);
  return response instanceof Response ? {ok: response.ok, status: response.status} : response;
};
// #endregion

// #region exchangeToken
// Values in `data` may use {{accessToken}}, {{clientId}}, {{clientSecret}}, {{scopes}} and
// {{username}}; the SDK fills them in from the config and the session.
const exchangeToken: Runner = ({args, client, sessionId}) =>
  client.exchangeToken(args as TokenExchangeRequestConfig, sessionId);
// #endregion

// #region clientCredentials
// The service client was initialised with grantType 'client_credentials' (see its setup).
const clientCredentials: Runner = async ({serviceClient}) => {
  const accessToken = await serviceClient.getAccessToken();
  return {accessToken, claims: await serviceClient.decodeJwtToken(accessToken).catch(() => 'opaque token')};
};
// #endregion

// #region signOut
// Returns the end-session URL to redirect to. The stored session stays, so a back-channel logout
// that follows can still find it.
const signOut: Runner = async ({client, sessionId}) => ({signOutUrl: await client.signOut(sessionId)});
// #endregion

// #region handleBackchannelLogout
const handleBackchannelLogout: Runner = ({client, params}) =>
  client.handleBackchannelLogout(params['logoutToken'] ?? '');
// #endregion

// #region getUsers
const getUsers: Runner = ({client, params, sessionId}) =>
  client.getUsers(
    {filter: params['filter'] || undefined, limit: num(params['limit']), offset: num(params['offset'])},
    sessionId,
  );
// #endregion

// #region getFlows
const getFlows: Runner = ({client, params, sessionId}) =>
  client.getFlows(
    {flowType: params['flowType'] || undefined, limit: num(params['limit']), offset: num(params['offset'])},
    sessionId,
  );
// #endregion

// #region getUserTypes
const getUserTypes: Runner = ({client, params, sessionId}) =>
  client.getUserTypes({limit: num(params['limit']), offset: num(params['offset'])}, sessionId);
// #endregion

// #region updateUserCredentials
const updateUserCredentials: Runner = async ({args, client, sessionId}) => {
  await client.updateUserCredentials(args as Record<string, string>, sessionId);
  return {updated: Object.keys(args as Record<string, string>)};
};
// #endregion

// #region management
// client.management(sessionId) binds the management operations to one session: each call is sent
// with that session's access token, read at call time, and never copied onto the returned object.
// ThunderID decides whether the token may read the resource; a 403 or 404 rejects with a
// ThunderIDAPIError (<operation>-ForbiddenError-001, <operation>-NotFoundError-001).
// #endregion

// #region listGroups
const listGroups: Runner = ({client, params, sessionId}) => client.management(sessionId).groups.list(page(params));
// #endregion

// #region getGroup
const getGroup: Runner = ({client, params, sessionId}) =>
  client.management(sessionId).groups.get(params['groupId'] ?? '');
// #endregion

// #region listGroupMembers
const listGroupMembers: Runner = ({client, params, sessionId}) =>
  client.management(sessionId).groups.listMembers(params['groupId'] ?? '', page(params));
// #endregion

// #region listRoles
const listRoles: Runner = ({client, params, sessionId}) => client.management(sessionId).roles.list(page(params));
// #endregion

// #region getRole
const getRole: Runner = ({client, params, sessionId}) => client.management(sessionId).roles.get(params['roleId'] ?? '');
// #endregion

// #region listRoleAssignments
// `type` narrows the assignments to users, groups, apps or agents.
const listRoleAssignments: Runner = ({client, params, sessionId}) =>
  client.management(sessionId).roles.listAssignments(params['roleId'] ?? '', {
    ...page(params),
    type: params['type'] ? (params['type'] as RoleAssigneeType) : undefined,
  });
// #endregion

// #region listAgentTypes
const listAgentTypes: Runner = ({client, params, sessionId}) =>
  client.management(sessionId).agentTypes.list(page(params));
// #endregion

// #region listAgentGroups
const listAgentGroups: Runner = ({client, params, sessionId}) =>
  client.management(sessionId).agents.listGroups(params['agentId'] ?? '', page(params));
// #endregion

// #region listAgentRoles
const listAgentRoles: Runner = ({client, params, sessionId}) =>
  client.management(sessionId).agents.listRoles(params['agentId'] ?? '', page(params));
// #endregion

// #region listUserGroups
const listUserGroups: Runner = ({client, params, sessionId}) =>
  client.management(sessionId).users.listGroups(params['userId'] ?? '', page(params));
// #endregion

// #region permissionGatedGroups
// getTokenPermissions() reads the `scope` or `scopes` claim of the access token, and hasPermission()
// treats permissions as `:` paths, so `system` or `system:group` also cover `system:group:view`. The
// token is decoded, not verified: the check only decides whether to make the call, and ThunderID
// still checks the request.
const permissionGatedGroups: Runner = async ({client, params, sessionId}) => {
  const permission: string = params['permission'] ?? '';
  const granted: string[] = getTokenPermissions(await client.getAccessToken(sessionId));
  if (!hasPermission(granted, permission)) {
    return {allowed: false, granted, required: permission};
  }
  return {allowed: true, groups: await client.management(sessionId).groups.list(page(params))};
};
// #endregion

const runners: Record<string, Runner> = {
  clearSession,
  clientCredentials,
  decodeJwtToken,
  exchangeToken,
  getAccessToken,
  getConfiguration,
  getDecodedIdToken,
  getDiscoveryResponse,
  getFlows,
  getIdToken,
  getOBOSignInURL,
  getOpenIDProviderEndpoints,
  getSignInUrl,
  getGroup,
  getRole,
  getUser,
  getUserTypes,
  getUsers,
  handleBackchannelLogout,
  initiateCIBA,
  isSignedIn,
  listAgentGroups,
  listAgentRoles,
  listAgentTypes,
  listGroupMembers,
  listGroups,
  listRoleAssignments,
  listRoles,
  listUserGroups,
  permissionGatedGroups,
  pollCIBA,
  refreshAccessToken,
  resolveEndpoints: resolveEndpointsOp,
  revokeAccessToken,
  signInCode,
  signInStart,
  signOut,
  updateUserCredentials,
};

export default runners;

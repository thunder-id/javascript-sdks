// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import config from './config.ts';

export interface OperationParam {
  name: string;
  required: boolean;
  type: string;
  value: string;
}

export type OperationGroup =
  | 'Discovery'
  | 'Sign-in'
  | 'Session'
  | 'Tokens'
  | 'Sign-out'
  | 'Management API'
  | 'Management client'
  | 'Not available';

export interface OperationSpec {
  /** Example JSON argument, edited in the explorer's Arguments field. */
  args?: string;
  /** The call, as written in application code. */
  call: string;
  description: string;
  group: OperationGroup;
  id: string;
  /** Whether the operation sends requests to ThunderID. */
  network: boolean;
  params: OperationParam[];
  /** `#region` names (in `src/client.ts`, `src/operations.ts` and `src/server.ts`) that make up its source. */
  regions: string[];
  /** What the call resolves to. */
  returns: string;
  /** Whether the operation reads or changes a session. */
  session: boolean;
  summary: string;
  /** Why the operation cannot run, for methods the Node client does not implement. */
  unavailable?: string;
  /** Tells apart two operations that call the same method. */
  variant?: string;
}

const param = (name: string, value = '', type = 'string', required = false): OperationParam => ({
  name,
  required,
  type,
  value,
});

const json = (value: unknown): string => JSON.stringify(value, null, 2);

const NOT_IMPLEMENTED =
  'ThunderIDNodeClient inherits this method from ThunderIDJavaScriptClient without implementing it, so it throws "Method not implemented."';

const page = (): OperationParam[] => [param('limit', '10', 'number'), param('offset', '0', 'number')];

const MANAGEMENT_NOTE =
  'Sent with the session access token, which needs the permission ThunderID asks for. The collection URL comes from the call, then `endpoints` in the config, then {baseUrl}/{collection}: see the resolved endpoints in the sidebar.';

/** An operation of the session-bound management client, `client.management(sessionId)`. */
const management = (
  id: string,
  call: string,
  returns: string,
  summary: string,
  description: string,
  params: OperationParam[] = page(),
): OperationSpec => ({
  call: `client.management(sessionId).${call}`,
  description: `${description} ${MANAGEMENT_NOTE}`,
  group: 'Management client',
  id,
  network: true,
  params,
  regions: ['management', id],
  returns,
  session: true,
  summary,
});

const operations: OperationSpec[] = [
  {
    call: 'resolveResourceEndpoint(key, await client.getConfiguration())',
    description:
      'Where each management and sign-in resource endpoint resolves for this client: the `endpoints` override from the config, else {baseUrl}/{path}. Set a THUNDERID_ENDPOINT_<KEY> variable in .env to override one. The sidebar shows the same list.',
    group: 'Discovery',
    id: 'resolveEndpoints',
    network: false,
    params: [],
    regions: ['setup', 'resolveEndpoints'],
    returns: 'ResolvedEndpoint[]',
    session: false,
    summary: 'Resolved resource endpoints.',
  },
  {
    call: 'client.getOpenIDProviderEndpoints()',
    description:
      'The endpoints the SDK calls (authorize, token, userinfo, end session, JWKS, revocation, introspection), read from the discovery document. The first call that needs the document fetches it and checks its issuer; later calls reuse it.',
    group: 'Discovery',
    id: 'getOpenIDProviderEndpoints',
    network: false,
    params: [],
    regions: ['setup', 'getOpenIDProviderEndpoints'],
    returns: 'Promise<Partial<OIDCEndpoints>>',
    session: false,
    summary: 'OpenID Connect endpoints.',
  },
  {
    call: 'client.getDiscoveryResponse()',
    description:
      'The raw discovery document, as ThunderID served it, with any configured endpoint overrides applied. Fetched on the first call that needs it.',
    group: 'Discovery',
    id: 'getDiscoveryResponse',
    network: false,
    params: [],
    regions: ['getDiscoveryResponse'],
    returns: 'Promise<OIDCDiscoveryApiResponse | null>',
    session: false,
    summary: 'Discovery document.',
  },
  {
    call: 'client.getConfiguration()',
    description:
      'Returns the configuration the client resolved at initialize(): your settings merged with the SDK defaults. The playground masks the client secret.',
    group: 'Discovery',
    id: 'getConfiguration',
    network: false,
    params: [],
    regions: ['setup', 'getConfiguration'],
    returns: 'Promise<T>',
    session: false,
    summary: 'Resolved client configuration.',
  },
  {
    args: json({prompt: 'login'}),
    call: 'client.getSignInUrl(requestConfig, sessionId)',
    description:
      'Builds the authorize URL for a session, with PKCE and state kept in that session. The argument adds authorize request parameters. Open the URL as your browser session and ThunderID redirects back to /login, which finishes sign-in.',
    group: 'Sign-in',
    id: 'getSignInUrl',
    network: true,
    params: [],
    regions: ['getSignInUrl'],
    returns: 'Promise<string>',
    session: true,
    summary: 'Authorize URL.',
  },
  {
    call: 'client.signIn(authURLCallback, sessionId)',
    description:
      'Starts sign-in: hands the authorize URL to the callback, which redirects the browser in an app. A session that is already signed in resolves with its tokens instead.',
    group: 'Sign-in',
    id: 'signInStart',
    network: true,
    params: [],
    regions: ['signInStart', 'login'],
    returns: 'Promise<TokenResponse>',
    session: true,
    summary: 'Start sign-in.',
    variant: 'start',
  },
  {
    call: 'client.signIn(undefined, sessionId, code, state)',
    description:
      'Finishes sign-in: exchanges the authorization code for tokens, validates the ID token and stores the tokens in the session. /login runs this on the redirect back from ThunderID. A code is single use, so a code sent here by hand gets the SDK error.',
    group: 'Sign-in',
    id: 'signInCode',
    network: true,
    params: [param('code', '', 'string', true), param('state', '', 'string', true)],
    regions: ['signInCode', 'login'],
    returns: 'Promise<TokenResponse>',
    session: true,
    summary: 'Exchange the authorization code.',
    variant: 'code',
  },
  {
    call: 'client.getOBOSignInURL({agentID})',
    description:
      'Builds an authorize URL that asks the user to let an AI agent act on their behalf (on-behalf-of), by sending the agent as requested_actor.',
    group: 'Sign-in',
    id: 'getOBOSignInURL',
    network: true,
    params: [param('agentID', 'agent-1', 'string', true)],
    regions: ['getOBOSignInURL'],
    returns: 'Promise<string>',
    session: false,
    summary: 'On-behalf-of sign-in URL for an agent.',
  },
  {
    args: json({bindingMessage: 'Playground sign-in', loginHint: 'alice@example.com'}),
    call: 'client.initiateCIBA(options)',
    description:
      'Starts a Client-Initiated Backchannel Authentication (CIBA) request: ThunderID asks the user on another device. Needs exactly one of loginHint, loginHintToken or idTokenHint.',
    group: 'Sign-in',
    id: 'initiateCIBA',
    network: true,
    params: [],
    regions: ['initiateCIBA'],
    returns: 'Promise<CIBAInitiateResponse>',
    session: false,
    summary: 'Start a CIBA request.',
  },
  {
    call: 'client.pollCIBA(authReqId, interval, {signal})',
    description:
      'Polls the token endpoint until the user approves or denies the CIBA request, slowing down when ThunderID asks. Take authReqId and interval from initiateCIBA().',
    group: 'Sign-in',
    id: 'pollCIBA',
    network: true,
    params: [
      param('authReqId', '', 'string', true),
      param('interval', '5', 'number', true),
      param('timeoutSeconds', '30', 'number'),
    ],
    regions: ['pollCIBA'],
    returns: 'Promise<TokenResponse>',
    session: false,
    summary: 'Wait for a CIBA decision.',
  },
  {
    call: 'client.isSignedIn(sessionId)',
    description:
      'Whether the session holds a valid access token. An expired one is refreshed when the session has a refresh token; a session that cannot be refreshed is removed.',
    group: 'Session',
    id: 'isSignedIn',
    network: false,
    params: [],
    regions: ['isSignedIn'],
    returns: 'Promise<boolean>',
    session: true,
    summary: 'Session status.',
  },
  {
    call: 'client.getUser(sessionId)',
    description:
      'The signed-in user, read from the claims of the session ID token. Sends no request. Rejects with JS-AUTH_CORE-GU-NF01 when the session holds no ID token.',
    group: 'Session',
    id: 'getUser',
    network: false,
    params: [],
    regions: ['getUser'],
    returns: 'Promise<User>',
    session: true,
    summary: 'Current user.',
  },
  {
    call: 'client.getIdToken(sessionId)',
    description: 'The raw ID token of a signed-in session. Rejects when the session is not signed in.',
    group: 'Session',
    id: 'getIdToken',
    network: false,
    params: [],
    regions: ['getIdToken'],
    returns: 'Promise<string>',
    session: true,
    summary: 'ID token.',
  },
  {
    call: 'client.getDecodedIdToken(sessionId)',
    description: 'The claims of the session ID token. Rejects with JS-AUTH_CORE-GDIT-NF01 when there is none.',
    group: 'Session',
    id: 'getDecodedIdToken',
    network: false,
    params: [],
    regions: ['getDecodedIdToken'],
    returns: 'Promise<IdToken>',
    session: true,
    summary: 'Decoded ID token.',
  },
  {
    call: 'client.getAccessToken(sessionId)',
    description: 'The access token of the session, to call your APIs with. Empty for a session without tokens.',
    group: 'Session',
    id: 'getAccessToken',
    network: false,
    params: [],
    regions: ['getAccessToken'],
    returns: 'Promise<string>',
    session: true,
    summary: 'Access token.',
  },
  {
    call: 'client.decodeJwtToken(token)',
    description: 'Decodes the payload of any JWT, without verifying it. Paste an access or ID token.',
    group: 'Session',
    id: 'decodeJwtToken',
    network: false,
    params: [param('token', '', 'string', true)],
    regions: ['decodeJwtToken'],
    returns: 'Promise<Record<string, unknown>>',
    session: false,
    summary: 'Decode a JWT.',
  },
  {
    call: 'client.clearSession(sessionId)',
    description:
      'Removes the stored session and its back-channel logout index entries, locally. Running it as your browser session signs you out of the playground without telling ThunderID.',
    group: 'Session',
    id: 'clearSession',
    network: false,
    params: [],
    regions: ['clearSession'],
    returns: 'void',
    session: true,
    summary: 'Clear a session.',
  },
  {
    call: 'client.refreshAccessToken(sessionId)',
    description:
      'Uses the refresh token in the session to get new tokens and stores them. Needs the refresh_token grant on the application.',
    group: 'Tokens',
    id: 'refreshAccessToken',
    network: true,
    params: [],
    regions: ['refreshAccessToken'],
    returns: 'Promise<TokenResponse | User>',
    session: true,
    summary: 'Refresh tokens.',
  },
  {
    call: 'client.revokeAccessToken(sessionId)',
    description: 'Revokes the access token at ThunderID and clears the session.',
    group: 'Tokens',
    id: 'revokeAccessToken',
    network: true,
    params: [],
    regions: ['revokeAccessToken'],
    returns: 'Promise<Response | boolean>',
    session: true,
    summary: 'Revoke the access token.',
  },
  {
    args: json({
      attachToken: false,
      data: {
        client_id: '{{clientId}}',
        client_secret: '{{clientSecret}}',
        grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
        requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
        subject_token: '{{accessToken}}',
        subject_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      },
      id: 'playground-exchange',
      returnsSession: false,
      signInRequired: true,
    }),
    call: 'client.exchangeToken(config, sessionId)',
    description:
      'Sends a custom grant to the token endpoint: here an RFC 8693 token exchange of the session access token. With returnsSession, the response replaces the session tokens.',
    group: 'Tokens',
    id: 'exchangeToken',
    network: true,
    params: [],
    regions: ['exchangeToken'],
    returns: 'Promise<TokenResponse | Response | User>',
    session: true,
    summary: 'Token exchange (custom grant).',
  },
  {
    call: 'serviceClient.getAccessToken()',
    description: `Gets a token for the client itself with the client_credentials grant, and caches it until shortly before it expires. Uses ${config.serviceClientId ? `client ${config.serviceClientId}` : 'THUNDERID_SERVICE_CLIENT_ID, or THUNDERID_CLIENT_ID'}, which needs that grant.`,
    group: 'Tokens',
    id: 'clientCredentials',
    network: true,
    params: [],
    regions: ['serviceSetup', 'clientCredentials'],
    returns: 'Promise<string>',
    session: false,
    summary: 'Client credentials token.',
  },
  {
    call: 'client.signOut(sessionId)',
    description:
      'Returns the ThunderID end-session URL for the session, with its ID token as the hint. /logout redirects to it.',
    group: 'Sign-out',
    id: 'signOut',
    network: true,
    params: [],
    regions: ['signOut', 'logout'],
    returns: 'Promise<string>',
    session: true,
    summary: 'End-session URL.',
  },
  {
    call: 'client.handleBackchannelLogout(logoutToken)',
    description:
      'Validates a back-channel logout token that ThunderID posted, then ends the local sessions it names by sid, or by sub for sessions that began before it. An invalid or replayed token throws InvalidLogoutTokenError.',
    group: 'Sign-out',
    id: 'handleBackchannelLogout',
    network: true,
    params: [param('logoutToken', 'not-a-real-token', 'string', true)],
    regions: ['handleBackchannelLogout'],
    returns: 'Promise<BackchannelLogoutResult>',
    session: false,
    summary: 'OpenID Connect back-channel logout.',
  },
  {
    call: 'client.getUsers({filter, limit, offset}, sessionId)',
    description:
      'One page of the ThunderID user directory, requested with the session access token. The token needs the scopes the management API asks for.',
    group: 'Management API',
    id: 'getUsers',
    network: true,
    params: [param('limit', '10', 'number'), param('offset', '0', 'number'), param('filter')],
    regions: ['getUsers'],
    returns: 'Promise<ManagedUserListResponse>',
    session: true,
    summary: 'List users.',
  },
  {
    call: 'client.getFlows({flowType, limit, offset}, sessionId)',
    description: 'One page of the flows configured in ThunderID, requested with the session access token.',
    group: 'Management API',
    id: 'getFlows',
    network: true,
    params: [param('flowType', 'AUTHENTICATION'), param('limit', '10', 'number'), param('offset', '0', 'number')],
    regions: ['getFlows'],
    returns: 'Promise<ManagedFlowListResponse>',
    session: true,
    summary: 'List flows.',
  },
  {
    call: 'client.getUserTypes({limit, offset}, sessionId)',
    description: 'One page of the user types (schemas) in ThunderID, requested with the session access token.',
    group: 'Management API',
    id: 'getUserTypes',
    network: true,
    params: [param('limit', '10', 'number'), param('offset', '0', 'number')],
    regions: ['getUserTypes'],
    returns: 'Promise<ManagedUserTypeListResponse>',
    session: true,
    summary: 'List user types.',
  },
  {
    args: json({password: ''}),
    call: 'client.updateUserCredentials(payload, sessionId)',
    description:
      'Updates credentials of the signed-in user, such as password, through the /users/me credentials endpoint. Running it changes your real credentials.',
    group: 'Management API',
    id: 'updateUserCredentials',
    network: true,
    params: [],
    regions: ['updateUserCredentials'],
    returns: 'Promise<void>',
    session: true,
    summary: 'Update own credentials.',
  },
  management(
    'listGroups',
    'groups.list({limit, offset})',
    'Promise<GroupListResponse>',
    'List groups.',
    'One page of groups.',
  ),
  management(
    'getGroup',
    'groups.get(groupId)',
    'Promise<Group>',
    'Get a group.',
    'One group. An unknown id rejects with getGroup-NotFoundError-001.',
    [param('groupId', '', 'string', true)],
  ),
  management(
    'listGroupMembers',
    'groups.listMembers(groupId, {limit, offset})',
    'Promise<GroupMemberListResponse>',
    'List group members.',
    'The users, agents and groups in a group.',
    [param('groupId', '', 'string', true), ...page()],
  ),
  management(
    'listRoles',
    'roles.list({limit, offset})',
    'Promise<RoleListResponse>',
    'List roles.',
    'One page of roles.',
  ),
  management('getRole', 'roles.get(roleId)', 'Promise<Role>', 'Get a role.', 'One role, with its permissions.', [
    param('roleId', '', 'string', true),
  ]),
  management(
    'listRoleAssignments',
    'roles.listAssignments(roleId, {limit, offset, type})',
    'Promise<RoleAssignmentListResponse>',
    'List role assignments.',
    'Who holds a role. type is one of user, group, app or agent; empty lists all.',
    [param('roleId', '', 'string', true), param('type', '', 'user | group | app | agent'), ...page()],
  ),
  management(
    'listAgentTypes',
    'agentTypes.list({limit, offset})',
    'Promise<AgentTypeListResponse>',
    'List agent types.',
    'One page of agent types.',
  ),
  management(
    'listAgentGroups',
    'agents.listGroups(agentId, {limit, offset})',
    'Promise<MembershipGroupListResponse>',
    "List an agent's groups.",
    'The groups an agent belongs to.',
    [param('agentId', '', 'string', true), ...page()],
  ),
  management(
    'listAgentRoles',
    'agents.listRoles(agentId, {limit, offset})',
    'Promise<AgentRoleListResponse>',
    "List an agent's roles.",
    'The roles assigned to an agent.',
    [param('agentId', '', 'string', true), ...page()],
  ),
  management(
    'listUserGroups',
    'users.listGroups(userId, {limit, offset})',
    'Promise<MembershipGroupListResponse>',
    "List a user's groups.",
    'The groups a user belongs to. Your own user id is the sub claim of getDecodedIdToken().',
    [param('userId', '', 'string', true), ...page()],
  ),
  {
    call: 'hasPermission(getTokenPermissions(await client.getAccessToken(sessionId)), permission)',
    description:
      'Checks the session access token for a permission before calling groups.list(), the way an app gates an admin page. A granted parent permission (system, system:group) covers system:group:view. Resolves {allowed: false, granted, required} without calling ThunderID when the token lacks it.',
    group: 'Management client',
    id: 'permissionGatedGroups',
    network: true,
    params: [param('permission', 'system:group:view', 'string', true), ...page()],
    regions: ['permissionGatedGroups'],
    returns: 'Promise<{allowed: boolean, ...}>',
    session: true,
    summary: 'Permission-gated call.',
  },
  ...['signInSilently', 'signUp', 'recover', 'getUserProfile', 'updateUserProfile'].map(
    (name: string): OperationSpec => ({
      call: `client.${name}()`,
      description: NOT_IMPLEMENTED,
      group: 'Not available',
      id: name,
      network: false,
      params: [],
      regions: [],
      returns: 'Promise<never>',
      session: false,
      summary: 'Not implemented in @thunderid/node.',
      unavailable: NOT_IMPLEMENTED,
    }),
  ),
];

export default operations;

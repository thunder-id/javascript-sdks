// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// The API explorer shows each route's source by reading the `#region` blocks of this file, so keep
// a route's code inside its region.

import {fileURLToPath} from 'node:url';
import {
  getTokenPermissions,
  handleBackchannelLogout,
  handleFlow,
  handleSignIn,
  handleSignOut,
  hasPermission,
  protect,
  thunderID,
  type RoleAssigneeType,
  type ThunderIDNodeManagementClient,
  type ThunderIDRuntimeError,
  type TokenResponse,
} from '@thunderid/express';
import cookieParser from 'cookie-parser';
import express, {type NextFunction, type Request, type RequestHandler, type Response} from 'express';
import catalog from './catalog.ts';
import config from './config.ts';
import explorer from './explorer.ts';
import {clientOf, sessionOf} from './helpers.ts';
import {traceFetch, traceRequests, traceRoutes, traceSdkClient, traceSdkLogs} from './trace.ts';

traceSdkLogs();
traceFetch();

const app: express.Express = express();

app.use(traceRequests());
app.use(cookieParser());
app.use(express.json());

// #region setup
app.use(
  thunderID({
    afterSignInUrl: config.afterSignInUrl,
    afterSignOutUrl: config.afterSignOutUrl,
    applicationId: config.applicationId,
    baseUrl: config.baseUrl,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    // Per-collection management endpoint overrides (see .env.example). Unset keys resolve to
    // {baseUrl}/{collection}.
    endpoints: config.endpoints,
    flowSecret: config.flowSecret,
    onError: (res: Response, error: ThunderIDRuntimeError) =>
      res.status(500).json({error: error.code, message: error.message}),
    onSignIn: (res: Response) => res.redirect('/'),
    onSignOut: (res: Response) => res.redirect('/'),
    scopes: config.scopes,
  }),
);
// #endregion

app.use(traceSdkClient());

// #region unauthenticated
const unauthenticated = (res: Response): void => {
  res
    .status(401)
    .set('WWW-Authenticate', 'Bearer realm="playground"')
    .json({error: 'unauthenticated', message: 'Sign in to access this resource.'});
};
// #endregion

// #region requireScope
// protect() checks for a session only. Scope checks are up to the application: this one reads the
// `scope` claim of the session's access token.
const requireScope =
  (scope: string): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const client = clientOf(req);
    const accessToken: string = await client.getAccessToken(sessionOf(req));
    let granted: string[] = [];
    try {
      const claims = await client.decodeJwtToken<{scope?: string}>(accessToken);
      granted = claims.scope?.split(' ') ?? [];
    } catch {
      // An opaque access token has no claims to read, so it grants nothing here.
    }
    if (granted.includes(scope)) {
      next();
      return;
    }
    res.status(403).json({error: 'insufficient_scope', granted, required: [scope]});
  };
// #endregion

// #region requirePermission
// The same check with the SDK helpers: getTokenPermissions() reads the `scope` or `scopes` claim, and
// hasPermission() treats permissions as `:` paths, so `system` or `system:group` also cover
// `system:group:view`. The token is decoded, not verified; ThunderID still checks every request.
const requirePermission =
  (permission: string): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const granted: string[] = getTokenPermissions(await clientOf(req).getAccessToken(sessionOf(req)));
    if (hasPermission(granted, permission)) {
      next();
      return;
    }
    res.status(403).json({error: 'insufficient_permission', granted, required: permission});
  };
// #endregion

// #region management
// managementFromRequest() binds the management client to the request's session cookie: each call
// is sent with that session's access token, which stays on the server. ThunderID decides whether
// the token may read the resource; a 403 or 404 comes back as a ThunderIDAPIError.
const adminOf = (req: Request): ThunderIDNodeManagementClient => clientOf(req).managementFromRequest(req);

const page = (req: Request): {limit: number; offset: number} => ({
  limit: Number(req.query['limit'] ?? 10),
  offset: Number(req.query['offset'] ?? 0),
});
// #endregion

// #region login
app.get('/login', handleSignIn());
// #endregion

// #region logout
app.get('/logout', handleSignOut());
// #endregion

// #region flow
app.post('/flow/sign-in', handleFlow());
// #endregion

// #region backchannel
app.post('/backchannel-logout', handleBackchannelLogout());
// #endregion

// #region public
app.get('/api/public', (_req: Request, res: Response) => {
  res.json({message: 'Anyone can call this route.', time: new Date().toISOString()});
});
// #endregion

// #region session
app.get('/api/session', async (req: Request, res: Response) => {
  const sessionId = sessionOf(req);
  const signedIn = sessionId ? await clientOf(req).isSignedIn(sessionId) : false;
  res.json({sessionCookie: sessionId ? 'present' : 'absent', signedIn});
});
// #endregion

// #region me
app.get('/api/me', protect(unauthenticated), async (req: Request, res: Response) => {
  res.json(await clientOf(req).getUser(sessionOf(req)));
});
// #endregion

// #region idToken
app.get('/api/id-token', protect(unauthenticated), async (req: Request, res: Response) => {
  res.json(await clientOf(req).getDecodedIdToken(sessionOf(req)));
});
// #endregion

// #region refresh
// Not behind protect(), which would already have refreshed an expired access token: this route
// calls client.refreshAccessToken() on the session as it is.
app.post('/api/token/refresh', async (req: Request, res: Response) => {
  const sessionId = sessionOf(req);
  if (!sessionId) {
    unauthenticated(res);
    return;
  }
  const tokens = (await clientOf(req).refreshAccessToken(sessionId)) as TokenResponse;
  res.json({expiresIn: tokens.expiresIn, refreshed: true, scope: tokens.scope, tokenType: tokens.tokenType});
});
// #endregion

// #region orders
const orders = [
  {id: 'ord_1001', item: 'Noise-cancelling headphones', status: 'shipped', total: 249},
  {id: 'ord_1002', item: 'Mechanical keyboard', status: 'processing', total: 129},
];

app.get('/api/orders', protect(unauthenticated), (_req: Request, res: Response) => {
  res.json({orders});
});
// #endregion

// #region order
app.get('/api/orders/:id', protect(unauthenticated), (req: Request, res: Response) => {
  const order = orders.find((o) => o.id === req.params['id']);
  if (!order) {
    res.status(404).json({error: 'not_found'});
    return;
  }
  res.json(order);
});
// #endregion

// #region admin
app.get(
  '/api/admin/users',
  protect(unauthenticated),
  requireScope(config.adminScope),
  async (req: Request, res: Response) => {
    const limit = Number(req.query['limit'] ?? 10);
    res.json(await clientOf(req).getUsers({limit}, sessionOf(req)));
  },
);
// #endregion

// #region groups
app.get('/api/management/groups', protect(unauthenticated), async (req: Request, res: Response) => {
  res.json(await adminOf(req).groups.list(page(req)));
});
// #endregion

// #region group
app.get('/api/management/groups/:id', protect(unauthenticated), async (req: Request, res: Response) => {
  res.json(await adminOf(req).groups.get(req.params['id'] as string));
});
// #endregion

// #region groupMembers
app.get('/api/management/groups/:id/members', protect(unauthenticated), async (req: Request, res: Response) => {
  res.json(await adminOf(req).groups.listMembers(req.params['id'] as string, page(req)));
});
// #endregion

// #region roles
app.get('/api/management/roles', protect(unauthenticated), async (req: Request, res: Response) => {
  res.json(await adminOf(req).roles.list(page(req)));
});
// #endregion

// #region role
app.get('/api/management/roles/:id', protect(unauthenticated), async (req: Request, res: Response) => {
  res.json(await adminOf(req).roles.get(req.params['id'] as string));
});
// #endregion

// #region roleAssignments
// `type` narrows the assignments to users, groups, apps or agents.
app.get('/api/management/roles/:id/assignments', protect(unauthenticated), async (req: Request, res: Response) => {
  const type = req.query['type'] ? (req.query['type'] as RoleAssigneeType) : undefined;
  res.json(await adminOf(req).roles.listAssignments(req.params['id'] as string, {...page(req), type}));
});
// #endregion

// #region agentTypes
app.get('/api/management/agent-types', protect(unauthenticated), async (req: Request, res: Response) => {
  res.json(await adminOf(req).agentTypes.list(page(req)));
});
// #endregion

// #region userGroups
app.get('/api/management/users/:id/groups', protect(unauthenticated), async (req: Request, res: Response) => {
  res.json(await adminOf(req).users.listGroups(req.params['id'] as string, page(req)));
});
// #endregion

// #region adminGroups
app.get(
  '/api/admin/groups',
  protect(unauthenticated),
  requirePermission(config.groupsPermission),
  async (req: Request, res: Response) => {
    res.json(await adminOf(req).groups.list(page(req)));
  },
);
// #endregion

traceRoutes(app.router as unknown as Parameters<typeof traceRoutes>[0], catalog.chains());

app.use('/_playground', explorer());
app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

// #region errors
app.use((err: Error & {code?: string; statusCode?: number}, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(err.statusCode ?? 500).json({error: err.code ?? err.name, message: err.message});
});
// #endregion

app.listen(config.port, () => {
  process.stdout.write(`ThunderID Express playground on ${config.appUrl} (ThunderID at ${config.baseUrl})\n`);
});

// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {executeEmbeddedSignInFlow, resolveResourceEndpoint, logger as Logger} from '@thunderid/node';
import express from 'express';
import ThunderIDExpressClient from '../ThunderIDExpressClient';

/**
 * Returns an Express route handler that drives the embedded sign-in flow loop.
 *
 * Requires `thunderID()` middleware with `mode: 'embedded'` to be mounted first.
 * On each POST, the handler advances the flow one step and returns JSON.
 *
 * **First call** — no `executionId`:
 * ```json
 * { "applicationId": "app-id", "flowType": "SIGN_IN" }
 * ```
 * Response includes `executionId`, `challengeToken`, `authId`, and `components`
 * (the UI elements to render).
 *
 * **Subsequent calls** — continue the flow:
 * ```json
 * { "executionId": "...", "challengeToken": "...", "authId": "...", "inputs": { ... } }
 * ```
 *
 * **On completion** — flow returns `{ "done": true, "redirectUrl": "/login?code=..." }`.
 * The client navigates to `redirectUrl`, which is handled by `handleSignIn()` to
 * exchange the code and set the session cookie.
 *
 * ```ts
 * app.use(thunderID({ ..., mode: 'embedded' }));
 * app.get('/login',          handleSignIn());
 * app.post('/flow/sign-in',  handleFlow());
 * app.get('/logout',         handleSignOut());
 * ```
 */
const handleFlow = (): express.RequestHandler => {
  return async (req: express.Request, res: express.Response): Promise<void> => {
    const client: ThunderIDExpressClient | undefined = (req as any).thunderIDAuth;

    if (!client) {
      Logger.error('thunderID() middleware must be mounted before handleFlow()');
      res.status(500).json({error: 'SDK not initialised'});
      return;
    }

    const config = client.expressConfig;
    const baseUrl = config?.baseUrl;

    if (!baseUrl) {
      res.status(500).json({error: 'baseUrl is not configured'});
      return;
    }

    const {applicationId, flowType, executionId, challengeToken, authId, inputs} = req.body ?? {};

    try {
      // On the first call (no executionId), derive authId from the OAuth2 authorization URL.
      let resolvedAuthId: string | undefined = authId;
      if (!executionId && !resolvedAuthId) {
        const authUrl: string = await client.getSignInUrl();
        const parsed = new URL(authUrl);
        resolvedAuthId = parsed.searchParams.get('authId') ?? undefined;
      }

      const payload = executionId
        ? {action: 'submit', challengeToken, executionId, inputs}
        : {applicationId, flowType: flowType ?? 'SIGN_IN'};

      const flowResponse = await executeEmbeddedSignInFlow({
        authId: resolvedAuthId,
        baseUrl: baseUrl,
        flowSecret: config?.flowSecret ?? process.env['THUNDERID_FLOW_SECRET'],
        payload,
        sessionStore: client.flowSessionStore,
        url: resolveResourceEndpoint('flowExecute', config),
      });

      if (flowResponse.redirectUrl) {
        res.json({done: true, redirectUrl: flowResponse.redirectUrl});
        return;
      }

      res.json({
        authId: resolvedAuthId,
        challengeToken: flowResponse.challengeToken,
        components: (flowResponse as any).data?.meta?.components ?? [],
        executionId: flowResponse.executionId,
        flowStatus: flowResponse.flowStatus,
      });
    } catch (e: any) {
      Logger.error(e.message);
      res.status(500).json({error: e.message ?? 'Flow execution failed'});
    }
  };
};

export default handleFlow;

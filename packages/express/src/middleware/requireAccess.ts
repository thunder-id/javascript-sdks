// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AccessEvaluationRequest, AccessEvaluationResponse, logger as Logger} from '@thunderid/node';
import express from 'express';
import ThunderIDExpressClient from '../ThunderIDExpressClient';

/**
 * Options for {@link requireAccess}.
 */
export interface RequireAccessOptions {
  /**
   * Called when the decision is a denial. Defaults to answering `403`.
   */
  onDenied?: (req: express.Request, res: express.Response, decision: AccessEvaluationResponse) => void;
  /**
   * Called when the evaluation itself fails (transport or a 4xx/5xx answer). Defaults to answering
   * `500`. The request is never let through on a failure.
   */
  onError?: (req: express.Request, res: express.Response, error: unknown) => void;
  /**
   * The server-level secret, when it is not set as `accessEvaluation.secret` in the configuration.
   */
  secret?: string;
}

/**
 * Returns Express middleware that asks the server's AuthZEN policy decision point whether the request
 * may proceed, and answers `403` on a denial. The application maps the request to a subject, an action
 * and a resource. Requires `thunderID()` to be mounted first.
 *
 * ```ts
 * app.get(
 *   '/bookings/:id',
 *   protect(),
 *   requireAccess(async (req) => ({
 *     subject: {type: 'user', id: (await req.thunderIDAuth.getUserFromRequest(req))?.sub},
 *     resource: {type: 'https://api.example.com/booking', id: req.params.id},
 *     action: {name: 'booking:read'},
 *   })),
 *   handler,
 * );
 * ```
 */
const requireAccess = (
  toRequest: (req: express.Request) => AccessEvaluationRequest | Promise<AccessEvaluationRequest>,
  options: RequireAccessOptions = {},
): ((req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    const client: ThunderIDExpressClient | undefined = (req as unknown as {thunderIDAuth?: ThunderIDExpressClient})
      .thunderIDAuth;

    if (!client) {
      Logger.error('thunderID() middleware must be mounted before requireAccess()');
      res.status(500).end();
      return;
    }

    let decision: AccessEvaluationResponse;

    try {
      decision = await client.evaluateAccess(await toRequest(req), {secret: options.secret});
    } catch (error) {
      if (options.onError) {
        options.onError(req, res, error);
      } else {
        Logger.error('Access evaluation failed.');
        res.status(500).end();
      }
      return;
    }

    if (decision?.decision === true) {
      next();
      return;
    }

    if (options.onDenied) {
      options.onDenied(req, res, decision);
    } else {
      res.status(403).end();
    }
  };
};

export default requireAccess;

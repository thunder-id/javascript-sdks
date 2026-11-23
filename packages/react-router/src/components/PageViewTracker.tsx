// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useThunderID} from '@thunderid/react';
import {FC, useContext, useEffect} from 'react';
import {UNSAFE_DataRouterContext, UNSAFE_RouteContext, useLocation} from 'react-router';

interface MatchedRoute {
  route: {path?: string};
}

interface RouteContextValue {
  matches: MatchedRoute[];
  outlet: unknown;
}

/**
 * The matches down to the page itself. With `<Routes>`, a tracker in a layout (such as the
 * `ProtectedRoute` around it) sees only the layout's match; the page it renders through `<Outlet>`
 * is the outlet's own route context, which this follows to the deepest one.
 */
const deepestMatches = (context: RouteContextValue): MatchedRoute[] => {
  let current: RouteContextValue = context;
  for (let depth = 0; depth < 32; depth += 1) {
    const next: RouteContextValue | undefined = (current.outlet as {props?: {routeContext?: RouteContextValue}} | null)
      ?.props?.routeContext;
    if (!next?.matches || next.matches.length <= current.matches.length) {
      break;
    }
    current = next;
  }
  return current.matches;
};

interface Reported {
  /**
   * The navigation a page view was last reported for.
   */
  key?: string;
  /**
   * How many trackers are mounted.
   */
  trackers: number;
}

/**
 * By the provider's telemetry: the navigation a page view was last reported for, so that when several
 * trackers are rendered for one page (a `ProtectedRoute` around a layout and around a page in it), only
 * one reports, while trackers of another provider still report to theirs. It is forgotten once no
 * tracker is mounted, so coming back to a page through a route without one reports it again.
 */
const reported = new WeakMap<object, Reported>();

const recordOf = (telemetry: object): Reported => {
  let record: Reported | undefined = reported.get(telemetry);
  if (!record) {
    record = {trackers: 0};
    reported.set(telemetry, record);
  }
  return record;
};

/**
 * The full route pattern of a list of matched routes, such as `/organizations/:org/applications/:id`.
 */
const patternOf = (matches: MatchedRoute[]): string => {
  const pattern: string = matches
    .map((match: MatchedRoute) => match.route.path ?? '')
    .filter((path: string) => path !== '')
    .reduce(
      (whole: string, path: string) => (path.startsWith('/') ? path : `${whole.replace(/\/+$/, '')}/${path}`),
      '',
    );
  return pattern.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1') || '/';
};

/**
 * Reports a page view on each navigation, named from the matched route pattern; the URL itself never
 * leaves the browser. Does nothing unless the provider configures `telemetry`.
 *
 * With a data router (`createBrowserRouter`), it can be rendered anywhere and reports the full
 * pattern of the page. With `<Routes>`, it reports the deepest route matched below where it is
 * rendered, so a tracker in a layout reports the nested page it shows through `<Outlet>`.
 * `ProtectedRoute` renders one around what it protects.
 */
const PageViewTracker: FC = () => {
  const {isInitialized, telemetry} = useThunderID();
  const dataRouter: {router: {state: {matches: MatchedRoute[]}}} | null = useContext(UNSAFE_DataRouterContext) as {
    router: {state: {matches: MatchedRoute[]}};
  } | null;
  const route: RouteContextValue = useContext(UNSAFE_RouteContext) as unknown as RouteContextValue;
  const location: {key: string; pathname: string} = useLocation();

  useEffect(() => {
    if (!telemetry) {
      return undefined;
    }
    const record: Reported = recordOf(telemetry);
    record.trackers += 1;
    return (): void => {
      record.trackers -= 1;
      // Deferred, so a tracker mounted again in the same commit (as React's strict mode does) keeps it.
      queueMicrotask(() => {
        if (record.trackers === 0) {
          record.key = undefined;
        }
      });
    };
  }, [telemetry]);

  useEffect(() => {
    // Telemetry starts during initialization, so a navigation before then is reported once it is ready.
    if (!isInitialized || !telemetry) {
      return;
    }
    // Effects run from the deepest component up, so the tracker nearest the page reports first.
    const key = `${location.key}:${location.pathname}`;
    const record: Reported = recordOf(telemetry);
    if (record.key === key) {
      return;
    }
    const matches: MatchedRoute[] = dataRouter?.router.state.matches ?? deepestMatches(route);
    if (matches.length === 0) {
      return;
    }
    record.key = key;
    telemetry.trackPageView(patternOf(matches));
  }, [isInitialized, telemetry, location.key, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

export default PageViewTracker;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useThunderID} from '@thunderid/react';
import {ReactElement, useState} from 'react';
import {describeError, track} from '../lib/events';
import {formatClaim, formatDuration} from '../lib/jwt';
import {href} from '../lib/router';
import {asText, sdkSignIn, sdkSignOut, toUser, SdkUser} from '../lib/sdk';
import {SessionSnapshot, useNow, useSession} from '../lib/session';
import {getDisplayName, getEmail, getInitials} from '../lib/user';

const SessionCard = (): ReactElement => {
  const sdk = useThunderID();
  const {isSignedIn, isInitialized, signInSilently} = sdk;
  const user: SdkUser | null = toUser(sdk.user);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session: SessionSnapshot = useSession(refreshKey);
  const now: number = useNow();

  const act = async (label: string, call: () => Promise<unknown>): Promise<void> => {
    setBusy(label);
    setError(null);

    try {
      await track(label, call);
      setRefreshKey((key: number) => key + 1);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(null);
    }
  };

  const remaining: number | null = session.expiresAt ? session.expiresAt - now : null;
  const lifetime: number | null = session.expiresAt && session.issuedAt ? session.expiresAt - session.issuedAt : null;
  const percent: number = remaining !== null && lifetime ? Math.max(0, Math.min(100, (remaining / lifetime) * 100)) : 0;
  const claims: [string, unknown][] = session.idClaims
    ? (
        [
          ['sub', session.idClaims['sub']],
          ['scope', session.scope ?? session.idClaims['scope']],
          ['amr', session.idClaims['amr']],
        ] as [string, unknown][]
      ).filter(([, value]: [string, unknown]) => value !== undefined)
    : [];

  return (
    <section aria-label="Session" className="pg-card">
      <div className="pg-card-head">
        <h2>Session</h2>
        <span className="pg-pill" data-state={isSignedIn ? 'ok' : isInitialized ? undefined : 'warn'}>
          {isSignedIn ? 'Signed in' : isInitialized ? 'Signed out' : 'Initializing'}
        </span>
      </div>
      <div className="pg-card-body">
        <div className="pg-user">
          <div className="pg-avatar" data-size="lg" data-anon={!isSignedIn} aria-hidden="true">
            {isSignedIn ? getInitials(user) : '?'}
          </div>
          <div>
            <div className="pg-user-name">{isSignedIn ? getDisplayName(user) : 'No active session'}</div>
            <div className="pg-user-sub">
              {isSignedIn ? (getEmail(user) ?? asText(user?.['sub'])) : 'Sign in to inspect tokens and claims.'}
            </div>
          </div>
        </div>

        {isSignedIn && (
          <div>
            <div className="pg-progress-head">
              <span>Access token</span>
              <span className="pg-mono">
                {remaining === null
                  ? 'expiry unknown'
                  : remaining > 0
                    ? `expires in ${formatDuration(remaining)}`
                    : 'expired'}
              </span>
            </div>
            <div
              className="pg-progress"
              role="progressbar"
              aria-label="Access token lifetime remaining"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(percent)}
            >
              <div style={{width: `${percent}%`}} />
            </div>
          </div>
        )}

        {claims.length > 0 && (
          <dl className="pg-dl">
            {claims.map(([key, value]: [string, unknown]) => (
              <div key={key} style={{display: 'contents'}}>
                <dt>{key}</dt>
                <dd>{formatClaim(value)}</dd>
              </div>
            ))}
          </dl>
        )}

        {(error ?? session.error) && (
          <p className="pg-cap-note" data-status="fail">
            {error ?? session.error}
          </p>
        )}

        <div className="pg-row">
          {isSignedIn ? (
            <>
              <button
                type="button"
                className="pg-btn"
                disabled={!!busy}
                onClick={() => void act('signInSilently', () => signInSilently())}
                title="@thunderid/react exposes no manual refresh; signInSilently() renews the session instead"
              >
                {busy === 'signInSilently' ? 'Renewing' : 'Renew silently'}
              </button>
              <a className="pg-btn" href={href('tokens')}>
                Decode tokens
              </a>
              <button
                type="button"
                className="pg-btn"
                data-variant="danger"
                disabled={!!busy}
                onClick={() => void act('signOut', () => sdkSignOut(sdk))}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              className="pg-btn"
              data-variant="primary"
              disabled={!!busy || !isInitialized}
              onClick={() =>
                void act('signIn', () =>
                  // Same arguments as <SignInButton />, so a configured resource reaches both requests.
                  sdkSignIn(
                    sdk,
                    sdk.signInOptions,
                    undefined,
                    undefined,
                    undefined,
                    sdk.tokenRequest?.params ? {params: sdk.tokenRequest.params} : undefined,
                  ),
                )
              }
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default SessionCard;

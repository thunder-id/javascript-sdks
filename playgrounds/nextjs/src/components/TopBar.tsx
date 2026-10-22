// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {useThunderID} from '@thunderid/nextjs';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ReactElement, useEffect} from 'react';
import {Logo, NextLogo} from './Icons';
import {checkServerHealth, useServerHealth} from '../lib/health';
import {toUser, SdkUser} from '../lib/sdk';
import {getDisplayName, getInitials} from '../lib/user';

const NAV: [string, string][] = [
  ['/', 'Overview'],
  ['/components', 'Components'],
  ['/hooks', 'Hooks'],
  ['/server', 'Server'],
  ['/tokens', 'Tokens'],
];

const isCurrent = (pathname: string, target: string): boolean =>
  target === '/' ? pathname === '/' : pathname === target || pathname.startsWith(`${target}/`);

const TopBar = ({baseUrl}: {baseUrl: string}): ReactElement => {
  const sdk = useThunderID();
  const isSignedIn = !!sdk.isSignedIn;
  const user: SdkUser | null = toUser(sdk.user);
  const health = useServerHealth();
  const pathname: string = usePathname();

  useEffect(() => {
    void checkServerHealth();
  }, []);

  const host: string = baseUrl.replace(/^https?:\/\//, '');

  return (
    <header className="pg-topbar">
      <div className="pg-brand">
        <Logo />
        <span className="pg-brand-divider" aria-hidden="true" />
        <NextLogo />
        <strong>Next.js Playground</strong>
      </div>
      <nav aria-label="Playground sections" className="pg-nav">
        {NAV.map(([target, label]: [string, string]) => (
          <Link key={target} href={target} aria-current={isCurrent(pathname, target) ? 'page' : undefined}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="pg-spacer" />
      <span className="pg-server" title={health.detail}>
        <span className="pg-dot" data-state={health.state} />
        {host}
      </span>
      <div
        className="pg-avatar"
        data-anon={!isSignedIn}
        role="img"
        aria-label={isSignedIn ? `Signed in as ${getDisplayName(user)}` : 'Signed out'}
      >
        {isSignedIn ? getInitials(user) : '?'}
      </div>
    </header>
  );
};

export default TopBar;

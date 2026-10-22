// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDProvider} from '@thunderid/nextjs/server';
import type {Metadata} from 'next';
import {ReactElement, ReactNode} from 'react';
import SdkObserver from '../components/SdkObserver';
import TopBar from '../components/TopBar';
import {getConfigSummary, getManagementEndpointOverrides} from '../lib/serverConfig';
import './globals.css';

// The session lives in a cookie, so every page renders per request.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  description: 'Exercise every capability of @thunderid/nextjs against a local ThunderID server.',
  icons: '/favicon.svg',
  title: 'ThunderID Next.js Playground',
};

const RootLayout = ({children}: {children: ReactNode}): ReactElement => (
  <html lang="en">
    <head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
    </head>
    <body>
      {/* Reads NEXT_PUBLIC_THUNDERID_* and THUNDERID_* from the environment. The SDK reads no variable for
          `endpoints`, so the playground's management overrides are passed as a prop. */}
      <ThunderIDProvider endpoints={getManagementEndpointOverrides()}>
        <div className="pg-app">
          <SdkObserver />
          <TopBar baseUrl={getConfigSummary().baseUrl} />
          {children}
        </div>
      </ThunderIDProvider>
    </body>
  </html>
);

export default RootLayout;

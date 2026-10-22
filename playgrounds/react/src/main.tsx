// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDProvider} from '@thunderid/react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import playgroundConfig from './config';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThunderIDProvider
      afterSignInUrl={playgroundConfig.afterSignInUrl}
      afterSignOutUrl={playgroundConfig.afterSignOutUrl}
      applicationId={playgroundConfig.applicationId}
      baseUrl={playgroundConfig.baseUrl}
      clientId={playgroundConfig.clientId}
      endpoints={playgroundConfig.endpoints}
      scopes={playgroundConfig.scopes}
      storage={playgroundConfig.storage}
    >
      <App />
    </ThunderIDProvider>
  </StrictMode>,
);

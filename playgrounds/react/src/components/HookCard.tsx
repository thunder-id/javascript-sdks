// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ReactElement, ReactNode} from 'react';
import {track} from '../lib/events';
import {inspect} from '../lib/inspect';

interface HookCardProps {
  actions?: ReactNode;
  children?: ReactNode;
  name: string;
  signature: string;
  value: unknown;
}

export const HookCard = ({actions = null, children = null, name, signature, value}: HookCardProps): ReactElement => (
  <section className="pg-card" aria-label={name}>
    <div className="pg-card-head">
      <div>
        <h2 className="pg-mono">{name}</h2>
        <div className="pg-hook-sig">{signature}</div>
      </div>
      {actions && <div className="pg-row">{actions}</div>}
    </div>
    {children}
    <pre className="pg-json">{inspect(value)}</pre>
  </section>
);

export interface QueryLike {
  data: unknown;
  error: Error | null;
  isLoading: boolean;
  refetch: () => Promise<unknown>;
}

interface QueryCardProps {
  children?: ReactNode;
  /** Disables Fetch, for example while a hook that needs an ID has none. */
  disabled?: boolean;
  name: string;
  query: QueryLike;
  signature?: string;
}

export const QueryCard = ({
  children = null,
  disabled = false,
  name,
  query,
  signature = '({limit}, {enabled: false}) => {data, error, isLoading, refetch}',
}: QueryCardProps): ReactElement => (
  <HookCard
    name={name}
    signature={signature}
    value={{data: query.data, error: query.error?.message ?? null, isLoading: query.isLoading}}
    actions={
      <button
        type="button"
        className="pg-btn"
        data-size="sm"
        disabled={disabled}
        onClick={() => void track(name, () => query.refetch()).catch(() => undefined)}
      >
        Fetch
      </button>
    }
  >
    {children ?? (
      <p className="pg-empty">
        Management hook. Calls the ThunderID management API with the signed-in user&apos;s token.
      </p>
    )}
  </HookCard>
);

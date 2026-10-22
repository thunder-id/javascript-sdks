// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {MANAGEMENT_COLLECTION_KEYS} from '@thunderid/node';
import type {ManagementCollectionKey} from '@thunderid/node';
import type {ThunderIDNextConfig} from '../models/config';

/**
 * Picks the management collection overrides out of `config.endpoints`, so the browser builds the
 * same URLs the server will accept, without receiving the other endpoint overrides.
 */
export const pickManagementEndpoints = (
  endpoints: ThunderIDNextConfig['endpoints'] | undefined,
): Partial<Record<ManagementCollectionKey, string>> | undefined => {
  if (!endpoints) {
    return undefined;
  }

  const picked: Partial<Record<ManagementCollectionKey, string>> = {};

  MANAGEMENT_COLLECTION_KEYS.forEach((key: ManagementCollectionKey) => {
    const value: unknown = (endpoints as Record<string, unknown>)[key];

    if (typeof value === 'string' && value) {
      picked[key] = value;
    }
  });

  return Object.keys(picked).length > 0 ? picked : undefined;
};

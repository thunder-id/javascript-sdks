// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  User,
  createHttpClientFetcher,
  updateMeProfile as baseUpdateMeProfile,
  UpdateMeProfileConfig as BaseUpdateMeProfileConfig,
} from '@thunderid/browser';

export interface UpdateMeProfileConfig extends Omit<BaseUpdateMeProfileConfig, 'fetcher'> {
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
  instanceId?: number;
}

const updateMeProfile = async ({fetcher, instanceId = 0, ...requestConfig}: UpdateMeProfileConfig): Promise<User> => {
  return baseUpdateMeProfile({
    ...requestConfig,
    // Keeps a refused response, so the server's error, such as a step-up challenge, reaches the caller.
    fetcher: fetcher ?? createHttpClientFetcher(instanceId),
  });
};

export default updateMeProfile;

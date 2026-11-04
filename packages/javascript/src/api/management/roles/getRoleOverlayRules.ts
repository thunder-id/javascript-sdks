// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagementRequestConfig} from '../../../models/api';
import {RoleResolvedOverlay} from '../../../models/sharing-policy';
import requestManagementResource from '../../../utils/requestManagementResource';

/**
 * Configuration for the getRoleOverlayRules request.
 */
export interface GetRoleOverlayRulesConfig extends ManagementRequestConfig {
  /**
   * Identifier of the role.
   */
  roleId: string;
  /**
   * Identifier of the organization unit to resolve the rules for.
   */
  ouId: string;
}

/**
 * Retrieves what an organization unit may do with a role: whether it owns it, which policies reached it,
 * and whether it may assign the role. An organization unit no policy reaches gets a not-found error.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the resolved overlay.
 *
 * @example
 * ```typescript
 * const {rules} = await getRoleOverlayRules({baseUrl: 'https://localhost:8090', roleId, ouId});
 * ```
 */
const getRoleOverlayRules = async ({
  roleId,
  ouId,
  ...config
}: GetRoleOverlayRulesConfig): Promise<RoleResolvedOverlay> =>
  requestManagementResource<RoleResolvedOverlay>(config, {
    collection: 'roles',
    failureMessage: 'Failed to fetch overlay rules',
    id: roleId,
    method: 'GET',
    operation: 'getRoleOverlayRules',
    query: {ouId},
    subPath: 'overlay-rules',
  });

export default getRoleOverlayRules;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import getActions from './getActions';
import getResources from './getResources';
import {ManagementRequestConfig} from '../../../models/api';
import {ManagedAction, ManagedResource, ResourceServerPermission} from '../../../models/resource-server';

/**
 * Configuration for the getResourceServerPermissions request.
 */
export interface GetResourceServerPermissionsConfig extends ManagementRequestConfig {
  /**
   * Largest number of resources, and of actions per resource, to read.
   * @default 100
   */
  limit?: number;
  /**
   * Identifier of the resource server.
   */
  resourceServerId: string;
}

/**
 * Lists the permissions a role can be granted on a resource server: the actions on the resource server
 * itself and on each of its top-level resources, as `getActions` and `getResources` return them. It is
 * what a permission picker offers, such as the one `RolePermissions` shows when it is editable.
 *
 * @param config - Request configuration object.
 * @returns A promise that resolves with the permissions, each once, in the order the server listed them.
 *
 * @example
 * ```typescript
 * const permissions = await getResourceServerPermissions({baseUrl: 'https://localhost:8090', resourceServerId});
 * ```
 */
const getResourceServerPermissions = async ({
  limit = 100,
  resourceServerId,
  ...config
}: GetResourceServerPermissionsConfig): Promise<ResourceServerPermission[]> => {
  const [serverActions, resources] = await Promise.all([
    getActions({...config, limit, resourceServerId}),
    getResources({...config, limit, resourceServerId}),
  ]);
  const resourceActions: {actions: ManagedAction[]; resource: ManagedResource}[] = await Promise.all(
    (resources.resources ?? []).map(async (resource: ManagedResource) => ({
      actions: (await getActions({...config, limit, resourceId: resource.id, resourceServerId})).actions ?? [],
      resource,
    })),
  );
  const seen: Set<string> = new Set<string>();
  const permissions: ResourceServerPermission[] = [];
  const add = (action: ManagedAction, resource?: ManagedResource): void => {
    if (!action.permission || seen.has(action.permission)) {
      return;
    }
    seen.add(action.permission);
    permissions.push({
      name: action.name,
      permission: action.permission,
      ...(resource ? {resourceName: resource.name} : {}),
    });
  };

  (serverActions.actions ?? []).forEach((action: ManagedAction) => add(action));
  resourceActions.forEach(({actions, resource}) => actions.forEach((action: ManagedAction) => add(action, resource)));

  return permissions;
};

export default getResourceServerPermissions;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import createApplicationSharingPolicy from '../api/management/applications/createApplicationSharingPolicy';
import deleteApplicationSharingPolicy from '../api/management/applications/deleteApplicationSharingPolicy';
import getApplicationOverlayRules from '../api/management/applications/getApplicationOverlayRules';
import getApplicationSharingPolicies from '../api/management/applications/getApplicationSharingPolicies';
import updateApplicationSharingPolicy from '../api/management/applications/updateApplicationSharingPolicy';
import createFlowSharingPolicy from '../api/management/flows/createFlowSharingPolicy';
import deleteFlowSharingPolicy from '../api/management/flows/deleteFlowSharingPolicy';
import getFlowOverlayRules from '../api/management/flows/getFlowOverlayRules';
import getFlowSharingPolicies from '../api/management/flows/getFlowSharingPolicies';
import updateFlowSharingPolicy from '../api/management/flows/updateFlowSharingPolicy';
import createRoleSharingPolicy from '../api/management/roles/createRoleSharingPolicy';
import deleteRoleSharingPolicy from '../api/management/roles/deleteRoleSharingPolicy';
import getRoleOverlayRules from '../api/management/roles/getRoleOverlayRules';
import getRoleSharingPolicies from '../api/management/roles/getRoleSharingPolicies';
import updateRoleSharingPolicy from '../api/management/roles/updateRoleSharingPolicy';
import createUserSharingPolicy from '../api/management/users/createUserSharingPolicy';
import deleteUserSharingPolicy from '../api/management/users/deleteUserSharingPolicy';
import getUserOverlayRules from '../api/management/users/getUserOverlayRules';
import getUserSharingPolicies from '../api/management/users/getUserSharingPolicies';
import updateUserSharingPolicy from '../api/management/users/updateUserSharingPolicy';
import {ManagementRequestConfig} from '../models/api';
import {
  ResolvedOverlay,
  SharingPolicy,
  SharingPolicyChildUnit,
  SharingPolicyChildUnits,
  SharingPolicyListResponse,
  SharingPolicyOtherTreeRootsSelected,
  SharingPolicyRequest,
  SharingPolicyUpdateRequest,
} from '../models/sharing-policy';

/**
 * The kinds of resource that carry sharing policies.
 */
export type SharingResourceType = 'user' | 'application' | 'role' | 'flow';

/**
 * The management collection that holds each kind of shared resource.
 */
export const SHARING_RESOURCE_COLLECTIONS: Record<SharingResourceType, 'users' | 'applications' | 'roles' | 'flows'> = {
  application: 'applications',
  flow: 'flows',
  role: 'roles',
  user: 'users',
};

/**
 * The sharing operations of one kind of resource, addressed by the resource's identifier.
 */
export interface SharingPolicyOperations {
  create: (
    config: ManagementRequestConfig & {payload: SharingPolicyRequest; resourceId: string},
  ) => Promise<SharingPolicy>;
  delete: (config: ManagementRequestConfig & {policyId: string; resourceId: string}) => Promise<void>;
  getOverlayRules: (config: ManagementRequestConfig & {ouId: string; resourceId: string}) => Promise<ResolvedOverlay>;
  list: (
    config: ManagementRequestConfig & {limit?: number; offset?: number; resourceId: string},
  ) => Promise<SharingPolicyListResponse>;
  update: (
    config: ManagementRequestConfig & {payload: SharingPolicyUpdateRequest; policyId: string; resourceId: string},
  ) => Promise<SharingPolicy>;
}

/**
 * Returns the existing sharing operations for a kind of resource, so a component can manage the
 * policies of a user, an application, a role or a flow the same way.
 *
 * @param resourceType - The kind of resource.
 * @returns The operations, each taking the resource's identifier as `resourceId`.
 */
export const getSharingPolicyOperations = (resourceType: SharingResourceType): SharingPolicyOperations => {
  switch (resourceType) {
    case 'application':
      return {
        create: ({resourceId, ...config}) => createApplicationSharingPolicy({...config, applicationId: resourceId}),
        delete: ({resourceId, ...config}) => deleteApplicationSharingPolicy({...config, applicationId: resourceId}),
        getOverlayRules: ({resourceId, ...config}) =>
          getApplicationOverlayRules({...config, applicationId: resourceId}),
        list: ({resourceId, ...config}) => getApplicationSharingPolicies({...config, applicationId: resourceId}),
        update: ({resourceId, ...config}) => updateApplicationSharingPolicy({...config, applicationId: resourceId}),
      };
    case 'role':
      return {
        create: ({resourceId, ...config}) => createRoleSharingPolicy({...config, roleId: resourceId}),
        delete: ({resourceId, ...config}) => deleteRoleSharingPolicy({...config, roleId: resourceId}),
        getOverlayRules: ({resourceId, ...config}) => getRoleOverlayRules({...config, roleId: resourceId}),
        list: ({resourceId, ...config}) => getRoleSharingPolicies({...config, roleId: resourceId}),
        update: ({resourceId, ...config}) => updateRoleSharingPolicy({...config, roleId: resourceId}),
      };
    case 'flow':
      return {
        create: ({resourceId, ...config}) => createFlowSharingPolicy({...config, flowId: resourceId}),
        delete: ({resourceId, ...config}) => deleteFlowSharingPolicy({...config, flowId: resourceId}),
        getOverlayRules: ({resourceId, ...config}) => getFlowOverlayRules({...config, flowId: resourceId}),
        list: ({resourceId, ...config}) => getFlowSharingPolicies({...config, flowId: resourceId}),
        update: ({resourceId, ...config}) => updateFlowSharingPolicy({...config, flowId: resourceId}),
      };
    case 'user':
    default:
      return {
        create: ({resourceId, ...config}) => createUserSharingPolicy({...config, userId: resourceId}),
        delete: ({resourceId, ...config}) => deleteUserSharingPolicy({...config, userId: resourceId}),
        getOverlayRules: ({resourceId, ...config}) => getUserOverlayRules({...config, userId: resourceId}),
        list: ({resourceId, ...config}) => getUserSharingPolicies({...config, userId: resourceId}),
        update: ({resourceId, ...config}) => updateUserSharingPolicy({...config, userId: resourceId}),
      };
  }
};

/**
 * The translation function the helpers below take.
 */
type Translate = (key: string, params?: Record<string, string | number>) => string;

const describeChildUnit = (t: Translate, unit: SharingPolicyChildUnit): string =>
  unit.reach === 'subtree' ? t('admin.sharing.scope.unit_subtree', {unit: unit.ouId}) : unit.ouId;

/**
 * Describes, in translated words, which organization units a sharing policy reaches: one line per
 * section the server returned (every unit, the units beneath the owner, the roots of other trees).
 *
 * @param t - The translation function.
 * @param policy - The policy.
 * @returns The lines, never empty.
 */
export const describeSharingPolicyScope = (t: Translate, policy: SharingPolicy): string[] => {
  const lines: string[] = [];

  if (policy.allUnits) {
    const excluded: number = policy.allUnits.excludedOuIds?.length ?? 0;

    lines.push(
      excluded ? t('admin.sharing.scope.all_units_except', {count: excluded}) : t('admin.sharing.scope.all_units'),
    );
  }

  if (policy.childUnits) {
    if (policy.childUnits.mode === 'all') {
      const excluded: number = policy.childUnits.excludedOuIds?.length ?? 0;

      lines.push(
        excluded
          ? t('admin.sharing.scope.child_units_all_except', {count: excluded})
          : t('admin.sharing.scope.child_units_all'),
      );
    } else {
      lines.push(
        t('admin.sharing.scope.child_units_selected', {
          units: policy.childUnits.units.map((unit: SharingPolicyChildUnit) => describeChildUnit(t, unit)).join(', '),
        }),
      );
    }
  }

  if (policy.otherTreeRoots) {
    lines.push(
      policy.otherTreeRoots.mode === 'all'
        ? t('admin.sharing.scope.other_trees_all')
        : t('admin.sharing.scope.other_trees_selected', {
            units: policy.otherTreeRoots.units.map((unit: {ouId: string}) => unit.ouId).join(', '),
          }),
    );
  }

  return lines.length ? lines : [t('admin.sharing.scope.none')];
};

/**
 * The values of the sharing policy form. Lists of organization unit identifiers are kept as the text
 * the user types, separated by commas.
 */
export interface SharingPolicyFormValues {
  /**
   * Which units beneath the owner the policy reaches: none, all of them, or the ones listed.
   */
  childUnitsMode: 'none' | 'all' | 'selected';
  /**
   * With `all`, the units beneath the owner to withhold.
   */
  excludedOuIds: string;
  /**
   * The root units of other trees the policy reaches.
   */
  otherTreeRootOuIds: string;
  /**
   * With `selected`, whether each listed unit is reached alone or with everything below it.
   */
  reach: 'unit' | 'subtree';
  /**
   * With `selected`, the units beneath the owner the policy reaches.
   */
  selectedOuIds: string;
}

/**
 * Splits text of comma or whitespace separated identifiers, dropping empty and repeated entries.
 *
 * @param value - The text.
 * @returns The identifiers.
 */
export const parseOrganizationUnitIds = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(/[\s,]+/)
        .map((id: string) => id.trim())
        .filter(Boolean),
    ),
  );

/**
 * The form values for a new policy, or for editing an existing one.
 *
 * @param policy - The policy being edited, if any.
 * @returns The values.
 */
export const toSharingPolicyFormValues = (policy?: SharingPolicy): SharingPolicyFormValues => {
  const childUnits: SharingPolicyChildUnits | undefined = policy?.childUnits;
  const otherTreeRoots: string[] =
    policy?.otherTreeRoots?.mode === 'selected'
      ? policy.otherTreeRoots.units.map((unit: {ouId: string}) => unit.ouId)
      : [];

  return {
    childUnitsMode: childUnits ? childUnits.mode : 'none',
    excludedOuIds: childUnits?.mode === 'all' ? (childUnits.excludedOuIds ?? []).join(', ') : '',
    otherTreeRootOuIds: otherTreeRoots.join(', '),
    reach:
      childUnits?.mode === 'selected' && childUnits.units.some((unit: SharingPolicyChildUnit) => unit.reach === 'unit')
        ? 'unit'
        : 'subtree',
    selectedOuIds:
      childUnits?.mode === 'selected'
        ? childUnits.units.map((unit: SharingPolicyChildUnit) => unit.ouId).join(', ')
        : '',
  };
};

const toChildUnits = (
  values: SharingPolicyFormValues,
  previous?: SharingPolicyChildUnits,
): SharingPolicyChildUnits | undefined => {
  if (values.childUnitsMode === 'all') {
    const excludedOuIds: string[] = parseOrganizationUnitIds(values.excludedOuIds);

    return {
      ...(excludedOuIds.length ? {excludedOuIds} : {}),
      mode: 'all',
      ...(previous?.mode === 'all' && previous.overlayRules ? {overlayRules: previous.overlayRules} : {}),
    };
  }

  if (values.childUnitsMode === 'selected') {
    const kept = new Map<string, SharingPolicyChildUnit>(
      previous?.mode === 'selected'
        ? previous.units.map((unit: SharingPolicyChildUnit): [string, SharingPolicyChildUnit] => [unit.ouId, unit])
        : [],
    );

    return {
      mode: 'selected',
      units: parseOrganizationUnitIds(values.selectedOuIds).map((ouId: string) => ({
        ouId,
        ...(kept.get(ouId)?.overlayRules ? {overlayRules: kept.get(ouId)?.overlayRules} : {}),
        reach: values.reach,
      })),
    };
  }

  return undefined;
};

const toOtherTreeRoots = (
  values: SharingPolicyFormValues,
  policy?: SharingPolicy,
): SharingPolicyRequest['otherTreeRoots'] => {
  const ouIds: string[] = parseOrganizationUnitIds(values.otherTreeRootOuIds);

  if (!ouIds.length) {
    return undefined;
  }

  type TreeRoot = SharingPolicyOtherTreeRootsSelected['units'][number];
  const kept = new Map<string, TreeRoot>(
    policy?.otherTreeRoots?.mode === 'selected'
      ? policy.otherTreeRoots.units.map((unit: TreeRoot): [string, TreeRoot] => [unit.ouId, unit])
      : [],
  );

  return {mode: 'selected', units: ouIds.map((ouId: string) => kept.get(ouId) ?? {ouId})};
};

/**
 * Whether the form describes a policy the server can accept: it must reach some unit, and a policy of
 * selected units must name at least one. A policy that already reaches every unit or every other tree
 * keeps that section, so it is valid without either.
 *
 * @param values - The form values.
 * @param policy - The policy being edited, if any.
 * @returns Whether the values can be submitted.
 */
export const isSharingPolicyFormValid = (values: SharingPolicyFormValues, policy?: SharingPolicy): boolean => {
  if (values.childUnitsMode === 'selected' && !parseOrganizationUnitIds(values.selectedOuIds).length) {
    return false;
  }

  return (
    values.childUnitsMode !== 'none' ||
    parseOrganizationUnitIds(values.otherTreeRootOuIds).length > 0 ||
    Boolean(policy?.allUnits) ||
    policy?.otherTreeRoots?.mode === 'all'
  );
};

/**
 * Builds the payload that creates a policy from the form.
 *
 * @param values - The form values.
 * @returns The payload.
 */
export const toSharingPolicyRequest = (values: SharingPolicyFormValues): SharingPolicyRequest => {
  const childUnits: SharingPolicyChildUnits | undefined = toChildUnits(values);
  const otherTreeRoots: SharingPolicyRequest['otherTreeRoots'] = toOtherTreeRoots(values);

  return {...(childUnits ? {childUnits} : {}), ...(otherTreeRoots ? {otherTreeRoots} : {})};
};

/**
 * Builds the payload that replaces a policy's sections from the form. Sections the form cannot edit
 * (every unit, every other tree) and the overlay rules of units that stay are kept as they were.
 *
 * @param values - The form values.
 * @param policy - The policy being edited.
 * @returns The payload, carrying the version being edited.
 */
export const toSharingPolicyUpdateRequest = (
  values: SharingPolicyFormValues,
  policy: SharingPolicy,
): SharingPolicyUpdateRequest => {
  const childUnits: SharingPolicyChildUnits | undefined = toChildUnits(values, policy.childUnits);
  const otherTreeRoots: SharingPolicyUpdateRequest['otherTreeRoots'] =
    policy.otherTreeRoots?.mode === 'all' ? policy.otherTreeRoots : toOtherTreeRoots(values, policy);

  return {
    ...(policy.allUnits ? {allUnits: policy.allUnits} : {}),
    ...(childUnits ? {childUnits} : {}),
    ...(otherTreeRoots ? {otherTreeRoots} : {}),
    version: policy.version ?? 0,
  };
};

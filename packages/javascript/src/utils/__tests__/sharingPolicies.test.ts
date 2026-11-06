// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it, vi} from 'vitest';
import {SharingPolicy} from '../../models/sharing-policy';
import {
  describeSharingPolicyScope,
  getSharingPolicyOperations,
  isSharingPolicyFormValid,
  parseOrganizationUnitIds,
  toSharingPolicyFormValues,
  toSharingPolicyRequest,
  toSharingPolicyUpdateRequest,
} from '../sharingPolicies';

const t = (key: string, params?: Record<string, string | number>): string =>
  params ? `${key}(${Object.values(params).join('|')})` : key;

describe('describeSharingPolicyScope', () => {
  it('describes every section the policy has', () => {
    expect(
      describeSharingPolicyScope(t, {
        allUnits: {excludedOuIds: ['a', 'b']},
        childUnits: {
          mode: 'selected',
          units: [
            {ouId: 'x', reach: 'subtree'},
            {ouId: 'y', reach: 'unit'},
          ],
        },
        otherTreeRoots: {mode: 'all'},
      }),
    ).toEqual([
      'admin.sharing.scope.all_units_except(2)',
      'admin.sharing.scope.child_units_selected(admin.sharing.scope.unit_subtree(x), y)',
      'admin.sharing.scope.other_trees_all',
    ]);
    expect(describeSharingPolicyScope(t, {})).toEqual(['admin.sharing.scope.none']);
  });
});

describe('sharing policy form', () => {
  const policy: SharingPolicy = {
    allUnits: {},
    childUnits: {mode: 'selected', units: [{ouId: 'x', overlayRules: {roles: {value: ['viewer']}}, reach: 'unit'}]},
    id: 'sp-1',
    otherTreeRoots: {mode: 'selected', units: [{ouId: 'r-1'}]},
    version: 4,
  };

  it('round-trips a policy, keeping the sections and overlay rules the form does not edit', () => {
    const values = toSharingPolicyFormValues(policy);

    expect(values).toEqual({
      childUnitsMode: 'selected',
      excludedOuIds: '',
      otherTreeRootOuIds: 'r-1',
      reach: 'unit',
      selectedOuIds: 'x',
    });
    expect(toSharingPolicyUpdateRequest({...values, selectedOuIds: 'x, z'}, policy)).toEqual({
      allUnits: {},
      childUnits: {
        mode: 'selected',
        units: [
          {ouId: 'x', overlayRules: {roles: {value: ['viewer']}}, reach: 'unit'},
          {ouId: 'z', reach: 'unit'},
        ],
      },
      otherTreeRoots: {mode: 'selected', units: [{ouId: 'r-1'}]},
      version: 4,
    });
  });

  it('builds a create payload and validates it', () => {
    const values = {...toSharingPolicyFormValues(), childUnitsMode: 'all' as const, excludedOuIds: 'a,,a b'};

    expect(parseOrganizationUnitIds('a,,a b')).toEqual(['a', 'b']);
    expect(toSharingPolicyRequest(values)).toEqual({childUnits: {excludedOuIds: ['a', 'b'], mode: 'all'}});
    expect(isSharingPolicyFormValid(toSharingPolicyFormValues())).toBe(false);
    expect(isSharingPolicyFormValid({...toSharingPolicyFormValues(), childUnitsMode: 'selected'})).toBe(false);
    expect(isSharingPolicyFormValid({...toSharingPolicyFormValues(), otherTreeRootOuIds: 'r'})).toBe(true);
    expect(isSharingPolicyFormValid(toSharingPolicyFormValues(), {allUnits: {}})).toBe(true);
  });
});

describe('getSharingPolicyOperations', () => {
  it('addresses each kind of resource through its own collection', async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify({policies: []}), {headers: {'Content-Type': 'application/json'}})),
    );

    await getSharingPolicyOperations('flow').list({baseUrl: 'https://id.example.com', fetcher, resourceId: 'f-1'});
    await getSharingPolicyOperations('application').getOverlayRules({
      baseUrl: 'https://id.example.com',
      fetcher,
      ouId: 'ou-1',
      resourceId: 'a-1',
    });

    expect(fetcher.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      'https://id.example.com/flows/f-1/sharing-policies',
      'https://id.example.com/applications/a-1/overlay-rules?ouId=ou-1',
    ]);
  });
});

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import type {ConsentPurposeData} from '../../models/embedded-flow';
import getConsentPermissionBranches from '../getConsentPermissionBranches';

const purpose = (overrides: Partial<ConsentPurposeData>): ConsentPurposeData => ({
  essential: [],
  optional: [],
  purposeId: 'permissions:app-1',
  type: 'permissions',
  ...overrides,
});

describe('getConsentPermissionBranches', () => {
  it('returns no branches for a purpose without a permission delimiter', () => {
    expect(getConsentPermissionBranches(purpose({optional: [{name: 'orders'}]}))).toEqual([]);
  });

  it('returns no branches for a purpose that is not a permission purpose', () => {
    expect(
      getConsentPermissionBranches(
        purpose({optional: [{name: 'email'}], permissionDelimiter: ':', type: 'attributes'}),
      ),
    ).toEqual([]);
  });

  it('shows the declared tree beneath a branch root in tree order with depths', () => {
    const branches = getConsentPermissionBranches(
      purpose({
        displayElements: [
          {name: 'reservations'},
          {name: 'reservations:create', parent: 'reservations'},
          {name: 'reservations:online', parent: 'reservations'},
          {name: 'reservations:online-archive', parent: 'reservations'},
          {name: 'reservations:online:view', parent: 'reservations:online'},
        ],
        optional: [{name: 'reservations'}],
        permissionDelimiter: ':',
      }),
    );

    expect(branches).toEqual([
      {
        decisions: ['reservations'],
        descendants: [
          {depth: 1, name: 'reservations:create'},
          {depth: 1, name: 'reservations:online'},
          {depth: 2, name: 'reservations:online:view'},
          {depth: 1, name: 'reservations:online-archive'},
        ],
        name: 'reservations',
      },
    ]);
  });

  it('decides prompted permissions beneath a root together with the root', () => {
    const branches = getConsentPermissionBranches(
      purpose({
        optional: [{name: 'orders'}, {name: 'orders.create', parent: 'orders'}, {name: 'invoices'}],
        permissionDelimiter: '.',
      }),
    );

    expect(branches.map((branch) => [branch.name, branch.decisions])).toEqual([
      ['orders', ['orders', 'orders.create']],
      ['invoices', ['invoices']],
    ]);
    expect(branches[0].descendants).toEqual([{depth: 1, name: 'orders.create'}]);
  });

  it('does not treat a shared prefix without the delimiter as a child', () => {
    const branches = getConsentPermissionBranches(
      purpose({optional: [{name: 'orders'}, {name: 'orders-archive'}], permissionDelimiter: ':'}),
    );

    expect(branches.map((branch) => branch.name)).toEqual(['orders', 'orders-archive']);
  });
});

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {
  OrganizationUnit,
  OrganizationUnitBasic,
  Project,
  ResolvedOverlay,
  SharingPolicy,
} from '@thunderid/browser';
import type {OrganizationUnitContents} from '@thunderid/vue';

/* Sample data. Nothing here reaches a server. */

export const SAMPLE_PROJECTS: Project[] = [
  {
    createdAt: '2026-01-12T09:30:00Z',
    description: 'Created with the server',
    displayName: 'Default',
    handle: 'default',
    id: 'prj_default',
  },
  {
    createdAt: '2026-03-02T14:05:00Z',
    description: 'Storefront customers and staff',
    displayName: 'Online shop',
    handle: 'shop',
    id: 'prj_shop',
  },
  {createdAt: '2026-05-21T08:00:00Z', displayName: 'Support desk', handle: 'support', id: 'prj_support'},
  {
    createdAt: '2026-08-14T16:45:00Z',
    description: 'Experiments',
    displayName: 'Labs',
    handle: 'labs',
    id: 'prj_labs',
  },
];

export const SAMPLE_UNITS: OrganizationUnitBasic[] = [
  {description: 'Product and platform teams', handle: 'engineering', id: 'ou_eng', name: 'Engineering'},
  {description: 'Field and inside sales', handle: 'sales', id: 'ou_sales', name: 'Sales'},
  {handle: 'support', id: 'ou_support', name: 'Support'},
  {description: 'Partner resellers', handle: 'partners', id: 'ou_partners', name: 'Partners'},
];

export const SAMPLE_UNIT: OrganizationUnit = {
  description: 'Product and platform teams',
  handle: 'engineering',
  id: 'ou_eng',
  name: 'Engineering',
  parent: 'prj_shop',
};

export const SAMPLE_UNIT_PARENT: OrganizationUnitBasic = {handle: 'shop', id: 'prj_shop', name: 'Online shop'};

export const SAMPLE_CONTENTS: OrganizationUnitContents = {
  childUnits: [
    {handle: 'platform', id: 'ou_platform', name: 'Platform'},
    {handle: 'mobile', id: 'ou_mobile', name: 'Mobile'},
  ],
  groups: [
    {id: 'grp_oncall', name: 'On call'},
    {id: 'grp_reviewers', name: 'Reviewers'},
  ],
  roles: [{description: 'Deploys services', id: 'rol_deployer', name: 'Deployer'}],
  totals: {childUnits: 2, groups: 2, roles: 1, users: 3},
  users: [
    {display: 'Liam Chen', id: 'usr_8f2c41'},
    {display: 'Ana Silva', id: 'usr_31b7e0'},
    {display: 'Kofi Mensah', id: 'usr_77ac02'},
  ],
};

export const SAMPLE_POLICIES: SharingPolicy[] = [
  {childUnits: {mode: 'all'}, id: 'pol_all', stage: 'share', version: 2},
  {
    childUnits: {
      mode: 'selected',
      units: [
        {ouId: 'ou_sales', reach: 'subtree'},
        {ouId: 'ou_support', reach: 'unit'},
      ],
    },
    id: 'pol_selected',
    stage: 'share',
    version: 1,
  },
  {
    id: 'pol_partners',
    isReadOnly: true,
    otherTreeRoots: {mode: 'selected', units: [{ouId: 'prj_partners'}]},
    stage: 'reshare',
    version: 4,
  },
];

export const SAMPLE_OVERLAY: ResolvedOverlay = {
  isOwned: false,
  ouId: 'ou_sales',
  policyIds: ['pol_selected'],
  rules: {roles: {allowedValues: ['Viewer', 'Editor'], editable: true}},
  visible: true,
};

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {AccessibleOrganizationUnit} from '@thunderid/browser';
import {BaseOrganizationUnitSwitcher, type OrganizationUnitSwitcherRenderProps} from '@thunderid/vue';
import {Component, defineComponent, h, PropType, Ref, ref, VNode, VNodeChild} from 'vue';
import {quoted} from './storyKit';
import type {Action} from './types';

/** Sample organization units for the Base stories. Nothing here reaches a server. */
export const SAMPLE_ORGANIZATION_UNITS: AccessibleOrganizationUnit[] = [
  {handle: 'acme-ou-1', id: 'ou_acme_1', name: 'Acme OU 1'},
  {handle: 'acme-ou-2', id: 'ou_acme_2', name: 'Acme OU 2'},
  {handle: 'acme-ou-3', id: 'ou_acme_3', name: 'Acme OU 3'},
  {handle: 'customers', id: 'ou_customers', name: 'Customers'},
];

/**
 * Pages and switches the sample units the way an application holding the data would, drawn by the built-in UI or
 * by `render` through the default scoped slot.
 */
export const SampleOrganizationUnitSwitcher: Component = defineComponent({
  name: 'SampleOrganizationUnitSwitcher',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    error: {default: null, type: String as PropType<string | null>},
    limit: {default: 2, type: Number},
    render: {
      default: undefined,
      type: Function as PropType<(state: OrganizationUnitSwitcherRenderProps) => VNodeChild>,
    },
  },
  setup(props: {
    action: Action;
    error: string | null;
    limit: number;
    render?: (state: OrganizationUnitSwitcherRenderProps) => VNodeChild;
  }): () => VNode {
    const offset: Ref<number> = ref(0);
    const current: Ref<string> = ref(SAMPLE_ORGANIZATION_UNITS[0].id);

    return (): VNode =>
      h(
        BaseOrganizationUnitSwitcher,
        {
          current: current.value,
          error: props.error,
          limit: props.limit,
          offset: offset.value,
          onPageChange: (next: number): void => {
            offset.value = next;
            props.action('page-change', String(next));
          },
          onSwitch: (unit: AccessibleOrganizationUnit): void => {
            current.value = unit.id;
            props.action('switch', quoted(unit.id));
          },
          organizationUnits: SAMPLE_ORGANIZATION_UNITS.slice(offset.value, offset.value + props.limit),
          totalResults: SAMPLE_ORGANIZATION_UNITS.length,
        },
        props.render ? {default: props.render} : undefined,
      );
  },
});

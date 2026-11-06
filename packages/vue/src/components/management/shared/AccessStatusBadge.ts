// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type AccessStatusValue, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type VNode, defineComponent, h} from 'vue';
import type {AdminTranslate} from './useAdminTranslation';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * The translated access status of an identity, or its raw value when the status is one this SDK does
 * not know. Renders nothing when the server reports no status.
 */
const AccessStatusBadge: Component = defineComponent({
  name: 'AdminAccessStatusBadge',
  props: {
    /** The identity's effective access status. */
    status: {default: undefined, type: String as PropType<AccessStatusValue>},
    t: {required: true, type: Function as PropType<AdminTranslate>},
  },
  setup(props: Readonly<{status: AccessStatusValue | undefined; t: AdminTranslate}>): () => VNode | null {
    return (): VNode | null => {
      if (!props.status) {
        return null;
      }

      const labels: Record<AccessStatusValue, string> = {
        ACTIVE: props.t('admin.common.status.active'),
        LOCKED: props.t('admin.common.status.locked'),
        SUSPENDED: props.t('admin.common.status.suspended'),
      };

      return h('span', {class: cls('chip')}, labels[props.status] ?? props.status);
    };
  },
});

export default AccessStatusBadge;

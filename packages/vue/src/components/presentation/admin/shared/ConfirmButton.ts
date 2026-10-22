// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import type {AdminTranslate} from './useAdminTranslation';
import Button from '../../../primitives/Button/Button';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

type ConfirmButtonProps = Readonly<{
  confirmText: string;
  disabled: boolean;
  isLoading: boolean;
  t: AdminTranslate;
}>;

/**
 * A destructive action that asks for confirmation inline before it runs. The default slot is the
 * label of the button that starts the action.
 */
const ConfirmButton: Component = defineComponent({
  name: 'AdminConfirmButton',
  props: {
    /** Question asked before the action runs, already translated. */
    confirmText: {required: true, type: String},
    disabled: {default: false, type: Boolean},
    isLoading: {default: false, type: Boolean},
    t: {required: true, type: Function as PropType<AdminTranslate>},
  },
  emits: ['confirm'],
  setup(props: ConfirmButtonProps, {emit, slots}: SetupContext): () => VNode {
    const isConfirming: Ref<boolean> = ref(false);

    return (): VNode => {
      if (!isConfirming.value) {
        return h(
          Button,
          {
            color: 'danger',
            disabled: props.disabled,
            onClick: (): void => {
              isConfirming.value = true;
            },
            variant: 'outline',
          },
          {default: (): VNode[] | undefined => slots['default']?.()},
        );
      }

      return h('span', {'aria-label': props.confirmText, class: cls('confirm'), role: 'group'}, [
        h('span', {}, props.confirmText),
        h(
          Button,
          {
            disabled: props.isLoading,
            onClick: (): void => {
              isConfirming.value = false;
            },
            size: 'small',
            variant: 'text',
          },
          {default: (): string => props.t('admin.common.actions.cancel')},
        ),
        h(
          Button,
          {
            color: 'danger',
            disabled: props.isLoading,
            loading: props.isLoading,
            onClick: (): void => emit('confirm'),
            size: 'small',
          },
          {default: (): string => props.t('admin.common.actions.confirm')},
        ),
      ]);
    };
  },
});

export default ConfirmButton;

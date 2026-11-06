// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type AccountLifecycleAction, withVendorCSSClassPrefix} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  ref,
  useId,
} from 'vue';
import type {AdminTranslate} from './useAdminTranslation';
import Button from '../../primitives/Button/Button';
import TextField from '../../primitives/TextField/TextField';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * Matches the server's limit on an operator note.
 */
const OPERATOR_NOTE_MAX_LENGTH = 100;

type AccountLifecycleButtonsProps = Readonly<{
  actions: AccountLifecycleAction[];
  collectsOperatorNote: boolean;
  isRunning: boolean;
  name: string;
  t: AdminTranslate;
}>;

/**
 * One button per account lifecycle action. Suspending and unsuspending ask for confirmation inline;
 * unlocking is remedial and runs straight away. Emits `action` with the action and, on a suspension
 * that collects one, the operator's note.
 */
const AccountLifecycleButtons: Component = defineComponent({
  name: 'AdminAccountLifecycleButtons',
  props: {
    /** The actions to offer, most expected first. */
    actions: {required: true, type: Array as PropType<AccountLifecycleAction[]>},
    /** Whether a suspension asks for an optional operator note. The note is recorded by the flow. */
    collectsOperatorNote: {default: false, type: Boolean},
    isRunning: {default: false, type: Boolean},
    /** Name of the identity, already resolved, used in the confirmation question. */
    name: {required: true, type: String},
    t: {required: true, type: Function as PropType<AdminTranslate>},
  },
  emits: ['action'],
  setup(props: AccountLifecycleButtonsProps, {emit}: SetupContext): () => VNode | VNode[] | null {
    const uid: string = useId();
    const confirming: Ref<AccountLifecycleAction | null> = ref(null);
    const operatorNote: Ref<string> = ref('');

    const close = (): void => {
      confirming.value = null;
      operatorNote.value = '';
    };

    return (): VNode | VNode[] | null => {
      const {t} = props;

      if (props.actions.length === 0) {
        return null;
      }

      const labels: Record<AccountLifecycleAction, string> = {
        suspend: t('admin.common.lifecycle.suspend'),
        unlock: t('admin.common.lifecycle.unlock'),
        unsuspend: t('admin.common.lifecycle.unsuspend'),
      };
      const action: AccountLifecycleAction | null = confirming.value;

      if (action && props.actions.includes(action)) {
        const question: string =
          action === 'suspend'
            ? t('admin.common.lifecycle.suspend_confirm', {name: props.name})
            : t('admin.common.lifecycle.unsuspend_confirm', {name: props.name});
        const withNote: boolean = props.collectsOperatorNote && action === 'suspend';

        return h('span', {'aria-label': question, class: cls('confirm'), role: 'group'}, [
          h('span', {}, question),
          withNote
            ? h(TextField, {
                disabled: props.isRunning,
                label: t('admin.common.lifecycle.operator_note'),
                maxLength: OPERATOR_NOTE_MAX_LENGTH,
                modelValue: operatorNote.value,
                name: `${uid}-operator-note`,
                'onUpdate:modelValue': (value: string): void => {
                  operatorNote.value = value;
                },
              })
            : null,
          h(
            Button,
            {disabled: props.isRunning, onClick: close, size: 'small', variant: 'text'},
            {default: (): string => t('admin.common.actions.cancel')},
          ),
          h(
            Button,
            {
              color: action === 'suspend' ? 'danger' : 'primary',
              disabled: props.isRunning,
              loading: props.isRunning,
              onClick: (): void => {
                emit('action', action, withNote ? operatorNote.value.trim() || undefined : undefined);
                close();
              },
              size: 'small',
            },
            {default: (): string => labels[action]},
          ),
        ]);
      }

      return props.actions.map((offered: AccountLifecycleAction) =>
        h(
          Button,
          {
            color: offered === 'suspend' ? 'danger' : 'primary',
            disabled: props.isRunning,
            key: offered,
            loading: props.isRunning && offered === 'unlock',
            onClick: (): void => {
              if (offered === 'unlock') {
                emit('action', offered);
              } else {
                confirming.value = offered;
              }
            },
            variant: 'outline',
          },
          {default: (): string => labels[offered]},
        ),
      );
    };
  },
});

export default AccountLifecycleButtons;

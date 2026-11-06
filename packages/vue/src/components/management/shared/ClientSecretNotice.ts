// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type VNode, defineComponent, h} from 'vue';
import type {AdminTranslate} from './useAdminTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import CopyableText from '../../primitives/CopyableText/CopyableText';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

type ClientSecretNoticeProps = Readonly<{
  onDismiss: (() => void) | undefined;
  secret: string;
  t: AdminTranslate;
}>;

/**
 * Shows a client secret the one time it can be read, masked until revealed, with a copy button.
 */
const ClientSecretNotice: Component = defineComponent({
  name: 'AdminClientSecretNotice',
  props: {
    /** Called once the secret has been copied, after which it cannot be read again. */
    onDismiss: {default: undefined, type: Function as PropType<() => void>},
    secret: {required: true, type: String},
    t: {required: true, type: Function as PropType<AdminTranslate>},
  },
  setup(props: ClientSecretNoticeProps): () => VNode {
    return (): VNode =>
      h('div', {class: cls('edit-form')}, [
        h(
          Alert,
          {role: 'status', severity: 'warning'},
          {default: (): string[] => [props.t('admin.applications.secret.notice')]},
        ),
        h(CopyableText, {label: props.t('admin.applications.secret.title'), masked: true, value: props.secret}),
        props.onDismiss
          ? h('div', {class: cls('form-actions')}, [
              h(Button, {onClick: props.onDismiss}, {default: (): string => props.t('admin.applications.secret.done')}),
            ])
          : null,
      ]);
  },
});

export default ClientSecretNotice;

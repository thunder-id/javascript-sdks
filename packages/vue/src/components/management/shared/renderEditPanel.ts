// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type VNode, type VNodeChild, h} from 'vue';
import Panel from './Panel';
import type {AdminTranslate} from './useAdminTranslation';
import Button from '../../primitives/Button/Button';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * Renders an inline edit form inside a panel of a details view: the fields, then the cancel and save
 * buttons.
 *
 * @param options - What to render.
 * @returns The panel.
 */
const renderEditPanel = ({
  canSave,
  fields,
  isSaving,
  onCancel,
  onSave,
  saveLabel,
  t,
  title,
}: {
  canSave: boolean;
  fields: VNodeChild[];
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
  t: AdminTranslate;
  title: string;
}): VNode =>
  h(
    Panel,
    {title},
    {
      default: (): VNode =>
        h(
          'form',
          {
            class: cls('edit-form'),
            novalidate: true,
            onSubmit: (event: Event): void => {
              event.preventDefault();

              if (canSave && !isSaving) {
                onSave();
              }
            },
          },
          [
            ...fields,
            h('div', {class: cls('form-actions')}, [
              h(
                Button,
                {disabled: isSaving, onClick: onCancel, type: 'button', variant: 'text'},
                {default: (): string => t('admin.common.actions.cancel')},
              ),
              h(
                Button,
                {disabled: isSaving || !canSave, loading: isSaving, type: 'submit'},
                {default: (): string => saveLabel},
              ),
            ]),
          ],
        ),
    },
  );

export default renderEditPanel;

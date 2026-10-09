// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {bem, EmbeddedFlowComponentType, UserSelectConstants, withVendorCSSClassPrefix} from '@thunderid/browser';
import type {
  EmbeddedFlowComponent,
  FetchUsers,
  PagedSelectOptionDefaults,
  UserSelectOptionMapping,
} from '@thunderid/browser';
import {FC, useMemo} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import PagedSelect, {PagedSelectMessages, PagedSelectProps} from '../PagedSelect/PagedSelect';

export interface BaseUserSelectProps
  extends Omit<PagedSelectProps, 'defaults' | 'fetchOptions' | 'mapping' | 'messages'> {
  fetchUsers?: FetchUsers;
  mapping?: UserSelectOptionMapping;
}

const USER_DEFAULTS: PagedSelectOptionDefaults = {labelAttributes: UserSelectConstants.LABEL_ATTRIBUTES};

/**
 * Single-user picker: a {@link PagedSelect} fed by the given `fetchUsers`, submitting the user's ID and
 * labelling each user from `display`, `username`, or `email` unless `mapping` says otherwise.
 * Building block for {@link UserSelect}; for a custom data source use {@link PagedSelect}.
 */
const BaseUserSelect: FC<BaseUserSelectProps> = ({
  className,
  component,
  fetchUsers,
  id,
  name,
  ...rest
}: BaseUserSelectProps) => {
  const {t} = useTranslation();
  const userComponent: EmbeddedFlowComponent = useMemo(
    () =>
      component ??
      ({id: id ?? name ?? 'user-select', type: EmbeddedFlowComponentType.UserSelect} as EmbeddedFlowComponent),
    [component, id, name],
  );
  const userMessages: Partial<PagedSelectMessages> = {
    ariaLabel: t('elements.fields.user_select.aria_label') || 'Select a user',
    empty: t('elements.fields.user_select.empty') || 'No users found.',
    loading: t('elements.fields.user_select.loading') || 'Loading users…',
  };

  return (
    <PagedSelect
      {...rest}
      id={id}
      name={name}
      className={cx(withVendorCSSClassPrefix(bem('user-select')), className)}
      component={userComponent}
      defaults={USER_DEFAULTS}
      fetchOptions={fetchUsers}
      messages={userMessages}
    />
  );
};

export default BaseUserSelect;

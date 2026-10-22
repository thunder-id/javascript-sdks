// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage, Group} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseGroupCreate, {BaseGroupCreateProps, GroupCreateSubmission} from './BaseGroupCreate';
import useCreateGroup from '../../../../hooks/groups/useCreateGroup';
import useTranslation from '../../../../hooks/useTranslation';
import useDefaultOuId from '../shared/useDefaultOuId';

export type GroupCreateProps = Omit<BaseGroupCreateProps, 'error' | 'isSubmitting' | 'onSubmit'> & {
  /**
   * Called with the created group.
   */
  onCreated?: (group: Group) => void;
  /**
   * Organization unit the group is created in. Defaults to the signed-in user's organization unit.
   */
  ouId?: string;
};

/**
 * Creates a group through the management API.
 *
 * @example
 * ```tsx
 * <GroupCreate onCreated={(group) => navigate(`/groups/${group.id}`)} />
 * ```
 */
const GroupCreate: FC<GroupCreateProps> = ({onCreated, ouId, preferences, ...rest}: GroupCreateProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const resolvedOuId: string | undefined = useDefaultOuId(ouId);
  const {error, isLoading, mutate} = useCreateGroup({onSuccess: onCreated});

  const handleSubmit = ({description, name}: GroupCreateSubmission): void => {
    if (resolvedOuId) {
      void mutate({description, name, ouId: resolvedOuId});
    }
  };

  return (
    <BaseGroupCreate
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      error={
        resolvedOuId ? toManagementErrorMessage(t, error, 'admin.groups.create.error') : t('admin.common.errors.no_ou')
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default GroupCreate;

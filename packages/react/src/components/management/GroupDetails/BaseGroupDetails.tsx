// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Group, Preferences} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Spinner from '../../primitives/Spinner/Spinner';
import {ConfirmButton, DetailList, Panel} from '../shared/AdminParts';
import AdminSection from '../shared/AdminSection';
import useAdminPartStyles from '../shared/useAdminPartStyles';

/**
 * What {@link BaseGroupDetails} hands its `children` render function, so the group can be shown with any UI.
 */
export interface BaseGroupDetailsRenderProps {
  error: string | null;
  group?: Group;
  isDeleting: boolean;
  isLoading: boolean;
  /**
   * Deletes the group. Undefined when deletion is not allowed.
   */
  onDelete?: () => void;
}

export interface BaseGroupDetailsProps {
  /**
   * Controls rendered next to the group's name.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default view. Receives the group, the loading and error state, and the delete
   * handler.
   */
  children?: (props: BaseGroupDetailsRenderProps) => ReactNode;
  className?: string;
  error?: string | null;
  group?: Group;
  isDeleting?: boolean;
  isLoading?: boolean;
  /**
   * The group's members, rendered under its overview, such as a `GroupMembers`.
   */
  members?: ReactNode;
  /**
   * Deletes the group. The delete action is hidden when omitted.
   */
  onDelete?: () => void;
  preferences?: Preferences;
}

/**
 * Shows a group's name, description and organization unit, with its members under them. Holds no data of its own:
 * pass the group and handle deletion.
 */
const BaseGroupDetails: FC<BaseGroupDetailsProps> = ({
  actions,
  children,
  className,
  error = null,
  group,
  isDeleting = false,
  isLoading = false,
  members,
  onDelete,
  preferences,
}: BaseGroupDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();

  if (children) {
    return (
      <div className={className}>
        {children({error, group, isDeleting, isLoading, onDelete: group ? onDelete : undefined})}
      </div>
    );
  }

  if (isLoading && !group) {
    return (
      <AdminSection block="group-details" className={className} preferences={preferences}>
        <span className={styles['muted']} role="status">
          <Spinner size="small" /> {t('admin.common.loading')}
        </span>
      </AdminSection>
    );
  }

  if (!group) {
    return (
      <AdminSection block="group-details" className={className} preferences={preferences}>
        <Alert variant="error" role="alert">
          {error ?? t('admin.common.errors.not_found')}
        </Alert>
      </AdminSection>
    );
  }

  return (
    <AdminSection
      block="group-details"
      className={className}
      title={group.name}
      description={group.description}
      preferences={preferences}
      actions={
        <>
          {actions}
          {onDelete && (
            <ConfirmButton
              confirmText={t('admin.groups.details.delete.confirm', {name: group.name})}
              isLoading={isDeleting}
              onConfirm={onDelete}
            >
              {t('admin.groups.details.delete.action')}
            </ConfirmButton>
          )}
        </>
      }
    >
      {error && (
        <Alert variant="error" role="alert">
          {error}
        </Alert>
      )}
      <Panel title={t('admin.groups.details.overview')}>
        <DetailList
          items={[{label: t('admin.common.columns.organization_unit'), value: group.ouHandle ?? group.ouId}]}
        />
      </Panel>
      {members}
    </AdminSection>
  );
};

export default BaseGroupDetails;

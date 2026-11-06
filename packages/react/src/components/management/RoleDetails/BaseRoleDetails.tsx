// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, RoleSummary} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Spinner from '../../primitives/Spinner/Spinner';
import {ConfirmButton, DetailList, Panel} from '../shared/AdminParts';
import AdminSection from '../shared/AdminSection';
import useAdminPartStyles from '../shared/useAdminPartStyles';

/**
 * What {@link BaseRoleDetails} hands its `children` render function, so the role can be shown with any UI.
 */
export interface BaseRoleDetailsRenderProps {
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  /**
   * Deletes the role. Undefined when deletion is not allowed, including for read-only roles.
   */
  onDelete?: () => void;
  role?: RoleSummary;
}

export interface BaseRoleDetailsProps {
  /**
   * Controls rendered next to the role's name.
   */
  actions?: ReactNode;
  /**
   * Who the role is assigned to, rendered under its permissions, such as a `RoleAssignments`.
   */
  assignments?: ReactNode;
  /**
   * Renders custom UI in place of the default view. Receives the role, the loading and error state, and the delete
   * handler.
   */
  children?: (props: BaseRoleDetailsRenderProps) => ReactNode;
  className?: string;
  error?: string | null;
  isDeleting?: boolean;
  isLoading?: boolean;
  /**
   * Deletes the role. The delete action is hidden when omitted, and for read-only roles.
   */
  onDelete?: () => void;
  /**
   * What the role grants, rendered under its overview, such as a `RolePermissions`.
   */
  permissions?: ReactNode;
  preferences?: Preferences;
  role?: RoleSummary;
}

/**
 * Shows a role's name, description and organization unit, with what it grants and who holds it under them. Holds no
 * data of its own: pass the role and handle deletion.
 */
const BaseRoleDetails: FC<BaseRoleDetailsProps> = ({
  actions,
  assignments,
  children,
  className,
  error = null,
  isDeleting = false,
  isLoading = false,
  onDelete,
  permissions,
  preferences,
  role,
}: BaseRoleDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();

  if (children) {
    return (
      <div className={className}>
        {children({error, isDeleting, isLoading, onDelete: role && !role.isReadOnly ? onDelete : undefined, role})}
      </div>
    );
  }

  if (isLoading && !role) {
    return (
      <AdminSection block="role-details" className={className} preferences={preferences}>
        <span className={styles['muted']} role="status">
          <Spinner size="small" /> {t('admin.common.loading')}
        </span>
      </AdminSection>
    );
  }

  if (!role) {
    return (
      <AdminSection block="role-details" className={className} preferences={preferences}>
        <Alert variant="error" role="alert">
          {error ?? t('admin.common.errors.not_found')}
        </Alert>
      </AdminSection>
    );
  }

  return (
    <AdminSection
      block="role-details"
      className={className}
      title={role.name}
      description={role.description}
      preferences={preferences}
      actions={
        <>
          {actions}
          {onDelete && !role.isReadOnly && (
            <ConfirmButton
              confirmText={t('admin.roles.details.delete.confirm', {name: role.name})}
              isLoading={isDeleting}
              onConfirm={onDelete}
            >
              {t('admin.roles.details.delete.action')}
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
      <Panel title={t('admin.roles.details.overview')}>
        <DetailList items={[{label: t('admin.common.columns.organization_unit'), value: role.ouHandle ?? role.ouId}]} />
      </Panel>
      {permissions}
      {assignments}
    </AdminSection>
  );
};

export default BaseRoleDetails;

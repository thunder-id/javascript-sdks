// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AccountLifecycleAction, Agent, MembershipGroup, Preferences, getAgentName} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import CopyableText from '../../primitives/CopyableText/CopyableText';
import Spinner from '../../primitives/Spinner/Spinner';
import {AccessStatusBadge, AccountLifecycleButtons} from '../shared/AccountLifecycleParts';
import {ChipList, ConfirmButton, DetailList, Panel} from '../shared/AdminParts';
import AdminSection from '../shared/AdminSection';
import useAdminPartStyles from '../shared/useAdminPartStyles';

/**
 * What {@link BaseAgentDetails} hands its `children` render function, so the agent can be shown with any UI.
 */
export interface BaseAgentDetailsRenderProps {
  agent?: Agent;
  error: string | null;
  groups: MembershipGroup[];
  isDeleting: boolean;
  isLoading: boolean;
  isRunningLifecycleAction: boolean;
  /**
   * The account lifecycle actions offered for the agent. Empty when none is allowed.
   */
  lifecycleActions: AccountLifecycleAction[];
  /**
   * Deletes the agent. Undefined when deletion is not allowed, including for read-only agents.
   */
  onDelete?: () => void;
  /**
   * Runs an account lifecycle action, with the operator's note on a suspension. Undefined when none is allowed.
   */
  onLifecycleAction?: (action: AccountLifecycleAction, operatorNote?: string) => void;
  roles: string[];
}

export interface BaseAgentDetailsProps {
  /**
   * Controls rendered next to the agent's name.
   */
  actions?: ReactNode;
  agent?: Agent;
  /**
   * Renders custom UI in place of the default view. Receives the agent, its groups and roles, the
   * loading and error state, and the delete handler.
   */
  children?: (props: BaseAgentDetailsRenderProps) => ReactNode;
  className?: string;
  error?: string | null;
  /**
   * The groups the agent belongs to.
   */
  groups?: MembershipGroup[];
  isDeleting?: boolean;
  isLoading?: boolean;
  isRunningLifecycleAction?: boolean;
  /**
   * The account lifecycle actions to offer (suspend, unsuspend, unlock), shown only with `onLifecycleAction`. They change
   * only runtime state, so they apply to read-only agents too.
   */
  lifecycleActions?: AccountLifecycleAction[];
  /**
   * Deletes the agent. The delete action is hidden when omitted.
   */
  onDelete?: () => void;
  /**
   * Runs an account lifecycle action. Suspending and unsuspending ask for confirmation first, and a
   * suspension takes an optional operator note.
   */
  onLifecycleAction?: (action: AccountLifecycleAction, operatorNote?: string) => void;
  preferences?: Preferences;
  /**
   * The names of the roles the agent holds, directly or through its groups.
   */
  roles?: string[];
}

/**
 * Shows an agent's type, owner, client and the groups and roles it holds. Holds no data of its own:
 * pass the agent and handle deletion.
 */
const BaseAgentDetails: FC<BaseAgentDetailsProps> = ({
  actions,
  agent,
  children,
  className,
  error = null,
  groups = [],
  isDeleting = false,
  isLoading = false,
  isRunningLifecycleAction = false,
  lifecycleActions = [],
  onDelete,
  onLifecycleAction,
  preferences,
  roles = [],
}: BaseAgentDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();

  if (children) {
    return (
      <div className={className}>
        {children({
          agent,
          error,
          groups,
          isDeleting,
          isLoading,
          isRunningLifecycleAction,
          lifecycleActions: onLifecycleAction && agent ? lifecycleActions : [],
          onDelete: agent && !agent.isReadOnly ? onDelete : undefined,
          onLifecycleAction: agent ? onLifecycleAction : undefined,
          roles,
        })}
      </div>
    );
  }

  if (isLoading && !agent) {
    return (
      <AdminSection block="agent-details" className={className} preferences={preferences}>
        <span className={styles['muted']} role="status">
          <Spinner size="small" /> {t('admin.common.loading')}
        </span>
      </AdminSection>
    );
  }

  if (!agent) {
    return (
      <AdminSection block="agent-details" className={className} preferences={preferences}>
        <Alert variant="error" role="alert">
          {error ?? t('admin.common.errors.not_found')}
        </Alert>
      </AdminSection>
    );
  }

  const details: {label: string; value: ReactNode}[] = [
    {label: t('admin.agents.details.type'), value: agent.type},
    {label: t('admin.agents.details.owner'), value: agent.owner ?? t('admin.agents.details.no_owner')},
    {label: t('admin.common.columns.organization_unit'), value: agent.ouHandle ?? agent.ouId},
  ];

  if (agent.status) {
    details.push({label: t('admin.common.columns.status'), value: <AccessStatusBadge status={agent.status.value} />});
  }

  if (agent.clientId) {
    details.push({label: t('admin.agents.list.columns.client_id'), value: <CopyableText value={agent.clientId} />});
  }

  return (
    <AdminSection
      block="agent-details"
      className={className}
      title={getAgentName(agent)}
      description={agent.description}
      preferences={preferences}
      actions={
        <>
          {actions}
          {onLifecycleAction && (
            <AccountLifecycleButtons
              actions={lifecycleActions}
              collectsOperatorNote
              isRunning={isRunningLifecycleAction}
              name={getAgentName(agent)}
              onAction={onLifecycleAction}
            />
          )}
          {onDelete && !agent.isReadOnly && (
            <ConfirmButton
              confirmText={t('admin.agents.details.delete.confirm', {name: getAgentName(agent)})}
              isLoading={isDeleting}
              onConfirm={onDelete}
            >
              {t('admin.agents.details.delete.action')}
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
      <Panel title={t('admin.agents.details.overview')}>
        <DetailList items={details} />
      </Panel>
      <Panel title={t('admin.agents.details.groups')}>
        <ChipList
          label={t('admin.agents.details.groups')}
          emptyText={t('admin.agents.details.no_groups')}
          items={groups.map((group: MembershipGroup) => ({id: group.id, label: group.name}))}
        />
      </Panel>
      <Panel title={t('admin.agents.details.roles')}>
        <ChipList
          label={t('admin.agents.details.roles')}
          emptyText={t('admin.agents.details.no_roles')}
          items={roles.map((role: string) => ({id: role, label: role}))}
        />
      </Panel>
    </AdminSection>
  );
};

export default BaseAgentDetails;

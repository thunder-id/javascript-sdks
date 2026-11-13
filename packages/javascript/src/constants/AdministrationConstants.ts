// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * How an operation that changes state is carried out.
 *
 * - `flow`: run the administration flow the server configures for the operation, which handles the
 *   runtime side first (for example revoking tokens and ending sessions) and then changes the record.
 *   When no flow is configured for the operation, the management API is called directly.
 * - `native`: call the management API directly, with no flow. The default.
 */
const AdministrationModes: {
  FLOW: 'flow';
  NATIVE: 'native';
} = {
  FLOW: 'flow',
  NATIVE: 'native',
};

/**
 * Keys of the `flow` server-config section that name the administration flow for each operation. An
 * unset key is the opt-out: the operation calls the management API directly. `adminAttributeVerificationFlow`
 * names an administrator-initiated flow, started by its handle, and has no such fallback.
 */
export const AdministrationFlowConfigKey: {
  ACTION_DELETION: 'actionDeletionFlow';
  ADMIN_ATTRIBUTE_VERIFICATION: 'adminAttributeVerificationFlow';
  AGENT_SUSPEND: 'agentSuspendFlow';
  AGENT_UNLOCK: 'agentUnlockFlow';
  AGENT_UNSUSPEND: 'agentUnsuspendFlow';
  APPLICATION_DELETION: 'applicationDeletionFlow';
  APPLICATION_SUSPEND: 'applicationSuspendFlow';
  APPLICATION_UNSUSPEND: 'applicationUnsuspendFlow';
  GROUP_DELETION: 'groupDeletionFlow';
  GROUP_MEMBERSHIP_REMOVAL: 'groupMembershipRemovalFlow';
  ROLE_ASSIGNMENT_REMOVAL: 'roleAssignmentRemovalFlow';
  ROLE_DELETION: 'roleDeletionFlow';
  ROLE_PERMISSION_REMOVAL: 'rolePermissionRemovalFlow';
  SECRET_REGENERATION: 'secretRegenerationFlow';
  USER_DELETION: 'userDeletionFlow';
  USER_SUSPEND: 'userSuspendFlow';
  USER_UNLOCK: 'userUnlockFlow';
  USER_UNSUSPEND: 'userUnsuspendFlow';
} = {
  ACTION_DELETION: 'actionDeletionFlow',
  ADMIN_ATTRIBUTE_VERIFICATION: 'adminAttributeVerificationFlow',
  AGENT_SUSPEND: 'agentSuspendFlow',
  AGENT_UNLOCK: 'agentUnlockFlow',
  AGENT_UNSUSPEND: 'agentUnsuspendFlow',
  APPLICATION_DELETION: 'applicationDeletionFlow',
  APPLICATION_SUSPEND: 'applicationSuspendFlow',
  APPLICATION_UNSUSPEND: 'applicationUnsuspendFlow',
  GROUP_DELETION: 'groupDeletionFlow',
  GROUP_MEMBERSHIP_REMOVAL: 'groupMembershipRemovalFlow',
  ROLE_ASSIGNMENT_REMOVAL: 'roleAssignmentRemovalFlow',
  ROLE_DELETION: 'roleDeletionFlow',
  ROLE_PERMISSION_REMOVAL: 'rolePermissionRemovalFlow',
  SECRET_REGENERATION: 'secretRegenerationFlow',
  USER_DELETION: 'userDeletionFlow',
  USER_SUSPEND: 'userSuspendFlow',
  USER_UNLOCK: 'userUnlockFlow',
  USER_UNSUSPEND: 'userUnsuspendFlow',
};

/**
 * The `flow` server-config key naming the flow of each account lifecycle action, by the kind of identity it
 * acts on. Applications are never locked, so they have no unlock.
 */
export const AccountLifecycleFlowConfigKey: {
  agent: {suspend: 'agentSuspendFlow'; unlock: 'agentUnlockFlow'; unsuspend: 'agentUnsuspendFlow'};
  application: {suspend: 'applicationSuspendFlow'; unsuspend: 'applicationUnsuspendFlow'};
  user: {suspend: 'userSuspendFlow'; unlock: 'userUnlockFlow'; unsuspend: 'userUnsuspendFlow'};
} = {
  agent: {
    suspend: AdministrationFlowConfigKey.AGENT_SUSPEND,
    unlock: AdministrationFlowConfigKey.AGENT_UNLOCK,
    unsuspend: AdministrationFlowConfigKey.AGENT_UNSUSPEND,
  },
  application: {
    suspend: AdministrationFlowConfigKey.APPLICATION_SUSPEND,
    unsuspend: AdministrationFlowConfigKey.APPLICATION_UNSUSPEND,
  },
  user: {
    suspend: AdministrationFlowConfigKey.USER_SUSPEND,
    unlock: AdministrationFlowConfigKey.USER_UNLOCK,
    unsuspend: AdministrationFlowConfigKey.USER_UNSUSPEND,
  },
};

/**
 * Names of the inputs an administration flow reads. They avoid the execution request's top-level names
 * so a value cannot land in the wrong place.
 */
export const AdministrationFlowInput: {
  ACTION: 'targetActionId';
  APPLICATION: 'targetApplicationId';
  ASSIGNEE: 'targetAssigneeId';
  GROUP: 'targetGroupId';
  MEMBER: 'targetMemberId';
  OPERATOR_NOTE: 'operatorNote';
  PERMISSIONS: 'targetPermissions';
  RESOURCE: 'targetResourceId';
  RESOURCE_SERVER: 'targetResourceServerId';
  ROLE: 'targetRoleId';
  SUBJECT: 'subject';
} = {
  ACTION: 'targetActionId',
  APPLICATION: 'targetApplicationId',
  ASSIGNEE: 'targetAssigneeId',
  GROUP: 'targetGroupId',
  MEMBER: 'targetMemberId',
  OPERATOR_NOTE: 'operatorNote',
  PERMISSIONS: 'targetPermissions',
  RESOURCE: 'targetResourceId',
  RESOURCE_SERVER: 'targetResourceServerId',
  ROLE: 'targetRoleId',
  SUBJECT: 'subject',
};

/**
 * Keys of the values an administration flow returns. A regenerated client secret is readable only
 * here. `emailSent` is `"false"` when a best-effort email step sent nothing.
 */
export const AdministrationFlowData: {
  CLIENT_SECRET: 'clientSecret';
  EMAIL_SENT: 'emailSent';
} = {
  CLIENT_SECRET: 'clientSecret',
  EMAIL_SENT: 'emailSent',
};

/**
 * Flow type of every administration flow.
 */
export const ADMINISTRATION_FLOW_TYPE = 'ADMINISTRATION';

export default AdministrationModes;

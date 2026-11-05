// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export {default as useThunderID} from './contexts/ThunderID/useThunderID';

export {default as SignedIn} from './components/auth/guards/SignedIn/SignedIn';
export type {SignedInProps} from './components/auth/guards/SignedIn/SignedIn';

export {default as SignedOut} from './components/auth/guards/SignedOut/SignedOut';
export type {SignedOutProps} from './components/auth/guards/SignedOut/SignedOut';

export {default as SignInButton} from './components/auth/buttons/SignInButton/SignInButton';
export type {SignInButtonProps} from './components/auth/buttons/SignInButton/SignInButton';

export {default as SignUpButton} from './components/auth/buttons/SignUpButton/SignUpButton';
export type {SignUpButtonProps} from './components/auth/buttons/SignUpButton/SignUpButton';

export {default as SignIn} from './components/auth/SignIn/SignIn';
export type {SignInProps} from './components/auth/SignIn/SignIn';

export {default as DeviceGrant} from './components/auth/DeviceGrant/DeviceGrant';
export type {DeviceGrantProps} from './components/auth/DeviceGrant/DeviceGrant';

export {default as SignOutButton} from './components/auth/buttons/SignOutButton/SignOutButton';
export type {SignOutButtonProps} from './components/auth/buttons/SignOutButton/SignOutButton';

export {default as User} from './components/account/User/User';
export type {UserProps} from './components/account/User/User';

export {default as SignUp} from './components/auth/SignUp/SignUp';
export type {SignUpProps} from './components/auth/SignUp/SignUp';

export {default as UserDropdown} from './components/account/UserDropdown/UserDropdown';
export type {UserDropdownProps} from './components/account/UserDropdown/UserDropdown';

export {default as UserAvatar} from './components/account/UserAvatar/UserAvatar';
export type {UserAvatarProps} from './components/account/UserAvatar/UserAvatar';

export {default as UserProfile} from './components/account/UserProfile/UserProfile';
export type {UserProfileProps} from './components/account/UserProfile/UserProfile';

export {default as ChangeCredential} from './components/account/ChangeCredential/ChangeCredential';
export type {ChangeCredentialProps} from './components/account/ChangeCredential/ChangeCredential';

export {default as VerifyAttribute} from './components/account/VerifyAttribute/VerifyAttribute';
export type {VerifyAttributeProps} from './components/account/VerifyAttribute/VerifyAttribute';

export {default as UserSelect} from './components/primitives/UserSelect/UserSelect';
export type {UserSelectProps} from './components/primitives/UserSelect/UserSelect';

export {default as AuthFlowSelect} from './components/primitives/AuthFlowSelect/AuthFlowSelect';
export type {AuthFlowSelectProps} from './components/primitives/AuthFlowSelect/AuthFlowSelect';

export {default as UserTypeSelect} from './components/primitives/UserTypeSelect/UserTypeSelect';
export type {UserTypeSelectProps} from './components/primitives/UserTypeSelect/UserTypeSelect';

// Admin (management) components. Their requests run through a server action with the server-held session.

export {default as UserList} from './components/admin/UserList/UserList';
export type {UserListProps} from './components/admin/UserList/UserList';

export {default as UserCreate} from './components/admin/UserCreate/UserCreate';
export type {UserCreateProps} from './components/admin/UserCreate/UserCreate';

export {default as UserDetails} from './components/admin/UserDetails/UserDetails';
export type {UserDetailsProps} from './components/admin/UserDetails/UserDetails';

export {default as GroupList} from './components/admin/GroupList/GroupList';
export type {GroupListProps} from './components/admin/GroupList/GroupList';

export {default as GroupCreate} from './components/admin/GroupCreate/GroupCreate';
export type {GroupCreateProps} from './components/admin/GroupCreate/GroupCreate';

export {default as GroupMembers} from './components/admin/GroupMembers/GroupMembers';
export type {GroupMembersProps} from './components/admin/GroupMembers/GroupMembers';

export {default as RoleList} from './components/admin/RoleList/RoleList';
export type {RoleListProps} from './components/admin/RoleList/RoleList';

export {default as RoleCreate} from './components/admin/RoleCreate/RoleCreate';
export type {RoleCreateProps} from './components/admin/RoleCreate/RoleCreate';

export {default as RoleAssignments} from './components/admin/RoleAssignments/RoleAssignments';
export type {RoleAssignmentsProps} from './components/admin/RoleAssignments/RoleAssignments';

export {default as RolePermissions} from './components/admin/RolePermissions/RolePermissions';
export type {RolePermissionsProps} from './components/admin/RolePermissions/RolePermissions';

export {default as AgentList} from './components/admin/AgentList/AgentList';
export type {AgentListProps} from './components/admin/AgentList/AgentList';

export {default as AgentCreate} from './components/admin/AgentCreate/AgentCreate';
export type {AgentCreateProps} from './components/admin/AgentCreate/AgentCreate';

export {default as AgentDetails} from './components/admin/AgentDetails/AgentDetails';
export type {AgentDetailsProps} from './components/admin/AgentDetails/AgentDetails';

export {default as ApplicationList} from './components/admin/ApplicationList/ApplicationList';
export type {ApplicationListProps} from './components/admin/ApplicationList/ApplicationList';

export {default as ApplicationCreate} from './components/admin/ApplicationCreate/ApplicationCreate';
export type {ApplicationCreateProps} from './components/admin/ApplicationCreate/ApplicationCreate';

export {default as ApplicationDetails} from './components/admin/ApplicationDetails/ApplicationDetails';
export type {ApplicationDetailsProps} from './components/admin/ApplicationDetails/ApplicationDetails';

export {default as useGrantedPermissions} from './hooks/management/useGrantedPermissions';

export * from './admin';

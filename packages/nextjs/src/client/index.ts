// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export {default as useThunderID} from './contexts/ThunderID/useThunderID';

export {default as SignedIn} from './components/control/SignedIn/SignedIn';
export type {SignedInProps} from './components/control/SignedIn/SignedIn';

export {default as SignedOut} from './components/control/SignedOut/SignedOut';
export type {SignedOutProps} from './components/control/SignedOut/SignedOut';

export {default as SignInButton} from './components/actions/SignInButton/SignInButton';
export type {SignInButtonProps} from './components/actions/SignInButton/SignInButton';

export {default as SignUpButton} from './components/actions/SignUpButton/SignUpButton';
export type {SignUpButtonProps} from './components/actions/SignUpButton/SignUpButton';

export {default as SignIn} from './components/presentation/SignIn/SignIn';
export type {SignInProps} from './components/presentation/SignIn/SignIn';

export {default as SignOutButton} from './components/actions/SignOutButton/SignOutButton';
export type {SignOutButtonProps} from './components/actions/SignOutButton/SignOutButton';

export {default as User} from './components/presentation/User/User';
export type {UserProps} from './components/presentation/User/User';

export {default as SignUp} from './components/presentation/SignUp/SignUp';
export type {SignUpProps} from './components/presentation/SignUp/SignUp';

export {default as UserDropdown} from './components/presentation/UserDropdown/UserDropdown';
export type {UserDropdownProps} from './components/presentation/UserDropdown/UserDropdown';

export {default as UserAvatar} from './components/presentation/UserAvatar/UserAvatar';
export type {UserAvatarProps} from './components/presentation/UserAvatar/UserAvatar';

export {default as UserProfile} from './components/presentation/UserProfile/UserProfile';
export type {UserProfileProps} from './components/presentation/UserProfile/UserProfile';

export {default as ChangeCredential} from './components/presentation/ChangeCredential/ChangeCredential';
export type {ChangeCredentialProps} from './components/presentation/ChangeCredential/ChangeCredential';

export {default as UserSelect} from './components/presentation/UserSelect/UserSelect';
export type {UserSelectProps} from './components/presentation/UserSelect/UserSelect';

export {default as AuthFlowSelect} from './components/presentation/AuthFlowSelect/AuthFlowSelect';
export type {AuthFlowSelectProps} from './components/presentation/AuthFlowSelect/AuthFlowSelect';

export {default as UserTypeSelect} from './components/presentation/UserTypeSelect/UserTypeSelect';
export type {UserTypeSelectProps} from './components/presentation/UserTypeSelect/UserTypeSelect';

// Admin (management) components. Their requests run through a server action with the server-held session.

export {default as UserList} from './components/presentation/admin/UserList/UserList';
export type {UserListProps} from './components/presentation/admin/UserList/UserList';

export {default as UserCreate} from './components/presentation/admin/UserCreate/UserCreate';
export type {UserCreateProps} from './components/presentation/admin/UserCreate/UserCreate';

export {default as UserDetails} from './components/presentation/admin/UserDetails/UserDetails';
export type {UserDetailsProps} from './components/presentation/admin/UserDetails/UserDetails';

export {default as GroupList} from './components/presentation/admin/GroupList/GroupList';
export type {GroupListProps} from './components/presentation/admin/GroupList/GroupList';

export {default as GroupCreate} from './components/presentation/admin/GroupCreate/GroupCreate';
export type {GroupCreateProps} from './components/presentation/admin/GroupCreate/GroupCreate';

export {default as GroupMembers} from './components/presentation/admin/GroupMembers/GroupMembers';
export type {GroupMembersProps} from './components/presentation/admin/GroupMembers/GroupMembers';

export {default as RoleList} from './components/presentation/admin/RoleList/RoleList';
export type {RoleListProps} from './components/presentation/admin/RoleList/RoleList';

export {default as RoleCreate} from './components/presentation/admin/RoleCreate/RoleCreate';
export type {RoleCreateProps} from './components/presentation/admin/RoleCreate/RoleCreate';

export {default as RoleAssignments} from './components/presentation/admin/RoleAssignments/RoleAssignments';
export type {RoleAssignmentsProps} from './components/presentation/admin/RoleAssignments/RoleAssignments';

export {default as RolePermissions} from './components/presentation/admin/RolePermissions/RolePermissions';
export type {RolePermissionsProps} from './components/presentation/admin/RolePermissions/RolePermissions';

export {default as AgentList} from './components/presentation/admin/AgentList/AgentList';
export type {AgentListProps} from './components/presentation/admin/AgentList/AgentList';

export {default as AgentCreate} from './components/presentation/admin/AgentCreate/AgentCreate';
export type {AgentCreateProps} from './components/presentation/admin/AgentCreate/AgentCreate';

export {default as AgentDetails} from './components/presentation/admin/AgentDetails/AgentDetails';
export type {AgentDetailsProps} from './components/presentation/admin/AgentDetails/AgentDetails';

export {default as useGrantedPermissions} from './hooks/useGrantedPermissions';

export * from './admin';

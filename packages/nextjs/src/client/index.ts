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

export {default as OrganizationUnitSwitcher} from './components/account/OrganizationUnitSwitcher/OrganizationUnitSwitcher';
export type {OrganizationUnitSwitcherProps} from './components/account/OrganizationUnitSwitcher/OrganizationUnitSwitcher';
export {default as VerifyAttribute} from './components/account/VerifyAttribute/VerifyAttribute';
export type {VerifyAttributeProps} from './components/account/VerifyAttribute/VerifyAttribute';

export {default as UserSelect} from './components/primitives/UserSelect/UserSelect';
export type {UserSelectProps} from './components/primitives/UserSelect/UserSelect';

export {default as AuthFlowSelect} from './components/primitives/AuthFlowSelect/AuthFlowSelect';
export type {AuthFlowSelectProps} from './components/primitives/AuthFlowSelect/AuthFlowSelect';

export {default as UserTypeSelect} from './components/primitives/UserTypeSelect/UserTypeSelect';
export type {UserTypeSelectProps} from './components/primitives/UserTypeSelect/UserTypeSelect';

// Admin (management) components. Their requests run through a server action with the server-held session.

export {default as UserList} from './components/management/UserList/UserList';
export type {UserListProps} from './components/management/UserList/UserList';

export {default as UserCreate} from './components/management/UserCreate/UserCreate';
export type {UserCreateProps} from './components/management/UserCreate/UserCreate';

export {default as UserDetails} from './components/management/UserDetails/UserDetails';
export type {UserDetailsProps} from './components/management/UserDetails/UserDetails';

export {default as GroupList} from './components/management/GroupList/GroupList';
export type {GroupListProps} from './components/management/GroupList/GroupList';

export {default as GroupCreate} from './components/management/GroupCreate/GroupCreate';
export type {GroupCreateProps} from './components/management/GroupCreate/GroupCreate';

export {default as GroupMembers} from './components/management/GroupMembers/GroupMembers';
export type {GroupMembersProps} from './components/management/GroupMembers/GroupMembers';

export {default as RoleList} from './components/management/RoleList/RoleList';
export type {RoleListProps} from './components/management/RoleList/RoleList';

export {default as RoleCreate} from './components/management/RoleCreate/RoleCreate';
export type {RoleCreateProps} from './components/management/RoleCreate/RoleCreate';

export {default as RoleAssignments} from './components/management/RoleAssignments/RoleAssignments';
export type {RoleAssignmentsProps} from './components/management/RoleAssignments/RoleAssignments';

export {default as RolePermissions} from './components/management/RolePermissions/RolePermissions';
export type {RolePermissionsProps} from './components/management/RolePermissions/RolePermissions';

export {default as GroupDetails} from './components/management/GroupDetails/GroupDetails';
export type {GroupDetailsProps} from './components/management/GroupDetails/GroupDetails';

export {default as RoleDetails} from './components/management/RoleDetails/RoleDetails';
export type {RoleDetailsProps} from './components/management/RoleDetails/RoleDetails';

export {default as AgentList} from './components/management/AgentList/AgentList';
export type {AgentListProps} from './components/management/AgentList/AgentList';

export {default as AgentCreate} from './components/management/AgentCreate/AgentCreate';
export type {AgentCreateProps} from './components/management/AgentCreate/AgentCreate';

export {default as AgentDetails} from './components/management/AgentDetails/AgentDetails';
export type {AgentDetailsProps} from './components/management/AgentDetails/AgentDetails';

export {default as ApplicationList} from './components/management/ApplicationList/ApplicationList';
export type {ApplicationListProps} from './components/management/ApplicationList/ApplicationList';

export {default as ApplicationCreate} from './components/management/ApplicationCreate/ApplicationCreate';
export type {ApplicationCreateProps} from './components/management/ApplicationCreate/ApplicationCreate';

export {default as ApplicationDetails} from './components/management/ApplicationDetails/ApplicationDetails';
export type {ApplicationDetailsProps} from './components/management/ApplicationDetails/ApplicationDetails';

export {default as ProjectList} from './components/management/ProjectList/ProjectList';
export type {ProjectListProps} from './components/management/ProjectList/ProjectList';

export {default as ProjectCreate} from './components/management/ProjectCreate/ProjectCreate';
export type {ProjectCreateProps} from './components/management/ProjectCreate/ProjectCreate';

export {default as ProjectDetails} from './components/management/ProjectDetails/ProjectDetails';
export type {ProjectDetailsProps} from './components/management/ProjectDetails/ProjectDetails';

export {default as ProjectSwitcher} from './components/management/ProjectSwitcher/ProjectSwitcher';
export type {ProjectSwitcherProps} from './components/management/ProjectSwitcher/ProjectSwitcher';

export {default as OrganizationUnitList} from './components/management/OrganizationUnitList/OrganizationUnitList';
export type {OrganizationUnitListProps} from './components/management/OrganizationUnitList/OrganizationUnitList';

export {default as OrganizationUnitCreate} from './components/management/OrganizationUnitCreate/OrganizationUnitCreate';
export type {OrganizationUnitCreateProps} from './components/management/OrganizationUnitCreate/OrganizationUnitCreate';

export {default as OrganizationUnitDetails} from './components/management/OrganizationUnitDetails/OrganizationUnitDetails';
export type {OrganizationUnitDetailsProps} from './components/management/OrganizationUnitDetails/OrganizationUnitDetails';

export {default as SharingPolicies} from './components/management/SharingPolicies/SharingPolicies';
export type {SharingPoliciesProps} from './components/management/SharingPolicies/SharingPolicies';

export {default as useGrantedPermissions} from './hooks/management/useGrantedPermissions';

export * from './management';

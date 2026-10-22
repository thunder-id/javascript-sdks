// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// ── Plugin ──
export {default as ThunderIDPlugin} from './plugins/ThunderIDPlugin';
export type {ThunderIDPluginOptions} from './plugins/ThunderIDPlugin';

// ── Components ──
export {default as ThunderIDProvider} from './providers/ThunderIDProvider';

// ── Providers ──
export {default as FlowMetaProvider} from './providers/FlowMetaProvider';
export {default as FlowProvider} from './providers/FlowProvider';
export {default as I18nProvider} from './providers/I18nProvider';
export {default as ThemeProvider} from './providers/ThemeProvider';
export {default as UserProvider} from './providers/UserProvider';

// ── Composables ──
export {default as useThunderID} from './composables/useThunderID';
export {default as useFlow} from './composables/useFlow';
export {default as useFlowMeta} from './composables/useFlowMeta';
export {default as useI18n} from './composables/useI18n';
export {default as useTheme} from './composables/useTheme';
export {default as useUser} from './composables/useUser';
export {useOAuthCallback} from './composables/useOAuthCallback';
export type {UseOAuthCallbackOptions, OAuthCallbackPayload} from './composables/useOAuthCallback';
export {default as useInfiniteOptions} from './composables/useInfiniteOptions';
export type {UseInfiniteOptionsArgs, UseInfiniteOptionsResult} from './composables/useInfiniteOptions';
export {default as useFetchUsers} from './composables/useFetchUsers';
export {default as useFetchAuthFlows} from './composables/useFetchAuthFlows';
export {default as useFetchUserTypes} from './composables/useFetchUserTypes';

// ── Composables — Management ──
export {default as useResourceQuery} from './composables/useResourceQuery';
export type {ResourceQueryOptions, ResourceQueryResult} from './composables/useResourceQuery';
export {default as useResourceMutation} from './composables/useResourceMutation';
export type {ResourceMutationOptions, ResourceMutationResult} from './composables/useResourceMutation';
export {default as useManagementEndpoint} from './composables/useManagementEndpoint';
export type {ManagementEndpoint, ManagementEndpointKey} from './composables/useManagementEndpoint';
export {default as useGrantedPermissions} from './composables/useGrantedPermissions';
export type {GrantedPermissions} from './composables/useGrantedPermissions';
export {createResourceInvalidator} from '@thunderid/browser';
export type {ResourceInvalidator, ResourceQueryKey} from '@thunderid/browser';
export {default as useGetUsers} from './composables/users/useGetUsers';
export {default as useGetUser} from './composables/users/useGetUser';
export {default as useCreateUser} from './composables/users/useCreateUser';
export {default as useUpdateUser} from './composables/users/useUpdateUser';
export type {UpdateUserVariables} from './composables/users/useUpdateUser';
export {default as useDeleteUser} from './composables/users/useDeleteUser';
export {default as useGetUserGroups} from './composables/users/useGetUserGroups';
export {default as useGetUserTypes} from './composables/users/useGetUserTypes';
export {default as useGetGroups} from './composables/groups/useGetGroups';
export type {UseGetGroupsParams} from './composables/groups/useGetGroups';
export {default as useGetGroup} from './composables/groups/useGetGroup';
export {default as useCreateGroup} from './composables/groups/useCreateGroup';
export {default as useUpdateGroup} from './composables/groups/useUpdateGroup';
export type {UpdateGroupVariables} from './composables/groups/useUpdateGroup';
export {default as useDeleteGroup} from './composables/groups/useDeleteGroup';
export {default as useGetGroupMembers} from './composables/groups/useGetGroupMembers';
export type {UseGetGroupMembersParams} from './composables/groups/useGetGroupMembers';
export {default as useAddGroupMembers} from './composables/groups/useAddGroupMembers';
export type {GroupMembersVariables} from './composables/groups/useAddGroupMembers';
export {default as useRemoveGroupMembers} from './composables/groups/useRemoveGroupMembers';
export {default as useGetRoles} from './composables/roles/useGetRoles';
export type {UseGetRolesParams} from './composables/roles/useGetRoles';
export {default as useGetRole} from './composables/roles/useGetRole';
export {default as useCreateRole} from './composables/roles/useCreateRole';
export {default as useUpdateRole} from './composables/roles/useUpdateRole';
export type {UpdateRoleVariables} from './composables/roles/useUpdateRole';
export {default as useDeleteRole} from './composables/roles/useDeleteRole';
export {default as useGetRoleAssignments} from './composables/roles/useGetRoleAssignments';
export type {UseGetRoleAssignmentsParams} from './composables/roles/useGetRoleAssignments';
export {default as useAddRoleAssignments} from './composables/roles/useAddRoleAssignments';
export type {RoleAssignmentsVariables} from './composables/roles/useAddRoleAssignments';
export {default as useRemoveRoleAssignments} from './composables/roles/useRemoveRoleAssignments';
export {default as useGetAgents} from './composables/agents/useGetAgents';
export type {UseGetAgentsParams} from './composables/agents/useGetAgents';
export {default as useGetAgent} from './composables/agents/useGetAgent';
export {default as useCreateAgent} from './composables/agents/useCreateAgent';
export {default as useUpdateAgent} from './composables/agents/useUpdateAgent';
export type {UpdateAgentVariables} from './composables/agents/useUpdateAgent';
export {default as useDeleteAgent} from './composables/agents/useDeleteAgent';
export {default as useGetAgentGroups} from './composables/agents/useGetAgentGroups';
export {default as useGetAgentRoles} from './composables/agents/useGetAgentRoles';
export {default as useGetAgentTypes} from './composables/agents/useGetAgentTypes';
export {default as useGetApplications} from './composables/applications/useGetApplications';
export type {UseGetApplicationsParams} from './composables/applications/useGetApplications';
export {default as useGetApplication} from './composables/applications/useGetApplication';
export {default as useCreateApplication} from './composables/applications/useCreateApplication';
export {default as useUpdateApplication} from './composables/applications/useUpdateApplication';
export type {UpdateApplicationVariables} from './composables/applications/useUpdateApplication';
export {default as useDeleteApplication} from './composables/applications/useDeleteApplication';

// ── Client ──
export {default as ThunderIDVueClient} from './ThunderIDVueClient';

// ── Keys ──
export {THUNDERID_KEY, FLOW_KEY, FLOW_META_KEY, I18N_KEY, THEME_KEY, USER_KEY} from './keys';

// ── Models / Types ──
export type {ThunderIDVueConfig} from './models/config';
export type {
  ThunderIDContext,
  FlowContextValue,
  FlowMessage,
  FlowMetaContextValue,
  FlowStep,
  I18nContextValue,
  ThemeContextValue,
  UserContextValue,
} from './models/contexts';

// ── UI Components — Primitives ──
export {default as Button} from './components/primitives/Button/Button';
export {default as Card} from './components/primitives/Card/Card';
export {default as Alert} from './components/primitives/Alert/Alert';
export {default as TextField} from './components/primitives/TextField/TextField';
export {default as PasswordField} from './components/primitives/PasswordField/PasswordField';
export {default as Select} from './components/primitives/Select/Select';
export type {SelectOption, SelectOptionInput} from './components/primitives/Select/Select';
export {default as UserSelect} from './components/primitives/UserSelect/UserSelect';
export {default as BaseUserSelect} from './components/primitives/UserSelect/BaseUserSelect';
export type {BaseUserSelectProps} from './components/primitives/UserSelect/BaseUserSelect';
export {default as AuthFlowSelect} from './components/primitives/AuthFlowSelect/AuthFlowSelect';
export type {AuthFlowSelectProps} from './components/primitives/AuthFlowSelect/AuthFlowSelect';
export {default as BaseAuthFlowSelect} from './components/primitives/AuthFlowSelect/BaseAuthFlowSelect';
export type {BaseAuthFlowSelectProps} from './components/primitives/AuthFlowSelect/BaseAuthFlowSelect';
export {default as UserTypeSelect} from './components/primitives/UserTypeSelect/UserTypeSelect';
export type {UserTypeSelectProps} from './components/primitives/UserTypeSelect/UserTypeSelect';
export {default as BaseUserTypeSelect} from './components/primitives/UserTypeSelect/BaseUserTypeSelect';
export type {BaseUserTypeSelectProps} from './components/primitives/UserTypeSelect/BaseUserTypeSelect';
export {default as Checkbox} from './components/primitives/Checkbox/Checkbox';
export {default as DatePicker} from './components/primitives/DatePicker/DatePicker';
export {default as OtpField} from './components/primitives/OtpField/OtpField';
export {default as Typography} from './components/primitives/Typography/Typography';
export {default as Divider} from './components/primitives/Divider/Divider';
export {default as CopyableText} from './components/primitives/CopyableText/CopyableText';
export {default as Logo} from './components/primitives/Logo/Logo';
export {default as Spinner} from './components/primitives/Spinner/Spinner';
export {default as KeyValueList} from './components/primitives/KeyValueList/KeyValueList';
export {
  UserIcon,
  EyeIcon,
  EyeOffIcon,
  ChevronDownIcon,
  CheckIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  XIcon,
  PlusIcon,
  LogOutIcon,
  ArrowLeftRightIcon,
  BuildingIcon,
  GlobeIcon,
  PencilIcon,
} from './components/primitives/Icons';

// ── UI Components — Actions ──
export {default as SignInButton} from './components/actions/SignInButton';
export {default as BaseSignInButton} from './components/actions/BaseSignInButton';
export {default as SignOutButton} from './components/actions/SignOutButton';
export {default as BaseSignOutButton} from './components/actions/BaseSignOutButton';
export {default as SignUpButton} from './components/actions/SignUpButton';
export {default as BaseSignUpButton} from './components/actions/BaseSignUpButton';

// ── UI Components — Auth Flow ──
export {default as Callback} from './components/auth/Callback';
export {default as SignIn} from './components/auth/sign-in/SignIn';
export type {SignInRenderProps} from './components/auth/sign-in/SignIn';
export {default as BaseSignIn} from './components/auth/sign-in/BaseSignIn';
export type {BaseSignInRenderProps, BaseSignInProps} from './components/auth/sign-in/BaseSignIn';
export {default as SignUp} from './components/auth/sign-up/SignUp';
export type {SignUpRenderProps} from './components/auth/sign-up/SignUp';
export {default as BaseSignUp} from './components/auth/sign-up/BaseSignUp';
export type {BaseSignUpRenderProps, BaseSignUpProps} from './components/auth/sign-up/BaseSignUp';

// ── UI Components — Control ──
export {default as SignedIn} from './components/control/SignedIn';
export {default as SignedOut} from './components/control/SignedOut';
export {default as Loading} from './components/control/Loading';

// ── UI Components — Presentation ──
export {default as User} from './components/presentation/user/User';
export {default as UserProfile} from './components/presentation/user-profile/UserProfile';
export {default as BaseUserProfile} from './components/presentation/user-profile/BaseUserProfile';
export {default as Attribution} from './components/presentation/attribution/Attribution';
export {default as ChangeCredential} from './components/presentation/change-credential/ChangeCredential';
export {default as BaseChangeCredential} from './components/presentation/change-credential/BaseChangeCredential';
export type {ChangePasswordValues} from './components/presentation/change-credential/BaseChangeCredential';
export {default as UserDropdown} from './components/presentation/user-dropdown/UserDropdown';
export {default as BaseUserDropdown} from './components/presentation/user-dropdown/BaseUserDropdown';
export {default as AcceptInvite} from './components/presentation/accept-invite/AcceptInvite';
export type {AcceptInviteRenderProps} from './components/presentation/accept-invite/AcceptInvite';
export {default as BaseAcceptInvite} from './components/presentation/accept-invite/BaseAcceptInvite';
export type {
  BaseAcceptInviteRenderProps,
  BaseAcceptInviteProps,
} from './components/presentation/accept-invite/BaseAcceptInvite';
export {default as InviteUser} from './components/presentation/invite-user/InviteUser';
export type {InviteUserRenderProps} from './components/presentation/invite-user/InviteUser';
export {default as BaseInviteUser} from './components/presentation/invite-user/BaseInviteUser';
export type {
  BaseInviteUserRenderProps,
  BaseInviteUserProps,
} from './components/presentation/invite-user/BaseInviteUser';
export {default as LanguageSwitcher} from './components/presentation/language-switcher/LanguageSwitcher';
export {default as BaseLanguageSwitcher} from './components/presentation/language-switcher/BaseLanguageSwitcher';

// ── UI Components — Admin (management) ──
export {default as DataTable} from './components/primitives/DataTable/DataTable';
export type {DataTableColumn, DataTablePagination} from './components/primitives/DataTable/DataTable';
export type {AdminListRenderProps} from './components/presentation/admin/shared/createAdminList';
export type {AdminSearchValue} from './components/presentation/admin/shared/AdminSearch';
export type {AdminFormRenderProps} from './components/presentation/admin/shared/adminFormProps';
export {default as BaseUserList} from './components/presentation/admin/UserList/BaseUserList';
export {default as UserList} from './components/presentation/admin/UserList/UserList';
export {default as BaseUserCreate} from './components/presentation/admin/UserCreate/BaseUserCreate';
export type {
  BaseUserCreateRenderProps,
  UserCreateSubmission,
} from './components/presentation/admin/UserCreate/BaseUserCreate';
export {DEFAULT_USER_CREATE_FIELDS} from './components/presentation/admin/UserCreate/userCreateFields';
export type {UserCreateField} from './components/presentation/admin/UserCreate/userCreateFields';
export {default as UserCreate} from './components/presentation/admin/UserCreate/UserCreate';
export {default as BaseUserDetails} from './components/presentation/admin/UserDetails/BaseUserDetails';
export type {BaseUserDetailsRenderProps} from './components/presentation/admin/UserDetails/BaseUserDetails';
export {default as UserDetails} from './components/presentation/admin/UserDetails/UserDetails';
export {default as BaseGroupList} from './components/presentation/admin/GroupList/BaseGroupList';
export {default as GroupList} from './components/presentation/admin/GroupList/GroupList';
export {default as BaseGroupCreate} from './components/presentation/admin/GroupCreate/BaseGroupCreate';
export type {
  BaseGroupCreateRenderProps,
  GroupCreateSubmission,
} from './components/presentation/admin/GroupCreate/BaseGroupCreate';
export {default as GroupCreate} from './components/presentation/admin/GroupCreate/GroupCreate';
export {default as BaseGroupMembers} from './components/presentation/admin/GroupMembers/BaseGroupMembers';
export type {BaseGroupMembersRenderProps} from './components/presentation/admin/GroupMembers/BaseGroupMembers';
export {default as GroupMembers} from './components/presentation/admin/GroupMembers/GroupMembers';
export {default as BaseRoleList} from './components/presentation/admin/RoleList/BaseRoleList';
export {default as RoleList} from './components/presentation/admin/RoleList/RoleList';
export {default as BaseRoleCreate} from './components/presentation/admin/RoleCreate/BaseRoleCreate';
export type {
  BaseRoleCreateRenderProps,
  RoleCreateSubmission,
} from './components/presentation/admin/RoleCreate/BaseRoleCreate';
export {default as RoleCreate} from './components/presentation/admin/RoleCreate/RoleCreate';
export {default as BaseRoleAssignments} from './components/presentation/admin/RoleAssignments/BaseRoleAssignments';
export type {BaseRoleAssignmentsRenderProps} from './components/presentation/admin/RoleAssignments/BaseRoleAssignments';
export {default as RoleAssignments} from './components/presentation/admin/RoleAssignments/RoleAssignments';
export {default as BaseRolePermissions} from './components/presentation/admin/RolePermissions/BaseRolePermissions';
export type {BaseRolePermissionsRenderProps} from './components/presentation/admin/RolePermissions/BaseRolePermissions';
export {default as RolePermissions} from './components/presentation/admin/RolePermissions/RolePermissions';
export {default as BaseAgentList} from './components/presentation/admin/AgentList/BaseAgentList';
export {default as AgentList} from './components/presentation/admin/AgentList/AgentList';
export {default as BaseAgentCreate} from './components/presentation/admin/AgentCreate/BaseAgentCreate';
export type {
  AgentCreateSubmission,
  BaseAgentCreateRenderProps,
} from './components/presentation/admin/AgentCreate/BaseAgentCreate';
export {default as AgentCreate} from './components/presentation/admin/AgentCreate/AgentCreate';
export {default as BaseAgentDetails} from './components/presentation/admin/AgentDetails/BaseAgentDetails';
export type {BaseAgentDetailsRenderProps} from './components/presentation/admin/AgentDetails/BaseAgentDetails';
export {default as AgentDetails} from './components/presentation/admin/AgentDetails/AgentDetails';
export type {IdentityCandidate} from './components/presentation/admin/shared/IdentityPicker';

// ── UI Components — Adapters ──
export {default as GoogleButton} from './components/adapters/GoogleButton';
export {default as GitHubButton} from './components/adapters/GitHubButton';
export {default as MicrosoftButton} from './components/adapters/MicrosoftButton';
export {default as FacebookButton} from './components/adapters/FacebookButton';

// ── Factories ──
export {default as FieldFactory, createField, validateFieldValue} from './components/factories/FieldFactory';
export type {FieldConfig} from './components/factories/FieldFactory';

// ── Utilities ──
export {default as buildThemeConfigFromFlowMeta} from './utils/buildThemeConfigFromFlowMeta';
export {default as getAuthComponentHeadings} from './utils/getAuthComponentHeadings';
export type {HeadingExtractionResult, AuthComponentHeadingsResult} from './utils/getAuthComponentHeadings';

// ── Re-exports from @thunderid/browser ──
export {
  FieldType,
  type Config,
  type HttpRequestConfig,
  type HttpResponse,
  type IdToken,
  type SignInOptions,
  type SignOutOptions,
  type SignUpOptions,
  type TokenExchangeRequestConfig,
  type TokenResponse,
  type User as IUser,
} from '@thunderid/browser';

// ── Phase 4 — Utilities ──
export {handleWebAuthnAuthentication} from './utils/handleWebAuthnAuthentication';
export {hasAuthParamsInUrl} from './utils/hasAuthParamsInUrl';
export {navigate} from './utils/navigate';
export {http} from './utils/http';
export {initiateOAuthRedirect} from './utils/oauth';
export {extractErrorMessage, normalizeFlowResponse} from './utils/flowTransformer';
export type {FlowErrorResponse, FlowTransformOptions} from './utils/flowTransformer';
export {handlePasskeyAuthentication, handlePasskeyRegistration} from './utils/passkey';
export {default as getUsersMeMeta} from './api/getUsersMeMeta';
export * from './api/getUsersMeMeta';

// ── Phase 4 — Router Helpers ──
export {createThunderIDGuard} from './router/guard';
export type {GuardOptions, ThunderIDNavigationGuard, NavigationGuardReturn} from './router/guard';
export {createCallbackRoute} from './router/callbackRoute';
export type {CallbackRouteOptions, ThunderIDRouteRecord} from './router/callbackRoute';

// ── Phase 4 — Theme Utilities ──
export {getActiveTheme} from './theme/getActiveTheme';
export {detectThemeMode, createClassObserver, createMediaQueryListener} from './theme/themeDetection';
export type {BrowserThemeDetection, MediaQueryListener} from './theme/themeDetection';

// ── Re-exports from @thunderid/browser (embedded flow models) ──
export {
  ThunderIDRuntimeError,
  EmbeddedFlowComponentType,
  EmbeddedFlowActionVariant,
  EmbeddedFlowTextVariant,
  EmbeddedFlowEventType,
  parseKeyValuePairs,
  // Aliased to match the React SDK, where `KeyValuePair` is already the public KeyValueInput type.
  type KeyValuePair as EmbeddedFlowKeyValuePair,
  type EmbeddedFlowComponent,
  type EmbeddedFlowResponseData,
  type EmbeddedFlowExecuteRequestConfig,
  EmbeddedSignInFlowStatus,
  EmbeddedSignInFlowType,
  type ExtendedEmbeddedSignInFlowResponse,
  type EmbeddedSignInFlowResponse,
  type EmbeddedSignInFlowCompleteResponse,
  type EmbeddedSignInFlowInitiateRequest,
  type EmbeddedSignInFlowRequest,
  EmbeddedSignUpFlowStatus,
  EmbeddedSignUpFlowType,
  type ExtendedEmbeddedSignUpFlowResponse,
  type EmbeddedSignUpFlowResponse,
  type EmbeddedSignUpFlowCompleteResponse,
  type EmbeddedSignUpFlowInitiateRequest,
  type EmbeddedSignUpFlowRequest,
  type EmbeddedSignUpFlowErrorResponse,
  type ComponentRenderContext,
  type ComponentsExtensions,
  type ComponentRenderer,
} from '@thunderid/browser';

// ── Re-exports from @thunderid/browser (management API) ──
export {
  AgentQueryKeys,
  ApplicationQueryKeys,
  GroupQueryKeys,
  RoleQueryKeys,
  UserQueryKeys,
  ThunderIDAPIError,
  addGroupMembers,
  addRoleAssignments,
  getTokenPermissions,
  hasPermission,
  createAgent,
  createApplication,
  createGroup,
  createRole,
  createUser,
  deleteAgent,
  deleteApplication,
  deleteGroup,
  deleteRole,
  deleteUser,
  getAgent,
  getAgentGroups,
  getAgentRoles,
  getAgentTypes,
  getAgents,
  getApplication,
  getApplications,
  getGroup,
  getGroupMembers,
  getGroups,
  getRole,
  getRoleAssignments,
  getRoles,
  getUser,
  getUserGroups,
  getUsers,
  removeGroupMembers,
  removeRoleAssignments,
  updateAgent,
  updateApplication,
  updateGroup,
  updateRole,
  updateUser,
  type Agent,
  type AgentListResponse,
  type AgentRoleListResponse,
  type AgentType,
  type AgentTypeListResponse,
  type ApiFetcher,
  type ApiFilteringParams,
  type Application,
  type ApplicationListResponse,
  type BasicAgent,
  type BasicApplication,
  type CreateAgentRequest,
  type CreateApplicationRequest,
  type CreateGroupRequest,
  type CreateManagedUserRequest,
  type CreateRoleRequest,
  type Group,
  type GroupListResponse,
  type GroupMember,
  type GroupMemberListResponse,
  type GroupMemberType,
  type ManagedUser,
  type ManagedUserListResponse,
  type ManagementRequestConfig,
  type MembershipGroup,
  type MembershipGroupListResponse,
  type Role,
  type RoleAssigneeType,
  type RoleAssignment,
  type RoleAssignmentInput,
  type RoleAssignmentListResponse,
  type RoleListResponse,
  type RoleResourcePermissions,
  type RoleSummary,
  type UpdateAgentRequest,
  type UpdateApplicationRequest,
  type UpdateGroupRequest,
  type UpdateManagedUserRequest,
  type UpdateRoleRequest,
} from '@thunderid/browser';

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
export {default as useCurrentProjectState} from './composables/useCurrentProjectState';
export type {CurrentProjectState} from './composables/useCurrentProjectState';
export {default as useFlow} from './composables/useFlow';
export {default as useFlowMeta} from './composables/useFlowMeta';
export {default as useI18n} from './composables/useI18n';
export {default as useTheme} from './composables/useTheme';
export {default as useUser} from './composables/useUser';
export {useOAuthCallback} from './composables/auth/useOAuthCallback';
export type {UseOAuthCallbackOptions, OAuthCallbackPayload} from './composables/auth/useOAuthCallback';
export {default as useFetchAuthFlows} from './composables/auth/useFetchAuthFlows';
export {default as useFlowExpiryHandling} from './composables/auth/useFlowExpiryHandling';
export type {FlowExpiryHandling, FlowExpiryHandlingOptions} from './composables/auth/useFlowExpiryHandling';
export type {FlowExpiryStep} from './composables/auth/useFlowExpiry';
export type {FlowExpiryRedirect} from './composables/auth/useFlowExpiryRedirect';
export {default as useInfiniteOptions} from './composables/management/useInfiniteOptions';
export type {UseInfiniteOptionsArgs, UseInfiniteOptionsResult} from './composables/management/useInfiniteOptions';
export {default as useFetchUsers} from './composables/management/useFetchUsers';
export {default as useFetchUserTypes} from './composables/management/useFetchUserTypes';
export {default as useManagementEndpoint} from './composables/management/useManagementEndpoint';
export type {ManagementEndpoint, ManagementEndpointKey} from './composables/management/useManagementEndpoint';
export {default as useManagementRequestConfig} from './composables/management/useManagementRequestConfig';
export {default as useGrantedPermissions} from './composables/management/useGrantedPermissions';
export type {GrantedPermissions} from './composables/management/useGrantedPermissions';
export {createResourceInvalidator} from '@thunderid/browser';
export type {ResourceInvalidator, ResourceQueryKey} from '@thunderid/browser';

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
export {default as SignInButton} from './components/auth/buttons/SignInButton';
export {default as BaseSignInButton} from './components/auth/buttons/BaseSignInButton';
export {default as SignOutButton} from './components/auth/buttons/SignOutButton';
export {default as BaseSignOutButton} from './components/auth/buttons/BaseSignOutButton';
export {default as SignUpButton} from './components/auth/buttons/SignUpButton';
export {default as BaseSignUpButton} from './components/auth/buttons/BaseSignUpButton';

// ── UI Components — Auth Flow ──
export {default as Callback} from './components/auth/Callback';
export {default as SignIn} from './components/auth/sign-in/SignIn';
export type {SignInRenderProps} from './components/auth/sign-in/SignIn';
export {default as BaseSignIn} from './components/auth/sign-in/BaseSignIn';
export type {BaseSignInRenderProps, BaseSignInProps} from './components/auth/sign-in/BaseSignIn';
export {default as Consent} from './components/auth/flow/Consent';
export type {ConsentData, ConsentProps, ConsentRenderProps} from './components/auth/flow/Consent';
export {default as FlowExpired} from './components/auth/flow/FlowExpired';
export type {FlowExpiredProps} from './components/auth/flow/FlowExpired';
export {default as DeviceGrant} from './components/auth/device-grant/DeviceGrant';
export type {
  BaseDeviceGrantProps,
  BaseDeviceGrantRenderProps,
  DeviceGrantResult,
} from './components/auth/device-grant/BaseDeviceGrant';
export type {DeviceGrantRenderProps} from './components/auth/device-grant/DeviceGrant';
export {default as BaseDeviceGrant} from './components/auth/device-grant/BaseDeviceGrant';
export {default as SignUp} from './components/auth/sign-up/SignUp';
export type {SignUpRenderProps} from './components/auth/sign-up/SignUp';
export {default as BaseSignUp} from './components/auth/sign-up/BaseSignUp';
export type {BaseSignUpRenderProps, BaseSignUpProps} from './components/auth/sign-up/BaseSignUp';

// ── UI Components — Control ──
export {default as SignedIn} from './components/auth/guards/SignedIn';
export {default as SignedOut} from './components/auth/guards/SignedOut';
export {default as Loading} from './components/auth/guards/Loading';

// ── UI Components — Presentation ──
export {default as User} from './components/account/user/User';
export {default as UserProfile} from './components/account/user-profile/UserProfile';
export {default as BaseUserProfile} from './components/account/user-profile/BaseUserProfile';
export type {
  BaseUserProfileVerificationSlotProps,
  BaseUserProfileVerificationState,
} from './components/account/user-profile/BaseUserProfile';
export {default as VerifyAttribute} from './components/account/verify-attribute/VerifyAttribute';
export {default as BaseVerifyAttribute} from './components/account/verify-attribute/BaseVerifyAttribute';
export type {
  BaseVerifyAttributeProps,
  BaseVerifyAttributeRenderProps,
} from './components/account/verify-attribute/BaseVerifyAttribute';
export {default as Attribution} from './components/common/attribution/Attribution';
export {default as ChangeCredential} from './components/account/change-credential/ChangeCredential';
export {default as BaseChangeCredential} from './components/account/change-credential/BaseChangeCredential';
export type {ChangePasswordValues} from './components/account/change-credential/BaseChangeCredential';
export {default as OrganizationUnitSwitcher} from './components/account/organization-unit-switcher/OrganizationUnitSwitcher';
export {default as BaseOrganizationUnitSwitcher} from './components/account/organization-unit-switcher/BaseOrganizationUnitSwitcher';
export type {
  BaseOrganizationUnitSwitcherProps,
  OrganizationUnitSwitcherRenderProps,
} from './components/account/organization-unit-switcher/BaseOrganizationUnitSwitcher';
export {default as UserDropdown} from './components/account/user-dropdown/UserDropdown';
export {default as BaseUserDropdown} from './components/account/user-dropdown/BaseUserDropdown';
export {default as AcceptInvite} from './components/auth/accept-invite/AcceptInvite';
export type {AcceptInviteRenderProps} from './components/auth/accept-invite/AcceptInvite';
export {default as BaseAcceptInvite} from './components/auth/accept-invite/BaseAcceptInvite';
export type {
  BaseAcceptInviteRenderProps,
  BaseAcceptInviteProps,
} from './components/auth/accept-invite/BaseAcceptInvite';
export {default as InviteUser} from './components/auth/invite-user/InviteUser';
export type {InviteUserRenderProps} from './components/auth/invite-user/InviteUser';
export {default as BaseInviteUser} from './components/auth/invite-user/BaseInviteUser';
export type {BaseInviteUserRenderProps, BaseInviteUserProps} from './components/auth/invite-user/BaseInviteUser';
export {default as LanguageSwitcher} from './components/common/language-switcher/LanguageSwitcher';
export {default as BaseLanguageSwitcher} from './components/common/language-switcher/BaseLanguageSwitcher';

// ── UI Components — Admin (management) ──
export {default as DataTable} from './components/primitives/DataTable/DataTable';
export type {DataTableColumn, DataTablePagination} from './components/primitives/DataTable/DataTable';
export type {AdminListRenderProps} from './components/management/shared/createAdminList';
export type {AdminSearchValue} from './components/management/shared/AdminSearch';
export type {AdminFormRenderProps} from './components/management/shared/adminFormProps';
export {default as BaseUserList} from './components/management/UserList/BaseUserList';
export {default as UserList} from './components/management/UserList/UserList';
export {default as BaseUserCreate} from './components/management/UserCreate/BaseUserCreate';
export type {BaseUserCreateRenderProps, UserCreateSubmission} from './components/management/UserCreate/BaseUserCreate';
export {DEFAULT_USER_CREATE_FIELDS} from './components/management/UserCreate/userCreateFields';
export type {UserCreateField} from './components/management/UserCreate/userCreateFields';
export {default as UserCreate} from './components/management/UserCreate/UserCreate';
export {default as BaseUserDetails} from './components/management/UserDetails/BaseUserDetails';
export type {BaseUserDetailsRenderProps} from './components/management/UserDetails/BaseUserDetails';
export {default as UserDetails} from './components/management/UserDetails/UserDetails';
export {default as BaseGroupList} from './components/management/GroupList/BaseGroupList';
export {default as GroupList} from './components/management/GroupList/GroupList';
export {default as BaseGroupCreate} from './components/management/GroupCreate/BaseGroupCreate';
export type {
  BaseGroupCreateRenderProps,
  GroupCreateSubmission,
} from './components/management/GroupCreate/BaseGroupCreate';
export {default as GroupCreate} from './components/management/GroupCreate/GroupCreate';
export {default as BaseGroupMembers} from './components/management/GroupMembers/BaseGroupMembers';
export type {BaseGroupMembersRenderProps} from './components/management/GroupMembers/BaseGroupMembers';
export {default as GroupMembers} from './components/management/GroupMembers/GroupMembers';
export {default as BaseRoleList} from './components/management/RoleList/BaseRoleList';
export {default as RoleList} from './components/management/RoleList/RoleList';
export {default as BaseRoleCreate} from './components/management/RoleCreate/BaseRoleCreate';
export type {BaseRoleCreateRenderProps, RoleCreateSubmission} from './components/management/RoleCreate/BaseRoleCreate';
export {default as RoleCreate} from './components/management/RoleCreate/RoleCreate';
export {default as BaseRoleAssignments} from './components/management/RoleAssignments/BaseRoleAssignments';
export type {BaseRoleAssignmentsRenderProps} from './components/management/RoleAssignments/BaseRoleAssignments';
export {default as RoleAssignments} from './components/management/RoleAssignments/RoleAssignments';
export {default as BaseRolePermissions} from './components/management/RolePermissions/BaseRolePermissions';
export type {
  BaseRolePermissionsRenderProps,
  RolePermissionChange,
  RolePermissionResourceServer,
} from './components/management/RolePermissions/BaseRolePermissions';
export {default as RolePermissions} from './components/management/RolePermissions/RolePermissions';
export {default as BaseGroupDetails} from './components/management/GroupDetails/BaseGroupDetails';
export type {BaseGroupDetailsRenderProps} from './components/management/GroupDetails/BaseGroupDetails';
export {default as GroupDetails} from './components/management/GroupDetails/GroupDetails';
export {default as BaseRoleDetails} from './components/management/RoleDetails/BaseRoleDetails';
export type {BaseRoleDetailsRenderProps} from './components/management/RoleDetails/BaseRoleDetails';
export {default as RoleDetails} from './components/management/RoleDetails/RoleDetails';
export {default as BaseAgentList} from './components/management/AgentList/BaseAgentList';
export {default as AgentList} from './components/management/AgentList/AgentList';
export {default as BaseAgentCreate} from './components/management/AgentCreate/BaseAgentCreate';
export type {
  AgentCreateSubmission,
  BaseAgentCreateRenderProps,
} from './components/management/AgentCreate/BaseAgentCreate';
export {default as AgentCreate} from './components/management/AgentCreate/AgentCreate';
export {default as BaseAgentDetails} from './components/management/AgentDetails/BaseAgentDetails';
export type {BaseAgentDetailsRenderProps} from './components/management/AgentDetails/BaseAgentDetails';
export {default as AgentDetails} from './components/management/AgentDetails/AgentDetails';
export {default as BaseApplicationList} from './components/management/ApplicationList/BaseApplicationList';
export {default as ApplicationList} from './components/management/ApplicationList/ApplicationList';
export {default as BaseApplicationCreate} from './components/management/ApplicationCreate/BaseApplicationCreate';
export type {
  ApplicationCreateSubmission,
  BaseApplicationCreateRenderProps,
} from './components/management/ApplicationCreate/BaseApplicationCreate';
export {default as ApplicationCreate} from './components/management/ApplicationCreate/ApplicationCreate';
export {default as BaseApplicationDetails} from './components/management/ApplicationDetails/BaseApplicationDetails';
export type {
  ApplicationUpdateSubmission,
  BaseApplicationDetailsRenderProps,
} from './components/management/ApplicationDetails/BaseApplicationDetails';
export {default as ApplicationDetails} from './components/management/ApplicationDetails/ApplicationDetails';
export type {ApplicationFormValues, ApplicationTextField} from './components/management/shared/renderApplicationFields';
export type {IdentityCandidate} from './components/management/shared/IdentityPicker';
export {default as BaseProjectList} from './components/management/ProjectList/BaseProjectList';
export {default as ProjectList} from './components/management/ProjectList/ProjectList';
export {default as BaseProjectCreate} from './components/management/ProjectCreate/BaseProjectCreate';
export type {
  BaseProjectCreateRenderProps,
  ProjectCreateField,
  ProjectCreateSubmission,
} from './components/management/ProjectCreate/BaseProjectCreate';
export {default as ProjectCreate} from './components/management/ProjectCreate/ProjectCreate';
export {default as BaseProjectDetails} from './components/management/ProjectDetails/BaseProjectDetails';
export type {
  BaseProjectDetailsRenderProps,
  ProjectUpdateSubmission,
} from './components/management/ProjectDetails/BaseProjectDetails';
export {default as ProjectDetails} from './components/management/ProjectDetails/ProjectDetails';
export {default as BaseProjectSwitcher} from './components/management/ProjectSwitcher/BaseProjectSwitcher';
export type {BaseProjectSwitcherRenderProps} from './components/management/ProjectSwitcher/BaseProjectSwitcher';
export {default as ProjectSwitcher} from './components/management/ProjectSwitcher/ProjectSwitcher';
export {default as BaseOrganizationUnitList} from './components/management/OrganizationUnitList/BaseOrganizationUnitList';
export {default as OrganizationUnitList} from './components/management/OrganizationUnitList/OrganizationUnitList';
export {default as BaseOrganizationUnitCreate} from './components/management/OrganizationUnitCreate/BaseOrganizationUnitCreate';
export type {
  BaseOrganizationUnitCreateRenderProps,
  OrganizationUnitCreateField,
  OrganizationUnitCreateSubmission,
} from './components/management/OrganizationUnitCreate/BaseOrganizationUnitCreate';
export {default as OrganizationUnitCreate} from './components/management/OrganizationUnitCreate/OrganizationUnitCreate';
export {default as BaseOrganizationUnitDetails} from './components/management/OrganizationUnitDetails/BaseOrganizationUnitDetails';
export type {
  BaseOrganizationUnitDetailsRenderProps,
  OrganizationUnitContents,
  OrganizationUnitUpdateSubmission,
} from './components/management/OrganizationUnitDetails/BaseOrganizationUnitDetails';
export {default as OrganizationUnitDetails} from './components/management/OrganizationUnitDetails/OrganizationUnitDetails';
export {default as BaseSharingPolicies} from './components/management/SharingPolicies/BaseSharingPolicies';
export type {BaseSharingPoliciesRenderProps} from './components/management/SharingPolicies/BaseSharingPolicies';
export {default as SharingPolicies} from './components/management/SharingPolicies/SharingPolicies';

// ── UI Components — Adapters ──
export {default as GoogleButton} from './components/auth/buttons/GoogleButton';
export {default as GitHubButton} from './components/auth/buttons/GitHubButton';
export {default as MicrosoftButton} from './components/auth/buttons/MicrosoftButton';
export {default as FacebookButton} from './components/auth/buttons/FacebookButton';

// ── Factories ──
export {default as FieldFactory, createField, validateFieldValue} from './components/auth/flow/FieldFactory';
export type {FieldConfig} from './components/auth/flow/FieldFactory';

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
export {default as getUsersMeMeta} from './api/account/getUsersMeMeta';
export * from './api/account/getUsersMeMeta';
export {default as executeEmbeddedSelfFlow} from './api/auth/executeEmbeddedSelfFlow';
export type {ExecuteEmbeddedSelfFlowConfig} from './api/auth/executeEmbeddedSelfFlow';
export {default as getAccessibleOrganizationUnits} from './api/account/getAccessibleOrganizationUnits';
export type {GetAccessibleOrganizationUnitsConfig} from './api/account/getAccessibleOrganizationUnits';
export {
  OrganizationUnitSwitchErrorCodes,
  type AccessibleOrganizationUnit,
  type AccessibleOrganizationUnitList,
  type AccessibleOrganizationUnitScope,
  type CurrentOrganizationUnit,
  type SwitchOrganizationUnitOptions,
} from '@thunderid/browser';

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
  EmbeddedSelfFlowStatus,
  type EmbeddedSelfFlowResponse,
  type EmbeddedSelfFlowRequest,
  AttributeVerificationConstants,
  getVerifiedAttributes,
  isVerifiableAttribute,
  type VerifiedAttribute,
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
  AccountLifecycleFlowConfigKey,
  AdministrationFlowConfigKey,
  AdministrationFlowData,
  AdministrationFlowError,
  AdministrationFlowInput,
  AdministrationModes,
  ADMINISTRATION_FLOW_TYPE,
  createUserType,
  deleteUserType,
  executeAdministrationFlow,
  findAdministrationFlows,
  getAccountLifecycleActions,
  getAgentName,
  getAgentType,
  getUserType,
  getUserTypes,
  getUserUsages,
  previewCimdDocument,
  regenerateAgentSecret,
  regenerateClientSecret,
  regenerateFlowSecret,
  resolveAdministrationFlowHandles,
  resolveAdministrationFlowId,
  resolveAdministrationFlows,
  runAdministrationFlow,
  updateAgentType,
  updateUserCredentials,
  updateUserType,
} from '@thunderid/browser';
export type {
  AdministrationFlowConfig,
  ServerError,
  ServerErrorMessage,
  AdministrationFlowConfigKeyValue,
  AdministrationFlowExecutionResponse,
  AdministrationFlowStepError,
  AdministrationMode,
  AdministrationOptions,
  AgentTypeDetails,
  ArrayItemDefinition,
  ArrayPropertyDefinition,
  BooleanPropertyDefinition,
  CimdPreviewResponse,
  CreateUserTypeConfig,
  CreateUserTypeRequest,
  DeleteUserTypeConfig,
  EntityTypeSchema,
  EntityTypeSystemAttributes,
  GetAgentTypeConfig,
  GetUserTypeConfig,
  GetUserTypesConfig,
  GetUserUsagesConfig,
  ManagedUserTypeDetails,
  NumberPropertyDefinition,
  ObjectPropertyDefinition,
  PreviewCimdDocumentConfig,
  PropertyDefinition,
  RegenerateAgentSecretConfig,
  RegenerateAgentSecretResult,
  RegenerateClientSecretConfig,
  RegenerateClientSecretResult,
  RegenerateFlowSecretConfig,
  RegenerateFlowSecretResult,
  StringPropertyDefinition,
  UpdateAgentTypeConfig,
  UpdateAgentTypeRequest,
  UpdateUserCredentialsConfig,
  UpdateUserCredentialsRequest,
  UpdateUserTypeConfig,
  UpdateUserTypeRequest,
  UserUsage,
  UserUsagesResponse,
} from '@thunderid/browser';
// The management operations beyond users, groups, roles, agents and applications.
export {
  applyGatewayConfiguration,
  createAction,
  createAgentType,
  createApplicationSharingPolicy,
  createAuthorizationDetailType,
  createConfigurationVersion,
  createConnection,
  createCredentialConfiguration,
  createDesignTheme,
  createFlow,
  createFlowSharingPolicy,
  createGateway,
  createGatewaySecret,
  createGatewayVariable,
  createGroupByPath,
  createLayout,
  createNotificationTemplate,
  createOrganizationUnit,
  createPresentationDefinition,
  createProject,
  createResource,
  createResourceServer,
  createRoleSharingPolicy,
  createSecret,
  createUserByPath,
  createUserSharingPolicy,
  createVariable,
  deleteAction,
  deleteAgentType,
  deleteApplicationSharingPolicy,
  deleteAuthorizationDetailType,
  deleteClientRegistration,
  deleteConnection,
  deleteCredentialConfiguration,
  deleteDesignTheme,
  deleteFlow,
  deleteFlowSharingPolicy,
  deleteGateway,
  deleteGatewaySecret,
  deleteGatewayVariable,
  deleteImportedConfiguration,
  deleteLayout,
  deleteNotificationTemplate,
  deleteOrganizationUnit,
  deleteOrganizationUnitByPath,
  deletePresentationDefinition,
  deleteProject,
  deleteResource,
  deleteResourceServer,
  deleteRoleSharingPolicy,
  deleteSecret,
  deleteTranslation,
  deleteTranslations,
  deleteUserSharingPolicy,
  deleteVariable,
  exportConfiguration,
  getAction,
  getActions,
  getApplicationOverlayRules,
  getApplicationSharingPolicies,
  getApplicationSharingPolicy,
  getAuthorizationDetailType,
  getAuthorizationDetailTypes,
  getClientRegistration,
  getConfigurationVersion,
  getConfigurationVersions,
  getConnection,
  getConnectionUsages,
  getConnections,
  getConnectionsMeta,
  getCredentialConfiguration,
  getCredentialConfigurations,
  getDesignTheme,
  getDesignThemeUsages,
  getDesignThemes,
  getFlow,
  getFlowOverlayRules,
  getFlowSharingPolicies,
  getFlowSharingPolicy,
  getFlowUsages,
  getFlowVariables,
  getFlowVersion,
  getFlowVersions,
  getFlows,
  getGateway,
  getGatewayAppliedConfiguration,
  getGatewayAppliedVersion,
  getGatewayConfigurationDiff,
  getGatewayMaster,
  getGatewayMasterHistory,
  getGatewayMasterResource,
  getGatewaySecret,
  getGatewaySecrets,
  getGatewayVariable,
  getGatewayVariables,
  getGateways,
  getGroupsByPath,
  getLanguages,
  getLayout,
  getLayoutUsages,
  getLayouts,
  getNotificationTemplate,
  getNotificationTemplates,
  getOrganizationUnit,
  getOrganizationUnitByPath,
  getOrganizationUnitChildren,
  getOrganizationUnitGroups,
  getOrganizationUnitRoles,
  getOrganizationUnitUsers,
  getOrganizationUnits,
  getPresentationDefinition,
  getPresentationDefinitions,
  getProject,
  getProjects,
  getResource,
  getResourceServer,
  getResourceServerPermissions,
  getResourceServers,
  getResources,
  getRoleOverlayRules,
  getRoleSharingPolicies,
  getRoleSharingPolicy,
  getSecret,
  getSecrets,
  getServerConfig,
  getServerConfigs,
  getSupportedAuthorizationDetailsType,
  getSupportedAuthorizationDetailsTypes,
  getUserOverlayRules,
  getUserSharingPolicies,
  getUserSharingPolicy,
  getUsersByPath,
  getVariable,
  getVariables,
  importConfiguration,
  registerClient,
  resolveDesign,
  resolveTranslation,
  resolveTranslations,
  restoreFlowVersion,
  revertGatewayConfiguration,
  runAccountLifecycleAction,
  sendUserAttributeVerification,
  setTranslation,
  setTranslations,
  suspendAgent,
  suspendApplication,
  suspendUser,
  unlockAgent,
  unlockUser,
  unsuspendAgent,
  unsuspendApplication,
  unsuspendUser,
  updateAction,
  updateApplicationSharingPolicy,
  updateAuthorizationDetailType,
  updateClientRegistration,
  updateConnection,
  updateCredentialConfiguration,
  updateDesignTheme,
  updateFlow,
  updateFlowSharingPolicy,
  updateFlowVariables,
  updateGateway,
  updateGatewaySecret,
  updateGatewayVariable,
  updateLayout,
  updateNotificationTemplate,
  updateOrganizationUnit,
  updateOrganizationUnitByPath,
  updatePresentationDefinition,
  updateProject,
  updateResource,
  updateResourceServer,
  updateRoleSharingPolicy,
  updateSecret,
  updateServerConfig,
  updateUserSharingPolicy,
  updateVariable,
} from '@thunderid/browser';
export type {
  AccessHoldReason,
  AccessLockedMethod,
  AccessStatus,
  AccessStatusDetails,
  AccessStatusValue,
  AccountLifecycleAction,
  AccountLifecycleOptions,
  AccountLifecycleResult,
  AccountLifecycleSubjectKind,
  RunAccountLifecycleActionConfig,
  ApplyGatewayConfigurationConfig,
  ApplyGatewayConfigurationRequest,
  CaptureConfigurationVersionRequest,
  ClientRegistration,
  ClientRegistrationMetadata,
  ClientRegistrationRequest,
  ClientRegistrationUpdateRequest,
  ConfigurationActor,
  ConfigurationExportOptions,
  ConfigurationExportRequest,
  ConfigurationExportResponse,
  ConfigurationImportOptions,
  ConfigurationImportOutcome,
  ConfigurationImportRequest,
  ConfigurationImportResponse,
  ConfigurationResourceDeletion,
  ConfigurationValueReference,
  ConfigurationVersion,
  Connection,
  ConnectionCategory,
  ConnectionInstance,
  ConnectionListResponse,
  ConnectionMetaResponse,
  ConnectionRequest,
  ConnectionSummary,
  ConnectionType,
  ConnectionTypeWithUsages,
  ConnectionUsage,
  ConnectionUsagesResponse,
  ConnectionVendorMeta,
  CreateActionConfig,
  CreateActionRequest,
  CreateAgentTypeConfig,
  CreateAgentTypeRequest,
  CreateApplicationSharingPolicyConfig,
  CreateConfigurationVersionConfig,
  CreateConnectionConfig,
  CreateCredentialConfigurationConfig,
  CreateDesignThemeConfig,
  CreateEmailTemplateRequest,
  CreateFlowConfig,
  CreateGatewayConfig,
  CreateGatewaySecretConfig,
  CreateGatewayVariableConfig,
  CreateLayoutConfig,
  CreateNotificationTemplateConfig,
  CreateNotificationTemplateRequest,
  CreateOrganizationUnitConfig,
  CreateOrganizationUnitRequest,
  CreatePresentationDefinitionConfig,
  CreateResourceConfig,
  CreateResourceRequest,
  CreateResourceServerConfig,
  CreateResourceServerRequest,
  CreateSecretConfig,
  CreateSmsTemplateRequest,
  CreateUserByPathConfig,
  CreateUserByPathRequest,
  CreateUserSharingPolicyConfig,
  CreateVariableConfig,
  CredentialConfiguration,
  CredentialConfigurationClaim,
  CredentialConfigurationDisplay,
  CredentialConfigurationRequest,
  CredentialConfigurationSummary,
  DeleteActionConfig,
  DeleteAgentTypeConfig,
  DeleteApplicationSharingPolicyConfig,
  DeleteClientRegistrationConfig,
  DeleteConnectionConfig,
  DeleteCredentialConfigurationConfig,
  DeleteDesignThemeConfig,
  DeleteFlowConfig,
  DeleteGatewayConfig,
  DeleteGatewaySecretConfig,
  DeleteGatewayVariableConfig,
  DeleteImportedConfigurationConfig,
  DeleteImportedConfigurationRequest,
  DeleteImportedConfigurationResponse,
  DeleteLayoutConfig,
  DeleteNotificationTemplateConfig,
  DeleteOrganizationUnitByPathConfig,
  DeleteOrganizationUnitConfig,
  DeletePresentationDefinitionConfig,
  DeleteResourceConfig,
  DeleteResourceServerConfig,
  DeleteSecretConfig,
  DeleteTranslationConfig,
  DeleteTranslationsConfig,
  DeleteUserSharingPolicyConfig,
  DeleteVariableConfig,
  DesignLayout,
  DesignLayoutListItem,
  DesignLayoutListResponse,
  DesignLayoutRequest,
  DesignResolveResponse,
  DesignResolveType,
  DesignTheme,
  DesignThemeListItem,
  DesignThemeListResponse,
  DesignThemeRequest,
  EmailNotificationTemplate,
  EmailTemplateContent,
  ExportConfigurationConfig,
  Gateway,
  GatewayAppliedConfiguration,
  GatewayAppliedVersion,
  GatewayApplyResult,
  GatewayConfigurationChange,
  GatewayConfigurationDiff,
  GatewayMaster,
  GatewayMasterEntry,
  GatewayMasterEntryFailure,
  GatewayMasterSummary,
  GatewayRegistration,
  GatewayResourceHistory,
  GatewayValueChanges,
  GetActionConfig,
  GetActionsConfig,
  GetApplicationOverlayRulesConfig,
  GetApplicationSharingPoliciesConfig,
  GetApplicationSharingPolicyConfig,
  GetClientRegistrationConfig,
  GetConfigurationVersionConfig,
  GetConfigurationVersionsConfig,
  GetConnectionConfig,
  GetConnectionUsagesConfig,
  GetConnectionsConfig,
  GetConnectionsMetaConfig,
  GetConnectionsResult,
  GetCredentialConfigurationConfig,
  GetCredentialConfigurationsConfig,
  GetDesignThemeConfig,
  GetDesignThemeUsagesConfig,
  GetDesignThemesConfig,
  GetFlowConfig,
  GetFlowUsagesConfig,
  GetFlowVersionConfig,
  GetFlowVersionsConfig,
  GetFlowsConfig,
  GetGatewayAppliedConfigurationConfig,
  GetGatewayAppliedVersionConfig,
  GetGatewayConfig,
  GetGatewayConfigurationDiffConfig,
  GetGatewayMasterConfig,
  GetGatewayMasterHistoryConfig,
  GetGatewayMasterResourceConfig,
  GetGatewaySecretConfig,
  GetGatewaySecretsConfig,
  GetGatewayVariableConfig,
  GetGatewayVariablesConfig,
  GetGatewaysConfig,
  GetLanguagesConfig,
  GetLayoutConfig,
  GetLayoutUsagesConfig,
  GetLayoutsConfig,
  GetNotificationTemplateConfig,
  GetNotificationTemplatesConfig,
  GetOrganizationUnitByPathConfig,
  GetOrganizationUnitChildrenConfig,
  GetOrganizationUnitConfig,
  GetOrganizationUnitGroupsConfig,
  GetOrganizationUnitRolesConfig,
  GetOrganizationUnitUsersConfig,
  GetOrganizationUnitsConfig,
  GetPresentationDefinitionConfig,
  GetPresentationDefinitionsConfig,
  GetResourceConfig,
  GetResourceServerConfig,
  GetResourceServersConfig,
  GetResourcesConfig,
  GetSecretConfig,
  GetSecretsConfig,
  GetServerConfigConfig,
  GetServerConfigsConfig,
  GetUserOverlayRulesConfig,
  GetUserSharingPoliciesConfig,
  GetUserSharingPolicyConfig,
  GetUsersByPathConfig,
  GetVariableConfig,
  GetVariablesConfig,
  ImportConfigurationConfig,
  LanguageListResponse,
  LanguageTranslationsResponse,
  ManagedAction,
  ManagedActionKind,
  ManagedActionListResponse,
  ManagedFlow,
  ManagedFlowDefinition,
  ManagedFlowListResponse,
  ManagedFlowNode,
  ManagedFlowRequest,
  ManagedFlowVersion,
  ManagedFlowVersionInfo,
  ManagedFlowVersionListResponse,
  ManagedResource,
  ManagedResourceListResponse,
  ManagedTranslation,
  NotificationChannel,
  NotificationTemplate,
  NotificationTemplateDesign,
  NotificationTemplateListResponse,
  NotificationTemplateSummary,
  OrganizationUnit,
  OrganizationUnitBasic,
  OrganizationUnitGroup,
  OrganizationUnitGroupListResponse,
  OrganizationUnitListResponse,
  OrganizationUnitReference,
  OrganizationUnitRole,
  OrganizationUnitRoleListResponse,
  OrganizationUnitUser,
  OrganizationUnitUserListResponse,
  OverlayRule,
  PresentationDefinition,
  PresentationDefinitionRequest,
  PresentationDefinitionSummary,
  RegisterClientConfig,
  RegisterGatewayRequest,
  ResolveDesignConfig,
  ResolveTranslationConfig,
  ResolveTranslationsConfig,
  ResolvedOverlay,
  ResourceServer,
  ResourceServerAuthorizationEngine,
  ResourceServerListResponse,
  ResourceServerType,
  ResourceUsage,
  ResourceUsagesResponse,
  RestoreFlowVersionConfig,
  RevertGatewayConfigurationConfig,
  RevertGatewayConfigurationRequest,
  Secret,
  SecretListResponse,
  SecretRequest,
  SecretUpdateRequest,
  SendUserAttributeVerificationConfig,
  SendUserAttributeVerificationResult,
  ServerConfigLayers,
  SetTranslationConfig,
  SetTranslationRequest,
  SetTranslationsConfig,
  SetTranslationsRequest,
  SharingPolicy,
  SharingPolicyAllUnits,
  SharingPolicyChildUnit,
  SharingPolicyChildUnits,
  SharingPolicyChildUnitsAll,
  SharingPolicyChildUnitsSelected,
  SharingPolicyListResponse,
  SharingPolicyOtherTreeRoots,
  SharingPolicyOtherTreeRootsAll,
  SharingPolicyOtherTreeRootsSelected,
  SharingPolicyRequest,
  SharingPolicyUpdateRequest,
  SmsNotificationTemplate,
  SmsTemplateContent,
  SuspendAgentConfig,
  SuspendApplicationConfig,
  SuspendUserConfig,
  TranslationsByNamespace,
  UnlockAgentConfig,
  UnlockUserConfig,
  UnsuspendAgentConfig,
  UnsuspendApplicationConfig,
  UnsuspendUserConfig,
  UpdateActionConfig,
  UpdateActionRequest,
  UpdateApplicationSharingPolicyConfig,
  UpdateClientRegistrationConfig,
  UpdateConnectionConfig,
  UpdateCredentialConfigurationConfig,
  UpdateDesignThemeConfig,
  UpdateEmailTemplateRequest,
  UpdateFlowConfig,
  UpdateGatewayConfig,
  UpdateGatewayRequest,
  UpdateGatewaySecretConfig,
  UpdateGatewayVariableConfig,
  UpdateLayoutConfig,
  UpdateNotificationTemplateConfig,
  UpdateNotificationTemplateRequest,
  UpdateOrganizationUnitByPathConfig,
  UpdateOrganizationUnitByPathRequest,
  UpdateOrganizationUnitConfig,
  UpdateOrganizationUnitRequest,
  UpdatePresentationDefinitionConfig,
  UpdateResourceConfig,
  UpdateResourceRequest,
  UpdateResourceServerConfig,
  UpdateResourceServerRequest,
  UpdateSecretConfig,
  UpdateServerConfigConfig,
  UpdateSmsTemplateRequest,
  UpdateUserSharingPolicyConfig,
  UpdateVariableConfig,
  Variable,
  VariableListResponse,
  VariableRequest,
  VariableUpdateRequest,
  GetRoleSharingPoliciesConfig,
  CreateRoleSharingPolicyConfig,
  GetRoleSharingPolicyConfig,
  UpdateRoleSharingPolicyConfig,
  DeleteRoleSharingPolicyConfig,
  GetRoleOverlayRulesConfig,
  GetFlowSharingPoliciesConfig,
  CreateFlowSharingPolicyConfig,
  GetFlowSharingPolicyConfig,
  UpdateFlowSharingPolicyConfig,
  DeleteFlowSharingPolicyConfig,
  GetFlowOverlayRulesConfig,
  GetFlowVariablesConfig,
  UpdateFlowVariablesConfig,
  GetGroupsByPathConfig,
  CreateGroupByPathConfig,
  GetProjectsConfig,
  GetProjectConfig,
  CreateProjectConfig,
  UpdateProjectConfig,
  DeleteProjectConfig,
  GetAuthorizationDetailTypesConfig,
  GetAuthorizationDetailTypeConfig,
  CreateAuthorizationDetailTypeConfig,
  UpdateAuthorizationDetailTypeConfig,
  DeleteAuthorizationDetailTypeConfig,
  GetSupportedAuthorizationDetailsTypesConfig,
  GetSupportedAuthorizationDetailsTypeConfig,
  GetResourceServerPermissionsConfig,
  ResourceServerPermission,
  AuthorizationDetailProcessor,
  AuthorizationDetailProcessorAuthentication,
  AuthorizationDetailType,
  AuthorizationDetailTypeListResponse,
  AuthorizationDetailTypeRequest,
  CreateGroupByPathRequest,
  CreateProjectRequest,
  FlowResolvedOverlay,
  FlowVariableValue,
  FlowVariables,
  Project,
  ProjectListResponse,
  RoleResolvedOverlay,
  SupportedAuthorizationDetailsType,
  SupportedAuthorizationDetailsTypeModification,
  SupportedAuthorizationDetailsTypesResponse,
  UpdateProjectRequest,
} from '@thunderid/browser';

// Copyright 2020-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export {IsomorphicCrypto} from './IsomorphicCrypto';

export {default as executeEmbeddedSignInFlow} from './api/executeEmbeddedSignInFlow';
export {default as executeEmbeddedSignUpFlow} from './api/executeEmbeddedSignUpFlow';
export {default as executeEmbeddedRecoveryFlow} from './api/executeEmbeddedRecoveryFlow';
export {default as executeEmbeddedUserOnboardingFlow} from './api/executeEmbeddedUserOnboardingFlow';
export type {EmbeddedUserOnboardingFlowResponse} from './api/executeEmbeddedUserOnboardingFlow';
export {default as getFlowMeta} from './api/getFlowMeta';
export {default as getOrganizationUnitChildren} from './api/getOrganizationUnitChildren';
export type {
  GetOrganizationUnitChildrenConfig,
  OrganizationUnit,
  OrganizationUnitListResponse,
} from './api/getOrganizationUnitChildren';
export {default as getUserInfo} from './api/getUserInfo';
export {default as getUsersMe} from './api/getUsersMe';
export type {GetUsersMeConfig} from './api/getUsersMe';
export {default as getUsersMeMeta} from './api/getUsersMeMeta';
export type {GetUsersMeMetaConfig, UsersMeMetaResponse, AttributeSchema} from './api/getUsersMeMeta';
export {default as updateMeCredentials} from './api/updateMeCredentials';
export type {UpdateMeCredentialsConfig} from './api/updateMeCredentials';
export {default as updateMeProfile} from './api/updateMeProfile';
export type {UpdateMeProfileConfig} from './api/updateMeProfile';

export {default as getApplications} from './api/applications/getApplications';
export type {GetApplicationsConfig} from './api/applications/getApplications';
export {default as getApplication} from './api/applications/getApplication';
export type {GetApplicationConfig} from './api/applications/getApplication';
export {default as createApplication} from './api/applications/createApplication';
export type {CreateApplicationConfig} from './api/applications/createApplication';
export {default as updateApplication} from './api/applications/updateApplication';
export type {UpdateApplicationConfig} from './api/applications/updateApplication';
export {default as deleteApplication} from './api/applications/deleteApplication';
export type {DeleteApplicationConfig} from './api/applications/deleteApplication';
export {default as getUsers} from './api/users/getUsers';
export type {GetUsersConfig} from './api/users/getUsers';
export {default as getUser} from './api/users/getUser';
export type {GetUserConfig} from './api/users/getUser';
export {default as createUser} from './api/users/createUser';
export type {CreateUserConfig} from './api/users/createUser';
export {default as updateUser} from './api/users/updateUser';
export type {UpdateUserConfig} from './api/users/updateUser';
export {default as deleteUser} from './api/users/deleteUser';
export type {DeleteUserConfig} from './api/users/deleteUser';
export {default as getAgents} from './api/agents/getAgents';
export type {GetAgentsConfig} from './api/agents/getAgents';
export {default as getAgent} from './api/agents/getAgent';
export type {GetAgentConfig} from './api/agents/getAgent';
export {default as createAgent} from './api/agents/createAgent';
export type {CreateAgentConfig} from './api/agents/createAgent';
export {default as updateAgent} from './api/agents/updateAgent';
export type {UpdateAgentConfig} from './api/agents/updateAgent';
export {default as deleteAgent} from './api/agents/deleteAgent';
export type {DeleteAgentConfig} from './api/agents/deleteAgent';

export {default as ApplicationNativeAuthenticationConstants} from './constants/ApplicationNativeAuthenticationConstants';
export {default as TokenConstants} from './constants/TokenConstants';
export {default as OIDCRequestConstants} from './constants/OIDCRequestConstants';
export {default as VendorConstants} from './constants/VendorConstants';
export {default as CredentialConstants} from './constants/CredentialConstants';
export {default as ConsentConstants} from './constants/ConsentConstants';
export {default as ApplicationQueryKeys} from './constants/ApplicationQueryKeys';
export {default as UserQueryKeys} from './constants/UserQueryKeys';
export {default as AgentQueryKeys} from './constants/AgentQueryKeys';

export {default as ThunderIDError} from './errors/ThunderIDError';
export {default as ThunderIDAPIError} from './errors/ThunderIDAPIError';
export {default as ThunderIDRuntimeError} from './errors/ThunderIDRuntimeError';
export {ThunderIDAuthException} from './errors/exception';

export type {CIBAInitiateOptions, CIBAInitiateResponse, CIBAErrorCode, CIBAPollOptions} from './models/ciba';

export {
  EmbeddedFlowComponentType,
  EmbeddedFlowActionVariant,
  EmbeddedFlowTextVariant,
  EmbeddedFlowEventType,
} from './models/embedded-flow';
export type {
  EmbeddedFlowComponent,
  EmbeddedFlowComponentAction,
  EmbeddedFlowResponseData,
  EmbeddedFlowExecuteRequestConfig,
  FlowExecutionError,
  ConsentAttributeElement,
  PromptElement,
  ConsentPurposeDecision,
  ConsentDecisions,
  ConsentPurposeData,
  ConsentPromptData,
  I18nMessage,
  ValidationRule,
  ValidationRuleType,
  FieldError,
  PrefixOption,
} from './models/embedded-flow';
export {EmbeddedSignInFlowStatus, EmbeddedSignInFlowType} from './models/embedded-signin-flow';
export type {
  ExtendedEmbeddedSignInFlowResponse,
  EmbeddedSignInFlowResponse,
  EmbeddedSignInFlowCompleteResponse,
  EmbeddedSignInFlowInitiateRequest,
  EmbeddedSignInFlowRequest,
} from './models/embedded-signin-flow';
export {EmbeddedSignUpFlowStatus, EmbeddedSignUpFlowType} from './models/embedded-signup-flow';
export type {
  ExtendedEmbeddedSignUpFlowResponse,
  EmbeddedSignUpFlowResponse,
  EmbeddedSignUpFlowCompleteResponse,
  EmbeddedSignUpFlowInitiateRequest,
  EmbeddedSignUpFlowRequest,
  EmbeddedSignUpFlowErrorResponse,
} from './models/embedded-signup-flow';
export {EmbeddedRecoveryFlowStatus, EmbeddedRecoveryFlowType} from './models/embedded-recovery-flow';
export type {
  EmbeddedRecoveryFlowResponse,
  EmbeddedRecoveryFlowInitiateRequest,
  EmbeddedRecoveryFlowRequest,
  EmbeddedRecoveryFlowErrorResponse,
} from './models/embedded-recovery-flow';
export {FlowMetaType} from './models/flow-meta';
export type {
  ApplicationMetadata,
  OUMetadata,
  DesignMetadata,
  I18nMetadata,
  FlowMetadataResponse,
  GetFlowMetaRequestConfig,
  FlowMetaTheme,
  FlowMetaThemeColorSet,
  FlowMetaThemeBackground,
  FlowMetaThemeTextColors,
  FlowMetaThemeColors,
  FlowMetaThemeColorScheme,
  FlowMetaThemeShape,
  FlowMetaThemeTypography,
} from './models/flow-meta';
export {EmbeddedFlowType, EmbeddedFlowResponseType} from './models/embedded-flow';
export {FlowMode} from './models/flow';
export type {ThunderIDClient} from './models/client';
export type {
  AuthClientConfig,
  StrictAuthClientConfig,
  DefaultAuthClientConfig,
  WellKnownAuthClientConfig,
  BaseURLAuthClientConfig,
  ExplicitAuthClientConfig,
  BaseConfig,
  Config,
  Preferences,
  ThemePreferences,
  I18nPreferences,
  I18nStorageStrategy,
  WithPreferences,
  Extensions,
  WithExtensions,
  SignInOptions,
  SignOutOptions,
  SignUpOptions,
} from './models/config';
export type {TokenEndpointAuthMethod} from './models/token-endpoint-auth';
export type {ComponentRenderContext, ComponentRenderer, ComponentsExtensions} from './models/extensions/components';
export type {TokenResponse, IdToken, TokenExchangeRequestConfig} from './models/token';
export type {AgentConfig} from './models/agent';
export type {ApiError, ApiFetcher, ApiFilteringParams, ApiPaginationLink, ManagementRequestConfig} from './models/api';
export {
  InboundAuthTypes,
  OAuth2GrantTypes,
  OAuth2ResponseTypes,
  REFRESH_TOKEN_ISSUING_GRANTS,
  TokenEndpointAuthMethods,
} from './models/application';
export type {
  AccessTokenConfig,
  AccessTokenSubConfig,
  AndroidAttestationConfig,
  AppleAttestationConfig,
  Application,
  ApplicationListResponse,
  ApplicationType,
  AssertionConfig,
  AttestationConfig,
  BasicApplication,
  CreateApplicationRequest,
  IDJAGConfig,
  IDTokenConfig,
  IDTokenResponseType,
  InboundAuthConfig,
  InboundAuthType,
  OAuth2Config,
  OAuth2GrantType,
  OAuth2ResponseType,
  OAuth2Token,
  RefreshTokenConfig,
  ScopeClaims,
  TokenConfig,
  UpdateApplicationRequest,
  UserInfoConfig,
  UserInfoResponseType,
} from './models/application';
export type {
  CreateManagedUserRequest,
  ManagedUser,
  ManagedUserListResponse,
  UpdateManagedUserRequest,
} from './models/managed-user';
export type {
  Agent,
  AgentInboundAuthConfig,
  AgentListResponse,
  AgentLoginConsentConfig,
  BasicAgent,
  CreateAgentRequest,
  UpdateAgentRequest,
} from './models/agent-resource';
export type {AuthCodeResponse} from './models/auth-code-response';
export type {Crypto, JWKInterface} from './models/crypto';
export type {OAuthResponseMode} from './models/oauth-response';
export type {
  AuthorizeRequestUrlParams,
  KnownExtendedAuthorizeRequestUrlParams,
  ExtendedAuthorizeRequestUrlParams,
} from './models/oauth-request';
export type {OIDCEndpoints} from './models/oidc-endpoints';
export type {OIDCDiscoveryApiResponse} from './models/oidc-discovery';
export type {Storage, TemporaryStore} from './models/store';
export type {User, UserProfile} from './models/user';
export type {SessionData} from './models/session';
export type {TranslationFn} from './models/translation';
export type {ResolveFlowTemplateLiteralsOptions} from './models/vars';
export type {RecursivePartial} from './models/utility-types';
export {FieldType} from './models/field';

export {default as ThunderIDJavaScriptClient} from './ThunderIDJavaScriptClient';

export {default as createTheme, DEFAULT_THEME} from './theme/createTheme';
export type {ThemeColors, ThemeConfig, Theme, ThemeMode, ThemeDetection} from './theme/types';

export {default as AuthenticationHelper} from './utils/AuthenticationHelper';
export {default as arrayBufferToBase64url} from './utils/arrayBufferToBase64url';
export {default as base64urlToArrayBuffer} from './utils/base64urlToArrayBuffer';
export {default as bem} from './utils/bem';
export {default as formatDate} from './utils/formatDate';
export {default as deepMerge} from './utils/deepMerge';
export {default as extractUserClaimsFromIdToken} from './utils/extractUserClaimsFromIdToken';
export {default as isRecognizedBaseUrlPattern} from './utils/isRecognizedBaseUrlPattern';
export {default as extractPkceStorageKeyFromState} from './utils/extractPkceStorageKeyFromState';
export {default as getLatestStateParam} from './utils/getLatestStateParam';
export {default as generateFlattenedUserProfile} from './utils/generateFlattenedUserProfile';
export {default as getRedirectBasedSignUpUrl} from './utils/getRedirectBasedSignUpUrl';
export {default as isEmpty} from './utils/isEmpty';
export {default as isEmojiUri, EMOJI_URI_SCHEME} from './utils/isEmojiUri';
export {default as extractEmojiFromUri} from './utils/extractEmojiFromUri';
export {default as set} from './utils/set';
export {default as get} from './utils/get';
export {default as startCase} from './utils/startCase';
export {
  default as substituteTranslationParams,
  hasUnresolvedTranslationParams,
} from './utils/substituteTranslationParams';
export {default as removeTrailingSlash} from './utils/removeTrailingSlash';
export {default as resolveFieldName} from './utils/resolveFieldName';
export {default as resolveResourceEndpoint} from './utils/resolveResourceEndpoint';
export type {ResourceEndpointKey, ResourceEndpointConfig} from './utils/resolveResourceEndpoint';
export {default as evaluatePasswordPolicy} from './utils/evaluatePasswordPolicy';
export type {PasswordPolicy, PasswordRuleResult} from './utils/evaluatePasswordPolicy';
export {default as evaluateChangePasswordForm} from './utils/evaluateChangePasswordForm';
export type {ChangePasswordFormValues, ChangePasswordFormEvaluation} from './utils/evaluateChangePasswordForm';
export {default as resolveChangeCredentialPolicy} from './utils/resolveChangeCredentialPolicy';
export {default as supportsCredential} from './utils/supportsCredential';
export {default as mapCredentialUpdateError} from './utils/mapCredentialUpdateError';
export type {CredentialUpdateErrorField, CredentialUpdateErrorResult} from './utils/mapCredentialUpdateError';
export {default as resolveMeta} from './utils/resolveMeta';
export {default as resolveFlowTemplateLiterals} from './utils/resolveFlowTemplateLiterals';
export {default as countryCodeToFlagEmoji} from './utils/countryCodeToFlagEmoji';
export {default as resolveLocaleDisplayName} from './utils/resolveLocaleDisplayName';
export {default as resolveLocaleEmoji} from './utils/resolveLocaleEmoji';
export {default as getBaseLanguage} from './utils/getBaseLanguage';
export {default as normalizeLocaleTag} from './utils/normalizeLocaleTag';
export {default as buildValidatorFromRules} from './utils/buildValidatorFromRules';
export {default as evaluateValidationRule, DEFAULT_VALIDATION_MESSAGE_KEYS} from './utils/evaluateValidationRule';
export {default as processOpenIDScopes} from './utils/processOpenIDScopes';
export {default as withVendorCSSClassPrefix} from './utils/withVendorCSSClassPrefix';
export {default as getVendorPrefix} from './utils/getVendorPrefix';

export {
  default as logger,
  createLogger,
  createComponentLogger,
  createPackageLogger,
  createPackageComponentLogger,
  configure as configureLogger,
  debug,
  info,
  warn,
  error,
} from './utils/logger';
export type {LogLevel, LoggerConfig} from './utils/logger';

export {default as StorageManager} from './StorageManager';

export {HttpClient} from './HttpClient';
export type {HttpError, HttpRequestConfig, HttpResponse} from './models/http';

export type {I18nBundle, I18nTranslations} from './i18n/models/i18n';
export {default as TranslationBundleConstants} from './i18n/constants/TranslationBundleConstants';
export {default as getDefaultI18nBundles} from './i18n/utils/getDefaultI18nBundles';
export {default as normalizeTranslations} from './i18n/utils/normalizeTranslations';

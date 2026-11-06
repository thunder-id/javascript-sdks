// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
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
  UpdateProjectRequest,
  AccountLifecycleOptions,
  AccountLifecycleResult,
  AdministrationOptions,
  Agent,
  AgentListResponse,
  AgentRoleListResponse,
  AgentTypeDetails,
  AgentTypeListResponse,
  ApiFetcher,
  ApiFilteringParams,
  Application,
  ApplicationListResponse,
  ApplyGatewayConfigurationRequest,
  CaptureConfigurationVersionRequest,
  CimdPreviewResponse,
  ClientRegistration,
  ClientRegistrationRequest,
  ClientRegistrationUpdateRequest,
  ConfigurationExportRequest,
  ConfigurationExportResponse,
  ConfigurationImportRequest,
  ConfigurationImportResponse,
  ConfigurationVersion,
  Connection,
  ConnectionCategory,
  ConnectionListResponse,
  ConnectionMetaResponse,
  ConnectionRequest,
  ConnectionSummary,
  ConnectionType,
  ConnectionTypeWithUsages,
  ConnectionUsagesResponse,
  CreateActionRequest,
  CreateAgentRequest,
  CreateAgentTypeRequest,
  CreateApplicationRequest,
  CreateGroupRequest,
  CreateManagedUserRequest,
  CreateNotificationTemplateRequest,
  CreateOrganizationUnitRequest,
  CreateResourceRequest,
  CreateResourceServerRequest,
  CreateRoleRequest,
  CreateUserByPathRequest,
  CredentialConfiguration,
  CredentialConfigurationRequest,
  CredentialConfigurationSummary,
  DeleteImportedConfigurationRequest,
  DeleteImportedConfigurationResponse,
  DesignLayout,
  DesignLayoutListResponse,
  DesignLayoutRequest,
  DesignResolveResponse,
  DesignResolveType,
  DesignTheme,
  DesignThemeListResponse,
  DesignThemeRequest,
  Gateway,
  GatewayAppliedConfiguration,
  GatewayAppliedVersion,
  GatewayApplyResult,
  GatewayConfigurationDiff,
  GatewayMaster,
  GatewayRegistration,
  GatewayResourceHistory,
  Group,
  GroupListResponse,
  GroupMember,
  GroupMemberListResponse,
  LanguageListResponse,
  LanguageTranslationsResponse,
  ManagedAction,
  ManagedActionKind,
  ManagedActionListResponse,
  ManagedFlowDefinition,
  ManagedFlowListResponse,
  ManagedFlowRequest,
  ManagedFlowVersion,
  ManagedFlowVersionListResponse,
  ManagedResource,
  ManagedResourceListResponse,
  ManagedTranslation,
  ManagedUser,
  ManagedUserListResponse,
  ManagedUserTypeListResponse,
  ManagementRequestConfig,
  MembershipGroupListResponse,
  NotificationChannel,
  NotificationTemplate,
  NotificationTemplateListResponse,
  OrganizationUnit,
  OrganizationUnitGroupListResponse,
  OrganizationUnitListResponse,
  OrganizationUnitReference,
  OrganizationUnitRoleListResponse,
  OrganizationUnitUserListResponse,
  PresentationDefinition,
  PresentationDefinitionRequest,
  PresentationDefinitionSummary,
  RegenerateClientSecretResult,
  RegenerateFlowSecretResult,
  RegisterGatewayRequest,
  ResolvedOverlay,
  ResourceEndpointKey,
  ResourceServer,
  ResourceServerListResponse,
  ResourceUsagesResponse,
  RevertGatewayConfigurationRequest,
  Role,
  RoleAssigneeType,
  RoleAssignmentInput,
  RoleAssignmentListResponse,
  RoleListResponse,
  Secret,
  SecretListResponse,
  SecretRequest,
  SecretUpdateRequest,
  ServerConfigLayers,
  SetTranslationRequest,
  SetTranslationsRequest,
  SharingPolicy,
  SharingPolicyListResponse,
  SharingPolicyRequest,
  SharingPolicyUpdateRequest,
  UpdateActionRequest,
  UpdateAgentRequest,
  UpdateAgentTypeRequest,
  UpdateApplicationRequest,
  UpdateGatewayRequest,
  UpdateGroupRequest,
  UpdateManagedUserRequest,
  UpdateNotificationTemplateRequest,
  UpdateOrganizationUnitByPathRequest,
  UpdateOrganizationUnitRequest,
  UpdateResourceRequest,
  UpdateResourceServerRequest,
  UpdateRoleRequest,
  Variable,
  VariableListResponse,
  VariableRequest,
  VariableUpdateRequest,
} from '@thunderid/javascript';

/**
 * The management resource collections the server-side management client addresses.
 */
export type ManagementResourceKey = Extract<
  ResourceEndpointKey,
  | 'agents'
  | 'agentTypes'
  | 'applications'
  | 'authorizationDetailTypes'
  | 'clientRegistrations'
  | 'configurationVersions'
  | 'connections'
  | 'credentialConfigurations'
  | 'design'
  | 'export'
  | 'flows'
  | 'gateways'
  | 'groups'
  | 'i18n'
  | 'import'
  | 'notificationTemplates'
  | 'organizationUnits'
  | 'presentationDefinitions'
  | 'projects'
  | 'resourceServers'
  | 'roles'
  | 'secrets'
  | 'serverConfig'
  | 'users'
  | 'userTypes'
  | 'variables'
>;

/**
 * Per-call options accepted by every management operation.
 */
export interface ManagementCallOptions {
  /**
   * Transport for this call. Takes precedence over the SDK's default `fetch`. The SDK still sets the
   * `Authorization` header; a fetcher cannot be used to drop or replace the session's bearer token.
   */
  fetcher?: ApiFetcher;
  /**
   * Aborts the request.
   */
  signal?: AbortSignal;
  /**
   * Explicit collection URL for this call. Takes precedence over a `config.endpoints` override, which
   * takes precedence over `{baseUrl}/{collection}`. A single resource is addressed as this URL followed
   * by its identifier.
   */
  url?: string;
}

/**
 * Options for a paginated list.
 */
export type ManagementListOptions = ManagementCallOptions & Pick<ApiFilteringParams, 'limit' | 'offset'>;

/**
 * Options for a paginated, filterable listing of variables or secrets.
 */
export type ManagementValueListOptions = ManagementCallOptions & ApiFilteringParams & {names?: string[]};

/**
 * Options of an account lifecycle operation, such as suspending a user.
 */
export type ManagementLifecycleOptions = ManagementCallOptions & AccountLifecycleOptions;

/**
 * Options of an operation on an action, which belongs to a resource server or, when `resourceId` is given,
 * to one of its resources.
 */
export type ManagementActionOptions = ManagementCallOptions & {resourceId?: string};

/**
 * Member reference accepted when adding or removing group members.
 */
export type ManagementGroupMemberInput = Pick<GroupMember, 'id' | 'type'>;

/**
 * Resolves the URL inputs and bearer token for one management request. Implemented by
 * `ThunderIDNodeClient`, which reads the access token of the bound session on every call.
 *
 * @param key - The resource collection the request targets.
 * @param explicitUrl - A collection URL passed to the call, if any.
 */
export type ManagementRequestConfigResolver = (
  key: ManagementResourceKey,
  explicitUrl?: string,
) => Promise<Pick<ManagementRequestConfig, 'baseUrl' | 'url'> & {headers: {Authorization: string}}>;

/**
 * Server-side management operations bound to one session. Every request is authorized with that
 * session's access token, read at the time of the call, so the token is never copied, cached, or
 * exposed to the caller.
 *
 * Resources returned here are server records (`ManagedUser`, `Group`, `Role`, `Agent`), never the
 * signed-in user. Failures are raised as `ThunderIDAPIError`, with HTTP 403 and 404 carrying the
 * `<operation>-ForbiddenError-001` and `<operation>-NotFoundError-001` codes.
 */
export interface ThunderIDNodeManagementClient {
  agentTypes: {
    create(payload: CreateAgentTypeRequest, options?: ManagementCallOptions): Promise<AgentTypeDetails>;
    delete(agentTypeId: string, options?: ManagementCallOptions): Promise<void>;
    get(agentTypeId: string, options?: ManagementCallOptions): Promise<AgentTypeDetails>;
    list(options?: ManagementListOptions): Promise<AgentTypeListResponse>;
    update(
      agentTypeId: string,
      payload: UpdateAgentTypeRequest,
      options?: ManagementCallOptions,
    ): Promise<AgentTypeDetails>;
  };
  agents: {
    create(payload: CreateAgentRequest, options?: ManagementCallOptions): Promise<Agent>;
    delete(agentId: string, options?: ManagementCallOptions): Promise<void>;
    get(agentId: string, options?: ManagementCallOptions): Promise<Agent>;
    list(options?: ManagementCallOptions & ApiFilteringParams): Promise<AgentListResponse>;
    listGroups(agentId: string, options?: ManagementListOptions): Promise<MembershipGroupListResponse>;
    listRoles(agentId: string, options?: ManagementListOptions): Promise<AgentRoleListResponse>;
    suspend(agentId: string, options?: ManagementLifecycleOptions): Promise<AccountLifecycleResult>;
    unlock(agentId: string, options?: ManagementLifecycleOptions): Promise<AccountLifecycleResult>;
    unsuspend(agentId: string, options?: ManagementLifecycleOptions): Promise<AccountLifecycleResult>;
    update(agentId: string, payload: UpdateAgentRequest, options?: ManagementCallOptions): Promise<Agent>;
  };
  applications: {
    create(payload: CreateApplicationRequest, options?: ManagementCallOptions): Promise<Application>;
    createSharingPolicy(
      applicationId: string,
      payload: SharingPolicyRequest,
      options?: ManagementCallOptions,
    ): Promise<SharingPolicy>;
    /**
     * Deletes the application, through the server's deletion flow when `administrationMode` is `flow`.
     */
    delete(applicationId: string, options?: ManagementCallOptions & AdministrationOptions): Promise<void>;
    deleteSharingPolicy(applicationId: string, policyId: string, options?: ManagementCallOptions): Promise<void>;
    get(applicationId: string, options?: ManagementCallOptions): Promise<Application>;
    getOverlayRules(applicationId: string, ouId: string, options?: ManagementCallOptions): Promise<ResolvedOverlay>;
    getSharingPolicy(applicationId: string, policyId: string, options?: ManagementCallOptions): Promise<SharingPolicy>;
    list(options?: ManagementListOptions): Promise<ApplicationListResponse>;
    listSharingPolicies(applicationId: string, options?: ManagementListOptions): Promise<SharingPolicyListResponse>;
    /**
     * Reads a client ID metadata document through the server. The preview is an endpoint of its own
     * under `baseUrl`, so a collection `url` passed to the call does not apply.
     */
    previewCimdDocument(clientId: string, options?: ManagementCallOptions): Promise<CimdPreviewResponse>;
    /**
     * Issues a new client secret. The secret is returned once and cannot be read again.
     */
    regenerateClientSecret(
      applicationId: string,
      options?: ManagementCallOptions & AdministrationOptions,
    ): Promise<RegenerateClientSecretResult>;
    /**
     * Issues a new flow secret. The secret is returned once and cannot be read again.
     */
    regenerateFlowSecret(applicationId: string, options?: ManagementCallOptions): Promise<RegenerateFlowSecretResult>;
    suspend(applicationId: string, options?: ManagementLifecycleOptions): Promise<AccountLifecycleResult>;
    unsuspend(applicationId: string, options?: ManagementLifecycleOptions): Promise<AccountLifecycleResult>;
    update(
      applicationId: string,
      payload: UpdateApplicationRequest,
      options?: ManagementCallOptions,
    ): Promise<Application>;
    updateSharingPolicy(
      applicationId: string,
      policyId: string,
      payload: SharingPolicyUpdateRequest,
      options?: ManagementCallOptions,
    ): Promise<SharingPolicy>;
  };
  /**
   * Dynamic client registration (RFC 7591 and RFC 7592). Errors the endpoint returns in the OAuth 2.0
   * form carry its `error` as `serverError.code`.
   */
  /**
   * RFC 9396 authorization details types. A type declared in configuration is read-only.
   */
  authorizationDetailTypes: {
    create(payload: AuthorizationDetailTypeRequest, options?: ManagementCallOptions): Promise<AuthorizationDetailType>;
    delete(authorizationDetailTypeId: string, options?: ManagementCallOptions): Promise<void>;
    get(authorizationDetailTypeId: string, options?: ManagementCallOptions): Promise<AuthorizationDetailType>;
    list(options?: ManagementListOptions): Promise<AuthorizationDetailTypeListResponse>;
    update(
      authorizationDetailTypeId: string,
      payload: AuthorizationDetailTypeRequest,
      options?: ManagementCallOptions,
    ): Promise<AuthorizationDetailType>;
  };
  clientRegistrations: {
    delete(clientId: string, options?: ManagementCallOptions): Promise<void>;
    /**
     * Reads a registration. The client secret is not returned.
     */
    get(clientId: string, options?: ManagementCallOptions): Promise<ClientRegistration>;
    /**
     * Registers a client. The result carries the client secret, which is returned only here and cannot
     * be read again.
     */
    register(payload: ClientRegistrationRequest, options?: ManagementCallOptions): Promise<ClientRegistration>;
    /**
     * Replaces a client's registered metadata in full. The request's `client_id` is set from `clientId`.
     */
    update(
      clientId: string,
      payload: ClientRegistrationUpdateRequest,
      options?: ManagementCallOptions,
    ): Promise<ClientRegistration>;
  };
  /**
   * Captured configuration versions, and the import and export of declarative resources.
   */
  configuration: {
    captureVersion(
      payload?: CaptureConfigurationVersionRequest,
      options?: ManagementCallOptions,
    ): Promise<ConfigurationVersion>;
    deleteImported(
      payload: DeleteImportedConfigurationRequest,
      options?: ManagementCallOptions,
    ): Promise<DeleteImportedConfigurationResponse>;
    export(payload: ConfigurationExportRequest, options?: ManagementCallOptions): Promise<ConfigurationExportResponse>;
    getVersion(version: string, options?: ManagementCallOptions): Promise<ConfigurationVersion>;
    import(payload: ConfigurationImportRequest, options?: ManagementCallOptions): Promise<ConfigurationImportResponse>;
    listVersions(options?: ManagementCallOptions): Promise<ConfigurationVersion[]>;
  };
  connections: {
    create(type: ConnectionType, payload: ConnectionRequest, options?: ManagementCallOptions): Promise<Connection>;
    delete(type: ConnectionType, connectionId: string, options?: ManagementCallOptions): Promise<void>;
    get(type: ConnectionType, connectionId: string, options?: ManagementCallOptions): Promise<Connection>;
    getMeta(options?: ManagementCallOptions & {vendor?: ConnectionType}): Promise<ConnectionMetaResponse>;
    /**
     * A page of connections across every type.
     */
    list(options?: ManagementListOptions & {category?: ConnectionCategory}): Promise<ConnectionListResponse>;
    /**
     * Every connection of one type.
     */
    listByType(type: ConnectionType, options?: ManagementCallOptions): Promise<ConnectionSummary[]>;
    listUsages(
      type: ConnectionTypeWithUsages,
      connectionId: string,
      options?: ManagementCallOptions,
    ): Promise<ConnectionUsagesResponse>;
    update(
      type: ConnectionType,
      connectionId: string,
      payload: ConnectionRequest,
      options?: ManagementCallOptions,
    ): Promise<Connection>;
  };
  /**
   * OpenID4VCI credential configurations.
   */
  credentialConfigurations: {
    create(payload: CredentialConfigurationRequest, options?: ManagementCallOptions): Promise<CredentialConfiguration>;
    delete(configurationId: string, options?: ManagementCallOptions): Promise<void>;
    get(configurationId: string, options?: ManagementCallOptions): Promise<CredentialConfiguration>;
    list(options?: ManagementCallOptions): Promise<CredentialConfigurationSummary[]>;
    update(
      configurationId: string,
      payload: CredentialConfigurationRequest,
      options?: ManagementCallOptions,
    ): Promise<CredentialConfiguration>;
  };
  design: {
    createLayout(payload: DesignLayoutRequest, options?: ManagementCallOptions): Promise<DesignLayout>;
    createTheme(payload: DesignThemeRequest, options?: ManagementCallOptions): Promise<DesignTheme>;
    deleteLayout(layoutId: string, options?: ManagementCallOptions): Promise<void>;
    deleteTheme(themeId: string, options?: ManagementCallOptions): Promise<void>;
    getLayout(layoutId: string, options?: ManagementCallOptions): Promise<DesignLayout>;
    getTheme(themeId: string, options?: ManagementCallOptions): Promise<DesignTheme>;
    listLayoutUsages(layoutId: string, options?: ManagementListOptions): Promise<ResourceUsagesResponse>;
    listLayouts(options?: ManagementListOptions): Promise<DesignLayoutListResponse>;
    listThemeUsages(themeId: string, options?: ManagementListOptions): Promise<ResourceUsagesResponse>;
    listThemes(options?: ManagementListOptions): Promise<DesignThemeListResponse>;
    resolve(type: DesignResolveType, id: string, options?: ManagementCallOptions): Promise<DesignResolveResponse>;
    updateLayout(
      layoutId: string,
      payload: DesignLayoutRequest,
      options?: ManagementCallOptions,
    ): Promise<DesignLayout>;
    updateTheme(themeId: string, payload: DesignThemeRequest, options?: ManagementCallOptions): Promise<DesignTheme>;
  };
  flows: {
    create(payload: ManagedFlowRequest, options?: ManagementCallOptions): Promise<ManagedFlowDefinition>;
    delete(flowId: string, options?: ManagementCallOptions): Promise<void>;
    get(flowId: string, options?: ManagementCallOptions): Promise<ManagedFlowDefinition>;
    getVersion(flowId: string, version: number, options?: ManagementCallOptions): Promise<ManagedFlowVersion>;
    list(options?: ManagementListOptions & {flowType?: string}): Promise<ManagedFlowListResponse>;
    listUsages(flowId: string, options?: ManagementCallOptions): Promise<ResourceUsagesResponse>;
    listVersions(flowId: string, options?: ManagementCallOptions): Promise<ManagedFlowVersionListResponse>;
    restoreVersion(flowId: string, version: number, options?: ManagementCallOptions): Promise<ManagedFlowDefinition>;
    update(
      flowId: string,
      payload: ManagedFlowRequest,
      options?: ManagementCallOptions,
    ): Promise<ManagedFlowDefinition>;
    createSharingPolicy(
      flowId: string,
      payload: SharingPolicyRequest,
      options?: ManagementCallOptions,
    ): Promise<SharingPolicy>;
    deleteSharingPolicy(flowId: string, policyId: string, options?: ManagementCallOptions): Promise<void>;
    getOverlayRules(flowId: string, ouId: string, options?: ManagementCallOptions): Promise<FlowResolvedOverlay>;
    getSharingPolicy(flowId: string, policyId: string, options?: ManagementCallOptions): Promise<SharingPolicy>;
    listSharingPolicies(flowId: string, options?: ManagementListOptions): Promise<SharingPolicyListResponse>;
    updateSharingPolicy(
      flowId: string,
      policyId: string,
      payload: SharingPolicyUpdateRequest,
      options?: ManagementCallOptions,
    ): Promise<SharingPolicy>;
    /**
     * The values an organization unit has set for the flow's variables.
     */
    getVariables(flowId: string, ouId: string, options?: ManagementCallOptions): Promise<FlowVariables>;
    /**
     * Replaces the values an organization unit holds for the flow's variables. A variable left out
     * returns to its default.
     */
    updateVariables(
      flowId: string,
      ouId: string,
      variables: Record<string, FlowVariableValue>,
      options?: ManagementCallOptions,
    ): Promise<FlowVariables>;
  };
  gateways: {
    applyConfiguration(
      gatewayId: string,
      payload?: ApplyGatewayConfigurationRequest,
      options?: ManagementCallOptions,
    ): Promise<GatewayApplyResult>;
    create(payload: RegisterGatewayRequest, options?: ManagementCallOptions): Promise<GatewayRegistration>;
    createSecret(gatewayId: string, payload: SecretRequest, options?: ManagementCallOptions): Promise<Secret>;
    createVariable(gatewayId: string, payload: VariableRequest, options?: ManagementCallOptions): Promise<Variable>;
    delete(gatewayId: string, options?: ManagementCallOptions): Promise<void>;
    deleteSecret(gatewayId: string, name: string, options?: ManagementCallOptions): Promise<void>;
    deleteVariable(gatewayId: string, name: string, options?: ManagementCallOptions): Promise<void>;
    get(gatewayId: string, options?: ManagementCallOptions): Promise<Gateway>;
    getAppliedConfiguration(gatewayId: string, options?: ManagementCallOptions): Promise<GatewayAppliedConfiguration>;
    getAppliedVersion(gatewayId: string, options?: ManagementCallOptions): Promise<GatewayAppliedVersion>;
    getConfigurationDiff(
      gatewayId: string,
      options?: ManagementCallOptions & {version?: string},
    ): Promise<GatewayConfigurationDiff>;
    /**
     * What the gateway holds, resource by resource.
     */
    getMaster(gatewayId: string, options?: ManagementCallOptions): Promise<GatewayMaster>;
    /**
     * The gateway's kept masters, newest first, without their entries or resources.
     */
    getMasterHistory(gatewayId: string, options?: ManagementCallOptions): Promise<GatewayMaster[]>;
    /**
     * One resource's entry in each kept master that records it, newest first.
     */
    getMasterResource(
      gatewayId: string,
      resourceType: string,
      resourceId: string,
      options?: ManagementCallOptions,
    ): Promise<GatewayResourceHistory>;
    getSecret(gatewayId: string, name: string, options?: ManagementCallOptions): Promise<Secret>;
    getVariable(gatewayId: string, name: string, options?: ManagementCallOptions): Promise<Variable>;
    list(options?: ManagementCallOptions): Promise<Gateway[]>;
    listSecrets(gatewayId: string, options?: ManagementValueListOptions): Promise<SecretListResponse>;
    listVariables(gatewayId: string, options?: ManagementValueListOptions): Promise<VariableListResponse>;
    revertConfiguration(
      gatewayId: string,
      payload?: RevertGatewayConfigurationRequest,
      options?: ManagementCallOptions,
    ): Promise<GatewayApplyResult>;
    update(gatewayId: string, payload: UpdateGatewayRequest, options?: ManagementCallOptions): Promise<Gateway>;
    updateSecret(
      gatewayId: string,
      name: string,
      payload: SecretUpdateRequest,
      options?: ManagementCallOptions,
    ): Promise<Secret>;
    updateVariable(
      gatewayId: string,
      name: string,
      payload: VariableUpdateRequest,
      options?: ManagementCallOptions,
    ): Promise<Variable>;
  };
  groups: {
    addMembers(groupId: string, members: ManagementGroupMemberInput[], options?: ManagementCallOptions): Promise<Group>;
    create(payload: CreateGroupRequest, options?: ManagementCallOptions): Promise<Group>;
    createByPath(path: string, payload: CreateGroupByPathRequest, options?: ManagementCallOptions): Promise<Group>;
    delete(groupId: string, options?: ManagementCallOptions): Promise<void>;
    get(groupId: string, options?: ManagementCallOptions): Promise<Group>;
    list(options?: ManagementListOptions): Promise<GroupListResponse>;
    listByPath(path: string, options?: ManagementListOptions): Promise<GroupListResponse>;
    listMembers(groupId: string, options?: ManagementListOptions): Promise<GroupMemberListResponse>;
    removeMembers(
      groupId: string,
      members: ManagementGroupMemberInput[],
      options?: ManagementCallOptions,
    ): Promise<Group>;
    update(groupId: string, payload: UpdateGroupRequest, options?: ManagementCallOptions): Promise<Group>;
  };
  i18n: {
    deleteTranslation(language: string, namespace: string, key: string, options?: ManagementCallOptions): Promise<void>;
    deleteTranslations(language: string, options?: ManagementCallOptions): Promise<void>;
    listLanguages(options?: ManagementCallOptions): Promise<LanguageListResponse>;
    resolveTranslation(
      language: string,
      namespace: string,
      key: string,
      options?: ManagementCallOptions,
    ): Promise<ManagedTranslation>;
    resolveTranslations(
      language: string,
      options?: ManagementCallOptions & {namespace?: string},
    ): Promise<LanguageTranslationsResponse>;
    setTranslation(
      language: string,
      namespace: string,
      key: string,
      payload: SetTranslationRequest,
      options?: ManagementCallOptions,
    ): Promise<ManagedTranslation>;
    setTranslations(
      language: string,
      payload: SetTranslationsRequest,
      options?: ManagementCallOptions,
    ): Promise<LanguageTranslationsResponse>;
  };
  notificationTemplates: {
    create(
      channel: NotificationChannel,
      payload: CreateNotificationTemplateRequest,
      options?: ManagementCallOptions,
    ): Promise<NotificationTemplate>;
    delete(channel: NotificationChannel, templateId: string, options?: ManagementCallOptions): Promise<void>;
    get(
      channel: NotificationChannel,
      templateId: string,
      options?: ManagementCallOptions,
    ): Promise<NotificationTemplate>;
    list(channel: NotificationChannel, options?: ManagementListOptions): Promise<NotificationTemplateListResponse>;
    update(
      channel: NotificationChannel,
      templateId: string,
      payload: UpdateNotificationTemplateRequest,
      options?: ManagementCallOptions,
    ): Promise<NotificationTemplate>;
  };
  /**
   * Organization units. A unit is addressed by its identifier, or by its handle path (`engineering/platform`)
   * through the `ByPath` operations and an {@link OrganizationUnitReference}.
   */
  organizationUnits: {
    create(payload: CreateOrganizationUnitRequest, options?: ManagementCallOptions): Promise<OrganizationUnit>;
    delete(ouId: string, options?: ManagementCallOptions): Promise<void>;
    deleteByPath(path: string, options?: ManagementCallOptions): Promise<void>;
    get(ouId: string, options?: ManagementCallOptions): Promise<OrganizationUnit>;
    getByPath(path: string, options?: ManagementCallOptions): Promise<OrganizationUnit>;
    list(options?: ManagementCallOptions & ApiFilteringParams): Promise<OrganizationUnitListResponse>;
    listChildren(
      unit: OrganizationUnitReference,
      options?: ManagementCallOptions & ApiFilteringParams,
    ): Promise<OrganizationUnitListResponse>;
    listGroups(
      unit: OrganizationUnitReference,
      options?: ManagementListOptions,
    ): Promise<OrganizationUnitGroupListResponse>;
    listRoles(
      unit: OrganizationUnitReference,
      options?: ManagementListOptions,
    ): Promise<OrganizationUnitRoleListResponse>;
    listUsers(
      unit: OrganizationUnitReference,
      options?: ManagementListOptions,
    ): Promise<OrganizationUnitUserListResponse>;
    update(
      ouId: string,
      payload: UpdateOrganizationUnitRequest,
      options?: ManagementCallOptions,
    ): Promise<OrganizationUnit>;
    updateByPath(
      path: string,
      payload: UpdateOrganizationUnitByPathRequest,
      options?: ManagementCallOptions,
    ): Promise<OrganizationUnit>;
  };
  /**
   * OpenID4VP presentation definitions.
   */
  presentationDefinitions: {
    create(payload: PresentationDefinitionRequest, options?: ManagementCallOptions): Promise<PresentationDefinition>;
    delete(definitionId: string, options?: ManagementCallOptions): Promise<void>;
    get(definitionId: string, options?: ManagementCallOptions): Promise<PresentationDefinition>;
    list(options?: ManagementCallOptions): Promise<PresentationDefinitionSummary[]>;
    update(
      definitionId: string,
      payload: PresentationDefinitionRequest,
      options?: ManagementCallOptions,
    ): Promise<PresentationDefinition>;
  };
  projects: {
    create(payload: CreateProjectRequest, options?: ManagementCallOptions): Promise<Project>;
    delete(projectId: string, options?: ManagementCallOptions): Promise<void>;
    get(projectId: string, options?: ManagementCallOptions): Promise<Project>;
    list(options?: ManagementListOptions): Promise<ProjectListResponse>;
    update(projectId: string, payload: UpdateProjectRequest, options?: ManagementCallOptions): Promise<Project>;
  };
  /**
   * Resource servers, their resources, and the actions on either.
   */
  resourceServers: {
    create(payload: CreateResourceServerRequest, options?: ManagementCallOptions): Promise<ResourceServer>;
    createAction(
      resourceServerId: string,
      payload: CreateActionRequest,
      options?: ManagementActionOptions,
    ): Promise<ManagedAction>;
    createResource(
      resourceServerId: string,
      payload: CreateResourceRequest,
      options?: ManagementCallOptions,
    ): Promise<ManagedResource>;
    delete(resourceServerId: string, options?: ManagementCallOptions): Promise<void>;
    deleteAction(
      resourceServerId: string,
      actionId: string,
      options?: ManagementActionOptions & AdministrationOptions,
    ): Promise<void>;
    deleteResource(resourceServerId: string, resourceId: string, options?: ManagementCallOptions): Promise<void>;
    get(resourceServerId: string, options?: ManagementCallOptions): Promise<ResourceServer>;
    getAction(resourceServerId: string, actionId: string, options?: ManagementActionOptions): Promise<ManagedAction>;
    getResource(
      resourceServerId: string,
      resourceId: string,
      options?: ManagementCallOptions,
    ): Promise<ManagedResource>;
    list(options?: ManagementListOptions): Promise<ResourceServerListResponse>;
    listActions(
      resourceServerId: string,
      options?: ManagementListOptions & {kind?: ManagedActionKind; resourceId?: string},
    ): Promise<ManagedActionListResponse>;
    listResources(
      resourceServerId: string,
      options?: ManagementListOptions & {parentId?: string},
    ): Promise<ManagedResourceListResponse>;
    update(
      resourceServerId: string,
      payload: UpdateResourceServerRequest,
      options?: ManagementCallOptions,
    ): Promise<ResourceServer>;
    updateAction(
      resourceServerId: string,
      actionId: string,
      payload: UpdateActionRequest,
      options?: ManagementActionOptions,
    ): Promise<ManagedAction>;
    updateResource(
      resourceServerId: string,
      resourceId: string,
      payload: UpdateResourceRequest,
      options?: ManagementCallOptions,
    ): Promise<ManagedResource>;
  };
  roles: {
    addAssignments(roleId: string, assignments: RoleAssignmentInput[], options?: ManagementCallOptions): Promise<void>;
    create(payload: CreateRoleRequest, options?: ManagementCallOptions): Promise<Role>;
    delete(roleId: string, options?: ManagementCallOptions): Promise<void>;
    get(roleId: string, options?: ManagementCallOptions): Promise<Role>;
    list(options?: ManagementListOptions): Promise<RoleListResponse>;
    listAssignments(
      roleId: string,
      options?: ManagementListOptions & {type?: RoleAssigneeType},
    ): Promise<RoleAssignmentListResponse>;
    removeAssignments(
      roleId: string,
      assignments: RoleAssignmentInput[],
      options?: ManagementCallOptions,
    ): Promise<void>;
    update(roleId: string, payload: UpdateRoleRequest, options?: ManagementCallOptions): Promise<Role>;
    createSharingPolicy(
      roleId: string,
      payload: SharingPolicyRequest,
      options?: ManagementCallOptions,
    ): Promise<SharingPolicy>;
    deleteSharingPolicy(roleId: string, policyId: string, options?: ManagementCallOptions): Promise<void>;
    getOverlayRules(roleId: string, ouId: string, options?: ManagementCallOptions): Promise<RoleResolvedOverlay>;
    getSharingPolicy(roleId: string, policyId: string, options?: ManagementCallOptions): Promise<SharingPolicy>;
    listSharingPolicies(roleId: string, options?: ManagementListOptions): Promise<SharingPolicyListResponse>;
    updateSharingPolicy(
      roleId: string,
      policyId: string,
      payload: SharingPolicyUpdateRequest,
      options?: ManagementCallOptions,
    ): Promise<SharingPolicy>;
  };
  /**
   * Server-level secrets. A secret's value is write-only: it is never returned, and never logged.
   */
  secrets: {
    create(payload: SecretRequest, options?: ManagementCallOptions): Promise<Secret>;
    delete(name: string, options?: ManagementCallOptions): Promise<void>;
    get(name: string, options?: ManagementCallOptions): Promise<Secret>;
    list(options?: ManagementValueListOptions): Promise<SecretListResponse>;
    update(name: string, payload: SecretUpdateRequest, options?: ManagementCallOptions): Promise<Secret>;
  };
  serverConfig: {
    get<T = unknown>(name: string, options?: ManagementCallOptions): Promise<ServerConfigLayers<T>>;
    list(options?: ManagementCallOptions): Promise<string[]>;
    update<T = unknown>(name: string, payload: T, options?: ManagementCallOptions): Promise<ServerConfigLayers<T>>;
  };
  userTypes: {
    list(options?: ManagementListOptions): Promise<ManagedUserTypeListResponse>;
  };
  users: {
    create(payload: CreateManagedUserRequest, options?: ManagementCallOptions): Promise<ManagedUser>;
    createByPath(path: string, payload: CreateUserByPathRequest, options?: ManagementCallOptions): Promise<ManagedUser>;
    createSharingPolicy(
      userId: string,
      payload: SharingPolicyRequest,
      options?: ManagementCallOptions,
    ): Promise<SharingPolicy>;
    delete(userId: string, options?: ManagementCallOptions): Promise<void>;
    deleteSharingPolicy(userId: string, policyId: string, options?: ManagementCallOptions): Promise<void>;
    get(userId: string, options?: ManagementCallOptions): Promise<ManagedUser>;
    getOverlayRules(userId: string, ouId: string, options?: ManagementCallOptions): Promise<ResolvedOverlay>;
    getSharingPolicy(userId: string, policyId: string, options?: ManagementCallOptions): Promise<SharingPolicy>;
    list(options?: ManagementCallOptions & ApiFilteringParams): Promise<ManagedUserListResponse>;
    listByPath(path: string, options?: ManagementListOptions): Promise<ManagedUserListResponse>;
    listGroups(userId: string, options?: ManagementListOptions): Promise<MembershipGroupListResponse>;
    listSharingPolicies(userId: string, options?: ManagementListOptions): Promise<SharingPolicyListResponse>;
    suspend(userId: string, options?: ManagementLifecycleOptions): Promise<AccountLifecycleResult>;
    unlock(userId: string, options?: ManagementLifecycleOptions): Promise<AccountLifecycleResult>;
    unsuspend(userId: string, options?: ManagementLifecycleOptions): Promise<AccountLifecycleResult>;
    update(userId: string, payload: UpdateManagedUserRequest, options?: ManagementCallOptions): Promise<ManagedUser>;
    updateSharingPolicy(
      userId: string,
      policyId: string,
      payload: SharingPolicyUpdateRequest,
      options?: ManagementCallOptions,
    ): Promise<SharingPolicy>;
  };
  /**
   * Server-level variables.
   */
  variables: {
    create(payload: VariableRequest, options?: ManagementCallOptions): Promise<Variable>;
    delete(name: string, options?: ManagementCallOptions): Promise<void>;
    get(name: string, options?: ManagementCallOptions): Promise<Variable>;
    list(options?: ManagementValueListOptions): Promise<VariableListResponse>;
    update(name: string, payload: VariableUpdateRequest, options?: ManagementCallOptions): Promise<Variable>;
  };
}

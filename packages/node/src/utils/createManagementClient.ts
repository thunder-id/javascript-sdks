// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  createAuthorizationDetailType,
  createFlowSharingPolicy,
  createGroupByPath,
  createProject,
  createRoleSharingPolicy,
  deleteAuthorizationDetailType,
  deleteFlowSharingPolicy,
  deleteProject,
  deleteRoleSharingPolicy,
  getAuthorizationDetailType,
  getAuthorizationDetailTypes,
  getFlowOverlayRules,
  getFlowSharingPolicies,
  getFlowSharingPolicy,
  getFlowVariables,
  getGroupsByPath,
  getProject,
  getProjects,
  getRoleOverlayRules,
  getRoleSharingPolicies,
  getRoleSharingPolicy,
  updateAuthorizationDetailType,
  updateFlowSharingPolicy,
  updateFlowVariables,
  updateProject,
  updateRoleSharingPolicy,
  addGroupMembers,
  addRoleAssignments,
  applyGatewayConfiguration,
  createAction,
  createAgent,
  createAgentType,
  createApplication,
  createApplicationSharingPolicy,
  createConfigurationVersion,
  createConnection,
  createDesignTheme,
  createFlow,
  createGateway,
  createGatewaySecret,
  createGatewayVariable,
  createGroup,
  createLayout,
  createNotificationTemplate,
  createOrganizationUnit,
  createResource,
  createResourceServer,
  createRole,
  createSecret,
  createUser,
  createUserByPath,
  createUserSharingPolicy,
  createVariable,
  deleteAction,
  deleteAgent,
  deleteAgentType,
  deleteApplication,
  deleteApplicationSharingPolicy,
  deleteConnection,
  deleteDesignTheme,
  deleteFlow,
  deleteGateway,
  deleteGatewaySecret,
  deleteGatewayVariable,
  deleteGroup,
  deleteImportedConfiguration,
  deleteLayout,
  deleteNotificationTemplate,
  deleteOrganizationUnit,
  deleteOrganizationUnitByPath,
  deleteResource,
  deleteResourceServer,
  deleteRole,
  deleteSecret,
  deleteTranslation,
  deleteTranslations,
  deleteUser,
  deleteUserSharingPolicy,
  deleteVariable,
  exportConfiguration,
  getAction,
  getActions,
  getAgent,
  getAgentGroups,
  getAgentRoles,
  getAgents,
  getAgentType,
  getAgentTypes,
  getApplication,
  getApplicationOverlayRules,
  getApplications,
  getApplicationSharingPolicies,
  getApplicationSharingPolicy,
  getConfigurationVersion,
  getConfigurationVersions,
  getConnection,
  getConnections,
  getConnectionsMeta,
  getConnectionUsages,
  getDesignTheme,
  getDesignThemes,
  getDesignThemeUsages,
  getFlow,
  getFlows,
  getFlowUsages,
  getFlowVersion,
  getFlowVersions,
  getGateway,
  getGatewayAppliedConfiguration,
  getGatewayAppliedVersion,
  getGatewayConfigurationDiff,
  getGateways,
  getGatewaySecret,
  getGatewaySecrets,
  getGatewayVariable,
  getGatewayVariables,
  getGroup,
  getGroupMembers,
  getGroups,
  getLanguages,
  getLayout,
  getLayouts,
  getLayoutUsages,
  getNotificationTemplate,
  getNotificationTemplates,
  getOrganizationUnit,
  getOrganizationUnitByPath,
  getOrganizationUnitChildren,
  getOrganizationUnitGroups,
  getOrganizationUnitRoles,
  getOrganizationUnits,
  getOrganizationUnitUsers,
  getResource,
  getResources,
  getResourceServer,
  getResourceServers,
  getRole,
  getRoleAssignments,
  getRoles,
  getSecret,
  getSecrets,
  getServerConfig,
  getServerConfigs,
  getUser,
  getUserGroups,
  getUserOverlayRules,
  getUsers,
  getUsersByPath,
  getUserSharingPolicies,
  getUserSharingPolicy,
  getUserTypes,
  getVariable,
  getVariables,
  importConfiguration,
  ManagementRequestConfig,
  previewCimdDocument,
  regenerateClientSecret,
  regenerateFlowSecret,
  removeGroupMembers,
  removeRoleAssignments,
  resolveDesign,
  resolveTranslation,
  resolveTranslations,
  restoreFlowVersion,
  revertGatewayConfiguration,
  setTranslation,
  setTranslations,
  suspendAgent,
  suspendApplication,
  suspendUser,
  ThunderIDAPIError,
  unlockAgent,
  unlockUser,
  unsuspendAgent,
  unsuspendApplication,
  unsuspendUser,
  updateAction,
  updateAgent,
  updateAgentType,
  updateApplication,
  updateApplicationSharingPolicy,
  updateConnection,
  updateDesignTheme,
  updateFlow,
  updateGateway,
  updateGatewaySecret,
  updateGatewayVariable,
  updateGroup,
  updateLayout,
  updateNotificationTemplate,
  updateOrganizationUnit,
  updateOrganizationUnitByPath,
  updateResource,
  updateResourceServer,
  updateRole,
  updateSecret,
  updateServerConfig,
  updateUser,
  updateUserSharingPolicy,
  updateVariable,
  createCredentialConfiguration,
  createPresentationDefinition,
  deleteClientRegistration,
  deleteCredentialConfiguration,
  deletePresentationDefinition,
  getClientRegistration,
  getCredentialConfiguration,
  getCredentialConfigurations,
  getGatewayMaster,
  getGatewayMasterHistory,
  getGatewayMasterResource,
  getPresentationDefinition,
  getPresentationDefinitions,
  registerClient,
  updateClientRegistration,
  updateCredentialConfiguration,
  updatePresentationDefinition,
} from '@thunderid/javascript';
import {
  ManagementCallOptions,
  ManagementRequestConfigResolver,
  ManagementResourceKey,
  ThunderIDNodeManagementClient,
} from '../models/management';

/**
 * Rejects a missing or blank resource identifier before any request is made. The core API functions
 * reject a blank string, but an `undefined` identifier would otherwise address the whole collection,
 * which for a delete or update is never what the caller meant. Uses the same code the core raises.
 */
const requireId = <T>(id: T, operation: string): T => {
  if (typeof id !== 'string' || id.trim() === '') {
    throw new ThunderIDAPIError(
      'A resource identifier is required.',
      `${operation}-ValidationError-002`,
      'node',
      400,
      'The provided resource identifier is empty.',
    );
  }

  return id;
};

/**
 * Builds the server-side management client for one session.
 *
 * Each operation resolves its request config through `resolve` at call time, so the access token is
 * read fresh for every request and never held by the returned object.
 *
 * @param resolve - Supplies the base URL, collection URL, and `Authorization` header for a request.
 * @returns The session-bound management operations.
 */
const createManagementClient = (resolve: ManagementRequestConfigResolver): ThunderIDNodeManagementClient => {
  // The resolved config is spread last, so a caller-supplied option can never replace the
  // `Authorization` header or the resolved URL.
  const config = async (
    key: ManagementResourceKey,
    {fetcher, signal, url}: ManagementCallOptions = {},
  ): Promise<ManagementRequestConfig> => ({
    ...(fetcher ? {fetcher} : {}),
    ...(signal ? {signal} : {}),
    ...(await resolve(key, url)),
  });

  return {
    agentTypes: {
      create: async (payload, options) => createAgentType({payload, ...(await config('agentTypes', options))}),
      delete: async (agentTypeId, options) =>
        deleteAgentType({
          agentTypeId: requireId(agentTypeId, 'deleteAgentType'),
          ...(await config('agentTypes', options)),
        }),
      get: async (agentTypeId, options) =>
        getAgentType({agentTypeId: requireId(agentTypeId, 'getAgentType'), ...(await config('agentTypes', options))}),
      list: async ({limit, offset, ...options} = {}) =>
        getAgentTypes({limit, offset, ...(await config('agentTypes', options))}),
      update: async (agentTypeId, payload, options) =>
        updateAgentType({
          agentTypeId: requireId(agentTypeId, 'updateAgentType'),
          payload,
          ...(await config('agentTypes', options)),
        }),
    },
    agents: {
      create: async (payload, options) => createAgent({payload, ...(await config('agents', options))}),
      delete: async (agentId, options) =>
        deleteAgent({agentId: requireId(agentId, 'deleteAgent'), ...(await config('agents', options))}),
      get: async (agentId, options) =>
        getAgent({agentId: requireId(agentId, 'getAgent'), ...(await config('agents', options))}),
      list: async ({filter, limit, offset, ...options} = {}) =>
        getAgents({filter, limit, offset, ...(await config('agents', options))}),
      listGroups: async (agentId, {limit, offset, ...options} = {}) =>
        getAgentGroups({
          agentId: requireId(agentId, 'getAgentGroups'),
          limit,
          offset,
          ...(await config('agents', options)),
        }),
      listRoles: async (agentId, {limit, offset, ...options} = {}) =>
        getAgentRoles({
          agentId: requireId(agentId, 'getAgentRoles'),
          limit,
          offset,
          ...(await config('agents', options)),
        }),
      suspend: async (agentId, {operatorNote, ...options} = {}) =>
        suspendAgent({agentId: requireId(agentId, 'suspendAgent'), operatorNote, ...(await config('agents', options))}),
      unlock: async (agentId, {operatorNote, ...options} = {}) =>
        unlockAgent({agentId: requireId(agentId, 'unlockAgent'), operatorNote, ...(await config('agents', options))}),
      unsuspend: async (agentId, {operatorNote, ...options} = {}) =>
        unsuspendAgent({
          agentId: requireId(agentId, 'unsuspendAgent'),
          operatorNote,
          ...(await config('agents', options)),
        }),
      update: async (agentId, payload, options) =>
        updateAgent({agentId: requireId(agentId, 'updateAgent'), payload, ...(await config('agents', options))}),
    },
    applications: {
      create: async (payload, options) => createApplication({payload, ...(await config('applications', options))}),
      createSharingPolicy: async (applicationId, payload, options) =>
        createApplicationSharingPolicy({
          applicationId: requireId(applicationId, 'createApplicationSharingPolicy'),
          payload,
          ...(await config('applications', options)),
        }),
      delete: async (applicationId, {administrationMode, ...options} = {}) =>
        deleteApplication({
          administrationMode,
          applicationId: requireId(applicationId, 'deleteApplication'),
          ...(await config('applications', options)),
        }),
      deleteSharingPolicy: async (applicationId, policyId, options) =>
        deleteApplicationSharingPolicy({
          applicationId: requireId(applicationId, 'deleteApplicationSharingPolicy'),
          policyId: requireId(policyId, 'deleteApplicationSharingPolicy'),
          ...(await config('applications', options)),
        }),
      get: async (applicationId, options) =>
        getApplication({
          applicationId: requireId(applicationId, 'getApplication'),
          ...(await config('applications', options)),
        }),
      getOverlayRules: async (applicationId, ouId, options) =>
        getApplicationOverlayRules({
          applicationId: requireId(applicationId, 'getApplicationOverlayRules'),
          ouId: requireId(ouId, 'getApplicationOverlayRules'),
          ...(await config('applications', options)),
        }),
      getSharingPolicy: async (applicationId, policyId, options) =>
        getApplicationSharingPolicy({
          applicationId: requireId(applicationId, 'getApplicationSharingPolicy'),
          policyId: requireId(policyId, 'getApplicationSharingPolicy'),
          ...(await config('applications', options)),
        }),
      list: async ({limit, offset, ...options} = {}) =>
        getApplications({limit, offset, ...(await config('applications', options))}),
      listSharingPolicies: async (applicationId, {limit, offset, ...options} = {}) =>
        getApplicationSharingPolicies({
          applicationId: requireId(applicationId, 'getApplicationSharingPolicies'),
          limit,
          offset,
          ...(await config('applications', options)),
        }),
      previewCimdDocument: async (clientId, options) =>
        previewCimdDocument({
          clientId: requireId(clientId, 'previewCimdDocument'),
          ...(await config('applications', options)),
        }),
      regenerateClientSecret: async (applicationId, {administrationMode, ...options} = {}) =>
        regenerateClientSecret({
          administrationMode,
          applicationId: requireId(applicationId, 'regenerateClientSecret'),
          ...(await config('applications', options)),
        }),
      regenerateFlowSecret: async (applicationId, options) =>
        regenerateFlowSecret({
          applicationId: requireId(applicationId, 'regenerateFlowSecret'),
          ...(await config('applications', options)),
        }),
      suspend: async (applicationId, {operatorNote, ...options} = {}) =>
        suspendApplication({
          applicationId: requireId(applicationId, 'suspendApplication'),
          operatorNote,
          ...(await config('applications', options)),
        }),
      unsuspend: async (applicationId, {operatorNote, ...options} = {}) =>
        unsuspendApplication({
          applicationId: requireId(applicationId, 'unsuspendApplication'),
          operatorNote,
          ...(await config('applications', options)),
        }),
      update: async (applicationId, payload, options) =>
        updateApplication({
          applicationId: requireId(applicationId, 'updateApplication'),
          payload,
          ...(await config('applications', options)),
        }),
      updateSharingPolicy: async (applicationId, policyId, payload, options) =>
        updateApplicationSharingPolicy({
          applicationId: requireId(applicationId, 'updateApplicationSharingPolicy'),
          payload,
          policyId: requireId(policyId, 'updateApplicationSharingPolicy'),
          ...(await config('applications', options)),
        }),
    },
    authorizationDetailTypes: {
      create: async (payload, options) =>
        createAuthorizationDetailType({payload, ...(await config('authorizationDetailTypes', options))}),
      delete: async (authorizationDetailTypeId, options) =>
        deleteAuthorizationDetailType({
          authorizationDetailTypeId: requireId(authorizationDetailTypeId, 'deleteAuthorizationDetailType'),
          ...(await config('authorizationDetailTypes', options)),
        }),
      get: async (authorizationDetailTypeId, options) =>
        getAuthorizationDetailType({
          authorizationDetailTypeId: requireId(authorizationDetailTypeId, 'getAuthorizationDetailType'),
          ...(await config('authorizationDetailTypes', options)),
        }),
      list: async ({limit, offset, ...options} = {}) =>
        getAuthorizationDetailTypes({limit, offset, ...(await config('authorizationDetailTypes', options))}),
      update: async (authorizationDetailTypeId, payload, options) =>
        updateAuthorizationDetailType({
          authorizationDetailTypeId: requireId(authorizationDetailTypeId, 'updateAuthorizationDetailType'),
          payload,
          ...(await config('authorizationDetailTypes', options)),
        }),
    },
    clientRegistrations: {
      delete: async (clientId, options) =>
        deleteClientRegistration({
          clientId: requireId(clientId, 'deleteClientRegistration'),
          ...(await config('clientRegistrations', options)),
        }),
      get: async (clientId, options) =>
        getClientRegistration({
          clientId: requireId(clientId, 'getClientRegistration'),
          ...(await config('clientRegistrations', options)),
        }),
      register: async (payload, options) =>
        registerClient({payload, ...(await config('clientRegistrations', options))}),
      update: async (clientId, payload, options) =>
        updateClientRegistration({
          clientId: requireId(clientId, 'updateClientRegistration'),
          payload,
          ...(await config('clientRegistrations', options)),
        }),
    },
    configuration: {
      captureVersion: async (payload, options) =>
        createConfigurationVersion({payload, ...(await config('configurationVersions', options))}),
      deleteImported: async (payload, options) =>
        deleteImportedConfiguration({payload, ...(await config('import', options))}),
      export: async (payload, options) => exportConfiguration({payload, ...(await config('export', options))}),
      getVersion: async (version, options) =>
        getConfigurationVersion({
          version: requireId(version, 'getConfigurationVersion'),
          ...(await config('configurationVersions', options)),
        }),
      import: async (payload, options) => importConfiguration({payload, ...(await config('import', options))}),
      listVersions: async (options) => getConfigurationVersions(await config('configurationVersions', options)),
    },
    connections: {
      create: async (type, payload, options) =>
        createConnection({
          payload,
          type: requireId(type, 'createConnection'),
          ...(await config('connections', options)),
        }),
      delete: async (type, connectionId, options) =>
        deleteConnection({
          connectionId: requireId(connectionId, 'deleteConnection'),
          type: requireId(type, 'deleteConnection'),
          ...(await config('connections', options)),
        }),
      get: async (type, connectionId, options) =>
        getConnection({
          connectionId: requireId(connectionId, 'getConnection'),
          type: requireId(type, 'getConnection'),
          ...(await config('connections', options)),
        }),
      getMeta: async ({vendor, ...options} = {}) =>
        getConnectionsMeta({vendor, ...(await config('connections', options))}),
      list: async ({category, limit, offset, ...options} = {}) =>
        getConnections({category, limit, offset, ...(await config('connections', options))}),
      listByType: async (type, options) =>
        getConnections({type: requireId(type, 'getConnections'), ...(await config('connections', options))}),
      listUsages: async (type, connectionId, options) =>
        getConnectionUsages({
          connectionId: requireId(connectionId, 'getConnectionUsages'),
          type: requireId(type, 'getConnectionUsages'),
          ...(await config('connections', options)),
        }),
      update: async (type, connectionId, payload, options) =>
        updateConnection({
          connectionId: requireId(connectionId, 'updateConnection'),
          payload,
          type: requireId(type, 'updateConnection'),
          ...(await config('connections', options)),
        }),
    },
    credentialConfigurations: {
      create: async (payload, options) =>
        createCredentialConfiguration({payload, ...(await config('credentialConfigurations', options))}),
      delete: async (configurationId, options) =>
        deleteCredentialConfiguration({
          configurationId: requireId(configurationId, 'deleteCredentialConfiguration'),
          ...(await config('credentialConfigurations', options)),
        }),
      get: async (configurationId, options) =>
        getCredentialConfiguration({
          configurationId: requireId(configurationId, 'getCredentialConfiguration'),
          ...(await config('credentialConfigurations', options)),
        }),
      list: async (options) => getCredentialConfigurations(await config('credentialConfigurations', options)),
      update: async (configurationId, payload, options) =>
        updateCredentialConfiguration({
          configurationId: requireId(configurationId, 'updateCredentialConfiguration'),
          payload,
          ...(await config('credentialConfigurations', options)),
        }),
    },
    design: {
      createLayout: async (payload, options) => createLayout({payload, ...(await config('design', options))}),
      createTheme: async (payload, options) => createDesignTheme({payload, ...(await config('design', options))}),
      deleteLayout: async (layoutId, options) =>
        deleteLayout({layoutId: requireId(layoutId, 'deleteLayout'), ...(await config('design', options))}),
      deleteTheme: async (themeId, options) =>
        deleteDesignTheme({themeId: requireId(themeId, 'deleteDesignTheme'), ...(await config('design', options))}),
      getLayout: async (layoutId, options) =>
        getLayout({layoutId: requireId(layoutId, 'getLayout'), ...(await config('design', options))}),
      getTheme: async (themeId, options) =>
        getDesignTheme({themeId: requireId(themeId, 'getDesignTheme'), ...(await config('design', options))}),
      listLayoutUsages: async (layoutId, {limit, offset, ...options} = {}) =>
        getLayoutUsages({
          layoutId: requireId(layoutId, 'getLayoutUsages'),
          limit,
          offset,
          ...(await config('design', options)),
        }),
      listLayouts: async ({limit, offset, ...options} = {}) =>
        getLayouts({limit, offset, ...(await config('design', options))}),
      listThemeUsages: async (themeId, {limit, offset, ...options} = {}) =>
        getDesignThemeUsages({
          limit,
          offset,
          themeId: requireId(themeId, 'getDesignThemeUsages'),
          ...(await config('design', options)),
        }),
      listThemes: async ({limit, offset, ...options} = {}) =>
        getDesignThemes({limit, offset, ...(await config('design', options))}),
      resolve: async (type, id, options) =>
        resolveDesign({id: requireId(id, 'resolveDesign'), type, ...(await config('design', options))}),
      updateLayout: async (layoutId, payload, options) =>
        updateLayout({layoutId: requireId(layoutId, 'updateLayout'), payload, ...(await config('design', options))}),
      updateTheme: async (themeId, payload, options) =>
        updateDesignTheme({
          payload,
          themeId: requireId(themeId, 'updateDesignTheme'),
          ...(await config('design', options)),
        }),
    },
    flows: {
      create: async (payload, options) => createFlow({payload, ...(await config('flows', options))}),
      delete: async (flowId, options) =>
        deleteFlow({flowId: requireId(flowId, 'deleteFlow'), ...(await config('flows', options))}),
      get: async (flowId, options) =>
        getFlow({flowId: requireId(flowId, 'getFlow'), ...(await config('flows', options))}),
      getVersion: async (flowId, version, options) =>
        getFlowVersion({flowId: requireId(flowId, 'getFlowVersion'), version, ...(await config('flows', options))}),
      list: async ({flowType, limit, offset, ...options} = {}) =>
        getFlows({flowType, limit, offset, ...(await config('flows', options))}),
      listUsages: async (flowId, options) =>
        getFlowUsages({flowId: requireId(flowId, 'getFlowUsages'), ...(await config('flows', options))}),
      listVersions: async (flowId, options) =>
        getFlowVersions({flowId: requireId(flowId, 'getFlowVersions'), ...(await config('flows', options))}),
      restoreVersion: async (flowId, version, options) =>
        restoreFlowVersion({
          flowId: requireId(flowId, 'restoreFlowVersion'),
          version,
          ...(await config('flows', options)),
        }),
      update: async (flowId, payload, options) =>
        updateFlow({flowId: requireId(flowId, 'updateFlow'), payload, ...(await config('flows', options))}),
      createSharingPolicy: async (flowId, payload, options) =>
        createFlowSharingPolicy({
          payload,
          flowId: requireId(flowId, 'createFlowSharingPolicy'),
          ...(await config('flows', options)),
        }),
      deleteSharingPolicy: async (flowId, policyId, options) =>
        deleteFlowSharingPolicy({
          flowId: requireId(flowId, 'deleteFlowSharingPolicy'),
          policyId: requireId(policyId, 'deleteFlowSharingPolicy'),
          ...(await config('flows', options)),
        }),
      getOverlayRules: async (flowId, ouId, options) =>
        getFlowOverlayRules({
          flowId: requireId(flowId, 'getFlowOverlayRules'),
          ouId: requireId(ouId, 'getFlowOverlayRules'),
          ...(await config('flows', options)),
        }),
      getSharingPolicy: async (flowId, policyId, options) =>
        getFlowSharingPolicy({
          flowId: requireId(flowId, 'getFlowSharingPolicy'),
          policyId: requireId(policyId, 'getFlowSharingPolicy'),
          ...(await config('flows', options)),
        }),
      listSharingPolicies: async (flowId, {limit, offset, ...options} = {}) =>
        getFlowSharingPolicies({
          flowId: requireId(flowId, 'getFlowSharingPolicies'),
          limit,
          offset,
          ...(await config('flows', options)),
        }),
      updateSharingPolicy: async (flowId, policyId, payload, options) =>
        updateFlowSharingPolicy({
          payload,
          policyId: requireId(policyId, 'updateFlowSharingPolicy'),
          flowId: requireId(flowId, 'updateFlowSharingPolicy'),
          ...(await config('flows', options)),
        }),
      getVariables: async (flowId, ouId, options) =>
        getFlowVariables({
          flowId: requireId(flowId, 'getFlowVariables'),
          ouId: requireId(ouId, 'getFlowVariables'),
          ...(await config('flows', options)),
        }),
      updateVariables: async (flowId, ouId, variables, options) =>
        updateFlowVariables({
          flowId: requireId(flowId, 'updateFlowVariables'),
          ouId: requireId(ouId, 'updateFlowVariables'),
          variables,
          ...(await config('flows', options)),
        }),
    },
    gateways: {
      applyConfiguration: async (gatewayId, payload, options) =>
        applyGatewayConfiguration({
          gatewayId: requireId(gatewayId, 'applyGatewayConfiguration'),
          payload,
          ...(await config('gateways', options)),
        }),
      create: async (payload, options) => createGateway({payload, ...(await config('gateways', options))}),
      createSecret: async (gatewayId, payload, options) =>
        createGatewaySecret({
          gatewayId: requireId(gatewayId, 'createGatewaySecret'),
          payload,
          ...(await config('gateways', options)),
        }),
      createVariable: async (gatewayId, payload, options) =>
        createGatewayVariable({
          gatewayId: requireId(gatewayId, 'createGatewayVariable'),
          payload,
          ...(await config('gateways', options)),
        }),
      delete: async (gatewayId, options) =>
        deleteGateway({gatewayId: requireId(gatewayId, 'deleteGateway'), ...(await config('gateways', options))}),
      deleteSecret: async (gatewayId, name, options) =>
        deleteGatewaySecret({
          gatewayId: requireId(gatewayId, 'deleteGatewaySecret'),
          name: requireId(name, 'deleteGatewaySecret'),
          ...(await config('gateways', options)),
        }),
      deleteVariable: async (gatewayId, name, options) =>
        deleteGatewayVariable({
          gatewayId: requireId(gatewayId, 'deleteGatewayVariable'),
          name: requireId(name, 'deleteGatewayVariable'),
          ...(await config('gateways', options)),
        }),
      get: async (gatewayId, options) =>
        getGateway({gatewayId: requireId(gatewayId, 'getGateway'), ...(await config('gateways', options))}),
      getAppliedConfiguration: async (gatewayId, options) =>
        getGatewayAppliedConfiguration({
          gatewayId: requireId(gatewayId, 'getGatewayAppliedConfiguration'),
          ...(await config('gateways', options)),
        }),
      getAppliedVersion: async (gatewayId, options) =>
        getGatewayAppliedVersion({
          gatewayId: requireId(gatewayId, 'getGatewayAppliedVersion'),
          ...(await config('gateways', options)),
        }),
      getConfigurationDiff: async (gatewayId, {version, ...options} = {}) =>
        getGatewayConfigurationDiff({
          gatewayId: requireId(gatewayId, 'getGatewayConfigurationDiff'),
          version,
          ...(await config('gateways', options)),
        }),
      getMaster: async (gatewayId, options) =>
        getGatewayMaster({gatewayId: requireId(gatewayId, 'getGatewayMaster'), ...(await config('gateways', options))}),
      getMasterHistory: async (gatewayId, options) =>
        getGatewayMasterHistory({
          gatewayId: requireId(gatewayId, 'getGatewayMasterHistory'),
          ...(await config('gateways', options)),
        }),
      getMasterResource: async (gatewayId, resourceType, resourceId, options) =>
        getGatewayMasterResource({
          gatewayId: requireId(gatewayId, 'getGatewayMasterResource'),
          resourceId: requireId(resourceId, 'getGatewayMasterResource'),
          resourceType: requireId(resourceType, 'getGatewayMasterResource'),
          ...(await config('gateways', options)),
        }),
      getSecret: async (gatewayId, name, options) =>
        getGatewaySecret({
          gatewayId: requireId(gatewayId, 'getGatewaySecret'),
          name: requireId(name, 'getGatewaySecret'),
          ...(await config('gateways', options)),
        }),
      getVariable: async (gatewayId, name, options) =>
        getGatewayVariable({
          gatewayId: requireId(gatewayId, 'getGatewayVariable'),
          name: requireId(name, 'getGatewayVariable'),
          ...(await config('gateways', options)),
        }),
      list: async (options) => getGateways(await config('gateways', options)),
      listSecrets: async (gatewayId, {filter, limit, names, offset, ...options} = {}) =>
        getGatewaySecrets({
          filter,
          gatewayId: requireId(gatewayId, 'getGatewaySecrets'),
          limit,
          names,
          offset,
          ...(await config('gateways', options)),
        }),
      listVariables: async (gatewayId, {filter, limit, names, offset, ...options} = {}) =>
        getGatewayVariables({
          filter,
          gatewayId: requireId(gatewayId, 'getGatewayVariables'),
          limit,
          names,
          offset,
          ...(await config('gateways', options)),
        }),
      revertConfiguration: async (gatewayId, payload, options) =>
        revertGatewayConfiguration({
          gatewayId: requireId(gatewayId, 'revertGatewayConfiguration'),
          payload,
          ...(await config('gateways', options)),
        }),
      update: async (gatewayId, payload, options) =>
        updateGateway({
          gatewayId: requireId(gatewayId, 'updateGateway'),
          payload,
          ...(await config('gateways', options)),
        }),
      updateSecret: async (gatewayId, name, payload, options) =>
        updateGatewaySecret({
          gatewayId: requireId(gatewayId, 'updateGatewaySecret'),
          name: requireId(name, 'updateGatewaySecret'),
          payload,
          ...(await config('gateways', options)),
        }),
      updateVariable: async (gatewayId, name, payload, options) =>
        updateGatewayVariable({
          gatewayId: requireId(gatewayId, 'updateGatewayVariable'),
          name: requireId(name, 'updateGatewayVariable'),
          payload,
          ...(await config('gateways', options)),
        }),
    },
    groups: {
      addMembers: async (groupId, members, options) =>
        addGroupMembers({
          groupId: requireId(groupId, 'addGroupMembers'),
          members,
          ...(await config('groups', options)),
        }),
      create: async (payload, options) => createGroup({payload, ...(await config('groups', options))}),
      createByPath: async (path, payload, options) =>
        createGroupByPath({path, payload, ...(await config('groups', options))}),
      delete: async (groupId, options) =>
        deleteGroup({groupId: requireId(groupId, 'deleteGroup'), ...(await config('groups', options))}),
      get: async (groupId, options) =>
        getGroup({groupId: requireId(groupId, 'getGroup'), ...(await config('groups', options))}),
      list: async ({limit, offset, ...options} = {}) =>
        getGroups({limit, offset, ...(await config('groups', options))}),
      listByPath: async (path, {limit, offset, ...options} = {}) =>
        getGroupsByPath({limit, offset, path, ...(await config('groups', options))}),
      listMembers: async (groupId, {limit, offset, ...options} = {}) =>
        getGroupMembers({
          groupId: requireId(groupId, 'getGroupMembers'),
          limit,
          offset,
          ...(await config('groups', options)),
        }),
      removeMembers: async (groupId, members, options) =>
        removeGroupMembers({
          groupId: requireId(groupId, 'removeGroupMembers'),
          members,
          ...(await config('groups', options)),
        }),
      update: async (groupId, payload, options) =>
        updateGroup({groupId: requireId(groupId, 'updateGroup'), payload, ...(await config('groups', options))}),
    },
    i18n: {
      deleteTranslation: async (language, namespace, key, options) =>
        deleteTranslation({key, language, namespace, ...(await config('i18n', options))}),
      deleteTranslations: async (language, options) =>
        deleteTranslations({language: requireId(language, 'deleteTranslations'), ...(await config('i18n', options))}),
      listLanguages: async (options) => getLanguages(await config('i18n', options)),
      resolveTranslation: async (language, namespace, key, options) =>
        resolveTranslation({key, language, namespace, ...(await config('i18n', options))}),
      resolveTranslations: async (language, {namespace, ...options} = {}) =>
        resolveTranslations({language, namespace, ...(await config('i18n', options))}),
      setTranslation: async (language, namespace, key, payload, options) =>
        setTranslation({key, language, namespace, payload, ...(await config('i18n', options))}),
      setTranslations: async (language, payload, options) =>
        setTranslations({language, payload, ...(await config('i18n', options))}),
    },
    notificationTemplates: {
      create: async (channel, payload, options) =>
        createNotificationTemplate({
          channel: requireId(channel, 'createNotificationTemplate'),
          payload,
          ...(await config('notificationTemplates', options)),
        }),
      delete: async (channel, templateId, options) =>
        deleteNotificationTemplate({
          channel: requireId(channel, 'deleteNotificationTemplate'),
          templateId: requireId(templateId, 'deleteNotificationTemplate'),
          ...(await config('notificationTemplates', options)),
        }),
      get: async (channel, templateId, options) =>
        getNotificationTemplate({
          channel: requireId(channel, 'getNotificationTemplate'),
          templateId: requireId(templateId, 'getNotificationTemplate'),
          ...(await config('notificationTemplates', options)),
        }),
      list: async (channel, {limit, offset, ...options} = {}) =>
        getNotificationTemplates({
          channel: requireId(channel, 'getNotificationTemplates'),
          limit,
          offset,
          ...(await config('notificationTemplates', options)),
        }),
      update: async (channel, templateId, payload, options) =>
        updateNotificationTemplate({
          channel: requireId(channel, 'updateNotificationTemplate'),
          payload,
          templateId: requireId(templateId, 'updateNotificationTemplate'),
          ...(await config('notificationTemplates', options)),
        }),
    },
    organizationUnits: {
      create: async (payload, options) =>
        createOrganizationUnit({payload, ...(await config('organizationUnits', options))}),
      delete: async (ouId, options) =>
        deleteOrganizationUnit({
          ouId: requireId(ouId, 'deleteOrganizationUnit'),
          ...(await config('organizationUnits', options)),
        }),
      deleteByPath: async (path, options) =>
        deleteOrganizationUnitByPath({path, ...(await config('organizationUnits', options))}),
      get: async (ouId, options) =>
        getOrganizationUnit({
          ouId: requireId(ouId, 'getOrganizationUnit'),
          ...(await config('organizationUnits', options)),
        }),
      getByPath: async (path, options) =>
        getOrganizationUnitByPath({path, ...(await config('organizationUnits', options))}),
      list: async ({filter, limit, offset, ...options} = {}) =>
        getOrganizationUnits({filter, limit, offset, ...(await config('organizationUnits', options))}),
      listChildren: async (unit, {filter, limit, offset, ...options} = {}) =>
        getOrganizationUnitChildren({
          filter,
          limit,
          offset,
          ouId: unit?.ouId,
          path: unit?.path,
          ...(await config('organizationUnits', options)),
        }),
      listGroups: async (unit, {limit, offset, ...options} = {}) =>
        getOrganizationUnitGroups({...unit, limit, offset, ...(await config('organizationUnits', options))}),
      listRoles: async (unit, {limit, offset, ...options} = {}) =>
        getOrganizationUnitRoles({...unit, limit, offset, ...(await config('organizationUnits', options))}),
      listUsers: async (unit, {limit, offset, ...options} = {}) =>
        getOrganizationUnitUsers({...unit, limit, offset, ...(await config('organizationUnits', options))}),
      update: async (ouId, payload, options) =>
        updateOrganizationUnit({
          ouId: requireId(ouId, 'updateOrganizationUnit'),
          payload,
          ...(await config('organizationUnits', options)),
        }),
      updateByPath: async (path, payload, options) =>
        updateOrganizationUnitByPath({path, payload, ...(await config('organizationUnits', options))}),
    },
    presentationDefinitions: {
      create: async (payload, options) =>
        createPresentationDefinition({payload, ...(await config('presentationDefinitions', options))}),
      delete: async (definitionId, options) =>
        deletePresentationDefinition({
          definitionId: requireId(definitionId, 'deletePresentationDefinition'),
          ...(await config('presentationDefinitions', options)),
        }),
      get: async (definitionId, options) =>
        getPresentationDefinition({
          definitionId: requireId(definitionId, 'getPresentationDefinition'),
          ...(await config('presentationDefinitions', options)),
        }),
      list: async (options) => getPresentationDefinitions(await config('presentationDefinitions', options)),
      update: async (definitionId, payload, options) =>
        updatePresentationDefinition({
          definitionId: requireId(definitionId, 'updatePresentationDefinition'),
          payload,
          ...(await config('presentationDefinitions', options)),
        }),
    },
    projects: {
      create: async (payload, options) => createProject({payload, ...(await config('projects', options))}),
      delete: async (projectId, options) =>
        deleteProject({projectId: requireId(projectId, 'deleteProject'), ...(await config('projects', options))}),
      get: async (projectId, options) =>
        getProject({projectId: requireId(projectId, 'getProject'), ...(await config('projects', options))}),
      list: async ({limit, offset, ...options} = {}) =>
        getProjects({limit, offset, ...(await config('projects', options))}),
      update: async (projectId, payload, options) =>
        updateProject({
          projectId: requireId(projectId, 'updateProject'),
          payload,
          ...(await config('projects', options)),
        }),
    },
    resourceServers: {
      create: async (payload, options) =>
        createResourceServer({payload, ...(await config('resourceServers', options))}),
      createAction: async (resourceServerId, payload, {resourceId, ...options} = {}) =>
        createAction({
          payload,
          resourceId,
          resourceServerId: requireId(resourceServerId, 'createAction'),
          ...(await config('resourceServers', options)),
        }),
      createResource: async (resourceServerId, payload, options) =>
        createResource({
          payload,
          resourceServerId: requireId(resourceServerId, 'createResource'),
          ...(await config('resourceServers', options)),
        }),
      delete: async (resourceServerId, options) =>
        deleteResourceServer({
          resourceServerId: requireId(resourceServerId, 'deleteResourceServer'),
          ...(await config('resourceServers', options)),
        }),
      deleteAction: async (resourceServerId, actionId, {administrationMode, resourceId, ...options} = {}) =>
        deleteAction({
          actionId: requireId(actionId, 'deleteAction'),
          administrationMode,
          resourceId,
          resourceServerId: requireId(resourceServerId, 'deleteAction'),
          ...(await config('resourceServers', options)),
        }),
      deleteResource: async (resourceServerId, resourceId, options) =>
        deleteResource({
          resourceId: requireId(resourceId, 'deleteResource'),
          resourceServerId: requireId(resourceServerId, 'deleteResource'),
          ...(await config('resourceServers', options)),
        }),
      get: async (resourceServerId, options) =>
        getResourceServer({
          resourceServerId: requireId(resourceServerId, 'getResourceServer'),
          ...(await config('resourceServers', options)),
        }),
      getAction: async (resourceServerId, actionId, {resourceId, ...options} = {}) =>
        getAction({
          actionId: requireId(actionId, 'getAction'),
          resourceId,
          resourceServerId: requireId(resourceServerId, 'getAction'),
          ...(await config('resourceServers', options)),
        }),
      getResource: async (resourceServerId, resourceId, options) =>
        getResource({
          resourceId: requireId(resourceId, 'getResource'),
          resourceServerId: requireId(resourceServerId, 'getResource'),
          ...(await config('resourceServers', options)),
        }),
      list: async ({limit, offset, ...options} = {}) =>
        getResourceServers({limit, offset, ...(await config('resourceServers', options))}),
      listActions: async (resourceServerId, {kind, limit, offset, resourceId, ...options} = {}) =>
        getActions({
          kind,
          limit,
          offset,
          resourceId,
          resourceServerId: requireId(resourceServerId, 'getActions'),
          ...(await config('resourceServers', options)),
        }),
      listResources: async (resourceServerId, {limit, offset, parentId, ...options} = {}) =>
        getResources({
          limit,
          offset,
          parentId,
          resourceServerId: requireId(resourceServerId, 'getResources'),
          ...(await config('resourceServers', options)),
        }),
      update: async (resourceServerId, payload, options) =>
        updateResourceServer({
          payload,
          resourceServerId: requireId(resourceServerId, 'updateResourceServer'),
          ...(await config('resourceServers', options)),
        }),
      updateAction: async (resourceServerId, actionId, payload, {resourceId, ...options} = {}) =>
        updateAction({
          actionId: requireId(actionId, 'updateAction'),
          payload,
          resourceId,
          resourceServerId: requireId(resourceServerId, 'updateAction'),
          ...(await config('resourceServers', options)),
        }),
      updateResource: async (resourceServerId, resourceId, payload, options) =>
        updateResource({
          payload,
          resourceId: requireId(resourceId, 'updateResource'),
          resourceServerId: requireId(resourceServerId, 'updateResource'),
          ...(await config('resourceServers', options)),
        }),
    },
    roles: {
      addAssignments: async (roleId, assignments, options) =>
        addRoleAssignments({
          assignments,
          roleId: requireId(roleId, 'addRoleAssignments'),
          ...(await config('roles', options)),
        }),
      create: async (payload, options) => createRole({payload, ...(await config('roles', options))}),
      delete: async (roleId, options) =>
        deleteRole({roleId: requireId(roleId, 'deleteRole'), ...(await config('roles', options))}),
      get: async (roleId, options) =>
        getRole({roleId: requireId(roleId, 'getRole'), ...(await config('roles', options))}),
      list: async ({limit, offset, ...options} = {}) => getRoles({limit, offset, ...(await config('roles', options))}),
      listAssignments: async (roleId, {limit, offset, type, ...options} = {}) =>
        getRoleAssignments({
          limit,
          offset,
          roleId: requireId(roleId, 'getRoleAssignments'),
          type,
          ...(await config('roles', options)),
        }),
      removeAssignments: async (roleId, assignments, options) =>
        removeRoleAssignments({
          assignments,
          roleId: requireId(roleId, 'removeRoleAssignments'),
          ...(await config('roles', options)),
        }),
      update: async (roleId, payload, options) =>
        updateRole({payload, roleId: requireId(roleId, 'updateRole'), ...(await config('roles', options))}),
      createSharingPolicy: async (roleId, payload, options) =>
        createRoleSharingPolicy({
          payload,
          roleId: requireId(roleId, 'createRoleSharingPolicy'),
          ...(await config('roles', options)),
        }),
      deleteSharingPolicy: async (roleId, policyId, options) =>
        deleteRoleSharingPolicy({
          roleId: requireId(roleId, 'deleteRoleSharingPolicy'),
          policyId: requireId(policyId, 'deleteRoleSharingPolicy'),
          ...(await config('roles', options)),
        }),
      getOverlayRules: async (roleId, ouId, options) =>
        getRoleOverlayRules({
          roleId: requireId(roleId, 'getRoleOverlayRules'),
          ouId: requireId(ouId, 'getRoleOverlayRules'),
          ...(await config('roles', options)),
        }),
      getSharingPolicy: async (roleId, policyId, options) =>
        getRoleSharingPolicy({
          roleId: requireId(roleId, 'getRoleSharingPolicy'),
          policyId: requireId(policyId, 'getRoleSharingPolicy'),
          ...(await config('roles', options)),
        }),
      listSharingPolicies: async (roleId, {limit, offset, ...options} = {}) =>
        getRoleSharingPolicies({
          roleId: requireId(roleId, 'getRoleSharingPolicies'),
          limit,
          offset,
          ...(await config('roles', options)),
        }),
      updateSharingPolicy: async (roleId, policyId, payload, options) =>
        updateRoleSharingPolicy({
          payload,
          policyId: requireId(policyId, 'updateRoleSharingPolicy'),
          roleId: requireId(roleId, 'updateRoleSharingPolicy'),
          ...(await config('roles', options)),
        }),
    },
    secrets: {
      create: async (payload, options) => createSecret({payload, ...(await config('secrets', options))}),
      delete: async (name, options) =>
        deleteSecret({name: requireId(name, 'deleteSecret'), ...(await config('secrets', options))}),
      get: async (name, options) =>
        getSecret({name: requireId(name, 'getSecret'), ...(await config('secrets', options))}),
      list: async ({filter, limit, names, offset, ...options} = {}) =>
        getSecrets({filter, limit, names, offset, ...(await config('secrets', options))}),
      update: async (name, payload, options) =>
        updateSecret({name: requireId(name, 'updateSecret'), payload, ...(await config('secrets', options))}),
    },
    serverConfig: {
      get: async <T = unknown>(name: string, options?: ManagementCallOptions) =>
        getServerConfig<T>({name: requireId(name, 'getServerConfig'), ...(await config('serverConfig', options))}),
      list: async (options) => getServerConfigs(await config('serverConfig', options)),
      update: async <T = unknown>(name: string, payload: T, options?: ManagementCallOptions) =>
        updateServerConfig<T>({
          name: requireId(name, 'updateServerConfig'),
          payload,
          ...(await config('serverConfig', options)),
        }),
    },
    userTypes: {
      list: async ({limit, offset, ...options} = {}) =>
        getUserTypes({limit, offset, ...(await config('userTypes', options))}),
    },
    users: {
      create: async (payload, options) => createUser({payload, ...(await config('users', options))}),
      createByPath: async (path, payload, options) =>
        createUserByPath({path, payload, ...(await config('users', options))}),
      createSharingPolicy: async (userId, payload, options) =>
        createUserSharingPolicy({
          payload,
          userId: requireId(userId, 'createUserSharingPolicy'),
          ...(await config('users', options)),
        }),
      delete: async (userId, options) =>
        deleteUser({userId: requireId(userId, 'deleteUser'), ...(await config('users', options))}),
      deleteSharingPolicy: async (userId, policyId, options) =>
        deleteUserSharingPolicy({
          policyId: requireId(policyId, 'deleteUserSharingPolicy'),
          userId: requireId(userId, 'deleteUserSharingPolicy'),
          ...(await config('users', options)),
        }),
      get: async (userId, options) =>
        getUser({userId: requireId(userId, 'getUser'), ...(await config('users', options))}),
      getOverlayRules: async (userId, ouId, options) =>
        getUserOverlayRules({
          ouId: requireId(ouId, 'getUserOverlayRules'),
          userId: requireId(userId, 'getUserOverlayRules'),
          ...(await config('users', options)),
        }),
      getSharingPolicy: async (userId, policyId, options) =>
        getUserSharingPolicy({
          policyId: requireId(policyId, 'getUserSharingPolicy'),
          userId: requireId(userId, 'getUserSharingPolicy'),
          ...(await config('users', options)),
        }),
      list: async ({filter, limit, offset, ...options} = {}) =>
        getUsers({filter, limit, offset, ...(await config('users', options))}),
      listByPath: async (path, {limit, offset, ...options} = {}) =>
        getUsersByPath({limit, offset, path, ...(await config('users', options))}),
      listGroups: async (userId, {limit, offset, ...options} = {}) =>
        getUserGroups({
          limit,
          offset,
          userId: requireId(userId, 'getUserGroups'),
          ...(await config('users', options)),
        }),
      listSharingPolicies: async (userId, {limit, offset, ...options} = {}) =>
        getUserSharingPolicies({
          limit,
          offset,
          userId: requireId(userId, 'getUserSharingPolicies'),
          ...(await config('users', options)),
        }),
      suspend: async (userId, {operatorNote, ...options} = {}) =>
        suspendUser({operatorNote, userId: requireId(userId, 'suspendUser'), ...(await config('users', options))}),
      unlock: async (userId, {operatorNote, ...options} = {}) =>
        unlockUser({operatorNote, userId: requireId(userId, 'unlockUser'), ...(await config('users', options))}),
      unsuspend: async (userId, {operatorNote, ...options} = {}) =>
        unsuspendUser({operatorNote, userId: requireId(userId, 'unsuspendUser'), ...(await config('users', options))}),
      update: async (userId, payload, options) =>
        updateUser({payload, userId: requireId(userId, 'updateUser'), ...(await config('users', options))}),
      updateSharingPolicy: async (userId, policyId, payload, options) =>
        updateUserSharingPolicy({
          payload,
          policyId: requireId(policyId, 'updateUserSharingPolicy'),
          userId: requireId(userId, 'updateUserSharingPolicy'),
          ...(await config('users', options)),
        }),
    },
    variables: {
      create: async (payload, options) => createVariable({payload, ...(await config('variables', options))}),
      delete: async (name, options) =>
        deleteVariable({name: requireId(name, 'deleteVariable'), ...(await config('variables', options))}),
      get: async (name, options) =>
        getVariable({name: requireId(name, 'getVariable'), ...(await config('variables', options))}),
      list: async ({filter, limit, names, offset, ...options} = {}) =>
        getVariables({filter, limit, names, offset, ...(await config('variables', options))}),
      update: async (name, payload, options) =>
        updateVariable({name: requireId(name, 'updateVariable'), payload, ...(await config('variables', options))}),
    },
  };
};

export default createManagementClient;

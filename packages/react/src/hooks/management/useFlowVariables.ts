// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ApiFetcher,
  ConnectionInstance,
  FlowVariableDefinition,
  FlowVariableQueryKeys,
  FlowVariableValues,
  FlowVariables,
  ManagedFlowDefinition,
  ResolvedOverlay,
  getConnections,
  getFlowOverlayRules,
  getFlow,
  getFlowVariableDefinitions,
  getFlowVariables,
  updateFlowVariables,
} from '@thunderid/browser';
import {useMemo} from 'react';
import useManagementEndpoint, {ManagementEndpoint} from './useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from './useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from './useResourceQuery';

/**
 * Options of {@link useFlowVariables}.
 */
export interface UseFlowVariablesOptions {
  /**
   * Set to `false` to skip fetching, for example until the identifiers are known.
   * @default true
   */
  enabled?: boolean;
  /**
   * Transport for this hook only. Takes precedence over `ThunderIDProvider`'s `http.fetcher`.
   */
  fetcher?: ApiFetcher;
  /**
   * Identifier of the flow.
   */
  flowId: string | undefined;
  /**
   * Called with the saved overrides.
   */
  onSaved?: (values: FlowVariableValues) => void;
  /**
   * The organization unit whose overrides are read and saved.
   */
  ouId: string | undefined;
}

/**
 * What {@link useFlowVariables} returns.
 */
export interface UseFlowVariablesResult {
  /**
   * The connections a `CONNECTION_SELECT` variable can take: the ones the organization unit owns and the ones shared
   * into it. Empty until loaded, and when no variable needs them.
   */
  connections: ConnectionInstance[];
  /**
   * The variables the flow declares for the organization unit.
   */
  definitions: FlowVariableDefinition[];
  /**
   * Why the variables could not be loaded.
   */
  error: Error | null;
  /**
   * The flow as the organization unit sees it.
   */
  flow: ManagedFlowDefinition | undefined;
  /**
   * Whether the variables, the unit's values and its rules have all arrived. A form built before then would be reset when
   * the values land.
   */
  isLoaded: boolean;
  isLoading: boolean;
  isSaving: boolean;
  /**
   * What the organization unit may do with each variable: set its own value, or only see the owner's.
   */
  overlay: ResolvedOverlay | undefined;
  /**
   * The values the organization unit has set. A variable it has not set is absent, and its default applies.
   */
  overrides: FlowVariableValues;
  /**
   * Replaces the unit's overrides. A variable left out returns to its default. Never rejects: read `saveError`.
   */
  save: (values: FlowVariableValues) => Promise<FlowVariables | undefined>;
  /**
   * Why the last save failed.
   */
  saveError: Error | null;
}

/**
 * Loads the variables a flow declares for an organization unit and the values the unit has set, and saves
 * them. The data behind {@link FlowVariablesForm}, for building the form with any UI.
 *
 * @example
 * ```tsx
 * const {definitions, overrides, save} = useFlowVariables({flowId, ouId});
 * ```
 */
const useFlowVariables = ({
  enabled = true,
  fetcher,
  flowId,
  onSaved,
  ouId,
}: UseFlowVariablesOptions): UseFlowVariablesResult => {
  const flowsEndpoint: ManagementEndpoint = useManagementEndpoint('flows');
  const connectionsEndpoint: ManagementEndpoint = useManagementEndpoint('connections');
  const ready: boolean = enabled && Boolean(flowId) && Boolean(ouId);

  const flowQuery: ResourceQueryResult<ManagedFlowDefinition> = useResourceQuery(
    [FlowVariableQueryKeys.DEFINITIONS, flowId ?? '', ouId ?? ''],
    (resolved: ApiFetcher) => getFlow({...flowsEndpoint, fetcher: resolved, flowId: flowId!, ouId}),
    {enabled: ready, fetcher},
  );
  const valuesQuery: ResourceQueryResult<FlowVariables> = useResourceQuery(
    [FlowVariableQueryKeys.VALUES, flowId ?? '', ouId ?? ''],
    (resolved: ApiFetcher) => getFlowVariables({...flowsEndpoint, fetcher: resolved, flowId: flowId!, ouId: ouId!}),
    {enabled: ready, fetcher},
  );

  const overlayQuery: ResourceQueryResult<ResolvedOverlay> = useResourceQuery(
    [FlowVariableQueryKeys.DEFINITIONS, 'overlay', flowId ?? '', ouId ?? ''],
    (resolved: ApiFetcher) => getFlowOverlayRules({...flowsEndpoint, fetcher: resolved, flowId: flowId!, ouId: ouId!}),
    {enabled: ready, fetcher},
  );

  const definitions: FlowVariableDefinition[] = useMemo(
    () => getFlowVariableDefinitions(flowQuery.data),
    [flowQuery.data],
  );
  const needsConnections: boolean = definitions.some(
    (definition: FlowVariableDefinition) => definition.type === 'CONNECTION_SELECT',
  );

  const connectionsQuery: ResourceQueryResult<{connections: ConnectionInstance[]}> = useResourceQuery(
    [FlowVariableQueryKeys.DEFINITIONS, 'connections', ouId ?? ''],
    (resolved: ApiFetcher) => getConnections({...connectionsEndpoint, fetcher: resolved, limit: 100, ouId}),
    {enabled: ready && needsConnections, fetcher},
  );

  const mutation: ResourceMutationResult<FlowVariables, FlowVariableValues> = useResourceMutation(
    (values: FlowVariableValues, resolved: ApiFetcher) =>
      updateFlowVariables({...flowsEndpoint, fetcher: resolved, flowId: flowId!, ouId: ouId!, variables: values}),
    () => [[FlowVariableQueryKeys.VALUES]],
    {fetcher, onSuccess: (response: FlowVariables) => onSaved?.(response.values)},
  );

  return {
    connections: connectionsQuery.data?.connections ?? [],
    definitions,
    error: flowQuery.error ?? valuesQuery.error ?? overlayQuery.error ?? connectionsQuery.error,
    flow: flowQuery.data,
    isLoaded: Boolean(flowQuery.data) && Boolean(valuesQuery.data) && Boolean(overlayQuery.data),
    isLoading: flowQuery.isLoading || valuesQuery.isLoading || overlayQuery.isLoading || connectionsQuery.isLoading,
    isSaving: mutation.isLoading,
    overlay: overlayQuery.data,
    overrides: valuesQuery.data?.values ?? {},
    save: mutation.mutate,
    saveError: mutation.error,
  };
};

export default useFlowVariables;

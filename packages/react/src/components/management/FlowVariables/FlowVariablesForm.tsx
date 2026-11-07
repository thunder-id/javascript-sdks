// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowVariableValues, toManagementErrorMessage} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseFlowVariables, {BaseFlowVariablesProps} from './BaseFlowVariables';
import useFlowVariables, {UseFlowVariablesResult} from '../../../hooks/management/useFlowVariables';
import useTranslation from '../../../hooks/useTranslation';
import Spinner from '../../primitives/Spinner/Spinner';

export type FlowVariablesFormProps = Omit<
  BaseFlowVariablesProps,
  'connections' | 'error' | 'initialValues' | 'isSubmitting' | 'onSubmit' | 'overlay' | 'variables'
> & {
  /**
   * Identifier of the flow whose variables are configured.
   */
  flowId: string;
  /**
   * Called with the saved overrides.
   */
  onSaved?: (values: FlowVariableValues) => void;
  /**
   * The organization unit the overrides belong to.
   */
  ouId: string;
};

/**
 * Lets a delegated admin override the variables a flow declares for their organization unit. It loads the
 * variables the flow shares with the unit and the values the unit has set, shows them as a form, and saves
 * the values that differ from their defaults.
 *
 * @example
 * ```tsx
 * <FlowVariablesForm flowId={flowId} ouId={ouId} onSaved={() => toast('Saved')} />
 * ```
 */
const FlowVariablesForm: FC<FlowVariablesFormProps> = ({
  flowId,
  onSaved,
  ouId,
  preferences,
  title,
  ...rest
}: FlowVariablesFormProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const {
    connections,
    definitions,
    error,
    isLoaded,
    isSaving,
    overlay,
    overrides,
    save,
    saveError,
  }: UseFlowVariablesResult = useFlowVariables({flowId, onSaved, ouId});

  // Only what differs from the default is an override; the rest keeps following the default.
  const handleSubmit = (_values: FlowVariableValues, changed: FlowVariableValues): void => {
    void save(changed);
  };

  if (!isLoaded && !error) {
    return <Spinner />;
  }

  return (
    <BaseFlowVariables
      title={title ?? t('admin.flowVariables.title')}
      variables={definitions}
      connections={connections}
      initialValues={overrides}
      overlay={overlay}
      isSubmitting={isSaving}
      error={
        error
          ? toManagementErrorMessage(t, error, 'admin.flowVariables.load_error')
          : toManagementErrorMessage(t, saveError, 'admin.flowVariables.error')
      }
      onSubmit={handleSubmit}
      preferences={preferences}
      {...rest}
    />
  );
};

export default FlowVariablesForm;

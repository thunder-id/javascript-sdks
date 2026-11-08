// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  FlowVariablesForm as ReactFlowVariablesForm,
  FlowVariablesFormProps as ReactFlowVariablesFormProps,
} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type FlowVariablesFormProps = ReactFlowVariablesFormProps;

/**
 * Lets a delegated admin override the variables a flow declares for their organization unit: it loads the
 * variables the flow shares with the unit and the values the unit has set, shows them as a form, and saves
 * the values that differ from their defaults.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <FlowVariablesForm flowId={flowId} ouId={ouId} onSaved={() => toast('Saved')} />
 * ```
 */
const FlowVariablesForm: FC<FlowVariablesFormProps> = (props: FlowVariablesFormProps): ReactElement => (
  <ReactFlowVariablesForm {...props} />
);

FlowVariablesForm.displayName = 'FlowVariablesForm';

export default FlowVariablesForm;

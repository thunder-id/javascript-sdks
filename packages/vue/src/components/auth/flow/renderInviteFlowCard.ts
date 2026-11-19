// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getFlowStepComponents} from '@thunderid/browser';
import type {FetchAuthFlows, FetchUsers, FetchUserTypes, FlowMetadataResponse} from '@thunderid/browser';
import {type VNode, h} from 'vue';
import {renderInviteUserComponents} from './AuthOptionFactory';
import type {InviteFlow} from '../../../composables/auth/useInviteFlow';
import withFlowTestIds, {type FlowIds, collectFlowIds} from '../../../utils/withFlowTestIds';
import Alert from '../../primitives/Alert';
import Card from '../../primitives/Card';
import Spinner from '../../primitives/Spinner';
import Typography from '../../primitives/Typography';

export interface InviteFlowCardOptions {
  className: string;
  fetchAuthFlows?: FetchAuthFlows;
  fetchUsers?: FetchUsers;
  fetchUserTypes?: FetchUserTypes;
  isInitialized: boolean;
  onPickerError?: (error: Error) => void;
  showSubtitle: boolean;
  showTitle: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outlined' | 'elevated';
}

/**
 * The built-in UI of an invitation flow: the current step in a card, its title and subtitle in the header.
 */
const renderInviteFlowCard = (flow: InviteFlow, options: InviteFlowCardOptions): VNode => {
  const {className, isInitialized, variant} = options;
  const isLoading: boolean = flow.isLoading.value;
  const apiError: Error | null = flow.apiError.value;

  // Waiting for SDK initialization, or for the first step.
  if (!isInitialized || (!flow.isFlowInitialized.value && isLoading)) {
    return h(Card, {class: className, variant}, () =>
      h('div', {style: 'display:flex;justify-content:center;padding:2rem'}, h(Spinner)),
    );
  }

  // The flow did not start.
  if (!flow.currentFlow.value && apiError) {
    return h(Card, {class: className, variant}, () => h(Alert, {variant: 'error'}, () => apiError.message));
  }

  const {componentsWithoutHeadings, subtitle, title} = flow.read();
  const meta: FlowMetadataResponse | null = flow.meta();
  const flowIds: FlowIds = collectFlowIds(getFlowStepComponents(componentsWithoutHeadings));
  const renderedComponents: VNode[] =
    componentsWithoutHeadings.length > 0
      ? renderInviteUserComponents(
          componentsWithoutHeadings,
          flow.formValues.value,
          flow.touchedFields.value,
          flow.formErrors.value,
          isLoading,
          flow.isFormValid.value,
          flow.resetForm,
          flow.handleInputChange,
          {
            additionalData: flow.currentFlow.value?.data?.additionalData,
            fetchAuthFlows: options.fetchAuthFlows,
            fetchUsers: options.fetchUsers,
            fetchUserTypes: options.fetchUserTypes,
            isFormComplete: flow.validateForm(componentsWithoutHeadings).isValid,
            meta,
            onInputBlur: flow.handleInputBlur,
            onPickerError: options.onPickerError,
            onSubmit: flow.handleSubmit,
            size: options.size,
            t: flow.t,
            variant,
          },
        ).map((node: VNode) => withFlowTestIds(node, flowIds))
      : [];

  return h(Card, {class: className, variant}, () => [
    (options.showTitle || options.showSubtitle) && (title || subtitle)
      ? h('div', {style: 'padding:1rem 1rem 0'}, [
          options.showTitle && title ? h(Typography, {variant: 'h5'}, () => title) : null,
          options.showSubtitle && subtitle
            ? h(Typography, {style: 'margin-top:0.25rem', variant: 'body1'}, () => subtitle)
            : null,
        ])
      : null,
    apiError
      ? h(
          'div',
          {style: 'padding:0 1rem;margin-bottom:1rem'},
          h(Alert, {variant: 'error'}, () => apiError.message),
        )
      : null,
    h(
      'div',
      {style: 'padding:1rem'},
      ((): (VNode | VNode[] | null)[] => {
        const formContent: (VNode | VNode[] | null)[] = [];

        if (renderedComponents.length > 0) {
          formContent.push(renderedComponents);
        } else if (!isLoading) {
          formContent.push(h(Alert, {variant: 'warning'}, () => flow.t('errors.invite.components.not.available')));
        }

        if (isLoading) {
          formContent.push(h('div', {style: 'display:flex;justify-content:center;padding:1rem'}, h(Spinner)));
        }

        return formContent;
      })(),
    ),
  ]);
};

export default renderInviteFlowCard;

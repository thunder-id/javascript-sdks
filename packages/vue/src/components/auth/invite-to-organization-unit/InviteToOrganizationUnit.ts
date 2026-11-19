// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseInviteToOrganizationUnit from './BaseInviteToOrganizationUnit';
import type {BaseInviteToOrganizationUnitRenderProps} from './BaseInviteToOrganizationUnit';
import useFlowExecute from '../../../composables/auth/useFlowExecute';
import type {InviteUserFlowResponse} from '../../../composables/auth/useInviteFlow';
import useThunderID from '../../../composables/useThunderID';

export type InviteToOrganizationUnitRenderProps = BaseInviteToOrganizationUnitRenderProps;

/**
 * InviteToOrganizationUnit — runs an INVITATION flow with the signed-in user's access token, which invites a person
 * into the organization unit the token was issued for.
 *
 * @example
 * ```vue
 * <InviteToOrganizationUnit :flow-id="invitationFlowId" :on-error="handleError" />
 * ```
 */
const InviteToOrganizationUnit: Component = defineComponent({
  name: 'InviteToOrganizationUnit',
  props: {
    className: {default: '', type: String},
    /** The ID of the invitation flow, owned by or shared with the organization unit of the user's token. */
    flowId: {required: true, type: String},
    onError: {default: undefined, type: Function as PropType<(error: Error) => void>},
    onFlowChange: {
      default: undefined,
      type: Function as PropType<(response: InviteUserFlowResponse) => void>,
    },
    showSubtitle: {default: true, type: Boolean},
    showTitle: {default: true, type: Boolean},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    variant: {default: 'outlined', type: String as PropType<'outlined' | 'elevated'>},
  },
  setup(props: any, {slots}: SetupContext): () => VNode | null {
    const {isInitialized} = useThunderID();
    const execute: (payload: Record<string, any>) => Promise<InviteUserFlowResponse> =
      useFlowExecute<InviteUserFlowResponse>();

    return (): VNode | null =>
      h(
        BaseInviteToOrganizationUnit,
        {
          className: props.className,
          flowId: props.flowId,
          isInitialized: isInitialized?.value ?? false,
          onError: props.onError,
          onFlowChange: props.onFlowChange,
          onInitialize: execute,
          onSubmit: execute,
          showSubtitle: props.showSubtitle,
          showTitle: props.showTitle,
          size: props.size,
          variant: props.variant,
        },
        slots['default']
          ? {default: (renderProps: InviteToOrganizationUnitRenderProps) => slots['default']!(renderProps)}
          : undefined,
      );
  },
});

export default InviteToOrganizationUnit;

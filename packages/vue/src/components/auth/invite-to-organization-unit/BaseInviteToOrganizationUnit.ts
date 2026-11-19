// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import useInviteFlow, {
  type InviteFlow,
  type InviteFlowRenderProps,
  type InviteUserFlowResponse,
} from '../../../composables/auth/useInviteFlow';
import renderInviteFlowCard from '../flow/renderInviteFlowCard';

/**
 * Slot props of the default scoped slot.
 */
export type BaseInviteToOrganizationUnitRenderProps = InviteFlowRenderProps;

export interface BaseInviteToOrganizationUnitProps {
  className?: string;
  /**
   * The ID of the invitation flow to run. An invitation flow starts only by its ID, and only for an organization
   * unit that owns it or was shared it.
   */
  flowId: string;
  isInitialized?: boolean;
  onError?: (error: Error) => void;
  onFlowChange?: (response: InviteUserFlowResponse) => void;
  /**
   * Starts the invitation. It must make the request with an access token issued for the organization unit the
   * invitation is into: the flow runs for the unit the token names.
   */
  onInitialize: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;
  /** Submits a step, with the same access token. */
  onSubmit: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;
  showSubtitle?: boolean;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outlined' | 'elevated';
}

/**
 * BaseInviteToOrganizationUnit — runs an INVITATION flow, which invites a person into an organization unit and
 * assigns them roles there. The app supplies the requests; the steps come from the flow.
 */
const BaseInviteToOrganizationUnit: Component = defineComponent({
  name: 'BaseInviteToOrganizationUnit',
  props: {
    className: {default: '', type: String},
    flowId: {required: true, type: String},
    isInitialized: {default: true, type: Boolean},
    onError: {default: undefined, type: Function as PropType<(error: Error) => void>},
    onFlowChange: {
      default: undefined,
      type: Function as PropType<(response: InviteUserFlowResponse) => void>,
    },
    onInitialize: {
      required: true,
      type: Function as PropType<(payload: Record<string, any>) => Promise<InviteUserFlowResponse>>,
    },
    onSubmit: {
      required: true,
      type: Function as PropType<(payload: Record<string, any>) => Promise<InviteUserFlowResponse>>,
    },
    showSubtitle: {default: true, type: Boolean},
    showTitle: {default: true, type: Boolean},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    variant: {default: 'outlined', type: String as PropType<'outlined' | 'elevated'>},
  },
  setup(props: any, {slots}: SetupContext): () => VNode | null {
    const flow: InviteFlow = useInviteFlow({
      errorKey: 'errors.invite.flow.failure',
      props,
      start: () => ({flowId: props.flowId}),
    });

    return (): VNode | null => {
      const containerClass: string = [withVendorCSSClassPrefix('invite-to-organization-unit'), props.className]
        .filter(Boolean)
        .join(' ');

      if (slots['default']) {
        return h('div', {class: containerClass}, slots['default'](flow.renderProps()));
      }

      return renderInviteFlowCard(flow, {
        className: containerClass,
        isInitialized: props.isInitialized,
        onPickerError: props.onError,
        showSubtitle: props.showSubtitle,
        showTitle: props.showTitle,
        size: props.size,
        variant: props.variant,
      });
    };
  },
});

export default BaseInviteToOrganizationUnit;

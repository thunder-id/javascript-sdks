// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedFlowType,
  FetchAuthFlows,
  FetchUsers,
  FetchUserTypes,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import useInviteFlow, {
  type InviteFlow,
  type InviteFlowRenderProps,
  type InviteUserFlowResponse,
} from '../../../composables/auth/useInviteFlow';
import Alert from '../../primitives/Alert';
import Button from '../../primitives/Button';
import Card from '../../primitives/Card';
import Typography from '../../primitives/Typography';
import renderInviteFlowCard from '../flow/renderInviteFlowCard';

export type {InviteUserFlowResponse};

/**
 * Render props passed to the default scoped slot.
 */
export interface BaseInviteUserRenderProps extends InviteFlowRenderProps {
  copyInviteLink: () => Promise<void>;
  /**
   * @deprecated Use `executionId`.
   */
  flowId?: string;
  inviteLink?: string;
  inviteLinkCopied: boolean;
  isEmailSent: boolean;
  isInviteGenerated: boolean;
}

export interface BaseInviteUserProps {
  className?: string;
  isInitialized?: boolean;
  onError?: (error: Error) => void;
  onFlowChange?: (response: InviteUserFlowResponse) => void;
  onInitialize: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;
  onInviteLinkGenerated?: (inviteLink: string, flowId: string) => void;
  onSubmit: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;
  showSubtitle?: boolean;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outlined' | 'elevated';
}

const START: Record<string, unknown> = {flowType: EmbeddedFlowType.UserOnboarding};

/**
 * BaseInviteUser — handles the admin invite-user flow lifecycle.
 *
 * Steps: user type selection → user details → invite link generation.
 */
const BaseInviteUser: Component = defineComponent({
  name: 'BaseInviteUser',
  props: {
    className: {default: '', type: String},
    /**
     * Function to load one page of authentication flows.
     * When provided, enables the flow picker for AUTH_FLOW_SELECT components.
     */
    fetchAuthFlows: {default: undefined, type: Function as PropType<FetchAuthFlows>},
    /**
     * Function to load one page of users.
     * When provided, enables the user picker for USER_SELECT components.
     */
    fetchUsers: {default: undefined, type: Function as PropType<FetchUsers>},
    /**
     * Function to load one page of user types.
     * When provided, enables the user type picker for USER_TYPE_SELECT components.
     */
    fetchUserTypes: {default: undefined, type: Function as PropType<FetchUserTypes>},
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
    onInviteLinkGenerated: {
      default: undefined,
      type: Function as PropType<(inviteLink: string, flowId: string) => void>,
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
    // Invite state
    const inviteLink: Ref<string | undefined> = ref(undefined);
    const inviteLinkCopied: Ref<boolean> = ref(false);
    const emailSent: Ref<boolean> = ref(false);

    const flow: InviteFlow = useInviteFlow({
      errorKey: 'components.inviteUser.errors.generic',
      onReset: (): void => {
        inviteLink.value = undefined;
        inviteLinkCopied.value = false;
        emailSent.value = false;
      },
      onStepResponse: (response: InviteUserFlowResponse): void => {
        if (response.data?.additionalData?.['inviteLink']) {
          const linkValue: string = response.data.additionalData['inviteLink'];
          inviteLink.value = linkValue;
          props.onInviteLinkGenerated?.(linkValue, response.executionId ?? '');
        }

        if (response.data?.additionalData?.['emailSent'] === 'true') {
          emailSent.value = true;
        }
      },
      props,
      start: () => START,
    });
    const {resetFlow} = flow;

    // ── Copy invite link ──

    const copyInviteLink = async (): Promise<void> => {
      if (!inviteLink.value) return;
      try {
        await navigator.clipboard.writeText(inviteLink.value);
        inviteLinkCopied.value = true;
        setTimeout(() => {
          inviteLinkCopied.value = false;
        }, 3000);
      } catch {
        const textArea: HTMLTextAreaElement = document.createElement('textarea');
        textArea.value = inviteLink.value;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        inviteLinkCopied.value = true;
        setTimeout(() => {
          inviteLinkCopied.value = false;
        }, 3000);
      }
    };

    // ── Render ──

    return (): VNode | null => {
      const containerClass: string = [withVendorCSSClassPrefix('invite-user'), props.className]
        .filter(Boolean)
        .join(' ');

      const isInviteGenerated = !!inviteLink.value;
      const isEmailSent: boolean = emailSent.value;

      // Scoped slot
      if (slots['default']) {
        const step: InviteFlowRenderProps = flow.renderProps();
        const renderProps: BaseInviteUserRenderProps = {
          ...step,
          copyInviteLink,
          flowId: step.executionId,
          inviteLink: inviteLink.value,
          inviteLinkCopied: inviteLinkCopied.value,
          isEmailSent,
          isInviteGenerated,
        };
        return h('div', {class: containerClass}, slots['default'](renderProps));
      }

      // Email sent confirmation
      if (props.isInitialized && isInviteGenerated && isEmailSent) {
        return h(Card, {class: containerClass, variant: props.variant}, () => [
          h('div', {style: 'padding:1rem'}, [
            h(Typography, {variant: 'h5'}, () => 'Invite Email Sent!'),
            h(
              Alert,
              {style: 'margin-top:1rem', variant: 'success'},
              () =>
                'An invitation email has been sent successfully. The user can complete their registration using the link in the email.',
            ),
            h('div', {style: 'display:flex;gap:0.5rem;margin-top:1.5rem'}, [
              h(Button, {onClick: resetFlow, variant: 'outline'}, () => 'Invite Another User'),
            ]),
          ]),
        ]);
      }

      // Invite link generated — show copy link
      if (props.isInitialized && isInviteGenerated && inviteLink.value) {
        return h(Card, {class: containerClass, variant: props.variant}, () => [
          h('div', {style: 'padding:1rem'}, [
            h(Typography, {variant: 'h5'}, () => 'Invite Link Generated!'),
            h(
              Alert,
              {style: 'margin-top:1rem', variant: 'success'},
              () => 'Share this link with the user to complete their registration.',
            ),
            h('div', {style: 'margin-top:1rem'}, [
              h(Typography, {style: 'margin-bottom:0.5rem', variant: 'body2'}, () => 'Invite Link'),
              h(
                'div',
                {
                  style:
                    'display:flex;align-items:center;gap:0.5rem;padding:0.75rem;background:var(--thunderid-color-background-secondary,#f5f5f5);border-radius:4px;word-break:break-all',
                },
                [
                  h(Typography, {style: 'flex:1', variant: 'body2'}, () => inviteLink.value),
                  h(Button, {onClick: copyInviteLink, size: 'small', variant: 'outline'}, () =>
                    inviteLinkCopied.value ? 'Copied!' : 'Copy',
                  ),
                ],
              ),
            ]),
            h('div', {style: 'display:flex;gap:0.5rem;margin-top:1.5rem'}, [
              h(Button, {onClick: resetFlow, variant: 'outline'}, () => 'Invite Another User'),
            ]),
          ]),
        ]);
      }

      return renderInviteFlowCard(flow, {
        className: containerClass,
        fetchAuthFlows: props.fetchAuthFlows,
        fetchUsers: props.fetchUsers,
        fetchUserTypes: props.fetchUserTypes,
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

export default BaseInviteUser;

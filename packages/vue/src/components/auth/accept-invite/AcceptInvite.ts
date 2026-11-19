// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError, resolveResourceEndpoint} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h, inject} from 'vue';
import BaseAcceptInvite from './BaseAcceptInvite';
import type {AcceptInviteFlowResponse, BaseAcceptInviteRenderProps} from './BaseAcceptInvite';
import {THUNDERID_KEY} from '../../../keys';
import type {ThunderIDContext} from '../../../models/contexts';

export type AcceptInviteRenderProps = BaseAcceptInviteRenderProps;

/**
 * Helper to extract query parameters from URL.
 */
const getUrlParams = (): {executionId?: string; inviteToken?: string} => {
  if (typeof window === 'undefined') return {};
  const params: URLSearchParams = new URLSearchParams(window.location.search);
  return {
    // `flowId` is what links carried before the execution ID replaced it.
    executionId: params.get('executionId') || params.get('flowId') || undefined,
    inviteToken: params.get('inviteToken') || undefined,
  };
};

/**
 * AcceptInvite — end-user component for accepting an invite and setting a password.
 *
 * Automatically extracts executionId and inviteToken from URL, validates the token,
 * and delegates rendering to BaseAcceptInvite.
 */
const AcceptInvite: Component = defineComponent({
  name: 'AcceptInvite',
  props: {
    baseUrl: {default: undefined, type: String},
    className: {default: '', type: String},
    executionId: {default: undefined, type: String},
    /** @deprecated Use `executionId`. */
    flowId: {default: undefined, type: String},
    inviteToken: {default: undefined, type: String},
    onComplete: {default: undefined, type: Function as PropType<() => void>},
    onError: {default: undefined, type: Function as PropType<(error: Error) => void>},
    onFlowChange: {
      default: undefined,
      type: Function as PropType<(response: AcceptInviteFlowResponse) => void>,
    },
    onGoToSignIn: {default: undefined, type: Function as PropType<() => void>},
    showSubtitle: {default: true, type: Boolean},
    showTitle: {default: true, type: Boolean},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    variant: {default: 'outlined', type: String as PropType<'outlined' | 'elevated'>},
  },
  setup(props: any, {slots}: SetupContext): () => VNode | null {
    const urlParams: {executionId?: string; inviteToken?: string} = getUrlParams();
    const link: {baseUrl?: string; executionId?: string; flowId?: string} = props;
    const executionId: string | undefined = link.executionId ?? link.flowId ?? urlParams.executionId;
    const inviteToken: string | undefined = props.inviteToken || urlParams.inviteToken;

    // The steps go to the provider's flow endpoint unless `baseUrl` names another server. Outside a provider, they go
    // to this page's origin.
    const thunderIDContext: ThunderIDContext | null = inject(THUNDERID_KEY, null);
    const flowExecuteUrl: string = link.baseUrl
      ? `${link.baseUrl}/flow/execute`
      : (resolveResourceEndpoint('flowExecute', {endpoints: thunderIDContext?.endpoints}) ??
        `${thunderIDContext?.baseUrl ?? (typeof window !== 'undefined' ? window.location.origin : '')}/flow/execute`);

    const handleSubmit = async (payload: Record<string, any>): Promise<AcceptInviteFlowResponse> => {
      const response: Response = await fetch(flowExecuteUrl, {
        body: JSON.stringify({...payload, verbose: true}),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });

      if (!response.ok) {
        const errorText: string = await response.text();
        // ThunderIDAPIError resolves the raw API body into a readable message instead of leaking it.
        throw new ThunderIDAPIError(
          errorText,
          'AcceptInvite-ResponseError-001',
          'vue',
          response.status,
          response.statusText,
        );
      }

      return response.json();
    };

    return (): VNode | null =>
      h(
        BaseAcceptInvite,
        {
          className: props.className,
          executionId,
          inviteToken,
          onComplete: props.onComplete,
          onError: props.onError,
          onFlowChange: props.onFlowChange,
          onGoToSignIn: props.onGoToSignIn,
          onSubmit: handleSubmit,
          showSubtitle: props.showSubtitle,
          showTitle: props.showTitle,
          size: props.size,
          variant: props.variant,
        },
        slots['default'] ? {default: (renderProps: any) => slots['default']!(renderProps)} : undefined,
      );
  },
});

export default AcceptInvite;

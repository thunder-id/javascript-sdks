// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowType} from '@thunderid/browser';
import type {FetchUsers} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseInviteUser from './BaseInviteUser';
import type {BaseInviteUserRenderProps, InviteUserFlowResponse} from './BaseInviteUser';
import useFetchUsers from '../../../composables/useFetchUsers';
import useThunderID from '../../../composables/useThunderID';

export type InviteUserRenderProps = BaseInviteUserRenderProps;

/**
 * InviteUser — admin invite component using authenticated ThunderID SDK context.
 */
const InviteUser: Component = defineComponent({
  name: 'InviteUser',
  props: {
    className: {default: '', type: String},
    onError: {default: undefined, type: Function as PropType<(error: Error) => void>},
    onFlowChange: {
      default: undefined,
      type: Function as PropType<(response: InviteUserFlowResponse) => void>,
    },
    onInviteLinkGenerated: {
      default: undefined,
      type: Function as PropType<(inviteLink: string, flowId: string) => void>,
    },
    showSubtitle: {default: true, type: Boolean},
    showTitle: {default: true, type: Boolean},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    variant: {default: 'outlined', type: String as PropType<'outlined' | 'elevated'>},
  },
  setup(props: any, {slots}: SetupContext): () => VNode | null {
    const {http, baseUrl, isInitialized} = useThunderID();

    const fetchUsers: FetchUsers = useFetchUsers();

    const handleInitialize = async (payload: Record<string, any>): Promise<InviteUserFlowResponse> => {
      const response: any = await http.request({
        data: {...payload, flowType: EmbeddedFlowType.UserOnboarding, verbose: true},
        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
        method: 'POST',
        url: `${baseUrl}/flow/execute`,
      } as any);
      return response.data as InviteUserFlowResponse;
    };

    const handleSubmit = async (payload: Record<string, any>): Promise<InviteUserFlowResponse> => {
      const response: any = await http.request({
        data: {...payload, verbose: true},
        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
        method: 'POST',
        url: `${baseUrl}/flow/execute`,
      } as any);
      return response.data as InviteUserFlowResponse;
    };

    return (): VNode | null =>
      h(
        BaseInviteUser,
        {
          className: props.className,
          fetchUsers,
          isInitialized: isInitialized?.value ?? false,
          onError: props.onError,
          onFlowChange: props.onFlowChange,
          onInitialize: handleInitialize,
          onInviteLinkGenerated: props.onInviteLinkGenerated,
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

export default InviteUser;

// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowType} from '@thunderid/browser';
import type {FetchAuthFlows, FetchUsers, FetchUserTypes} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseInviteUser from './BaseInviteUser';
import type {BaseInviteUserRenderProps, InviteUserFlowResponse} from './BaseInviteUser';
import useFetchAuthFlows from '../../../composables/auth/useFetchAuthFlows';
import useFetchUsers from '../../../composables/management/useFetchUsers';
import useFetchUserTypes from '../../../composables/management/useFetchUserTypes';
import useFlowExecute from '../../../composables/auth/useFlowExecute';
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
    const {isInitialized} = useThunderID();
    const execute: (payload: Record<string, any>) => Promise<InviteUserFlowResponse> =
      useFlowExecute<InviteUserFlowResponse>();

    const fetchAuthFlows: FetchAuthFlows = useFetchAuthFlows();
    const fetchUsers: FetchUsers = useFetchUsers();
    const fetchUserTypes: FetchUserTypes = useFetchUserTypes();

    const handleInitialize = (payload: Record<string, any>): Promise<InviteUserFlowResponse> =>
      execute({...payload, flowType: EmbeddedFlowType.UserOnboarding, verbose: true});

    const handleSubmit = (payload: Record<string, any>): Promise<InviteUserFlowResponse> =>
      execute({...payload, verbose: true});

    return (): VNode | null =>
      h(
        BaseInviteUser,
        {
          className: props.className,
          fetchAuthFlows,
          fetchUsers,
          fetchUserTypes,
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

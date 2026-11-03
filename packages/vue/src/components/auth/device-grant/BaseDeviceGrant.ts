// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix, type EmbeddedFlowComponent} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import useI18n from '../../../composables/useI18n';
import Card from '../../primitives/Card';
import Typography from '../../primitives/Typography';
import BaseSignIn from '../sign-in/BaseSignIn';
import type {BaseSignInRenderProps, BaseSignInProps} from '../sign-in/BaseSignIn';

export type DeviceGrantResult = 'success' | 'failure' | null;

export interface BaseDeviceGrantRenderProps extends BaseSignInRenderProps {
  result: DeviceGrantResult;
}

export interface BaseDeviceGrantProps extends Omit<BaseSignInProps, 'components' | 'initialValues' | 'onSubmit'> {
  components: EmbeddedFlowComponent[];
  initialValues?: Record<string, string>;
  onSubmit: NonNullable<BaseSignInProps['onSubmit']>;
  result?: DeviceGrantResult;
  completeMessage?: string;
  completeDescription?: string;
  failedMessage?: string;
  failedDescription?: string;
}

/** Renders Device Grant flow steps and terminal status without owning flow execution. */
const BaseDeviceGrant: Component = defineComponent({
  name: 'BaseDeviceGrant',
  props: {
    components: {default: (): EmbeddedFlowComponent[] => [], type: Array as PropType<EmbeddedFlowComponent[]>},
    additionalData: {default: (): Record<string, unknown> => ({}), type: Object as PropType<Record<string, unknown>>},
    initialValues: {default: (): Record<string, string> => ({}), type: Object as PropType<Record<string, string>>},
    onSubmit: {required: true, type: Function as PropType<BaseDeviceGrantProps['onSubmit']>},
    result: {default: null, type: String as PropType<DeviceGrantResult>},
    className: {default: '', type: String},
    variant: {default: 'flat', type: String as PropType<'elevated' | 'outlined' | 'flat'>},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    isLoading: {default: false, type: Boolean},
    isTimeoutDisabled: {default: false, type: Boolean},
    error: {default: null, type: Object as PropType<Error | null>},
    serverFieldErrors: {default: null, type: Array as PropType<BaseDeviceGrantProps['serverFieldErrors']>},
    completeMessage: {default: undefined, type: String},
    completeDescription: {default: undefined, type: String},
    failedMessage: {default: undefined, type: String},
    failedDescription: {default: undefined, type: String},
  },
  setup(props: Readonly<BaseDeviceGrantProps>, {slots, attrs}: SetupContext): () => VNode {
    const {t} = useI18n();

    return (): VNode => {
      if (props.result && props.components.length === 0) {
        const success: boolean = props.result === 'success' && !props.error;
        const failedMessage: string = props.failedMessage ?? t('deviceGrant.messages.failed');
        const title: string = success ? (props.completeMessage ?? t('deviceGrant.messages.complete')) : failedMessage;
        const description: string = success
          ? (props.completeDescription ?? t('deviceGrant.messages.completeDescription'))
          : !props.error || props.error.message === failedMessage
            ? (props.failedDescription ?? t('deviceGrant.messages.failedDescription'))
            : props.error.message;
        return h(
          Card,
          {
            ...attrs,
            class: [withVendorCSSClassPrefix('devicegrant__terminal'), props.className].filter(Boolean).join(' '),
            'data-testid': 'device-grant-result',
            variant: props.variant,
          },
          () => [
            h(
              Typography,
              {
                class: [
                  withVendorCSSClassPrefix('devicegrant__terminal-title'),
                  withVendorCSSClassPrefix(`devicegrant__terminal-title--${success ? 'success' : 'failure'}`),
                ].join(' '),
                component: 'h2',
                variant: 'h6',
              },
              () => title,
            ),
            h(
              Typography,
              {
                class: withVendorCSSClassPrefix('devicegrant__terminal-description'),
                component: 'p',
                variant: 'caption',
              },
              () => description,
            ),
          ],
        );
      }

      return h(
        BaseSignIn,
        {
          ...attrs,
          className: props.className,
          components: props.components,
          additionalData: props.additionalData,
          error: props.error,
          initialValues: props.initialValues,
          isLoading: props.isLoading,
          isTimeoutDisabled: props.isTimeoutDisabled,
          onSubmit: props.onSubmit,
          serverFieldErrors: props.serverFieldErrors,
          size: props.size,
          variant: props.variant,
        },
        slots['default']
          ? {
              default: (renderProps: BaseSignInRenderProps) =>
                slots['default']?.({...renderProps, result: props.result}),
            }
          : undefined,
      );
    };
  },
});

export default BaseDeviceGrant;

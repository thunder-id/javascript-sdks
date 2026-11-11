// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowResponseType, EmbeddedFlowType} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseSignUp from './BaseSignUp';
import type {BaseSignUpRenderProps} from './BaseSignUp';
import useThunderID from '../../../composables/useThunderID';

export type SignUpRenderProps = BaseSignUpRenderProps;

/**
 * SignUp — embedded sign-up component that handles API calls and delegates UI to BaseSignUp.
 */
const SignUp: Component = defineComponent({
  name: 'SignUp',
  props: {
    /**
     * Where to send the user once the flow expires, e.g. the application's URL. With it, an expired flow counts
     * down and redirects there. Without it, the flow is started again in place.
     */
    afterFlowExpiredUrl: {default: undefined, type: String},
    afterSignUpUrl: {default: undefined, type: String},
    buttonClassName: {default: '', type: String},
    className: {default: '', type: String},
    errorClassName: {default: '', type: String},
    inputClassName: {default: '', type: String},
    messageClassName: {default: '', type: String},
    onComplete: {default: undefined, type: Function as PropType<(response: any) => void>},
    onError: {default: undefined, type: Function as PropType<(error: Error) => void>},
    shouldRedirectAfterSignUp: {default: true, type: Boolean},
    showSubtitle: {default: true, type: Boolean},
    showTitle: {default: true, type: Boolean},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    variant: {default: 'outlined', type: String as PropType<'elevated' | 'outlined' | 'flat'>},
  },
  setup(props: any, {slots}: SetupContext): () => VNode | null {
    const {signUp, isInitialized, applicationId, scopes} = useThunderID();

    const handleInitialize = async (payload?: any): Promise<any> => {
      const urlParams: URLSearchParams = new URL(window.location.href).searchParams;
      const applicationIdFromUrl: string | null = urlParams.get('applicationId');
      const effectiveApplicationId: string | undefined = applicationId || applicationIdFromUrl || undefined;

      const initialPayload: any = payload || {
        flowType: EmbeddedFlowType.Registration,
        ...(effectiveApplicationId && {applicationId: effectiveApplicationId}),
        ...(scopes && {scopes}),
      };

      return await signUp(initialPayload);
    };

    const handleOnSubmit = async (payload: any): Promise<any> => await signUp(payload);

    const handleComplete = (response: any): void => {
      props.onComplete?.(response);

      const oauthRedirectUrl: string | undefined = response?.redirectUrl;
      if (props.shouldRedirectAfterSignUp && oauthRedirectUrl) {
        window.location.href = oauthRedirectUrl;
        return;
      }

      if (
        props.shouldRedirectAfterSignUp &&
        response?.type !== EmbeddedFlowResponseType.Redirection &&
        props.afterSignUpUrl &&
        !response?.assertion
      ) {
        window.location.href = props.afterSignUpUrl;
      }

      if (
        props.shouldRedirectAfterSignUp &&
        response?.type === EmbeddedFlowResponseType.Redirection &&
        response?.data?.redirectURL &&
        !response.data.redirectURL.includes('oauth') &&
        !response.data.redirectURL.includes('auth')
      ) {
        window.location.href = response.data.redirectURL;
      }
    };

    return (): VNode | null =>
      h(
        BaseSignUp,
        {
          afterFlowExpiredUrl: props.afterFlowExpiredUrl,
          afterSignUpUrl: props.afterSignUpUrl,
          buttonClassName: props.buttonClassName,
          className: props.className,
          errorClassName: props.errorClassName,
          inputClassName: props.inputClassName,
          isInitialized: isInitialized?.value ?? false,
          messageClassName: props.messageClassName,
          onComplete: handleComplete,
          onError: props.onError,
          onInitialize: handleInitialize,
          onSubmit: handleOnSubmit,
          showSubtitle: props.showSubtitle,
          showTitle: props.showTitle,
          size: props.size,
          variant: props.variant,
        },
        slots['default'] ? {default: (renderProps: any) => slots['default']!(renderProps)} : undefined,
      );
  },
});

export default SignUp;

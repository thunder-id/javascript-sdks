// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedFlowComponent,
  EmbeddedSignInFlowRequest,
  EmbeddedSignInFlowResponse,
  EmbeddedSignInFlowStatus,
  EmbeddedSignInFlowType,
  FieldError,
  ReauthenticationOptions,
  ThunderIDRuntimeError,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type VNode,
  Teleport,
  defineComponent,
  h,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';
import useFlowMeta from '../../../composables/useFlowMeta';
import useI18n from '../../../composables/useI18n';
import {extractErrorMessage, normalizeFlowResponse} from '../../../utils/flowTransformer';
import {handlePasskeyAuthentication} from '../../../utils/passkey';
import Button from '../../primitives/Button/Button';
import Typography from '../../primitives/Typography/Typography';
import BaseSignIn from '../sign-in/BaseSignIn';

interface FlowStep {
  additionalData: Record<string, unknown>;
  challengeToken?: string;
  components: EmbeddedFlowComponent[];
  executionId: string;
}

type Execute = (
  payload: EmbeddedSignInFlowRequest,
  options: ReauthenticationOptions,
) => Promise<EmbeddedSignInFlowResponse>;

/**
 * Signs the signed-in user in again in a dialog, by running the sign-in flow with `maxAge`, for a
 * session from an embedded sign-in flow. The provider shows it from `reauthenticate`. Each step is
 * drawn with `BaseSignIn`; a passkey step asks the browser for the passkey. A sign-in option that
 * leaves the page, such as a federated sign-in, is not offered here: the user is told to choose
 * another one; a flow that offers nothing else fails with `VUE-REAUTHENTICATION-UO01`. A flow that cannot
 * go on starts again once with its message shown; when the new one cannot go on either, the re-sign-in
 * fails with `VUE-REAUTHENTICATION-FE01`.
 *
 * @internal
 */
const ReauthenticationDialog: Component = defineComponent({
  name: 'ReauthenticationDialog',
  props: {
    /** Runs a step of the re-sign-in flow, as the client's `executeReauthenticationFlow` does. */
    execute: {required: true, type: Function as PropType<Execute>},
    /** How recent, in seconds, the sign-in must be. */
    maxAge: {default: undefined, type: Number},
    /** Called when the user closes the dialog. */
    onCancel: {required: true, type: Function as PropType<() => void>},
    /** Called once the flow has completed and the session holds its tokens. */
    onComplete: {required: true, type: Function as PropType<() => void>},
    /** Called when the flow cannot go on, such as when a different user signed in. */
    onError: {required: true, type: Function as PropType<(error: unknown) => void>},
  },
  setup(props: {
    execute: Execute;
    maxAge?: number;
    onCancel: () => void;
    onComplete: () => void;
    onError: (error: unknown) => void;
  }) {
    const {t} = useI18n();
    const {meta} = useFlowMeta();
    const px: typeof withVendorCSSClassPrefix = withVendorCSSClassPrefix;
    const step: Ref<FlowStep | null> = ref(null);
    const error: Ref<Error | null> = ref(null);
    const serverFieldErrors: Ref<FieldError[] | null> = ref(null);
    const dialogRef: Ref<HTMLElement | null> = ref(null);

    const run = (payload: EmbeddedSignInFlowRequest): Promise<EmbeddedSignInFlowResponse> =>
      props.execute(payload, {maxAge: props.maxAge});

    const start = async (): Promise<void> => {
      await apply(await run({}), true);
    };

    // Starts the flow again after one that cannot go on, keeping the message on screen. A new flow that
    // cannot go on either ends the re-sign-in, so the dialog never loops.
    const restart = async (message: string, isStart: boolean): Promise<void> => {
      if (isStart) {
        props.onError(new ThunderIDRuntimeError(message, 'VUE-REAUTHENTICATION-FE01', 'vue'));

        return;
      }

      await start();
      error.value = new Error(message);
    };

    const apply = async (response: EmbeddedSignInFlowResponse, isStart: boolean): Promise<void> => {
      if (response.flowStatus === EmbeddedSignInFlowStatus.Complete) {
        props.onComplete();

        return;
      }

      if (response.type === EmbeddedSignInFlowType.Redirection) {
        if (isStart) {
          props.onError(
            new ThunderIDRuntimeError(
              'The sign-in flow offers only a sign-in option that leaves the page.',
              'VUE-REAUTHENTICATION-UO01',
              'vue',
            ),
          );

          return;
        }

        // The redirect would lose the change waiting to be saved, so the flow starts again.
        await restart(t('user.reauthentication.unsupported_option.error'), false);

        return;
      }

      const additionalData: Record<string, unknown> =
        (response.data?.additionalData as Record<string, unknown> | undefined) ?? {};
      const passkeyChallenge: unknown = additionalData['passkeyChallenge'];

      if (typeof passkeyChallenge === 'string' && response.executionId) {
        let credential: {
          id: string;
          response: {authenticatorData: string; clientDataJSON: string; signature: string; userHandle: string};
        };

        try {
          credential = JSON.parse(await handlePasskeyAuthentication(passkeyChallenge)) as typeof credential;
        } catch {
          // The user cancelled the passkey prompt, or the browser refused it.
          await restart(t('user.reauthentication.failed.error'), isStart);

          return;
        }

        step.value = null;

        await apply(
          await run({
            executionId: response.executionId,
            inputs: {
              authenticatorData: credential.response.authenticatorData,
              clientDataJSON: credential.response.clientDataJSON,
              credentialId: credential.id,
              signature: credential.response.signature,
              userHandle: credential.response.userHandle,
            },
            ...(response.challengeToken ? {challengeToken: response.challengeToken} : {}),
          }),
          false,
        );

        return;
      }

      // A flow that ended, or an error with no step left to show, such as a failed passkey, starts again.
      if (
        response.flowStatus === EmbeddedSignInFlowStatus.Error &&
        (!response.executionId || !step.value?.components.length)
      ) {
        await restart(extractErrorMessage(response, t), isStart);

        return;
      }

      const normalized: {additionalData: Record<string, unknown>; components: EmbeddedFlowComponent[]} =
        response.flowStatus === EmbeddedSignInFlowStatus.Error
          ? {additionalData: step.value?.additionalData ?? {}, components: step.value?.components ?? []}
          : normalizeFlowResponse(response, t, {resolveTranslations: false}, meta.value);

      step.value = {
        additionalData: normalized.additionalData,
        challengeToken: response.challengeToken,
        components: normalized.components,
        executionId: response.executionId,
      };

      const fieldErrors: FieldError[] | undefined = (response.data as {fieldErrors?: FieldError[]} | undefined)
        ?.fieldErrors;

      if (fieldErrors && fieldErrors.length > 0) {
        serverFieldErrors.value = fieldErrors;
      }

      if (response.error || response.flowStatus === EmbeddedSignInFlowStatus.Error) {
        error.value = new Error(extractErrorMessage(response, t));
      }
    };

    const submit = async (payload: EmbeddedSignInFlowRequest): Promise<void> => {
      const current: FlowStep | null = step.value;

      if (!current) {
        return;
      }

      error.value = null;
      serverFieldErrors.value = null;

      try {
        await apply(
          await run({
            ...payload,
            executionId: current.executionId,
            ...(current.challengeToken ? {challengeToken: current.challengeToken} : {}),
          }),
          false,
        );
      } catch (caughtError: unknown) {
        props.onError(caughtError);
      }
    };

    // Each dialog gets its own heading and description ids, and focus goes back where it was when the
    // dialog closes.
    const idSuffix: string = Math.random().toString(36).slice(2, 10);
    const headingId = `${px('reauthentication')}-heading-${idSuffix}`;
    const descriptionId = `${px('reauthentication')}-description-${idSuffix}`;
    let previousFocus: HTMLElement | null = null;

    // Listens on the document, since a new flow step can remove the focused control: Escape closes the
    // dialog, and Tab and Shift+Tab stay inside it.
    const handleKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        props.onCancel();

        return;
      }

      if (event.key !== 'Tab' || !dialogRef.value) return;

      const focusables: HTMLElement[] = Array.from(
        dialogRef.value.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusables.length === 0) return;

      const first: HTMLElement = focusables[0];
      const last: HTMLElement = focusables[focusables.length - 1];
      const inside: boolean = dialogRef.value.contains(document.activeElement);

      if (
        event.shiftKey &&
        (!inside || document.activeElement === first || document.activeElement === dialogRef.value)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    // Brings focus back into the dialog when it moves to the page behind it.
    const handleFocusIn = (event: FocusEvent): void => {
      if (dialogRef.value && event.target instanceof Node && !dialogRef.value.contains(event.target)) {
        dialogRef.value.focus();
      }
    };

    onUnmounted((): void => {
      document.removeEventListener('keydown', handleKeydown, true);
      document.removeEventListener('focusin', handleFocusIn);
      previousFocus?.focus();
    });

    onMounted((): void => {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      document.addEventListener('keydown', handleKeydown, true);
      document.addEventListener('focusin', handleFocusIn);
      void nextTick((): void => dialogRef.value?.focus());
      start().catch(props.onError);
    });

    return (): VNode =>
      h(Teleport, {to: 'body'}, [
        h(
          'div',
          {
            class: px('reauthentication__overlay'),
            onClick: (event: MouseEvent): void => {
              if (event.target === event.currentTarget) props.onCancel();
            },
          },
          [
            h(
              'div',
              {
                'aria-describedby': descriptionId,
                'aria-labelledby': headingId,
                'aria-modal': 'true',
                class: px('reauthentication__dialog'),
                ref: dialogRef,
                role: 'dialog',
                tabindex: -1,
              },
              [
                h('div', {class: px('reauthentication__header')}, [
                  h(Typography, {id: headingId, variant: 'h6'}, () => t('user.reauthentication.heading')),
                  h(
                    Button,
                    {
                      'aria-label': t('user.reauthentication.buttons.close.text'),
                      onClick: (): void => props.onCancel(),
                      size: 'small',
                      variant: 'text',
                    },
                    () => '×',
                  ),
                ]),
                h(Typography, {id: descriptionId, variant: 'body2'}, () => t('user.reauthentication.description')),
                h(BaseSignIn, {
                  additionalData: step.value?.additionalData ?? {},
                  components: step.value?.components ?? [],
                  error: error.value,
                  isLoading: !step.value,
                  onSubmit: submit,
                  serverFieldErrors: serverFieldErrors.value,
                  variant: 'flat',
                }),
              ],
            ),
          ],
        ),
      ]);
  },
});

export default ReauthenticationDialog;

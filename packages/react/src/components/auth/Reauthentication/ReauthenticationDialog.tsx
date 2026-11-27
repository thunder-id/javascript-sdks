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
  bem,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {FC, ReactElement, useEffect, useRef, useState} from 'react';
import useTheme from '../../../contexts/Theme/useTheme';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useTranslation from '../../../hooks/useTranslation';
import {css, cx} from '../../../styles/emotion';
import {extractErrorMessage, normalizeFlowResponse} from '../../../utils/flowTransformer';
import {handlePasskeyAuthentication} from '../../../utils/passkey';
import DialogPrimitive from '../../primitives/Dialog/Dialog';
import BaseSignIn from '../SignIn/BaseSignIn';

export interface ReauthenticationDialogProps {
  /**
   * Runs a step of the re-sign-in flow, as the client's `executeReauthenticationFlow` does.
   */
  execute: (
    payload: EmbeddedSignInFlowRequest,
    options: ReauthenticationOptions,
  ) => Promise<EmbeddedSignInFlowResponse>;
  /**
   * How recent, in seconds, the sign-in must be.
   */
  maxAge?: number;
  /**
   * Called when the user closes the dialog.
   */
  onCancel: () => void;
  /**
   * Called once the flow has completed and the session holds its tokens.
   */
  onComplete: () => void;
  /**
   * Called when the flow cannot go on, such as when a different user signed in.
   */
  onError: (error: unknown) => void;
}

interface FlowStep {
  additionalData: Record<string, unknown>;
  challengeToken?: string;
  components: EmbeddedFlowComponent[];
  executionId: string;
}

/**
 * Signs the signed-in user in again in a dialog, by running the sign-in flow with `maxAge`, for a
 * session from an embedded sign-in flow. The provider shows it from `reauthenticate`. Each step is
 * drawn with `BaseSignIn`; a passkey step asks the browser for the passkey. A sign-in option that
 * leaves the page, such as a federated sign-in, is not offered here: the user is told to choose
 * another one; a flow that offers nothing else fails with `REACT-REAUTHENTICATION-UO01`. A flow that cannot
 * go on starts again once with its message shown; when the new one cannot go on either, the re-sign-in
 * fails with `REACT-REAUTHENTICATION-FE01`.
 *
 * @internal
 */
const ReauthenticationDialog: FC<ReauthenticationDialogProps> = ({
  execute,
  maxAge = undefined,
  onCancel,
  onComplete,
  onError,
}: ReauthenticationDialogProps): ReactElement => {
  const {meta} = useThunderID();
  const {t} = useTranslation();
  const {theme} = useTheme();
  const bodyClass: string = css`
    display: flex;
    flex-direction: column;
    gap: calc(${theme.vars.spacing.unit} * 2);
    padding: 0 calc(${theme.vars.spacing.unit} * 4.5) calc(${theme.vars.spacing.unit} * 3);
  `;
  const [step, setStep] = useState<FlowStep | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldError[] | null>(null);
  // Set once, so a second effect run in development does not start a second flow.
  const startedRef = useRef<boolean>(false);

  const start = async (): Promise<void> => {
    await apply(await execute({}, {maxAge}), true);
  };

  const submit = async (payload: EmbeddedSignInFlowRequest): Promise<void> => {
    if (!step) {
      return;
    }

    setError(null);
    setServerFieldErrors(null);

    await apply(
      await execute(
        {
          ...payload,
          executionId: step.executionId,
          ...(step.challengeToken ? {challengeToken: step.challengeToken} : {}),
        },
        {maxAge},
      ),
      false,
    );
  };

  // Starts the flow again after one that cannot go on, keeping the message on screen. A new flow that
  // cannot go on either ends the re-sign-in, so the dialog never loops.
  const restart = async (message: string, isStart: boolean): Promise<void> => {
    if (isStart) {
      onError(new ThunderIDRuntimeError(message, 'REACT-REAUTHENTICATION-FE01', 'react'));

      return;
    }

    await start();
    setError(new Error(message));
  };

  const apply = async (response: EmbeddedSignInFlowResponse, isStart: boolean): Promise<void> => {
    if (response.flowStatus === EmbeddedSignInFlowStatus.Complete) {
      onComplete();

      return;
    }

    if (response.type === EmbeddedSignInFlowType.Redirection) {
      if (isStart) {
        onError(
          new ThunderIDRuntimeError(
            'The sign-in flow offers only a sign-in option that leaves the page.',
            'REACT-REAUTHENTICATION-UO01',
            'react',
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

      setStep({
        additionalData,
        challengeToken: response.challengeToken,
        components: [],
        executionId: response.executionId,
      });
      await apply(
        await execute(
          {
            executionId: response.executionId,
            inputs: {
              authenticatorData: credential.response.authenticatorData,
              clientDataJSON: credential.response.clientDataJSON,
              credentialId: credential.id,
              signature: credential.response.signature,
              userHandle: credential.response.userHandle,
            },
            ...(response.challengeToken ? {challengeToken: response.challengeToken} : {}),
          },
          {maxAge},
        ),
        false,
      );

      return;
    }

    // A flow that ended, or an error with no step left to show, such as a failed passkey, starts again.
    if (response.flowStatus === EmbeddedSignInFlowStatus.Error && (!response.executionId || !step?.components.length)) {
      await restart(extractErrorMessage(response, t), isStart);

      return;
    }

    const normalized: {additionalData: Record<string, unknown>; components: EmbeddedFlowComponent[]} =
      response.flowStatus === EmbeddedSignInFlowStatus.Error
        ? {additionalData: step?.additionalData ?? {}, components: step?.components ?? []}
        : normalizeFlowResponse(response, t, {resolveTranslations: false}, meta);

    setStep({
      additionalData: normalized.additionalData,
      challengeToken: response.challengeToken,
      components: normalized.components,
      executionId: response.executionId,
    });

    const fieldErrors: FieldError[] | undefined = (response.data as {fieldErrors?: FieldError[]} | undefined)
      ?.fieldErrors;

    if (fieldErrors && fieldErrors.length > 0) {
      setServerFieldErrors(fieldErrors);
    }

    if (response.error || response.flowStatus === EmbeddedSignInFlowStatus.Error) {
      setError(new Error(extractErrorMessage(response, t)));
    }
  };

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;
    start().catch(onError);
    // Runs once on mount: the dialog is mounted for one re-sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DialogPrimitive
      open
      onOpenChange={(isOpen: boolean): void => {
        if (!isOpen) onCancel();
      }}
    >
      <DialogPrimitive.Content aria-label={t('user.reauthentication.heading')}>
        <DialogPrimitive.Heading>{t('user.reauthentication.heading')}</DialogPrimitive.Heading>
        <div className={cx(withVendorCSSClassPrefix(bem('reauthentication', 'body')), bodyClass)}>
          <DialogPrimitive.Description>{t('user.reauthentication.description')}</DialogPrimitive.Description>
          <BaseSignIn
            additionalData={step?.additionalData ?? {}}
            components={step?.components ?? []}
            error={error}
            isLoading={!step}
            serverFieldErrors={serverFieldErrors}
            variant="default"
            onSubmit={(payload: EmbeddedSignInFlowRequest): Promise<void> => submit(payload).catch(onError)}
          />
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive>
  );
};

export default ReauthenticationDialog;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedRecoveryFlowRequest, EmbeddedRecoveryFlowResponse, EmbeddedFlowType} from '@thunderid/browser';
import {FC, PropsWithChildren, ReactElement, useCallback} from 'react';
import BaseRecovery, {BaseRecoveryProps} from './BaseRecovery';
import useThunderID from '../../../../contexts/ThunderID/useThunderID';
import useTranslation from '../../../../hooks/useTranslation';

export type RecoveryProps = PropsWithChildren<
  BaseRecoveryProps & {
    /**
     * URL query parameter name that carries the recovery token when the user lands via a recovery link.
     * When set and both `executionId` and this param are present in the URL, the component resumes the
     * existing flow instead of starting a new one.
     *
     * @example
     * // For a link like /recovery?executionId=xxx&recoveryToken=yyy
     * <Recovery tokenUrlParam="recoveryToken" />
     */
    tokenUrlParam?: string;
  }
>;

/**
 * Recovery component for ThunderIDV2 that provides an embedded account/password recovery flow.
 *
 * @example
 * ```tsx
 * // Default UI
 * <Recovery
 *   afterRecoveryUrl="/sign-in"
 *   onComplete={(response) => console.log('Recovery complete', response)}
 *   onError={(error) => console.error('Recovery failed', error)}
 * />
 *
 * // Custom UI with render props
 * <Recovery>
 *   {({ values, fieldErrors, handleInputChange, handleSubmit, isLoading, components }) => (
 *     <form onSubmit={(e) => { e.preventDefault(); handleSubmit(components[0], values); }}>
 *       ...
 *     </form>
 *   )}
 * </Recovery>
 * ```
 */
const Recovery: FC<RecoveryProps> = ({
  className,
  size = 'medium',
  afterRecoveryUrl,
  onError,
  onComplete,
  tokenUrlParam,
  children,
  ...rest
}: RecoveryProps): ReactElement => {
  const {recover, isInitialized, applicationId} = useThunderID();
  const {currentLanguage} = useTranslation();

  const handleInitialize: (payload?: EmbeddedRecoveryFlowRequest) => Promise<EmbeddedRecoveryFlowResponse> =
    useCallback(
      async (payload?: EmbeddedRecoveryFlowRequest): Promise<EmbeddedRecoveryFlowResponse> => {
        const urlParams: URLSearchParams = new URL(window.location.href).searchParams;
        const applicationIdFromUrl: string | null = urlParams.get('applicationId');
        const effectiveApplicationId: string | null = applicationId ?? applicationIdFromUrl;

        if (tokenUrlParam) {
          const executionId: string | null = urlParams.get('executionId');
          const tokenValue: string | null = urlParams.get(tokenUrlParam);

          if (executionId && tokenValue) {
            const resumePayload: EmbeddedRecoveryFlowRequest = {
              executionId,
              inputs: {[tokenUrlParam]: tokenValue},
            };
            return (await recover({...resumePayload, locale: currentLanguage})) as EmbeddedRecoveryFlowResponse;
          }
        }

        const initialPayload: EmbeddedRecoveryFlowRequest = payload ?? {
          flowType: EmbeddedFlowType.Recovery,
          ...(effectiveApplicationId && {applicationId: effectiveApplicationId}),
        };

        return (await recover({...initialPayload, locale: currentLanguage})) as EmbeddedRecoveryFlowResponse;
      },
      [applicationId, tokenUrlParam, recover, currentLanguage],
    );

  const handleOnSubmit: (payload: EmbeddedRecoveryFlowRequest) => Promise<EmbeddedRecoveryFlowResponse> = useCallback(
    async (payload: EmbeddedRecoveryFlowRequest): Promise<EmbeddedRecoveryFlowResponse> =>
      (await recover({...payload, locale: currentLanguage})) as EmbeddedRecoveryFlowResponse,
    [recover, currentLanguage],
  );

  const handleComplete: (response: EmbeddedRecoveryFlowResponse) => void = useCallback(
    (response: EmbeddedRecoveryFlowResponse): void => {
      onComplete?.(response);

      if (afterRecoveryUrl) {
        window.location.href = afterRecoveryUrl;
      }
    },
    [onComplete, afterRecoveryUrl],
  );

  return (
    <BaseRecovery
      afterRecoveryUrl={afterRecoveryUrl}
      onInitialize={handleInitialize}
      onSubmit={handleOnSubmit}
      onError={onError}
      onComplete={handleComplete}
      className={className}
      size={size}
      isInitialized={isInitialized}
      showTitle={true}
      showSubtitle={true}
      children={children}
      {...rest}
    />
  );
};

export default Recovery;

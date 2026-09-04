// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  CredentialConstants,
  CredentialUpdateErrorResult,
  PasswordPolicy,
  mapCredentialUpdateError,
  resolveChangePasswordPolicy,
  resolveResourceEndpoint,
  supportsPasswordCredential,
} from '@thunderid/browser';
import {FC, useMemo, useState} from 'react';
import BaseChangePassword, {BaseChangePasswordProps, ChangePasswordValues} from './BaseChangePassword';
import updateMeCredentials from '../../../api/updateMeCredentials';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useUser from '../../../contexts/User/useUser';
import useTranslation from '../../../hooks/useTranslation';

export interface ChangePasswordProps
  extends Omit<BaseChangePasswordProps, 'error' | 'fieldErrors' | 'loading' | 'onSubmit' | 'success'> {
  /**
   * Called after the password has been changed successfully.
   */
  onSuccess?: () => void;
}

/**
 * ChangePassword lets the signed-in user set a new password for their own account.
 *
 * It reads the password rules from the user schema already resolved by the ThunderID
 * provider, so it adds no network request beyond the write itself, and posts to
 * `/users/me/update-credentials` with the access token attached by the SDK's HTTP client.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ChangePassword onSuccess={() => toast('Password updated')} />
 *
 * // With an explicit rule instead of the schema-derived policy
 * <ChangePassword
 *   policy={{regex: '^.{12,}$'}}
 * />
 * ```
 */
const ChangePassword: FC<ChangePasswordProps> = ({
  onSuccess = undefined,
  policy = undefined,
  preferences = undefined,
  ...rest
}: ChangePasswordProps) => {
  const {baseUrl, endpoints, instanceId, preferences: contextPreferences} = useThunderID();
  const {userSchema} = useUser();

  const resolvedPreferences = useMemo(
    () => ({
      ...contextPreferences,
      ...preferences,
      user: {...contextPreferences?.user, ...preferences?.user},
    }),
    [contextPreferences, preferences],
  );
  const {t} = useTranslation(resolvedPreferences?.i18n);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const resolvedPolicy: PasswordPolicy = useMemo(
    () => resolveChangePasswordPolicy(userSchema, policy),
    [userSchema, policy],
  );

  const handleSubmit = async ({currentPassword, newPassword}: ChangePasswordValues): Promise<void> => {
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setLoading(true);

    try {
      await updateMeCredentials({
        baseUrl,
        currentPassword: currentPassword || undefined,
        instanceId,
        payload: {[CredentialConstants.PASSWORD]: newPassword},
        url: resolveResourceEndpoint('usersMeCredentials', {endpoints}),
      });

      setSuccess(true);
      onSuccess?.();
    } catch (caughtError: unknown) {
      const {field, message, messageKey}: CredentialUpdateErrorResult = mapCredentialUpdateError(caughtError);
      const text: string = message ?? t(messageKey);

      if (field) {
        setFieldErrors({[field]: text});
      } else {
        setError(text);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseChangePassword
      {...rest}
      error={error}
      fieldErrors={fieldErrors}
      loading={loading}
      policy={resolvedPolicy}
      preferences={resolvedPreferences}
      success={success}
      unavailable={!supportsPasswordCredential(userSchema)}
      onSubmit={(values: ChangePasswordValues): void => {
        void handleSubmit(values);
      }}
    />
  );
};

export default ChangePassword;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  CredentialConstants,
  CredentialUpdateErrorResult,
  PasswordPolicy,
  mapCredentialUpdateError,
  resolveChangeCredentialPolicy,
  resolveResourceEndpoint,
  supportsCredential,
} from '@thunderid/browser';
import {FC, useMemo, useState} from 'react';
import BaseChangeCredential, {BaseChangeCredentialProps, ChangePasswordValues} from './BaseChangeCredential';
import updateMeCredentials from '../../../api/account/updateMeCredentials';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useUser from '../../../contexts/User/useUser';
import useTranslation from '../../../hooks/useTranslation';

/**
 * Title-cases a credential attribute name for use as a display-name fallback when the schema
 * declares no `displayName` for it, e.g. `pin` -> `Pin`.
 */
const defaultDisplayName = (attribute: string): string => attribute.charAt(0).toUpperCase() + attribute.slice(1);

export interface ChangeCredentialProps
  extends Omit<
    BaseChangeCredentialProps,
    'credentialDisplayName' | 'error' | 'fieldErrors' | 'loading' | 'onSubmit' | 'success'
  > {
  /**
   * The credential attribute this instance manages, any attribute the user's entity type
   * schema declares `credential: true` (for example `password` or `pin`). Defaults to
   * `password`. Render the component once per credential to let a user manage more than one,
   * for example `<ChangeCredential />` for the password and
   * `<ChangeCredential attribute="pin" />` for a PIN.
   */
  attribute?: string;
  /**
   * Called after the credential has been changed successfully.
   */
  onSuccess?: () => void;
}

/**
 * ChangeCredential lets the signed-in user set a new value for one of their own credentials.
 *
 * It collects only a new value and its confirmation. The self-service credential write path
 * does not verify the account's existing value today, so this component does not ask for one;
 * once server-side current-value verification ships, that field returns without a breaking
 * change to this component's public props.
 *
 * It reads the applicable rules from the user schema already resolved by the ThunderID
 * provider, so it adds no network request beyond the write itself, and posts to
 * `/users/me/update-credentials` with the access token attached by the SDK's HTTP client.
 *
 * Defaults to managing the `password` credential. To manage a different one (for example a
 * PIN declared on the user type schema), set `attribute`; render the component once per
 * credential to let a user manage several. Every default label, placeholder and message is
 * built from the attribute's own `displayName` in the schema (`GET /users/me/meta`), so it
 * always matches whatever an admin named the attribute there; when the schema carries no
 * `displayName` for it, it falls back to the attribute name title-cased (`pin` -> `Pin`).
 * Override individual strings via `preferences.i18n` for full control (including other
 * languages) if the schema-derived name isn't the right fit.
 *
 * @example
 * ```tsx
 * // Basic usage, manages the password
 * <ChangeCredential onSuccess={() => toast('Password updated')} />
 *
 * // With an explicit rule instead of the schema-derived policy
 * <ChangeCredential
 *   policy={{regex: '^.{12,}$'}}
 * />
 *
 * // Managing a different credential declared on the schema; labels use the schema's own
 * // displayName for it automatically
 * <ChangeCredential attribute="pin" />
 * ```
 */
const ChangeCredential: FC<ChangeCredentialProps> = ({
  attribute = CredentialConstants.PASSWORD,
  onSuccess = undefined,
  policy = undefined,
  preferences = undefined,
  ...rest
}: ChangeCredentialProps) => {
  const {baseUrl, endpoints, instanceId, preferences: contextPreferences} = useThunderID();
  const {userSchema} = useUser();
  const resolvedDisplayName: string = userSchema?.[attribute]?.displayName ?? defaultDisplayName(attribute);

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
    () => resolveChangeCredentialPolicy(userSchema, attribute, policy),
    [userSchema, attribute, policy],
  );

  const handleSubmit = async ({currentPassword, newPassword}: ChangePasswordValues): Promise<void> => {
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setLoading(true);

    try {
      await updateMeCredentials({
        baseUrl,
        instanceId,
        payload: {currentValue: currentPassword || undefined, name: attribute, newValue: newPassword},
        url: resolveResourceEndpoint('usersMeCredentials', {endpoints}),
      });

      setSuccess(true);
      onSuccess?.();
    } catch (caughtError: unknown) {
      const {field, message, messageKey}: CredentialUpdateErrorResult = mapCredentialUpdateError(caughtError);
      const text: string =
        message ?? t(messageKey, {credential: resolvedDisplayName, credentialLower: resolvedDisplayName.toLowerCase()});

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
    <BaseChangeCredential
      {...rest}
      credentialDisplayName={resolvedDisplayName}
      error={error}
      fieldErrors={fieldErrors}
      loading={loading}
      policy={resolvedPolicy}
      preferences={resolvedPreferences}
      success={success}
      unavailable={!supportsCredential(userSchema, attribute)}
      onSubmit={(values: ChangePasswordValues): void => {
        void handleSubmit(values);
      }}
    />
  );
};

export default ChangeCredential;

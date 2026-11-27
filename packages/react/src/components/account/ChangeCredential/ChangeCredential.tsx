// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AuthenticationChallenge,
  CredentialConstants,
  CredentialUpdateErrorResult,
  PasswordPolicy,
  PendingStepUp,
  mapCredentialUpdateError,
  resolveChangeCredentialPolicy,
  resolveResourceEndpoint,
  runWithStepUp,
  supportsCredential,
} from '@thunderid/browser';
import {FC, useMemo, useEffect, useRef, useState} from 'react';
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
   * Called when setting the credential needs a more recent sign-in (`AUTH-4011`), with the
   * server's challenge, instead of the component signing the user in again by itself. Sign the
   * user in again with `challenge.maxAge` as the `max_age` authorization parameter, then let the
   * user submit again. The form also shows a "sign in again" message.
   */
  onReauthenticationRequired?: (challenge: AuthenticationChallenge) => void;
  /**
   * Called after the credential has been changed successfully.
   */
  onSuccess?: () => void;
}

/**
 * ChangeCredential lets the signed-in user set a new value for one of their own credentials.
 *
 * It collects the current value, the new value and its confirmation. The server needs the
 * current value when the user holds the credential, and answers a wrong or missing one on the
 * current-value field. A user who has not set the credential yet leaves the current value
 * empty; that change needs a recent sign-in. When the sign-in is too old, the component signs
 * the user in again with the server's `max_age`, checks that the same user signed in, and sends
 * the change once more; the values stay in memory only. A session from a redirect sign-in signs in
 * again in a popup, and one from an embedded sign-in flow runs the sign-in flow in a dialog. If the
 * browser blocks the popup, the next submit opens it first. Set `onReauthenticationRequired` to handle the challenge in your
 * app instead. Changing a credential the user holds ends the user's sessions, including this one.
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
 * // A first PIN: the component signs the user in again by itself when the sign-in is too old
 * <ChangeCredential attribute="pin" />
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
  onReauthenticationRequired = undefined,
  onSuccess = undefined,
  policy = undefined,
  preferences = undefined,
  ...rest
}: ChangeCredentialProps) => {
  const {baseUrl, endpoints, instanceId, preferences: contextPreferences, reauthenticate} = useThunderID();
  const pendingStepUp: PendingStepUp = useRef<PendingStepUp['current']>(undefined);
  // Whether the component is still on screen, so a change is not sent after it has closed.
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
    };
  }, []);
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
      await runWithStepUp({
        onReauthenticationRequired,
        isActive: (): boolean => mountedRef.current,
        pending: pendingStepUp,
        reauthenticate,
        send: () =>
          updateMeCredentials({
            baseUrl,
            instanceId,
            payload: {currentValue: currentPassword, name: attribute, newValue: newPassword},
            url: resolveResourceEndpoint('usersMeCredentials', {endpoints}),
          }),
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

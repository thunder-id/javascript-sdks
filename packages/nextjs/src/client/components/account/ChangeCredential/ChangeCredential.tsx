// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  AuthenticationChallenge,
  CredentialConstants,
  PasswordPolicy,
  resolveChangeCredentialPolicy,
  supportsCredential,
} from '@thunderid/node';
import {
  BaseChangeCredential,
  BaseChangeCredentialProps,
  ChangePasswordValues,
  useTranslation,
  useUser,
} from '@thunderid/react';
import {FC, ReactElement, useMemo, useState} from 'react';
import updateUserCredentialsAction, {
  UpdateUserCredentialsActionResult,
} from '../../../../server/actions/account/updateUserCredentialsAction';
import getSessionId from '../../../../server/actions/getSessionId';
import useThunderID from '../../../contexts/ThunderID/useThunderID';

/**
 * Title-cases a credential attribute name for use as a display-name fallback when the schema
 * declares no `displayName` for it, e.g. `pin` -> `Pin`.
 */
const defaultDisplayName = (attribute: string): string => attribute.charAt(0).toUpperCase() + attribute.slice(1);

/**
 * Props for the ChangeCredential component.
 * Mirrors `@thunderid/react`'s `ChangeCredentialProps` exactly, so a consumer moving between
 * the React and Next.js SDKs doesn't need to change how they call it.
 */
export type ChangeCredentialProps = Omit<
  BaseChangeCredentialProps,
  'credentialDisplayName' | 'error' | 'fieldErrors' | 'loading' | 'onSubmit' | 'success'
> & {
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
   * server's challenge. Sign the user in again with `challenge.maxAge` as the `max_age`
   * authorization parameter, then let the user submit again.
   */
  onReauthenticationRequired?: (challenge: AuthenticationChallenge) => void;
  /**
   * Called after the credential has been changed successfully.
   */
  onSuccess?: () => void;
};

/**
 * ChangeCredential lets the signed-in user set a new value for one of their own credentials.
 *
 * This is the Next.js-specific implementation: it uses `BaseChangeCredential` from
 * `@thunderid/react` for rendering, but routes the write through
 * `updateUserCredentialsAction` (a server action) instead of calling the ThunderID server
 * directly from the browser, matching how `UserProfile` reaches `updateUserProfileAction`.
 *
 * The server needs the current value when the user holds the credential. A user who has not
 * set it yet leaves the current value empty; that change needs a recent sign-in, and when the
 * sign-in is too old the form asks the user to sign in again and calls
 * `onReauthenticationRequired`.
 *
 * Defaults to managing the `password` credential. To manage a different one (for example a
 * PIN declared on the user type schema), set `attribute`; render the component once per
 * credential to let a user manage several.
 *
 * @example
 * ```tsx
 * // Basic usage, manages the password
 * <ChangeCredential onSuccess={() => toast('Password updated')} />
 *
 * // Managing a different credential declared on the schema
 * <ChangeCredential attribute="pin" />
 * ```
 */
const ChangeCredential: FC<ChangeCredentialProps> = ({
  attribute = CredentialConstants.PASSWORD,
  onReauthenticationRequired,
  onSuccess,
  policy,
  preferences,
  ...rest
}: ChangeCredentialProps): ReactElement => {
  const {preferences: contextPreferences} = useThunderID();
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

    const result: UpdateUserCredentialsActionResult = await updateUserCredentialsAction(
      {currentValue: currentPassword, name: attribute, newValue: newPassword},
      await getSessionId(),
    );

    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      const text: string =
        result.message ??
        t(result.messageKey, {credential: resolvedDisplayName, credentialLower: resolvedDisplayName.toLowerCase()});

      if (result.field) {
        setFieldErrors({[result.field]: text});
      } else {
        setError(text);
      }

      if (result.authenticationChallenge) {
        onReauthenticationRequired?.(result.authenticationChallenge);
      }
    }

    setLoading(false);
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

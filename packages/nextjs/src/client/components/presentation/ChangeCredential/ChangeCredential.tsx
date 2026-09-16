// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {CredentialConstants, PasswordPolicy, resolveChangeCredentialPolicy, supportsCredential} from '@thunderid/node';
import {
  BaseChangeCredential,
  BaseChangeCredentialProps,
  ChangePasswordValues,
  useTranslation,
  useUser,
} from '@thunderid/react';
import {FC, ReactElement, useMemo, useState} from 'react';
import getSessionId from '../../../../server/actions/getSessionId';
import updateUserCredentialsAction, {
  UpdateUserCredentialsActionResult,
} from '../../../../server/actions/updateUserCredentialsAction';
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

  const handleSubmit = async ({newPassword}: ChangePasswordValues): Promise<void> => {
    setError(null);
    setFieldErrors({});
    setSuccess(false);
    setLoading(true);

    const result: UpdateUserCredentialsActionResult = await updateUserCredentialsAction(
      {[attribute]: newPassword},
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

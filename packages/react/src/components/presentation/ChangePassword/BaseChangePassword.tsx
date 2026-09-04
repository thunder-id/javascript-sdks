// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ChangePasswordFormEvaluation,
  PasswordPolicy,
  PasswordRuleResult,
  Preferences,
  bem,
  evaluateChangePasswordForm,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {FC, FormEvent, ReactElement, useMemo, useState} from 'react';
import useStyles from './BaseChangePassword.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import AlertPrimitive from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Check from '../../primitives/Icons/Check';
import X from '../../primitives/Icons/X';
import PasswordField from '../../primitives/PasswordField/PasswordField';
import Typography from '../../primitives/Typography/Typography';

/**
 * The values collected by the form and handed to `onSubmit`.
 */
export interface ChangePasswordValues {
  /**
   * The user's existing password.
   */
  currentPassword: string;
  /**
   * The password to set.
   */
  newPassword: string;
}

export interface BaseChangePasswordProps {
  /**
   * Whether to wrap the form in a bordered card.
   */
  cardLayout?: boolean;
  /**
   * Additional CSS class names
   */
  className?: string;
  /**
   * A form-level error, typically a server failure that maps to no single field.
   */
  error?: string | null;
  /**
   * Server-supplied errors keyed by field name (`currentPassword` or `newPassword`).
   */
  fieldErrors?: Record<string, string>;
  /**
   * Whether a submission is in flight.
   */
  loading?: boolean;
  /**
   * Called with the collected values once client-side validation passes.
   */
  onSubmit?: (values: ChangePasswordValues) => void;
  /**
   * The rules the new password must satisfy. Defaults to no rules, in which case the
   * checklist is empty and the only submit gate is a non-empty value; the caller is
   * expected to source this from the user type schema (see {@link ChangePassword}) or
   * supply its own.
   */
  policy?: PasswordPolicy;
  /**
   * Component-level preference overrides, including i18n.
   */
  preferences?: Preferences;
  /**
   * Whether to render the live requirement checklist. Defaults to `true`.
   */
  showRequirements?: boolean;
  /**
   * Whether the last submission succeeded.
   */
  success?: boolean;
  /**
   * Whether the account cannot have a password changed at all, because the user type's schema
   * defines no `password` attribute. The form is rendered inert behind an explanatory message
   * rather than hidden, so an integrator who placed the component can see why it is not usable
   * instead of finding an empty space.
   */
  unavailable?: boolean;
}

/**
 * Presentational change-password form.
 *
 * Holds no context and performs no network calls: it renders the fields, evaluates the
 * password policy for the checklist and the submit gate, and hands validated values to
 * `onSubmit`. Use {@link ChangePassword} for the context-wired variant.
 *
 * @example
 * ```tsx
 * <BaseChangePassword
 *   policy={{regex: '^.{12,}$'}}
 *   onSubmit={({currentPassword, newPassword}) => save(currentPassword, newPassword)}
 * />
 * ```
 */
const BaseChangePassword: FC<BaseChangePasswordProps> = ({
  cardLayout = false,
  className = '',
  error = null,
  fieldErrors = {},
  loading = false,
  onSubmit = undefined,
  policy = {},
  preferences = undefined,
  showRequirements = true,
  success = false,
  unavailable = false,
}: BaseChangePasswordProps) => {
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const {t} = useTranslation(preferences?.i18n);

  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Clear the entered passwords once the container reports the write succeeded, so a shared
  // machine is not left with the new credential sitting in the form. Adjusting state during
  // render (rather than in an effect) is React's documented way to reset on a prop change and
  // avoids the extra commit an effect would cause.
  const [prevSuccess, setPrevSuccess] = useState<boolean>(success);

  if (success !== prevSuccess) {
    setPrevSuccess(success);

    if (success) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSubmitted(false);
    }
  }

  const {confirmMatches, isValid, reusesCurrent, ruleResults}: ChangePasswordFormEvaluation = useMemo(
    () => evaluateChangePasswordForm({confirmPassword, currentPassword, newPassword}, policy),
    [confirmPassword, currentPassword, newPassword, policy],
  );

  // A schema with no password attribute makes every control pointless, so they are disabled
  // outright rather than left focusable behind the overlay.
  const interactionDisabled: boolean = loading || unavailable;
  const canSubmit: boolean = !interactionDisabled && isValid;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setSubmitted(true);

    if (!canSubmit) {
      return;
    }

    onSubmit?.({currentPassword, newPassword});
  };

  const renderRequirement = (rule: PasswordRuleResult): ReactElement => (
    <li
      key={rule.key}
      data-passed={rule.passed}
      className={cx(
        withVendorCSSClassPrefix(bem('change-password', 'requirement')),
        styles['requirement'],
        rule.passed ? styles['requirementPassed'] : styles['requirementPending'],
      )}
    >
      <span
        className={cx(withVendorCSSClassPrefix(bem('change-password', 'requirement-icon')), styles['requirementIcon'])}
      >
        {rule.passed ? <Check width={14} height={14} /> : <X width={14} height={14} />}
      </span>
      <Typography variant="body2" component="span">
        {t(rule.messageKey, rule.params)}
      </Typography>
    </li>
  );

  // Only surface the local errors once the user has attempted a submit, so the form does
  // not flag fields the user has not finished filling in.
  const confirmError: string | undefined =
    submitted && !confirmMatches ? t('user.change_password.mismatch.error') : undefined;
  const newPasswordError: string | undefined =
    fieldErrors['newPassword'] ??
    (submitted && reusesCurrent ? t('user.change_password.same.as.current.error') : undefined);

  const form: ReactElement = (
    <form
      noValidate
      onSubmit={handleSubmit}
      className={cx(
        withVendorCSSClassPrefix('change-password'),
        styles['root'],
        cardLayout ? styles['card'] : '',
        className,
      )}
    >
      <Typography
        variant="h5"
        className={cx(withVendorCSSClassPrefix(bem('change-password', 'heading')), styles['heading'])}
      >
        {t('user.change_password.heading')}
      </Typography>

      {error && (
        <AlertPrimitive
          variant="error"
          className={cx(withVendorCSSClassPrefix(bem('change-password', 'alert')), styles['alert'])}
        >
          <AlertPrimitive.Title>{t('errors.heading') || 'Error'}</AlertPrimitive.Title>
          <AlertPrimitive.Description>{error}</AlertPrimitive.Description>
        </AlertPrimitive>
      )}

      {success && (
        <AlertPrimitive
          variant="success"
          className={cx(withVendorCSSClassPrefix(bem('change-password', 'alert')), styles['alert'])}
        >
          <AlertPrimitive.Description>{t('user.change_password.success')}</AlertPrimitive.Description>
        </AlertPrimitive>
      )}

      <div className={cx(withVendorCSSClassPrefix(bem('change-password', 'fields')), styles['fields'])}>
        <PasswordField
          name="currentPassword"
          autoComplete="current-password"
          label={t('user.change_password.current.label')}
          placeholder={t('user.change_password.current.placeholder')}
          value={currentPassword}
          onChange={setCurrentPassword}
          disabled={interactionDisabled}
          error={fieldErrors['currentPassword']}
        />

        <PasswordField
          name="newPassword"
          autoComplete="new-password"
          label={t('user.change_password.new.label')}
          placeholder={t('user.change_password.new.placeholder')}
          value={newPassword}
          onChange={setNewPassword}
          disabled={interactionDisabled}
          error={newPasswordError}
          required
        />

        {showRequirements && ruleResults.length > 0 && (
          <div className={cx(withVendorCSSClassPrefix(bem('change-password', 'requirements')))}>
            <Typography
              variant="body2"
              component="p"
              className={cx(
                withVendorCSSClassPrefix(bem('change-password', 'requirements-heading')),
                styles['requirementsHeading'],
              )}
            >
              {t('user.change_password.requirements.heading')}
            </Typography>
            <ul className={styles['requirements']}>{ruleResults.map(renderRequirement)}</ul>
          </div>
        )}

        <PasswordField
          name="confirmPassword"
          autoComplete="new-password"
          label={t('user.change_password.confirm.label')}
          placeholder={t('user.change_password.confirm.placeholder')}
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={interactionDisabled}
          error={confirmError}
          required
        />
      </div>

      <div className={cx(withVendorCSSClassPrefix(bem('change-password', 'actions')), styles['actions'])}>
        <Button type="submit" color="primary" variant="solid" loading={loading} disabled={!canSubmit}>
          {t('user.change_password.submit')}
        </Button>
      </div>
    </form>
  );

  if (!unavailable) {
    return form;
  }

  return (
    <div
      className={cx(
        withVendorCSSClassPrefix(bem('change-password', 'unavailable')),
        styles['unavailableRoot'],
        className,
      )}
    >
      <div
        aria-hidden="true"
        className={cx(
          withVendorCSSClassPrefix(bem('change-password', 'unavailable-content')),
          styles['unavailableContent'],
        )}
      >
        {form}
      </div>

      <div
        role="status"
        className={cx(
          withVendorCSSClassPrefix(bem('change-password', 'unavailable-overlay')),
          styles['unavailableOverlay'],
        )}
      >
        <AlertPrimitive
          variant="warning"
          className={cx(withVendorCSSClassPrefix(bem('change-password', 'alert')), styles['alert'])}
        >
          <AlertPrimitive.Title>{t('user.change_password.unavailable.heading')}</AlertPrimitive.Title>
          <AlertPrimitive.Description>{t('user.change_password.unavailable.description')}</AlertPrimitive.Description>
        </AlertPrimitive>
      </div>
    </div>
  );
};

export default BaseChangePassword;

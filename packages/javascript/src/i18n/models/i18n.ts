// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable typescript-sort-keys/interface */

export interface I18nTranslations {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  //* Buttons */
  'elements.buttons.signin.text': string;
  'elements.buttons.signout.text': string;
  'elements.buttons.signup.text': string;
  'elements.buttons.submit.text': string;
  'elements.buttons.facebook.text': string;
  'elements.buttons.google.text': string;
  'elements.buttons.github.text': string;
  'elements.buttons.microsoft.text': string;
  'elements.buttons.linkedin.text': string;
  'elements.buttons.ethereum.text': string;
  'elements.buttons.smsotp.text': string;
  'elements.buttons.multi.option.text': string;
  'elements.buttons.social.text': string;

  /* Display */
  'elements.display.divider.or_separator': string;
  'elements.display.copyable_text.copy': string;
  'elements.display.copyable_text.copied': string;

  /* Fields */
  'elements.fields.generic.placeholder': string;
  'elements.fields.username.label': string;
  'elements.fields.username.placeholder': string;
  'elements.fields.password.label': string;
  'elements.fields.password.placeholder': string;
  'elements.fields.first_name.label': string;
  'elements.fields.first_name.placeholder': string;
  'elements.fields.last_name.label': string;
  'elements.fields.last_name.placeholder': string;
  'elements.fields.email.label': string;
  'elements.fields.email.placeholder': string;
  'elements.fields.organization.name.label': string;
  'elements.fields.organization.handle.label': string;
  'elements.fields.organization.description.label': string;
  'elements.fields.organization.select.label': string;
  'elements.fields.organization.select.placeholder': string;

  /* Validation */
  'validations.required.field.error': string;
  'validation.pattern.invalid': string;
  'validation.minLength.invalid': string;
  'validation.maxLength.invalid': string;

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'signin.heading': string;
  'signin.subheading': string;
  'signin.images.app_logo.alt': string;

  /* Base Sign Up */
  'signup.heading': string;
  'signup.subheading': string;

  /* Email OTP */
  'email.otp.heading': string;
  'email.otp.subheading': string;
  'email.otp.buttons.submit.text': string;

  /* Identifier First */
  'identifier.first.heading': string;
  'identifier.first.subheading': string;
  'identifier.first.buttons.submit.text': string;

  /* SMS OTP */
  'sms.otp.heading': string;
  'sms.otp.subheading': string;
  'sms.otp.buttons.submit.text': string;

  /* TOTP */
  'totp.heading': string;
  'totp.subheading': string;
  'totp.buttons.submit.text': string;

  /* Username Password */
  'username.password.buttons.submit.text': string;
  'username.password.heading': string;
  'username.password.subheading': string;

  /* Passkeys */
  'passkey.button.use': string;
  'passkey.signin.heading': string;
  'passkey.register.heading': string;
  'passkey.register.description': string;

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': string;
  'user.profile.update.generic.error': string;

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': string;
  'user.change_password.current.label': string;
  'user.change_password.current.placeholder': string;
  'user.change_password.new.label': string;
  'user.change_password.new.placeholder': string;
  'user.change_password.confirm.label': string;
  'user.change_password.confirm.placeholder': string;
  'user.change_password.requirements.heading': string;
  'user.change_password.submit': string;
  'user.change_password.success': string;
  'user.change_password.mismatch.error': string;
  'user.change_password.same.as.current.error': string;
  'user.change_password.current.invalid.error': string;
  'user.change_password.generic.error': string;
  'user.change_password.unavailable.heading': string;
  'user.change_password.unavailable.description': string;
  'validation.password.pattern': string;

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': string;
  'organization.switcher.loading.placeholder.organizations': string;
  'organization.switcher.members': string;
  'organization.switcher.member': string;
  'organization.switcher.create.organization': string;
  'organization.switcher.manage.organizations': string;
  'organization.switcher.buttons.manage.text': string;
  'organization.switcher.organizations.heading': string;
  'organization.switcher.buttons.switch.text': string;
  'organization.switcher.no.access': string;
  'organization.switcher.status.label': string;
  'organization.switcher.showing.count': string;
  'organization.switcher.buttons.refresh.text': string;
  'organization.switcher.buttons.load_more.text': string;
  'organization.switcher.loading.more': string;
  'organization.switcher.no.organizations': string;
  'organization.switcher.error.prefix': string;
  'organization.profile.heading': string;
  'organization.profile.loading': string;
  'organization.profile.error': string;

  /* |---------------------------------------------------------------| */
  /* |                     Organization Creation                     | */
  /* |---------------------------------------------------------------| */

  'organization.create.heading': string;
  'organization.create.buttons.create_organization.text': string;
  'organization.create.buttons.create_organization.loading.text': string;
  'organization.create.buttons.cancel.text': string;

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': string;

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': string;
  'consent.essential_claims': string;
  'consent.optional_claims': string;
  'consent.authorize_scope': string;
  'consent.essential_claims.info': string;
  'consent.optional_claims.info': string;
  'consent.authorize_scope.info': string;

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': string;
  'errors.signin.initialization': string;
  'errors.signin.flow.failure': string;
  'errors.signin.flow.completion.failure': string;
  'errors.signin.flow.passkeys.failure': string;
  'errors.signin.flow.passkeys.completion.failure': string;
  'errors.signup.initialization': string;
  'errors.signup.flow.failure': string;
  'errors.signup.flow.initialization.failure': string;
  'errors.signup.components.not.available': string;
  'errors.signin.components.not.available': string;
  'errors.signin.timeout': string;
}

export type I18nTextDirection = 'ltr' | 'rtl';

export interface I18nMetadata {
  localeCode: string;
  countryCode: string;
  languageCode: string;
  displayName: string;
  direction: I18nTextDirection | string;
}

export interface I18nBundle {
  metadata: I18nMetadata;
  translations: I18nTranslations;
}

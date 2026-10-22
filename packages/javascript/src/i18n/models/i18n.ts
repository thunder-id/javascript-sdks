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
  'elements.display.copyable_text.hide': string;
  'elements.display.copyable_text.show': string;

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

  /* Select */
  'elements.fields.auth_flow_select.aria_label': string;
  'elements.fields.auth_flow_select.empty': string;
  'elements.fields.select.load_more': string;
  'elements.fields.select.loading': string;
  'elements.fields.select.loading_more': string;
  'elements.fields.user_select.aria_label': string;
  'elements.fields.user_select.empty': string;
  'elements.fields.user_type_select.aria_label': string;
  'elements.fields.user_type_select.empty': string;

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
  'user.change_password.new.label': string;
  'user.change_password.new.placeholder': string;
  'user.change_password.confirm.label': string;
  'user.change_password.confirm.placeholder': string;
  'user.change_password.requirements.heading': string;
  'user.change_password.submit': string;
  'user.change_password.success': string;
  'user.change_password.mismatch.error': string;
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
  'errors.signup.popup.failure': string;
  'errors.signup.components.not.available': string;
  'errors.signin.components.not.available': string;
  'errors.signin.timeout': string;

  /* |---------------------------------------------------------------| */
  /* |                        Admin                                  | */
  /* |---------------------------------------------------------------| */

  'admin.common.loading': string;
  'attribution.secured_by': string;
  'attribution.powered_by': string;
  'admin.common.actions.cancel': string;
  'admin.common.actions.confirm': string;
  'admin.common.actions.remove': string;
  'admin.common.columns.actions': string;
  'admin.common.columns.organization_unit': string;
  'admin.common.errors.forbidden': string;
  'admin.common.errors.not_found': string;
  'admin.common.errors.no_ou': string;
  'admin.common.fields.identity': string;
  'admin.common.fields.identity_type': string;
  'admin.common.fields.identity_placeholder': string;
  'admin.common.fields.identity_empty': string;
  'admin.common.identity_types.user': string;
  'admin.common.identity_types.group': string;
  'admin.common.identity_types.agent': string;
  'admin.common.identity_types.app': string;
  'admin.common.pagination.label': string;
  'admin.common.pagination.previous': string;
  'admin.common.pagination.next': string;
  'admin.common.pagination.range': string;
  'admin.common.search.attribute': string;
  'admin.common.search.submit': string;
  'admin.common.search.clear': string;
  'admin.common.search.placeholder': string;
  'admin.common.search.no_results': string;
  'admin.common.filters.type': string;
  'admin.common.filters.all_types': string;
  'admin.users.list.search.username': string;
  'admin.users.list.search.email': string;
  'admin.agents.list.search.name': string;
  'admin.users.list.title': string;
  'admin.users.list.columns.name': string;
  'admin.users.list.columns.type': string;
  'admin.users.list.empty': string;
  'admin.users.list.error': string;
  'admin.users.create.title': string;
  'admin.users.create.submit': string;
  'admin.users.create.error': string;
  'admin.users.create.fields.type': string;
  'admin.users.create.fields.username': string;
  'admin.users.create.fields.email': string;
  'admin.users.create.fields.given_name': string;
  'admin.users.create.fields.family_name': string;
  'admin.users.create.fields.password': string;
  'admin.users.details.subtitle': string;
  'admin.users.details.attributes': string;
  'admin.users.details.no_attributes': string;
  'admin.users.details.groups': string;
  'admin.users.details.no_groups': string;
  'admin.users.details.error': string;
  'admin.users.details.delete.action': string;
  'admin.users.details.delete.confirm': string;
  'admin.users.details.delete.error': string;
  'admin.users.details.edit.action': string;
  'admin.users.details.edit.save': string;
  'admin.users.details.edit.error': string;
  'admin.groups.list.title': string;
  'admin.groups.list.columns.name': string;
  'admin.groups.list.columns.description': string;
  'admin.groups.list.empty': string;
  'admin.groups.list.error': string;
  'admin.groups.create.title': string;
  'admin.groups.create.submit': string;
  'admin.groups.create.fields.name': string;
  'admin.groups.create.fields.description': string;
  'admin.groups.create.error': string;
  'admin.groups.members.title': string;
  'admin.groups.members.add': string;
  'admin.groups.members.columns.member': string;
  'admin.groups.members.columns.type': string;
  'admin.groups.members.empty': string;
  'admin.groups.members.remove_label': string;
  'admin.groups.members.error': string;
  'admin.groups.members.update_error': string;
  'admin.roles.list.title': string;
  'admin.roles.list.columns.name': string;
  'admin.roles.list.columns.description': string;
  'admin.roles.list.empty': string;
  'admin.roles.list.error': string;
  'admin.roles.create.title': string;
  'admin.roles.create.submit': string;
  'admin.roles.create.fields.name': string;
  'admin.roles.create.fields.description': string;
  'admin.roles.create.error': string;
  'admin.roles.assignments.title': string;
  'admin.roles.assignments.add': string;
  'admin.roles.assignments.columns.assignee': string;
  'admin.roles.assignments.columns.type': string;
  'admin.roles.assignments.empty': string;
  'admin.roles.assignments.remove_label': string;
  'admin.roles.assignments.error': string;
  'admin.roles.assignments.update_error': string;
  'admin.roles.permissions.title': string;
  'admin.roles.permissions.empty': string;
  'admin.roles.permissions.error': string;
  'admin.agents.list.title': string;
  'admin.agents.list.columns.name': string;
  'admin.agents.list.columns.type': string;
  'admin.agents.list.columns.client_id': string;
  'admin.agents.list.empty': string;
  'admin.agents.list.error': string;
  'admin.agents.create.title': string;
  'admin.agents.create.submit': string;
  'admin.agents.create.fields.name': string;
  'admin.agents.create.fields.type': string;
  'admin.agents.create.fields.description': string;
  'admin.agents.create.error': string;
  'admin.agents.details.overview': string;
  'admin.agents.details.type': string;
  'admin.agents.details.owner': string;
  'admin.agents.details.no_owner': string;
  'admin.agents.details.groups': string;
  'admin.agents.details.no_groups': string;
  'admin.agents.details.roles': string;
  'admin.agents.details.no_roles': string;
  'admin.agents.details.error': string;
  'admin.agents.details.delete.action': string;
  'admin.agents.details.delete.confirm': string;
  'admin.agents.details.delete.error': string;
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

// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {I18nTranslations, I18nMetadata, I18nBundle} from '../models/i18n';

const translations: I18nTranslations = {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  /* Buttons */
  'elements.buttons.signin.text': 'Sign In',
  'elements.buttons.signout.text': 'Sign Out',
  'elements.buttons.signup.text': 'Sign Up',
  'elements.buttons.submit.text': 'Continue',
  'elements.buttons.facebook.text': 'Continue with Facebook',
  'elements.buttons.google.text': 'Continue with Google',
  'elements.buttons.github.text': 'Continue with GitHub',
  'elements.buttons.microsoft.text': 'Continue with Microsoft',
  'elements.buttons.linkedin.text': 'Continue with LinkedIn',
  'elements.buttons.ethereum.text': 'Continue with Sign In Ethereum',
  'elements.buttons.smsotp.text': 'Continue with SMS OTP',
  'elements.buttons.multi.option.text': 'Continue with {connection}',
  'elements.buttons.social.text': 'Continue with {connection}',

  /* Display */
  'elements.display.divider.or_separator': 'OR',
  'elements.display.copyable_text.copy': 'Copy',
  'elements.display.copyable_text.copied': 'Copied!',
  'elements.display.copyable_text.show': 'Show',
  'elements.display.copyable_text.hide': 'Hide',

  /* Fields */
  'elements.fields.generic.placeholder': 'Enter your {field}',
  'elements.fields.username.label': 'Username',
  'elements.fields.username.placeholder': 'Enter your username',
  'elements.fields.password.label': 'Password',
  'elements.fields.password.placeholder': 'Enter your password',
  'elements.fields.first_name.label': 'First Name',
  'elements.fields.first_name.placeholder': 'Enter your first name',
  'elements.fields.last_name.label': 'Last Name',
  'elements.fields.last_name.placeholder': 'Enter your last name',
  'elements.fields.email.label': 'Email',
  'elements.fields.email.placeholder': 'Enter your email',
  'elements.fields.organization.name.label': 'Organization Name',
  'elements.fields.organization.handle.label': 'Organization Handle',
  'elements.fields.organization.description.label': 'Organization Description',
  'elements.fields.organization.select.label': 'Select Organization',
  'elements.fields.organization.select.placeholder': 'Choose an organization',

  /* Select */
  'elements.fields.auth_flow_select.aria_label': 'Select a login flow',
  'elements.fields.auth_flow_select.empty': 'No login flows found.',
  'elements.fields.select.load_more': 'Load more',
  'elements.fields.select.loading': 'Loading…',
  'elements.fields.select.loading_more': 'Loading more…',
  'elements.fields.user_select.aria_label': 'Select a user',
  'elements.fields.user_select.empty': 'No users found.',
  'elements.fields.user_type_select.aria_label': 'Select a user type',
  'elements.fields.user_type_select.empty': 'No user types found.',

  /* Validation */
  'validations.required.field.error': 'This field is required',
  'validation.pattern.invalid': 'This value does not match the required format.',
  'validation.minLength.invalid': 'This value is too short.',
  'validation.maxLength.invalid': 'This value is too long.',

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'signin.heading': 'Sign In',
  'signin.subheading': 'Welcome back! Please sign in to continue.',
  'signin.images.app_logo.alt': 'Application logo',

  /* Base Sign Up */
  'signup.heading': 'Sign Up',
  'signup.subheading': 'Create a new account to get started.',

  /* Email OTP */
  'email.otp.heading': 'OTP Verification',
  'email.otp.subheading': 'Enter the code sent to your email address.',
  'email.otp.buttons.submit.text': 'Continue',

  /* Identifier First */
  'identifier.first.heading': 'Sign In',
  'identifier.first.subheading': 'Enter your username or email address.',
  'identifier.first.buttons.submit.text': 'Continue',

  /* SMS OTP */
  'sms.otp.heading': 'OTP Verification',
  'sms.otp.subheading': 'Enter the code sent to your phone number.',
  'sms.otp.buttons.submit.text': 'Continue',

  /* TOTP */
  'totp.heading': 'Verify Your Identity',
  'totp.subheading': 'Enter the code from your authenticator app.',
  'totp.buttons.submit.text': 'Continue',

  /* Username Password */
  'username.password.heading': 'Sign In',
  'username.password.subheading': 'Enter your username and password to continue.',
  'username.password.buttons.submit.text': 'Continue',

  /* Passkeys */
  'passkey.button.use': 'Sign in with Passkey',
  'passkey.signin.heading': 'Sign in with Passkey',
  'passkey.register.heading': 'Register Passkey',
  'passkey.register.description': 'Create a passkey to securely sign in to your account without a password.',

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': 'Profile',
  'user.profile.update.generic.error': 'An error occurred while updating your profile. Please try again.',

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': 'Change {credential}',
  'user.change_password.new.label': 'New {credential}',
  'user.change_password.new.placeholder': 'Enter your new {credentialLower}',
  'user.change_password.confirm.label': 'Confirm New {credential}',
  'user.change_password.confirm.placeholder': 'Re-enter your new {credentialLower}',
  'user.change_password.requirements.heading': 'Your {credentialLower} must have:',
  'user.change_password.submit': 'Update {credential}',
  'user.change_password.success': 'Your {credentialLower} has been updated.',
  'user.change_password.mismatch.error': '{credential}s do not match.',
  'user.change_password.generic.error': 'An error occurred while updating your {credentialLower}. Please try again.',
  'user.change_password.unavailable.heading': '{credential} changes unavailable',
  'user.change_password.unavailable.description': 'Please contact your administrator.',
  'validation.password.pattern': 'Matches the required format',

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': 'Switch Organization',
  'organization.switcher.loading.placeholder.organizations': 'Loading organizations...',
  'organization.switcher.members': 'members',
  'organization.switcher.member': 'member',
  'organization.switcher.create.organization': 'Create Organization',
  'organization.switcher.manage.organizations': 'Manage Organizations',
  'organization.switcher.buttons.manage.text': 'Manage',
  'organization.switcher.organizations.heading': 'Organizations',
  'organization.switcher.buttons.switch.text': 'Switch',
  'organization.switcher.no.access': 'No Access',
  'organization.switcher.status.label': 'Status:',
  'organization.switcher.showing.count': 'Showing {showing} of {total} organizations',
  'organization.switcher.buttons.refresh.text': 'Refresh',
  'organization.switcher.buttons.load_more.text': 'Load More Organizations',
  'organization.switcher.loading.more': 'Loading...',
  'organization.switcher.no.organizations': 'No organizations found',
  'organization.switcher.error.prefix': 'Error:',

  'organization.profile.heading': 'Organization Profile',
  'organization.profile.loading': 'Loading organization...',
  'organization.profile.error': 'Failed to load organization',

  'organization.create.heading': 'Create Organization',
  'organization.create.buttons.create_organization.text': 'Create Organization',
  'organization.create.buttons.create_organization.loading.text': 'Creating...',
  'organization.create.buttons.cancel.text': 'Cancel',

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': 'Loading...',

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': 'Required',
  'consent.essential_claims': 'Essential Attributes',
  'consent.optional_claims': 'Optional Attributes',
  'consent.authorize_scope': 'Permissions',
  'consent.essential_claims.info': 'These attributes are required for the service to function properly.',
  'consent.optional_claims.info': 'These attributes are optional and can be provided at your discretion.',
  'consent.authorize_scope.info': 'These permissions allow the service to access additional features.',

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': 'Error',
  'errors.signin.components.not.available': 'Sign-in form is not available at the moment. Please try again later.',
  'errors.signin.initialization': 'An error occurred while initializing. Please try again later.',
  'errors.signin.flow.failure': 'An error occurred during the sign-in flow. Please try again later.',
  'errors.signin.flow.completion.failure':
    'An error occurred while completing the sign-in flow. Please try again later.',
  'errors.signin.flow.passkeys.failure': 'An error occurred while signing in with passkeys. Please try again later.',
  'errors.signin.flow.passkeys.completion.failure':
    'An error occurred while completing the passkeys sign-in flow. Please try again later.',
  'errors.signin.timeout': 'Time allowed to complete the step has expired.',

  'errors.signup.initialization': 'An error occurred while initializing. Please try again later.',
  'errors.signup.flow.failure': 'An error occurred during the sign-up flow. Please try again later.',
  'errors.signup.flow.initialization.failure':
    'An error occurred while initializing the sign-up flow. Please try again later.',
  'errors.signup.popup.failure': 'Could not continue the sign-up in the pop-up window. Please try again.',
  'errors.signup.components.not.available': 'Sign-up form is not available at the moment. Please try again later.',
  /* Admin */
  'admin.common.loading': 'Loading…',
  'attribution.secured_by': 'Secured by',
  'attribution.powered_by': 'Powered by',
  'admin.common.actions.cancel': 'Cancel',
  'admin.common.actions.confirm': 'Confirm',
  'admin.common.actions.remove': 'Remove',
  'admin.common.columns.actions': 'Actions',
  'admin.common.columns.organization_unit': 'Organization unit',
  'admin.common.errors.forbidden': 'You do not have permission to do this.',
  'admin.common.errors.not_found': 'This item could not be found.',
  'admin.common.errors.no_ou': 'Choose an organization unit before creating this item.',
  'admin.common.fields.identity': 'Name',
  'admin.common.fields.identity_type': 'Type',
  'admin.common.fields.identity_placeholder': 'Select an identity',
  'admin.common.fields.identity_empty': 'Nothing to add',
  'admin.common.identity_types.user': 'User',
  'admin.common.identity_types.group': 'Group',
  'admin.common.identity_types.agent': 'Agent',
  'admin.common.identity_types.app': 'Application',
  'admin.common.pagination.label': 'Pagination',
  'admin.common.pagination.previous': 'Previous',
  'admin.common.pagination.next': 'Next',
  'admin.common.pagination.range': '{start} to {end} of {total}',
  'admin.common.search.attribute': 'Search by',
  'admin.common.search.submit': 'Search',
  'admin.common.search.clear': 'Clear search',
  'admin.common.search.placeholder': 'Exact {attribute}',
  'admin.common.search.no_results': 'No matches for "{value}". Search matches the whole value.',
  'admin.common.filters.type': 'Assignee type',
  'admin.common.filters.all_types': 'All types',
  'admin.users.list.search.username': 'Username',
  'admin.users.list.search.email': 'Email',
  'admin.agents.list.search.name': 'Name',
  'admin.users.list.title': 'Users',
  'admin.users.list.columns.name': 'Name',
  'admin.users.list.columns.type': 'User type',
  'admin.users.list.empty': 'No users found.',
  'admin.users.list.error': 'Could not load users. Please try again.',
  'admin.users.create.title': 'Add user',
  'admin.users.create.submit': 'Create user',
  'admin.users.create.error': 'Could not create the user. Please try again.',
  'admin.users.create.fields.type': 'User type',
  'admin.users.create.fields.username': 'Username',
  'admin.users.create.fields.email': 'Email',
  'admin.users.create.fields.given_name': 'First name',
  'admin.users.create.fields.family_name': 'Last name',
  'admin.users.create.fields.password': 'Password',
  'admin.users.details.subtitle': 'User type: {type}',
  'admin.users.details.attributes': 'Attributes',
  'admin.users.details.no_attributes': 'No attributes.',
  'admin.users.details.groups': 'Groups',
  'admin.users.details.no_groups': 'Not a member of any group.',
  'admin.users.details.error': 'Could not load this user. Please try again.',
  'admin.users.details.delete.action': 'Delete user',
  'admin.users.details.delete.confirm': 'Delete {name}?',
  'admin.users.details.delete.error': 'Could not delete the user. Please try again.',
  'admin.users.details.edit.action': 'Edit',
  'admin.users.details.edit.save': 'Save changes',
  'admin.users.details.edit.error': 'Could not save the user. Please try again.',
  'admin.groups.list.title': 'Groups',
  'admin.groups.list.columns.name': 'Name',
  'admin.groups.list.columns.description': 'Description',
  'admin.groups.list.empty': 'No groups found.',
  'admin.groups.list.error': 'Could not load groups. Please try again.',
  'admin.groups.create.title': 'Create group',
  'admin.groups.create.submit': 'Create group',
  'admin.groups.create.fields.name': 'Name',
  'admin.groups.create.fields.description': 'Description',
  'admin.groups.create.error': 'Could not create the group. Please try again.',
  'admin.groups.members.title': 'Members',
  'admin.groups.members.add': 'Add member',
  'admin.groups.members.columns.member': 'Member',
  'admin.groups.members.columns.type': 'Type',
  'admin.groups.members.empty': 'This group has no members.',
  'admin.groups.members.remove_label': 'Remove {name} from the group',
  'admin.groups.members.error': 'Could not load members. Please try again.',
  'admin.groups.members.update_error': 'Could not update the members. Please try again.',
  'admin.roles.list.title': 'Roles',
  'admin.roles.list.columns.name': 'Name',
  'admin.roles.list.columns.description': 'Description',
  'admin.roles.list.empty': 'No roles found.',
  'admin.roles.list.error': 'Could not load roles. Please try again.',
  'admin.roles.create.title': 'Create role',
  'admin.roles.create.submit': 'Create role',
  'admin.roles.create.fields.name': 'Name',
  'admin.roles.create.fields.description': 'Description',
  'admin.roles.create.error': 'Could not create the role. Please try again.',
  'admin.roles.assignments.title': 'Assigned to',
  'admin.roles.assignments.add': 'Assign role',
  'admin.roles.assignments.columns.assignee': 'Assignee',
  'admin.roles.assignments.columns.type': 'Type',
  'admin.roles.assignments.empty': 'This role is not assigned to anyone.',
  'admin.roles.assignments.remove_label': 'Remove the role from {name}',
  'admin.roles.assignments.error': 'Could not load assignments. Please try again.',
  'admin.roles.assignments.update_error': 'Could not update the assignments. Please try again.',
  'admin.roles.permissions.title': 'Permissions',
  'admin.roles.permissions.empty': 'This role grants no permissions.',
  'admin.roles.permissions.error': 'Could not load the permissions. Please try again.',
  'admin.agents.list.title': 'Agents',
  'admin.agents.list.columns.name': 'Name',
  'admin.agents.list.columns.type': 'Agent type',
  'admin.agents.list.columns.client_id': 'Client ID',
  'admin.agents.list.empty': 'No agents found.',
  'admin.agents.list.error': 'Could not load agents. Please try again.',
  'admin.agents.create.title': 'Register agent',
  'admin.agents.create.submit': 'Register agent',
  'admin.agents.create.fields.name': 'Name',
  'admin.agents.create.fields.type': 'Agent type',
  'admin.agents.create.fields.description': 'Description',
  'admin.agents.create.error': 'Could not register the agent. Please try again.',
  'admin.agents.details.overview': 'Overview',
  'admin.agents.details.type': 'Agent type',
  'admin.agents.details.owner': 'Owner',
  'admin.agents.details.no_owner': 'No owner',
  'admin.agents.details.groups': 'Groups',
  'admin.agents.details.no_groups': 'Not a member of any group.',
  'admin.agents.details.roles': 'Roles',
  'admin.agents.details.no_roles': 'No roles assigned.',
  'admin.agents.details.error': 'Could not load this agent. Please try again.',
  'admin.agents.details.delete.action': 'Delete agent',
  'admin.agents.details.delete.confirm': 'Delete {name}?',
  'admin.agents.details.delete.error': 'Could not delete the agent. Please try again.',
};

const metadata: I18nMetadata = {
  localeCode: 'en-US',
  countryCode: 'US',
  languageCode: 'en',
  displayName: 'English (United States)',
  direction: 'ltr',
};

const en_US: I18nBundle = {
  metadata,
  translations,
};

export default en_US;

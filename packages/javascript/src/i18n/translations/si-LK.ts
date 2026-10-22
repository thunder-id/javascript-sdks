// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {I18nTranslations, I18nMetadata, I18nBundle} from '../models/i18n';

const translations: I18nTranslations = {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  /* Buttons */
  'elements.buttons.signin.text': 'ලොග් වෙන්න',
  'elements.buttons.signout.text': 'ඉවත් වෙන්න',
  'elements.buttons.signup.text': 'ලියාපදිංචි වෙන්න',
  'elements.buttons.submit.text': 'ඉදිරියට යන්න',
  'elements.buttons.facebook.text': 'Facebook සමග ඉදිරියට යන්න',
  'elements.buttons.google.text': 'Google සමග ඉදිරියට යන්න',
  'elements.buttons.github.text': 'GitHub සමග ඉදිරියට යන්න',
  'elements.buttons.microsoft.text': 'Microsoft සමග ඉදිරියට යන්න',
  'elements.buttons.linkedin.text': 'LinkedIn සමග ඉදිරියට යන්න',
  'elements.buttons.ethereum.text': 'Ethereum සමග ඉදිරියට යන්න',
  'elements.buttons.smsotp.text': 'SMS සමග ඉදිරියට යන්න',
  'elements.buttons.multi.option.text': '{connection} සමග ඉදිරියට යන්න',
  'elements.buttons.social.text': '{connection} සමග ඉදිරියට යන්න',

  /* Display */
  'elements.display.divider.or_separator': 'හෝ',
  'elements.display.copyable_text.copy': 'පිටපත් කරන්න',
  'elements.display.copyable_text.copied': 'පිටපත් කළා!',
  'elements.display.copyable_text.show': 'පෙන්වන්න',
  'elements.display.copyable_text.hide': 'සඟවන්න',

  /* Fields */
  'elements.fields.generic.placeholder': 'ඔබේ {field} ඇතුලත් කරන්න',
  'elements.fields.username.label': 'පරිශීලක නාමය',
  'elements.fields.username.placeholder': 'පරිශීලක නාමය ඇතුලත් කරන්න',
  'elements.fields.password.label': 'මුරපදය',
  'elements.fields.password.placeholder': 'මුරපදය ඇතුලත් කරන්න',
  'elements.fields.first_name.label': 'මුල් නම',
  'elements.fields.first_name.placeholder': 'ඔබේ මුල් නම ඇතුලත් කරන්න',
  'elements.fields.last_name.label': 'අවසන් නම',
  'elements.fields.last_name.placeholder': 'ඔබේ අවසන් නම ඇතුලත් කරන්න',
  'elements.fields.email.label': 'ඊමේල්',
  'elements.fields.email.placeholder': 'ඔබේ ඊමේල් ලිපිනය ඇතුලත් කරන්න',
  'elements.fields.organization.name.label': 'සංවිධානයේ නම',
  'elements.fields.organization.handle.label': 'සංවිධාන හැඩුනුම්පත',
  'elements.fields.organization.description.label': 'සංවිධානයේ විස්තරය',
  'elements.fields.organization.select.label': 'සංවිධානය තෝරන්න',
  'elements.fields.organization.select.placeholder': 'සංවිධානයක් සැළුම් කරන්න',

  /* Select */
  'elements.fields.auth_flow_select.aria_label': 'පිවිසුම් ප්‍රවාහයක් තෝරන්න',
  'elements.fields.auth_flow_select.empty': 'පිවිසුම් ප්‍රවාහ හමු නොවීය.',
  'elements.fields.select.load_more': 'තවත් පූරණය කරන්න',
  'elements.fields.select.loading': 'පූරණය වේ…',
  'elements.fields.select.loading_more': 'තවත් පූරණය වේ…',
  'elements.fields.user_select.aria_label': 'පරිශීලකයෙකු තෝරන්න',
  'elements.fields.user_select.empty': 'පරිශීලකයන් හමු නොවීය.',
  'elements.fields.user_type_select.aria_label': 'පරිශීලක වර්ගයක් තෝරන්න',
  'elements.fields.user_type_select.empty': 'පරිශීලක වර්ග හමු නොවීය.',

  /* Validation */
  'validations.required.field.error': 'මෙම ක්ෂේත්‍රය අවශ්‍යයි',
  'validation.pattern.invalid': 'මෙම අගය අවශ්‍ය ආකෘතියට නොගැලපේ.',
  'validation.minLength.invalid': 'මෙම අගය ඉතා කෙටියි.',
  'validation.maxLength.invalid': 'මෙම අගය ඉතා දිගයි.',

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'signin.heading': 'ලොග් වෙන්න',
  'signin.subheading': 'ඉදිරියට යාමට ඔබේ සත්‍යාපන තොරතුරු ඇතුළත් කරන්න.',
  'signin.images.app_logo.alt': 'යෙදුමේ ලාංඡනය',

  /* Base Sign Up */
  'signup.heading': 'ලියාපදිංචි වන්න',
  'signup.subheading': 'ආරම්භ කිරීමට නව ගිණුමක් සාදන්න.',

  /* Email OTP */
  'email.otp.heading': 'OTP සත්‍යාපනය',
  'email.otp.subheading': 'ඔබේ විද්‍යුත් තැපැල් ලිපිනයට යවන ලද කේතය ඇතුළත් කරන්න.',
  'email.otp.buttons.submit.text': 'ඉදිරියට යන්න',

  /* Identifier First */
  'identifier.first.heading': 'ලොග් වෙන්න',
  'identifier.first.subheading': 'ඔබේ පරිශීලක නාමය හෝ විද්‍යුත් තැපැල් ලිපිනය ඇතුළත් කරන්න.',
  'identifier.first.buttons.submit.text': 'ඉදිරියට යන්න',

  /* SMS OTP */
  'sms.otp.heading': 'OTP සත්‍යාපනය',
  'sms.otp.subheading': 'ඔබේ දුරකථන අංකයට යවන ලද කේතය ඇතුළත් කරන්න.',
  'sms.otp.buttons.submit.text': 'ඉදිරියට යන්න',

  /* TOTP */
  'totp.heading': 'ඔබගේ අනන්‍යතාවය තහවුරු කරන්න',
  'totp.subheading': 'ඔබේ authenticator යෙදුමෙන් ලබාගත් කේතය ඇතුළත් කරන්න.',
  'totp.buttons.submit.text': 'ඉදිරියට යන්න',

  /* Username Password */
  'username.password.buttons.submit.text': 'ඉදිරියට යන්න',
  'username.password.heading': 'ලොග් වෙන්න',
  'username.password.subheading': 'ඉදිරියට යාමට ඔබේ පරිශීලක නාමය සහ මුරපදය ඇතුළත් කරන්න.',

  /* Passkeys */
  'passkey.button.use': 'Passkey මගින් ඇතුල් වන්න',
  'passkey.signin.heading': 'Passkey මගින් ඇතුල් වන්න',
  'passkey.register.heading': 'Passkey ලියාපදිංචි කරන්න',
  'passkey.register.description': 'මුරපදයක් නොමැතිව ඔබේ ගිණුමට ආරක්ෂිතව ඇතුල් වීමට passkey එකක් සාදන්න.',

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': 'පැතිකඩ',
  'user.profile.update.generic.error': 'ඔබේ පැතිකඩ යාවත්කාලීන කිරීමේදී දෝෂයක් ඇතිවිය.කරුණාකර නැවත උත්සාහ කරන්න',

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': '{credential} වෙනස් කරන්න',
  'user.change_password.new.label': 'නව {credential}',
  'user.change_password.new.placeholder': 'ඔබේ නව {credentialLower} ඇතුළත් කරන්න',
  'user.change_password.confirm.label': 'නව {credential} තහවුරු කරන්න',
  'user.change_password.confirm.placeholder': 'ඔබේ නව {credentialLower} නැවත ඇතුළත් කරන්න',
  'user.change_password.requirements.heading': 'ඔබේ {credentialLower} තුළ තිබිය යුතුය:',
  'user.change_password.submit': '{credential} යාවත්කාලීන කරන්න',
  'user.change_password.success': 'ඔබේ {credentialLower} යාවත්කාලීන කර ඇත.',
  'user.change_password.mismatch.error': '{credentialLower} නොගැලපේ.',
  'user.change_password.generic.error':
    'ඔබේ {credentialLower} යාවත්කාලීන කිරීමේදී දෝෂයක් ඇතිවිය. කරුණාකර නැවත උත්සාහ කරන්න.',
  'user.change_password.unavailable.heading': '{credential} වෙනස් කිරීම් ලබා ගත නොහැක',
  'user.change_password.unavailable.description': 'කරුණාකර ඔබේ පරිපාලක සම්බන්ධ කර ගන්න.',
  'validation.password.pattern': 'අවශ්‍ය ආකෘතියට ගැලපේ',

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': 'සංවිධානය මාරු කරන්න',
  'organization.switcher.loading.placeholder.organizations': 'සංවිධාන ලෝඩ් වෙමින්...',
  'organization.switcher.members': 'සාමාජිකයන්',
  'organization.switcher.member': 'සාමාජිකයා',
  'organization.switcher.create.organization': 'සංවිධානයක් සාදන්න',
  'organization.switcher.manage.organizations': 'සංවිධාන කළමනාකරණය කරන්න',
  'organization.switcher.buttons.manage.text': 'කළමනාකරණය කරන්න',
  'organization.switcher.organizations.heading': 'සංවිධාන',
  'organization.switcher.buttons.switch.text': 'මාරු කරන්න',
  'organization.switcher.no.access': 'ප්‍රවේශය නැත',
  'organization.switcher.status.label': 'තත්ත්වය:',
  'organization.switcher.showing.count': 'මුළු සංවිධාන {showing} න් {total} ක් පෙන්වමින්',
  'organization.switcher.buttons.refresh.text': 'නැවුම් කරන්න',
  'organization.switcher.buttons.load_more.text': 'තවත් සංවිධාන ලෝඩ් කරන්න',
  'organization.switcher.loading.more': 'ලෝඩ් වෙමින්...',
  'organization.switcher.no.organizations': 'සංවිධාන කිසිවක් හමු නොවීය.',
  'organization.switcher.error.prefix': 'දෝෂය:',

  'organization.profile.heading': 'සංවිධානයේ පැතිකඩ',
  'organization.profile.loading': 'සංවිධානය ලෝඩ් වෙමින්...',
  'organization.profile.error': 'සංවිධානය ලෝඩ් කිරීමට අසමත් විය',

  'organization.create.heading': 'සංවිධානය සාදන්න',
  'organization.create.buttons.create_organization.text': 'සංවිධානය සාදන්න',
  'organization.create.buttons.create_organization.loading.text': 'සාදමින්...',
  'organization.create.buttons.cancel.text': 'අවලංගු කරන්න',

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': 'ලෝඩ් වෙමින්...',

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': 'අවශ්‍යයි',
  'consent.essential_claims': 'අත්‍යවශ්‍ය ගුණාංග',
  'consent.optional_claims': 'විකල්ප ගුණාංග',
  'consent.authorize_scope': 'අවසර',
  'consent.essential_claims.info': 'සේවාව නිසි ලෙස ක්‍රියාත්මක වීම සඳහා මෙම ගුණාංග අවශ්‍ය වේ.',
  'consent.optional_claims.info': 'මෙම ගුණාංග විකල්ප වන අතර ඔබේ අභිමතය පරිදි සැපයිය හැක.',
  'consent.authorize_scope.info': 'මෙම අවසරයන් මගින් සේවාවට අමතර විශේෂාංග වෙත ප්‍රවේශ වීමට ඉඩ සලසයි.',

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': 'දෝෂය',
  'errors.signin.initialization': 'ආරම්භ කිරීමේදී දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signin.flow.failure': 'ලොග් වීමේදී දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signin.flow.completion.failure':
    'ලොග් වීමේ ක්‍රියාවලිය සම්පූර්ණ කිරීමේදී දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signin.flow.passkeys.failure': 'passkeys සමඟ ලොග් වීමේදී දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signin.flow.passkeys.completion.failure':
    'passkeys සමඟ ලොග් වීමේ ක්‍රියාවලිය සම්පූර්ණ කිරීමේදී දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signup.initialization': 'ආරම්භ කිරීමේදී දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signup.flow.failure': 'ගිණුම් තැනීමේ ක්‍රියාවලියේදී දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signup.flow.initialization.failure':
    'ගිණුම් තැනීමේ ක්‍රියාවලිය ආරම්භ කිරීමේදී දෝෂයක් සිදු විය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signup.popup.failure': 'උත්පතන කවුළුවේ ගිණුම් තැනීම දිගටම කරගෙන යා නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.',
  'errors.signup.components.not.available': 'ගිණුම් තැනීමේ පිටුව දැන් ලබා ගත නොහැකිය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signin.components.not.available': 'ප්‍රවේශ වීමේ පිටුව දැන් ලබා ගත නොහැකිය. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
  'errors.signin.timeout': 'පියවර සම්පූර්ණ කිරීමට ලබා දී තිබූ කාලය ඉකුත් වී ඇත.',
  /* Admin */
  'admin.common.loading': 'පූරණය වෙමින්…',
  'attribution.secured_by': 'ආරක්ෂාව සපයන්නේ',
  'attribution.powered_by': 'බලගැන්වෙන්නේ',
  'admin.common.actions.cancel': 'අවලංගු කරන්න',
  'admin.common.actions.confirm': 'තහවුරු කරන්න',
  'admin.common.actions.remove': 'ඉවත් කරන්න',
  'admin.common.columns.actions': 'ක්‍රියා',
  'admin.common.columns.organization_unit': 'සංවිධාන ඒකකය',
  'admin.common.errors.forbidden': 'මෙය කිරීමට ඔබට අවසර නැත.',
  'admin.common.errors.not_found': 'මෙම අයිතමය සොයාගත නොහැකි විය.',
  'admin.common.errors.no_ou': 'මෙම අයිතමය සෑදීමට පෙර සංවිධාන ඒකකයක් තෝරන්න.',
  'admin.common.fields.identity': 'නම',
  'admin.common.fields.identity_type': 'වර්ගය',
  'admin.common.fields.identity_placeholder': 'අනන්‍යතාවයක් තෝරන්න',
  'admin.common.fields.identity_empty': 'එක් කිරීමට කිසිවක් නැත',
  'admin.common.identity_types.user': 'පරිශීලකයා',
  'admin.common.identity_types.group': 'කණ්ඩායම',
  'admin.common.identity_types.agent': 'නියෝජිතයා',
  'admin.common.identity_types.app': 'යෙදුම',
  'admin.common.pagination.label': 'පිටු අංකනය',
  'admin.common.pagination.previous': 'පෙර',
  'admin.common.pagination.next': 'ඊළඟ',
  'admin.common.pagination.range': '{total} න් {start} සිට {end}',
  'admin.common.search.attribute': 'සෙවීම',
  'admin.common.search.submit': 'සොයන්න',
  'admin.common.search.clear': 'සෙවීම හිස් කරන්න',
  'admin.common.search.placeholder': 'නිවැරදි {attribute}',
  'admin.common.search.no_results': '"{value}" සඳහා ගැළපීම් නැත. සෙවීම සම්පූර්ණ අගයට ගැළපේ.',
  'admin.common.filters.type': 'පැවරුම් ලබන්නාගේ වර්ගය',
  'admin.common.filters.all_types': 'සියලු වර්ග',
  'admin.users.list.search.username': 'පරිශීලක නාමය',
  'admin.users.list.search.email': 'ඊමේල්',
  'admin.agents.list.search.name': 'නම',
  'admin.users.list.title': 'පරිශීලකයින්',
  'admin.users.list.columns.name': 'නම',
  'admin.users.list.columns.type': 'පරිශීලක වර්ගය',
  'admin.users.list.empty': 'පරිශීලකයින් හමු නොවීය.',
  'admin.users.list.error': 'පරිශීලකයින් පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.users.create.title': 'පරිශීලකයෙකු එක් කරන්න',
  'admin.users.create.submit': 'පරිශීලකයා සාදන්න',
  'admin.users.create.error': 'පරිශීලකයා සෑදිය නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.users.create.fields.type': 'පරිශීලක වර්ගය',
  'admin.users.create.fields.username': 'පරිශීලක නාමය',
  'admin.users.create.fields.email': 'ඊමේල්',
  'admin.users.create.fields.given_name': 'මුල් නම',
  'admin.users.create.fields.family_name': 'අවසාන නම',
  'admin.users.create.fields.password': 'මුරපදය',
  'admin.users.details.subtitle': 'පරිශීලක වර්ගය: {type}',
  'admin.users.details.attributes': 'ගුණාංග',
  'admin.users.details.no_attributes': 'ගුණාංග නැත.',
  'admin.users.details.groups': 'කණ්ඩායම්',
  'admin.users.details.no_groups': 'කිසිදු කණ්ඩායමක සාමාජිකයෙකු නොවේ.',
  'admin.users.details.error': 'මෙම පරිශීලකයා පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.users.details.delete.action': 'පරිශීලකයා මකන්න',
  'admin.users.details.delete.confirm': '{name} මකන්නද?',
  'admin.users.details.delete.error': 'පරිශීලකයා මැකිය නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.users.details.edit.action': 'සංස්කරණය',
  'admin.users.details.edit.save': 'වෙනස්කම් සුරකින්න',
  'admin.users.details.edit.error': 'පරිශීලකයා සුරැකිය නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.groups.list.title': 'කණ්ඩායම්',
  'admin.groups.list.columns.name': 'නම',
  'admin.groups.list.columns.description': 'විස්තරය',
  'admin.groups.list.empty': 'කණ්ඩායම් හමු නොවීය.',
  'admin.groups.list.error': 'කණ්ඩායම් පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.groups.create.title': 'කණ්ඩායමක් සාදන්න',
  'admin.groups.create.submit': 'කණ්ඩායම සාදන්න',
  'admin.groups.create.fields.name': 'නම',
  'admin.groups.create.fields.description': 'විස්තරය',
  'admin.groups.create.error': 'කණ්ඩායම සෑදිය නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.groups.members.title': 'සාමාජිකයින්',
  'admin.groups.members.add': 'සාමාජිකයෙකු එක් කරන්න',
  'admin.groups.members.columns.member': 'සාමාජිකයා',
  'admin.groups.members.columns.type': 'වර්ගය',
  'admin.groups.members.empty': 'මෙම කණ්ඩායමේ සාමාජිකයින් නැත.',
  'admin.groups.members.remove_label': '{name} කණ්ඩායමෙන් ඉවත් කරන්න',
  'admin.groups.members.error': 'සාමාජිකයින් පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.groups.members.update_error': 'සාමාජිකයින් යාවත්කාලීන කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.roles.list.title': 'භූමිකා',
  'admin.roles.list.columns.name': 'නම',
  'admin.roles.list.columns.description': 'විස්තරය',
  'admin.roles.list.empty': 'භූමිකා හමු නොවීය.',
  'admin.roles.list.error': 'භූමිකා පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.roles.create.title': 'භූමිකාවක් සාදන්න',
  'admin.roles.create.submit': 'භූමිකාව සාදන්න',
  'admin.roles.create.fields.name': 'නම',
  'admin.roles.create.fields.description': 'විස්තරය',
  'admin.roles.create.error': 'භූමිකාව සෑදිය නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.roles.assignments.title': 'පවරා ඇත්තේ',
  'admin.roles.assignments.add': 'භූමිකාව පවරන්න',
  'admin.roles.assignments.columns.assignee': 'ලබන්නා',
  'admin.roles.assignments.columns.type': 'වර්ගය',
  'admin.roles.assignments.empty': 'මෙම භූමිකාව කිසිවෙකුට පවරා නැත.',
  'admin.roles.assignments.remove_label': '{name} ගෙන් භූමිකාව ඉවත් කරන්න',
  'admin.roles.assignments.error': 'පැවරීම් පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.roles.assignments.update_error': 'පැවරීම් යාවත්කාලීන කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.roles.permissions.title': 'අවසර',
  'admin.roles.permissions.empty': 'මෙම භූමිකාව කිසිදු අවසරයක් ලබා නොදේ.',
  'admin.roles.permissions.error': 'අවසර පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.agents.list.title': 'නියෝජිතයින්',
  'admin.agents.list.columns.name': 'නම',
  'admin.agents.list.columns.type': 'නියෝජිත වර්ගය',
  'admin.agents.list.columns.client_id': 'සේවාලාභී හැඳුනුම්පත',
  'admin.agents.list.empty': 'නියෝජිතයින් හමු නොවීය.',
  'admin.agents.list.error': 'නියෝජිතයින් පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.agents.create.title': 'නියෝජිතයෙකු ලියාපදිංචි කරන්න',
  'admin.agents.create.submit': 'නියෝජිතයා ලියාපදිංචි කරන්න',
  'admin.agents.create.fields.name': 'නම',
  'admin.agents.create.fields.type': 'නියෝජිත වර්ගය',
  'admin.agents.create.fields.description': 'විස්තරය',
  'admin.agents.create.error': 'නියෝජිතයා ලියාපදිංචි කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.agents.details.overview': 'දළ විශ්ලේෂණය',
  'admin.agents.details.type': 'නියෝජිත වර්ගය',
  'admin.agents.details.owner': 'හිමිකරු',
  'admin.agents.details.no_owner': 'හිමිකරුවෙකු නැත',
  'admin.agents.details.groups': 'කණ්ඩායම්',
  'admin.agents.details.no_groups': 'කිසිදු කණ්ඩායමක සාමාජිකයෙකු නොවේ.',
  'admin.agents.details.roles': 'භූමිකා',
  'admin.agents.details.no_roles': 'භූමිකා පවරා නැත.',
  'admin.agents.details.error': 'මෙම නියෝජිතයා පූරණය කළ නොහැකි විය. නැවත උත්සාහ කරන්න.',
  'admin.agents.details.delete.action': 'නියෝජිතයා මකන්න',
  'admin.agents.details.delete.confirm': '{name} මකන්නද?',
  'admin.agents.details.delete.error': 'නියෝජිතයා මැකිය නොහැකි විය. නැවත උත්සාහ කරන්න.',
};

const metadata: I18nMetadata = {
  localeCode: 'si_LK',
  countryCode: 'LK',
  languageCode: 'si',
  displayName: 'සිංහල (ශ්‍රී ලංකාව)',
  direction: 'ltr',
};

const si_LK: I18nBundle = {
  metadata,
  translations,
};

export default si_LK;

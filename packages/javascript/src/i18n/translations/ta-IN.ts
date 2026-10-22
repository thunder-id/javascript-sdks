// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {I18nTranslations, I18nMetadata, I18nBundle} from '../models/i18n';

const translations: I18nTranslations = {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  /* Buttons */
  'elements.buttons.signin.text': 'உள்நுழை',
  'elements.buttons.signout.text': 'வெளியேறு',
  'elements.buttons.signup.text': 'பதிவு செய்',
  'elements.buttons.submit.text': 'தொடரவும்',
  'elements.buttons.facebook.text': 'Facebook மூலம் தொடரவும்',
  'elements.buttons.google.text': 'Google மூலம் தொடரவும்',
  'elements.buttons.github.text': 'GitHub மூலம் தொடரவும்',
  'elements.buttons.microsoft.text': 'Microsoft மூலம் தொடரவும்',
  'elements.buttons.linkedin.text': 'LinkedIn மூலம் தொடரவும்',
  'elements.buttons.ethereum.text': 'Ethereum மூலம் உள்நுழை',
  'elements.buttons.smsotp.text': 'SMS மூலம் தொடரவும்',
  'elements.buttons.multi.option.text': '{connection} மூலம் தொடரவும்',
  'elements.buttons.social.text': '{connection} மூலம் தொடரவும்',

  /* Display */
  'elements.display.divider.or_separator': 'அல்லது',
  'elements.display.copyable_text.copy': 'நகலெடுக்கவும்',
  'elements.display.copyable_text.copied': 'நகலெடுக்கப்பட்டது!',
  'elements.display.copyable_text.show': 'காட்டு',
  'elements.display.copyable_text.hide': 'மறை',

  /* Fields */
  'elements.fields.generic.placeholder': '{field} உள்ளிடவும்',
  'elements.fields.username.label': 'பயனர்பெயர்',
  'elements.fields.username.placeholder': 'பயனர்பெயரை உள்ளிடவும்',
  'elements.fields.password.label': 'கடவுச்சொல்',
  'elements.fields.password.placeholder': 'கடவுச்சொலை உள்ளிடவும்',
  'elements.fields.first_name.label': 'முதல் பெயர்',
  'elements.fields.first_name.placeholder': 'உங்கள் முதல் பெயரை உள்ளிடவும்',
  'elements.fields.last_name.label': 'கடைசி பெயர்',
  'elements.fields.last_name.placeholder': 'உங்கள் கடைசி பெயரை உள்ளிடவும்',
  'elements.fields.email.label': 'மின்னஞ்சல்',
  'elements.fields.email.placeholder': 'உங்கள் மின்னஞ்சலை உள்ளிடவும்',
  'elements.fields.organization.name.label': 'அமைப்பின் பெயர்',
  'elements.fields.organization.handle.label': 'அமைப்பு கையாளுதல்',
  'elements.fields.organization.description.label': 'அமைப்பு விளக்கம்',
  'elements.fields.organization.select.label': 'அமைப்பை தேர்ந்தெடு',
  'elements.fields.organization.select.placeholder': 'அமைப்பை தெரிந்தெடுக்கவும்',

  /* Select */
  'elements.fields.auth_flow_select.aria_label': 'உள்நுழைவு ஓட்டத்தைத் தேர்ந்தெடுக்கவும்',
  'elements.fields.auth_flow_select.empty': 'உள்நுழைவு ஓட்டங்கள் எதுவும் கிடைக்கவில்லை.',
  'elements.fields.select.load_more': 'மேலும் ஏற்றவும்',
  'elements.fields.select.loading': 'ஏற்றுகிறது…',
  'elements.fields.select.loading_more': 'மேலும் ஏற்றுகிறது…',
  'elements.fields.user_select.aria_label': 'ஒரு பயனரைத் தேர்ந்தெடுக்கவும்',
  'elements.fields.user_select.empty': 'பயனர்கள் எவரும் கிடைக்கவில்லை.',
  'elements.fields.user_type_select.aria_label': 'பயனர் வகையைத் தேர்ந்தெடுக்கவும்',
  'elements.fields.user_type_select.empty': 'பயனர் வகைகள் எவையும் கிடைக்கவில்லை.',

  /* Validation */
  'validations.required.field.error': 'இந்த புலம் தேவை',
  'validation.pattern.invalid': 'இந்த மதிப்பு தேவையான வடிவத்துடன் பொருந்தவில்லை.',
  'validation.minLength.invalid': 'இந்த மதிப்பு மிகவும் குறுகியது.',
  'validation.maxLength.invalid': 'இந்த மதிப்பு மிகவும் நீளமானது.',

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'signin.heading': 'உள்நுழை',
  'signin.subheading': 'தொடர உங்கள் சான்றுகளை உள்ளிடவும்.',
  'signin.images.app_logo.alt': 'பயன்பாட்டு லோகோ',

  /* Base Sign Up */
  'signup.heading': 'பதிவு செய்',
  'signup.subheading': 'தொடங்க புதிய கணக்கை உருவாக்கவும்.',

  /* Email OTP */
  'email.otp.heading': 'OTP சரிபார்ப்பு',
  'email.otp.subheading': 'உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்ட குறியீட்டை உள்ளிடவும்.',
  'email.otp.buttons.submit.text': 'தொடரவும்',

  /* Identifier First */
  'identifier.first.heading': 'உள்நுழை',
  'identifier.first.subheading': 'பயனர்பெயர் அல்லது மின்னஞ்சல் முகவரியை உள்ளிடவும்.',
  'identifier.first.buttons.submit.text': 'தொடரவும்',

  /* SMS OTP */
  'sms.otp.heading': 'OTP சரிபார்ப்பு',
  'sms.otp.subheading': 'உங்கள் தொலைபேசிக்கு அனுப்பப்பட்ட குறியீட்டை உள்ளிடவும்.',
  'sms.otp.buttons.submit.text': 'தொடரவும்',

  /* TOTP */
  'totp.heading': 'உங்கள் அடையாளத்தை சரிபார்க்கவும்',
  'totp.subheading': 'உங்கள் அங்கீகரிப்பு செயலியில் உள்ள குறியீட்டை உள்ளிடவும்.',
  'totp.buttons.submit.text': 'தொடரவும்',

  /* Username Password */
  'username.password.buttons.submit.text': 'தொடரவும்',
  'username.password.heading': 'உள்நுழை',
  'username.password.subheading': 'தொடர உங்கள் பயனர்பெயர் மற்றும் கடவுச்சொல்லை உள்ளிடவும்.',

  /* Passkeys */
  'passkey.button.use': 'Passkey மூலம் உள்நுழையவும்',
  'passkey.signin.heading': 'Passkey மூலம் உள்நுழையவும்',
  'passkey.register.heading': 'Passkey-ஐ பதிவு செய்யவும்',
  'passkey.register.description': 'கடவுச்சொல் இல்லாமல் பாதுகாப்பாக உள்நுழைய ஒரு passkey-ஐ உருவாக்கவும்.',

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': 'சுயவிவரம்',
  'user.profile.update.generic.error':
    'உங்கள் சுயவிவரத்தை புதுப்பிக்கும் போது பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': '{credential} மாற்றவும்',
  'user.change_password.new.label': 'புதிய {credential}',
  'user.change_password.new.placeholder': 'உங்கள் புதிய {credentialLower}-ஐ உள்ளிடவும்',
  'user.change_password.confirm.label': 'புதிய {credential}-ஐ உறுதிப்படுத்தவும்',
  'user.change_password.confirm.placeholder': 'உங்கள் புதிய {credentialLower}-ஐ மீண்டும் உள்ளிடவும்',
  'user.change_password.requirements.heading': 'உங்கள் {credentialLower} பின்வருவனவற்றைக் கொண்டிருக்க வேண்டும்:',
  'user.change_password.submit': '{credential}-ஐ புதுப்பிக்கவும்',
  'user.change_password.success': 'உங்கள் {credentialLower} புதுப்பிக்கப்பட்டது.',
  'user.change_password.mismatch.error': '{credentialLower} பொருந்தவில்லை.',
  'user.change_password.generic.error':
    'உங்கள் {credentialLower}-ஐ புதுப்பிக்கும் போது பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
  'user.change_password.unavailable.heading': '{credential} மாற்றங்கள் கிடைக்கவில்லை',
  'user.change_password.unavailable.description': 'உங்கள் நிர்வாகியை தொடர்பு கொள்ளவும்.',
  'validation.password.pattern': 'தேவையான வடிவமைப்பிற்கு பொருந்துகிறது',

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': 'அமைப்பை மாற்று',
  'organization.switcher.loading.placeholder.organizations': 'அமைப்புகள் ஏற்றப்படுகின்றன...',
  'organization.switcher.members': 'உறுப்பினர்கள்',
  'organization.switcher.member': 'உறுப்பினர்',
  'organization.switcher.create.organization': 'அமைப்பை உருவாக்கு',
  'organization.switcher.manage.organizations': 'அமைப்புகளை நிர்வகிக்கவும்',
  'organization.switcher.buttons.manage.text': 'நிர்வகி',
  'organization.switcher.organizations.heading': 'அமைப்புகள்',
  'organization.switcher.buttons.switch.text': 'மாற்று',
  'organization.switcher.no.access': 'அணுகல் இல்லை',
  'organization.switcher.status.label': 'நிலை:',
  'organization.switcher.showing.count': 'மொத்த {total} அமைப்புகளில் {showing} காட்டப்படுகிறது',
  'organization.switcher.buttons.refresh.text': 'புதுப்பி',
  'organization.switcher.buttons.load_more.text': 'மேலும் அமைப்புகளை ஏற்று',
  'organization.switcher.loading.more': 'ஏற்றப்படுகிறது...',
  'organization.switcher.no.organizations': 'எந்த அமைப்பும் கிடைக்கவில்லை',
  'organization.switcher.error.prefix': 'பிழை:',

  'organization.profile.heading': 'அமைப்பு சுயவிவரம்',
  'organization.profile.loading': 'அமைப்பை ஏற்றுகிறது...',
  'organization.profile.error': 'அமைப்பை ஏற்ற முடியவில்லை',

  'organization.create.heading': 'அமைப்பை உருவாக்கு',
  'organization.create.buttons.create_organization.text': 'அமைப்பை உருவாக்கு',
  'organization.create.buttons.create_organization.loading.text': 'உருவாக்கப்படுகிறது...',
  'organization.create.buttons.cancel.text': 'ரத்து செய்',

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': 'ஏற்றப்படுகிறது...',

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': 'தேவையானது',
  'consent.essential_claims': 'அத்தியாவசிய பண்புகள்',
  'consent.optional_claims': 'விருப்பத் பண்புகள்',
  'consent.authorize_scope': 'அனுமதிகள்',
  'consent.essential_claims.info': 'சேவை சரியாக செயல்பட இந்த பண்புகள் தேவை.',
  'consent.optional_claims.info': 'இந்த பண்புகள் விருப்பத்தேர்வு மற்றும் உங்கள் விருப்பப்படி வழங்கப்படலாம்.',
  'consent.authorize_scope.info': 'இந்த அனுமதிகள் கூடுதல் அம்சங்களை அணுக சேவைக்கு உதவுகின்றன.',

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': 'பிழை',
  'errors.signin.initialization': 'தொடக்கத்தில் பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signin.flow.failure': 'உள்நுழைவு செயல்பாட்டின் போது பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signin.flow.completion.failure':
    'உள்நுழைவு செயல்பாட்டை முடிக்கும் போது பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signin.flow.passkeys.failure':
    'பாஸ்கீக்கள் மூலம் உள்நுழையும்போது பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signin.flow.passkeys.completion.failure':
    'பாஸ்கீ உள்நுழைவு முடிக்கும் போது பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signup.initialization': 'தொடங்கும்போது பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signup.flow.failure': 'பதிவு செய்யும் செயல்பாட்டில் பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signup.flow.initialization.failure':
    'பதிவு செய்யும் செயல்பாட்டை தொடங்கும்போது பிழை ஏற்பட்டது. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signup.popup.failure': 'பாப்-அப் சாளரத்தில் பதிவைத் தொடர முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'errors.signup.components.not.available': 'பதிவு படிவம் இப்போது கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signin.components.not.available': 'உள்நுழைவு படிவம் இப்போது கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signin.timeout': 'படிநிலையை முடிக்க அனுமதிக்கப்பட்ட நேரம் காலாவதியானது.',
  /* Admin */
  'admin.common.loading': 'ஏற்றுகிறது…',
  'attribution.secured_by': 'பாதுகாப்பு வழங்குநர்',
  'attribution.powered_by': 'இயக்குவது',
  'admin.common.actions.cancel': 'ரத்துசெய்',
  'admin.common.actions.confirm': 'உறுதிப்படுத்து',
  'admin.common.actions.remove': 'அகற்று',
  'admin.common.columns.actions': 'செயல்கள்',
  'admin.common.columns.organization_unit': 'நிறுவன அலகு',
  'admin.common.errors.forbidden': 'இதைச் செய்ய உங்களுக்கு அனுமதி இல்லை.',
  'admin.common.errors.not_found': 'இந்த உருப்படியைக் கண்டறிய முடியவில்லை.',
  'admin.common.errors.no_ou': 'இந்த உருப்படியை உருவாக்கும் முன் ஒரு நிறுவன அலகைத் தேர்ந்தெடுக்கவும்.',
  'admin.common.fields.identity': 'பெயர்',
  'admin.common.fields.identity_type': 'வகை',
  'admin.common.fields.identity_placeholder': 'ஒரு அடையாளத்தைத் தேர்ந்தெடுக்கவும்',
  'admin.common.fields.identity_empty': 'சேர்க்க எதுவும் இல்லை',
  'admin.common.identity_types.user': 'பயனர்',
  'admin.common.identity_types.group': 'குழு',
  'admin.common.identity_types.agent': 'முகவர்',
  'admin.common.identity_types.app': 'பயன்பாடு',
  'admin.common.pagination.label': 'பக்க வரிசை',
  'admin.common.pagination.previous': 'முந்தைய',
  'admin.common.pagination.next': 'அடுத்து',
  'admin.common.pagination.range': '{total} இல் {start} முதல் {end} வரை',
  'admin.common.search.attribute': 'இதன்படி தேடு',
  'admin.common.search.submit': 'தேடு',
  'admin.common.search.clear': 'தேடலை அழி',
  'admin.common.search.placeholder': 'சரியான {attribute}',
  'admin.common.search.no_results': '"{value}" க்குப் பொருத்தங்கள் இல்லை. தேடல் முழு மதிப்புடன் பொருந்தும்.',
  'admin.common.filters.type': 'ஒதுக்கப்பட்டவர் வகை',
  'admin.common.filters.all_types': 'அனைத்து வகைகளும்',
  'admin.users.list.search.username': 'பயனர்பெயர்',
  'admin.users.list.search.email': 'மின்னஞ்சல்',
  'admin.agents.list.search.name': 'பெயர்',
  'admin.users.list.title': 'பயனர்கள்',
  'admin.users.list.columns.name': 'பெயர்',
  'admin.users.list.columns.type': 'பயனர் வகை',
  'admin.users.list.empty': 'பயனர்கள் எவரும் இல்லை.',
  'admin.users.list.error': 'பயனர்களை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.users.create.title': 'பயனரைச் சேர்',
  'admin.users.create.submit': 'பயனரை உருவாக்கு',
  'admin.users.create.error': 'பயனரை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.users.create.fields.type': 'பயனர் வகை',
  'admin.users.create.fields.username': 'பயனர்பெயர்',
  'admin.users.create.fields.email': 'மின்னஞ்சல்',
  'admin.users.create.fields.given_name': 'முதல் பெயர்',
  'admin.users.create.fields.family_name': 'கடைசி பெயர்',
  'admin.users.create.fields.password': 'கடவுச்சொல்',
  'admin.users.details.subtitle': 'பயனர் வகை: {type}',
  'admin.users.details.attributes': 'பண்புகள்',
  'admin.users.details.no_attributes': 'பண்புகள் இல்லை.',
  'admin.users.details.groups': 'குழுக்கள்',
  'admin.users.details.no_groups': 'எந்தக் குழுவிலும் உறுப்பினர் இல்லை.',
  'admin.users.details.error': 'இந்தப் பயனரை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.users.details.delete.action': 'பயனரை நீக்கு',
  'admin.users.details.delete.confirm': '{name} ஐ நீக்கவா?',
  'admin.users.details.delete.error': 'பயனரை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.users.details.edit.action': 'திருத்து',
  'admin.users.details.edit.save': 'மாற்றங்களைச் சேமி',
  'admin.users.details.edit.error': 'பயனரைச் சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.groups.list.title': 'குழுக்கள்',
  'admin.groups.list.columns.name': 'பெயர்',
  'admin.groups.list.columns.description': 'விளக்கம்',
  'admin.groups.list.empty': 'குழுக்கள் எதுவும் இல்லை.',
  'admin.groups.list.error': 'குழுக்களை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.groups.create.title': 'குழுவை உருவாக்கு',
  'admin.groups.create.submit': 'குழுவை உருவாக்கு',
  'admin.groups.create.fields.name': 'பெயர்',
  'admin.groups.create.fields.description': 'விளக்கம்',
  'admin.groups.create.error': 'குழுவை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.groups.members.title': 'உறுப்பினர்கள்',
  'admin.groups.members.add': 'உறுப்பினரைச் சேர்',
  'admin.groups.members.columns.member': 'உறுப்பினர்',
  'admin.groups.members.columns.type': 'வகை',
  'admin.groups.members.empty': 'இந்தக் குழுவில் உறுப்பினர்கள் இல்லை.',
  'admin.groups.members.remove_label': '{name} ஐ குழுவிலிருந்து அகற்று',
  'admin.groups.members.error': 'உறுப்பினர்களை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.groups.members.update_error': 'உறுப்பினர்களைப் புதுப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.roles.list.title': 'பங்குகள்',
  'admin.roles.list.columns.name': 'பெயர்',
  'admin.roles.list.columns.description': 'விளக்கம்',
  'admin.roles.list.empty': 'பங்குகள் எதுவும் இல்லை.',
  'admin.roles.list.error': 'பங்குகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.roles.create.title': 'பங்கை உருவாக்கு',
  'admin.roles.create.submit': 'பங்கை உருவாக்கு',
  'admin.roles.create.fields.name': 'பெயர்',
  'admin.roles.create.fields.description': 'விளக்கம்',
  'admin.roles.create.error': 'பங்கை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.roles.assignments.title': 'ஒதுக்கப்பட்டவர்கள்',
  'admin.roles.assignments.add': 'பங்கை ஒதுக்கு',
  'admin.roles.assignments.columns.assignee': 'பெறுநர்',
  'admin.roles.assignments.columns.type': 'வகை',
  'admin.roles.assignments.empty': 'இந்தப் பங்கு யாருக்கும் ஒதுக்கப்படவில்லை.',
  'admin.roles.assignments.remove_label': '{name} இடமிருந்து பங்கை அகற்று',
  'admin.roles.assignments.error': 'ஒதுக்கீடுகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.roles.assignments.update_error': 'ஒதுக்கீடுகளைப் புதுப்பிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.roles.permissions.title': 'அனுமதிகள்',
  'admin.roles.permissions.empty': 'இந்தப் பங்கு எந்த அனுமதியையும் வழங்கவில்லை.',
  'admin.roles.permissions.error': 'அனுமதிகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.agents.list.title': 'முகவர்கள்',
  'admin.agents.list.columns.name': 'பெயர்',
  'admin.agents.list.columns.type': 'முகவர் வகை',
  'admin.agents.list.columns.client_id': 'கிளையன்ட் ஐடி',
  'admin.agents.list.empty': 'முகவர்கள் எவரும் இல்லை.',
  'admin.agents.list.error': 'முகவர்களை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.agents.create.title': 'முகவரைப் பதிவு செய்',
  'admin.agents.create.submit': 'முகவரைப் பதிவு செய்',
  'admin.agents.create.fields.name': 'பெயர்',
  'admin.agents.create.fields.type': 'முகவர் வகை',
  'admin.agents.create.fields.description': 'விளக்கம்',
  'admin.agents.create.error': 'முகவரைப் பதிவு செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.agents.details.overview': 'மேலோட்டம்',
  'admin.agents.details.type': 'முகவர் வகை',
  'admin.agents.details.owner': 'உரிமையாளர்',
  'admin.agents.details.no_owner': 'உரிமையாளர் இல்லை',
  'admin.agents.details.groups': 'குழுக்கள்',
  'admin.agents.details.no_groups': 'எந்தக் குழுவிலும் உறுப்பினர் இல்லை.',
  'admin.agents.details.roles': 'பங்குகள்',
  'admin.agents.details.no_roles': 'பங்குகள் எதுவும் ஒதுக்கப்படவில்லை.',
  'admin.agents.details.error': 'இந்த முகவரை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
  'admin.agents.details.delete.action': 'முகவரை நீக்கு',
  'admin.agents.details.delete.confirm': '{name} ஐ நீக்கவா?',
  'admin.agents.details.delete.error': 'முகவரை நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.',
};

const metadata: I18nMetadata = {
  localeCode: 'ta-IN',
  countryCode: 'IN',
  languageCode: 'ta',
  displayName: 'தமிழ் (இலங்கை)',
  direction: 'ltr',
};

const ta_IN: I18nBundle = {
  metadata,
  translations,
};

export default ta_IN;

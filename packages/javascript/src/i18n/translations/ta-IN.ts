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

  'user.change_password.heading': 'கடவுச்சொல்லை மாற்று',
  'user.change_password.current.label': 'தற்போதைய கடவுச்சொல்',
  'user.change_password.current.placeholder': 'உங்கள் தற்போதைய கடவுச்சொல்லை உள்ளிடவும்',
  'user.change_password.new.label': 'புதிய கடவுச்சொல்',
  'user.change_password.new.placeholder': 'உங்கள் புதிய கடவுச்சொல்லை உள்ளிடவும்',
  'user.change_password.confirm.label': 'புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்',
  'user.change_password.confirm.placeholder': 'உங்கள் புதிய கடவுச்சொல்லை மீண்டும் உள்ளிடவும்',
  'user.change_password.requirements.heading': 'உங்கள் கடவுச்சொல்லில் இருக்க வேண்டியவை:',
  'user.change_password.submit': 'கடவுச்சொல்லைப் புதுப்பி',
  'user.change_password.success': 'உங்கள் கடவுச்சொல் புதுப்பிக்கப்பட்டது.',
  'user.change_password.mismatch.error': 'கடவுச்சொற்கள் பொருந்தவில்லை.',
  'user.change_password.same.as.current.error': 'உங்கள் புதிய கடவுச்சொல் தற்போதையதிலிருந்து வேறுபட்டிருக்க வேண்டும்.',
  'user.change_password.current.invalid.error': 'உங்கள் தற்போதைய கடவுச்சொல் தவறானது.',
  'user.change_password.generic.error':
    'உங்கள் கடவுச்சொல்லைப் புதுப்பிக்கும்போது பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.',
  'user.change_password.unavailable.heading': 'கடவுச்சொல் மாற்றம் கிடைக்கவில்லை',
  'user.change_password.unavailable.description':
    'இந்தக் கணக்கு கடவுச்சொல்லைப் பயன்படுத்துவதில்லை, எனவே அதை இங்கு மாற்ற முடியாது.',
  'validation.password.pattern': 'தேவையான வடிவத்துடன் பொருந்துகிறது',

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
  'errors.signup.components.not.available': 'பதிவு படிவம் இப்போது கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signin.components.not.available': 'உள்நுழைவு படிவம் இப்போது கிடைக்கவில்லை. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  'errors.signin.timeout': 'படிநிலையை முடிக்க அனுமதிக்கப்பட்ட நேரம் காலாவதியானது.',
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

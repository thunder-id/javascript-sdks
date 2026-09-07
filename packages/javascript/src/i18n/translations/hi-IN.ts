// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {I18nTranslations, I18nMetadata, I18nBundle} from '../models/i18n';

const translations: I18nTranslations = {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  /* Buttons */
  'elements.buttons.signin.text': 'साइन इन',
  'elements.buttons.signout.text': 'साइन आउट',
  'elements.buttons.signup.text': 'साइन अप',
  'elements.buttons.submit.text': 'जारी रखें',
  'elements.buttons.facebook.text': 'Facebook के साथ जारी रखें',
  'elements.buttons.google.text': 'Google के साथ जारी रखें',
  'elements.buttons.github.text': 'GitHub के साथ जारी रखें',
  'elements.buttons.microsoft.text': 'Microsoft के साथ जारी रखें',
  'elements.buttons.linkedin.text': 'LinkedIn के साथ जारी रखें',
  'elements.buttons.ethereum.text': 'Ethereum के साथ साइन इन करें',
  'elements.buttons.smsotp.text': 'SMS के साथ जारी रखें',
  'elements.buttons.multi.option.text': '{connection} के साथ जारी रखें',
  'elements.buttons.social.text': '{connection} के साथ जारी रखें',

  /* Display */
  'elements.display.divider.or_separator': 'या',
  'elements.display.copyable_text.copy': 'प्रतिलिपि',
  'elements.display.copyable_text.copied': 'नकल की गई!',

  /* Fields */
  'elements.fields.generic.placeholder': '{field} दर्ज करें',
  'elements.fields.username.label': 'उपयोगकर्ता नाम',
  'elements.fields.username.placeholder': 'अपना उपयोगकर्ता नाम दर्ज करें',
  'elements.fields.password.label': 'पासवर्ड',
  'elements.fields.password.placeholder': 'अपना पासवर्ड दर्ज करें',
  'elements.fields.first_name.label': 'पहला नाम',
  'elements.fields.first_name.placeholder': 'अपना पहला नाम दर्ज करें',
  'elements.fields.last_name.label': 'अंतिम नाम',
  'elements.fields.last_name.placeholder': 'अपना अंतिम नाम दर्ज करें',
  'elements.fields.email.label': 'ईमेल',
  'elements.fields.email.placeholder': 'अपना ईमेल दर्ज करें',
  'elements.fields.organization.name.label': 'संगठन का नाम',
  'elements.fields.organization.handle.label': 'संगठन हैंडल',
  'elements.fields.organization.description.label': 'संगठन विवरण',
  'elements.fields.organization.select.label': 'संगठन चुनें',
  'elements.fields.organization.select.placeholder': 'एक संगठन चुनें',

  /* Validation */
  'validations.required.field.error': 'यह फील्ड आवश्यक है',
  'validation.pattern.invalid': 'यह मान आवश्यक प्रारूप से मेल नहीं खाता।',
  'validation.minLength.invalid': 'यह मान बहुत छोटा है।',
  'validation.maxLength.invalid': 'यह मान बहुत लंबा है।',

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'signin.heading': 'साइन इन',
  'signin.subheading': 'जारी रखने के लिए अपनी प्रमाणिक जानकारी दर्ज करें।',
  'signin.images.app_logo.alt': 'एप्लिकेशन लोगो',

  /* Base Sign Up */
  'signup.heading': 'साइन अप',
  'signup.subheading': 'शुरू करने के लिए नया खाता बनाएं।',

  /* Email OTP */
  'email.otp.heading': 'OTP सत्यापन',
  'email.otp.subheading': 'अपनी ईमेल पर भेजा गया कोड दर्ज करें।',
  'email.otp.buttons.submit.text': 'जारी रखें',

  /* Identifier First */
  'identifier.first.heading': 'साइन इन',
  'identifier.first.subheading': 'अपना उपयोगकर्ता नाम या ईमेल दर्ज करें।',
  'identifier.first.buttons.submit.text': 'जारी रखें',

  /* SMS OTP */
  'sms.otp.heading': 'OTP सत्यापन',
  'sms.otp.subheading': 'अपने फ़ोन नंबर पर भेजा गया कोड दर्ज करें।',
  'sms.otp.buttons.submit.text': 'जारी रखें',

  /* TOTP */
  'totp.heading': 'अपनी पहचान सत्यापित करें',
  'totp.subheading': 'अपने ऑथेंटिकेटर ऐप से कोड दर्ज करें।',
  'totp.buttons.submit.text': 'जारी रखें',

  /* Username Password */
  'username.password.buttons.submit.text': 'जारी रखें',
  'username.password.heading': 'साइन इन',
  'username.password.subheading': 'अपना उपयोगकर्ता नाम और पासवर्ड दर्ज करें।',

  /* Passkeys */
  'passkey.button.use': 'Passkey के साथ साइन इन करें',
  'passkey.signin.heading': 'Passkey के साथ साइन इन करें',
  'passkey.register.heading': 'Passkey पंजीकृत करें',
  'passkey.register.description': 'बिना पासवर्ड के अपने खाते में सुरक्षित रूप से साइन इन करने के लिए एक Passkey बनाएं।',

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': 'प्रोफ़ाइल',
  'user.profile.update.generic.error': 'प्रोफ़ाइल अपडेट करते समय त्रुटि हुई। कृपया पुनः प्रयास करें।',

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': 'पासवर्ड बदलें',
  'user.change_password.current.label': 'वर्तमान पासवर्ड',
  'user.change_password.current.placeholder': 'अपना वर्तमान पासवर्ड दर्ज करें',
  'user.change_password.new.label': 'नया पासवर्ड',
  'user.change_password.new.placeholder': 'अपना नया पासवर्ड दर्ज करें',
  'user.change_password.confirm.label': 'नए पासवर्ड की पुष्टि करें',
  'user.change_password.confirm.placeholder': 'अपना नया पासवर्ड फिर से दर्ज करें',
  'user.change_password.requirements.heading': 'आपके पासवर्ड में होना चाहिए:',
  'user.change_password.submit': 'पासवर्ड अपडेट करें',
  'user.change_password.success': 'आपका पासवर्ड अपडेट कर दिया गया है।',
  'user.change_password.mismatch.error': 'पासवर्ड मेल नहीं खाते।',
  'user.change_password.same.as.current.error': 'आपका नया पासवर्ड वर्तमान पासवर्ड से अलग होना चाहिए।',
  'user.change_password.current.invalid.error': 'आपका वर्तमान पासवर्ड गलत है।',
  'user.change_password.generic.error': 'पासवर्ड अपडेट करते समय त्रुटि हुई। कृपया पुनः प्रयास करें।',
  'user.change_password.unavailable.heading': 'पासवर्ड बदलना उपलब्ध नहीं है',
  'user.change_password.unavailable.description':
    'यह खाता पासवर्ड का उपयोग नहीं करता, इसलिए इसे यहाँ बदला नहीं जा सकता।',
  'validation.password.pattern': 'आवश्यक प्रारूप से मेल खाता है',

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': 'संगठन बदलें',
  'organization.switcher.loading.placeholder.organizations': 'संगठन लोड हो रहे हैं...',
  'organization.switcher.members': 'सदस्य',
  'organization.switcher.member': 'सदस्य',
  'organization.switcher.create.organization': 'संगठन बनाएं',
  'organization.switcher.manage.organizations': 'संगठनों का प्रबंधन करें',
  'organization.switcher.buttons.manage.text': 'प्रबंधित करें',
  'organization.switcher.organizations.heading': 'संगठन',
  'organization.switcher.buttons.switch.text': 'बदलें',
  'organization.switcher.no.access': 'कोई पहुँच नहीं',
  'organization.switcher.status.label': 'स्थिति:',
  'organization.switcher.showing.count': '{total} में से {showing} संगठन दिखा रहे हैं',
  'organization.switcher.buttons.refresh.text': 'रिफ्रेश',
  'organization.switcher.buttons.load_more.text': 'और संगठन लोड करें',
  'organization.switcher.loading.more': 'लोड हो रहा है...',
  'organization.switcher.no.organizations': 'कोई संगठन नहीं मिला',
  'organization.switcher.error.prefix': 'त्रुटि:',

  'organization.profile.heading': 'संगठन प्रोफ़ाइल',
  'organization.profile.loading': 'संगठन लोड हो रहा है...',
  'organization.profile.error': 'संगठन लोड करने में विफल',

  'organization.create.heading': 'संगठन बनाएं',
  'organization.create.buttons.create_organization.text': 'संगठन बनाएं',
  'organization.create.buttons.create_organization.loading.text': 'बनाया जा रहा है...',
  'organization.create.buttons.cancel.text': 'रद्द करें',

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': 'लोड हो रहा है...',

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': 'आवश्यक',
  'consent.essential_claims': 'आवश्यक विशेषताएँ',
  'consent.optional_claims': 'वैकल्पिक विशेषताएँ',
  'consent.authorize_scope': 'अनुमतियाँ',
  'consent.essential_claims.info': 'सेवा के सही ढंग से कार्य करने के लिए ये विशेषताएँ आवश्यक हैं।',
  'consent.optional_claims.info': 'ये विशेषताएँ वैकल्पिक हैं और आपके विवेकानुसार प्रदान की जा सकती हैं।',
  'consent.authorize_scope.info': 'ये अनुमतियाँ सेवा को अतिरिक्त सुविधाओं तक पहुँचने की अनुमति देती हैं।',

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': 'त्रुटि',
  'errors.signin.initialization': 'इनिशियलाइज़ेशन में त्रुटि हुई। कृपया बाद में पुनः प्रयास करें।',
  'errors.signin.flow.failure': 'साइन-इन प्रक्रिया में त्रुटि। कृपया बाद में पुनः प्रयास करें।',
  'errors.signin.flow.completion.failure': 'साइन-इन प्रक्रिया पूरी करते समय त्रुटि। कृपया बाद में पुनः प्रयास करें।',
  'errors.signin.flow.passkeys.failure': 'पासकीज़ के साथ साइन-इन करते समय त्रुटि।',
  'errors.signin.flow.passkeys.completion.failure': 'पासकीज़ साइन-इन पूरी करते समय त्रुटि।',
  'errors.signup.initialization': 'प्रारंभीकरण के दौरान एक त्रुटि हुई। कृपया बाद में पुनः प्रयास करें।',
  'errors.signup.flow.failure': 'साइन-अप प्रक्रिया में त्रुटि। कृपया बाद में पुनः प्रयास करें।',
  'errors.signup.flow.initialization.failure':
    'साइन-अप प्रक्रिया प्रारंभ करते समय त्रुटि। कृपया बाद में पुनः प्रयास करें।',
  'errors.signup.components.not.available': 'साइन-अप फॉर्म फिलहाल उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।',
  'errors.signin.components.not.available': 'साइन-इन फॉर्म फिलहाल उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।',
  'errors.signin.timeout': 'स्टेप पूरा करने के लिए दिया गया समय खत्म हो गया है।',
};

const metadata: I18nMetadata = {
  localeCode: 'hi-IN',
  countryCode: 'IN',
  languageCode: 'hi',
  displayName: 'हिन्दी (भारत)',
  direction: 'ltr',
};

const hi_IN: I18nBundle = {
  metadata,
  translations,
};

export default hi_IN;

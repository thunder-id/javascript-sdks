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
  'elements.display.copyable_text.show': 'दिखाएं',
  'elements.display.copyable_text.hide': 'छिपाएं',

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

  /* Select */
  'elements.fields.auth_flow_select.aria_label': 'लॉगिन फ़्लो चुनें',
  'elements.fields.auth_flow_select.empty': 'कोई लॉगिन फ़्लो नहीं मिला।',
  'elements.fields.select.load_more': 'और लोड करें',
  'elements.fields.select.loading': 'लोड हो रहा है…',
  'elements.fields.select.loading_more': 'और लोड हो रहा है…',
  'elements.fields.user_select.aria_label': 'एक उपयोगकर्ता चुनें',
  'elements.fields.user_select.empty': 'कोई उपयोगकर्ता नहीं मिला।',
  'elements.fields.user_type_select.aria_label': 'उपयोगकर्ता प्रकार चुनें',
  'elements.fields.user_type_select.empty': 'कोई उपयोगकर्ता प्रकार नहीं मिला।',

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

  'user.change_password.heading': '{credential} बदलें',
  'user.change_password.new.label': 'नया {credential}',
  'user.change_password.new.placeholder': 'अपना नया {credentialLower} दर्ज करें',
  'user.change_password.confirm.label': 'नए {credential} की पुष्टि करें',
  'user.change_password.confirm.placeholder': 'अपना नया {credentialLower} फिर से दर्ज करें',
  'user.change_password.requirements.heading': 'आपके {credentialLower} में यह होना चाहिए:',
  'user.change_password.submit': '{credential} अपडेट करें',
  'user.change_password.success': 'आपका {credentialLower} अपडेट कर दिया गया है।',
  'user.change_password.mismatch.error': '{credential} मेल नहीं खाते।',
  'user.change_password.generic.error': 'आपका {credentialLower} अपडेट करते समय त्रुटि हुई। कृपया पुनः प्रयास करें।',
  'user.change_password.unavailable.heading': '{credential} परिवर्तन उपलब्ध नहीं है',
  'user.change_password.unavailable.description': 'कृपया अपने व्यवस्थापक से संपर्क करें।',
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
  'errors.signup.popup.failure': 'पॉप-अप विंडो में साइन-अप जारी नहीं रखा जा सका। कृपया पुनः प्रयास करें।',
  'errors.signup.components.not.available': 'साइन-अप फॉर्म फिलहाल उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।',
  'errors.signin.components.not.available': 'साइन-इन फॉर्म फिलहाल उपलब्ध नहीं है। कृपया बाद में पुनः प्रयास करें।',
  'errors.signin.timeout': 'स्टेप पूरा करने के लिए दिया गया समय खत्म हो गया है।',
  /* Admin */
  'admin.common.loading': 'लोड हो रहा है…',
  'attribution.secured_by': 'सुरक्षा प्रदाता',
  'attribution.powered_by': 'संचालक',
  'admin.common.actions.cancel': 'रद्द करें',
  'admin.common.actions.confirm': 'पुष्टि करें',
  'admin.common.actions.remove': 'हटाएं',
  'admin.common.columns.actions': 'कार्रवाइयाँ',
  'admin.common.columns.organization_unit': 'संगठन इकाई',
  'admin.common.errors.forbidden': 'आपको यह करने की अनुमति नहीं है।',
  'admin.common.errors.not_found': 'यह आइटम नहीं मिला।',
  'admin.common.errors.no_ou': 'यह आइटम बनाने से पहले एक संगठन इकाई चुनें।',
  'admin.common.fields.identity': 'नाम',
  'admin.common.fields.identity_type': 'प्रकार',
  'admin.common.fields.identity_placeholder': 'एक पहचान चुनें',
  'admin.common.fields.identity_empty': 'जोड़ने के लिए कुछ नहीं है',
  'admin.common.identity_types.user': 'उपयोगकर्ता',
  'admin.common.identity_types.group': 'समूह',
  'admin.common.identity_types.agent': 'एजेंट',
  'admin.common.identity_types.app': 'एप्लिकेशन',
  'admin.common.pagination.label': 'पृष्ठ क्रमांकन',
  'admin.common.pagination.previous': 'पिछला',
  'admin.common.pagination.next': 'अगला',
  'admin.common.pagination.range': '{total} में से {start} से {end}',
  'admin.common.search.attribute': 'इसके अनुसार खोजें',
  'admin.common.search.submit': 'खोजें',
  'admin.common.search.clear': 'खोज साफ़ करें',
  'admin.common.search.placeholder': 'सटीक {attribute}',
  'admin.common.search.no_results': '"{value}" के लिए कोई मिलान नहीं। खोज पूरे मान से मेल खाती है।',
  'admin.common.filters.type': 'असाइनी प्रकार',
  'admin.common.filters.all_types': 'सभी प्रकार',
  'admin.users.list.search.username': 'उपयोगकर्ता नाम',
  'admin.users.list.search.email': 'ईमेल',
  'admin.agents.list.search.name': 'नाम',
  'admin.users.list.title': 'उपयोगकर्ता',
  'admin.users.list.columns.name': 'नाम',
  'admin.users.list.columns.type': 'उपयोगकर्ता प्रकार',
  'admin.users.list.empty': 'कोई उपयोगकर्ता नहीं मिला।',
  'admin.users.list.error': 'उपयोगकर्ताओं को लोड नहीं किया जा सका। कृपया फिर से प्रयास करें।',
  'admin.users.create.title': 'उपयोगकर्ता जोड़ें',
  'admin.users.create.submit': 'उपयोगकर्ता बनाएं',
  'admin.users.create.error': 'उपयोगकर्ता नहीं बनाया जा सका। कृपया फिर से प्रयास करें।',
  'admin.users.create.fields.type': 'उपयोगकर्ता प्रकार',
  'admin.users.create.fields.username': 'उपयोगकर्ता नाम',
  'admin.users.create.fields.email': 'ईमेल',
  'admin.users.create.fields.given_name': 'पहला नाम',
  'admin.users.create.fields.family_name': 'अंतिम नाम',
  'admin.users.create.fields.password': 'पासवर्ड',
  'admin.users.details.subtitle': 'उपयोगकर्ता प्रकार: {type}',
  'admin.users.details.attributes': 'विशेषताएँ',
  'admin.users.details.no_attributes': 'कोई विशेषता नहीं।',
  'admin.users.details.groups': 'समूह',
  'admin.users.details.no_groups': 'किसी समूह का सदस्य नहीं।',
  'admin.users.details.error': 'यह उपयोगकर्ता लोड नहीं किया जा सका। कृपया फिर से प्रयास करें।',
  'admin.users.details.delete.action': 'उपयोगकर्ता हटाएं',
  'admin.users.details.delete.confirm': '{name} को हटाएं?',
  'admin.users.details.delete.error': 'उपयोगकर्ता को हटाया नहीं जा सका। कृपया फिर से प्रयास करें।',
  'admin.users.details.edit.action': 'संपादित करें',
  'admin.users.details.edit.save': 'परिवर्तन सहेजें',
  'admin.users.details.edit.error': 'उपयोगकर्ता को सहेजा नहीं जा सका। कृपया फिर से प्रयास करें।',
  'admin.groups.list.title': 'समूह',
  'admin.groups.list.columns.name': 'नाम',
  'admin.groups.list.columns.description': 'विवरण',
  'admin.groups.list.empty': 'कोई समूह नहीं मिला।',
  'admin.groups.list.error': 'समूहों को लोड नहीं किया जा सका। कृपया फिर से प्रयास करें।',
  'admin.groups.create.title': 'समूह बनाएं',
  'admin.groups.create.submit': 'समूह बनाएं',
  'admin.groups.create.fields.name': 'नाम',
  'admin.groups.create.fields.description': 'विवरण',
  'admin.groups.create.error': 'समूह नहीं बनाया जा सका। कृपया फिर से प्रयास करें।',
  'admin.groups.members.title': 'सदस्य',
  'admin.groups.members.add': 'सदस्य जोड़ें',
  'admin.groups.members.columns.member': 'सदस्य',
  'admin.groups.members.columns.type': 'प्रकार',
  'admin.groups.members.empty': 'इस समूह में कोई सदस्य नहीं है।',
  'admin.groups.members.remove_label': '{name} को समूह से हटाएं',
  'admin.groups.members.error': 'सदस्यों को लोड नहीं किया जा सका। कृपया फिर से प्रयास करें।',
  'admin.groups.members.update_error': 'सदस्यों को अपडेट नहीं किया जा सका। कृपया फिर से प्रयास करें।',
  'admin.roles.list.title': 'भूमिकाएँ',
  'admin.roles.list.columns.name': 'नाम',
  'admin.roles.list.columns.description': 'विवरण',
  'admin.roles.list.empty': 'कोई भूमिका नहीं मिली।',
  'admin.roles.list.error': 'भूमिकाओं को लोड नहीं किया जा सका। कृपया फिर से प्रयास करें।',
  'admin.roles.create.title': 'भूमिका बनाएं',
  'admin.roles.create.submit': 'भूमिका बनाएं',
  'admin.roles.create.fields.name': 'नाम',
  'admin.roles.create.fields.description': 'विवरण',
  'admin.roles.create.error': 'भूमिका नहीं बनाई जा सकी। कृपया फिर से प्रयास करें।',
  'admin.roles.assignments.title': 'किसे सौंपी गई',
  'admin.roles.assignments.add': 'भूमिका सौंपें',
  'admin.roles.assignments.columns.assignee': 'प्राप्तकर्ता',
  'admin.roles.assignments.columns.type': 'प्रकार',
  'admin.roles.assignments.empty': 'यह भूमिका किसी को नहीं सौंपी गई है।',
  'admin.roles.assignments.remove_label': '{name} से भूमिका हटाएं',
  'admin.roles.assignments.error': 'असाइनमेंट लोड नहीं किए जा सके। कृपया फिर से प्रयास करें।',
  'admin.roles.assignments.update_error': 'असाइनमेंट अपडेट नहीं किए जा सके। कृपया फिर से प्रयास करें।',
  'admin.roles.permissions.title': 'अनुमतियाँ',
  'admin.roles.permissions.empty': 'यह भूमिका कोई अनुमति नहीं देती।',
  'admin.roles.permissions.error': 'अनुमतियाँ लोड नहीं की जा सकीं। कृपया फिर से प्रयास करें।',
  'admin.agents.list.title': 'एजेंट',
  'admin.agents.list.columns.name': 'नाम',
  'admin.agents.list.columns.type': 'एजेंट प्रकार',
  'admin.agents.list.columns.client_id': 'क्लाइंट आईडी',
  'admin.agents.list.empty': 'कोई एजेंट नहीं मिला।',
  'admin.agents.list.error': 'एजेंटों को लोड नहीं किया जा सका। कृपया फिर से प्रयास करें।',
  'admin.agents.create.title': 'एजेंट पंजीकृत करें',
  'admin.agents.create.submit': 'एजेंट पंजीकृत करें',
  'admin.agents.create.fields.name': 'नाम',
  'admin.agents.create.fields.type': 'एजेंट प्रकार',
  'admin.agents.create.fields.description': 'विवरण',
  'admin.agents.create.error': 'एजेंट पंजीकृत नहीं किया जा सका। कृपया फिर से प्रयास करें।',
  'admin.agents.details.overview': 'अवलोकन',
  'admin.agents.details.type': 'एजेंट प्रकार',
  'admin.agents.details.owner': 'स्वामी',
  'admin.agents.details.no_owner': 'कोई स्वामी नहीं',
  'admin.agents.details.groups': 'समूह',
  'admin.agents.details.no_groups': 'किसी समूह का सदस्य नहीं।',
  'admin.agents.details.roles': 'भूमिकाएँ',
  'admin.agents.details.no_roles': 'कोई भूमिका नहीं सौंपी गई।',
  'admin.agents.details.error': 'यह एजेंट लोड नहीं किया जा सका। कृपया फिर से प्रयास करें।',
  'admin.agents.details.delete.action': 'एजेंट हटाएं',
  'admin.agents.details.delete.confirm': '{name} को हटाएं?',
  'admin.agents.details.delete.error': 'एजेंट को हटाया नहीं जा सका। कृपया फिर से प्रयास करें।',
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

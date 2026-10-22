// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {I18nTranslations, I18nMetadata, I18nBundle} from '../models/i18n';

const translations: I18nTranslations = {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  /* Buttons */
  'elements.buttons.signin.text': 'సైన్ ఇన్ చేయండి',
  'elements.buttons.signout.text': 'సైన్ అవుట్ చేయండి',
  'elements.buttons.signup.text': 'సైన్ అప్ చేయండి',
  'elements.buttons.submit.text': 'కొనసాగించండి',
  'elements.buttons.facebook.text': 'Facebook తో కొనసాగించండి',
  'elements.buttons.google.text': 'Google తో కొనసాగించండి',
  'elements.buttons.github.text': 'GitHub తో కొనసాగించండి',
  'elements.buttons.microsoft.text': 'Microsoft తో కొనసాగించండి',
  'elements.buttons.linkedin.text': 'LinkedIn తో కొనసాగించండి',
  'elements.buttons.ethereum.text': 'Ethereum తో సైన్ ఇన్ చేయండి',
  'elements.buttons.smsotp.text': 'SMS తో కొనసాగించండి',
  'elements.buttons.multi.option.text': '{connection} తో కొనసాగించండి',
  'elements.buttons.social.text': '{connection} తో కొనసాగించండి',

  /* Display */
  'elements.display.divider.or_separator': 'లేదా',
  'elements.display.copyable_text.copy': 'కాపీ చేయండి',
  'elements.display.copyable_text.copied': 'కాపీ చేయబడింది!',
  'elements.display.copyable_text.show': 'చూపించు',
  'elements.display.copyable_text.hide': 'దాచు',

  /* Fields */
  'elements.fields.generic.placeholder': 'మీ {field} ను నమోదు చేయండి',
  'elements.fields.username.label': 'వినియోగదారు పేరు',
  'elements.fields.username.placeholder': 'వినియోగదారు పేరును నమోదు చేయండి',
  'elements.fields.password.label': 'పాస్వర్డ్',
  'elements.fields.password.placeholder': 'పాస్వర్డ్ నమోదు చేయండి',
  'elements.fields.first_name.label': 'మొదటి పేరు',
  'elements.fields.first_name.placeholder': 'మీ మొదటి పేరును నమోదు చేయండి',
  'elements.fields.last_name.label': 'చివరి పేరు',
  'elements.fields.last_name.placeholder': 'మీ చివరి పేరును నమోదు చేయండి',
  'elements.fields.email.label': 'ఇమెయిల్',
  'elements.fields.email.placeholder': 'మీ ఇమెయిల్‌ను నమోదు చేయండి',
  'elements.fields.organization.name.label': 'సంస్థ పేరు',
  'elements.fields.organization.handle.label': 'సంస్థ హ్యాండిల్',
  'elements.fields.organization.description.label': 'సంస్థ వివరణ',
  'elements.fields.organization.select.label': 'ఆర్గనైజేషన్‌ను ఎంచుకోండి',
  'elements.fields.organization.select.placeholder': 'సంస్థను ఎంచుకోండి',

  /* Select */
  'elements.fields.auth_flow_select.aria_label': 'లాగిన్ ప్రవాహాన్ని ఎంచుకోండి',
  'elements.fields.auth_flow_select.empty': 'లాగిన్ ప్రవాహాలు కనుగొనబడలేదు.',
  'elements.fields.select.load_more': 'మరిన్ని లోడ్ చేయండి',
  'elements.fields.select.loading': 'లోడ్ అవుతోంది…',
  'elements.fields.select.loading_more': 'మరిన్ని లోడ్ అవుతోంది…',
  'elements.fields.user_select.aria_label': 'ఒక వినియోగదారుని ఎంచుకోండి',
  'elements.fields.user_select.empty': 'వినియోగదారులు కనుగొనబడలేదు.',
  'elements.fields.user_type_select.aria_label': 'వినియోగదారు రకాన్ని ఎంచుకోండి',
  'elements.fields.user_type_select.empty': 'వినియోగదారు రకాలు కనుగొనబడలేదు.',

  /* Validation */
  'validations.required.field.error': 'ఈ ఫీల్డ్ అవసరం',
  'validation.pattern.invalid': 'ఈ విలువ అవసరమైన ఆకృతికి సరిపోలడం లేదు.',
  'validation.minLength.invalid': 'ఈ విలువ చాలా చిన్నది.',
  'validation.maxLength.invalid': 'ఈ విలువ చాలా పెద్దది.',

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'signin.heading': 'సైన్ ఇన్ చేయండి',
  'signin.subheading': 'కొనసాగించడానికి మీ వివరాలు ఇవ్వండి.',
  'signin.images.app_logo.alt': 'అప్లికేషన్ లోగో',

  /* Base Sign Up */
  'signup.heading': 'సైన్ అప్ చేయండి',
  'signup.subheading': 'కొత్త అకౌంట్ సృష్టించండి.',

  /* Email OTP */
  'email.otp.heading': 'OTP వెరిఫికేషన్',
  'email.otp.subheading': 'మీ ఇమెయిల్‌కి పంపిన కోడ్‌ను నమోదు చేయండి.',
  'email.otp.buttons.submit.text': 'కొనసాగించండి',

  /* Identifier First */
  'identifier.first.heading': 'సైన్ ఇన్ చేయండి',
  'identifier.first.subheading': 'మీ యూజర్ పేరు లేదా ఇమెయిల్ ఇవ్వండి.',
  'identifier.first.buttons.submit.text': 'కొనసాగించండి',

  /* SMS OTP */
  'sms.otp.heading': 'OTP వెరిఫికేషన్',
  'sms.otp.subheading': 'మీ ఫోన్ నంబర్‌కి పంపిన కోడ్‌ను నమోదు చేయండి.',
  'sms.otp.buttons.submit.text': 'కొనసాగించండి',

  /* TOTP */
  'totp.heading': 'మీ గుర్తింపును ధృవీకరించండి',
  'totp.subheading': 'మీ ఆథెంటికేటర్ యాప్‌లోని కోడ్‌ను నమోదు చేయండి.',
  'totp.buttons.submit.text': 'కొనసాగించండి',

  /* Username Password */
  'username.password.buttons.submit.text': 'కొనసాగించండి',
  'username.password.heading': 'సైన్ ఇన్ చేయండి',
  'username.password.subheading': 'మీ యూజర్ పేరు మరియు పాస్‌వర్డ్ ఇవ్వండి.',

  /* Passkeys */
  'passkey.button.use': 'Passkey తో సైన్ ఇన్ చేయండి',
  'passkey.signin.heading': 'Passkey తో సైన్ ఇన్ చేయండి',
  'passkey.register.heading': 'Passkey ని నమోదు చేయండి',
  'passkey.register.description':
    'పాస్‌వర్డ్ లేకుండా మీ ఖాతాలోకి సురక్షితంగా సైన్ ఇన్ చేయడానికి Passkey ని సృష్టించండి.',

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': 'ప్రొఫైల్',
  'user.profile.update.generic.error': 'ప్రొఫైల్ అప్‌డేట్ చేస్తూ లోపం వచ్చింది. దయచేసి మళ్లీ ప్రయత్నించండి.',

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': '{credential} మార్చండి',
  'user.change_password.new.label': 'కొత్త {credential}',
  'user.change_password.new.placeholder': 'మీ కొత్త {credentialLower} నమోదు చేయండి',
  'user.change_password.confirm.label': 'కొత్త {credential} నిర్ధారించండి',
  'user.change_password.confirm.placeholder': 'మీ కొత్త {credentialLower}ని మళ్లీ నమోదు చేయండి',
  'user.change_password.requirements.heading': 'మీ {credentialLower} కింది వాటిని కలిగి ఉండాలి:',
  'user.change_password.submit': '{credential} నవీకరించండి',
  'user.change_password.success': 'మీ {credentialLower} నవీకరించబడింది.',
  'user.change_password.mismatch.error': '{credentialLower} సరిపోలలేదు.',
  'user.change_password.generic.error':
    'మీ {credentialLower} నవీకరించేటప్పుడు లోపం వచ్చింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'user.change_password.unavailable.heading': '{credential} మార్పులు అందుబాటులో లేవు',
  'user.change_password.unavailable.description': 'దయచేసి మీ నిర్వాహకుడిని సంప్రదించండి.',
  'validation.password.pattern': 'అవసరమైన ఫార్మాట్‌కు సరిపోతుంది',

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': 'ఆర్గనైజేషన్ మార్చండి',
  'organization.switcher.loading.placeholder.organizations': 'ఆర్గనైజేషన్‌లు లోడ్ అవుతున్నాయి...',
  'organization.switcher.members': 'సభ్యులు',
  'organization.switcher.member': 'సభ్యుడు',
  'organization.switcher.create.organization': 'ఆర్గనైజేషన్ సృష్టించండి',
  'organization.switcher.manage.organizations': 'ఆర్గనైజేషన్‌లను నిర్వహించండి',
  'organization.switcher.buttons.manage.text': 'నిర్వహించండి',
  'organization.switcher.organizations.heading': 'ఆర్గనైజేషన్‌లు',
  'organization.switcher.buttons.switch.text': 'మార్చండి',
  'organization.switcher.no.access': 'యాక్సెస్ లేదు',
  'organization.switcher.status.label': 'స్టేటస్:',
  'organization.switcher.showing.count': '{total} లో {showing} ఆర్గనైజేషన్‌లు చూపుతున్నాయి',
  'organization.switcher.buttons.refresh.text': 'రిఫ్రెష్ చేయండి',
  'organization.switcher.buttons.load_more.text': 'మరిన్ని ఆర్గనైజేషన్‌లను లోడ్ చేయండి',
  'organization.switcher.loading.more': 'లోడ్ అవుతోంది...',
  'organization.switcher.no.organizations': 'ఏ ఆర్గనైజేషన్‌లు లభించలేదు',
  'organization.switcher.error.prefix': 'లోపం:',

  'organization.profile.heading': 'ఆర్గనైజేషన్ ప్రొఫైల్',
  'organization.profile.loading': 'లోడ్ అవుతోంది...',
  'organization.profile.error': 'ఆర్గనైజేషన్‌ను లోడ్ చేయడం విఫలమైంది',

  'organization.create.heading': 'ఆర్గనైజేషన్ సృష్టించండి',
  'organization.create.buttons.create_organization.text': 'సృష్టించండి',
  'organization.create.buttons.create_organization.loading.text': 'సృష్టిస్తోంది...',
  'organization.create.buttons.cancel.text': 'రద్దు చేయండి',

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': 'లోడ్ అవుతోంది...',

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': 'తప్పనిసరి',
  'consent.essential_claims': 'ఆవశ్యక లక్షణాలు',
  'consent.optional_claims': 'ఐచ్ఛిక లక్షణాలు',
  'consent.authorize_scope': 'అనుమతులు',
  'consent.essential_claims.info': 'సేవ సరిగ్గా పనిచేయడానికి ఈ లక్షణాలు అవసరం.',
  'consent.optional_claims.info': 'ఈ లక్షణాలు ఐచ్ఛికం మరియు మీ విచక్షణ మేరకు అందించవచ్చు.',
  'consent.authorize_scope.info': 'ఈ అనుమతులు సేవను అదనపు ఫీచర్‌లను యాక్సెస్ చేయడానికి అనుమతిస్తాయి.',

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': 'లోపం',
  'errors.signin.initialization': 'ప్రారంభించేటప్పుడు లోపం వచ్చింది. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signin.flow.failure': 'సైన్ ఇన్ ప్రక్రియలో లోపం వచ్చింది. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signin.flow.completion.failure': 'సైన్ ఇన్ పూర్తి చేయడంలో లోపం వచ్చింది. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signin.flow.passkeys.failure': 'పాస్‌కీలతో సైన్ ఇన్ చేస్తూ లోపం వచ్చింది. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signin.flow.passkeys.completion.failure':
    'పాస్‌కీ సైన్ ఇన్ పూర్తి చేయడంలో లోపం వచ్చింది. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signup.initialization': 'ప్రారంభించేటప్పుడు లోపం వచ్చింది. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signup.flow.failure': 'సైన్ అప్ ప్రక్రియలో లోపం వచ్చింది. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signup.flow.initialization.failure':
    'సైన్ అప్ ప్రక్రియను ప్రారంభించేటప్పుడు లోపం వచ్చింది. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signup.popup.failure': 'పాప్-అప్ విండోలో సైన్ అప్ కొనసాగించడం సాధ్యం కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'errors.signup.components.not.available':
    'సైన్ అప్ ఫారం ప్రస్తుతం అందుబాటులో లేదు. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signin.components.not.available':
    'సైన్ ఇన్ ఫారం ప్రస్తుతం అందుబాటులో లేదు. దయచేసి తరువాత మళ్లీ ప్రయత్నించండి.',
  'errors.signin.timeout': 'దశను పూర్తి చేయడానికి అనుమతించబడిన సమయం ముగిసింది.',
  /* Admin */
  'admin.common.loading': 'లోడ్ అవుతోంది…',
  'attribution.secured_by': 'భద్రత అందించేది',
  'attribution.powered_by': 'ఆధారితం',
  'admin.common.actions.cancel': 'రద్దు చేయి',
  'admin.common.actions.confirm': 'నిర్ధారించు',
  'admin.common.actions.remove': 'తొలగించు',
  'admin.common.columns.actions': 'చర్యలు',
  'admin.common.columns.organization_unit': 'సంస్థ యూనిట్',
  'admin.common.errors.forbidden': 'దీన్ని చేయడానికి మీకు అనుమతి లేదు.',
  'admin.common.errors.not_found': 'ఈ అంశం కనుగొనబడలేదు.',
  'admin.common.errors.no_ou': 'ఈ అంశాన్ని సృష్టించే ముందు ఒక సంస్థ యూనిట్‌ను ఎంచుకోండి.',
  'admin.common.fields.identity': 'పేరు',
  'admin.common.fields.identity_type': 'రకం',
  'admin.common.fields.identity_placeholder': 'ఒక గుర్తింపును ఎంచుకోండి',
  'admin.common.fields.identity_empty': 'జోడించడానికి ఏమీ లేదు',
  'admin.common.identity_types.user': 'వినియోగదారు',
  'admin.common.identity_types.group': 'సమూహం',
  'admin.common.identity_types.agent': 'ఏజెంట్',
  'admin.common.identity_types.app': 'అప్లికేషన్',
  'admin.common.pagination.label': 'పేజీలు',
  'admin.common.pagination.previous': 'మునుపటి',
  'admin.common.pagination.next': 'తదుపరి',
  'admin.common.pagination.range': '{total} లో {start} నుండి {end}',
  'admin.common.search.attribute': 'దీని ద్వారా వెతకండి',
  'admin.common.search.submit': 'వెతకండి',
  'admin.common.search.clear': 'శోధనను క్లియర్ చేయండి',
  'admin.common.search.placeholder': 'ఖచ్చితమైన {attribute}',
  'admin.common.search.no_results': '"{value}" కి సరిపోలికలు లేవు. శోధన మొత్తం విలువతో సరిపోలుతుంది.',
  'admin.common.filters.type': 'కేటాయించబడిన వారి రకం',
  'admin.common.filters.all_types': 'అన్ని రకాలు',
  'admin.users.list.search.username': 'వినియోగదారు పేరు',
  'admin.users.list.search.email': 'ఇమెయిల్',
  'admin.agents.list.search.name': 'పేరు',
  'admin.users.list.title': 'వినియోగదారులు',
  'admin.users.list.columns.name': 'పేరు',
  'admin.users.list.columns.type': 'వినియోగదారు రకం',
  'admin.users.list.empty': 'వినియోగదారులు ఎవరూ కనుగొనబడలేదు.',
  'admin.users.list.error': 'వినియోగదారులను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.users.create.title': 'వినియోగదారుని జోడించు',
  'admin.users.create.submit': 'వినియోగదారుని సృష్టించు',
  'admin.users.create.error': 'వినియోగదారుని సృష్టించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.users.create.fields.type': 'వినియోగదారు రకం',
  'admin.users.create.fields.username': 'వినియోగదారు పేరు',
  'admin.users.create.fields.email': 'ఇమెయిల్',
  'admin.users.create.fields.given_name': 'మొదటి పేరు',
  'admin.users.create.fields.family_name': 'చివరి పేరు',
  'admin.users.create.fields.password': 'పాస్‌వర్డ్',
  'admin.users.details.subtitle': 'వినియోగదారు రకం: {type}',
  'admin.users.details.attributes': 'లక్షణాలు',
  'admin.users.details.no_attributes': 'లక్షణాలు లేవు.',
  'admin.users.details.groups': 'సమూహాలు',
  'admin.users.details.no_groups': 'ఏ సమూహంలోనూ సభ్యులు కాదు.',
  'admin.users.details.error': 'ఈ వినియోగదారుని లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.users.details.delete.action': 'వినియోగదారుని తొలగించు',
  'admin.users.details.delete.confirm': '{name} ను తొలగించాలా?',
  'admin.users.details.delete.error': 'వినియోగదారుని తొలగించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.users.details.edit.action': 'సవరించు',
  'admin.users.details.edit.save': 'మార్పులను సేవ్ చేయి',
  'admin.users.details.edit.error': 'వినియోగదారుని సేవ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.groups.list.title': 'సమూహాలు',
  'admin.groups.list.columns.name': 'పేరు',
  'admin.groups.list.columns.description': 'వివరణ',
  'admin.groups.list.empty': 'సమూహాలు ఏవీ కనుగొనబడలేదు.',
  'admin.groups.list.error': 'సమూహాలను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.groups.create.title': 'సమూహాన్ని సృష్టించు',
  'admin.groups.create.submit': 'సమూహాన్ని సృష్టించు',
  'admin.groups.create.fields.name': 'పేరు',
  'admin.groups.create.fields.description': 'వివరణ',
  'admin.groups.create.error': 'సమూహాన్ని సృష్టించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.groups.members.title': 'సభ్యులు',
  'admin.groups.members.add': 'సభ్యుడిని జోడించు',
  'admin.groups.members.columns.member': 'సభ్యుడు',
  'admin.groups.members.columns.type': 'రకం',
  'admin.groups.members.empty': 'ఈ సమూహంలో సభ్యులు లేరు.',
  'admin.groups.members.remove_label': '{name} ను సమూహం నుండి తొలగించు',
  'admin.groups.members.error': 'సభ్యులను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.groups.members.update_error': 'సభ్యులను నవీకరించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.roles.list.title': 'పాత్రలు',
  'admin.roles.list.columns.name': 'పేరు',
  'admin.roles.list.columns.description': 'వివరణ',
  'admin.roles.list.empty': 'పాత్రలు ఏవీ కనుగొనబడలేదు.',
  'admin.roles.list.error': 'పాత్రలను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.roles.create.title': 'పాత్రను సృష్టించు',
  'admin.roles.create.submit': 'పాత్రను సృష్టించు',
  'admin.roles.create.fields.name': 'పేరు',
  'admin.roles.create.fields.description': 'వివరణ',
  'admin.roles.create.error': 'పాత్రను సృష్టించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.roles.assignments.title': 'కేటాయించినది',
  'admin.roles.assignments.add': 'పాత్రను కేటాయించు',
  'admin.roles.assignments.columns.assignee': 'స్వీకర్త',
  'admin.roles.assignments.columns.type': 'రకం',
  'admin.roles.assignments.empty': 'ఈ పాత్ర ఎవరికీ కేటాయించబడలేదు.',
  'admin.roles.assignments.remove_label': '{name} నుండి పాత్రను తొలగించు',
  'admin.roles.assignments.error': 'కేటాయింపులను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.roles.assignments.update_error': 'కేటాయింపులను నవీకరించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.roles.permissions.title': 'అనుమతులు',
  'admin.roles.permissions.empty': 'ఈ పాత్ర ఎటువంటి అనుమతులను ఇవ్వదు.',
  'admin.roles.permissions.error': 'అనుమతులను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.agents.list.title': 'ఏజెంట్లు',
  'admin.agents.list.columns.name': 'పేరు',
  'admin.agents.list.columns.type': 'ఏజెంట్ రకం',
  'admin.agents.list.columns.client_id': 'క్లయింట్ ID',
  'admin.agents.list.empty': 'ఏజెంట్లు ఎవరూ కనుగొనబడలేదు.',
  'admin.agents.list.error': 'ఏజెంట్లను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.agents.create.title': 'ఏజెంట్‌ను నమోదు చేయి',
  'admin.agents.create.submit': 'ఏజెంట్‌ను నమోదు చేయి',
  'admin.agents.create.fields.name': 'పేరు',
  'admin.agents.create.fields.type': 'ఏజెంట్ రకం',
  'admin.agents.create.fields.description': 'వివరణ',
  'admin.agents.create.error': 'ఏజెంట్‌ను నమోదు చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.agents.details.overview': 'అవలోకనం',
  'admin.agents.details.type': 'ఏజెంట్ రకం',
  'admin.agents.details.owner': 'యజమాని',
  'admin.agents.details.no_owner': 'యజమాని లేరు',
  'admin.agents.details.groups': 'సమూహాలు',
  'admin.agents.details.no_groups': 'ఏ సమూహంలోనూ సభ్యులు కాదు.',
  'admin.agents.details.roles': 'పాత్రలు',
  'admin.agents.details.no_roles': 'పాత్రలు ఏవీ కేటాయించబడలేదు.',
  'admin.agents.details.error': 'ఈ ఏజెంట్‌ను లోడ్ చేయలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
  'admin.agents.details.delete.action': 'ఏజెంట్‌ను తొలగించు',
  'admin.agents.details.delete.confirm': '{name} ను తొలగించాలా?',
  'admin.agents.details.delete.error': 'ఏజెంట్‌ను తొలగించలేకపోయాము. దయచేసి మళ్లీ ప్రయత్నించండి.',
};

const metadata: I18nMetadata = {
  localeCode: 'te-IN',
  countryCode: 'IN',
  languageCode: 'te',
  displayName: 'తెలుగు (భారతదేశం)',
  direction: 'ltr',
};

const te_IN: I18nBundle = {
  metadata,
  translations,
};

export default te_IN;

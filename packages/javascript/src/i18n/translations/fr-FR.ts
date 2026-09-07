// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {I18nTranslations, I18nMetadata, I18nBundle} from '../models/i18n';

const translations: I18nTranslations = {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  /* Buttons */
  'elements.buttons.signin.text': 'Se connecter',
  'elements.buttons.signout.text': 'Se déconnecter',
  'elements.buttons.signup.text': "S'inscrire",
  'elements.buttons.submit.text': 'Continuer',
  'elements.buttons.facebook.text': 'Continuer avec Facebook',
  'elements.buttons.google.text': 'Continuer avec Google',
  'elements.buttons.github.text': 'Continuer avec GitHub',
  'elements.buttons.microsoft.text': 'Continuer avec Microsoft',
  'elements.buttons.linkedin.text': 'Continuer with LinkedIn',
  'elements.buttons.ethereum.text': 'Continuer avec Sign In Ethereum',
  'elements.buttons.smsotp.text': 'Continuer avec SMS',
  'elements.buttons.multi.option.text': 'Continuer avec {connection}',
  'elements.buttons.social.text': 'Continuer avec {connection}',

  /* Display */
  'elements.display.divider.or_separator': 'OU',
  'elements.display.copyable_text.copy': 'Copie',
  'elements.display.copyable_text.copied': 'Copié!',

  /* Fields */
  'elements.fields.generic.placeholder': 'Entrez votre {field}',
  'elements.fields.username.label': "Nom d'utilisateur",
  'elements.fields.username.placeholder': "Entrez votre nom d'utilisateur",
  'elements.fields.password.label': 'Mot de passe',
  'elements.fields.password.placeholder': 'Entrez votre mot de passe',
  'elements.fields.first_name.label': 'Prénom',
  'elements.fields.first_name.placeholder': 'Entrez votre prénom',
  'elements.fields.last_name.label': 'Nom de famille',
  'elements.fields.last_name.placeholder': 'Entrez votre nom de famille',
  'elements.fields.email.label': 'Email',
  'elements.fields.email.placeholder': 'Entrez votre email',
  'elements.fields.organization.name.label': "Nom de l'organisation",
  'elements.fields.organization.handle.label': "Identifiant de l'organisation",
  'elements.fields.organization.description.label': "Description de l'organisation",
  'elements.fields.organization.select.label': "Sélectionner l'organisation",
  'elements.fields.organization.select.placeholder': 'Choisissez une organisation',

  /* Validation */
  'validations.required.field.error': 'Ce champ est obligatoire',
  'validation.pattern.invalid': 'Cette valeur ne correspond pas au format requis.',
  'validation.minLength.invalid': 'Cette valeur est trop courte.',
  'validation.maxLength.invalid': 'Cette valeur est trop longue.',

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'signin.heading': 'Se connecter',
  'signin.subheading': 'Entrez vos identifiants pour continuer.',
  'signin.images.app_logo.alt': "Logo de l'application",

  /* Base Sign Up */
  'signup.heading': "S'inscrire",
  'signup.subheading': 'Créez un nouveau compte pour commencer.',

  /* Email OTP */
  'email.otp.heading': 'Vérification OTP',
  'email.otp.subheading': 'Entrez le code envoyé à votre adresse e-mail.',
  'email.otp.buttons.submit.text': 'Continuer',

  /* Identifier First */
  'identifier.first.heading': 'Se connecter',
  'identifier.first.subheading': "Entrez votre nom d'utilisateur ou votre adresse e-mail.",
  'identifier.first.buttons.submit.text': 'Continuer',

  /* SMS OTP */
  'sms.otp.heading': 'Vérification OTP',
  'sms.otp.subheading': 'Entrez le code envoyé à votre numéro de téléphone.',
  'sms.otp.buttons.submit.text': 'Continuer',

  /* TOTP */
  'totp.heading': 'Vérifiez votre identité',
  'totp.subheading': "Entrez le code de votre application d'authentification.",
  'totp.buttons.submit.text': 'Continuer',

  /* Username Password */
  'username.password.buttons.submit.text': 'Continuer',
  'username.password.heading': 'Se connecter',
  'username.password.subheading': "Entrez votre nom d'utilisateur et votre mot de passe pour continuer.",

  /* Passkeys */
  'passkey.button.use': "Se connecter avec une clé d'accès",
  'passkey.signin.heading': "Se connecter avec une clé d'accès",
  'passkey.register.heading': "Enregistrer une clé d'accès",
  'passkey.register.description':
    "Créez une clé d'accès pour vous connecter en toute sécurité à votre compte sans mot de passe.",

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': 'Profil',
  'user.profile.update.generic.error':
    'Une erreur est survenue lors de la mise à jour de votre profil. Veuillez réessayer.',

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': 'Changer le mot de passe',
  'user.change_password.current.label': 'Mot de passe actuel',
  'user.change_password.current.placeholder': 'Saisissez votre mot de passe actuel',
  'user.change_password.new.label': 'Nouveau mot de passe',
  'user.change_password.new.placeholder': 'Saisissez votre nouveau mot de passe',
  'user.change_password.confirm.label': 'Confirmer le nouveau mot de passe',
  'user.change_password.confirm.placeholder': 'Saisissez a nouveau votre nouveau mot de passe',
  'user.change_password.requirements.heading': 'Votre mot de passe doit contenir :',
  'user.change_password.submit': 'Mettre a jour le mot de passe',
  'user.change_password.success': 'Votre mot de passe a ete mis a jour.',
  'user.change_password.mismatch.error': 'Les mots de passe ne correspondent pas.',
  'user.change_password.same.as.current.error':
    'Votre nouveau mot de passe doit etre different du mot de passe actuel.',
  'user.change_password.current.invalid.error': 'Votre mot de passe actuel est incorrect.',
  'user.change_password.generic.error':
    'Une erreur est survenue lors de la mise a jour de votre mot de passe. Veuillez reessayer.',
  'user.change_password.unavailable.heading': 'Modification du mot de passe indisponible',
  'user.change_password.unavailable.description':
    "Ce compte n'utilise pas de mot de passe, il ne peut donc pas être modifié ici.",
  'validation.password.pattern': 'Correspond au format requis',

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': "Changer d'organisation",
  'organization.switcher.loading.placeholder.organizations': 'Chargement des organisations...',
  'organization.switcher.members': 'membres',
  'organization.switcher.member': 'membre',
  'organization.switcher.create.organization': 'Créer une organisation',
  'organization.switcher.manage.organizations': 'Gérer les organisations',
  'organization.switcher.buttons.manage.text': 'Gérer',
  'organization.switcher.organizations.heading': 'Organisations',
  'organization.switcher.buttons.switch.text': 'Changer',
  'organization.switcher.no.access': 'Aucun accès',
  'organization.switcher.status.label': 'Statut:',
  'organization.switcher.showing.count': 'Affichage de {showing} sur {total} organisations',
  'organization.switcher.buttons.refresh.text': 'Rafraîchir',
  'organization.switcher.buttons.load_more.text': "Charger plus d'organisations",
  'organization.switcher.loading.more': 'Chargement...',
  'organization.switcher.no.organizations': 'Aucune organisation trouvée',
  'organization.switcher.error.prefix': 'Erreur:',

  'organization.profile.heading': "Profil de l'organisation",
  'organization.profile.loading': "Chargement de l'organisation...",
  'organization.profile.error': "Échec du chargement de l'organisation",

  'organization.create.heading': 'Créer une organisation',
  'organization.create.buttons.create_organization.text': 'Créer une organisation',
  'organization.create.buttons.create_organization.loading.text': 'Création en cours...',
  'organization.create.buttons.cancel.text': 'Annuler',

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': 'Chargement...',

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': 'Obligatoire',
  'consent.essential_claims': 'Attributs essentiels',
  'consent.optional_claims': 'Attributs facultatifs',
  'consent.authorize_scope': 'Autorisations',
  'consent.essential_claims.info': 'Ces attributs sont nécessaires au bon fonctionnement du service.',
  'consent.optional_claims.info': 'Ces attributs sont facultatifs et peuvent être fournis à votre discrétion.',
  'consent.authorize_scope.info':
    "Ces autorisations permettent au service d'accéder à des fonctionnalités supplémentaires.",

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': 'Erreur',
  'errors.signin.initialization': "Une erreur est survenue lors de l'initialisation. Veuillez réessayer plus tard.",
  'errors.signin.flow.failure': 'Une erreur est survenue lors du flux de connexion. Veuillez réessayer plus tard.',
  'errors.signin.flow.completion.failure':
    'Une erreur est survenue lors de la finalisation du flux de connexion. Veuillez réessayer plus tard.',
  'errors.signin.flow.passkeys.failure':
    "Une erreur est survenue lors de la connexion avec les clefs d'accès. Veuillez réessayer plus tard.",
  'errors.signin.flow.passkeys.completion.failure':
    "Une erreur est survenue lors de la finalisation du flux de connexion avec les clefs d'accès. Veuillez réessayer plus tard.",
  'errors.signup.initialization': "Une erreur est survenue lors de l'initialisation. Veuillez réessayer plus tard.",
  'errors.signup.flow.failure': "Une erreur est survenue lors du flux d'inscription. Veuillez réessayer plus tard.",
  'errors.signup.flow.initialization.failure':
    "Une erreur est survenue lors de l'initialisation du flux d'inscription. Veuillez réessayer plus tard.",
  'errors.signup.components.not.available':
    "Le formulaire d'inscription n'est pas disponible pour le moment. Veuillez réessayer plus tard.",
  'errors.signin.components.not.available':
    "Le formulaire de connexion n'est pas disponible pour le moment. Veuillez réessayer plus tard.",
  'errors.signin.timeout': "Le temps imparti pour effectuer cette e'tape est expire'.",
};

const metadata: I18nMetadata = {
  localeCode: 'fr-FR',
  countryCode: 'FR',
  languageCode: 'fr',
  displayName: 'Français (France)',
  direction: 'ltr',
};

const fr_FR: I18nBundle = {
  metadata,
  translations,
};

export default fr_FR;

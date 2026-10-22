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
  'elements.display.copyable_text.show': 'Afficher',
  'elements.display.copyable_text.hide': 'Masquer',

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

  /* Select */
  'elements.fields.auth_flow_select.aria_label': 'Sélectionner un flux de connexion',
  'elements.fields.auth_flow_select.empty': 'Aucun flux de connexion trouvé.',
  'elements.fields.select.load_more': 'Charger plus',
  'elements.fields.select.loading': 'Chargement…',
  'elements.fields.select.loading_more': 'Chargement supplémentaire…',
  'elements.fields.user_select.aria_label': 'Sélectionner un utilisateur',
  'elements.fields.user_select.empty': 'Aucun utilisateur trouvé.',
  'elements.fields.user_type_select.aria_label': 'Sélectionner un type d’utilisateur',
  'elements.fields.user_type_select.empty': 'Aucun type d’utilisateur trouvé.',

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

  'user.change_password.heading': 'Modifier {credential}',
  'user.change_password.new.label': 'Nouveau {credential}',
  'user.change_password.new.placeholder': 'Entrez votre nouveau {credentialLower}',
  'user.change_password.confirm.label': 'Confirmer le nouveau {credential}',
  'user.change_password.confirm.placeholder': 'Saisissez à nouveau votre nouveau {credentialLower}',
  'user.change_password.requirements.heading': 'Votre {credentialLower} doit contenir :',
  'user.change_password.submit': 'Mettre à jour {credential}',
  'user.change_password.success': 'Votre {credentialLower} a été mis à jour.',
  'user.change_password.mismatch.error': 'Les {credentialLower}s ne correspondent pas.',
  'user.change_password.generic.error':
    'Une erreur est survenue lors de la mise à jour de votre {credentialLower}. Veuillez réessayer.',
  'user.change_password.unavailable.heading': 'Modification du {credentialLower} indisponible',
  'user.change_password.unavailable.description': 'Veuillez contacter votre administrateur.',
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
  'errors.signup.popup.failure':
    "Impossible de poursuivre l'inscription dans la fenêtre contextuelle. Veuillez réessayer.",
  'errors.signup.components.not.available':
    "Le formulaire d'inscription n'est pas disponible pour le moment. Veuillez réessayer plus tard.",
  'errors.signin.components.not.available':
    "Le formulaire de connexion n'est pas disponible pour le moment. Veuillez réessayer plus tard.",
  'errors.signin.timeout': "Le temps imparti pour effectuer cette e'tape est expire'.",
  /* Admin */
  'admin.common.loading': 'Chargement…',
  'attribution.secured_by': 'Sécurisé par',
  'attribution.powered_by': 'Propulsé par',
  'admin.common.actions.cancel': 'Annuler',
  'admin.common.actions.confirm': 'Confirmer',
  'admin.common.actions.remove': 'Retirer',
  'admin.common.columns.actions': 'Actions',
  'admin.common.columns.organization_unit': 'Unité organisationnelle',
  'admin.common.errors.forbidden': "Vous n'avez pas l'autorisation d'effectuer cette action.",
  'admin.common.errors.not_found': 'Cet élément est introuvable.',
  'admin.common.errors.no_ou': 'Choisissez une unité organisationnelle avant de créer cet élément.',
  'admin.common.fields.identity': 'Nom',
  'admin.common.fields.identity_type': 'Type',
  'admin.common.fields.identity_placeholder': 'Sélectionnez une identité',
  'admin.common.fields.identity_empty': 'Rien à ajouter',
  'admin.common.identity_types.user': 'Utilisateur',
  'admin.common.identity_types.group': 'Groupe',
  'admin.common.identity_types.agent': 'Agent',
  'admin.common.identity_types.app': 'Application',
  'admin.common.pagination.label': 'Pagination',
  'admin.common.pagination.previous': 'Précédent',
  'admin.common.pagination.next': 'Suivant',
  'admin.common.pagination.range': '{start} à {end} sur {total}',
  'admin.common.search.attribute': 'Rechercher par',
  'admin.common.search.submit': 'Rechercher',
  'admin.common.search.clear': 'Effacer la recherche',
  'admin.common.search.placeholder': '{attribute} exact',
  'admin.common.search.no_results': 'Aucun résultat pour « {value} ». La recherche porte sur la valeur entière.',
  'admin.common.filters.type': 'Type d\'attributaire',
  'admin.common.filters.all_types': 'Tous les types',
  'admin.users.list.search.username': 'Nom d\'utilisateur',
  'admin.users.list.search.email': 'E-mail',
  'admin.agents.list.search.name': 'Nom',
  'admin.users.list.title': 'Utilisateurs',
  'admin.users.list.columns.name': 'Nom',
  'admin.users.list.columns.type': "Type d'utilisateur",
  'admin.users.list.empty': 'Aucun utilisateur trouvé.',
  'admin.users.list.error': 'Impossible de charger les utilisateurs. Veuillez réessayer.',
  'admin.users.create.title': 'Ajouter un utilisateur',
  'admin.users.create.submit': 'Créer l’utilisateur',
  'admin.users.create.error': "Impossible de créer l'utilisateur. Veuillez réessayer.",
  'admin.users.create.fields.type': "Type d'utilisateur",
  'admin.users.create.fields.username': "Nom d'utilisateur",
  'admin.users.create.fields.email': 'E-mail',
  'admin.users.create.fields.given_name': 'Prénom',
  'admin.users.create.fields.family_name': 'Nom de famille',
  'admin.users.create.fields.password': 'Mot de passe',
  'admin.users.details.subtitle': "Type d'utilisateur : {type}",
  'admin.users.details.attributes': 'Attributs',
  'admin.users.details.no_attributes': 'Aucun attribut.',
  'admin.users.details.groups': 'Groupes',
  'admin.users.details.no_groups': "Membre d'aucun groupe.",
  'admin.users.details.error': 'Impossible de charger cet utilisateur. Veuillez réessayer.',
  'admin.users.details.delete.action': "Supprimer l'utilisateur",
  'admin.users.details.delete.confirm': 'Supprimer {name} ?',
  'admin.users.details.delete.error': "Impossible de supprimer l'utilisateur. Veuillez réessayer.",
  'admin.users.details.edit.action': 'Modifier',
  'admin.users.details.edit.save': 'Enregistrer les modifications',
  'admin.users.details.edit.error': "Impossible d'enregistrer l'utilisateur. Veuillez réessayer.",
  'admin.groups.list.title': 'Groupes',
  'admin.groups.list.columns.name': 'Nom',
  'admin.groups.list.columns.description': 'Description',
  'admin.groups.list.empty': 'Aucun groupe trouvé.',
  'admin.groups.list.error': 'Impossible de charger les groupes. Veuillez réessayer.',
  'admin.groups.create.title': 'Créer un groupe',
  'admin.groups.create.submit': 'Créer le groupe',
  'admin.groups.create.fields.name': 'Nom',
  'admin.groups.create.fields.description': 'Description',
  'admin.groups.create.error': 'Impossible de créer le groupe. Veuillez réessayer.',
  'admin.groups.members.title': 'Membres',
  'admin.groups.members.add': 'Ajouter un membre',
  'admin.groups.members.columns.member': 'Membre',
  'admin.groups.members.columns.type': 'Type',
  'admin.groups.members.empty': "Ce groupe n'a aucun membre.",
  'admin.groups.members.remove_label': 'Retirer {name} du groupe',
  'admin.groups.members.error': 'Impossible de charger les membres. Veuillez réessayer.',
  'admin.groups.members.update_error': 'Impossible de mettre à jour les membres. Veuillez réessayer.',
  'admin.roles.list.title': 'Rôles',
  'admin.roles.list.columns.name': 'Nom',
  'admin.roles.list.columns.description': 'Description',
  'admin.roles.list.empty': 'Aucun rôle trouvé.',
  'admin.roles.list.error': 'Impossible de charger les rôles. Veuillez réessayer.',
  'admin.roles.create.title': 'Créer un rôle',
  'admin.roles.create.submit': 'Créer le rôle',
  'admin.roles.create.fields.name': 'Nom',
  'admin.roles.create.fields.description': 'Description',
  'admin.roles.create.error': 'Impossible de créer le rôle. Veuillez réessayer.',
  'admin.roles.assignments.title': 'Attribué à',
  'admin.roles.assignments.add': 'Attribuer le rôle',
  'admin.roles.assignments.columns.assignee': 'Bénéficiaire',
  'admin.roles.assignments.columns.type': 'Type',
  'admin.roles.assignments.empty': "Ce rôle n'est attribué à personne.",
  'admin.roles.assignments.remove_label': 'Retirer le rôle de {name}',
  'admin.roles.assignments.error': 'Impossible de charger les attributions. Veuillez réessayer.',
  'admin.roles.assignments.update_error': 'Impossible de mettre à jour les attributions. Veuillez réessayer.',
  'admin.roles.permissions.title': 'Autorisations',
  'admin.roles.permissions.empty': "Ce rôle n'accorde aucune autorisation.",
  'admin.roles.permissions.error': 'Impossible de charger les autorisations. Veuillez réessayer.',
  'admin.agents.list.title': 'Agents',
  'admin.agents.list.columns.name': 'Nom',
  'admin.agents.list.columns.type': "Type d'agent",
  'admin.agents.list.columns.client_id': 'ID client',
  'admin.agents.list.empty': 'Aucun agent trouvé.',
  'admin.agents.list.error': 'Impossible de charger les agents. Veuillez réessayer.',
  'admin.agents.create.title': 'Enregistrer un agent',
  'admin.agents.create.submit': "Enregistrer l'agent",
  'admin.agents.create.fields.name': 'Nom',
  'admin.agents.create.fields.type': "Type d'agent",
  'admin.agents.create.fields.description': 'Description',
  'admin.agents.create.error': "Impossible d'enregistrer l'agent. Veuillez réessayer.",
  'admin.agents.details.overview': "Vue d'ensemble",
  'admin.agents.details.type': "Type d'agent",
  'admin.agents.details.owner': 'Propriétaire',
  'admin.agents.details.no_owner': 'Aucun propriétaire',
  'admin.agents.details.groups': 'Groupes',
  'admin.agents.details.no_groups': "Membre d'aucun groupe.",
  'admin.agents.details.roles': 'Rôles',
  'admin.agents.details.no_roles': 'Aucun rôle attribué.',
  'admin.agents.details.error': 'Impossible de charger cet agent. Veuillez réessayer.',
  'admin.agents.details.delete.action': "Supprimer l'agent",
  'admin.agents.details.delete.confirm': 'Supprimer {name} ?',
  'admin.agents.details.delete.error': "Impossible de supprimer l'agent. Veuillez réessayer.",
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

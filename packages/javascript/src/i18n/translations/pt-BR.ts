// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {I18nTranslations, I18nMetadata, I18nBundle} from '../models/i18n';

const translations: I18nTranslations = {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  /* Buttons */
  'elements.buttons.signin.text': 'Entrar',
  'elements.buttons.signout.text': 'Sair',
  'elements.buttons.signup.text': 'Cadastre-se',
  'elements.buttons.submit.text': 'Continuar',
  'elements.buttons.facebook.text': 'Entrar com Facebook',
  'elements.buttons.google.text': 'Entrar com Google',
  'elements.buttons.github.text': 'Entrar com GitHub',
  'elements.buttons.microsoft.text': 'Entrar com Microsoft',
  'elements.buttons.linkedin.text': 'Entrar com LinkedIn',
  'elements.buttons.ethereum.text': 'Entrar com Ethereum',
  'elements.buttons.smsotp.text': 'Entrar com SMS',
  'elements.buttons.multi.option.text': 'Entrar com {connection}',
  'elements.buttons.social.text': 'Entrar com {connection}',

  /* Display */
  'elements.display.divider.or_separator': 'OU',
  'elements.display.copyable_text.copy': 'Cópia',
  'elements.display.copyable_text.copied': 'Copiado!',
  'elements.display.copyable_text.show': 'Mostrar',
  'elements.display.copyable_text.hide': 'Ocultar',

  /* Fields */
  'elements.fields.generic.placeholder': 'Digite seu {field}',
  'elements.fields.username.label': 'Nome de usuário',
  'elements.fields.username.placeholder': 'Digite o nome de usuário',
  'elements.fields.password.label': 'Senha',
  'elements.fields.password.placeholder': 'Digite sua senha',
  'elements.fields.first_name.label': 'Primeiro nome',
  'elements.fields.first_name.placeholder': 'Digite seu primeiro nome',
  'elements.fields.last_name.label': 'Sobrenome',
  'elements.fields.last_name.placeholder': 'Digite seu sobrenome',
  'elements.fields.email.label': 'Email',
  'elements.fields.email.placeholder': 'Digite seu email',
  'elements.fields.organization.name.label': 'Nome da Organização',
  'elements.fields.organization.handle.label': 'Identificador da Organização',
  'elements.fields.organization.description.label': 'Descrição da Organização',
  'elements.fields.organization.select.label': 'Selecionar Organização',
  'elements.fields.organization.select.placeholder': 'Selecione uma organização',

  /* Select */
  'elements.fields.auth_flow_select.aria_label': 'Selecionar um fluxo de login',
  'elements.fields.auth_flow_select.empty': 'Nenhum fluxo de login encontrado.',
  'elements.fields.select.load_more': 'Carregar mais',
  'elements.fields.select.loading': 'Carregando…',
  'elements.fields.select.loading_more': 'Carregando mais…',
  'elements.fields.user_select.aria_label': 'Selecionar um usuário',
  'elements.fields.user_select.empty': 'Nenhum usuário encontrado.',
  'elements.fields.user_type_select.aria_label': 'Selecionar um tipo de usuário',
  'elements.fields.user_type_select.empty': 'Nenhum tipo de usuário encontrado.',

  /* Validation */
  'validations.required.field.error': 'Este campo é obrigatório',
  'validation.pattern.invalid': 'Este valor não corresponde ao formato necessário.',
  'validation.minLength.invalid': 'Este valor é muito curto.',
  'validation.maxLength.invalid': 'Este valor é muito longo.',

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'signin.heading': 'Entrar',
  'signin.subheading': 'Digite suas credencias para continuar.',
  'signin.images.app_logo.alt': 'Logotipo do aplicativo',

  /* Base Sign Up */
  'signup.heading': 'Cadastra-se',
  'signup.subheading': 'Crie uma nova conta para iniciar.',

  /* Email OTP */
  'email.otp.heading': 'Verificação OTP',
  'email.otp.subheading': 'Digite o código enviado para seu e-mail.',
  'email.otp.buttons.submit.text': 'Continue',

  /* Identifier First */
  'identifier.first.heading': 'Entrar',
  'identifier.first.subheading': 'Digite seu usuário ou e-mail.',
  'identifier.first.buttons.submit.text': 'Continue',

  /* SMS OTP */
  'sms.otp.heading': 'Verificação OTP',
  'sms.otp.subheading': 'Digite o código enviado para seu telefone.',
  'sms.otp.buttons.submit.text': 'Continue',

  /* TOTP */
  'totp.heading': 'Verifique sua identidade',
  'totp.subheading': 'Digite o código do seu aplicativo autenticador.',
  'totp.buttons.submit.text': 'Continue',

  /* Username Password */
  'username.password.buttons.submit.text': 'Continue',
  'username.password.heading': 'Entrar',
  'username.password.subheading': 'Digite seu usuário e senha para continuar.',

  /* Passkeys */
  'passkey.button.use': 'Entrar com Passkey',
  'passkey.signin.heading': 'Entrar com Passkey',
  'passkey.register.heading': 'Registrar Passkey',
  'passkey.register.description': 'Crie uma passkey para entrar em sua conta com segurança sem uma senha.',

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': 'Perfil',
  'user.profile.update.generic.error': 'Ocorreu um erro ao atualizar seu perfil. Tente novamente.',

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': 'Alterar {credential}',
  'user.change_password.new.label': 'Novo {credential}',
  'user.change_password.new.placeholder': 'Digite seu novo {credentialLower}',
  'user.change_password.confirm.label': 'Confirmar novo {credential}',
  'user.change_password.confirm.placeholder': 'Digite novamente seu novo {credentialLower}',
  'user.change_password.requirements.heading': 'Seu {credentialLower} deve conter:',
  'user.change_password.submit': 'Atualizar {credential}',
  'user.change_password.success': 'Seu {credentialLower} foi atualizado.',
  'user.change_password.mismatch.error': 'Os {credentialLower}s não coincidem.',
  'user.change_password.generic.error': 'Ocorreu um erro ao atualizar seu {credentialLower}. Tente novamente.',
  'user.change_password.unavailable.heading': 'Alteração de {credentialLower} indisponível',
  'user.change_password.unavailable.description': 'Entre em contato com o administrador.',
  'validation.password.pattern': 'Corresponde ao formato exigido',

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': 'Trocar Organização',
  'organization.switcher.loading.placeholder.organizations': 'Carregando organizações...',
  'organization.switcher.members': 'membros',
  'organization.switcher.member': 'membro',
  'organization.switcher.create.organization': 'Criar Organização',
  'organization.switcher.manage.organizations': 'Gerenciar Organizações',
  'organization.switcher.buttons.manage.text': 'Gerenciar',
  'organization.switcher.organizations.heading': 'Organizações',
  'organization.switcher.buttons.switch.text': 'Trocar',
  'organization.switcher.no.access': 'Sem Acesso',
  'organization.switcher.status.label': 'Situação:',
  'organization.switcher.showing.count': 'Exibindo {showing} de {total} organizações',
  'organization.switcher.buttons.refresh.text': 'Atualizar',
  'organization.switcher.buttons.load_more.text': 'Carregar Mais Organizações',
  'organization.switcher.loading.more': 'Carregando...',
  'organization.switcher.no.organizations': 'Nenhuma organização encontrada',
  'organization.switcher.error.prefix': 'Erro:',

  'organization.profile.heading': 'Perfil da Organização',
  'organization.profile.loading': 'Carregando organização...',
  'organization.profile.error': 'Falha ao carregar organização',

  'organization.create.heading': 'Criar Organização',
  'organization.create.buttons.create_organization.text': 'Criar Organização',
  'organization.create.buttons.create_organization.loading.text': 'Criando...',
  'organization.create.buttons.cancel.text': 'Cancelar',

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': 'Carregando...',

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': 'Obrigatório',
  'consent.essential_claims': 'Atributos essenciais',
  'consent.optional_claims': 'Atributos opcionais',
  'consent.authorize_scope': 'Permissões',
  'consent.essential_claims.info': 'Esses atributos são necessários para o funcionamento adequado do serviço.',
  'consent.optional_claims.info': 'Esses atributos são opcionais e podem ser fornecidos a seu critério.',
  'consent.authorize_scope.info': 'Essas permissões permitem que o serviço acesse recursos adicionais.',

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': 'Erro',
  'errors.signin.initialization': 'Ocorreu um erro ao inicializar. Tente novamente mais tarde.',
  'errors.signin.flow.failure': 'Ocorreu um erro durante o login. Tente novamente mais tarde.',
  'errors.signin.flow.completion.failure': 'Ocorreu um erro ao completar o login. Tente novamente mais tarde.',
  'errors.signin.flow.passkeys.failure':
    'Ocorreu um erro ao entrar com as chaves de acesso (passkeys). Tente novamente mais tarde.',
  'errors.signin.flow.passkeys.completion.failure':
    'Ocorreu um erro ao completar o login com as chaves de acesso (passkeys). Tente novamente mais tarde.',
  'errors.signup.initialization': 'Ocorreu um erro durante a inicialização. Tente novamente mais tarde.',
  'errors.signup.flow.failure': 'Ocorreu um erro durante o fluxo de cadastro. Tente novamente mais tarde.',
  'errors.signup.flow.initialization.failure':
    'Ocorreu um erro ao inicializar o fluxo de cadastro. Tente novamente mais tarde.',
  'errors.signup.popup.failure': 'Não foi possível continuar o cadastro na janela pop-up. Tente novamente.',
  'errors.signup.components.not.available':
    'O formulário de cadastro não está disponível no momento. Tente novamente mais tarde.',
  'errors.signin.components.not.available':
    'O formulário de login não está disponível no momento. Tente novamente mais tarde.',
  'errors.signin.timeout': 'O tempo permitido para concluir a etapa expirou.',
  /* Admin */
  'admin.common.loading': 'Carregando…',
  'attribution.secured_by': 'Protegido por',
  'attribution.powered_by': 'Desenvolvido por',
  'admin.common.actions.cancel': 'Cancelar',
  'admin.common.actions.confirm': 'Confirmar',
  'admin.common.actions.remove': 'Remover',
  'admin.common.columns.actions': 'Ações',
  'admin.common.columns.organization_unit': 'Unidade organizacional',
  'admin.common.errors.forbidden': 'Você não tem permissão para fazer isso.',
  'admin.common.errors.not_found': 'Este item não foi encontrado.',
  'admin.common.errors.no_ou': 'Escolha uma unidade organizacional antes de criar este item.',
  'admin.common.fields.identity': 'Nome',
  'admin.common.fields.identity_type': 'Tipo',
  'admin.common.fields.identity_placeholder': 'Selecione uma identidade',
  'admin.common.fields.identity_empty': 'Nada para adicionar',
  'admin.common.identity_types.user': 'Usuário',
  'admin.common.identity_types.group': 'Grupo',
  'admin.common.identity_types.agent': 'Agente',
  'admin.common.identity_types.app': 'Aplicativo',
  'admin.common.pagination.label': 'Paginação',
  'admin.common.pagination.previous': 'Anterior',
  'admin.common.pagination.next': 'Próximo',
  'admin.common.pagination.range': '{start} a {end} de {total}',
  'admin.common.search.attribute': 'Pesquisar por',
  'admin.common.search.submit': 'Pesquisar',
  'admin.common.search.clear': 'Limpar pesquisa',
  'admin.common.search.placeholder': '{attribute} exato',
  'admin.common.search.no_results': 'Nenhum resultado para "{value}". A pesquisa corresponde ao valor inteiro.',
  'admin.common.filters.type': 'Tipo de atribuído',
  'admin.common.filters.all_types': 'Todos os tipos',
  'admin.users.list.search.username': 'Nome de usuário',
  'admin.users.list.search.email': 'E-mail',
  'admin.agents.list.search.name': 'Nome',
  'admin.users.list.title': 'Usuários',
  'admin.users.list.columns.name': 'Nome',
  'admin.users.list.columns.type': 'Tipo de usuário',
  'admin.users.list.empty': 'Nenhum usuário encontrado.',
  'admin.users.list.error': 'Não foi possível carregar os usuários. Tente novamente.',
  'admin.users.create.title': 'Adicionar usuário',
  'admin.users.create.submit': 'Criar usuário',
  'admin.users.create.error': 'Não foi possível criar o usuário. Tente novamente.',
  'admin.users.create.fields.type': 'Tipo de usuário',
  'admin.users.create.fields.username': 'Nome de usuário',
  'admin.users.create.fields.email': 'E-mail',
  'admin.users.create.fields.given_name': 'Nome',
  'admin.users.create.fields.family_name': 'Sobrenome',
  'admin.users.create.fields.password': 'Senha',
  'admin.users.details.subtitle': 'Tipo de usuário: {type}',
  'admin.users.details.attributes': 'Atributos',
  'admin.users.details.no_attributes': 'Nenhum atributo.',
  'admin.users.details.groups': 'Grupos',
  'admin.users.details.no_groups': 'Não participa de nenhum grupo.',
  'admin.users.details.error': 'Não foi possível carregar este usuário. Tente novamente.',
  'admin.users.details.delete.action': 'Excluir usuário',
  'admin.users.details.delete.confirm': 'Excluir {name}?',
  'admin.users.details.delete.error': 'Não foi possível excluir o usuário. Tente novamente.',
  'admin.users.details.edit.action': 'Editar',
  'admin.users.details.edit.save': 'Salvar alterações',
  'admin.users.details.edit.error': 'Não foi possível salvar o usuário. Tente novamente.',
  'admin.groups.list.title': 'Grupos',
  'admin.groups.list.columns.name': 'Nome',
  'admin.groups.list.columns.description': 'Descrição',
  'admin.groups.list.empty': 'Nenhum grupo encontrado.',
  'admin.groups.list.error': 'Não foi possível carregar os grupos. Tente novamente.',
  'admin.groups.create.title': 'Criar grupo',
  'admin.groups.create.submit': 'Criar grupo',
  'admin.groups.create.fields.name': 'Nome',
  'admin.groups.create.fields.description': 'Descrição',
  'admin.groups.create.error': 'Não foi possível criar o grupo. Tente novamente.',
  'admin.groups.members.title': 'Membros',
  'admin.groups.members.add': 'Adicionar membro',
  'admin.groups.members.columns.member': 'Membro',
  'admin.groups.members.columns.type': 'Tipo',
  'admin.groups.members.empty': 'Este grupo não tem membros.',
  'admin.groups.members.remove_label': 'Remover {name} do grupo',
  'admin.groups.members.error': 'Não foi possível carregar os membros. Tente novamente.',
  'admin.groups.members.update_error': 'Não foi possível atualizar os membros. Tente novamente.',
  'admin.roles.list.title': 'Funções',
  'admin.roles.list.columns.name': 'Nome',
  'admin.roles.list.columns.description': 'Descrição',
  'admin.roles.list.empty': 'Nenhuma função encontrada.',
  'admin.roles.list.error': 'Não foi possível carregar as funções. Tente novamente.',
  'admin.roles.create.title': 'Criar função',
  'admin.roles.create.submit': 'Criar função',
  'admin.roles.create.fields.name': 'Nome',
  'admin.roles.create.fields.description': 'Descrição',
  'admin.roles.create.error': 'Não foi possível criar a função. Tente novamente.',
  'admin.roles.assignments.title': 'Atribuída a',
  'admin.roles.assignments.add': 'Atribuir função',
  'admin.roles.assignments.columns.assignee': 'Atribuído',
  'admin.roles.assignments.columns.type': 'Tipo',
  'admin.roles.assignments.empty': 'Esta função não está atribuída a ninguém.',
  'admin.roles.assignments.remove_label': 'Remover a função de {name}',
  'admin.roles.assignments.error': 'Não foi possível carregar as atribuições. Tente novamente.',
  'admin.roles.assignments.update_error': 'Não foi possível atualizar as atribuições. Tente novamente.',
  'admin.roles.permissions.title': 'Permissões',
  'admin.roles.permissions.empty': 'Esta função não concede permissões.',
  'admin.roles.permissions.error': 'Não foi possível carregar as permissões. Tente novamente.',
  'admin.agents.list.title': 'Agentes',
  'admin.agents.list.columns.name': 'Nome',
  'admin.agents.list.columns.type': 'Tipo de agente',
  'admin.agents.list.columns.client_id': 'ID do cliente',
  'admin.agents.list.empty': 'Nenhum agente encontrado.',
  'admin.agents.list.error': 'Não foi possível carregar os agentes. Tente novamente.',
  'admin.agents.create.title': 'Registrar agente',
  'admin.agents.create.submit': 'Registrar agente',
  'admin.agents.create.fields.name': 'Nome',
  'admin.agents.create.fields.type': 'Tipo de agente',
  'admin.agents.create.fields.description': 'Descrição',
  'admin.agents.create.error': 'Não foi possível registrar o agente. Tente novamente.',
  'admin.agents.details.overview': 'Visão geral',
  'admin.agents.details.type': 'Tipo de agente',
  'admin.agents.details.owner': 'Responsável',
  'admin.agents.details.no_owner': 'Sem responsável',
  'admin.agents.details.groups': 'Grupos',
  'admin.agents.details.no_groups': 'Não participa de nenhum grupo.',
  'admin.agents.details.roles': 'Funções',
  'admin.agents.details.no_roles': 'Nenhuma função atribuída.',
  'admin.agents.details.error': 'Não foi possível carregar este agente. Tente novamente.',
  'admin.agents.details.delete.action': 'Excluir agente',
  'admin.agents.details.delete.confirm': 'Excluir {name}?',
  'admin.agents.details.delete.error': 'Não foi possível excluir o agente. Tente novamente.',
};

const metadata: I18nMetadata = {
  localeCode: 'pt-BR',
  countryCode: 'BR',
  languageCode: 'pt',
  displayName: 'Português (Brazil)',
  direction: 'ltr',
};

const pt_BR: I18nBundle = {
  metadata,
  translations,
};

export default pt_BR;

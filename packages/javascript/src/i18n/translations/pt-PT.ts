// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {I18nTranslations, I18nMetadata, I18nBundle} from '../models/i18n';

const translations: I18nTranslations = {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  /* Buttons */
  'elements.buttons.signin.text': 'Iniciar Sessão',
  'elements.buttons.signout.text': 'Terminar Sessão',
  'elements.buttons.signup.text': 'Registar-se',
  'elements.buttons.submit.text': 'Continuar',
  'elements.buttons.facebook.text': 'Iniciar Sessão com Facebook',
  'elements.buttons.google.text': 'Iniciar Sessão com Google',
  'elements.buttons.github.text': 'Iniciar Sessão com GitHub',
  'elements.buttons.microsoft.text': 'Iniciar Sessão com Microsoft',
  'elements.buttons.linkedin.text': 'Iniciar Sessão com LinkedIn',
  'elements.buttons.ethereum.text': 'Iniciar Sessão com Ethereum',
  'elements.buttons.smsotp.text': 'Iniciar Sessão com SMS',
  'elements.buttons.multi.option.text': 'Iniciar Sessão com {connection}',
  'elements.buttons.social.text': 'Iniciar Sessão com {connection}',

  /* Display */
  'elements.display.divider.or_separator': 'OU',
  'elements.display.copyable_text.copy': 'Cópia',
  'elements.display.copyable_text.copied': 'Copiado!',
  'elements.display.copyable_text.show': 'Mostrar',
  'elements.display.copyable_text.hide': 'Ocultar',

  /* Fields */
  'elements.fields.generic.placeholder': 'Introduza o seu {field}',
  'elements.fields.username.label': 'Nome de utilizador',
  'elements.fields.username.placeholder': 'Introduza o nome de utilizador',
  'elements.fields.password.label': 'Palavra-passe',
  'elements.fields.password.placeholder': 'Introduza a palavra-passe',
  'elements.fields.first_name.label': 'Primeiro nome',
  'elements.fields.first_name.placeholder': 'Introduza o primeiro nome',
  'elements.fields.last_name.label': 'Apelido',
  'elements.fields.last_name.placeholder': 'Introduza o apelido',
  'elements.fields.email.label': 'Email',
  'elements.fields.email.placeholder': 'Introduza o email',
  'elements.fields.organization.name.label': 'Nome da Organização',
  'elements.fields.organization.handle.label': 'Identificador da Organização',
  'elements.fields.organization.description.label': 'Descrição da Organização',
  'elements.fields.organization.select.label': 'Selecionar Organização',
  'elements.fields.organization.select.placeholder': 'Selecione uma organização',

  /* Select */
  'elements.fields.auth_flow_select.aria_label': 'Selecionar um fluxo de início de sessão',
  'elements.fields.auth_flow_select.empty': 'Nenhum fluxo de início de sessão encontrado.',
  'elements.fields.select.load_more': 'Carregar mais',
  'elements.fields.select.loading': 'A carregar…',
  'elements.fields.select.loading_more': 'A carregar mais…',
  'elements.fields.user_select.aria_label': 'Selecionar um utilizador',
  'elements.fields.user_select.empty': 'Nenhum utilizador encontrado.',
  'elements.fields.user_type_select.aria_label': 'Selecionar um tipo de utilizador',
  'elements.fields.user_type_select.empty': 'Nenhum tipo de utilizador encontrado.',

  /* Validation */
  'validations.required.field.error': 'Este campo é obrigatório',
  'validation.pattern.invalid': 'Este valor não corresponde ao formato necessário.',
  'validation.minLength.invalid': 'Este valor é demasiado curto.',
  'validation.maxLength.invalid': 'Este valor é demasiado longo.',

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'deviceGrant.errors.start': 'Não foi possível iniciar a verificação do dispositivo. Atualize esta página.',
  'deviceGrant.errors.continue': 'Não foi possível continuar a autorização do dispositivo. Tente novamente.',
  'deviceGrant.messages.complete': 'Dispositivo autorizado',
  'deviceGrant.messages.completeDescription': 'Pode regressar ao seu dispositivo.',
  'deviceGrant.messages.failed': 'Falha na autorização do dispositivo',
  'deviceGrant.messages.failedDescription': 'Regresse ao seu dispositivo e comece novamente.',

  'signin.heading': 'Iniciar Sessão',
  'signin.subheading': 'Introduza as suas credenciais para continuar.',
  'signin.images.app_logo.alt': 'Logótipo da aplicação',

  /* Base Sign Up */
  'signup.heading': 'Registar-se',
  'signup.subheading': 'Crie uma nova conta para começar.',

  /* Email OTP */
  'email.otp.heading': 'Verificação OTP',
  'email.otp.subheading': 'Introduza o código enviado para o seu e-mail.',
  'email.otp.buttons.submit.text': 'Continuar',

  /* Identifier First */
  'identifier.first.heading': 'Iniciar Sessão',
  'identifier.first.subheading': 'Introduza o seu utilizador ou e-mail.',
  'identifier.first.buttons.submit.text': 'Continuar',

  /* SMS OTP */
  'sms.otp.heading': 'Verificação OTP',
  'sms.otp.subheading': 'Introduza o código enviado para o seu telemóvel.',
  'sms.otp.buttons.submit.text': 'Continuar',

  /* TOTP */
  'totp.heading': 'Verifique a sua identidade',
  'totp.subheading': 'Introduza o código da sua aplicação autenticadora.',
  'totp.buttons.submit.text': 'Continuar',

  /* Username Password */
  'username.password.buttons.submit.text': 'Continuar',
  'username.password.heading': 'Iniciar Sessão',
  'username.password.subheading': 'Introduza o seu utilizador e palavra-passe para continuar.',

  /* Passkeys */
  'passkey.button.use': 'Iniciar sessão com Passkey',
  'passkey.signin.heading': 'Iniciar sessão com Passkey',
  'passkey.register.heading': 'Registar Passkey',
  'passkey.register.description': 'Crie uma passkey para iniciar sessão na sua conta com segurança sem palavra-passe.',

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': 'Perfil',
  'user.profile.update.generic.error': 'Ocorreu um erro ao actualizar o seu perfil. Tente novamente.',

  /* |---------------------------------------------------------------| */
  /* |                       User Verification                       | */
  /* |---------------------------------------------------------------| */

  'user.verification.status.verified': 'Verificado',
  'user.verification.status.unverified': 'Não verificado',
  'user.verification.status.verified_at': 'Verificado em {date}',
  'user.verification.buttons.verify.text': 'Verificar',
  'user.verification.buttons.cancel.text': 'Cancelar',
  'user.verification.buttons.close.text': 'Fechar',
  'user.verification.buttons.done.text': 'Concluído',
  'user.verification.heading': 'Verificar {attribute}',
  'user.verification.subheading': 'Introduza o código enviado para {destination}.',
  'user.verification.subheading.generic': 'Introduza o código que lhe foi enviado.',
  'user.verification.subheading.link':
    'Enviámos uma ligação de verificação para {destination}. Abra-a e selecione Concluído.',
  'user.verification.destination': 'Enviado para {destination}.',
  'user.verification.success': 'Verificação de {attribute} concluída.',
  'user.verification.error': 'A verificação falhou. Tente novamente.',

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': 'Alterar {credential}',
  'user.change_password.new.label': 'Novo {credential}',
  'user.change_password.new.placeholder': 'Introduza o seu novo {credentialLower}',
  'user.change_password.confirm.label': 'Confirmar novo {credential}',
  'user.change_password.confirm.placeholder': 'Introduza novamente o seu novo {credentialLower}',
  'user.change_password.requirements.heading': 'O seu {credentialLower} deve conter:',
  'user.change_password.submit': 'Atualizar {credential}',
  'user.change_password.success': 'O seu {credentialLower} foi atualizado.',
  'user.change_password.mismatch.error': 'Os {credentialLower}s não coincidem.',
  'user.change_password.generic.error': 'Ocorreu um erro ao actualizar o seu {credentialLower}. Tente novamente.',
  'user.change_password.unavailable.heading': 'Alteração de {credentialLower} indisponível',
  'user.change_password.unavailable.description': 'Contacte o seu administrador.',
  'validation.password.pattern': 'Corresponde ao formato exigido',

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': 'Trocar Organização',
  'organization.switcher.loading.placeholder.organizations': 'A carregar organizações...',
  'organization.switcher.members': 'membros',
  'organization.switcher.member': 'membro',
  'organization.switcher.create.organization': 'Criar Organização',
  'organization.switcher.manage.organizations': 'Gerir Organizações',
  'organization.switcher.buttons.manage.text': 'Gerir',
  'organization.switcher.organizations.heading': 'Organizações',
  'organization.switcher.buttons.switch.text': 'Trocar',
  'organization.switcher.no.access': 'Sem Acesso',
  'organization.switcher.status.label': 'Estado:',
  'organization.switcher.showing.count': 'A mostrar {showing} de {total} organizações',
  'organization.switcher.buttons.refresh.text': 'Actualizar',
  'organization.switcher.buttons.load_more.text': 'Carregar Mais Organizações',
  'organization.switcher.loading.more': 'A carregar...',
  'organization.switcher.no.organizations': 'Nenhuma organização encontrada',
  'organization.switcher.error.prefix': 'Erro:',

  'organization.profile.heading': 'Perfil da Organização',
  'organization.profile.loading': 'A carregar organização...',
  'organization.profile.error': 'Falha ao carregar organização',

  'organization.create.heading': 'Criar Organização',
  'organization.create.buttons.create_organization.text': 'Criar Organização',
  'organization.create.buttons.create_organization.loading.text': 'A criar...',
  'organization.create.buttons.cancel.text': 'Cancelar',

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': 'A carregar...',

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': 'Obrigatório',
  'consent.essential_claims': 'Atributos essenciais',
  'consent.optional_claims': 'Atributos opcionais',
  'consent.authorize_scope': 'Permissões',
  'consent.essential_scope': 'Permissões essenciais',
  'consent.optional_scope': 'Permissões opcionais',
  'consent.essential_claims.info': 'Estes atributos são necessários para o correto funcionamento do serviço.',
  'consent.optional_claims.info': 'Estes atributos são opcionais e podem ser fornecidos ao seu critério.',
  'consent.authorize_scope.info': 'Estas permissões permitem que o serviço aceda a funcionalidades adicionais.',
  'consent.authorization_details.approve': 'Aprovar',
  'consent.authorization_details.show_more': 'Mostrar mais',
  'consent.authorization_details.show_less': 'Mostrar menos',
  'consent.authorization_details.more_items': '+{count} a mais',
  'consent.authorization_details.invalid_number': 'Introduza um número.',
  'consent.authorization_details.number_max': 'Introduza {value} ou menos.',
  'consent.authorization_details.number_min': 'Introduza {value} ou mais.',
  'consent.authorization_details.invalid_date': 'Introduza uma data.',
  'consent.authorization_details.date_max': 'Escolha {value} ou uma data anterior.',
  'consent.authorization_details.date_min': 'Escolha {value} ou uma data posterior.',
  'consent.authorization_details.remove_item': '{item}, remover',
  'consent.authorization_details.add_item': '{item}, adicionar',
  'consent.authorization_details.add_back_item': '{item}, adicionar novamente',
  'consent.authorization_details.new_item': '{label}, adicionar',
  'consent.essential_scope.info': 'Estas permissões são necessárias para o correto funcionamento do serviço.',
  'consent.optional_scope.info': 'Estas permissões são opcionais e podem ser concedidas ao seu critério.',

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': 'Erro',
  'errors.signin.initialization': 'Ocorreu um erro ao inicializar. Tente novamente mais tarde.',
  'errors.signin.flow.failure': 'Ocorreu um erro durante o início de sessão. Tente novamente mais tarde.',
  'errors.signin.flow.completion.failure':
    'Ocorreu um erro ao completar o início de sessão. Tente novamente mais tarde.',
  'errors.signin.flow.passkeys.failure':
    'Ocorreu um erro ao iniciar sessão com as chaves de acesso (passkeys). Tente novamente mais tarde.',
  'errors.signin.flow.passkeys.completion.failure':
    'Ocorreu um erro ao completar o início de sessão com as chaves de acesso (passkeys). Tente novamente mais tarde.',
  'errors.signup.initialization': 'Ocorreu um erro durante a inicialização. Tente novamente mais tarde.',
  'errors.signup.flow.failure': 'Ocorreu um erro durante o fluxo de registo. Tente novamente mais tarde.',
  'errors.signup.flow.initialization.failure':
    'Ocorreu um erro ao inicializar o fluxo de registo. Tente novamente mais tarde.',
  'errors.signup.popup.failure': 'Não foi possível continuar o registo na janela pop-up. Tente novamente.',
  'errors.signup.components.not.available':
    'O formulário de registo não está disponível de momento. Tente novamente mais tarde.',
  'errors.signin.components.not.available':
    'O formulário de início de sessão não está disponível de momento. Tente novamente mais tarde.',
  'errors.signin.timeout': 'O tempo permitido para completar a etapa expirou.',
  /* Admin */
  'admin.common.loading': 'A carregar…',
  'attribution.secured_by': 'Protegido por',
  'attribution.powered_by': 'Desenvolvido por',
  'admin.common.actions.cancel': 'Cancelar',
  'admin.common.actions.confirm': 'Confirmar',
  'admin.common.actions.remove': 'Remover',
  'admin.common.status.active': 'Ativo',
  'admin.common.status.locked': 'Bloqueado',
  'admin.common.status.suspended': 'Suspenso',
  'admin.common.lifecycle.suspend': 'Suspender',
  'admin.common.lifecycle.unsuspend': 'Levantar suspensão',
  'admin.common.lifecycle.unlock': 'Desbloquear',
  'admin.common.lifecycle.suspend_confirm':
    'Suspender {name}? Deixa de poder iniciar sessão, e as suas sessões e tokens são revogados.',
  'admin.common.lifecycle.unsuspend_confirm':
    'Levantar a suspensão de {name}? O acesso é reposto, a menos que também esteja bloqueado.',
  'admin.common.lifecycle.operator_note': 'Nota (opcional)',
  'admin.common.lifecycle.error': 'Não foi possível concluir a ação.',
  'admin.common.lifecycle.load_error': 'Não foi possível carregar as ações da conta.',
  'admin.common.columns.actions': 'Ações',
  'admin.common.columns.organization_unit': 'Unidade organizacional',
  'admin.common.columns.status': 'Estado',
  'admin.common.errors.forbidden': 'Não tem permissão para fazer isto.',
  'admin.common.errors.not_found': 'Não foi possível encontrar este item.',
  'admin.common.errors.no_ou': 'Escolha uma unidade organizacional antes de criar este item.',
  'admin.common.fields.identity': 'Nome',
  'admin.common.fields.identity_type': 'Tipo',
  'admin.common.fields.identity_placeholder': 'Selecione uma identidade',
  'admin.common.fields.identity_empty': 'Nada para adicionar',
  'admin.common.identity_types.user': 'Utilizador',
  'admin.common.identity_types.group': 'Grupo',
  'admin.common.identity_types.agent': 'Agente',
  'admin.common.identity_types.app': 'Aplicação',
  'admin.common.pagination.label': 'Paginação',
  'admin.common.pagination.previous': 'Anterior',
  'admin.common.pagination.next': 'Seguinte',
  'admin.common.pagination.range': '{start} a {end} de {total}',
  'admin.common.search.attribute': 'Pesquisar por',
  'admin.common.search.submit': 'Pesquisar',
  'admin.common.search.clear': 'Limpar pesquisa',
  'admin.common.search.placeholder': '{attribute} exato',
  'admin.common.search.no_results': 'Sem resultados para "{value}". A pesquisa corresponde ao valor completo.',
  'admin.common.filters.type': 'Tipo de atribuído',
  'admin.common.filters.all_types': 'Todos os tipos',
  'admin.users.list.search.username': 'Nome de utilizador',
  'admin.users.list.search.email': 'E-mail',
  'admin.agents.list.search.name': 'Nome',
  'admin.users.list.title': 'Utilizadores',
  'admin.users.list.columns.name': 'Nome',
  'admin.users.list.columns.type': 'Tipo de utilizador',
  'admin.users.list.empty': 'Nenhum utilizador encontrado.',
  'admin.users.list.error': 'Não foi possível carregar os utilizadores. Tente novamente.',
  'admin.users.create.title': 'Adicionar utilizador',
  'admin.users.create.submit': 'Criar utilizador',
  'admin.users.create.error': 'Não foi possível criar o utilizador. Tente novamente.',
  'admin.users.create.fields.type': 'Tipo de utilizador',
  'admin.users.create.fields.username': 'Nome de utilizador',
  'admin.users.create.fields.email': 'E-mail',
  'admin.users.create.fields.given_name': 'Nome próprio',
  'admin.users.create.fields.family_name': 'Apelido',
  'admin.users.create.fields.password': 'Palavra-passe',
  'admin.users.details.subtitle': 'Tipo de utilizador: {type}',
  'admin.users.details.attributes': 'Atributos',
  'admin.users.details.no_attributes': 'Sem atributos.',
  'admin.users.details.groups': 'Grupos',
  'admin.users.details.no_groups': 'Não pertence a nenhum grupo.',
  'admin.users.details.error': 'Não foi possível carregar este utilizador. Tente novamente.',
  'admin.users.details.delete.action': 'Eliminar utilizador',
  'admin.users.details.delete.confirm': 'Eliminar {name}?',
  'admin.users.details.delete.error': 'Não foi possível eliminar o utilizador. Tente novamente.',
  'admin.users.details.edit.action': 'Editar',
  'admin.users.details.edit.save': 'Guardar alterações',
  'admin.users.details.edit.error': 'Não foi possível guardar o utilizador. Tente novamente.',
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
  'admin.roles.assignments.columns.assignee': 'Destinatário',
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
  'admin.agents.list.columns.client_id': 'ID de cliente',
  'admin.agents.list.empty': 'Nenhum agente encontrado.',
  'admin.agents.list.error': 'Não foi possível carregar os agentes. Tente novamente.',
  'admin.agents.create.title': 'Registar agente',
  'admin.agents.create.submit': 'Registar agente',
  'admin.agents.create.fields.name': 'Nome',
  'admin.agents.create.fields.type': 'Tipo de agente',
  'admin.agents.create.fields.description': 'Descrição',
  'admin.agents.create.error': 'Não foi possível registar o agente. Tente novamente.',
  'admin.agents.details.overview': 'Visão geral',
  'admin.agents.details.type': 'Tipo de agente',
  'admin.agents.details.owner': 'Responsável',
  'admin.agents.details.no_owner': 'Sem responsável',
  'admin.agents.details.groups': 'Grupos',
  'admin.agents.details.no_groups': 'Não pertence a nenhum grupo.',
  'admin.agents.details.roles': 'Funções',
  'admin.agents.details.no_roles': 'Nenhuma função atribuída.',
  'admin.agents.details.error': 'Não foi possível carregar este agente. Tente novamente.',
  'admin.agents.details.delete.action': 'Eliminar agente',
  'admin.agents.details.delete.confirm': 'Eliminar {name}?',
  'admin.agents.details.delete.error': 'Não foi possível eliminar o agente. Tente novamente.',
  'admin.applications.list.title': 'Aplicações',
  'admin.applications.list.columns.name': 'Nome',
  'admin.applications.list.columns.client_id': 'ID de cliente',
  'admin.applications.list.columns.type': 'Tipo',
  'admin.applications.list.columns.status': 'Estado',
  'admin.applications.list.empty': 'Nenhuma aplicação encontrada.',
  'admin.applications.list.error': 'Não foi possível carregar as aplicações. Tente novamente.',
  'admin.applications.status.active': 'Ativo',
  'admin.applications.status.suspended': 'Suspenso',
  'admin.applications.create.title': 'Criar aplicação',
  'admin.applications.create.submit': 'Criar aplicação',
  'admin.applications.create.error': 'Não foi possível criar a aplicação. Tente novamente.',
  'admin.applications.fields.name': 'Nome',
  'admin.applications.fields.description': 'Descrição',
  'admin.applications.fields.url': 'URL da aplicação',
  'admin.applications.fields.logo_url': 'URL do logótipo',
  'admin.applications.fields.redirect_uris': 'URIs de redirecionamento',
  'admin.applications.fields.redirect_uris_hint':
    'Necessários para a concessão por código de autorização. Separe os URIs com vírgulas.',
  'admin.applications.fields.grant_types': 'Tipos de concessão',
  'admin.applications.fields.public_client': 'Cliente público (sem segredo de cliente)',
  'admin.applications.grant_types.authorization_code': 'Código de autorização',
  'admin.applications.grant_types.refresh_token': 'Token de atualização',
  'admin.applications.grant_types.client_credentials': 'Credenciais de cliente',
  'admin.applications.secret.title': 'Segredo de cliente',
  'admin.applications.secret.notice': 'Copie o segredo de cliente agora. Não voltará a ser apresentado.',
  'admin.applications.secret.done': 'Concluído',
  'admin.applications.details.overview': 'Visão geral',
  'admin.applications.details.oauth': 'OAuth',
  'admin.applications.details.type': 'Tipo',
  'admin.applications.details.public_client': 'Cliente público',
  'admin.applications.details.yes': 'Sim',
  'admin.applications.details.no': 'Não',
  'admin.applications.details.not_set': 'Não definido',
  'admin.applications.details.no_redirect_uris': 'Nenhum URI de redirecionamento.',
  'admin.applications.details.no_grant_types': 'Nenhum tipo de concessão.',
  'admin.applications.details.error': 'Não foi possível carregar esta aplicação. Tente novamente.',
  'admin.applications.details.delete.action': 'Eliminar aplicação',
  'admin.applications.details.delete.confirm': 'Eliminar {name}?',
  'admin.applications.details.delete.error': 'Não foi possível eliminar a aplicação. Tente novamente.',
  'admin.applications.details.edit.action': 'Editar',
  'admin.applications.details.edit.save': 'Guardar alterações',
  'admin.applications.details.edit.error': 'Não foi possível guardar a aplicação. Tente novamente.',
  'admin.applications.details.secret.action': 'Gerar novo segredo de cliente',
  'admin.applications.details.secret.confirm':
    'Gerar um novo segredo de cliente para {name}? As aplicações que usam o segredo atual deixarão de funcionar.',
  'admin.applications.details.secret.error': 'Não foi possível gerar um novo segredo de cliente. Tente novamente.',
};

const metadata: I18nMetadata = {
  localeCode: 'pt-PT',
  countryCode: 'PT',
  languageCode: 'pt',
  displayName: 'Português (Portugal)',
  direction: 'ltr',
};

const pt_PT: I18nBundle = {
  metadata,
  translations,
};

export default pt_PT;

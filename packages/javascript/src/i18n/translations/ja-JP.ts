// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {I18nTranslations, I18nMetadata, I18nBundle} from '../models/i18n';

const translations: I18nTranslations = {
  /* |---------------------------------------------------------------| */
  /* |                        Elements                               | */
  /* |---------------------------------------------------------------| */

  /* Buttons */
  'elements.buttons.signin.text': 'ログイン',
  'elements.buttons.signout.text': 'ログアウト',
  'elements.buttons.signup.text': 'サインアップ',
  'elements.buttons.submit.text': '続行',
  'elements.buttons.facebook.text': 'Facebookで続行',
  'elements.buttons.google.text': 'Googleで続行',
  'elements.buttons.github.text': 'GitHubで続行',
  'elements.buttons.microsoft.text': 'Microsoftで続行',
  'elements.buttons.linkedin.text': 'LinkedInで続行',
  'elements.buttons.ethereum.text': 'Ethereumでサインイン',
  'elements.buttons.smsotp.text': 'SMSで続行',
  'elements.buttons.multi.option.text': '{connection}で続行',
  'elements.buttons.social.text': '{connection}で続行',

  /* Display */
  'elements.display.divider.or_separator': 'または',
  'elements.display.copyable_text.copy': 'コピー',
  'elements.display.copyable_text.copied': 'コピーしました！',
  'elements.display.copyable_text.show': '表示',
  'elements.display.copyable_text.hide': '非表示',

  /* Fields */
  'elements.fields.generic.placeholder': '{field}を入力してください',
  'elements.fields.username.label': 'ユーザー名',
  'elements.fields.username.placeholder': 'ユーザー名を入力してください',
  'elements.fields.password.label': 'パスワード',
  'elements.fields.password.placeholder': 'パスワードを入力してください',
  'elements.fields.first_name.label': '名',
  'elements.fields.first_name.placeholder': '名を入力してください',
  'elements.fields.last_name.label': '姓',
  'elements.fields.last_name.placeholder': '姓を入力してください',
  'elements.fields.email.label': 'メールアドレス',
  'elements.fields.email.placeholder': 'メールアドレスを入力してください',
  'elements.fields.organization.name.label': '組織名',
  'elements.fields.organization.handle.label': '組織ハンドル',
  'elements.fields.organization.description.label': '組織の説明',
  'elements.fields.organization.select.label': '組織を選択',
  'elements.fields.organization.select.placeholder': '組織を選択してください',

  /* Select */
  'elements.fields.auth_flow_select.aria_label': 'ログインフローを選択',
  'elements.fields.auth_flow_select.empty': '該当するログインフローが見つかりません。',
  'elements.fields.select.load_more': 'さらに読み込む',
  'elements.fields.select.loading': '読み込み中…',
  'elements.fields.select.loading_more': 'さらに読み込み中…',
  'elements.fields.user_select.aria_label': 'ユーザーを選択',
  'elements.fields.user_select.empty': '該当するユーザーが見つかりません。',
  'elements.fields.user_type_select.aria_label': 'ユーザータイプを選択',
  'elements.fields.user_type_select.empty': '該当するユーザータイプが見つかりません。',

  /* Validation */
  'validations.required.field.error': 'この項目は必須です',
  'validation.pattern.invalid': 'この値は必要な形式と一致しません。',
  'validation.minLength.invalid': 'この値は短すぎます。',
  'validation.maxLength.invalid': 'この値は長すぎます。',

  /* |---------------------------------------------------------------| */
  /* |                        Widgets                                | */
  /* |---------------------------------------------------------------| */

  /* Base Sign In */
  'signin.heading': 'ログイン',
  'signin.subheading': '続行するには認証情報を入力してください。',
  'signin.images.app_logo.alt': 'アプリケーションロゴ',

  /* Base Sign Up */
  'signup.heading': 'サインアップ',
  'signup.subheading': 'はじめるには新しいアカウントを作成してください。',

  /* Email OTP */
  'email.otp.heading': 'OTP認証',
  'email.otp.subheading': 'メールに送信されたコードを入力してください。',
  'email.otp.buttons.submit.text': '続行',

  /* Identifier First */
  'identifier.first.heading': 'ログイン',
  'identifier.first.subheading': 'ユーザー名またはメールアドレスを入力してください。',
  'identifier.first.buttons.submit.text': '続行',

  /* SMS OTP */
  'sms.otp.heading': 'OTP認証',
  'sms.otp.subheading': '電話番号に送信されたコードを入力してください。',
  'sms.otp.buttons.submit.text': '続行',

  /* TOTP */
  'totp.heading': '本人確認',
  'totp.subheading': '認証アプリのコードを入力してください。',
  'totp.buttons.submit.text': '続行',

  /* Username Password */
  'username.password.buttons.submit.text': '続行',
  'username.password.heading': 'ログイン',
  'username.password.subheading': 'ユーザー名とパスワードを入力してください。',

  /* Passkeys */
  'passkey.button.use': 'パスキーでサインイン',
  'passkey.signin.heading': 'パスキーでサインイン',
  'passkey.register.heading': 'パスキーを登録',
  'passkey.register.description': 'パスワードなしでアカウントに安全にサインインするためのパスキーを作成します。',

  /* |---------------------------------------------------------------| */
  /* |                          User Profile                         | */
  /* |---------------------------------------------------------------| */

  'user.profile.heading': 'プロフィール',
  'user.profile.update.generic.error': 'プロフィール更新中にエラーが発生しました。もう一度お試しください。',

  /* |---------------------------------------------------------------| */
  /* |                        Change Password                        | */
  /* |---------------------------------------------------------------| */

  'user.change_password.heading': '{credential}の変更',
  'user.change_password.new.label': '新しい{credential}',
  'user.change_password.new.placeholder': '新しい{credentialLower}を入力してください',
  'user.change_password.confirm.label': '新しい{credential}の確認',
  'user.change_password.confirm.placeholder': '新しい{credentialLower}を再入力してください',
  'user.change_password.requirements.heading': '{credentialLower}の条件:',
  'user.change_password.submit': '{credential}を更新',
  'user.change_password.success': '{credentialLower}を更新しました。',
  'user.change_password.mismatch.error': '{credentialLower}が一致しません。',
  'user.change_password.generic.error': '{credentialLower}の更新中にエラーが発生しました。もう一度お試しください。',
  'user.change_password.unavailable.heading': '{credential}の変更はできません',
  'user.change_password.unavailable.description': '管理者にお問い合わせください。',
  'validation.password.pattern': '必要な形式に一致しています',

  /* |---------------------------------------------------------------| */
  /* |                     Organization Switcher                     | */
  /* |---------------------------------------------------------------| */

  'organization.switcher.switch.organization': '組織を切り替え',
  'organization.switcher.loading.placeholder.organizations': '組織を読み込み中…',
  'organization.switcher.members': 'メンバー',
  'organization.switcher.member': 'メンバー',
  'organization.switcher.create.organization': '組織を作成',
  'organization.switcher.manage.organizations': '組織を管理',
  'organization.switcher.buttons.manage.text': '管理',
  'organization.switcher.organizations.heading': '組織',
  'organization.switcher.buttons.switch.text': '切り替え',
  'organization.switcher.no.access': 'アクセス権がありません',
  'organization.switcher.status.label': 'ステータス:',
  'organization.switcher.showing.count': '全{total}件中{showing}件を表示',
  'organization.switcher.buttons.refresh.text': '更新',
  'organization.switcher.buttons.load_more.text': 'さらに読み込む',
  'organization.switcher.loading.more': '読み込み中…',
  'organization.switcher.no.organizations': '組織が見つかりません',
  'organization.switcher.error.prefix': 'エラー:',

  'organization.profile.heading': '組織プロファイル',
  'organization.profile.loading': '組織を読み込み中…',
  'organization.profile.error': '組織の読み込みに失敗しました',

  'organization.create.heading': '組織の作成',
  'organization.create.buttons.create_organization.text': '組織を作成',
  'organization.create.buttons.create_organization.loading.text': '作成中…',
  'organization.create.buttons.cancel.text': 'キャンセル',

  /* |---------------------------------------------------------------| */
  /* |                        Messages                               | */
  /* |---------------------------------------------------------------| */

  'messages.loading.placeholder': '読み込み中…',

  /* |---------------------------------------------------------------| */
  /* |                        Consent                                | */
  /* |---------------------------------------------------------------| */

  'consent.required': '必須',
  'consent.essential_claims': '必須属性',
  'consent.optional_claims': '任意属性',
  'consent.authorize_scope': '権限',
  'consent.essential_claims.info': 'これらの属性は、サービスが正常に機能するために必要です。',
  'consent.optional_claims.info': 'これらの属性は任意であり、お客様の判断で提供できます。',
  'consent.authorize_scope.info': 'これらの権限により、サービスが追加機能にアクセスできるようになります。',

  /* |---------------------------------------------------------------| */
  /* |                        Errors                                 | */
  /* |---------------------------------------------------------------| */

  'errors.heading': 'エラー',
  'errors.signin.initialization': '初期化中にエラーが発生しました。後でもう一度お試しください。',
  'errors.signin.flow.failure': 'サインイン処理中にエラーが発生しました。後でもう一度お試しください。',
  'errors.signin.flow.completion.failure': 'サインイン処理の完了中にエラーが発生しました。後でもう一度お試しください。',
  'errors.signin.flow.passkeys.failure': 'パスキーでのサインイン中にエラーが発生しました。後でもう一度お試しください。',
  'errors.signin.flow.passkeys.completion.failure':
    'パスキーによるサインイン完了中にエラーが発生しました。後でもう一度お試しください。',
  'errors.signup.initialization': '初期化中にエラーが発生しました。後でもう一度お試しください。',
  'errors.signup.flow.failure': 'サインアップフロー中にエラーが発生しました。後でもう一度お試しください。',
  'errors.signup.flow.initialization.failure':
    'サインアップフローの初期化中にエラーが発生しました。後でもう一度お試しください。',
  'errors.signup.popup.failure': 'ポップアップウィンドウでサインアップを続行できませんでした。もう一度お試しください。',
  'errors.signup.components.not.available': 'サインアップフォームは現在利用できません。後でもう一度お試しください。',
  'errors.signin.components.not.available': 'サインインフォームは現在利用できません。後でもう一度お試しください。',
  'errors.signin.timeout': 'ステップを完了するために許可された時間が経過しました。',
  /* Admin */
  'admin.common.loading': '読み込み中…',
  'attribution.secured_by': 'セキュリティ提供',
  'attribution.powered_by': '提供',
  'admin.common.actions.cancel': 'キャンセル',
  'admin.common.actions.confirm': '確認',
  'admin.common.actions.remove': '削除',
  'admin.common.columns.actions': '操作',
  'admin.common.columns.organization_unit': '組織単位',
  'admin.common.errors.forbidden': 'この操作を行う権限がありません。',
  'admin.common.errors.not_found': 'この項目は見つかりませんでした。',
  'admin.common.errors.no_ou': 'この項目を作成する前に組織単位を選択してください。',
  'admin.common.fields.identity': '名前',
  'admin.common.fields.identity_type': '種類',
  'admin.common.fields.identity_placeholder': 'IDを選択',
  'admin.common.fields.identity_empty': '追加できる項目はありません',
  'admin.common.identity_types.user': 'ユーザー',
  'admin.common.identity_types.group': 'グループ',
  'admin.common.identity_types.agent': 'エージェント',
  'admin.common.identity_types.app': 'アプリケーション',
  'admin.common.pagination.label': 'ページ送り',
  'admin.common.pagination.previous': '前へ',
  'admin.common.pagination.next': '次へ',
  'admin.common.pagination.range': '{total} 件中 {start}〜{end} 件',
  'admin.common.search.attribute': '検索対象',
  'admin.common.search.submit': '検索',
  'admin.common.search.clear': '検索をクリア',
  'admin.common.search.placeholder': '{attribute}（完全一致）',
  'admin.common.search.no_results': '「{value}」に一致する項目はありません。検索は値全体と一致します。',
  'admin.common.filters.type': '割り当て先の種類',
  'admin.common.filters.all_types': 'すべての種類',
  'admin.users.list.search.username': 'ユーザー名',
  'admin.users.list.search.email': 'メール',
  'admin.agents.list.search.name': '名前',
  'admin.users.list.title': 'ユーザー',
  'admin.users.list.columns.name': '名前',
  'admin.users.list.columns.type': 'ユーザータイプ',
  'admin.users.list.empty': 'ユーザーが見つかりません。',
  'admin.users.list.error': 'ユーザーを読み込めませんでした。もう一度お試しください。',
  'admin.users.create.title': 'ユーザーを追加',
  'admin.users.create.submit': 'ユーザーを作成',
  'admin.users.create.error': 'ユーザーを作成できませんでした。もう一度お試しください。',
  'admin.users.create.fields.type': 'ユーザータイプ',
  'admin.users.create.fields.username': 'ユーザー名',
  'admin.users.create.fields.email': 'メールアドレス',
  'admin.users.create.fields.given_name': '名',
  'admin.users.create.fields.family_name': '姓',
  'admin.users.create.fields.password': 'パスワード',
  'admin.users.details.subtitle': 'ユーザータイプ: {type}',
  'admin.users.details.attributes': '属性',
  'admin.users.details.no_attributes': '属性はありません。',
  'admin.users.details.groups': 'グループ',
  'admin.users.details.no_groups': 'どのグループにも属していません。',
  'admin.users.details.error': 'このユーザーを読み込めませんでした。もう一度お試しください。',
  'admin.users.details.delete.action': 'ユーザーを削除',
  'admin.users.details.delete.confirm': '{name} を削除しますか?',
  'admin.users.details.delete.error': 'ユーザーを削除できませんでした。もう一度お試しください。',
  'admin.users.details.edit.action': '編集',
  'admin.users.details.edit.save': '変更を保存',
  'admin.users.details.edit.error': 'ユーザーを保存できませんでした。もう一度お試しください。',
  'admin.groups.list.title': 'グループ',
  'admin.groups.list.columns.name': '名前',
  'admin.groups.list.columns.description': '説明',
  'admin.groups.list.empty': 'グループが見つかりません。',
  'admin.groups.list.error': 'グループを読み込めませんでした。もう一度お試しください。',
  'admin.groups.create.title': 'グループを作成',
  'admin.groups.create.submit': 'グループを作成',
  'admin.groups.create.fields.name': '名前',
  'admin.groups.create.fields.description': '説明',
  'admin.groups.create.error': 'グループを作成できませんでした。もう一度お試しください。',
  'admin.groups.members.title': 'メンバー',
  'admin.groups.members.add': 'メンバーを追加',
  'admin.groups.members.columns.member': 'メンバー',
  'admin.groups.members.columns.type': '種類',
  'admin.groups.members.empty': 'このグループにはメンバーがいません。',
  'admin.groups.members.remove_label': '{name} をグループから削除',
  'admin.groups.members.error': 'メンバーを読み込めませんでした。もう一度お試しください。',
  'admin.groups.members.update_error': 'メンバーを更新できませんでした。もう一度お試しください。',
  'admin.roles.list.title': 'ロール',
  'admin.roles.list.columns.name': '名前',
  'admin.roles.list.columns.description': '説明',
  'admin.roles.list.empty': 'ロールが見つかりません。',
  'admin.roles.list.error': 'ロールを読み込めませんでした。もう一度お試しください。',
  'admin.roles.create.title': 'ロールを作成',
  'admin.roles.create.submit': 'ロールを作成',
  'admin.roles.create.fields.name': '名前',
  'admin.roles.create.fields.description': '説明',
  'admin.roles.create.error': 'ロールを作成できませんでした。もう一度お試しください。',
  'admin.roles.assignments.title': '割り当て先',
  'admin.roles.assignments.add': 'ロールを割り当て',
  'admin.roles.assignments.columns.assignee': '割り当て先',
  'admin.roles.assignments.columns.type': '種類',
  'admin.roles.assignments.empty': 'このロールは誰にも割り当てられていません。',
  'admin.roles.assignments.remove_label': '{name} からロールを削除',
  'admin.roles.assignments.error': '割り当てを読み込めませんでした。もう一度お試しください。',
  'admin.roles.assignments.update_error': '割り当てを更新できませんでした。もう一度お試しください。',
  'admin.roles.permissions.title': '権限',
  'admin.roles.permissions.empty': 'このロールには権限がありません。',
  'admin.roles.permissions.error': '権限を読み込めませんでした。もう一度お試しください。',
  'admin.agents.list.title': 'エージェント',
  'admin.agents.list.columns.name': '名前',
  'admin.agents.list.columns.type': 'エージェントタイプ',
  'admin.agents.list.columns.client_id': 'クライアントID',
  'admin.agents.list.empty': 'エージェントが見つかりません。',
  'admin.agents.list.error': 'エージェントを読み込めませんでした。もう一度お試しください。',
  'admin.agents.create.title': 'エージェントを登録',
  'admin.agents.create.submit': 'エージェントを登録',
  'admin.agents.create.fields.name': '名前',
  'admin.agents.create.fields.type': 'エージェントタイプ',
  'admin.agents.create.fields.description': '説明',
  'admin.agents.create.error': 'エージェントを登録できませんでした。もう一度お試しください。',
  'admin.agents.details.overview': '概要',
  'admin.agents.details.type': 'エージェントタイプ',
  'admin.agents.details.owner': '所有者',
  'admin.agents.details.no_owner': '所有者なし',
  'admin.agents.details.groups': 'グループ',
  'admin.agents.details.no_groups': 'どのグループにも属していません。',
  'admin.agents.details.roles': 'ロール',
  'admin.agents.details.no_roles': '割り当てられたロールはありません。',
  'admin.agents.details.error': 'このエージェントを読み込めませんでした。もう一度お試しください。',
  'admin.agents.details.delete.action': 'エージェントを削除',
  'admin.agents.details.delete.confirm': '{name} を削除しますか?',
  'admin.agents.details.delete.error': 'エージェントを削除できませんでした。もう一度お試しください。',
};

const metadata: I18nMetadata = {
  localeCode: 'ja-JP',
  countryCode: 'JP',
  languageCode: 'ja',
  displayName: '日本語 (日本)',
  direction: 'ltr',
};

const ja_JP: I18nBundle = {
  metadata,
  translations,
};

export default ja_JP;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AccountLifecycleAction,
  type Application,
  APPLICATION_GRANT_TYPES,
  type ApplicationSubmission,
  getApplicationOAuthConfig,
  isApplicationSubmissionValid,
  type OAuth2Config,
  parseRedirectUris,
  type Preferences,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  ref,
  useId,
} from 'vue';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import CopyableText from '../../primitives/CopyableText/CopyableText';
import Spinner from '../../primitives/Spinner/Spinner';
import AccessStatusBadge from '../shared/AccessStatusBadge';
import AccountLifecycleButtons from '../shared/AccountLifecycleButtons';
import AdminSection from '../shared/AdminSection';
import ChipList from '../shared/ChipList';
import ClientSecretNotice from '../shared/ClientSecretNotice';
import ConfirmButton from '../shared/ConfirmButton';
import DetailList, {type DetailListItem} from '../shared/DetailList';
import Panel from '../shared/Panel';
import renderApplicationFields, {
  type ApplicationFormValues,
  type ApplicationTextField,
} from '../shared/renderApplicationFields';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * The edited fields `BaseApplicationDetails` hands `onUpdate`. Whether the client is public does not change.
 */
export type ApplicationUpdateSubmission = Omit<ApplicationSubmission, 'publicClient'>;

type BaseApplicationDetailsProps = Readonly<{
  application: Application | undefined;
  className: string;
  clientSecret: string | null;
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  isRegeneratingSecret: boolean;
  isRunningLifecycleAction: boolean;
  isUpdating: boolean;
  lifecycleActions: AccountLifecycleAction[];
  onDelete: (() => void) | undefined;
  onLifecycleAction: ((action: AccountLifecycleAction, operatorNote?: string) => void) | undefined;
  onRegenerateSecret: (() => void) | undefined;
  onSecretDismiss: (() => void) | undefined;
  onUpdate: ((application: ApplicationUpdateSubmission) => void) | undefined;
  preferences: Preferences | undefined;
}>;

/**
 * What `BaseApplicationDetails` hands its default scoped slot, so the application can be shown with any UI.
 */
export interface BaseApplicationDetailsRenderProps {
  application?: Application;
  /** The new client secret, to show once. `null` while there is none. */
  clientSecret: string | null;
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  isRegeneratingSecret: boolean;
  isRunningLifecycleAction: boolean;
  isUpdating: boolean;
  /** The account lifecycle actions offered for the application. Empty when none is allowed. */
  lifecycleActions: AccountLifecycleAction[];
  /** The application's OAuth configuration, without its client secret. Undefined when it has no OAuth client. */
  oauth?: Omit<OAuth2Config, 'clientSecret'>;
  /** Deletes the application. Undefined when deletion is not allowed, including for read-only applications. */
  onDelete?: () => void;
  /** Runs an account lifecycle action. Undefined when none is allowed. */
  onLifecycleAction?: (action: AccountLifecycleAction, operatorNote?: string) => void;
  /**
   * Gives the application a new client secret. Undefined when not allowed, for read-only applications
   * and for applications without a confidential OAuth client.
   */
  onRegenerateSecret?: () => void;
  /** Hides the new client secret once it has been copied. Undefined while there is no secret. */
  onSecretDismiss?: () => void;
  /** Saves edited fields. Undefined when editing is not allowed, including for read-only applications. */
  onUpdate?: (application: ApplicationUpdateSubmission) => void;
}

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

const toFormValues = (application: Application, oauth?: OAuth2Config): ApplicationFormValues => ({
  description: application.description ?? '',
  grantTypes: oauth?.grantTypes ?? [],
  logoUrl: application.logoUrl ?? '',
  name: application.name,
  publicClient: Boolean(oauth?.publicClient),
  redirectUris: (oauth?.redirectUris ?? []).join(', '),
  url: application.url ?? '',
});

const toSubmission = (values: ApplicationFormValues): ApplicationSubmission => ({
  description: values.description.trim() || undefined,
  grantTypes: values.grantTypes,
  logoUrl: values.logoUrl.trim() || undefined,
  name: values.name.trim(),
  publicClient: values.publicClient,
  redirectUris: parseRedirectUris(values.redirectUris),
  url: values.url.trim() || undefined,
});

/**
 * Shows an application's general fields and OAuth configuration. Holds no data of its own: pass the
 * application and handle editing, deletion and client secret regeneration, each offered only when its
 * handler is set.
 *
 * Slots: `actions`, rendered next to the application's name; `default`, a scoped slot that replaces the
 * view with custom UI and receives {@link BaseApplicationDetailsRenderProps}.
 */
const BaseApplicationDetails: Component = defineComponent({
  name: 'BaseApplicationDetails',
  props: {
    /** The application to show. */
    application: {default: undefined, type: Object as PropType<Application>},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** A client secret just generated by `onRegenerateSecret`, shown once until `onSecretDismiss` clears it. */
    clientSecret: {default: null, type: String as PropType<string | null>},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    isDeleting: {default: false, type: Boolean},
    isLoading: {default: false, type: Boolean},
    isRegeneratingSecret: {default: false, type: Boolean},
    isRunningLifecycleAction: {default: false, type: Boolean},
    isUpdating: {default: false, type: Boolean},
    /**
     * The account lifecycle actions to offer (suspend, unsuspend; applications are never locked), shown
     * only with `onLifecycleAction`. They change only runtime state, so they apply to read-only
     * applications too.
     */
    lifecycleActions: {default: () => [], type: Array as PropType<AccountLifecycleAction[]>},
    /** Deletes the application. The delete action is hidden when omitted. Also available as `@delete`. */
    onDelete: {default: undefined, type: Function as PropType<() => void>},
    /**
     * Runs an account lifecycle action. Suspending and unsuspending ask for confirmation first. Also
     * available as `@lifecycle-action`.
     */
    onLifecycleAction: {
      default: undefined,
      type: Function as PropType<(action: AccountLifecycleAction, operatorNote?: string) => void>,
    },
    /**
     * Gives the application a new client secret. The regenerate action is hidden when omitted, and for
     * public clients, which have no secret. Also available as `@regenerate-secret`.
     */
    onRegenerateSecret: {default: undefined, type: Function as PropType<() => void>},
    /** Called when the user has copied the new client secret. Also available as `@secret-dismiss`. */
    onSecretDismiss: {default: undefined, type: Function as PropType<() => void>},
    /**
     * Saves the edited general fields, redirect URIs and grant types. Editing is offered only when set.
     * Also available as `@update`.
     */
    onUpdate: {default: undefined, type: Function as PropType<(application: ApplicationUpdateSubmission) => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
  },
  setup(props: BaseApplicationDetailsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const draft: Ref<ApplicationFormValues | null> = ref(null);

    return (): VNode => {
      const {application} = props;
      const oauthConfig: OAuth2Config | undefined = getApplicationOAuthConfig(application);
      const isWritable: boolean = Boolean(application) && !application?.isReadOnly;
      const canRegenerate: boolean = isWritable && Boolean(oauthConfig) && !oauthConfig?.publicClient;

      if (slots['default']) {
        let oauth: Omit<OAuth2Config, 'clientSecret'> | undefined;

        if (oauthConfig) {
          const {clientSecret: storedSecret, ...rest}: OAuth2Config = oauthConfig;
          void storedSecret;
          oauth = rest;
        }

        const renderProps: BaseApplicationDetailsRenderProps = {
          application,
          clientSecret: props.clientSecret,
          error: props.error,
          isDeleting: props.isDeleting,
          isLoading: props.isLoading,
          isRegeneratingSecret: props.isRegeneratingSecret,
          isRunningLifecycleAction: props.isRunningLifecycleAction,
          isUpdating: props.isUpdating,
          lifecycleActions: props.onLifecycleAction && application ? props.lifecycleActions : [],
          oauth,
          onDelete: isWritable ? props.onDelete : undefined,
          onLifecycleAction: application ? props.onLifecycleAction : undefined,
          onRegenerateSecret: canRegenerate ? props.onRegenerateSecret : undefined,
          onSecretDismiss: props.clientSecret ? props.onSecretDismiss : undefined,
          onUpdate: isWritable ? props.onUpdate : undefined,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      if (props.isLoading && !application) {
        return h(
          AdminSection,
          {block: 'application-details', className: props.className},
          {
            default: (): VNode =>
              h('span', {class: cls('muted'), role: 'status'}, [
                h(Spinner, {'aria-hidden': 'true', size: 'small'}),
                t('admin.common.loading'),
              ]),
          },
        );
      }

      if (!application) {
        return h(
          AdminSection,
          {block: 'application-details', className: props.className},
          {
            default: (): VNode =>
              h(
                Alert,
                {severity: 'error'},
                {default: (): string[] => [props.error ?? t('admin.common.errors.not_found')]},
              ),
          },
        );
      }

      const notSet: string = t('admin.applications.details.not_set');
      const overview: DetailListItem[] = [
        {
          label: t('admin.applications.list.columns.client_id'),
          value: oauthConfig?.clientId ? h(CopyableText, {value: oauthConfig.clientId}) : notSet,
        },
        {label: t('admin.applications.details.type'), value: application.type ?? application.template ?? notSet},
        {label: t('admin.common.columns.organization_unit'), value: application.ouId ?? notSet},
        {label: t('admin.applications.fields.url'), value: application.url ?? notSet},
        {label: t('admin.applications.fields.logo_url'), value: application.logoUrl ?? notSet},
      ];

      if (application.status?.value) {
        overview.push({
          label: t('admin.common.columns.status'),
          value: h(AccessStatusBadge, {status: application.status.value, t}),
        });
      }

      const renderEditForm = (current: ApplicationFormValues): VNode =>
        h(
          Panel,
          {title: t('admin.applications.details.edit.action')},
          {
            default: (): VNode =>
              h(
                'form',
                {
                  class: cls('edit-form'),
                  novalidate: true,
                  onSubmit: (event: Event): void => {
                    event.preventDefault();
                    const {publicClient, ...submission}: ApplicationSubmission = toSubmission(current);
                    void publicClient;
                    props.onUpdate?.(submission);
                    draft.value = null;
                  },
                },
                [
                  ...renderApplicationFields({
                    onGrantTypesChange: (grantTypes: string[]): void => {
                      draft.value = {...current, grantTypes};
                    },
                    onInputChange: (field: ApplicationTextField, value: string): void => {
                      draft.value = {...current, [field]: value};
                    },
                    t,
                    uid,
                    values: current,
                  }),
                  h('div', {class: cls('form-actions')}, [
                    h(
                      Button,
                      {
                        disabled: props.isUpdating,
                        onClick: (): void => {
                          draft.value = null;
                        },
                        type: 'button',
                        variant: 'text',
                      },
                      {default: (): string => t('admin.common.actions.cancel')},
                    ),
                    h(
                      Button,
                      {
                        disabled: props.isUpdating || !isApplicationSubmissionValid(toSubmission(current)),
                        loading: props.isUpdating,
                        type: 'submit',
                      },
                      {default: (): string => t('admin.applications.details.edit.save')},
                    ),
                  ]),
                ],
              ),
          },
        );

      const renderOAuth = (oauth: OAuth2Config): VNode =>
        h(
          Panel,
          {title: t('admin.applications.details.oauth')},
          {
            actions: (): VNode | null =>
              props.onRegenerateSecret && canRegenerate && !props.clientSecret
                ? h(
                    ConfirmButton,
                    {
                      confirmText: t('admin.applications.details.secret.confirm', {name: application.name}),
                      isLoading: props.isRegeneratingSecret,
                      onConfirm: props.onRegenerateSecret,
                      t,
                    },
                    {default: (): string => t('admin.applications.details.secret.action')},
                  )
                : null,
            default: (): (VNode | null)[] => [
              props.clientSecret
                ? h(ClientSecretNotice, {onDismiss: props.onSecretDismiss, secret: props.clientSecret, t})
                : null,
              h(DetailList, {
                items: [
                  {
                    label: t('admin.applications.fields.grant_types'),
                    value: h(ChipList, {
                      emptyText: t('admin.applications.details.no_grant_types'),
                      items: (oauth.grantTypes ?? []).map((grantType: string) => ({
                        id: grantType,
                        label: APPLICATION_GRANT_TYPES.includes(grantType)
                          ? t(`admin.applications.grant_types.${grantType}`)
                          : grantType,
                      })),
                      label: t('admin.applications.fields.grant_types'),
                    }),
                  },
                  {
                    label: t('admin.applications.fields.redirect_uris'),
                    value: h(ChipList, {
                      emptyText: t('admin.applications.details.no_redirect_uris'),
                      items: (oauth.redirectUris ?? []).map((uri: string) => ({id: uri, label: uri})),
                      label: t('admin.applications.fields.redirect_uris'),
                    }),
                  },
                  {
                    label: t('admin.applications.details.public_client'),
                    value: oauth.publicClient
                      ? t('admin.applications.details.yes')
                      : t('admin.applications.details.no'),
                  },
                ] satisfies DetailListItem[],
              }),
            ],
          },
        );

      return h(
        AdminSection,
        {
          block: 'application-details',
          className: props.className,
          description: application.description,
          title: application.name,
        },
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            props.onLifecycleAction
              ? h(AccountLifecycleButtons, {
                  actions: props.lifecycleActions,
                  isRunning: props.isRunningLifecycleAction,
                  name: application.name,
                  onAction: props.onLifecycleAction,
                  t,
                })
              : null,
            props.onDelete && isWritable
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('admin.applications.details.delete.confirm', {name: application.name}),
                    isLoading: props.isDeleting,
                    onConfirm: props.onDelete,
                    t,
                  },
                  {default: (): string => t('admin.applications.details.delete.action')},
                )
              : null,
          ],
          default: (): (VNode | null)[] => [
            props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
            ...(draft.value
              ? [renderEditForm(draft.value)]
              : [
                  h(
                    Panel,
                    {title: t('admin.applications.details.overview')},
                    {
                      actions: (): VNode | null =>
                        props.onUpdate && isWritable
                          ? h(
                              Button,
                              {
                                onClick: (): void => {
                                  draft.value = toFormValues(application, oauthConfig);
                                },
                                size: 'small',
                                variant: 'outline',
                              },
                              {default: (): string => t('admin.applications.details.edit.action')},
                            )
                          : null,
                      default: (): VNode => h(DetailList, {items: overview}),
                    },
                  ),
                  oauthConfig ? renderOAuth(oauthConfig) : null,
                ]),
          ],
        },
      );
    };
  },
});

export default BaseApplicationDetails;

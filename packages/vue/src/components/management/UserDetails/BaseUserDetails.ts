// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {hasAdminVerificationStatus, isAdminVerifiableAttribute, resolveManagedIdentityName} from '@thunderid/browser';
import {
  type AccountLifecycleAction,
  type EntityTypeSchema,
  type ManagedUser,
  type MembershipGroup,
  type Preferences,
  type SendUserAttributeVerificationResult,
  type VerifiedAttribute,
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
import Spinner from '../../primitives/Spinner/Spinner';
import TextField from '../../primitives/TextField/TextField';
import AccessStatusBadge from '../shared/AccessStatusBadge';
import AccountLifecycleButtons from '../shared/AccountLifecycleButtons';
import AdminAvatar from '../shared/AdminAvatar';
import AdminSection from '../shared/AdminSection';
import ChipList from '../shared/ChipList';
import ConfirmButton from '../shared/ConfirmButton';
import DetailList from '../shared/DetailList';
import Panel from '../shared/Panel';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type BaseUserDetailsProps = Readonly<{
  className: string;
  error: string | null;
  groups: MembershipGroup[];
  hiddenAttributes: string[];
  isDeleting: boolean;
  isLoading: boolean;
  isRunningLifecycleAction: boolean;
  isSendingVerification: boolean;
  isUpdating: boolean;
  lifecycleActions: AccountLifecycleAction[];
  onDelete: (() => void) | undefined;
  onLifecycleAction: ((action: AccountLifecycleAction, operatorNote?: string) => void) | undefined;
  onSendVerification: ((attribute: string) => void) | undefined;
  onUpdate: ((attributes: Record<string, unknown>) => void) | undefined;
  preferences: Preferences | undefined;
  sentVerification: SendUserAttributeVerificationResult | null;
  user: ManagedUser | undefined;
  userSchema: EntityTypeSchema | undefined;
}>;

/**
 * What `BaseUserDetails` hands its default scoped slot, so the user can be shown with any UI.
 */
export interface BaseUserDetailsRenderProps {
  /** The user's attributes, without the hidden ones. */
  attributes: Record<string, unknown>;
  /** The user's display name, or an empty string while there is no user. */
  displayName: string;
  error: string | null;
  groups: MembershipGroup[];
  isDeleting: boolean;
  isLoading: boolean;
  isRunningLifecycleAction: boolean;
  isSendingVerification: boolean;
  isUpdating: boolean;
  /** The account lifecycle actions offered for the user. Empty when none is allowed. */
  lifecycleActions: AccountLifecycleAction[];
  /** Deletes the user. Undefined when deletion is not allowed, including for read-only users. */
  onDelete?: () => void;
  /**
   * Runs an account lifecycle action, with the operator's note on a suspension. Undefined when none is
   * allowed.
   */
  onLifecycleAction?: (action: AccountLifecycleAction, operatorNote?: string) => void;
  /**
   * Sends the user a link to verify the given attribute. Undefined when sending is not allowed, including
   * for read-only users.
   */
  onSendVerification?: (attribute: string) => void;
  /** Saves the given attributes. Undefined when editing is not allowed, including for read-only users. */
  onUpdate?: (attributes: Record<string, unknown>) => void;
  /** What the last sent verification link reported, such as its masked destination. */
  sentVerification: SendUserAttributeVerificationResult | null;
  user?: ManagedUser;
  /** The attributes whose verification status is known and for which a link can be sent, verified or not. */
  verifiableAttributes: string[];
  /** Visible contact attributes with a known verification status, including mobile numbers. */
  verificationStatusAttributes: string[];
  /** The user's verified attributes, keyed by attribute. Undefined when the server does not report them. */
  verifiedAttributes?: Record<string, VerifiedAttribute>;
}

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean);
};

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * Shows a user's attributes, type, organization unit and groups. Holds no data of its own: pass the
 * user and handle deletion and editing.
 *
 * Slots: `actions`, rendered next to the user's name; `default`, a scoped slot that replaces the view
 * with custom UI and receives {@link BaseUserDetailsRenderProps}.
 */
const BaseUserDetails: Component = defineComponent({
  name: 'BaseUserDetails',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    /** The groups the user belongs to. */
    groups: {default: () => [], type: Array as PropType<MembershipGroup[]>},
    /** Attribute names that are never shown, such as credentials. */
    hiddenAttributes: {default: () => ['password'], type: Array as PropType<string[]>},
    isDeleting: {default: false, type: Boolean},
    isLoading: {default: false, type: Boolean},
    isRunningLifecycleAction: {default: false, type: Boolean},
    isSendingVerification: {default: false, type: Boolean},
    isUpdating: {default: false, type: Boolean},
    /**
     * The account lifecycle actions to offer (suspend, unsuspend, unlock), shown only with
     * `onLifecycleAction`. They change only runtime state, so they apply to read-only users too.
     */
    lifecycleActions: {default: () => [], type: Array as PropType<AccountLifecycleAction[]>},
    /** Deletes the user. The delete action is hidden when omitted. Also available as `@delete`. */
    onDelete: {default: undefined, type: Function as PropType<() => void>},
    /**
     * Runs an account lifecycle action. Suspending and unsuspending ask for confirmation first, and a
     * suspension takes an optional operator note. Also available as `@lifecycle-action`.
     */
    onLifecycleAction: {
      default: undefined,
      type: Function as PropType<(action: AccountLifecycleAction, operatorNote?: string) => void>,
    },
    /**
     * Sends the user a link to verify an attribute. The send action is shown, for an unverified email of
     * a user that is not read-only, only when this is given. Also available as `@send-verification`.
     */
    onSendVerification: {default: undefined, type: Function as PropType<(attribute: string) => void>},
    /**
     * Saves edited attributes. Text attributes become editable only when set. Receives every attribute,
     * edited or not. Also available as `@update`.
     */
    onUpdate: {default: undefined, type: Function as PropType<(attributes: Record<string, unknown>) => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** What the last sent verification link reported. Its masked destination is shown in a success message. */
    sentVerification: {default: null, type: Object as PropType<SendUserAttributeVerificationResult | null>},
    /** The user to show. */
    user: {default: undefined, type: Object as PropType<ManagedUser>},
    /** The user type schema for identifying contact fields. */
    userSchema: {default: undefined, type: Object as PropType<EntityTypeSchema>},
  },
  setup(props: BaseUserDetailsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const draft: Ref<Record<string, string> | null> = ref(null);

    return (): VNode => {
      const {user} = props;
      const visibleAttributeNames: string[] = Object.keys(user?.attributes ?? {}).filter(
        (name: string) => !props.hiddenAttributes.includes(name),
      );
      const verifiableAttributes: string[] = visibleAttributeNames.filter((name: string) =>
        isAdminVerifiableAttribute(user, name, props.userSchema),
      );
      const verificationStatusAttributes: string[] = visibleAttributeNames.filter((name: string) =>
        hasAdminVerificationStatus(user, name, props.userSchema),
      );

      if (slots['default']) {
        const isWritable: boolean = Boolean(user) && !user?.isReadOnly;
        const renderProps: BaseUserDetailsRenderProps = {
          attributes: Object.fromEntries(
            Object.entries(user?.attributes ?? {}).filter(
              ([name]: [string, unknown]) => !props.hiddenAttributes.includes(name),
            ),
          ),
          displayName: user ? resolveManagedIdentityName(user) : '',
          error: props.error,
          groups: props.groups,
          isDeleting: props.isDeleting,
          isLoading: props.isLoading,
          isRunningLifecycleAction: props.isRunningLifecycleAction,
          isSendingVerification: props.isSendingVerification,
          isUpdating: props.isUpdating,
          lifecycleActions: props.onLifecycleAction && user ? props.lifecycleActions : [],
          onDelete: isWritable ? props.onDelete : undefined,
          onLifecycleAction: user ? props.onLifecycleAction : undefined,
          onSendVerification:
            isWritable && !props.isUpdating && props.onSendVerification
              ? (name: string): void => {
                  if (verifiableAttributes.includes(name) && !user?.verifiedAttributes?.[name]) {
                    props.onSendVerification?.(name);
                  }
                }
              : undefined,
          onUpdate: isWritable ? props.onUpdate : undefined,
          sentVerification: props.sentVerification,
          user,
          verifiableAttributes,
          verificationStatusAttributes,
          verifiedAttributes: user?.verifiedAttributes,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      if (props.isLoading && !user) {
        return h(
          AdminSection,
          {block: 'user-details', className: props.className},
          {
            default: (): VNode =>
              h('span', {class: cls('muted'), role: 'status'}, [
                h(Spinner, {'aria-hidden': 'true', size: 'small'}),
                t('admin.common.loading'),
              ]),
          },
        );
      }

      if (!user) {
        return h(
          AdminSection,
          {block: 'user-details', className: props.className},
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

      const displayName: string = resolveManagedIdentityName(user);
      const attributes: [string, unknown][] = Object.entries(user.attributes ?? {}).filter(
        ([name]: [string, unknown]) => !props.hiddenAttributes.includes(name),
      );
      const editableAttributes: [string, string][] = attributes.filter(
        (entry: [string, unknown]): entry is [string, string] => typeof entry[1] === 'string',
      );
      const canEdit: boolean = Boolean(props.onUpdate) && !user.isReadOnly && editableAttributes.length > 0;

      const renderVerificationStatus = (name: string): VNode => {
        const isVerified: boolean = user.verifiedAttributes?.[name] !== undefined;

        return h(
          'span',
          {class: [cls('status-chip'), isVerified ? cls('status-chip--success') : '']},
          isVerified
            ? t('admin.users.details.verification.status.verified')
            : t('admin.users.details.verification.status.unverified'),
        );
      };

      const renderAttributeValue = (name: string, value: unknown): VNode | string => {
        if (!verificationStatusAttributes.includes(name)) {
          return stringify(value);
        }

        const canSend =
          props.onSendVerification &&
          !user.isReadOnly &&
          verifiableAttributes.includes(name) &&
          user.verifiedAttributes?.[name] === undefined;
        return h('span', {class: [cls('row'), cls('verification-row')]}, [
          h('span', [h('span', stringify(value)), renderVerificationStatus(name)]),
          canSend
            ? h(
                Button,
                {
                  disabled: props.isSendingVerification || props.isUpdating,
                  loading: props.isSendingVerification,
                  onClick: (): void => props.onSendVerification?.(name),
                  size: 'small',
                  variant: 'outline',
                },
                {default: (): string => t('admin.users.details.verification.send')},
              )
            : null,
        ]);
      };

      const renderAttributes = (): VNode => {
        if (draft.value) {
          const current: Record<string, string> = draft.value;

          return h(
            'form',
            {
              class: cls('edit-form'),
              onSubmit: (event: Event): void => {
                event.preventDefault();
                props.onUpdate?.({...(user.attributes ?? {}), ...current});
                draft.value = null;
              },
            },
            [
              ...Object.keys(current).map((name: string) =>
                h(TextField, {
                  key: name,
                  label: name,
                  modelValue: current[name],
                  name: `${uid}-${name}`,
                  'onUpdate:modelValue': (value: string): void => {
                    draft.value = {...draft.value, [name]: value};
                  },
                }),
              ),
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
                  {disabled: props.isUpdating, loading: props.isUpdating, type: 'submit'},
                  {default: (): string => t('admin.users.details.edit.save')},
                ),
              ]),
            ],
          );
        }

        if (attributes.length > 0) {
          return h(DetailList, {
            items: attributes.map(([name, value]: [string, unknown]) => ({
              label: name,
              value: renderAttributeValue(name, value),
            })),
          });
        }

        return h('span', {class: cls('muted')}, t('admin.users.details.no_attributes'));
      };

      return h(
        AdminSection,
        {
          block: 'user-details',
          className: props.className,
          description: t('admin.users.details.subtitle', {type: user.type}),
          title: displayName,
        },
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            props.onLifecycleAction
              ? h(AccountLifecycleButtons, {
                  actions: props.lifecycleActions,
                  collectsOperatorNote: true,
                  isRunning: props.isRunningLifecycleAction,
                  name: displayName,
                  onAction: props.onLifecycleAction,
                  t,
                })
              : null,
            props.onDelete && !user.isReadOnly
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('admin.users.details.delete.confirm', {name: displayName}),
                    isLoading: props.isDeleting,
                    onConfirm: props.onDelete,
                    t,
                  },
                  {default: (): string => t('admin.users.details.delete.action')},
                )
              : null,
          ],
          default: (): (VNode | null)[] => [
            props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
            props.sentVerification && !props.error
              ? h(
                  Alert,
                  {severity: props.sentVerification.emailSent === false ? 'error' : 'success'},
                  {
                    default: (): string[] => [
                      props.sentVerification?.emailSent === false
                        ? t('admin.users.details.verification.error')
                        : props.sentVerification?.maskedDestination
                          ? t('admin.users.details.verification.sent', {
                              destination: props.sentVerification.maskedDestination,
                            })
                          : t('admin.users.details.verification.sent_generic'),
                    ],
                  },
                )
              : null,
            h('div', {class: cls('row')}, [
              h(AdminAvatar, {name: displayName, size: 48}),
              h('span', {class: cls('muted')}, user.ouHandle ?? user.ouId),
              h(AccessStatusBadge, {status: user.status?.value, t}),
            ]),
            h(
              Panel,
              {title: t('admin.users.details.attributes')},
              {
                actions: (): VNode | null =>
                  canEdit && !draft.value
                    ? h(
                        Button,
                        {
                          onClick: (): void => {
                            draft.value = Object.fromEntries(editableAttributes);
                          },
                          size: 'small',
                          variant: 'outline',
                        },
                        {default: (): string => t('admin.users.details.edit.action')},
                      )
                    : null,
                default: renderAttributes,
              },
            ),
            h(
              Panel,
              {title: t('admin.users.details.groups')},
              {
                default: (): VNode =>
                  h(ChipList, {
                    emptyText: t('admin.users.details.no_groups'),
                    items: props.groups.map((group: MembershipGroup) => ({id: group.id, label: group.name})),
                    label: t('admin.users.details.groups'),
                  }),
              },
            ),
          ],
        },
      );
    };
  },
});

export default BaseUserDetails;

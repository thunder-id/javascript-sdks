// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type Agent,
  type OAuth2Config,
  PERSONAL_AGENT_GRANT_TYPE_LABEL_KEYS,
  PERSONAL_AGENT_GRANT_TYPES,
  type PersonalAgentFormValues,
  type Preferences,
  type SuspensionAppliedBy,
  type UpdateMeAgentRequest,
  getAgentName,
  getMeAgentSuspensionAction,
  getPersonalAgentOAuthConfig,
  isPersonalAgentFormValid,
  toPersonalAgentFormValues,
  toUpdateMeAgentRequest,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  type VNodeChild,
  defineComponent,
  h,
  ref,
  watch,
} from 'vue';
import AccessStatusBadge from '../../management/shared/AccessStatusBadge';
import AdminSection from '../../management/shared/AdminSection';
import ConfirmButton from '../../management/shared/ConfirmButton';
import DetailList, {type DetailListItem} from '../../management/shared/DetailList';
import Panel from '../../management/shared/Panel';
import renderEditPanel from '../../management/shared/renderEditPanel';
import useAdminTranslation, {type AdminTranslate} from '../../management/shared/useAdminTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Checkbox from '../../primitives/Checkbox/Checkbox';
import CopyableText from '../../primitives/CopyableText/CopyableText';
import Spinner from '../../primitives/Spinner/Spinner';
import TextField from '../../primitives/TextField/TextField';

/**
 * What `BasePersonalAgentDetails` hands its default scoped slot, so the agent can be shown with any UI. An action
 * is undefined when the app has not turned it on, or when it does not apply to the agent.
 */
export interface BasePersonalAgentDetailsRenderProps {
  agent?: Agent;
  error: string | null;
  isChangingSuspension: boolean;
  isDeleting: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  /** The agent's OAuth configuration. Undefined when it has no OAuth client. */
  oauth?: OAuth2Config;
  /** Deletes the agent. The built-in UI asks for confirmation first, and a custom render must too. */
  onDelete?: () => void;
  /** Places the owner's suspension on the agent. Offered unless the owner already holds it suspended. */
  onSuspend?: () => void;
  /** Lifts the owner's suspension of the agent. Offered only while the owner holds it suspended. */
  onUnsuspend?: () => void;
  /** Replaces the editable part of the agent. Returns a promise that resolves to `false` when the update fails. */
  onUpdate?: (changes: UpdateMeAgentRequest) => void | Promise<boolean>;
}

type BasePersonalAgentDetailsProps = Readonly<{
  agent: Agent | undefined;
  className: string;
  error: string | null;
  isChangingSuspension: boolean;
  isDeleting: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  onDelete: (() => void) | undefined;
  onSuspend: (() => void) | undefined;
  onUnsuspend: (() => void) | undefined;
  onUpdate: ((changes: UpdateMeAgentRequest) => void | Promise<boolean>) | undefined;
  preferences: Preferences | undefined;
}>;

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

const stringify = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }

  return typeof value === 'object' ? JSON.stringify(value) : String(value as string | number | boolean);
};

/**
 * Shows one of the signed-in user's personal agents with the actions its owner can take. Holds no data of its own:
 * pass the agent and handle editing, deletion and the owner's suspension, each offered only when its handler is set.
 *
 * Slots: `actions`, rendered next to the agent's name; `default`, a scoped slot that replaces the view with custom
 * UI and receives {@link BasePersonalAgentDetailsRenderProps}.
 */
const BasePersonalAgentDetails: Component = defineComponent({
  name: 'BasePersonalAgentDetails',
  props: {
    /** The agent to show. */
    agent: {default: undefined, type: Object as PropType<Agent>},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    isChangingSuspension: {default: false, type: Boolean},
    isDeleting: {default: false, type: Boolean},
    isLoading: {default: false, type: Boolean},
    isUpdating: {default: false, type: Boolean},
    /** Deletes the agent. Hidden when omitted, and for a declarative agent. Also available as `@delete`. */
    onDelete: {default: undefined, type: Function as PropType<() => void>},
    /** Places the owner's suspension on the agent. Hidden when omitted. Also available as `@suspend`. */
    onSuspend: {default: undefined, type: Function as PropType<() => void>},
    /**
     * Lifts the owner's suspension of the agent. Shown only while the owner holds the agent suspended. Also
     * available as `@unsuspend`.
     */
    onUnsuspend: {default: undefined, type: Function as PropType<() => void>},
    /**
     * Replaces the editable part of the agent. Hidden when omitted, and for a declarative agent. Also available
     * as `@update`. When it returns a promise, the form stays open until the promise settles, and stays open with
     * the changes if it resolves to `false` or rejects.
     */
    onUpdate: {
      default: undefined,
      type: Function as PropType<(changes: UpdateMeAgentRequest) => void | Promise<boolean>>,
    },
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
  },
  setup(props: BasePersonalAgentDetailsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const draft: Ref<PersonalAgentFormValues | null> = ref(null);

    // Switching the agent closes the form, so one agent's values are never saved onto another.
    watch(
      () => props.agent?.id,
      () => {
        draft.value = null;
      },
    );

    const grantTypeLabel = (grantType: string): string =>
      PERSONAL_AGENT_GRANT_TYPE_LABEL_KEYS[grantType] ? t(PERSONAL_AGENT_GRANT_TYPE_LABEL_KEYS[grantType]) : grantType;

    const editDraft = (changes: Partial<PersonalAgentFormValues>): void => {
      if (draft.value) {
        draft.value = {...draft.value, ...changes};
      }
    };

    const renderForm = (agent: Agent, values: PersonalAgentFormValues): VNode =>
      renderEditPanel({
        canSave: isPersonalAgentFormValid(values),
        fields: [
          h(TextField, {
            autoComplete: 'off',
            label: t('user.agents.fields.name'),
            modelValue: values.name,
            name: 'name',
            'onUpdate:modelValue': (value: string): void => editDraft({name: value}),
            required: true,
          }),
          ...Object.keys(values.attributes).map((attribute: string) =>
            h(TextField, {
              autoComplete: 'off',
              key: attribute,
              label: attribute,
              modelValue: values.attributes[attribute],
              name: `attribute-${attribute}`,
              'onUpdate:modelValue': (value: string): void =>
                editDraft({attributes: {...values.attributes, [attribute]: value}}),
            }),
          ),
          h(TextField, {
            autoComplete: 'off',
            label: t('user.agents.fields.description'),
            modelValue: values.description,
            name: 'description',
            'onUpdate:modelValue': (value: string): void => editDraft({description: value}),
          }),
          h(TextField, {
            autoComplete: 'off',
            helperText: t('user.agents.fields.redirect_uris_hint'),
            label: t('user.agents.details.redirect_uris'),
            modelValue: values.redirectUris,
            name: 'redirectUris',
            'onUpdate:modelValue': (value: string): void => editDraft({redirectUris: value}),
          }),
          h('fieldset', {class: cls('row'), style: {border: 0, flexWrap: 'wrap', margin: 0, padding: 0}}, [
            h('legend', {class: cls('muted')}, t('user.agents.details.grant_types')),
            ...PERSONAL_AGENT_GRANT_TYPES.map((grantType: string) =>
              h(Checkbox, {
                key: grantType,
                label: grantTypeLabel(grantType),
                modelValue: values.grantTypes.includes(grantType),
                name: `grantType-${grantType}`,
                'onUpdate:modelValue': (checked: boolean): void =>
                  editDraft({
                    grantTypes: checked
                      ? [...values.grantTypes, grantType]
                      : values.grantTypes.filter((value: string) => value !== grantType),
                  }),
              }),
            ),
          ]),
        ],
        isSaving: props.isUpdating,
        onCancel: (): void => {
          draft.value = null;
        },
        onSave: (): void => {
          const savedId: string = agent.id;
          const closeForm = (): void => {
            if (props.agent?.id === savedId) {
              draft.value = null;
            }
          };
          const result: void | Promise<boolean> = props.onUpdate?.(toUpdateMeAgentRequest(agent, values));

          if (!result) {
            closeForm();
            return;
          }

          // Keeps the changes until the update succeeds, so a failed save can be corrected and retried.
          result.then(
            (saved: boolean): void => {
              if (saved !== false) {
                closeForm();
              }
            },
            (): void => undefined,
          );
        },
        saveLabel: t('user.agents.edit.save'),
        t,
        title: t('user.agents.edit.title'),
      });

    return (): VNode => {
      const {agent} = props;
      const isWritable: boolean = Boolean(agent) && !agent?.isReadOnly;
      const suspensionAction: 'suspend' | 'unsuspend' = getMeAgentSuspensionAction(agent?.status);
      const canSuspend: boolean = Boolean(agent) && suspensionAction === 'suspend';
      const canUnsuspend: boolean = Boolean(agent) && suspensionAction === 'unsuspend';

      if (slots['default']) {
        const renderProps: BasePersonalAgentDetailsRenderProps = {
          agent,
          error: props.error,
          isChangingSuspension: props.isChangingSuspension,
          isDeleting: props.isDeleting,
          isLoading: props.isLoading,
          isUpdating: props.isUpdating,
          oauth: agent ? getPersonalAgentOAuthConfig(agent) : undefined,
          onDelete: isWritable ? props.onDelete : undefined,
          onSuspend: canSuspend ? props.onSuspend : undefined,
          onUnsuspend: canUnsuspend ? props.onUnsuspend : undefined,
          onUpdate: isWritable ? props.onUpdate : undefined,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      if (props.isLoading && !agent) {
        return h(
          AdminSection,
          {block: 'personal-agent-details', className: props.className},
          {
            default: (): VNode =>
              h('span', {class: cls('muted'), role: 'status'}, [
                h(Spinner, {'aria-hidden': 'true', size: 'small'}),
                t('admin.common.loading'),
              ]),
          },
        );
      }

      if (!agent) {
        return h(
          AdminSection,
          {block: 'personal-agent-details', className: props.className},
          {
            default: (): VNode =>
              h(
                Alert,
                {role: 'alert', severity: 'error'},
                {default: (): string[] => [props.error ?? t('admin.common.errors.not_found')]},
              ),
          },
        );
      }

      const name: string = getAgentName(agent);
      const oauth: OAuth2Config | undefined = getPersonalAgentOAuthConfig(agent);
      const appliedBy: SuspensionAppliedBy[] =
        agent.status?.value === 'SUSPENDED' ? (agent.status.details?.appliedBy ?? []) : [];
      const none = (): VNode => h('span', {class: cls('muted')}, t('user.agents.details.none'));
      const overview: DetailListItem[] = [
        {
          label: t('user.agents.list.columns.status'),
          value: h(AccessStatusBadge, {status: agent.status?.value, t}),
        },
        {
          label: t('user.agents.details.client_id'),
          value: agent.clientId ? h(CopyableText, {value: agent.clientId}) : none(),
        },
        {
          label: t('user.agents.details.grant_types'),
          value: oauth?.grantTypes?.length ? oauth.grantTypes.map(grantTypeLabel).join(', ') : none(),
        },
        {
          label: t('user.agents.details.redirect_uris'),
          value: oauth?.redirectUris?.length
            ? oauth.redirectUris.map((uri: string) => h('div', {key: uri}, uri))
            : none(),
        },
      ];
      const attributes: [string, unknown][] = Object.entries(agent.attributes ?? {});

      const content = (): VNodeChild[] =>
        draft.value
          ? [renderForm(agent, draft.value)]
          : [
              h(
                Panel,
                {title: t('user.agents.details.overview')},
                {
                  actions: (): VNode | null =>
                    props.onUpdate && isWritable
                      ? h(
                          Button,
                          {
                            onClick: (): void => {
                              draft.value = toPersonalAgentFormValues(agent);
                            },
                            size: 'small',
                            variant: 'outline',
                          },
                          {default: (): string => t('user.agents.edit.action')},
                        )
                      : null,
                  default: (): VNode => h(DetailList, {items: overview}),
                },
              ),
              h(
                Panel,
                {title: t('user.agents.details.attributes')},
                {
                  default: (): VNode =>
                    attributes.length > 0
                      ? h(DetailList, {
                          items: attributes.map(([attribute, value]: [string, unknown]) => ({
                            label: attribute,
                            value: stringify(value),
                          })),
                        })
                      : none(),
                },
              ),
            ];

      return h(
        AdminSection,
        {block: 'personal-agent-details', className: props.className, description: agent.description, title: name},
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            props.onUnsuspend && canUnsuspend
              ? h(
                  Button,
                  {
                    disabled: props.isChangingSuspension,
                    loading: props.isChangingSuspension,
                    onClick: props.onUnsuspend,
                    variant: 'outline',
                  },
                  {default: (): string => t('user.agents.unsuspend.action')},
                )
              : null,
            props.onSuspend && canSuspend
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('user.agents.suspend.confirm', {name}),
                    isLoading: props.isChangingSuspension,
                    onConfirm: props.onSuspend,
                    t,
                  },
                  {default: (): string => t('user.agents.suspend.action')},
                )
              : null,
            props.onDelete && isWritable
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('user.agents.delete.confirm', {name}),
                    isLoading: props.isDeleting,
                    onConfirm: props.onDelete,
                    t,
                  },
                  {default: (): string => t('user.agents.delete.action')},
                )
              : null,
          ],
          default: (): VNodeChild[] => [
            props.error
              ? h(Alert, {role: 'alert', severity: 'error'}, {default: (): string[] => [props.error!]})
              : null,
            ...appliedBy.map((party: SuspensionAppliedBy) =>
              h(
                Alert,
                {key: party, role: 'status', severity: party === 'owner' ? 'info' : 'warning'},
                {default: (): string[] => [t(`user.agents.suspension.${party}`)]},
              ),
            ),
            ...content(),
          ],
        },
      );
    };
  },
});

export default BasePersonalAgentDetails;

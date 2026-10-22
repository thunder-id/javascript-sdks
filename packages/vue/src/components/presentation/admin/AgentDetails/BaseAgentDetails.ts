// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type Agent, type MembershipGroup, type Preferences, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import Alert from '../../../primitives/Alert/Alert';
import CopyableText from '../../../primitives/CopyableText/CopyableText';
import Spinner from '../../../primitives/Spinner/Spinner';
import AdminSection from '../shared/AdminSection';
import ChipList from '../shared/ChipList';
import ConfirmButton from '../shared/ConfirmButton';
import DetailList, {type DetailListItem} from '../shared/DetailList';
import Panel from '../shared/Panel';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type BaseAgentDetailsProps = Readonly<{
  agent: Agent | undefined;
  className: string;
  error: string | null;
  groups: MembershipGroup[];
  isDeleting: boolean;
  isLoading: boolean;
  onDelete: (() => void) | undefined;
  preferences: Preferences | undefined;
  roles: string[];
}>;

/**
 * What `BaseAgentDetails` hands its default scoped slot, so the agent can be shown with any UI.
 */
export interface BaseAgentDetailsRenderProps {
  agent?: Agent;
  error: string | null;
  groups: MembershipGroup[];
  isDeleting: boolean;
  isLoading: boolean;
  /** Deletes the agent. Undefined when deletion is not allowed, including for read-only agents. */
  onDelete?: () => void;
  roles: string[];
}

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * Shows an agent's type, owner, organization unit, client identifier, groups and roles. Holds no data
 * of its own: pass the agent and handle deletion.
 *
 * Slots: `actions`, rendered next to the agent's name; `default`, a scoped slot that replaces the view
 * with custom UI and receives {@link BaseAgentDetailsRenderProps}.
 */
const BaseAgentDetails: Component = defineComponent({
  name: 'BaseAgentDetails',
  props: {
    /** The agent to show. */
    agent: {default: undefined, type: Object as PropType<Agent>},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    /** The groups the agent belongs to. */
    groups: {default: () => [], type: Array as PropType<MembershipGroup[]>},
    isDeleting: {default: false, type: Boolean},
    isLoading: {default: false, type: Boolean},
    /** Deletes the agent. The delete action is hidden when omitted. Also available as `@delete`. */
    onDelete: {default: undefined, type: Function as PropType<() => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Names of the roles assigned to the agent, directly or through its groups. */
    roles: {default: () => [], type: Array as PropType<string[]>},
  },
  setup(props: BaseAgentDetailsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);

    return (): VNode => {
      const {agent} = props;

      if (slots['default']) {
        const renderProps: BaseAgentDetailsRenderProps = {
          agent,
          error: props.error,
          groups: props.groups,
          isDeleting: props.isDeleting,
          isLoading: props.isLoading,
          onDelete: agent && !agent.isReadOnly ? props.onDelete : undefined,
          roles: props.roles,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      if (props.isLoading && !agent) {
        return h(
          AdminSection,
          {block: 'agent-details', className: props.className},
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
          {block: 'agent-details', className: props.className},
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

      const details: DetailListItem[] = [
        {label: t('admin.agents.details.type'), value: agent.type},
        {label: t('admin.agents.details.owner'), value: agent.owner ?? t('admin.agents.details.no_owner')},
        {label: t('admin.common.columns.organization_unit'), value: agent.ouHandle ?? agent.ouId},
      ];

      if (agent.clientId) {
        details.push({
          label: t('admin.agents.list.columns.client_id'),
          value: h(CopyableText, {value: agent.clientId}),
        });
      }

      return h(
        AdminSection,
        {block: 'agent-details', className: props.className, description: agent.description, title: agent.name},
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            props.onDelete && !agent.isReadOnly
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('admin.agents.details.delete.confirm', {name: agent.name}),
                    isLoading: props.isDeleting,
                    onConfirm: props.onDelete,
                    t,
                  },
                  {default: (): string => t('admin.agents.details.delete.action')},
                )
              : null,
          ],
          default: (): (VNode | null)[] => [
            props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
            h(
              Panel,
              {title: t('admin.agents.details.overview')},
              {default: (): VNode => h(DetailList, {items: details})},
            ),
            h(
              Panel,
              {title: t('admin.agents.details.groups')},
              {
                default: (): VNode =>
                  h(ChipList, {
                    emptyText: t('admin.agents.details.no_groups'),
                    items: props.groups.map((group: MembershipGroup) => ({id: group.id, label: group.name})),
                    label: t('admin.agents.details.groups'),
                  }),
              },
            ),
            h(
              Panel,
              {title: t('admin.agents.details.roles')},
              {
                default: (): VNode =>
                  h(ChipList, {
                    emptyText: t('admin.agents.details.no_roles'),
                    items: props.roles.map((role: string) => ({id: role, label: role})),
                    label: t('admin.agents.details.roles'),
                  }),
              },
            ),
          ],
        },
      );
    };
  },
});

export default BaseAgentDetails;

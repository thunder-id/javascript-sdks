// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type BasicAgent, type Preferences, getAgentName} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, type VNodeChild, defineComponent, h} from 'vue';
import AccessStatusBadge from '../../management/shared/AccessStatusBadge';
import AdminSection from '../../management/shared/AdminSection';
import ConfirmButton from '../../management/shared/ConfirmButton';
import {type AdminListRenderProps, adminListProps} from '../../management/shared/createAdminList';
import useAdminTranslation, {type AdminTranslate} from '../../management/shared/useAdminTranslation';
import Alert from '../../primitives/Alert/Alert';
import DataTable, {type DataTableColumn} from '../../primitives/DataTable/DataTable';

/**
 * What `BasePersonalAgentList` hands its default scoped slot. `agents` and `rows` are the same array.
 */
export type BasePersonalAgentListRenderProps = AdminListRenderProps<BasicAgent> & {
  /** Why the last suspend-all request failed, already translated. */
  actionError: string | null;
  agents: BasicAgent[];
  isSuspendingAll: boolean;
  /**
   * Suspends every personal agent of the signed-in user. Undefined when not allowed, or when there are none.
   * The built-in UI asks for confirmation first, and a custom render must too.
   */
  onSuspendAll?: () => void;
  /** How many agents the last suspend-all request suspended, until the list is shown again. */
  suspendedCount: number | null;
};

type BasePersonalAgentListProps = Readonly<{
  actionError: string | null;
  agents: BasicAgent[];
  className: string;
  description: string | undefined;
  error: string | null;
  isLoading: boolean;
  isSuspendingAll: boolean;
  limit: number;
  offset: number;
  onPageChange: ((offset: number) => void) | undefined;
  onSelect: ((agent: BasicAgent) => void) | undefined;
  onSuspendAll: (() => void) | undefined;
  preferences: Preferences | undefined;
  selectedAgentId: string | undefined;
  suspendedCount: number | null;
  title: string | undefined;
  totalResults: number | undefined;
}>;

/**
 * Lists the signed-in user's personal agents with their client and status. Holds no data of its own: pass the
 * page of agents and handle selection, pagination and suspending them all.
 *
 * Props: `agents` (required), `selectedAgentId`, `isLoading`, `error`, `limit`, `offset`, `totalResults`,
 * `onPageChange`, `onSelect` (`@select`), `onSuspendAll` (`@suspend-all`), `isSuspendingAll`, `suspendedCount`,
 * `actionError`, `title`, `description`, `className`, `preferences`. Slots: `actions`, rendered next to the title;
 * `default`, a scoped slot that replaces the table with custom UI and receives
 * {@link BasePersonalAgentListRenderProps}.
 */
const BasePersonalAgentList: Component = defineComponent({
  name: 'BasePersonalAgentList',
  props: {
    ...adminListProps,
    /** Why the last suspend-all request failed, already translated. */
    actionError: {default: null, type: String as PropType<string | null>},
    /** The page of agents to show. */
    agents: {required: true, type: Array as PropType<BasicAgent[]>},
    isSuspendingAll: {default: false, type: Boolean},
    /** Called when an agent is chosen. Rows are selectable only when set. Also available as `@select`. */
    onSelect: {default: undefined, type: Function as PropType<(agent: BasicAgent) => void>},
    /**
     * Suspends every personal agent of the signed-in user. The action is hidden when omitted. Also available as
     * `@suspend-all`.
     */
    onSuspendAll: {default: undefined, type: Function as PropType<() => void>},
    selectedAgentId: {default: undefined, type: String},
    /** How many agents the last suspend-all request suspended. */
    suspendedCount: {default: null, type: Number as PropType<number | null>},
  },
  setup(props: BasePersonalAgentListProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);

    return (): VNode => {
      const {agents} = props;
      const canSuspendAll: boolean = Boolean(props.onSuspendAll) && agents.length > 0;
      const title: string = props.title ?? t('user.agents.title');
      const columns: DataTableColumn<BasicAgent>[] = [
        {
          header: t('user.agents.list.columns.name'),
          id: 'name',
          render: (agent: BasicAgent): VNodeChild => getAgentName(agent),
        },
        {
          header: t('user.agents.details.client_id'),
          id: 'clientId',
          render: (agent: BasicAgent): VNodeChild => h('code', {}, agent.clientId ?? ''),
        },
        {
          header: t('user.agents.list.columns.status'),
          id: 'status',
          render: (agent: BasicAgent): VNodeChild => h(AccessStatusBadge, {status: agent.status?.value, t}),
        },
      ];

      if (slots['default']) {
        const renderProps: BasePersonalAgentListRenderProps = {
          actionError: props.actionError,
          agents,
          columns,
          error: props.error,
          isLoading: props.isLoading,
          isSuspendingAll: props.isSuspendingAll,
          limit: props.limit,
          offset: props.offset,
          onPageChange: props.onPageChange,
          onSelect: props.onSelect,
          onSuspendAll: canSuspendAll ? props.onSuspendAll : undefined,
          rows: agents,
          selectedRowId: props.selectedAgentId,
          suspendedCount: props.suspendedCount,
          totalResults: props.totalResults ?? agents.length,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      return h(
        AdminSection,
        {
          block: 'personal-agent-list',
          className: props.className,
          description: props.description ?? t('user.agents.description'),
          title,
        },
        {
          actions: (): (VNode | VNode[] | null | undefined)[] => [
            slots['actions']?.(),
            canSuspendAll
              ? h(
                  ConfirmButton,
                  {
                    confirmText: t('user.agents.suspend_all.confirm'),
                    isLoading: props.isSuspendingAll,
                    onConfirm: props.onSuspendAll,
                    t,
                  },
                  {default: (): string => t('user.agents.suspend_all.action')},
                )
              : null,
          ],
          default: (): (VNode | null)[] => [
            props.actionError
              ? h(Alert, {role: 'alert', severity: 'error'}, {default: (): string[] => [props.actionError!]})
              : null,
            props.suspendedCount !== null
              ? h(
                  Alert,
                  {role: 'status', severity: 'success'},
                  {default: (): string[] => [t('user.agents.suspend_all.done', {count: props.suspendedCount!})]},
                )
              : null,
            h(DataTable, {
              caption: props.title?.length ? props.title : t('user.agents.title'),
              columns,
              emptyText: t('user.agents.list.empty'),
              error: props.error,
              getRowId: (agent: BasicAgent): string => agent.id,
              isLoading: props.isLoading,
              onRowClick: props.onSelect,
              pagination: props.onPageChange
                ? {
                    limit: props.limit,
                    offset: props.offset,
                    onChange: props.onPageChange,
                    total: props.totalResults ?? agents.length,
                  }
                : undefined,
              rows: agents,
              selectedRowId: props.selectedAgentId,
              t,
            }),
          ],
        },
      );
    };
  },
});

export default BasePersonalAgentList;

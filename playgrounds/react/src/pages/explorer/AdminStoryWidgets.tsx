// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AdminSearchValue,
  BaseGroupMembers,
  type BaseGroupMembersProps,
  BaseRoleAssignments,
  type BaseRoleAssignmentsProps,
  DataTable,
  type GroupMember,
  type RoleAssignment,
  type RoleAssigneeType,
  type RoleAssignmentInput,
  Typography,
} from '@thunderid/react';
import {ReactElement, ReactNode, useState} from 'react';
import {
  CANDIDATES,
  SAMPLE_ASSIGNMENTS,
  SAMPLE_MEMBERS,
  SESSION_COLUMNS,
  SESSION_ROWS,
  SessionRow,
} from './adminSamples';
import {bool, num, str} from './storyHelpers';
import {Narrow} from './StoryWidgets';
import type {Action, Args} from './types';

export const RequiresId = ({name}: {name: string}): ReactElement => (
  <Narrow width={420}>
    <Typography variant="body2" color="textSecondary">
      Set the <code>{name}</code> control to an ID from your server to render the connected component. Copy one from the
      list story (live) or the Hooks page.
    </Typography>
  </Narrow>
);

/* Stateful wrappers: Base components are controlled, so paging, selection, and edits live here. */

export interface PagedProps<T> {
  args: Args;
  getId: (row: T) => string;
  render: (state: {
    offset: number;
    onPageChange: (offset: number) => void;
    onSelect?: (row: T) => void;
    rows: T[];
    selectedId?: string;
    total: number;
  }) => ReactNode;
  rows: T[];
  action: Action;
}

export const Paged = <T,>({action, args, getId, render, rows}: PagedProps<T>): ReactElement => {
  const [offset, setOffset] = useState<number>(0);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const all: T[] = bool(args, 'empty') ? [] : rows;
  const limit: number = Math.max(1, num(args, 'limit'));

  return (
    <Narrow width={720}>
      {render({
        offset,
        onPageChange: (next: number) => {
          setOffset(next);
          action('onPageChange', `offset=${next}`);
        },
        onSelect: bool(args, 'selectable')
          ? (row: T) => {
              setSelectedId(getId(row));
              action('onSelect', getId(row));
            }
          : undefined,
        rows: all.slice(offset, offset + limit),
        selectedId,
        total: all.length,
      })}
    </Narrow>
  );
};

/**
 * Searches sample rows the way the server does: the chosen attribute must equal the whole value. The
 * story hands the filtered rows, the search and its handler to `render`.
 */
export const SampleSearch = <T,>({
  action,
  attributes,
  render,
  rows,
  valueOf,
}: {
  action: Action;
  attributes: {label: string; value: string}[];
  render: (state: {
    onSearch: (search: AdminSearchValue | null) => void;
    rows: T[];
    search: AdminSearchValue | null;
    searchAttributes: {label: string; value: string}[];
  }) => ReactNode;
  rows: T[];
  valueOf: (row: T, attribute: string) => unknown;
}): ReactElement => {
  const [search, setSearch] = useState<AdminSearchValue | null>(null);
  const matching: T[] = search ? rows.filter((row: T) => valueOf(row, search.attribute) === search.value) : rows;

  return (
    <>
      {render({
        onSearch: (next: AdminSearchValue | null) => {
          setSearch(next);
          action('onSearch', next ? `${next.attribute} eq "${next.value}"` : 'cleared');
        },
        rows: matching,
        search,
        searchAttributes: attributes,
      })}
    </>
  );
};

/* Members and assignments keep their rows in state so add and remove visibly work. */

export const GroupMembersStory = ({
  action,
  args,
  children = undefined,
}: {
  action: Action;
  args: Args;
  children?: BaseGroupMembersProps['children'];
}): ReactElement => {
  const [members, setMembers] = useState<GroupMember[]>(SAMPLE_MEMBERS);
  const editable: boolean = bool(args, 'editable');
  const candidates: BaseGroupMembersProps['candidates'] = {agent: CANDIDATES.agent, user: CANDIDATES.user};

  return (
    <Narrow width={640}>
      <BaseGroupMembers
        title={str(args, 'title') || undefined}
        members={members}
        candidates={editable ? candidates : undefined}
        isLoading={bool(args, 'isLoading')}
        error={str(args, 'error') || null}
        onAdd={
          editable
            ? (member: Pick<GroupMember, 'id' | 'type'>) => {
                const label: string | undefined = CANDIDATES[member.type]?.find(
                  (item: {id: string}) => item.id === member.id,
                )?.label;

                setMembers((previous: GroupMember[]) => [...previous, {...member, display: label}]);
                action('onAdd', `${member.type}:${member.id}`);
              }
            : undefined
        }
        onRemove={
          editable
            ? (member: GroupMember) => {
                setMembers((previous: GroupMember[]) => previous.filter((item: GroupMember) => item.id !== member.id));
                action('onRemove', `${member.type}:${member.id}`);
              }
            : undefined
        }
      >
        {children}
      </BaseGroupMembers>
    </Narrow>
  );
};

export const RoleAssignmentsStory = ({
  action,
  args,
  children = undefined,
}: {
  action: Action;
  args: Args;
  children?: BaseRoleAssignmentsProps['children'];
}): ReactElement => {
  const [assignments, setAssignments] = useState<RoleAssignment[]>(SAMPLE_ASSIGNMENTS);
  const [typeFilter, setTypeFilter] = useState<RoleAssigneeType | null>(null);
  const editable: boolean = bool(args, 'editable');
  const candidates: BaseRoleAssignmentsProps['candidates'] = CANDIDATES;

  return (
    <Narrow width={640}>
      <BaseRoleAssignments
        title={str(args, 'title') || undefined}
        assignments={
          typeFilter ? assignments.filter((assignment: RoleAssignment) => assignment.type === typeFilter) : assignments
        }
        typeFilter={typeFilter}
        onTypeFilterChange={(type: RoleAssigneeType | null) => {
          setTypeFilter(type);
          action('onTypeFilterChange', type ?? 'all');
        }}
        candidates={editable ? candidates : undefined}
        isLoading={bool(args, 'isLoading')}
        error={str(args, 'error') || null}
        onAssign={
          editable
            ? (assignment: RoleAssignmentInput) => {
                const pool: {id: string; label: string}[] =
                  assignment.type === 'app' ? [] : CANDIDATES[assignment.type];
                const label: string | undefined = pool.find((item: {id: string}) => item.id === assignment.id)?.label;

                setAssignments((previous: RoleAssignment[]) => [...previous, {...assignment, display: label}]);
                action('onAssign', `${assignment.type}:${assignment.id}`);
              }
            : undefined
        }
        onUnassign={
          editable
            ? (assignment: RoleAssignment) => {
                setAssignments((previous: RoleAssignment[]) =>
                  previous.filter((item: RoleAssignment) => item.id !== assignment.id),
                );
                action('onUnassign', `${assignment.type}:${assignment.id}`);
              }
            : undefined
        }
      >
        {children}
      </BaseRoleAssignments>
    </Narrow>
  );
};

export const DataTableStory = ({action, args}: {action: Action; args: Args}): ReactElement => {
  const [offset, setOffset] = useState<number>(0);
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const rows: SessionRow[] = bool(args, 'empty') ? [] : SESSION_ROWS;
  const limit: number = Math.max(1, num(args, 'limit'));
  const paginate: boolean = bool(args, 'paginate');

  return (
    <Narrow width={640}>
      <DataTable<SessionRow>
        caption={str(args, 'caption')}
        emptyText={str(args, 'emptyText')}
        columns={SESSION_COLUMNS}
        rows={paginate ? rows.slice(offset, offset + limit) : rows}
        getRowId={(row: SessionRow) => row.id}
        isLoading={bool(args, 'isLoading')}
        error={str(args, 'error') || null}
        selectedRowId={bool(args, 'clickable') ? selected : undefined}
        onRowClick={
          bool(args, 'clickable')
            ? (row: SessionRow) => {
                setSelected(row.id);
                action('onRowClick', row.id);
              }
            : undefined
        }
        pagination={
          paginate
            ? {
                limit,
                offset,
                onChange: (next: number) => {
                  setOffset(next);
                  action('pagination.onChange', `offset=${next}`);
                },
                total: rows.length,
              }
            : undefined
        }
      />
    </Narrow>
  );
};

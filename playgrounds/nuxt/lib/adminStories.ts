// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

// Story components are small stateful wrappers that live next to the stories that use them.
/* eslint-disable vue/one-component-per-file */

import type {
  BasicAgent,
  Group,
  GroupMember,
  ManagedUser,
  MembershipGroup,
  RoleAssignment,
  RoleResourcePermissions,
  RoleSummary,
} from '@thunderid/browser';
import {Attribution, Button, DataTable, type DataTableColumn, type IdentityCandidate} from '@thunderid/vue';
import {defineComponent, h, ref, type Component, type PropType, type Ref, type VNode} from 'vue';
import {tag} from './storyCode';
import type {Action, Args, ComponentDef, PropControl, Snippet} from './storyTypes';
import {narrow} from './storyWidgets';
import {
  AgentCreate,
  AgentDetails,
  AgentList,
  BaseAgentCreate,
  BaseAgentDetails,
  BaseAgentList,
  BaseGroupCreate,
  BaseGroupList,
  BaseGroupMembers,
  BaseRoleAssignments,
  BaseRoleCreate,
  BaseRoleList,
  BaseRolePermissions,
  BaseUserCreate,
  BaseUserDetails,
  BaseUserList,
  GroupCreate,
  GroupList,
  GroupMembers,
  RoleAssignments,
  RoleCreate,
  RoleList,
  RolePermissions,
  UserCreate,
  UserDetails,
  UserList,
} from '#components';

// The admin components come from @thunderid/vue; the module auto-imports them, Base* variants
// included, when thunderid.management is on. The live variants fetch through POST /api/auth/management.

const str = (args: Args, key: string): string => String(args[key] ?? '');
const bool = (args: Args, key: string): boolean => args[key] === true;
const num = (args: Args, key: string): number => Number(args[key] ?? 0);
const optional = (args: Args, key: string): string | undefined => str(args, key) || undefined;
const isLive = (args: Args): boolean => str(args, 'source') === 'live';

const omit = (args: Args, ...keys: string[]): Args =>
  Object.fromEntries(Object.entries(args).filter(([key]: [string, unknown]) => !keys.includes(key)));

/** Writes a value as a JavaScript literal for the Code panel. */
const literal = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/"(\w+)":/g, '$1: ')
    .replace(/"/g, "'")
    .replace(/,(?=\S)/g, ', ');

const storyProps = {
  action: {required: true, type: Function as PropType<Action>},
  args: {required: true, type: Object as PropType<Args>},
};

const SOURCE_CONTROL: PropControl = {
  control: ['base', 'live'],
  description:
    'base renders the Base* component with sample data; live renders the container, which fetches through POST /api/auth/management.',
  name: 'source',
  type: "'base' | 'live' (playground only)",
};

const STATE_CONTROLS: PropControl[] = [
  {control: 'bool', description: 'Shows the loading state (base only).', name: 'isLoading', type: 'boolean'},
  {
    control: 'text',
    description: 'Error message, already translated (base only).',
    name: 'error',
    type: 'string | null',
  },
];

const SAMPLE_USERS: ManagedUser[] = [
  {
    attributes: {email: 'liam.chen@acme.io', family_name: 'Chen', given_name: 'Liam', username: 'liam.chen'},
    display: 'Liam Chen',
    id: 'usr_8f2c41',
    ouHandle: 'acme',
    ouId: 'ou_acme',
    type: 'employee',
  },
  {
    attributes: {email: 'ava.patel@acme.io', given_name: 'Ava', username: 'ava.patel'},
    display: 'Ava Patel',
    id: 'usr_31b9d0',
    ouHandle: 'acme',
    ouId: 'ou_acme',
    type: 'employee',
  },
  {
    attributes: {email: 'noah@partner.io', username: 'noah'},
    display: 'Noah Silva',
    id: 'usr_c7a2e5',
    ouHandle: 'partners',
    ouId: 'ou_partners',
    type: 'contractor',
  },
];

const SAMPLE_GROUPS: Group[] = [
  {description: 'Product engineering', id: 'grp_eng', name: 'Engineering', ouHandle: 'acme', ouId: 'ou_acme'},
  {description: 'Support and success', id: 'grp_support', name: 'Support', ouHandle: 'acme', ouId: 'ou_acme'},
  {
    description: 'External contractors',
    id: 'grp_partners',
    name: 'Partners',
    ouHandle: 'partners',
    ouId: 'ou_partners',
  },
];

const SAMPLE_ROLES: RoleSummary[] = [
  {description: 'Full access to the directory', id: 'role_admin', name: 'Directory admin', ouId: 'ou_acme'},
  {description: 'Read-only access', id: 'role_viewer', name: 'Viewer', isReadOnly: true, ouId: 'ou_acme'},
  {description: 'Manages agents', id: 'role_agents', name: 'Agent operator', ouId: 'ou_acme'},
];

const SAMPLE_AGENTS: BasicAgent[] = [
  {
    clientId: 'agt_concierge',
    id: 'agt_1',
    name: 'Travel concierge',
    ouHandle: 'acme',
    ouId: 'ou_acme',
    type: 'assistant',
  },
  {clientId: 'agt_triage', id: 'agt_2', name: 'Ticket triage', ouHandle: 'acme', ouId: 'ou_acme', type: 'worker'},
  {clientId: 'agt_reports', id: 'agt_3', name: 'Report builder', ouHandle: 'acme', ouId: 'ou_acme', type: 'worker'},
];

const SAMPLE_MEMBERSHIPS: MembershipGroup[] = [
  {id: 'grp_eng', name: 'Engineering', ouId: 'ou_acme'},
  {id: 'grp_support', name: 'Support', ouId: 'ou_acme'},
];

const SAMPLE_MEMBERS: GroupMember[] = [
  {display: 'Liam Chen', id: 'usr_8f2c41', type: 'user'},
  {display: 'Travel concierge', id: 'agt_1', type: 'agent'},
];

const SAMPLE_ASSIGNMENTS: RoleAssignment[] = [
  {display: 'Ava Patel', id: 'usr_31b9d0', type: 'user'},
  {display: 'Engineering', id: 'grp_eng', type: 'group'},
];

const SAMPLE_PERMISSIONS: RoleResourcePermissions[] = [
  {permissions: ['system:user:view', 'system:group'], resourceServerId: 'rs_system'},
  {permissions: ['booking:read', 'booking:write'], resourceServerId: 'rs_booking'},
];

const RESOURCE_SERVER_NAMES: Record<string, string> = {rs_booking: 'Booking API', rs_system: 'ThunderID system API'};

const USER_CANDIDATES: IdentityCandidate[] = SAMPLE_USERS.map((user: ManagedUser) => ({
  id: user.id,
  label: user.display ?? user.id,
}));
const GROUP_CANDIDATES: IdentityCandidate[] = SAMPLE_GROUPS.map((group: Group) => ({id: group.id, label: group.name}));
const AGENT_CANDIDATES: IdentityCandidate[] = SAMPLE_AGENTS.map((agent: BasicAgent) => ({
  id: agent.id,
  label: agent.name,
}));

const USER_TYPES: {label: string; value: string}[] = [
  {label: 'Employee', value: 'employee'},
  {label: 'Contractor', value: 'contractor'},
];
const AGENT_TYPES: {label: string; value: string}[] = [
  {label: 'Assistant', value: 'assistant'},
  {label: 'Worker', value: 'worker'},
];

const stateProps = (args: Args): {error: string | null; isLoading: boolean} => ({
  error: optional(args, 'error') ?? null,
  isLoading: bool(args, 'isLoading'),
});

interface ListSpec {
  base: Component;
  id: string;
  live: Component;
  name: string;
  rows: {id: string}[];
  rowsProp: string;
  selectedProp: string;
}

/** A list holds the page offset and the selected row, the way an application would. */
const listStory = (spec: ListSpec): Component =>
  defineComponent({
    name: `${spec.name}Story`,
    props: storyProps,
    setup(props: {action: Action; args: Args}): () => VNode {
      const offset: Ref<number> = ref(0);
      const selected: Ref<string | undefined> = ref<string | undefined>();

      return (): VNode => {
        const {action, args} = props;
        const limit: number = Math.max(1, num(args, 'limit'));
        const onSelect = (row: {id: string}): void => {
          selected.value = row.id;
          action('select', row.id);
        };

        if (isLive(args)) {
          return h(spec.live, {limit, onSelect, [spec.selectedProp]: selected.value, title: optional(args, 'title')});
        }

        return h(spec.base, {
          ...stateProps(args),
          [spec.rowsProp]: bool(args, 'empty') ? [] : spec.rows.slice(offset.value, offset.value + limit),
          [spec.selectedProp]: selected.value,
          limit,
          offset: offset.value,
          onPageChange: (next: number) => {
            offset.value = next;
            action('pageChange', String(next));
          },
          onSelect,
          title: optional(args, 'title'),
          totalResults: bool(args, 'empty') ? 0 : spec.rows.length,
        });
      };
    },
  });

const listDef = (spec: ListSpec): ComponentDef => {
  const story: Component = listStory(spec);
  const kebabSelected: string = spec.selectedProp.replace(/[A-Z]/g, (char: string) => `-${char.toLowerCase()}`);

  return {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: [],
            script: ['const selectedId = ref<string>();'],
            template: tag(spec.name, omit(args, 'source', 'isLoading', 'error', 'empty'), {
              defaults: {limit: 20},
              extra: [`:${kebabSelected}="selectedId"`, '@select="(row) => (selectedId = row.id)"'],
            }),
          }
        : {
            imports: [],
            script: [
              `const ${spec.rowsProp} = ref(${literal(spec.rows.slice(0, 2))});`,
              'const selectedId = ref<string>();',
              'const offset = ref(0);',
            ],
            template: tag(`Base${spec.name}`, omit(args, 'source', 'empty'), {
              defaults: {limit: 20},
              extra: [
                `:${spec.rowsProp}="${spec.rowsProp}"`,
                `:${kebabSelected}="selectedId"`,
                ':offset="offset"',
                `:total-results="${spec.rowsProp}.length"`,
                '@select="(row) => (selectedId = row.id)"',
                '@page-change="(next) => (offset = next)"',
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      {control: 'number', description: 'Page size.', name: 'limit', type: 'number'},
      {control: 'text', description: 'Heading; empty uses the translated default.', name: 'title', type: 'string'},
      ...STATE_CONTROLS,
      {control: 'bool', description: 'No rows (base only).', name: 'empty', type: 'playground only'},
    ],
    defaults: {empty: false, error: '', isLoading: false, limit: 2, source: 'base', title: ''},
    group: 'Admin',
    id: spec.id,
    live: true,
    name: spec.name,
    render: (args: Args, action: Action) => narrow(720, h(story, {action, args})),
    stories: [
      {id: 'base', name: 'Sample page (paginated)'},
      {args: {empty: true}, id: 'empty', name: 'Empty'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {error: 'You do not have permission to view this list.'}, id: 'error', name: 'Error'},
      {args: {limit: 20, source: 'live'}, id: 'live', name: 'Live (useGet* via /api/auth/management)'},
    ],
  };
};

interface CreateSpec {
  base: Component;
  /** Props only the Base form takes, such as the type options. */
  baseProps?: Record<string, unknown>;
  baseScript?: string[];
  baseExtra?: string[];
  id: string;
  live: Component;
  name: string;
}

const createDef = (spec: CreateSpec): ComponentDef => ({
  code: (args: Args): Snippet =>
    isLive(args)
      ? {
          imports: [],
          template: tag(spec.name, omit(args, 'source', 'isSubmitting', 'error'), {
            extra: ['@created="handleCreated"', '@cancel="handleCancel"'],
          }),
        }
      : {
          imports: [],
          script: spec.baseScript,
          template: tag(`Base${spec.name}`, omit(args, 'source', 'ouId'), {
            extra: [...(spec.baseExtra ?? []), '@submit="handleSubmit"', '@cancel="handleCancel"'],
          }),
        },
  controls: [
    SOURCE_CONTROL,
    {control: 'text', description: 'Heading; empty uses the translated default.', name: 'title', type: 'string'},
    {
      control: 'bool',
      description: 'Disables the form while saving (base only).',
      name: 'isSubmitting',
      type: 'boolean',
    },
    {
      control: 'text',
      description: 'Error message, already translated (base only).',
      name: 'error',
      type: 'string | null',
    },
    {
      control: 'text',
      description: "Organization unit (live only). Empty uses the signed-in user's.",
      name: 'ouId',
      type: 'string',
    },
  ],
  defaults: {error: '', isSubmitting: false, ouId: '', source: 'base', title: ''},
  group: 'Admin',
  id: spec.id,
  live: true,
  name: spec.name,
  render: (args: Args, action: Action) => {
    const shared = {
      onCancel: () => action('cancel'),
      title: optional(args, 'title'),
    };

    return narrow(
      480,
      isLive(args)
        ? h(spec.live, {
            ...shared,
            onCreated: (created: {id?: string}) => action('created', created?.id ?? ''),
            ouId: optional(args, 'ouId'),
          })
        : h(spec.base, {
            ...shared,
            ...spec.baseProps,
            error: optional(args, 'error') ?? null,
            isSubmitting: bool(args, 'isSubmitting'),
            onSubmit: (submission: unknown) => action('submit', JSON.stringify(submission)),
          }),
    );
  },
  stories: [
    {id: 'base', name: 'Form (emits submit)'},
    {args: {error: 'A resource with that name already exists.'}, id: 'error', name: 'Error'},
    {args: {source: 'live'}, id: 'live', name: 'Live (creates through /api/auth/management)'},
  ],
});

interface DetailsSpec {
  base: Component;
  baseProps: Record<string, unknown>;
  baseScript: string[];
  baseExtra: string[];
  id: string;
  idProp: string;
  live: Component;
  liveFlags: string[];
  name: string;
}

const detailsDef = (spec: DetailsSpec): ComponentDef => {
  const kebabId: string = spec.idProp.replace(/[A-Z]/g, (char: string) => `-${char.toLowerCase()}`);

  return {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: [],
            template: tag(
              spec.name,
              {},
              {
                extra: [
                  `${kebabId}="${str(args, 'resourceId') || '<id>'}"`,
                  ...spec.liveFlags.filter((flag: string) => bool(args, flag)),
                  '@deleted="handleDeleted"',
                ],
              },
            ),
          }
        : {
            imports: [],
            script: spec.baseScript,
            template: tag(`Base${spec.name}`, omit(args, 'source', 'resourceId', ...spec.liveFlags), {
              extra: [...spec.baseExtra, '@delete="handleDelete"'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: `${spec.idProp} of the resource (live only). Copy one from a live list.`,
        name: 'resourceId',
        type: 'string',
      },
      ...spec.liveFlags.map(
        (flag: string): PropControl => ({
          control: 'bool',
          description: `Turns on ${flag} actions (live only).`,
          name: flag,
          type: 'boolean',
        }),
      ),
      ...STATE_CONTROLS,
    ],
    defaults: {
      error: '',
      isLoading: false,
      resourceId: '',
      source: 'base',
      ...Object.fromEntries(spec.liveFlags.map((flag: string) => [flag, false])),
    },
    group: 'Admin',
    id: spec.id,
    live: true,
    name: spec.name,
    render: (args: Args, action: Action) => {
      if (!isLive(args)) {
        return narrow(
          560,
          h(spec.base, {
            ...spec.baseProps,
            ...stateProps(args),
            onDelete: () => action('delete'),
            onUpdate: (attributes: unknown) => action('update', JSON.stringify(attributes)),
          }),
        );
      }

      const resourceId: string = str(args, 'resourceId');

      if (!resourceId) {
        return h('p', {class: 'pg-empty'}, `Set ${spec.idProp} in Controls: copy one from a live list.`);
      }

      return narrow(
        560,
        h(spec.live, {
          [spec.idProp]: resourceId,
          ...Object.fromEntries(spec.liveFlags.map((flag: string) => [flag, bool(args, flag)])),
          onDeleted: () => action('deleted', resourceId),
        }),
      );
    },
    stories: [
      {id: 'base', name: 'Sample resource'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {error: 'This resource could not be found.'}, id: 'error', name: 'Error'},
      {args: {source: 'live'}, id: 'live', name: `Live (${spec.idProp})`},
    ],
  };
};

/** Group members and role assignments keep their rows in local state, so add and remove work on sample data. */
const membershipStory = <T extends {id: string; type: string}>(
  name: string,
  base: Component,
  rowsProp: string,
  initial: T[],
  candidates: Record<string, IdentityCandidate[]>,
  addEvent: 'onAdd' | 'onAssign',
  removeEvent: 'onRemove' | 'onUnassign',
): Component =>
  defineComponent({
    name,
    props: storyProps,
    setup(props: {action: Action; args: Args}): () => VNode {
      const rows: Ref<T[]> = ref(initial.slice()) as Ref<T[]>;
      const labelOf = (row: {id: string}): string =>
        Object.values(candidates)
          .flat()
          .find((candidate: IdentityCandidate) => candidate.id === row.id)?.label ?? row.id;

      return (): VNode =>
        h(base, {
          ...stateProps(props.args),
          [addEvent]: (row: T) => {
            rows.value = [...rows.value, {...row, display: labelOf(row)}];
            props.action(addEvent.slice(2).toLowerCase(), `${row.type} ${row.id}`);
          },
          [removeEvent]: (row: T) => {
            rows.value = rows.value.filter((item: T) => item.id !== row.id);
            props.action(removeEvent.slice(2).toLowerCase(), `${row.type} ${row.id}`);
          },
          [rowsProp]: rows.value,
          candidates: bool(props.args, 'editable') ? candidates : undefined,
          isMutating: false,
          title: optional(props.args, 'title'),
        });
    },
  });

interface MembershipSpec {
  base: Component;
  baseExtra: string[];
  baseScript: string[];
  idProp: string;
  id: string;
  live: Component;
  name: string;
  story: Component;
}

const membershipDef = (spec: MembershipSpec): ComponentDef => {
  const kebabId: string = spec.idProp.replace(/[A-Z]/g, (char: string) => `-${char.toLowerCase()}`);

  return {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: [],
            template: tag(
              spec.name,
              {editable: bool(args, 'editable')},
              {
                extra: [`${kebabId}="${str(args, 'resourceId') || '<id>'}"`],
              },
            ),
          }
        : {
            imports: [],
            script: spec.baseScript,
            template: tag(`Base${spec.name}`, omit(args, 'source', 'resourceId', 'editable'), {
              extra: [...spec.baseExtra, ...(bool(args, 'editable') ? [':candidates="candidates"'] : [])],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: `${spec.idProp} (live only). Copy one from a live list.`,
        name: 'resourceId',
        type: 'string',
      },
      {
        control: 'bool',
        description: 'Shows the add picker and remove buttons. Live: loads candidates and writes changes.',
        name: 'editable',
        type: 'boolean',
      },
      {control: 'text', description: 'Heading; empty uses the translated default.', name: 'title', type: 'string'},
      ...STATE_CONTROLS,
    ],
    defaults: {editable: true, error: '', isLoading: false, resourceId: '', source: 'base', title: ''},
    group: 'Admin',
    id: spec.id,
    live: true,
    name: spec.name,
    render: (args: Args, action: Action) => {
      if (!isLive(args)) return narrow(560, h(spec.story, {action, args}));

      const resourceId: string = str(args, 'resourceId');

      if (!resourceId) {
        return h('p', {class: 'pg-empty'}, `Set ${spec.idProp} in Controls: copy one from a live list.`);
      }

      return narrow(
        560,
        h(spec.live, {[spec.idProp]: resourceId, editable: bool(args, 'editable'), title: optional(args, 'title')}),
      );
    },
    stories: [
      {id: 'editable', name: 'Editable (sample data)'},
      {args: {editable: false}, id: 'readonly', name: 'Read only'},
      {args: {error: 'You do not have permission to change this.'}, id: 'error', name: 'Error'},
      {args: {editable: false, source: 'live'}, id: 'live', name: `Live (${spec.idProp})`},
    ],
  };
};

const GroupMembersStory: Component = membershipStory(
  'GroupMembersStory',
  BaseGroupMembers,
  'members',
  SAMPLE_MEMBERS,
  {agent: AGENT_CANDIDATES, group: GROUP_CANDIDATES, user: USER_CANDIDATES},
  'onAdd',
  'onRemove',
);

const RoleAssignmentsStory: Component = membershipStory(
  'RoleAssignmentsStory',
  BaseRoleAssignments,
  'assignments',
  SAMPLE_ASSIGNMENTS,
  {agent: AGENT_CANDIDATES, group: GROUP_CANDIDATES, user: USER_CANDIDATES},
  'onAssign',
  'onUnassign',
);

const DATA_TABLE_COLUMNS: DataTableColumn<ManagedUser>[] = [
  {header: 'Name', id: 'name', render: (row: ManagedUser) => row.display ?? row.id},
  {header: 'Type', id: 'type', render: (row: ManagedUser) => row.type},
  {header: 'Organization unit', id: 'ou', render: (row: ManagedUser) => row.ouHandle ?? row.ouId},
];

/** DataTable holds no state: the story keeps the offset and the selected row. */
const DataTableStory: Component = defineComponent({
  name: 'DataTableStory',
  props: storyProps,
  setup(props: {action: Action; args: Args}): () => VNode {
    const offset: Ref<number> = ref(0);
    const selected: Ref<string | undefined> = ref<string | undefined>();

    return (): VNode => {
      const {action, args} = props;
      const limit: number = Math.max(1, num(args, 'limit'));
      const rows: ManagedUser[] = bool(args, 'empty') ? [] : SAMPLE_USERS;

      return h(DataTable, {
        ...stateProps(args),
        caption: str(args, 'caption'),
        columns: DATA_TABLE_COLUMNS,
        emptyText: str(args, 'emptyText'),
        getRowId: (row: unknown) => (row as ManagedUser).id,
        onRowClick: bool(args, 'selectable')
          ? (row: unknown) => {
              selected.value = (row as ManagedUser).id;
              action('rowClick', (row as ManagedUser).id);
            }
          : undefined,
        pagination: {
          limit,
          offset: offset.value,
          onChange: (next: number) => {
            offset.value = next;
            action('pagination.onChange', String(next));
          },
          total: rows.length,
        },
        rows: rows.slice(offset.value, offset.value + limit),
        selectedRowId: bool(args, 'selectable') ? selected.value : undefined,
      });
    };
  },
});

/** A card for the ribbon, which is positioned against its nearest `position: relative` ancestor. */
const ribbonCard = (child: VNode): VNode =>
  h(
    'div',
    {
      style: {
        border: '1px solid var(--pg-border, #8884)',
        borderRadius: '12px',
        height: '180px',
        overflow: 'hidden',
        position: 'relative',
        width: '360px',
      },
    },
    [h('div', {style: {padding: '20px'}}, [h(Button, {variant: 'outline'}, {default: () => 'Sign in'})]), child],
  );

const sampleDetailsScript = (name: string, value: unknown): string[] => [
  `const ${name} = ref(${literal(value)});`,
  `const groups = ref(${literal(SAMPLE_MEMBERSHIPS.slice(0, 1))});`,
];

export const ADMIN_COMPONENTS: ComponentDef[] = [
  {
    code: (args: Args): Snippet => ({
      imports: ['DataTable'],
      script: [
        `const rows = ref(${literal(SAMPLE_USERS.slice(0, 2).map(({id, display, type}: ManagedUser) => ({display, id, type})))});`,
        'const offset = ref(0);',
        'const selectedId = ref<string>();',
        'const columns = [',
        "  {header: 'Name', id: 'name', render: (row) => row.display},",
        "  {header: 'Type', id: 'type', render: (row) => row.type},",
        '];',
        `const pagination = computed(() => ({limit: ${num(args, 'limit')}, offset: offset.value, total: rows.value.length, onChange: (next) => (offset.value = next)}));`,
      ],
      template: tag('DataTable', omit(args, 'limit', 'selectable', 'empty'), {
        defaults: {error: '', isLoading: false},
        extra: [
          ':rows="rows"',
          ':columns="columns"',
          ':get-row-id="(row) => row.id"',
          ':pagination="pagination"',
          ...(bool(args, 'selectable')
            ? [':selected-row-id="selectedId"', ':on-row-click="(row) => (selectedId = row.id)"']
            : []),
        ],
      }),
    }),
    controls: [
      {
        control: 'text',
        description: 'Accessible name of the table, already translated.',
        name: 'caption',
        type: 'string',
      },
      {control: 'text', description: 'Shown when there are no rows.', name: 'emptyText', type: 'string'},
      {control: 'number', description: 'Rows per page (pagination.limit).', name: 'limit', type: 'number'},
      {
        control: 'bool',
        description: 'Sets onRowClick, which makes rows selectable.',
        name: 'selectable',
        type: 'boolean',
      },
      ...STATE_CONTROLS,
      {control: 'bool', description: 'No rows (playground only).', name: 'empty', type: 'playground only'},
    ],
    defaults: {
      caption: 'Users',
      empty: false,
      emptyText: 'No users yet.',
      error: '',
      isLoading: false,
      limit: 2,
      selectable: true,
    },
    group: 'Primitives',
    id: 'datatable',
    name: 'DataTable',
    render: (args: Args, action: Action) => narrow(640, h(DataTableStory, {action, args})),
    stories: [
      {id: 'playground', name: 'Selectable, paginated'},
      {args: {limit: 10, selectable: false}, id: 'plain', name: 'Plain'},
      {args: {empty: true}, id: 'empty', name: 'Empty'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {error: 'Could not load users.'}, id: 'error', name: 'Error'},
    ],
  },
  {
    code: (args: Args): Snippet => ({
      imports: ['Attribution'],
      template: tag('Attribution', args, {defaults: {appearance: 'inline', variant: 'secured'}}),
    }),
    controls: [
      {
        control: ['inline', 'ribbon'],
        description: 'A line of text, or a ribbon on the edge of a position: relative card.',
        name: 'appearance',
        type: "'inline' | 'ribbon'",
      },
      {
        control: ['secured', 'powered'],
        description: '"Secured by" or "Powered by".',
        name: 'variant',
        type: "'secured' | 'powered'",
      },
      {control: 'text', description: 'Makes the credit a link that opens in a new tab.', name: 'href', type: 'string'},
    ],
    defaults: {appearance: 'inline', href: '', variant: 'secured'},
    group: 'Branding',
    id: 'attribution',
    name: 'Attribution',
    render: (args: Args) => {
      const credit: VNode = h(Attribution, {
        appearance: str(args, 'appearance'),
        href: optional(args, 'href'),
        variant: str(args, 'variant'),
      });

      return str(args, 'appearance') === 'ribbon' ? ribbonCard(credit) : credit;
    },
    stories: [
      {id: 'inline', name: 'Inline, secured by'},
      {args: {href: 'https://thunderid.dev', variant: 'powered'}, id: 'powered', name: 'Inline link, powered by'},
      {args: {appearance: 'ribbon'}, id: 'ribbon', name: 'Ribbon on a card'},
    ],
  },
  listDef({
    base: BaseUserList,
    id: 'userlist',
    live: UserList,
    name: 'UserList',
    rows: SAMPLE_USERS,
    rowsProp: 'users',
    selectedProp: 'selectedUserId',
  }),
  createDef({
    base: BaseUserCreate,
    baseExtra: [':user-types="userTypes"'],
    baseProps: {userTypes: USER_TYPES},
    baseScript: [`const userTypes = ref(${literal(USER_TYPES)});`],
    id: 'usercreate',
    live: UserCreate,
    name: 'UserCreate',
  }),
  detailsDef({
    base: BaseUserDetails,
    baseExtra: [':user="user"', ':groups="groups"', ':on-update="handleUpdate"'],
    baseProps: {groups: SAMPLE_MEMBERSHIPS, user: SAMPLE_USERS[0]},
    baseScript: sampleDetailsScript('user', {
      display: 'Liam Chen',
      id: 'usr_8f2c41',
      ouId: 'ou_acme',
      type: 'employee',
    }),
    id: 'userdetails',
    idProp: 'userId',
    live: UserDetails,
    liveFlags: ['editable', 'deletable'],
    name: 'UserDetails',
  }),
  listDef({
    base: BaseGroupList,
    id: 'grouplist',
    live: GroupList,
    name: 'GroupList',
    rows: SAMPLE_GROUPS,
    rowsProp: 'groups',
    selectedProp: 'selectedGroupId',
  }),
  createDef({base: BaseGroupCreate, id: 'groupcreate', live: GroupCreate, name: 'GroupCreate'}),
  membershipDef({
    base: BaseGroupMembers,
    baseExtra: [':members="members"', '@add="handleAdd"', '@remove="handleRemove"'],
    baseScript: [
      `const members = ref(${literal(SAMPLE_MEMBERS.slice(0, 1))});`,
      `const candidates = {user: ${literal(USER_CANDIDATES.slice(1, 2))}};`,
    ],
    id: 'groupmembers',
    idProp: 'groupId',
    live: GroupMembers,
    name: 'GroupMembers',
    story: GroupMembersStory,
  }),
  listDef({
    base: BaseRoleList,
    id: 'rolelist',
    live: RoleList,
    name: 'RoleList',
    rows: SAMPLE_ROLES,
    rowsProp: 'roles',
    selectedProp: 'selectedRoleId',
  }),
  createDef({base: BaseRoleCreate, id: 'rolecreate', live: RoleCreate, name: 'RoleCreate'}),
  membershipDef({
    base: BaseRoleAssignments,
    baseExtra: [':assignments="assignments"', '@assign="handleAssign"', '@unassign="handleUnassign"'],
    baseScript: [
      `const assignments = ref(${literal(SAMPLE_ASSIGNMENTS.slice(0, 1))});`,
      `const candidates = {group: ${literal(GROUP_CANDIDATES.slice(0, 1))}};`,
    ],
    id: 'roleassignments',
    idProp: 'roleId',
    live: RoleAssignments,
    name: 'RoleAssignments',
    story: RoleAssignmentsStory,
  }),
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: [],
            template: tag('RolePermissions', {}, {extra: [`role-id="${str(args, 'resourceId') || '<id>'}"`]}),
          }
        : {
            imports: [],
            script: [
              `const permissions = ref(${literal(SAMPLE_PERMISSIONS.slice(0, 1))});`,
              `const names = ${literal({rs_system: RESOURCE_SERVER_NAMES.rs_system})};`,
            ],
            template: tag('BaseRolePermissions', omit(args, 'source', 'resourceId'), {
              extra: [':permissions="permissions"', ':resource-server-names="names"'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: 'roleId (live only). Copy one from a live RoleList.',
        name: 'resourceId',
        type: 'string',
      },
      ...STATE_CONTROLS,
    ],
    defaults: {error: '', isLoading: false, resourceId: '', source: 'base'},
    group: 'Admin',
    id: 'rolepermissions',
    live: true,
    name: 'RolePermissions',
    render: (args: Args) => {
      if (!isLive(args)) {
        return narrow(
          560,
          h(BaseRolePermissions, {
            ...stateProps(args),
            permissions: SAMPLE_PERMISSIONS,
            resourceServerNames: RESOURCE_SERVER_NAMES,
          }),
        );
      }

      return str(args, 'resourceId')
        ? narrow(560, h(RolePermissions, {roleId: str(args, 'resourceId')}))
        : h('p', {class: 'pg-empty'}, 'Set roleId in Controls: copy one from a live RoleList.');
    },
    stories: [
      {id: 'base', name: 'Sample permissions'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {source: 'live'}, id: 'live', name: 'Live (roleId)'},
    ],
  },
  listDef({
    base: BaseAgentList,
    id: 'agentlist',
    live: AgentList,
    name: 'AgentList',
    rows: SAMPLE_AGENTS,
    rowsProp: 'agents',
    selectedProp: 'selectedAgentId',
  }),
  createDef({
    base: BaseAgentCreate,
    baseExtra: [':agent-types="agentTypes"'],
    baseProps: {agentTypes: AGENT_TYPES},
    baseScript: [`const agentTypes = ref(${literal(AGENT_TYPES)});`],
    id: 'agentcreate',
    live: AgentCreate,
    name: 'AgentCreate',
  }),
  detailsDef({
    base: BaseAgentDetails,
    baseExtra: [':agent="agent"', ':groups="groups"', ':roles="roles"'],
    baseProps: {
      agent: {...SAMPLE_AGENTS[0], description: 'Books travel for employees', owner: 'usr_8f2c41'},
      groups: SAMPLE_MEMBERSHIPS.slice(0, 1),
      roles: ['Agent operator'],
    },
    baseScript: [
      ...sampleDetailsScript('agent', {id: 'agt_1', name: 'Travel concierge', ouId: 'ou_acme', type: 'assistant'}),
      "const roles = ref(['Agent operator']);",
    ],
    id: 'agentdetails',
    idProp: 'agentId',
    live: AgentDetails,
    liveFlags: ['deletable'],
    name: 'AgentDetails',
  }),
];

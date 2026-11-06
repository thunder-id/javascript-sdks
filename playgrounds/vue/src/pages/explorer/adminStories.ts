// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AccessStatusValue,
  AccountLifecycleAction,
  AdministrationMode,
  Agent,
  AgentCreate,
  AgentDetails,
  AgentList,
  Application,
  ApplicationCreate,
  ApplicationDetails,
  ApplicationList,
  Attribution,
  BaseAgentCreate,
  BaseAgentDetails,
  BaseAgentList,
  BaseApplicationCreate,
  BaseApplicationDetails,
  BaseApplicationList,
  BaseGroupCreate,
  BaseGroupDetails,
  BaseGroupList,
  BaseGroupMembers,
  BaseRoleAssignments,
  BaseRoleCreate,
  BaseRoleDetails,
  BaseRoleList,
  BaseRolePermissions,
  BaseUserCreate,
  BaseUserDetails,
  BaseUserList,
  BasicAgent,
  BasicApplication,
  Card,
  Group,
  GroupCreate,
  GroupDetails,
  GroupList,
  GroupMember,
  GroupMembers,
  IdentityCandidate,
  ManagedUser,
  MembershipGroup,
  RoleAssignment,
  RoleAssignmentInput,
  RoleAssignments,
  RoleCreate,
  RoleDetails,
  RoleList,
  RolePermissions,
  RoleResourcePermissions,
  RoleSummary,
  Typography,
  getAgents,
  getApplications,
  getGroups,
  getRoles,
  getUsers,
  useManagementRequestConfig,
  UserCreate,
  UserDetails,
  UserList,
  getAccountLifecycleActions,
} from '@thunderid/vue';
import {Component, h, VNode} from 'vue';
import DataTableHost from './DataTableHost';
import FirstResource from './FirstResource';
import ListHost from './ListHost';
import {bool, handler, num, omit, quoted, SOURCE_CONTROL, str, tpl} from './storyKit';
import type {Action, Args, ComponentDef, PropControl, Snippet} from './types';
import {narrow} from './widgets';
import useApiQuery from '../../lib/useApiQuery';

// Stories for the management (admin) components, the DataTable primitive they share, and
// Attribution. Base stories render sample data; live stories call the management API with the
// signed-in user's token, so without a session they show the component's own error state.

const OU = 'ou_7d1e';

/**
 * Every user lifecycle flow configured, so the sample offers whatever its status allows.
 */
const ALL_USER_LIFECYCLE_FLOWS: Record<string, string> = {
  userSuspendFlow: 'user-suspend',
  userUnlockFlow: 'user-unlock',
  userUnsuspendFlow: 'user-unsuspend',
};

const SAMPLE_USERS: ManagedUser[] = [
  {
    attributes: {email: 'liam.chen@acme.io', family_name: 'Chen', given_name: 'Liam', username: 'liam.chen'},
    id: 'usr_8f2c41',
    ouHandle: 'acme',
    ouId: OU,
    type: 'employee',
  },
  {
    attributes: {email: 'ava.patel@acme.io', family_name: 'Patel', given_name: 'Ava', username: 'ava.patel'},
    id: 'usr_2b9d07',
    ouHandle: 'acme',
    ouId: OU,
    type: 'employee',
  },
  {
    attributes: {email: 'noah.kim@partner.io', family_name: 'Kim', given_name: 'Noah', username: 'noah.kim'},
    id: 'usr_c41a55',
    ouHandle: 'partners',
    ouId: 'ou_91aa',
    type: 'contractor',
  },
];

const SAMPLE_GROUPS: Group[] = [
  {description: 'Product engineering', id: 'grp_eng', name: 'Engineering', ouHandle: 'acme', ouId: OU},
  {description: 'Security reviewers', id: 'grp_sec', name: 'Security', ouHandle: 'acme', ouId: OU},
  {description: 'On-call rotation', id: 'grp_ops', name: 'Operations', ouHandle: 'acme', ouId: OU},
];

const SAMPLE_ROLES: RoleSummary[] = [
  {description: 'Manages users, groups and roles', id: 'rol_admin', name: 'Administrator', ouHandle: 'acme', ouId: OU},
  {description: 'Reads the directory', id: 'rol_viewer', name: 'Viewer', ouHandle: 'acme', ouId: OU},
  {description: 'Built in, cannot be edited', id: 'rol_system', isReadOnly: true, name: 'System', ouId: OU},
];

const SAMPLE_AGENTS: BasicAgent[] = [
  {
    attributes: {name: 'Travel concierge'},
    clientId: 'concierge-01',
    display: 'Travel concierge',
    id: 'agt_concierge',
    ouHandle: 'acme',
    ouId: OU,
    type: 'assistant',
  },
  {
    attributes: {name: 'Billing assistant'},
    clientId: 'billing-02',
    display: 'Billing assistant',
    id: 'agt_billing',
    ouHandle: 'acme',
    ouId: OU,
    type: 'worker',
  },
];

const SAMPLE_AGENT: Agent = {
  ...SAMPLE_AGENTS[0],
  description: 'Books flights and hotels for employees',
  owner: 'usr_8f2c41',
};

const SAMPLE_APPLICATIONS: BasicApplication[] = [
  {clientId: 'portal-web', id: 'app_portal', name: 'Customer portal', template: 'browser'},
  {clientId: 'billing-api', id: 'app_billing', name: 'Billing service', template: 'm2m'},
  {clientId: 'acme-mobile', id: 'app_mobile', name: 'Acme mobile', template: 'mobile'},
];

const SAMPLE_APPLICATION: Application = {
  description: 'Self-service portal for customers',
  id: 'app_portal',
  inboundAuthConfig: [
    {
      config: {
        clientId: 'portal-web',
        grantTypes: ['authorization_code', 'refresh_token'],
        redirectUris: ['https://portal.acme.io/callback'],
        responseTypes: ['code'],
      },
      type: 'oauth2',
    },
  ],
  name: 'Customer portal',
  ouId: OU,
  template: 'browser',
  url: 'https://portal.acme.io',
};

/** A secret shown in the "secret shown once" stories. Sample only, never a real credential. */
const SAMPLE_SECRET = 'sample-secret-5f1c9e2a';

const SAMPLE_MEMBERSHIPS: MembershipGroup[] = SAMPLE_GROUPS.slice(0, 2).map(({id, name, ouId}: Group) => ({
  id,
  name,
  ouId,
}));

const SAMPLE_MEMBERS: GroupMember[] = [
  {display: 'Liam Chen', id: 'usr_8f2c41', type: 'user'},
  {display: 'Travel concierge', id: 'agt_concierge', type: 'agent'},
  {display: 'Security', id: 'grp_sec', type: 'group'},
];

const SAMPLE_ASSIGNMENTS: RoleAssignment[] = [
  {display: 'Engineering', id: 'grp_eng', type: 'group'},
  {display: 'Ava Patel', id: 'usr_2b9d07', type: 'user'},
  {display: 'Customer portal', id: 'app_portal', type: 'app'},
  {display: 'Billing assistant', id: 'agt_billing', type: 'agent'},
];

const SAMPLE_PERMISSIONS: RoleResourcePermissions[] = [
  {permissions: ['system:user:view', 'system:group', 'system:role:view'], resourceServerId: 'rs_system'},
  {permissions: ['booking:read', 'booking:write'], resourceServerId: 'rs_booking'},
];

const RESOURCE_SERVER_NAMES: Record<string, string> = {rs_booking: 'Booking API', rs_system: 'ThunderID system API'};

const CANDIDATES: Record<'agent' | 'group' | 'user', IdentityCandidate[]> = {
  agent: [{id: 'agt_billing', label: 'Billing assistant'}],
  group: [{id: 'grp_ops', label: 'Operations'}],
  user: [
    {id: 'usr_2b9d07', label: 'Ava Patel'},
    {id: 'usr_c41a55', label: 'Noah Kim'},
  ],
};

const TYPE_OPTIONS: {label: string; value: string}[] = [
  {label: 'Employee', value: 'employee'},
  {label: 'Contractor', value: 'contractor'},
];

const AGENT_TYPE_OPTIONS: {label: string; value: string}[] = [
  {label: 'Assistant', value: 'assistant'},
  {label: 'Worker', value: 'worker'},
];

/** Prints a value as a compact TypeScript literal for the Code panel. */
const literal = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/"([A-Za-z_$][\w$]*)":/g, '$1: ')
    .replace(/"/g, "'")
    .replace(/,(?=\S)/g, ', ');

const text =
  (value: string): (() => string) =>
  (): string =>
    value;

const isLive = (args: Args): boolean => str(args, 'source') === 'live';

const titleControls: PropControl[] = [
  {control: 'text', description: 'Heading; empty uses the translated default.', name: 'title', type: 'string'},
  {control: 'text', description: 'Text under the title.', name: 'description', type: 'string'},
];

const baseStateControls: PropControl[] = [
  {control: 'bool', description: 'Base only: shows the loading state.', name: 'isLoading', type: 'boolean'},
  {control: 'text', description: 'Base only: an error message, already translated.', name: 'error', type: 'string'},
];

/** Title and description props, left out when empty so the translated defaults show. */
const heading = (args: Args): Record<string, string | undefined> => ({
  description: str(args, 'description') || undefined,
  title: str(args, 'title') || undefined,
});

interface ListSpec {
  base: Component;
  baseTag: string;
  id: string;
  live: Component;
  liveTag: string;
  name: string;
  /** Collection whose request config the Base snippet takes, for the Code panel. */
  collection: string;
  /** API function whose page the Base snippet renders, for the Code panel. */
  pageFunction: string;
  /** Type of the page the API function returns. */
  pageType: string;
  rows: {id: string}[];
  rowsKey: string;
  rowsProp: string;
  selectedProp: string;
}

const listStory = (spec: ListSpec): ComponentDef => {
  const singular: string = spec.rowsProp.replace(/s$/, '');

  return {
    code: (args: Args): Snippet => {
      const extra: string[] = bool(args, 'selectable')
        ? [
            `:${spec.selectedProp.replace(/[A-Z]/g, (char: string) => `-${char.toLowerCase()}`)}="selectedId"`,
            `@select="(${singular}) => (selectedId = ${singular}.id)"`,
          ]
        : [];
      const shared: Args = omit(args, 'source', 'selectable', 'paginated', 'isLoading', 'error');

      if (isLive(args)) {
        return {
          imports: [spec.liveTag],
          script: bool(args, 'selectable') ? ['const selectedId = ref<string>();'] : [],
          template: tpl(spec.liveTag, shared, {defaults: {limit: 20}, extra}),
          vueImports: bool(args, 'selectable') ? ['ref'] : [],
        };
      }

      return {
        imports: [spec.baseTag, spec.pageFunction, spec.pageType, 'useManagementRequestConfig'],
        script: [
          `const config = useManagementRequestConfig('${spec.collection}');`,
          'const offset = ref(0);',
          ...(bool(args, 'selectable') ? ['const selectedId = ref<string>();'] : []),
          `const data = ref<${spec.pageType}>();`,
          'const error = ref<Error | null>(null);',
          'const isLoading = ref(false);',
          '',
          '// Any data layer works here, such as TanStack Query; this one is a plain watch.',
          'watch(',
          '  offset,',
          '  async (next: number) => {',
          '    isLoading.value = true;',
          '    try {',
          `      data.value = await ${spec.pageFunction}({...config, limit: ${num(args, 'limit')}, offset: next});`,
          '      error.value = null;',
          '    } catch (caught) {',
          '      error.value = caught as Error;',
          '    } finally {',
          '      isLoading.value = false;',
          '    }',
          '  },',
          '  {immediate: true},',
          ');',
        ],
        template: tpl(spec.baseTag, omit(shared, 'limit'), {
          extra: [
            `:${spec.rowsProp}="data?.${spec.rowsKey} ?? []"`,
            ':is-loading="isLoading"',
            ':error="error?.message ?? null"',
            ...(bool(args, 'paginated')
              ? [
                  `:limit="${num(args, 'limit')}"`,
                  ':offset="offset"',
                  ':total-results="data?.totalResults"',
                  '@page-change="(next) => (offset = next)"',
                ]
              : []),
            ...extra,
          ],
        }),
        vueImports: ['ref', 'watch'],
      };
    },
    controls: [
      SOURCE_CONTROL,
      ...titleControls,
      {control: 'bool', description: 'Makes rows selectable (`@select`).', name: 'selectable', type: 'boolean'},
      {control: 'bool', description: 'Base only: pages the rows (`@page-change`).', name: 'paginated', type: 'boolean'},
      {control: 'number', description: 'Page size.', name: 'limit', type: 'number'},
      ...baseStateControls,
    ],
    defaults: {
      description: '',
      error: '',
      isLoading: false,
      limit: 20,
      paginated: false,
      selectable: true,
      source: 'base',
      title: '',
    },
    group: 'Admin',
    id: spec.id,
    live: true,
    name: spec.name,
    render: (args: Args, action: Action): VNode =>
      narrow(
        720,
        h(ListHost, {
          action,
          attrs: {
            ...heading(args),
            ...(isLive(args) ? {} : {error: str(args, 'error') || null, isLoading: bool(args, 'isLoading')}),
          },
          is: isLive(args) ? spec.live : spec.base,
          key: `${str(args, 'source')}-${num(args, 'limit')}`,
          limit: Math.max(1, num(args, 'limit')),
          paginated: bool(args, 'paginated'),
          rows: isLive(args) ? undefined : spec.rows,
          rowsProp: spec.rowsProp,
          selectable: bool(args, 'selectable'),
          selectedProp: spec.selectedProp,
        }),
      ),
    stories: [
      {id: 'base', name: 'Sample page'},
      {args: {limit: 2, paginated: true}, id: 'paginated', name: 'Paginated'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {error: 'You do not have permission to view this list.'}, id: 'error', name: 'With error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (management API)'},
    ],
  };
};

interface CreateSpec {
  base: Component;
  baseTag: string;
  /** Extra props the Base form needs, such as the user types to choose from. */
  baseAttrs?: Record<string, unknown>;
  baseCode?: {binding: string; script: string};
  id: string;
  live: Component;
  liveTag: string;
  name: string;
  /** What the created resource is called in the generated handler. */
  noun: string;
}

const createStory = (spec: CreateSpec): ComponentDef => ({
  code: (args: Args): Snippet => {
    const shared: Args = omit(args, 'source', 'cancellable', 'isSubmitting', 'error', 'ouId');
    const cancel: string[] = bool(args, 'cancellable') ? ['@cancel="handleCancel"'] : [];
    const cancelScript: string[] = bool(args, 'cancellable') ? handler('handleCancel') : [];

    if (isLive(args)) {
      return {
        imports: [spec.liveTag, spec.noun],
        script: [`const handleCreated = (${spec.noun.toLowerCase()}: ${spec.noun}): void => {};`, ...cancelScript],
        template: tpl(
          spec.liveTag,
          {...shared, ouId: str(args, 'ouId')},
          {extra: ['@created="handleCreated"', ...cancel]},
        ),
      };
    }

    return {
      imports: [spec.baseTag],
      script: [
        ...(spec.baseCode ? [spec.baseCode.script] : []),
        'const handleSubmit = (submission: Record<string, unknown>): void => {};',
        ...cancelScript,
      ],
      template: tpl(spec.baseTag, omit(args, 'source', 'cancellable', 'ouId'), {
        extra: [...(spec.baseCode ? [spec.baseCode.binding] : []), '@submit="handleSubmit"', ...cancel],
      }),
    };
  },
  controls: [
    SOURCE_CONTROL,
    ...titleControls,
    {control: 'bool', description: 'Shows a cancel button (`@cancel`).', name: 'cancellable', type: 'boolean'},
    {control: 'bool', description: 'Base only: shows the busy state.', name: 'isSubmitting', type: 'boolean'},
    {control: 'text', description: 'Base only: form error, already translated.', name: 'error', type: 'string'},
    {
      control: 'text',
      description: "Live only: organization unit; empty uses the signed-in user's.",
      name: 'ouId',
      type: 'string',
    },
  ],
  defaults: {cancellable: true, description: '', error: '', isSubmitting: false, ouId: '', source: 'base', title: ''},
  group: 'Admin',
  id: spec.id,
  live: true,
  name: spec.name,
  render: (args: Args, action: Action): VNode => {
    const onCancel: (() => void) | undefined = bool(args, 'cancellable') ? (): void => action('cancel') : undefined;

    return narrow(
      440,
      isLive(args)
        ? h(spec.live, {
            ...heading(args),
            onCancel,
            onCreated: (created: {id: string}) => action('created', quoted(created.id)),
            ouId: str(args, 'ouId') || undefined,
          })
        : h(spec.base, {
            ...heading(args),
            ...spec.baseAttrs,
            error: str(args, 'error') || null,
            isSubmitting: bool(args, 'isSubmitting'),
            onCancel,
            onSubmit: (submission: Record<string, unknown>) =>
              action('submit', JSON.stringify(submission).replace(/"password":"[^"]*"/, '"password":"•••"')),
          }),
    );
  },
  stories: [
    {id: 'base', name: 'Form'},
    {args: {isSubmitting: true}, id: 'submitting', name: 'Submitting'},
    {args: {error: 'A resource with this name already exists.'}, id: 'error', name: 'With error'},
    {args: {source: 'live'}, id: 'live', name: 'Live (creates on the server)'},
  ],
});

/** A live story that needs a resource ID: the Controls value, else the first one the server lists. */
const idControl = (name: string, noun: string): PropControl => ({
  control: 'text',
  description: `Live only: the ${noun} to show; empty picks the first ${noun} on the server.`,
  name,
  type: 'string',
});

const firstOf =
  <T extends {id: string}>(key: string) =>
  (data: unknown): string | undefined =>
    ((data as Record<string, T[] | undefined> | undefined)?.[key] ?? [])[0]?.id;

export const ADMIN_COMPONENTS: ComponentDef[] = [
  {
    code: (args: Args): Snippet => ({
      imports: ['DataTable', 'DataTableColumn'],
      script: [
        'interface Member {id: string; name: string; role: string}',
        '',
        'const columns: DataTableColumn<Member>[] = [',
        "  {header: 'Name', id: 'name', render: (row) => row.name},",
        "  {header: 'Role', id: 'role', render: (row) => row.role},",
        '];',
        `const rows: Member[] = [${literal({id: 'm1', name: 'Liam Chen', role: 'Administrator'})}];`,
        ...(bool(args, 'selectable') ? ['const selectedId = ref<string>();'] : []),
        ...(bool(args, 'paginated') ? ['const offset = ref(0);'] : []),
      ],
      template: tpl('DataTable', omit(args, 'selectable', 'paginated', 'empty', 'limit'), {
        extra: [
          ':columns="columns"',
          ':rows="rows"',
          ':get-row-id="(row) => row.id"',
          ...(bool(args, 'selectable')
            ? [':selected-row-id="selectedId"', '@row-click="(row) => (selectedId = row.id)"']
            : []),
          ...(bool(args, 'paginated')
            ? [
                `:pagination="{limit: ${num(args, 'limit')}, offset, total: rows.length, onChange: (next) => (offset = next)}"`,
              ]
            : []),
        ],
      }),
      vueImports: bool(args, 'selectable') || bool(args, 'paginated') ? ['ref'] : [],
    }),
    controls: [
      {
        control: 'text',
        description: 'Accessible name of the table, already translated.',
        name: 'caption',
        type: 'string',
      },
      {control: 'text', description: 'Shown when there are no rows.', name: 'emptyText', type: 'string'},
      {control: 'bool', description: 'Playground only: renders no rows.', name: 'empty', type: 'boolean'},
      {control: 'bool', description: 'Sets `onRowClick`, making rows selectable.', name: 'selectable', type: 'boolean'},
      {control: 'bool', description: 'Sets `pagination`.', name: 'paginated', type: 'boolean'},
      {control: 'number', description: 'Page size when paginated.', name: 'limit', type: 'number'},
      {control: 'bool', description: 'Shows the loading row.', name: 'isLoading', type: 'boolean'},
      {control: 'text', description: 'Error shown above the table.', name: 'error', type: 'string'},
    ],
    defaults: {
      caption: 'Team members',
      empty: false,
      emptyText: 'No members yet.',
      error: '',
      isLoading: false,
      limit: 2,
      paginated: false,
      selectable: true,
    },
    group: 'Primitives',
    id: 'datatable',
    name: 'DataTable',
    render: (args: Args, action: Action): VNode => narrow(640, h(DataTableHost, {action, args})),
    stories: [
      {id: 'playground', name: 'Selectable rows'},
      {args: {paginated: true}, id: 'paginated', name: 'Paginated'},
      {args: {empty: true}, id: 'empty', name: 'Empty'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {error: 'The list could not be loaded.'}, id: 'error', name: 'With error'},
    ],
  },
  {
    code: (args: Args): Snippet => ({
      imports: ['Attribution'],
      template: tpl('Attribution', args, {defaults: {appearance: 'inline', variant: 'secured'}}),
    }),
    controls: [
      {
        control: ['inline', 'ribbon'],
        description: 'A line of text, or a ribbon on the edge of a `position: relative` card.',
        name: 'appearance',
        type: "'inline' | 'ribbon'",
      },
      {
        control: ['secured', 'powered'],
        description: 'Wording of the credit.',
        name: 'variant',
        type: "'secured' | 'powered'",
      },
      {control: 'text', description: 'Makes the credit a link opened in a new tab.', name: 'href', type: 'string'},
    ],
    defaults: {appearance: 'inline', href: '', variant: 'secured'},
    group: 'Branding',
    id: 'attribution',
    name: 'Attribution',
    render: (args: Args): VNode => {
      const credit: VNode = h(Attribution, {
        appearance: str(args, 'appearance'),
        href: str(args, 'href') || undefined,
        variant: str(args, 'variant'),
      });

      if (str(args, 'appearance') !== 'ribbon') return credit;

      return h('div', {style: {maxWidth: '100%', overflow: 'hidden', position: 'relative', width: '360px'}}, [
        h(
          Card,
          {variant: 'outlined'},
          {
            default: () =>
              h('div', {style: {padding: '48px 24px', textAlign: 'center'}}, [
                h(Typography, {variant: 'h6'}, {default: text('Sign in to Acme')}),
              ]),
          },
        ),
        credit,
      ]);
    },
    stories: [
      {id: 'inline', name: 'Inline (secured by)'},
      {args: {variant: 'powered'}, id: 'powered', name: 'Inline (powered by)'},
      {args: {appearance: 'ribbon'}, id: 'ribbon', name: 'Ribbon on a card'},
      {args: {href: 'https://thunderid.dev'}, id: 'link', name: 'As a link'},
    ],
  },
  listStory({
    base: BaseUserList,
    baseTag: 'BaseUserList',
    id: 'userlist',
    live: UserList,
    liveTag: 'UserList',
    name: 'UserList',
    collection: 'users',
    pageFunction: 'getUsers',
    pageType: 'ManagedUserListResponse',
    rows: SAMPLE_USERS,
    rowsKey: 'users',
    rowsProp: 'users',
    selectedProp: 'selectedUserId',
  }),
  createStory({
    base: BaseUserCreate,
    baseAttrs: {userTypes: TYPE_OPTIONS},
    baseCode: {binding: ':user-types="userTypes"', script: `const userTypes = ${literal(TYPE_OPTIONS)};`},
    baseTag: 'BaseUserCreate',
    id: 'usercreate',
    live: UserCreate,
    liveTag: 'UserCreate',
    name: 'UserCreate',
    noun: 'ManagedUser',
  }),
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: ['UserDetails'],
            script: handler('handleDeleted'),
            template: tpl(
              'UserDetails',
              omit(args, 'source', 'isLoading', 'error', 'userId', 'status', 'emailVerified', 'linkSent'),
              {
                defaults: {administrationMode: 'native'},
                extra: [`user-id="${str(args, 'userId') || SAMPLE_USERS[0].id}"`, '@deleted="handleDeleted"'],
              },
            ),
          }
        : {
            imports: [
              ...(bool(args, 'lifecycleActions') ? ['AccountLifecycleAction'] : []),
              'BaseUserDetails',
              'getUser',
              'getUserGroups',
              'ManagedUser',
              'MembershipGroupListResponse',
              ...(bool(args, 'attributeVerification') ? ['SendUserAttributeVerificationResult'] : []),
              'useManagementRequestConfig',
            ],
            script: [
              "const config = useManagementRequestConfig('users');",
              `const userId = '${SAMPLE_USERS[0].id}';`,
              'const user = ref<ManagedUser>();',
              'const groups = ref<MembershipGroupListResponse>();',
              'const isLoading = ref(true);',
              '',
              'onMounted(async () => {',
              '  [user.value, groups.value] = await Promise.all([',
              '    getUser({...config, userId}),',
              '    getUserGroups({...config, userId}),',
              '  ]);',
              '  isLoading.value = false;',
              '});',
              ...(bool(args, 'editable')
                ? ['const handleUpdate = (attributes: Record<string, unknown>): void => {};']
                : []),
              ...(bool(args, 'deletable') ? handler('handleDelete') : []),
              ...(bool(args, 'lifecycleActions')
                ? ['const handleLifecycleAction = (action: AccountLifecycleAction, operatorNote?: string): void => {};']
                : []),
              ...(bool(args, 'attributeVerification')
                ? [
                    'const sentVerification = ref<SendUserAttributeVerificationResult | null>(null);',
                    'const handleSendVerification = (attribute: string): void => {};',
                  ]
                : []),
            ],
            template: tpl(
              'BaseUserDetails',
              {isLoading: false},
              {
                extra: [
                  ':user="user"',
                  ':groups="groups?.groups ?? []"',
                  ':is-loading="isLoading"',
                  ...(bool(args, 'editable') ? ['@update="handleUpdate"'] : []),
                  ...(bool(args, 'deletable') ? ['@delete="handleDelete"'] : []),
                  ...(bool(args, 'lifecycleActions')
                    ? [`:lifecycle-actions="['unlock', 'suspend']"`, '@lifecycle-action="handleLifecycleAction"']
                    : []),
                  ...(bool(args, 'attributeVerification')
                    ? ['@send-verification="handleSendVerification"', ':sent-verification="sentVerification"']
                    : []),
                ],
              },
            ),
            vueImports: ['onMounted', 'ref'],
          },
    controls: [
      SOURCE_CONTROL,
      {control: 'bool', description: 'Lets text attributes be edited (`@update`).', name: 'editable', type: 'boolean'},
      {
        control: 'bool',
        description: 'Shows the delete action (`@delete` / `@deleted`).',
        name: 'deletable',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: 'Offers suspend, unsuspend and unlock through the configured administration flows.',
        name: 'lifecycleActions',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: "Offers a verification link for the user's unverified email (`@send-verification`).",
        name: 'attributeVerification',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: "Whether the sample user's email is verified (base only).",
        name: 'emailVerified',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: 'Shows the message for a sent verification link (`sentVerification`, base only).',
        name: 'linkSent',
        type: 'boolean',
      },
      {
        control: ['ACTIVE', 'LOCKED', 'SUSPENDED'],
        description: "The sample user's access status, which decides the lifecycle actions offered (base only).",
        name: 'status',
        type: "'ACTIVE' | 'LOCKED' | 'SUSPENDED'",
      },
      {
        control: ['native', 'flow'],
        description: 'How the delete runs: the management API, or the configured user deletion flow (live only).',
        name: 'administrationMode',
        type: "'native' | 'flow'",
      },
      idControl('userId', 'user'),
      ...baseStateControls,
    ],
    defaults: {
      administrationMode: 'native',
      attributeVerification: true,
      deletable: true,
      editable: true,
      emailVerified: false,
      error: '',
      isLoading: false,
      lifecycleActions: true,
      linkSent: false,
      source: 'base',
      status: 'LOCKED',
      userId: '',
    },
    group: 'Admin',
    id: 'userdetails',
    live: true,
    name: 'UserDetails',
    render: (args: Args, action: Action): VNode =>
      narrow(
        640,
        isLive(args)
          ? h(FirstResource, {
              explicit: str(args, 'userId'),
              noun: 'user',
              pick: firstOf<ManagedUser>('users'),
              query: () => useApiQuery(() => getUsers({...useManagementRequestConfig('users'), limit: 1})),
              render: (userId: string): VNode =>
                h(UserDetails, {
                  administrationMode: str(args, 'administrationMode') as AdministrationMode,
                  attributeVerification: bool(args, 'attributeVerification'),
                  deletable: bool(args, 'deletable'),
                  editable: bool(args, 'editable'),
                  key: userId,
                  lifecycleActions: bool(args, 'lifecycleActions'),
                  onDeleted: () => action('deleted', quoted(userId)),
                  userId,
                }),
            })
          : h(BaseUserDetails, {
              error: str(args, 'error') || null,
              groups: SAMPLE_MEMBERSHIPS,
              isLoading: bool(args, 'isLoading'),
              lifecycleActions: getAccountLifecycleActions(
                'user',
                str(args, 'status') as AccessStatusValue,
                ALL_USER_LIFECYCLE_FLOWS,
              ),
              onDelete: bool(args, 'deletable') ? (): void => action('delete', quoted(SAMPLE_USERS[0].id)) : undefined,
              onLifecycleAction: bool(args, 'lifecycleActions')
                ? (lifecycleAction: AccountLifecycleAction, operatorNote?: string): void =>
                    action('lifecycle-action', operatorNote ? `${lifecycleAction}: ${operatorNote}` : lifecycleAction)
                : undefined,
              onSendVerification: bool(args, 'attributeVerification')
                ? (attribute: string): void => action('send-verification', quoted(attribute))
                : undefined,
              onUpdate: bool(args, 'editable')
                ? (attributes: Record<string, unknown>): void => action('update', JSON.stringify(attributes))
                : undefined,
              sentVerification: bool(args, 'linkSent')
                ? {channel: 'email', emailSent: true, maskedDestination: 'l•••@acme.io'}
                : null,
              user: {
                ...SAMPLE_USERS[0],
                status: {value: str(args, 'status') as AccessStatusValue},
                verifiedAttributes: bool(args, 'emailVerified') ? {email: {verifiedAt: '2026-11-03T10:00:00Z'}} : {},
              },
            }),
      ),
    stories: [
      {id: 'base', name: 'Sample user'},
      {
        args: {attributeVerification: false, deletable: false, editable: false, lifecycleActions: false},
        id: 'readonly',
        name: 'Read only',
      },
      {args: {linkSent: true}, id: 'verification-sent', name: 'Verification link sent'},
      {args: {emailVerified: true}, id: 'email-verified', name: 'Email verified'},
      {args: {status: 'SUSPENDED'}, id: 'suspended', name: 'Suspended'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {source: 'live'}, id: 'live', name: 'Live (first user)'},
      {args: {administrationMode: 'flow', source: 'live'}, id: 'live-flows', name: 'Live through administration flows'},
    ],
  },
  listStory({
    base: BaseGroupList,
    baseTag: 'BaseGroupList',
    id: 'grouplist',
    live: GroupList,
    liveTag: 'GroupList',
    name: 'GroupList',
    collection: 'groups',
    pageFunction: 'getGroups',
    pageType: 'GroupListResponse',
    rows: SAMPLE_GROUPS,
    rowsKey: 'groups',
    rowsProp: 'groups',
    selectedProp: 'selectedGroupId',
  }),
  createStory({
    base: BaseGroupCreate,
    baseTag: 'BaseGroupCreate',
    id: 'groupcreate',
    live: GroupCreate,
    liveTag: 'GroupCreate',
    name: 'GroupCreate',
    noun: 'Group',
  }),
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: ['GroupMembers'],
            template: tpl('GroupMembers', omit(args, 'source', 'isLoading', 'isMutating', 'error', 'groupId', 'ouId'), {
              extra: [
                `group-id="${str(args, 'groupId') || SAMPLE_GROUPS[0].id}"`,
                ...(str(args, 'ouId') ? [`ou-id="${str(args, 'ouId')}"`] : []),
              ],
            }),
          }
        : {
            imports: ['BaseGroupMembers', 'GroupMember', 'IdentityCandidate'],
            script: [
              `const members: GroupMember[] = ${literal(SAMPLE_MEMBERS.slice(0, 1))};`,
              ...(bool(args, 'editable')
                ? [
                    `const candidates: Record<string, IdentityCandidate[]> = {user: ${literal(CANDIDATES.user.slice(0, 1))}};`,
                    "const handleAdd = (member: Pick<GroupMember, 'id' | 'type'>): void => {};",
                    'const handleRemove = (member: GroupMember): void => {};',
                  ]
                : []),
            ],
            template: tpl('BaseGroupMembers', omit(args, 'source', 'editable', 'groupId', 'ouId'), {
              extra: [
                ':members="members"',
                ...(bool(args, 'editable')
                  ? [':candidates="candidates"', '@add="handleAdd"', '@remove="handleRemove"']
                  : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      ...titleControls,
      {control: 'bool', description: 'Shows the add form and remove buttons.', name: 'editable', type: 'boolean'},
      idControl('groupId', 'group'),
      {
        control: 'text',
        description: 'Live only: the organization unit the add form lists from.',
        name: 'ouId',
        type: 'string',
      },
      {control: 'bool', description: 'Base only: an add or remove is in flight.', name: 'isMutating', type: 'boolean'},
      ...baseStateControls,
    ],
    defaults: {
      description: '',
      editable: true,
      error: '',
      groupId: '',
      isLoading: false,
      isMutating: false,
      ouId: '',
      source: 'base',
      title: '',
    },
    group: 'Admin',
    id: 'groupmembers',
    live: true,
    name: 'GroupMembers',
    render: (args: Args, action: Action): VNode =>
      narrow(
        640,
        isLive(args)
          ? h(FirstResource, {
              explicit: str(args, 'groupId'),
              noun: 'group',
              pick: firstOf<Group>('groups'),
              query: () => useApiQuery(() => getGroups({...useManagementRequestConfig('groups'), limit: 1})),
              render: (groupId: string): VNode =>
                h(GroupMembers, {
                  ...heading(args),
                  editable: bool(args, 'editable'),
                  groupId,
                  key: groupId,
                  ouId: str(args, 'ouId') || undefined,
                }),
            })
          : h(BaseGroupMembers, {
              ...heading(args),
              candidates: bool(args, 'editable') ? CANDIDATES : undefined,
              error: str(args, 'error') || null,
              isLoading: bool(args, 'isLoading'),
              isMutating: bool(args, 'isMutating'),
              members: SAMPLE_MEMBERS,
              onAdd: bool(args, 'editable')
                ? (member: Pick<GroupMember, 'id' | 'type'>): void => action('add', JSON.stringify(member))
                : undefined,
              onRemove: bool(args, 'editable')
                ? (member: GroupMember): void => action('remove', JSON.stringify(member))
                : undefined,
            }),
      ),
    stories: [
      {id: 'base', name: 'Editable'},
      {args: {editable: false}, id: 'readonly', name: 'Read only'},
      {args: {isMutating: true}, id: 'mutating', name: 'Saving'},
      {args: {source: 'live'}, id: 'live', name: 'Live (first group)'},
    ],
  },
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: ['GroupDetails'],
            script: handler('handleDeleted'),
            template: tpl('GroupDetails', omit(args, 'source', 'isLoading', 'error', 'groupId'), {
              defaults: {administrationMode: 'native'},
              extra: [`group-id="${str(args, 'groupId') || SAMPLE_GROUPS[0].id}"`, '@deleted="handleDeleted"'],
            }),
          }
        : {
            imports: ['BaseGroupDetails', 'Group', 'GroupMembers', 'getGroup', 'useManagementRequestConfig'],
            script: [
              "const config = useManagementRequestConfig('groups');",
              `const groupId = '${SAMPLE_GROUPS[0].id}';`,
              'const group = ref<Group>();',
              'const isLoading = ref(true);',
              '',
              'onMounted(async () => {',
              '  group.value = await getGroup({...config, groupId});',
              '  isLoading.value = false;',
              '});',
              ...(bool(args, 'deletable') ? handler('handleDelete') : []),
            ],
            template: tpl(
              'BaseGroupDetails',
              {},
              {
                children: `
  <template #members>
    <GroupMembers v-if="group" :group-id="group.id" :ou-id="group.ouId" />
  </template>
`,
                extra: [
                  ':group="group"',
                  ':is-loading="isLoading"',
                  ...(bool(args, 'deletable') ? ['@delete="handleDelete"'] : []),
                ],
              },
            ),
            vueImports: ['onMounted', 'ref'],
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'bool',
        description: 'Live: lets admins add and remove members. Base: the sample members view.',
        name: 'editable',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: 'Shows the delete action (`@delete` / `@deleted`).',
        name: 'deletable',
        type: 'boolean',
      },
      {
        control: ['native', 'flow'],
        description:
          'How the delete and member removals run: the management API, or the configured administration flows (live only).',
        name: 'administrationMode',
        type: "'native' | 'flow'",
      },
      idControl('groupId', 'group'),
      ...baseStateControls,
    ],
    defaults: {
      administrationMode: 'native',
      deletable: true,
      editable: true,
      error: '',
      isLoading: false,
      groupId: '',
      source: 'base',
    },
    group: 'Admin',
    id: 'groupdetails',
    live: true,
    name: 'GroupDetails',
    render: (args: Args, action: Action): VNode =>
      narrow(
        640,
        isLive(args)
          ? h(FirstResource, {
              explicit: str(args, 'groupId'),
              noun: 'group',
              pick: firstOf<Group>('groups'),
              query: () => useApiQuery(() => getGroups({...useManagementRequestConfig('groups'), limit: 1})),
              render: (groupId: string): VNode =>
                h(GroupDetails, {
                  administrationMode: str(args, 'administrationMode') as AdministrationMode,
                  deletable: bool(args, 'deletable'),
                  editable: bool(args, 'editable'),
                  key: groupId,
                  onDeleted: () => action('deleted', quoted(groupId)),
                  groupId,
                }),
            })
          : h(
              BaseGroupDetails,
              {
                error: str(args, 'error') || null,
                isLoading: bool(args, 'isLoading'),
                onDelete: bool(args, 'deletable')
                  ? (): void => action('delete', quoted(SAMPLE_GROUPS[0].id))
                  : undefined,
                group: SAMPLE_GROUPS[0],
              },
              {
                members: (): VNode =>
                  h(BaseGroupMembers, {
                    candidates: bool(args, 'editable') ? CANDIDATES : undefined,
                    members: SAMPLE_MEMBERS,
                    onAdd: bool(args, 'editable')
                      ? (member: Pick<GroupMember, 'id' | 'type'>): void => action('add', JSON.stringify(member))
                      : undefined,
                    onRemove: bool(args, 'editable')
                      ? (member: GroupMember): void => action('remove', JSON.stringify(member))
                      : undefined,
                  }),
              },
            ),
      ),
    stories: [
      {id: 'base', name: 'Sample group'},
      {args: {deletable: false, editable: false}, id: 'readonly', name: 'Read only'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {source: 'live'}, id: 'live', name: 'Live (first group)'},
      {args: {administrationMode: 'flow', source: 'live'}, id: 'live-flows', name: 'Live through administration flows'},
    ],
  },
  listStory({
    base: BaseRoleList,
    baseTag: 'BaseRoleList',
    id: 'rolelist',
    live: RoleList,
    liveTag: 'RoleList',
    name: 'RoleList',
    collection: 'roles',
    pageFunction: 'getRoles',
    pageType: 'RoleListResponse',
    rows: SAMPLE_ROLES,
    rowsKey: 'roles',
    rowsProp: 'roles',
    selectedProp: 'selectedRoleId',
  }),
  createStory({
    base: BaseRoleCreate,
    baseTag: 'BaseRoleCreate',
    id: 'rolecreate',
    live: RoleCreate,
    liveTag: 'RoleCreate',
    name: 'RoleCreate',
    noun: 'Role',
  }),
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: ['RoleAssignments'],
            template: tpl(
              'RoleAssignments',
              omit(args, 'source', 'isLoading', 'isMutating', 'error', 'roleId', 'ouId'),
              {
                extra: [
                  `role-id="${str(args, 'roleId') || SAMPLE_ROLES[0].id}"`,
                  ...(str(args, 'ouId') ? [`ou-id="${str(args, 'ouId')}"`] : []),
                ],
              },
            ),
          }
        : {
            imports: ['BaseRoleAssignments', 'IdentityCandidate', 'RoleAssignment', 'RoleAssignmentInput'],
            script: [
              `const assignments: RoleAssignment[] = ${literal(SAMPLE_ASSIGNMENTS.slice(0, 1))};`,
              ...(bool(args, 'editable')
                ? [
                    `const candidates: Record<string, IdentityCandidate[]> = {user: ${literal(CANDIDATES.user.slice(0, 1))}};`,
                    'const handleAssign = (assignment: RoleAssignmentInput): void => {};',
                    'const handleUnassign = (assignment: RoleAssignment): void => {};',
                  ]
                : []),
            ],
            template: tpl('BaseRoleAssignments', omit(args, 'source', 'editable', 'roleId', 'ouId'), {
              extra: [
                ':assignments="assignments"',
                ...(bool(args, 'editable')
                  ? [':candidates="candidates"', '@assign="handleAssign"', '@unassign="handleUnassign"']
                  : []),
              ],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      ...titleControls,
      {control: 'bool', description: 'Shows the assign form and remove buttons.', name: 'editable', type: 'boolean'},
      idControl('roleId', 'role'),
      {
        control: 'text',
        description: 'Live only: the organization unit the assign form lists from.',
        name: 'ouId',
        type: 'string',
      },
      {
        control: 'bool',
        description: 'Base only: an assign or unassign is in flight.',
        name: 'isMutating',
        type: 'boolean',
      },
      ...baseStateControls,
    ],
    defaults: {
      description: '',
      editable: true,
      error: '',
      isLoading: false,
      isMutating: false,
      ouId: '',
      roleId: '',
      source: 'base',
      title: '',
    },
    group: 'Admin',
    id: 'roleassignments',
    live: true,
    name: 'RoleAssignments',
    render: (args: Args, action: Action): VNode =>
      narrow(
        640,
        isLive(args)
          ? h(FirstResource, {
              explicit: str(args, 'roleId'),
              noun: 'role',
              pick: firstOf<RoleSummary>('roles'),
              query: () => useApiQuery(() => getRoles({...useManagementRequestConfig('roles'), limit: 1})),
              render: (roleId: string): VNode =>
                h(RoleAssignments, {
                  ...heading(args),
                  editable: bool(args, 'editable'),
                  key: roleId,
                  ouId: str(args, 'ouId') || undefined,
                  roleId,
                }),
            })
          : h(BaseRoleAssignments, {
              ...heading(args),
              assignments: SAMPLE_ASSIGNMENTS,
              candidates: bool(args, 'editable') ? CANDIDATES : undefined,
              error: str(args, 'error') || null,
              isLoading: bool(args, 'isLoading'),
              isMutating: bool(args, 'isMutating'),
              onAssign: bool(args, 'editable')
                ? (assignment: RoleAssignmentInput): void => action('assign', JSON.stringify(assignment))
                : undefined,
              onUnassign: bool(args, 'editable')
                ? (assignment: RoleAssignment): void => action('unassign', JSON.stringify(assignment))
                : undefined,
            }),
      ),
    stories: [
      {id: 'base', name: 'Editable'},
      {args: {editable: false}, id: 'readonly', name: 'Read only'},
      {args: {error: 'The assignments could not be saved.'}, id: 'error', name: 'With error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (first role)'},
    ],
  },
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: ['RolePermissions'],
            template: tpl('RolePermissions', omit(args, 'source', 'isLoading', 'error', 'roleId', 'named'), {
              extra: [
                `role-id="${str(args, 'roleId') || SAMPLE_ROLES[0].id}"`,
                ...(bool(args, 'named') ? [':resource-server-names="names"'] : []),
              ],
            }),
            script: bool(args, 'named') ? [`const names = ${literal(RESOURCE_SERVER_NAMES)};`] : [],
          }
        : {
            imports: ['BaseRolePermissions', 'getRole', 'Role', 'useManagementRequestConfig'],
            script: [
              "const config = useManagementRequestConfig('roles');",
              'const role = ref<Role>();',
              'const isLoading = ref(true);',
              '',
              'onMounted(async () => {',
              `  role.value = await getRole({...config, roleId: '${SAMPLE_ROLES[0].id}'});`,
              '  isLoading.value = false;',
              '});',
              ...(bool(args, 'named') ? [`const names = ${literal(RESOURCE_SERVER_NAMES)};`] : []),
            ],
            template: tpl('BaseRolePermissions', omit(args, 'source', 'roleId', 'named', 'isLoading', 'editable'), {
              extra: [
                ':permissions="role?.permissions ?? []"',
                ':is-loading="isLoading"',
                ...(bool(args, 'named') ? [':resource-server-names="names"'] : []),
              ],
            }),
            vueImports: ['onMounted', 'ref'],
          },
    controls: [
      SOURCE_CONTROL,
      ...titleControls,
      {
        control: 'bool',
        description: 'Passes `resourceServerNames`; IDs are shown otherwise.',
        name: 'named',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: 'Adds the resource server and permission picker, and remove buttons that ask first.',
        name: 'editable',
        type: 'boolean',
      },
      idControl('roleId', 'role'),
      ...baseStateControls,
    ],
    defaults: {
      description: '',
      editable: false,
      error: '',
      isLoading: false,
      named: true,
      roleId: '',
      source: 'base',
      title: '',
    },
    group: 'Admin',
    id: 'rolepermissions',
    live: true,
    name: 'RolePermissions',
    render: (args: Args, action: Action): VNode => {
      const names: Record<string, string> | undefined = bool(args, 'named') ? RESOURCE_SERVER_NAMES : undefined;
      const editable: boolean = bool(args, 'editable');

      return narrow(
        640,
        isLive(args)
          ? h(FirstResource, {
              explicit: str(args, 'roleId'),
              noun: 'role',
              pick: firstOf<RoleSummary>('roles'),
              query: () => useApiQuery(() => getRoles({...useManagementRequestConfig('roles'), limit: 1})),
              render: (roleId: string): VNode =>
                h(RolePermissions, {
                  ...heading(args),
                  editable,
                  key: `${roleId}:${String(editable)}`,
                  resourceServerNames: names,
                  roleId,
                }),
            })
          : h(BaseRolePermissions, {
              ...heading(args),
              availablePermissions: {
                rs_booking: [
                  {name: 'Read', permission: 'booking:read'},
                  {name: 'Cancel', permission: 'booking:cancel'},
                ],
                rs_system: [{name: 'Manage users', permission: 'system:user'}],
              },
              error: str(args, 'error') || null,
              isLoading: bool(args, 'isLoading'),
              onAdd: editable ? (change: unknown): void => action('add', JSON.stringify(change)) : undefined,
              onRemove: editable ? (change: unknown): void => action('remove', JSON.stringify(change)) : undefined,
              onResourceServerSelect: (id: string): void => action('resource-server-select', id),
              permissions: SAMPLE_PERMISSIONS,
              resourceServerNames: names,
              resourceServers: editable
                ? [
                    {id: 'rs_booking', name: 'Booking API'},
                    {id: 'rs_system', name: 'ThunderID system API'},
                  ]
                : undefined,
            }),
      );
    },
    stories: [
      {id: 'base', name: 'Named resource servers'},
      {args: {editable: true}, id: 'editable', name: 'Editable'},
      {args: {named: false}, id: 'ids', name: 'Resource server IDs'},
      {args: {source: 'live'}, id: 'live', name: 'Live (first role)'},
      {args: {editable: true, source: 'live'}, id: 'live-editable', name: 'Live, editable (first role, writes)'},
    ],
  },
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: ['RoleDetails'],
            script: handler('handleDeleted'),
            template: tpl('RoleDetails', omit(args, 'source', 'isLoading', 'error', 'roleId'), {
              defaults: {administrationMode: 'native'},
              extra: [`role-id="${str(args, 'roleId') || SAMPLE_ROLES[1].id}"`, '@deleted="handleDeleted"'],
            }),
          }
        : {
            imports: [
              'BaseRoleDetails',
              'BaseRolePermissions',
              'Role',
              'RoleAssignments',
              'getRole',
              'useManagementRequestConfig',
            ],
            script: [
              "const config = useManagementRequestConfig('roles');",
              `const roleId = '${SAMPLE_ROLES[1].id}';`,
              'const role = ref<Role>();',
              'const isLoading = ref(true);',
              '',
              'onMounted(async () => {',
              '  role.value = await getRole({...config, roleId});',
              '  isLoading.value = false;',
              '});',
              ...(bool(args, 'deletable') ? handler('handleDelete') : []),
            ],
            template: tpl(
              'BaseRoleDetails',
              {},
              {
                children: `
  <template #permissions>
    <BaseRolePermissions :permissions="role?.permissions ?? []" />
  </template>
  <template #assignments>
    <RoleAssignments v-if="role" :role-id="role.id" :ou-id="role.ouId" />
  </template>
`,
                extra: [
                  ':role="role"',
                  ':is-loading="isLoading"',
                  ...(bool(args, 'deletable') ? ['@delete="handleDelete"'] : []),
                ],
              },
            ),
            vueImports: ['onMounted', 'ref'],
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'bool',
        description: 'Live: lets admins assign and unassign the role. Base: the sample assignments view.',
        name: 'editable',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: 'Shows the delete action (`@delete` / `@deleted`).',
        name: 'deletable',
        type: 'boolean',
      },
      {
        control: ['native', 'flow'],
        description:
          'How the delete and unassignments run: the management API, or the configured administration flows (live only).',
        name: 'administrationMode',
        type: "'native' | 'flow'",
      },
      idControl('roleId', 'role'),
      ...baseStateControls,
    ],
    defaults: {
      administrationMode: 'native',
      deletable: true,
      editable: true,
      error: '',
      isLoading: false,
      roleId: '',
      source: 'base',
    },
    group: 'Admin',
    id: 'roledetails',
    live: true,
    name: 'RoleDetails',
    render: (args: Args, action: Action): VNode =>
      narrow(
        640,
        isLive(args)
          ? h(FirstResource, {
              explicit: str(args, 'roleId'),
              noun: 'role',
              pick: firstOf<RoleSummary>('roles'),
              query: () => useApiQuery(() => getRoles({...useManagementRequestConfig('roles'), limit: 1})),
              render: (roleId: string): VNode =>
                h(RoleDetails, {
                  administrationMode: str(args, 'administrationMode') as AdministrationMode,
                  deletable: bool(args, 'deletable'),
                  editable: bool(args, 'editable'),
                  key: roleId,
                  onDeleted: () => action('deleted', quoted(roleId)),
                  roleId,
                }),
            })
          : h(
              BaseRoleDetails,
              {
                error: str(args, 'error') || null,
                isLoading: bool(args, 'isLoading'),
                onDelete: bool(args, 'deletable')
                  ? (): void => action('delete', quoted(SAMPLE_ROLES[1].id))
                  : undefined,
                role: SAMPLE_ROLES[1],
              },
              {
                assignments: (): VNode =>
                  h(BaseRoleAssignments, {
                    assignments: SAMPLE_ASSIGNMENTS,
                    candidates: bool(args, 'editable') ? CANDIDATES : undefined,
                    onAssign: bool(args, 'editable')
                      ? (assignment: RoleAssignmentInput): void => action('assign', JSON.stringify(assignment))
                      : undefined,
                    onUnassign: bool(args, 'editable')
                      ? (assignment: RoleAssignment): void => action('unassign', JSON.stringify(assignment))
                      : undefined,
                  }),
                permissions: (): VNode =>
                  h(BaseRolePermissions, {permissions: SAMPLE_PERMISSIONS, resourceServerNames: RESOURCE_SERVER_NAMES}),
              },
            ),
      ),
    stories: [
      {id: 'base', name: 'Sample role'},
      {args: {deletable: false, editable: false}, id: 'readonly', name: 'Read only'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {source: 'live'}, id: 'live', name: 'Live (first role)'},
      {args: {administrationMode: 'flow', source: 'live'}, id: 'live-flows', name: 'Live through administration flows'},
    ],
  },
  listStory({
    base: BaseAgentList,
    baseTag: 'BaseAgentList',
    id: 'agentlist',
    live: AgentList,
    liveTag: 'AgentList',
    name: 'AgentList',
    collection: 'agents',
    pageFunction: 'getAgents',
    pageType: 'AgentListResponse',
    rows: SAMPLE_AGENTS,
    rowsKey: 'agents',
    rowsProp: 'agents',
    selectedProp: 'selectedAgentId',
  }),
  createStory({
    base: BaseAgentCreate,
    baseAttrs: {agentTypes: AGENT_TYPE_OPTIONS},
    baseCode: {binding: ':agent-types="agentTypes"', script: `const agentTypes = ${literal(AGENT_TYPE_OPTIONS)};`},
    baseTag: 'BaseAgentCreate',
    id: 'agentcreate',
    live: AgentCreate,
    liveTag: 'AgentCreate',
    name: 'AgentCreate',
    noun: 'Agent',
  }),
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: ['AgentDetails'],
            script: handler('handleDeleted'),
            template: tpl('AgentDetails', omit(args, 'source', 'isLoading', 'error', 'agentId'), {
              extra: [`agent-id="${str(args, 'agentId') || SAMPLE_AGENTS[0].id}"`, '@deleted="handleDeleted"'],
            }),
          }
        : {
            imports: [
              'Agent',
              'AgentRoleListResponse',
              'BaseAgentDetails',
              'getAgent',
              'getAgentGroups',
              'getAgentRoles',
              'MembershipGroupListResponse',
              'useManagementRequestConfig',
            ],
            script: [
              "const config = useManagementRequestConfig('agents');",
              `const agentId = '${SAMPLE_AGENTS[0].id}';`,
              'const agent = ref<Agent>();',
              'const groups = ref<MembershipGroupListResponse>();',
              'const roles = ref<AgentRoleListResponse>();',
              'const isLoading = ref(true);',
              '',
              'onMounted(async () => {',
              '  [agent.value, groups.value, roles.value] = await Promise.all([',
              '    getAgent({...config, agentId}),',
              '    getAgentGroups({...config, agentId}),',
              '    getAgentRoles({...config, agentId}),',
              '  ]);',
              '  isLoading.value = false;',
              '});',
              ...(bool(args, 'deletable') ? handler('handleDelete') : []),
            ],
            template: tpl(
              'BaseAgentDetails',
              {},
              {
                extra: [
                  ':agent="agent"',
                  ':groups="groups?.groups ?? []"',
                  ':roles="roles?.roles ?? []"',
                  ':is-loading="isLoading"',
                  ...(bool(args, 'deletable') ? ['@delete="handleDelete"'] : []),
                ],
              },
            ),
            vueImports: ['onMounted', 'ref'],
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'bool',
        description: 'Shows the delete action (`@delete` / `@deleted`).',
        name: 'deletable',
        type: 'boolean',
      },
      idControl('agentId', 'agent'),
      ...baseStateControls,
    ],
    defaults: {agentId: '', deletable: true, error: '', isLoading: false, source: 'base'},
    group: 'Admin',
    id: 'agentdetails',
    live: true,
    name: 'AgentDetails',
    render: (args: Args, action: Action): VNode =>
      narrow(
        640,
        isLive(args)
          ? h(FirstResource, {
              explicit: str(args, 'agentId'),
              noun: 'agent',
              pick: firstOf<BasicAgent>('agents'),
              query: () => useApiQuery(() => getAgents({...useManagementRequestConfig('agents'), limit: 1})),
              render: (agentId: string): VNode =>
                h(AgentDetails, {
                  agentId,
                  deletable: bool(args, 'deletable'),
                  key: agentId,
                  onDeleted: () => action('deleted', quoted(agentId)),
                }),
            })
          : h(BaseAgentDetails, {
              agent: SAMPLE_AGENT,
              error: str(args, 'error') || null,
              groups: SAMPLE_MEMBERSHIPS,
              isLoading: bool(args, 'isLoading'),
              onDelete: bool(args, 'deletable') ? (): void => action('delete', quoted(SAMPLE_AGENT.id)) : undefined,
              roles: ['Administrator', 'Viewer'],
            }),
      ),
    stories: [
      {id: 'base', name: 'Sample agent'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {error: 'The agent could not be deleted.'}, id: 'error', name: 'With error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (first agent)'},
    ],
  },
  listStory({
    base: BaseApplicationList,
    baseTag: 'BaseApplicationList',
    id: 'applicationlist',
    live: ApplicationList,
    liveTag: 'ApplicationList',
    name: 'ApplicationList',
    collection: 'applications',
    pageFunction: 'getApplications',
    pageType: 'ApplicationListResponse',
    rows: SAMPLE_APPLICATIONS,
    rowsKey: 'applications',
    rowsProp: 'applications',
    selectedProp: 'selectedApplicationId',
  }),
  {
    code: (args: Args): Snippet => {
      const shared: Args = omit(args, 'source', 'cancellable', 'isSubmitting', 'error', 'ouId', 'showSecret');
      const cancel: string[] = bool(args, 'cancellable') ? ['@cancel="handleCancel"'] : [];
      const cancelScript: string[] = bool(args, 'cancellable') ? handler('handleCancel') : [];

      if (isLive(args)) {
        return {
          imports: ['ApplicationCreate', 'Application'],
          script: ['const handleCreated = (application: Application): void => {};', ...cancelScript],
          template: tpl(
            'ApplicationCreate',
            {...shared, ouId: str(args, 'ouId')},
            {extra: ['@created="handleCreated"', ...cancel]},
          ),
        };
      }

      return {
        imports: ['ApplicationCreateSubmission', 'BaseApplicationCreate'],
        script: [
          '// Set from the created application, then cleared once the user has copied it.',
          'const clientSecret = ref<string | null>(null);',
          'const handleSubmit = (submission: ApplicationCreateSubmission): void => {};',
          ...cancelScript,
        ],
        template: tpl('BaseApplicationCreate', omit(args, 'source', 'cancellable', 'ouId', 'showSecret'), {
          extra: [
            ':client-secret="clientSecret"',
            '@secret-dismiss="clientSecret = null"',
            '@submit="handleSubmit"',
            ...cancel,
          ],
        }),
        vueImports: ['ref'],
      };
    },
    controls: [
      SOURCE_CONTROL,
      ...titleControls,
      {control: 'bool', description: 'Shows a cancel button (`@cancel`).', name: 'cancellable', type: 'boolean'},
      {control: 'bool', description: 'Base only: shows the busy state.', name: 'isSubmitting', type: 'boolean'},
      {control: 'text', description: 'Base only: form error, already translated.', name: 'error', type: 'string'},
      {
        control: 'bool',
        description: 'Base only: passes clientSecret, so the form gives way to the secret shown once.',
        name: 'showSecret',
        type: 'boolean',
      },
      {
        control: 'text',
        description: "Live only: organization unit; empty uses the signed-in user's.",
        name: 'ouId',
        type: 'string',
      },
    ],
    defaults: {
      cancellable: true,
      description: '',
      error: '',
      isSubmitting: false,
      ouId: '',
      showSecret: false,
      source: 'base',
      title: '',
    },
    group: 'Admin',
    id: 'applicationcreate',
    live: true,
    name: 'ApplicationCreate',
    render: (args: Args, action: Action): VNode => {
      const onCancel: (() => void) | undefined = bool(args, 'cancellable') ? (): void => action('cancel') : undefined;

      return narrow(
        480,
        isLive(args)
          ? h(ApplicationCreate, {
              ...heading(args),
              onCancel,
              onCreated: (created: Application) => action('created', quoted(created.id)),
              ouId: str(args, 'ouId') || undefined,
            })
          : h(BaseApplicationCreate, {
              ...heading(args),
              clientSecret: bool(args, 'showSecret') ? SAMPLE_SECRET : null,
              error: str(args, 'error') || null,
              isSubmitting: bool(args, 'isSubmitting'),
              onCancel,
              onSecretDismiss: (): void => action('secret-dismiss'),
              onSubmit: (submission: Record<string, unknown>) => action('submit', JSON.stringify(submission)),
            }),
      );
    },
    stories: [
      {id: 'base', name: 'Form'},
      {args: {showSecret: true}, id: 'secret', name: 'Client secret shown once'},
      {args: {error: 'An application with this name already exists.'}, id: 'error', name: 'With error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (POST /applications)'},
    ],
  },
  {
    code: (args: Args): Snippet => {
      const flags: string[] = ['editable', 'deletable', 'secretRegenerable'].filter((flag: string) => bool(args, flag));

      if (isLive(args)) {
        return {
          imports: ['ApplicationDetails'],
          script: handler('handleDeleted'),
          template: tpl(
            'ApplicationDetails',
            {},
            {
              extra: [
                `application-id="${str(args, 'applicationId') || SAMPLE_APPLICATIONS[0].id}"`,
                ...flags.map((flag: string) => flag.replace(/[A-Z]/g, (char: string) => `-${char.toLowerCase()}`)),
                '@deleted="handleDeleted"',
              ],
            },
          ),
        };
      }

      return {
        imports: [
          'Application',
          'ApplicationUpdateSubmission',
          'BaseApplicationDetails',
          'getApplication',
          'useManagementRequestConfig',
        ],
        script: [
          "const config = useManagementRequestConfig('applications');",
          `const applicationId = '${SAMPLE_APPLICATIONS[0].id}';`,
          'const application = ref<Application>();',
          'const clientSecret = ref<string | null>(null);',
          'const isLoading = ref(true);',
          '',
          'onMounted(async () => {',
          '  application.value = await getApplication({...config, applicationId});',
          '  isLoading.value = false;',
          '});',
          ...(bool(args, 'editable')
            ? ['const handleUpdate = (changes: ApplicationUpdateSubmission): void => {};']
            : []),
          ...(bool(args, 'deletable') ? handler('handleDelete') : []),
          ...(bool(args, 'secretRegenerable') ? handler('handleRegenerateSecret') : []),
        ],
        template: tpl(
          'BaseApplicationDetails',
          {},
          {
            extra: [
              ':application="application"',
              ':client-secret="clientSecret"',
              ':is-loading="isLoading"',
              ...(bool(args, 'editable') ? ['@update="handleUpdate"'] : []),
              ...(bool(args, 'deletable') ? ['@delete="handleDelete"'] : []),
              ...(bool(args, 'secretRegenerable') ? ['@regenerate-secret="handleRegenerateSecret"'] : []),
              '@secret-dismiss="clientSecret = null"',
            ],
          },
        ),
        vueImports: ['onMounted', 'ref'],
      };
    },
    controls: [
      SOURCE_CONTROL,
      {control: 'bool', description: 'Offers editing (`@update` / `editable`).', name: 'editable', type: 'boolean'},
      {control: 'bool', description: 'Offers deletion (`@delete` / `deletable`).', name: 'deletable', type: 'boolean'},
      {
        control: 'bool',
        description: 'Offers client secret regeneration (`@regenerate-secret` / `secret-regenerable`).',
        name: 'secretRegenerable',
        type: 'boolean',
      },
      {
        control: 'bool',
        description: 'Base only: passes clientSecret, the new secret shown once.',
        name: 'showSecret',
        type: 'boolean',
      },
      idControl('applicationId', 'application'),
      ...baseStateControls,
    ],
    defaults: {
      applicationId: '',
      deletable: true,
      editable: true,
      error: '',
      isLoading: false,
      secretRegenerable: true,
      showSecret: false,
      source: 'base',
    },
    group: 'Admin',
    id: 'applicationdetails',
    live: true,
    name: 'ApplicationDetails',
    render: (args: Args, action: Action): VNode =>
      narrow(
        640,
        isLive(args)
          ? h(FirstResource, {
              explicit: str(args, 'applicationId'),
              noun: 'application',
              pick: firstOf<BasicApplication>('applications'),
              query: () =>
                useApiQuery(() => getApplications({...useManagementRequestConfig('applications'), limit: 1})),
              render: (applicationId: string): VNode =>
                h(ApplicationDetails, {
                  applicationId,
                  deletable: bool(args, 'deletable'),
                  editable: bool(args, 'editable'),
                  key: applicationId,
                  onDeleted: () => action('deleted', quoted(applicationId)),
                  secretRegenerable: bool(args, 'secretRegenerable'),
                }),
            })
          : h(BaseApplicationDetails, {
              application: SAMPLE_APPLICATION,
              clientSecret: bool(args, 'showSecret') ? SAMPLE_SECRET : null,
              error: str(args, 'error') || null,
              isLoading: bool(args, 'isLoading'),
              onDelete: bool(args, 'deletable')
                ? (): void => action('delete', quoted(SAMPLE_APPLICATION.id))
                : undefined,
              onRegenerateSecret: bool(args, 'secretRegenerable')
                ? (): void => action('regenerate-secret', quoted(SAMPLE_APPLICATION.id))
                : undefined,
              onSecretDismiss: (): void => action('secret-dismiss'),
              onUpdate: bool(args, 'editable')
                ? (changes: Record<string, unknown>): void => action('update', JSON.stringify(changes))
                : undefined,
            }),
      ),
    stories: [
      {id: 'base', name: 'Sample application'},
      {
        args: {deletable: false, editable: false, secretRegenerable: false},
        id: 'readonly',
        name: 'Read only',
      },
      {args: {showSecret: true}, id: 'secret', name: 'Regenerated secret'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {error: 'The application could not be deleted.'}, id: 'error', name: 'With error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (first application)'},
    ],
  },
];

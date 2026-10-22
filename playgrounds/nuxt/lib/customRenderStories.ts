// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ManagedUser, MembershipGroup} from '@thunderid/browser';
import type {AdminListRenderProps, BaseGroupCreateRenderProps, BaseUserDetailsRenderProps} from '@thunderid/vue';
import {defineComponent, h, ref, type Component, type PropType, type Ref, type VNode} from 'vue';
import {groupForm, PrimeTheme, userCard, userTable} from './primeRenderers';
import type {Action, Args, ComponentDef, PropControl} from './storyTypes';
import {narrow} from './storyWidgets';
import {BaseGroupCreate, BaseUserDetails, BaseUserList, GroupCreate, UserDetails, UserList} from '#components';

// The admin components are auto-imported by @thunderid/nuxt when thunderid.management is on.

const str = (args: Args, key: string): string => String(args[key] ?? '');
const bool = (args: Args, key: string): boolean => args[key] === true;
const num = (args: Args, key: string): number => Number(args[key] ?? 0);
const quoted = (value: unknown): string => `"${String(value)}"`;

const SOURCE_CONTROL: PropControl = {
  control: ['base', 'live'],
  description:
    'base renders the Base* component with sample data; live renders the container, which fetches through POST /api/auth/management.',
  name: 'source',
  type: "'base' | 'live' (playground only)",
};

// Sample data for the Base components. Nothing here reaches a server.

const OU = 'ou_7d1e';

const SAMPLE_USERS: ManagedUser[] = [
  ['usr_8f2c41', 'Liam Chen', 'liam.chen'],
  ['usr_2b9d07', 'Ava Patel', 'ava.patel'],
  ['usr_c41a55', 'Noah Kim', 'noah.kim'],
  ['usr_5d0e91', 'Mia Rossi', 'mia.rossi'],
  ['usr_a77b20', 'Kofi Mensah', 'kofi.mensah'],
].map(([id, display, username]: string[]) => ({
  attributes: {email: `${username}@acme.io`, username},
  display,
  id,
  ouHandle: 'acme',
  ouId: OU,
  type: 'employee',
}));

const SAMPLE_MEMBERSHIPS: MembershipGroup[] = [
  {id: 'grp_eng', name: 'Engineering', ouId: OU},
  {id: 'grp_sec', name: 'Security', ouId: OU},
];

const isLive = (args: Args): boolean => str(args, 'source') === 'live';

const themed = (width: number, child: VNode): VNode => narrow(width, h(PrimeTheme, null, {default: () => child}));

/** Pages and selects the sample users, the way an application holding the data would. */
const SampleUserTable: Component = defineComponent({
  name: 'SampleUserTable',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    error: {default: null, type: String as PropType<string | null>},
    isLoading: {default: false, type: Boolean},
    limit: {default: 3, type: Number},
  },
  setup(props: {action: Action; error: string | null; isLoading: boolean; limit: number}): () => VNode {
    const offset: Ref<number> = ref(0);
    const selected: Ref<string | undefined> = ref();

    return (): VNode =>
      h(
        BaseUserList,
        {
          error: props.error,
          isLoading: props.isLoading,
          limit: props.limit,
          offset: offset.value,
          onPageChange: (next: number): void => {
            offset.value = next;
            props.action('page-change', String(next));
          },
          onSelect: (user: ManagedUser): void => {
            selected.value = user.id;
            props.action('select', quoted(user.id));
          },
          selectedUserId: selected.value,
          totalResults: SAMPLE_USERS.length,
          users: SAMPLE_USERS.slice(offset.value, offset.value + props.limit),
        },
        {default: (state: AdminListRenderProps<ManagedUser>) => userTable(state)},
      );
  },
});

const TABLE_TEMPLATE = `<UserList :limit="10" @select="(user) => router.push(user.id)">
  <template #default="{users, columns, isLoading, limit, offset, totalResults, onPageChange, onSelect}">
    <DataTable
      :value="users"
      lazy
      paginator
      :rows="limit"
      :first="offset"
      :total-records="totalResults"
      :loading="isLoading"
      selection-mode="single"
      @page="(event) => onPageChange?.(event.first)"
      @row-select="(event) => onSelect?.(event.data)"
    >
      <Column v-for="column in columns" :key="column.id" :field="column.id" :header="column.header">
        <template #body="{data}"><component :is="() => column.render(data)" /></template>
      </Column>
    </DataTable>
  </template>
</UserList>`;

const FORM_TEMPLATE = `<GroupCreate @created="(group) => router.push(group.id)">
  <template #default="{values, handleInputChange, handleSubmit, isValid, isSubmitting, error}">
    <Message v-if="error" severity="error">{{ error }}</Message>
    <InputText :model-value="values.name" @update:model-value="(value) => handleInputChange('name', value)" />
    <Button label="Create group" :disabled="!isValid" :loading="isSubmitting" @click="handleSubmit" />
  </template>
</GroupCreate>`;

const CARD_TEMPLATE = `<UserDetails :user-id="userId" deletable>
  <template #default="{user, displayName, attributes, groups, onDelete}">
    <Card>
      <template #title>{{ displayName }}</template>
      <template #subtitle>{{ user?.type }}</template>
      <template #content>
        <Chip v-for="(value, name) in attributes" :key="name" :label="\`\${name}: \${value}\`" />
        <Chip v-for="group in groups" :key="group.id" :label="group.name" />
      </template>
      <template #footer>
        <Button v-if="onDelete" label="Delete" severity="danger" text @click="onDelete" />
      </template>
    </Card>
  </template>
</UserDetails>`;

/**
 * Stories that replace an admin component's default UI through its default scoped slot, here with
 * PrimeVue. The same slot props work with any component library.
 */
export const CUSTOM_RENDER_COMPONENTS: ComponentDef[] = [
  {
    code: () => ({
      imports: [],
      otherImports: ["import Column from 'primevue/column';", "import DataTable from 'primevue/datatable';"],
      template: TABLE_TEMPLATE,
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'number', description: 'Rows per page.', name: 'limit', type: 'number'},
      {control: 'bool', description: 'Base only: isLoading.', name: 'isLoading', type: 'boolean'},
      {control: 'text', description: 'Base only: error.', name: 'error', type: 'string | null'},
    ],
    defaults: {error: '', isLoading: false, limit: 3, source: 'base'},
    group: 'Custom rendering',
    id: 'custom-userlist-datatable',
    live: true,
    name: 'UserList → PrimeVue DataTable',
    render: (args: Args, action: Action): VNode =>
      themed(
        760,
        isLive(args)
          ? h(
              UserList,
              {
                key: `live-${num(args, 'limit')}`,
                limit: Math.max(1, num(args, 'limit')),
                onSelect: (user: ManagedUser): void => action('select', quoted(user.id)),
              },
              {default: (state: AdminListRenderProps<ManagedUser>) => userTable(state)},
            )
          : h(SampleUserTable, {
              action,
              error: str(args, 'error') || null,
              isLoading: bool(args, 'isLoading'),
              key: `base-${num(args, 'limit')}`,
              limit: Math.max(1, num(args, 'limit')),
            }),
      ),
    stories: [
      {id: 'base', name: 'Sample data'},
      {args: {isLoading: true}, id: 'loading', name: 'Loading'},
      {args: {limit: 10, source: 'live'}, id: 'live', name: 'Live (needs sign-in)'},
    ],
  },
  {
    code: () => ({
      imports: [],
      otherImports: [
        "import Button from 'primevue/button';",
        "import InputText from 'primevue/inputtext';",
        "import Message from 'primevue/message';",
      ],
      template: FORM_TEMPLATE,
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'bool', description: 'Base only: isSubmitting.', name: 'isSubmitting', type: 'boolean'},
      {control: 'text', description: 'Base only: error.', name: 'error', type: 'string | null'},
    ],
    defaults: {error: '', isSubmitting: false, source: 'base'},
    group: 'Custom rendering',
    id: 'custom-groupcreate-form',
    live: true,
    name: 'GroupCreate → PrimeVue form',
    render: (args: Args, action: Action): VNode =>
      themed(
        480,
        isLive(args)
          ? h(
              GroupCreate,
              {
                onCancel: (): void => action('cancel'),
                onCreated: (group: {id: string}): void => action('created', quoted(group.id)),
              },
              {default: (state: BaseGroupCreateRenderProps) => groupForm(state)},
            )
          : h(
              BaseGroupCreate,
              {
                error: str(args, 'error') || null,
                isSubmitting: bool(args, 'isSubmitting'),
                onCancel: (): void => action('cancel'),
                onSubmit: (group: {description?: string; name: string}): void =>
                  action('submit', JSON.stringify(group)),
              },
              {default: (state: BaseGroupCreateRenderProps) => groupForm(state)},
            ),
      ),
    stories: [
      {id: 'base', name: 'Sample'},
      {args: {error: 'A group with this name already exists.'}, id: 'error', name: 'Error'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs sign-in)'},
    ],
  },
  {
    code: () => ({
      imports: [],
      otherImports: [
        "import Button from 'primevue/button';",
        "import Card from 'primevue/card';",
        "import Chip from 'primevue/chip';",
      ],
      template: CARD_TEMPLATE,
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'text', description: 'Live only: the user to load.', name: 'userId', type: 'string'},
      {control: 'bool', description: 'Passes onDelete.', name: 'deletable', type: 'boolean'},
    ],
    defaults: {deletable: true, source: 'base', userId: ''},
    group: 'Custom rendering',
    id: 'custom-userdetails-card',
    live: true,
    name: 'UserDetails → PrimeVue card',
    render: (args: Args, action: Action): VNode => {
      if (isLive(args) && !str(args, 'userId')) {
        return narrow(
          420,
          h('p', 'Set userId in Controls to an ID from your server (copy one from the UserList story).'),
        );
      }

      return themed(
        480,
        isLive(args)
          ? h(
              UserDetails,
              {
                deletable: bool(args, 'deletable'),
                onDeleted: (): void => action('deleted'),
                userId: str(args, 'userId'),
              },
              {default: (state: BaseUserDetailsRenderProps) => userCard(state)},
            )
          : h(
              BaseUserDetails,
              {
                groups: SAMPLE_MEMBERSHIPS,
                onDelete: bool(args, 'deletable')
                  ? (): void => action('delete', quoted(SAMPLE_USERS[0].id))
                  : undefined,
                user: SAMPLE_USERS[0],
              },
              {default: (state: BaseUserDetailsRenderProps) => userCard(state)},
            ),
      );
    },
    stories: [
      {id: 'base', name: 'Sample user'},
      {args: {deletable: false}, id: 'readonly', name: 'Without delete'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs userId)'},
    ],
  },
];

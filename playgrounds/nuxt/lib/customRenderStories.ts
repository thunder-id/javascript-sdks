// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedSelfFlowStatus,
  type Application,
  type EmbeddedSelfFlowRequest,
  type EmbeddedSelfFlowResponse,
  type ManagedUser,
  type MembershipGroup,
  type RoleResourcePermissions,
} from '@thunderid/browser';
import {
  BaseVerifyAttribute,
  type AdminListRenderProps,
  type ApplicationCreateSubmission,
  type BaseApplicationCreateRenderProps,
  type BaseApplicationDetailsRenderProps,
  type BaseGroupCreateRenderProps,
  type BaseRolePermissionsRenderProps,
  type BaseUserDetailsRenderProps,
  type BaseVerifyAttributeRenderProps,
  type OrganizationUnitSwitcherRenderProps,
  type RolePermissionChange,
} from '@thunderid/vue';
import {defineComponent, h, ref, type Component, type PropType, type Ref, type VNode} from 'vue';
import {SampleOrganizationUnitSwitcher} from './organizationUnitSamples';
import {
  applicationCard,
  applicationForm,
  groupForm,
  organizationUnitPicker,
  PrimeRolePermissions,
  PrimeTheme,
  userCard,
  userTable,
  verifyForm,
} from './primeRenderers';
import type {Action, Args, ComponentDef, PropControl} from './storyTypes';
import {narrow} from './storyWidgets';
import {
  ApplicationCreate,
  ApplicationDetails,
  BaseApplicationCreate,
  BaseApplicationDetails,
  BaseGroupCreate,
  BaseRolePermissions,
  BaseUserDetails,
  BaseUserList,
  GroupCreate,
  OrganizationUnitSwitcher,
  RolePermissions,
  UserDetails,
  UserList,
  VerifyAttribute,
} from '#components';

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

const SAMPLE_APPLICATION: Application = {
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
};

/** A secret shown in the "secret shown once" stories. Sample only, never a real credential. */
const SAMPLE_SECRET = 'sample-secret-5f1c9e2a';

// A self attribute verification flow that accepts the code 123456, for the Base verification stories.
export const SAMPLE_VERIFICATION_STEP: EmbeddedSelfFlowResponse = {
  challengeToken: 'sample',
  data: {
    additionalData: {maskedDestination: 'l•••@acme.io'},
    components: [
      {id: 'heading', label: 'Verify your email address', type: 'TEXT', variant: 'HEADING_1'},
      {
        id: 'message',
        label: 'Enter the verification code sent to your email address.',
        type: 'TEXT',
        variant: 'HEADING_6',
      },
      {
        components: [
          {id: 'input_otp', label: 'Verification code', ref: 'otp', required: true, type: 'OTP_INPUT'},
          {eventType: 'SUBMIT', id: 'action_verify', label: 'Verify', type: 'ACTION', variant: 'PRIMARY'},
          {eventType: 'SUBMIT', id: 'action_resend', label: 'Resend code', type: 'RESEND'},
        ],
        id: 'block_otp',
        type: 'BLOCK',
      },
    ],
  },
  executionId: 'sample',
  flowStatus: EmbeddedSelfFlowStatus.Incomplete,
} as unknown as EmbeddedSelfFlowResponse;

export const submitSampleVerification = (payload: EmbeddedSelfFlowRequest): Promise<EmbeddedSelfFlowResponse> => {
  if (payload.action === 'action_resend' || payload.inputs?.otp === '123456') {
    return Promise.resolve(
      payload.action === 'action_resend'
        ? SAMPLE_VERIFICATION_STEP
        : {executionId: 'sample', flowStatus: EmbeddedSelfFlowStatus.Complete},
    );
  }

  return Promise.resolve({
    ...SAMPLE_VERIFICATION_STEP,
    data: {components: SAMPLE_VERIFICATION_STEP.data?.components},
    error: {message: {defaultValue: 'The code is incorrect.', key: 'otp.invalid'}},
  } as unknown as EmbeddedSelfFlowResponse);
};

const isLive = (args: Args): boolean => str(args, 'source') === 'live';

const themed = (width: number, child: VNode): VNode => narrow(width, h(PrimeTheme, null, {default: () => child}));

const SAMPLE_RESOURCE_SERVERS = [
  {id: 'rs_booking', name: 'Booking API'},
  {id: 'rs_system', name: 'ThunderID system API'},
];

const SAMPLE_AVAILABLE_PERMISSIONS = {
  rs_booking: [
    {name: 'Read', permission: 'booking:read'},
    {name: 'Write', permission: 'booking:write'},
    {name: 'Cancel', permission: 'booking:cancel'},
  ],
  rs_system: [
    {name: 'View users', permission: 'system:user:view'},
    {name: 'Manage users', permission: 'system:user'},
  ],
};

/** Holds sample role permissions in state, so adding and removing them works without a server. */
const SampleRolePermissions: Component = defineComponent({
  name: 'SampleRolePermissions',
  props: {
    action: {required: true, type: Function as PropType<Action>},
  },
  setup(props: {action: Action}): () => VNode {
    const permissions: Ref<RoleResourcePermissions[]> = ref([
      {permissions: ['booking:read'], resourceServerId: 'rs_booking'},
    ]);
    const apply = ({permission, resourceServerId}: RolePermissionChange, add: boolean): void => {
      const granted: string[] =
        permissions.value.find((entry) => entry.resourceServerId === resourceServerId)?.permissions ?? [];
      const next: string[] = add ? [...granted, permission] : granted.filter((item) => item !== permission);
      permissions.value = [
        ...permissions.value.filter((entry) => entry.resourceServerId !== resourceServerId),
        ...(next.length ? [{permissions: next, resourceServerId}] : []),
      ];
      props.action(add ? 'add' : 'remove', quoted(`${resourceServerId}:${permission}`));
    };

    return (): VNode =>
      h(
        BaseRolePermissions,
        {
          availablePermissions: SAMPLE_AVAILABLE_PERMISSIONS,
          onAdd: (change: RolePermissionChange): void => apply(change, true),
          onRemove: (change: RolePermissionChange): void => apply(change, false),
          onResourceServerSelect: (id: string): void => props.action('resource-server-select', quoted(id)),
          permissions: permissions.value,
          resourceServers: SAMPLE_RESOURCE_SERVERS,
        },
        {default: (state: BaseRolePermissionsRenderProps) => h(PrimeRolePermissions, {state})},
      );
  },
});

const PERMISSIONS_TEMPLATE = `<RolePermissions :role-id="roleId" editable>
  <template #default="{permissions, resolveResourceServerName, onRemove}">
    <Card v-for="entry in permissions" :key="entry.resourceServerId">
      <template #title>{{ resolveResourceServerName(entry.resourceServerId) }}</template>
      <template #content>
        <!-- Ask before removing: the custom render owns the confirmation. -->
        <Chip
          v-for="permission in entry.permissions"
          :key="permission"
          :label="permission"
          :removable="Boolean(onRemove)"
          @remove="confirm('Remove ' + permission + '?') && onRemove({permission, resourceServerId: entry.resourceServerId})"
        />
      </template>
    </Card>
  </template>
</RolePermissions>`;

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

const APPLICATION_FORM_TEMPLATE = `<ApplicationCreate @created="(application) => router.push(application.id)">
  <template
    #default="{values, grantTypeOptions, handleInputChange, handleGrantTypesChange, handleSubmit, isValid, clientSecret, onSecretDismiss}"
  >
    <template v-if="clientSecret">
      <Message severity="warn">Copy the client secret now. It will not be shown again.</Message>
      <Password :model-value="clientSecret" readonly toggle-mask :feedback="false" />
      <Button label="Done" @click="onSecretDismiss" />
    </template>
    <template v-else>
      <InputText :model-value="values.name" @update:model-value="(value) => handleInputChange('name', value)" />
      <InputText
        :model-value="values.redirectUris"
        @update:model-value="(value) => handleInputChange('redirectUris', value)"
      />
      <MultiSelect
        :model-value="values.grantTypes"
        :options="grantTypeOptions"
        option-label="label"
        option-value="value"
        @update:model-value="handleGrantTypesChange"
      />
      <Button label="Create application" :disabled="!isValid" @click="handleSubmit" />
    </template>
  </template>
</ApplicationCreate>`;

const APPLICATION_CARD_TEMPLATE = `<ApplicationDetails :application-id="applicationId" deletable secret-regenerable>
  <template #default="{application, oauth, clientSecret, onSecretDismiss, onRegenerateSecret, onDelete}">
    <Card>
      <template #title>{{ application?.name }}</template>
      <template #subtitle>{{ oauth?.clientId }}</template>
      <template #content>
        <Password v-if="clientSecret" :model-value="clientSecret" readonly toggle-mask :feedback="false" />
        <Button v-if="clientSecret" label="Done" @click="onSecretDismiss" />
        <Chip v-for="uri in oauth?.redirectUris ?? []" :key="uri" :label="uri" />
      </template>
      <template #footer>
        <Button v-if="onRegenerateSecret" label="Regenerate secret" text @click="onRegenerateSecret" />
        <Button v-if="onDelete" label="Delete" severity="danger" text @click="onDelete" />
      </template>
    </Card>
  </template>
</ApplicationDetails>`;

const VERIFY_TEMPLATE = `<VerifyAttribute attribute="email" @cancel="close" @complete="close">
  <template #default="{title, subtitle, destinationText, components, values, handleInputChange, handleSubmit, handleResend, onCancel, isLoading, isValid, isComplete, successMessage, error}">
    <Card>
      <template #title>{{ title }}</template>
      <template #subtitle>{{ subtitle }} {{ destinationText }}</template>
      <template #content>
        <Message v-if="error" severity="error">{{ error }}</Message>
        <Message v-if="isComplete" severity="success">{{ successMessage }}</Message>
        <InputText v-else :model-value="values.otp" @update:model-value="(value) => handleInputChange('otp', value)" />
      </template>
      <template #footer>
        <Button v-if="onCancel" label="Cancel" severity="secondary" text @click="onCancel" />
        <Button v-if="handleResend" label="Send a new code" severity="secondary" @click="handleResend" />
        <Button label="Verify" :disabled="!isValid" :loading="isLoading" @click="handleSubmit(components[0].components[1], values)" />
      </template>
    </Card>
  </template>
</VerifyAttribute>`;

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
        "import InputText from 'primevue/inputtext';",
        "import Message from 'primevue/message';",
      ],
      template: VERIFY_TEMPLATE,
    }),
    controls: [
      {
        ...SOURCE_CONTROL,
        description:
          'base renders BaseVerifyAttribute with a sample flow; live renders the container, which runs each step through POST /api/auth/user/self-flow.',
      },
      {control: 'text', description: 'Live only: attribute to verify.', name: 'attribute', type: 'string'},
    ],
    defaults: {attribute: 'email', source: 'base'},
    group: 'Custom rendering',
    id: 'custom-verifyattribute-form',
    live: true,
    name: 'VerifyAttribute → PrimeVue form',
    render: (args: Args, action: Action): VNode =>
      themed(
        440,
        isLive(args)
          ? h(
              VerifyAttribute,
              {
                attribute: str(args, 'attribute') || 'email',
                key: `live-${str(args, 'attribute')}`,
                onCancel: (): void => action('cancel'),
                onComplete: (): void => action('complete'),
                onError: (error: Error): void => action('error', quoted(error.message)),
              },
              {default: (state: BaseVerifyAttributeRenderProps) => verifyForm(state)},
            )
          : h(
              BaseVerifyAttribute,
              {
                attributeDisplayName: 'Email',
                onCancel: (): void => action('cancel'),
                onComplete: (): void => action('complete'),
                onInitialize: (): Promise<EmbeddedSelfFlowResponse> => Promise.resolve(SAMPLE_VERIFICATION_STEP),
                onSubmit: (payload: EmbeddedSelfFlowRequest): Promise<EmbeddedSelfFlowResponse> => {
                  action('submit', JSON.stringify(payload));
                  return submitSampleVerification(payload);
                },
              },
              {default: (state: BaseVerifyAttributeRenderProps) => verifyForm(state)},
            ),
      ),
    stories: [
      {id: 'base', name: 'Sample flow (code 123456)'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs sign-in, sends a code)'},
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
  {
    code: () => ({
      imports: ['ApplicationCreate'],
      otherImports: [
        "import Button from 'primevue/button';",
        "import InputText from 'primevue/inputtext';",
        "import Message from 'primevue/message';",
        "import MultiSelect from 'primevue/multiselect';",
        "import Password from 'primevue/password';",
      ],
      template: APPLICATION_FORM_TEMPLATE,
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'bool', description: 'Base only: isSubmitting.', name: 'isSubmitting', type: 'boolean'},
      {control: 'text', description: 'Base only: error.', name: 'error', type: 'string | null'},
      {control: 'bool', description: 'Base only: passes clientSecret.', name: 'showSecret', type: 'boolean'},
    ],
    defaults: {error: '', isSubmitting: false, showSecret: false, source: 'base'},
    group: 'Custom rendering',
    id: 'custom-applicationcreate-form',
    live: true,
    name: 'ApplicationCreate → PrimeVue form',
    render: (args: Args, action: Action): VNode =>
      themed(
        480,
        isLive(args)
          ? h(
              ApplicationCreate,
              {
                onCancel: (): void => action('cancel'),
                onCreated: (application: {id: string}): void => action('created', quoted(application.id)),
              },
              {default: (state: BaseApplicationCreateRenderProps) => applicationForm(state)},
            )
          : h(
              BaseApplicationCreate,
              {
                clientSecret: bool(args, 'showSecret') ? SAMPLE_SECRET : null,
                error: str(args, 'error') || null,
                isSubmitting: bool(args, 'isSubmitting'),
                onCancel: (): void => action('cancel'),
                onSecretDismiss: (): void => action('secret-dismiss'),
                onSubmit: (application: ApplicationCreateSubmission): void =>
                  action('submit', JSON.stringify(application)),
              },
              {default: (state: BaseApplicationCreateRenderProps) => applicationForm(state)},
            ),
      ),
    stories: [
      {id: 'base', name: 'Sample'},
      {args: {showSecret: true}, id: 'secret', name: 'Client secret shown once'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs sign-in)'},
    ],
  },
  {
    code: () => ({
      imports: [],
      otherImports: ["import Button from 'primevue/button';", "import Card from 'primevue/card';"],
      template: `<OrganizationUnitSwitcher scope="siblings">
  <template #default="{organizationUnits, current, switchingId, onSwitch}">
    <Card>
      <template #content>
        <div v-for="unit in organizationUnits" :key="unit.id">
          {{ unit.name }}
          <span v-if="unit.id === current">Current</span>
          <Button v-else label="Switch" :loading="switchingId === unit.id" @click="onSwitch(unit)" />
        </div>
      </template>
    </Card>
  </template>
</OrganizationUnitSwitcher>`,
    }),
    controls: [
      {
        control: ['base', 'live'],
        description:
          'base renders BaseOrganizationUnitSwitcher with sample units; live lists through GET /api/auth/user/organization-units.',
        name: 'source',
        type: "'base' | 'live' (playground only)",
      },
    ],
    defaults: {source: 'base'},
    group: 'Custom rendering',
    id: 'custom-organizationunitswitcher-card',
    live: true,
    name: 'OrganizationUnitSwitcher → PrimeVue card',
    render: (args: Args, action: Action): VNode =>
      themed(
        460,
        isLive(args)
          ? h(
              OrganizationUnitSwitcher,
              {onSwitch: (unit: {id: string}): void => action('switch', quoted(unit.id))},
              {default: (state: OrganizationUnitSwitcherRenderProps) => organizationUnitPicker(state)},
            )
          : h(SampleOrganizationUnitSwitcher, {
              action,
              render: (state: OrganizationUnitSwitcherRenderProps) => organizationUnitPicker(state),
            }),
      ),
    stories: [
      {id: 'base', name: 'Sample'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs sign-in)'},
    ],
  },
  {
    code: () => ({
      imports: ['ApplicationDetails'],
      otherImports: [
        "import Button from 'primevue/button';",
        "import Card from 'primevue/card';",
        "import Chip from 'primevue/chip';",
        "import Password from 'primevue/password';",
      ],
      template: APPLICATION_CARD_TEMPLATE,
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'text', description: 'Live only: the application to load.', name: 'applicationId', type: 'string'},
      {control: 'bool', description: 'Passes onDelete.', name: 'deletable', type: 'boolean'},
      {control: 'bool', description: 'Passes onRegenerateSecret.', name: 'secretRegenerable', type: 'boolean'},
      {control: 'bool', description: 'Base only: passes clientSecret.', name: 'showSecret', type: 'boolean'},
    ],
    defaults: {applicationId: '', deletable: true, secretRegenerable: true, showSecret: false, source: 'base'},
    group: 'Custom rendering',
    id: 'custom-applicationdetails-card',
    live: true,
    name: 'ApplicationDetails → PrimeVue card',
    render: (args: Args, action: Action): VNode => {
      if (isLive(args) && !str(args, 'applicationId')) {
        return narrow(
          420,
          h('p', 'Set applicationId in Controls to an ID from your server (copy one from the ApplicationList story).'),
        );
      }

      return themed(
        480,
        isLive(args)
          ? h(
              ApplicationDetails,
              {
                applicationId: str(args, 'applicationId'),
                deletable: bool(args, 'deletable'),
                onDeleted: (): void => action('deleted'),
                secretRegenerable: bool(args, 'secretRegenerable'),
              },
              {default: (state: BaseApplicationDetailsRenderProps) => applicationCard(state)},
            )
          : h(
              BaseApplicationDetails,
              {
                application: SAMPLE_APPLICATION,
                clientSecret: bool(args, 'showSecret') ? SAMPLE_SECRET : null,
                onDelete: bool(args, 'deletable')
                  ? (): void => action('delete', quoted(SAMPLE_APPLICATION.id))
                  : undefined,
                onRegenerateSecret: bool(args, 'secretRegenerable')
                  ? (): void => action('regenerate-secret', quoted(SAMPLE_APPLICATION.id))
                  : undefined,
                onSecretDismiss: (): void => action('secret-dismiss'),
              },
              {default: (state: BaseApplicationDetailsRenderProps) => applicationCard(state)},
            ),
      );
    },
    stories: [
      {id: 'base', name: 'Sample application'},
      {args: {showSecret: true}, id: 'secret', name: 'Regenerated secret'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs applicationId)'},
    ],
  },
  {
    code: () => ({
      imports: [],
      otherImports: ["import Card from 'primevue/card';", "import Chip from 'primevue/chip';"],
      template: PERMISSIONS_TEMPLATE,
    }),
    controls: [
      SOURCE_CONTROL,
      {control: 'text', description: 'Live only: the role to load and edit.', name: 'roleId', type: 'string'},
    ],
    defaults: {roleId: '', source: 'base'},
    group: 'Custom rendering',
    id: 'custom-rolepermissions-cards',
    live: true,
    name: 'RolePermissions → PrimeVue cards',
    render: (args: Args, action: Action): VNode => {
      if (isLive(args) && !str(args, 'roleId')) {
        return narrow(
          420,
          h('p', 'Set roleId in Controls to an ID from your server (copy one from the RoleList story).'),
        );
      }

      return themed(
        560,
        isLive(args)
          ? h(
              RolePermissions,
              {editable: true, key: str(args, 'roleId'), roleId: str(args, 'roleId')},
              {default: (state: BaseRolePermissionsRenderProps) => h(PrimeRolePermissions, {state})},
            )
          : h(SampleRolePermissions, {action}),
      );
    },
    stories: [
      {id: 'base', name: 'Sample, editable'},
      {args: {source: 'live'}, id: 'live', name: 'Live (needs roleId, writes)'},
    ],
  },
];

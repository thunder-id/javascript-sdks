// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  AuthFlowSelect,
  ChangeCredential,
  SignedIn,
  SignedOut,
  SignIn,
  SignInButton,
  SignOutButton,
  SignUp,
  SignUpButton,
  User,
  UserAvatar,
  UserDropdown,
  UserProfile,
  UserSelect,
  UserTypeSelect,
} from '@thunderid/nextjs';
import {
  BaseChangeCredential,
  BaseSignInButton,
  BaseSignOutButton,
  BaseSignUpButton,
  BaseUserAvatar,
  BaseUserDropdown,
  BaseUserProfile,
  ChangePasswordValues,
  Typography,
} from '@thunderid/react';
import {ChangeEvent, FC} from 'react';
import {ADMIN_COMPONENTS} from './adminStories';
import {CUSTOM_RENDER_COMPONENTS} from './customRenderStories';
import {bool, fromReact, isLive, jsx, num, omit, str} from './helpers';
import Narrow from './Narrow';
import type {Action, Args, ComponentDef, PropControl} from './types';
import {getDisplayName} from '../lib/user';

const SAMPLE_USER: Record<string, string> = {
  email: 'liam.chen@acme.io',
  family_name: 'Chen',
  given_name: 'Liam',
  sub: 'usr_8f2c41',
  username: 'liam.chen',
};

const SAMPLE_PROFILE: Record<string, string> = {
  country: 'New Zealand',
  email: 'liam.chen@acme.io',
  familyName: 'Chen',
  givenName: 'Liam',
  username: 'liam.chen',
};

const SIZE: readonly string[] = ['small', 'medium', 'large'];
const VARIANT: readonly string[] = ['default', 'outlined', 'elevated'];

const SOURCE_CONTROL: PropControl = {
  control: ['base', 'live'],
  description:
    'base renders the presentational Base component from @thunderid/react with sample data; live renders the @thunderid/nextjs component, which calls the SDK server actions.',
  name: 'source',
  type: "'base' | 'live' (playground only)",
};

const LABEL_CONTROL: PropControl = {
  control: 'text',
  description: 'Button label; empty uses the translated default.',
  name: 'children',
  type: 'ReactNode',
};

const selectComponent = (
  id: string,
  name: string,
  Select: FC<{
    label?: string;
    onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
    onError?: (error: Error) => void;
    pageSize?: number;
    placeholder?: string;
  }>,
  label: string,
  loads: string,
): ComponentDef => ({
  code: (args: Args) => ({
    imports: [name],
    jsx: jsx(name, args, {defaults: {pageSize: 20}, extra: ['onChange={handleChange}', 'onError={handleError}']}),
  }),
  controls: [
    {control: 'text', description: 'Visible label.', name: 'label', type: 'string'},
    {control: 'text', description: 'Placeholder option.', name: 'placeholder', type: 'string'},
    {control: 'number', description: 'Options loaded per page.', name: 'pageSize', type: 'number'},
  ],
  defaults: {label, pageSize: 20, placeholder: `Choose ${label.toLowerCase()}`},
  group: 'Management',
  id,
  live: true,
  name,
  render: (args: Args, action: Action) => (
    <Narrow width={320}>
      <Select
        key={num(args, 'pageSize')}
        label={str(args, 'label')}
        placeholder={str(args, 'placeholder')}
        pageSize={num(args, 'pageSize') || undefined}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => action('onChange', `"${event.target.value}"`)}
        onError={(error: Error) => action('onError', error.message)}
      />
    </Narrow>
  ),
  stories: [{id: 'default', name: `Loads ${loads} (signed in)`}],
});

export const COMPONENTS: ComponentDef[] = [
  {
    code: (args: Args) =>
      isLive(args)
        ? {imports: ['SignInButton'], jsx: jsx('SignInButton', {}, {children: str(args, 'children') || undefined})}
        : fromReact({
            imports: ['BaseSignInButton'],
            jsx: jsx('BaseSignInButton', {}, {children: str(args, 'children'), extra: ['signIn={handleSignIn}']}),
          }),
    controls: [SOURCE_CONTROL, LABEL_CONTROL],
    defaults: {children: 'Sign in', source: 'base'},
    group: 'Actions',
    id: 'signinbutton',
    live: true,
    name: 'SignInButton',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <SignInButton onClick={() => action('onClick', 'signIn() server action, then redirect')}>
          {str(args, 'children') || undefined}
        </SignInButton>
      ) : (
        <BaseSignInButton
          signIn={() => {
            action('signIn', 'called (base, no redirect)');

            return Promise.resolve();
          }}
          onClick={() => action('onClick')}
        >
          {str(args, 'children')}
        </BaseSignInButton>
      ),
    stories: [
      {id: 'base', name: 'Base (no redirect)'},
      {args: {children: '', source: 'live'}, id: 'live', name: 'Live (redirects)'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {imports: ['SignUpButton'], jsx: jsx('SignUpButton', {}, {children: str(args, 'children') || undefined})}
        : fromReact({
            imports: ['BaseSignUpButton'],
            jsx: jsx('BaseSignUpButton', {}, {children: str(args, 'children'), extra: ['signUp={handleSignUp}']}),
          }),
    controls: [SOURCE_CONTROL, LABEL_CONTROL],
    defaults: {children: 'Create account', source: 'base'},
    group: 'Actions',
    id: 'signupbutton',
    live: true,
    name: 'SignUpButton',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <SignUpButton onClick={() => action('onClick', 'signUp() started')}>
          {str(args, 'children') || undefined}
        </SignUpButton>
      ) : (
        <BaseSignUpButton
          signUp={() => {
            action('signUp', 'called (base)');

            return Promise.resolve();
          }}
          onClick={() => action('onClick')}
        >
          {str(args, 'children')}
        </BaseSignUpButton>
      ),
    stories: [
      {id: 'base', name: 'Base'},
      {args: {children: '', source: 'live'}, id: 'live', name: 'Live'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {imports: ['SignOutButton'], jsx: jsx('SignOutButton', {}, {children: str(args, 'children') || undefined})}
        : fromReact({
            imports: ['BaseSignOutButton'],
            jsx: jsx('BaseSignOutButton', {}, {children: str(args, 'children'), extra: ['signOut={handleSignOut}']}),
          }),
    controls: [SOURCE_CONTROL, LABEL_CONTROL],
    defaults: {children: 'Sign out', source: 'base'},
    group: 'Actions',
    id: 'signoutbutton',
    live: true,
    name: 'SignOutButton',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <SignOutButton onClick={() => action('onClick', 'signOut() server action')}>
          {str(args, 'children') || undefined}
        </SignOutButton>
      ) : (
        <BaseSignOutButton
          signOut={() => {
            action('signOut', 'called (base)');

            return Promise.resolve();
          }}
          onClick={() => action('onClick')}
        >
          {str(args, 'children')}
        </BaseSignOutButton>
      ),
    stories: [
      {id: 'base', name: 'Base'},
      {args: {children: '', source: 'live'}, id: 'live', name: 'Live (signs out)'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['SignIn'],
      jsx: jsx('SignIn', args, {
        defaults: {size: 'medium', variant: 'outlined'},
        extra: ['onSuccess={handleSuccess}', 'onError={handleError}'],
      }),
    }),
    controls: [
      {control: SIZE, description: 'Spacing and control size.', name: 'size', type: "'small' | 'medium' | 'large'"},
      {control: VARIANT, description: 'Card variant of the flow container.', name: 'variant', type: 'CardVariant'},
    ],
    defaults: {size: 'medium', variant: 'outlined'},
    group: 'Auth flows',
    id: 'signin',
    live: true,
    name: 'SignIn',
    render: (args: Args, action: Action) => (
      <Narrow width={400}>
        <SignIn
          size={str(args, 'size') as 'medium'}
          variant={str(args, 'variant') as 'outlined'}
          onSuccess={(data: Record<string, unknown>) => action('onSuccess', JSON.stringify(data).slice(0, 120))}
          onError={(error: Error) => action('onError', error.message)}
        />
      </Narrow>
    ),
    stories: [
      {id: 'default', name: 'Default'},
      {args: {size: 'small', variant: 'elevated'}, id: 'compact', name: 'Compact'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['SignUp'],
      jsx: jsx('SignUp', args, {
        defaults: {size: 'medium', variant: 'outlined'},
        extra: ['onComplete={handleComplete}', 'onError={handleError}'],
      }),
    }),
    controls: [
      {control: SIZE, description: 'Spacing and control size.', name: 'size', type: "'small' | 'medium' | 'large'"},
      {control: VARIANT, description: 'Card variant of the flow container.', name: 'variant', type: 'CardVariant'},
    ],
    defaults: {size: 'medium', variant: 'outlined'},
    group: 'Auth flows',
    id: 'signup',
    live: true,
    name: 'SignUp',
    render: (args: Args, action: Action) => (
      <Narrow width={400}>
        <SignUp
          size={str(args, 'size') as 'medium'}
          variant={str(args, 'variant') as 'outlined'}
          onComplete={() => action('onComplete')}
          onError={(error: Error) => action('onError', error.message)}
        />
      </Narrow>
    ),
    stories: [{id: 'default', name: 'Default'}],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {imports: ['UserAvatar'], jsx: jsx('UserAvatar', omit(args, 'source'), {defaults: {size: 40}})}
        : fromReact({
            imports: ['BaseUserAvatar'],
            jsx: jsx('BaseUserAvatar', omit(args, 'source'), {defaults: {size: 40}, extra: ['user={user}']}),
          }),
    controls: [SOURCE_CONTROL, {control: 'number', description: 'Diameter in px.', name: 'size', type: 'number'}],
    defaults: {size: 56, source: 'base'},
    group: 'User',
    id: 'useravatar',
    name: 'UserAvatar',
    render: (args: Args) =>
      isLive(args) ? (
        <UserAvatar size={num(args, 'size')} />
      ) : (
        <BaseUserAvatar size={num(args, 'size')} user={SAMPLE_USER} />
      ),
    stories: [
      {id: 'base', name: 'Sample user'},
      {args: {source: 'live'}, id: 'live', name: 'Signed-in user'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['UserDropdown'],
            jsx: jsx('UserDropdown', omit(args, 'source'), {extra: ['onManageProfile={openProfile}']}),
          }
        : fromReact({
            imports: ['BaseUserDropdown'],
            jsx: jsx('BaseUserDropdown', omit(args, 'source'), {
              extra: ['user={user}', 'onSignOut={signOut}', 'onManageProfile={openProfile}'],
            }),
          }),
    controls: [
      SOURCE_CONTROL,
      {control: 'bool', description: 'Shows the name next to the avatar.', name: 'showTriggerLabel', type: 'boolean'},
      {control: 'bool', description: 'Shows the header inside the menu.', name: 'showDropdownHeader', type: 'boolean'},
    ],
    defaults: {showDropdownHeader: true, showTriggerLabel: true, source: 'base'},
    group: 'User',
    id: 'userdropdown',
    live: true,
    name: 'UserDropdown',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <UserDropdown
          showTriggerLabel={bool(args, 'showTriggerLabel')}
          showDropdownHeader={bool(args, 'showDropdownHeader')}
          onManageProfile={() => action('onManageProfile')}
        />
      ) : (
        <BaseUserDropdown
          user={SAMPLE_USER}
          showTriggerLabel={bool(args, 'showTriggerLabel')}
          showDropdownHeader={bool(args, 'showDropdownHeader')}
          onSignOut={() => action('onSignOut')}
          onManageProfile={() => action('onManageProfile')}
        />
      ),
    stories: [
      {id: 'base', name: 'Sample user'},
      {args: {source: 'live'}, id: 'live', name: 'Signed-in user'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {imports: ['UserProfile'], jsx: jsx('UserProfile', omit(args, 'source'), {defaults: {editable: true}})}
        : fromReact({
            imports: ['BaseUserProfile'],
            jsx: jsx('BaseUserProfile', omit(args, 'source'), {
              extra: ['profile={profile}', 'onUpdate={handleUpdate}'],
            }),
          }),
    controls: [
      SOURCE_CONTROL,
      {control: 'text', description: 'Heading of the profile card.', name: 'title', type: 'string'},
      {control: 'bool', description: 'Allows editing fields.', name: 'editable', type: 'boolean'},
      {control: 'bool', description: 'Wraps the profile in a card.', name: 'cardLayout', type: 'boolean'},
    ],
    defaults: {cardLayout: true, editable: true, source: 'base', title: 'Profile'},
    group: 'User',
    id: 'userprofile',
    live: true,
    name: 'UserProfile',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <Narrow width={520}>
          <UserProfile
            title={str(args, 'title')}
            editable={bool(args, 'editable')}
            cardLayout={bool(args, 'cardLayout')}
          />
        </Narrow>
      ) : (
        <Narrow width={520}>
          <BaseUserProfile
            title={str(args, 'title')}
            editable={bool(args, 'editable')}
            cardLayout={bool(args, 'cardLayout')}
            profile={SAMPLE_PROFILE}
            flattenedProfile={SAMPLE_PROFILE}
            onUpdate={(payload: unknown) => {
              action('onUpdate', JSON.stringify(payload));

              return Promise.resolve();
            }}
          />
        </Narrow>
      ),
    stories: [
      {id: 'base', name: 'Sample profile'},
      {args: {source: 'live'}, id: 'live', name: 'Signed-in user (editable)'},
    ],
  },
  {
    code: (args: Args) =>
      isLive(args)
        ? {
            imports: ['ChangeCredential'],
            jsx: jsx('ChangeCredential', omit(args, 'source'), {
              defaults: {attribute: 'password', cardLayout: true, showRequirements: true},
              extra: ['onSuccess={handleSuccess}'],
            }),
          }
        : fromReact({
            imports: ['BaseChangeCredential'],
            jsx: jsx('BaseChangeCredential', omit(args, 'source', 'attribute'), {
              defaults: {cardLayout: true, showRequirements: true},
              extra: ['onSubmit={handleSubmit}'],
            }),
          }),
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: 'Credential attribute to change (live only).',
        name: 'attribute',
        type: 'string',
      },
      {control: 'text', description: 'Heading of the form.', name: 'title', type: 'string'},
      {control: 'bool', description: 'Wraps the form in a card.', name: 'cardLayout', type: 'boolean'},
      {control: 'bool', description: 'Shows the policy checklist.', name: 'showRequirements', type: 'boolean'},
    ],
    defaults: {attribute: 'password', cardLayout: true, showRequirements: true, source: 'base', title: ''},
    group: 'User',
    id: 'changecredential',
    live: true,
    name: 'ChangeCredential',
    render: (args: Args, action: Action) =>
      isLive(args) ? (
        <Narrow width={440}>
          <ChangeCredential
            attribute={str(args, 'attribute') || undefined}
            title={str(args, 'title') || undefined}
            cardLayout={bool(args, 'cardLayout')}
            showRequirements={bool(args, 'showRequirements')}
            onSuccess={() => action('onSuccess', 'updateUserCredentialsAction resolved')}
          />
        </Narrow>
      ) : (
        <Narrow width={440}>
          <BaseChangeCredential
            title={str(args, 'title') || undefined}
            cardLayout={bool(args, 'cardLayout')}
            showRequirements={bool(args, 'showRequirements')}
            onSubmit={(values: ChangePasswordValues) =>
              action('onSubmit', `newPassword "${'•'.repeat(values.newPassword.length)}"`)
            }
          />
        </Narrow>
      ),
    stories: [
      {id: 'base', name: 'Base form'},
      {args: {source: 'live'}, id: 'live', name: 'Signed-in user'},
    ],
  },
  {
    code: () => ({
      imports: ['User'],
      jsx: '<User fallback={<p>Not signed in</p>}>\n  {(user) => <p>Hello, {user?.username}</p>}\n</User>',
    }),
    controls: [],
    defaults: {},
    group: 'User',
    id: 'user',
    live: true,
    name: 'User',
    render: () => (
      <User fallback={<Typography variant="body1">Not signed in</Typography>}>
        {(user: Record<string, unknown> | null) => (
          <Typography variant="body1">Hello, {getDisplayName(user)}</Typography>
        )}
      </User>
    ),
    stories: [{id: 'default', name: 'Render prop'}],
  },
  {
    code: () => ({
      imports: ['SignedIn', 'SignedOut', 'SignInButton', 'SignOutButton'],
      jsx: '<>\n  <SignedIn fallback={null}>\n    <SignOutButton />\n  </SignedIn>\n  <SignedOut>\n    <SignInButton />\n  </SignedOut>\n</>',
    }),
    controls: [],
    defaults: {},
    group: 'Control',
    id: 'signedin',
    live: true,
    name: 'SignedIn / SignedOut',
    render: () => (
      <div style={{alignItems: 'center', display: 'flex', flexDirection: 'column', gap: 12}}>
        <SignedIn>
          <Typography variant="body2">Rendered by &lt;SignedIn&gt;</Typography>
          <SignOutButton />
        </SignedIn>
        <SignedOut>
          <Typography variant="body2">Rendered by &lt;SignedOut&gt;</Typography>
          <SignInButton />
        </SignedOut>
      </div>
    ),
    stories: [{id: 'default', name: 'Session gate'}],
  },
  selectComponent('userselect', 'UserSelect', UserSelect, 'User', 'users'),
  selectComponent('usertypeselect', 'UserTypeSelect', UserTypeSelect, 'User type', 'user types'),
  selectComponent('authflowselect', 'AuthFlowSelect', AuthFlowSelect, 'Sign-in flow', 'flows'),
  ...ADMIN_COMPONENTS,
  ...CUSTOM_RENDER_COMPONENTS,
];

export const STORY_COUNT: number = COMPONENTS.reduce(
  (total: number, component: ComponentDef) => total + component.stories.length,
  0,
);

export const GROUPS: string[] = Array.from(new Set(COMPONENTS.map((component: ComponentDef) => component.group)));

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Alert,
  BaseChangeCredential,
  BaseLanguageSwitcher,
  BaseSignInButton,
  BaseSignOutButton,
  BaseSignUpButton,
  BaseUserDropdown,
  BaseUserProfile,
  Button,
  Card,
  ChangeCredential,
  Checkbox,
  CopyableText,
  DatePicker,
  Divider,
  FacebookButton,
  GitHubButton,
  GoogleButton,
  KeyValueList,
  LanguageSwitcher,
  Loading,
  Logo,
  MicrosoftButton,
  OtpField,
  PasswordField,
  Select,
  SignedIn,
  SignedOut,
  SignIn,
  SignInButton,
  SignOutButton,
  SignUp,
  SignUpButton,
  Spinner,
  TextField,
  Typography,
  User,
  UserDropdown,
  UserProfile,
} from '@thunderid/vue';
import {Component, h} from 'vue';
import {ADMIN_COMPONENTS} from './adminStories';
import {CUSTOM_RENDER_COMPONENTS} from './customRenderStories';
import {bool, CARD_VARIANT, handler, num, omit, quoted, SIZE, slot, SOURCE_CONTROL, str, tpl} from './storyKit';
import type {Action, Args, ComponentDef} from './types';
import {narrow, VModel} from './widgets';
import {getDisplayName} from '../../lib/user';

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

const DEPARTMENTS: {label: string; value: string}[] = [
  {label: 'Engineering', value: 'eng'},
  {label: 'Design', value: 'design'},
  {label: 'Sales', value: 'sales'},
];

const SOCIAL: Record<string, Component> = {FacebookButton, GitHubButton, GoogleButton, MicrosoftButton};

export const COMPONENTS: ComponentDef[] = [
  {
    code: (args: Args) => ({
      imports: ['Button'],
      script: handler('handleClick'),
      template: tpl('Button', omit(args, 'children'), {
        children: str(args, 'children'),
        defaults: {color: 'primary', size: 'medium', variant: 'solid'},
        extra: ['@click="handleClick"'],
      }),
    }),
    controls: [
      {control: 'text', description: 'Button label, passed in the default slot.', name: 'children', type: 'slot'},
      {
        control: ['solid', 'outline', 'ghost', 'text'],
        description: 'Visual style of the button.',
        name: 'variant',
        type: "'solid' | 'outline' | 'ghost' | 'text'",
      },
      {
        control: ['primary', 'secondary', 'danger'],
        description: 'Color intent.',
        name: 'color',
        type: "'primary' | 'secondary' | 'danger'",
      },
      {control: SIZE, description: 'Height and padding.', name: 'size', type: "'small' | 'medium' | 'large'"},
      {control: 'bool', description: 'Shows a spinner and blocks clicks.', name: 'loading', type: 'boolean'},
      {control: 'bool', description: 'Disables the button.', name: 'disabled', type: 'boolean'},
      {control: 'bool', description: 'Stretches to the container width.', name: 'fullWidth', type: 'boolean'},
    ],
    defaults: {
      children: 'Sign in',
      color: 'primary',
      disabled: false,
      fullWidth: false,
      loading: false,
      size: 'medium',
      variant: 'solid',
    },
    group: 'Primitives',
    id: 'button',
    name: 'Button',
    render: (args: Args, action: Action) =>
      h('div', {style: bool(args, 'fullWidth') ? {maxWidth: '100%', width: '360px'} : undefined}, [
        h(
          Button,
          {
            color: str(args, 'color'),
            disabled: bool(args, 'disabled'),
            fullWidth: bool(args, 'fullWidth'),
            loading: bool(args, 'loading'),
            onClick: () => action('click', 'MouseEvent { target: button }'),
            size: str(args, 'size'),
            variant: str(args, 'variant'),
          },
          {default: () => str(args, 'children')},
        ),
      ]),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {color: 'primary', variant: 'outline'}, id: 'outline', name: 'Outline'},
      {args: {color: 'secondary', variant: 'ghost'}, id: 'ghost', name: 'Ghost'},
      {args: {children: 'Delete account', color: 'danger'}, id: 'danger', name: 'Danger'},
      {args: {loading: true}, id: 'loading', name: 'Loading'},
      {args: {disabled: true}, id: 'disabled', name: 'Disabled'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['TextField'],
      script: ["const email = ref('');"],
      template: tpl('TextField', args, {defaults: {type: 'text'}, extra: ['v-model="email"']}),
      vueImports: ['ref'],
    }),
    controls: [
      {control: 'text', description: 'Visible field label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Hint shown when empty.', name: 'placeholder', type: 'string'},
      {control: 'text', description: 'Help text below the field.', name: 'helperText', type: 'string'},
      {control: 'text', description: 'Error message; marks the field invalid.', name: 'error', type: 'string'},
      {
        control: ['text', 'email', 'number', 'tel', 'url'],
        description: 'Input type.',
        name: 'type',
        type: "'text' | 'email' | 'number' | 'tel' | 'url'",
      },
      {control: 'bool', description: 'Marks the field as required.', name: 'required', type: 'boolean'},
      {control: 'bool', description: 'Disables the field.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {
      disabled: false,
      error: '',
      helperText: '',
      label: 'Email address',
      placeholder: 'you@example.com',
      required: false,
      type: 'email',
    },
    group: 'Primitives',
    id: 'textfield',
    name: 'TextField',
    render: (args: Args, action: Action) =>
      narrow(
        320,
        h(VModel, {
          action,
          attrs: {
            disabled: bool(args, 'disabled'),
            error: str(args, 'error') || undefined,
            helperText: str(args, 'helperText') || undefined,
            label: str(args, 'label'),
            onBlur: () => action('blur'),
            placeholder: str(args, 'placeholder'),
            required: bool(args, 'required'),
            type: str(args, 'type'),
          },
          format: quoted,
          is: TextField,
        }),
      ),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {error: 'Enter a valid email address.'}, id: 'error', name: 'With error'},
      {args: {helperText: 'We never share your email.'}, id: 'helper', name: 'With helper text'},
      {args: {disabled: true}, id: 'disabled', name: 'Disabled'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['PasswordField'],
      script: ["const password = ref('');"],
      template: tpl('PasswordField', args, {extra: ['v-model="password"']}),
      vueImports: ['ref'],
    }),
    controls: [
      {control: 'text', description: 'Visible field label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Hint shown when empty.', name: 'placeholder', type: 'string'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Marks the field as required.', name: 'required', type: 'boolean'},
      {control: 'bool', description: 'Disables the field.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', label: 'Password', placeholder: 'Password', required: true},
    group: 'Primitives',
    id: 'passwordfield',
    name: 'PasswordField',
    render: (args: Args, action: Action) =>
      narrow(
        320,
        h(VModel, {
          action,
          attrs: {
            disabled: bool(args, 'disabled'),
            error: str(args, 'error') || undefined,
            label: str(args, 'label'),
            onBlur: () => action('blur'),
            placeholder: str(args, 'placeholder'),
            required: bool(args, 'required'),
          },
          format: (value: unknown) => quoted('•'.repeat(String(value).length)),
          is: PasswordField,
        }),
      ),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {error: 'Password must be at least 8 characters.'}, id: 'error', name: 'With error'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['OtpField'],
      script: ["const code = ref('');"],
      template: tpl('OtpField', args, {defaults: {length: 6, numericOnly: true}, extra: ['v-model="code"']}),
      vueImports: ['ref'],
    }),
    controls: [
      {control: 'text', description: 'Visible label.', name: 'label', type: 'string'},
      {control: 'number', description: 'Number of digits.', name: 'length', type: 'number'},
      {control: 'bool', description: 'Accepts digits only.', name: 'numericOnly', type: 'boolean'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Disables the inputs.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', label: 'Verification code', length: 6, numericOnly: true},
    group: 'Primitives',
    id: 'otpfield',
    name: 'OtpField',
    render: (args: Args, action: Action) =>
      h(VModel, {
        action,
        attrs: {
          disabled: bool(args, 'disabled'),
          error: str(args, 'error') || undefined,
          key: num(args, 'length'),
          label: str(args, 'label'),
          length: num(args, 'length'),
          numericOnly: bool(args, 'numericOnly'),
        },
        format: quoted,
        is: OtpField,
      }),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {length: 4}, id: 'four', name: 'Four digits'},
      {args: {error: 'That code has expired.'}, id: 'error', name: 'With error'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Checkbox'],
      script: ['const remember = ref(false);'],
      template: tpl('Checkbox', args, {extra: ['v-model="remember"']}),
      vueImports: ['ref'],
    }),
    controls: [
      {control: 'text', description: 'Visible label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Marks as required.', name: 'required', type: 'boolean'},
      {control: 'bool', description: 'Disables the checkbox.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', label: 'Remember this device', required: false},
    group: 'Primitives',
    id: 'checkbox',
    name: 'Checkbox',
    render: (args: Args, action: Action) =>
      h(VModel, {
        action,
        attrs: {
          disabled: bool(args, 'disabled'),
          error: str(args, 'error') || undefined,
          label: str(args, 'label'),
          required: bool(args, 'required'),
        },
        format: (value: unknown) => `checked=${String(value)}`,
        initial: false,
        is: Checkbox,
      }),
    stories: [
      {id: 'playground', name: 'Playground'},
      {
        args: {error: 'You must accept the terms.', label: 'I accept the terms', required: true},
        id: 'error',
        name: 'Required',
      },
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Select'],
      script: [
        "const department = ref('');",
        "const departments = [{label: 'Engineering', value: 'eng'}, {label: 'Design', value: 'design'}];",
      ],
      template: tpl('Select', args, {extra: ['v-model="department"', ':options="departments"']}),
      vueImports: ['ref'],
    }),
    controls: [
      {control: 'text', description: 'Visible label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Text of the empty option.', name: 'placeholder', type: 'string'},
      {control: 'text', description: 'Help text.', name: 'helperText', type: 'string'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Shows a loading state.', name: 'loading', type: 'boolean'},
      {control: 'bool', description: 'Disables the select.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {
      disabled: false,
      error: '',
      helperText: '',
      label: 'Department',
      loading: false,
      placeholder: 'Choose a department',
    },
    group: 'Primitives',
    id: 'select',
    name: 'Select',
    render: (args: Args, action: Action) =>
      narrow(
        320,
        h(VModel, {
          action,
          attrs: {
            disabled: bool(args, 'disabled'),
            error: str(args, 'error') || undefined,
            helperText: str(args, 'helperText') || undefined,
            label: str(args, 'label'),
            loading: bool(args, 'loading'),
            options: DEPARTMENTS,
            placeholder: str(args, 'placeholder'),
          },
          format: quoted,
          is: Select,
        }),
      ),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {loading: true}, id: 'loading', name: 'Loading'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['DatePicker'],
      script: ["const birthday = ref('');"],
      template: tpl('DatePicker', args, {extra: ['v-model="birthday"']}),
      vueImports: ['ref'],
    }),
    controls: [
      {control: 'text', description: 'Visible label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Marks as required.', name: 'required', type: 'boolean'},
      {control: 'bool', description: 'Disables the field.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', label: 'Date of birth', required: false},
    group: 'Primitives',
    id: 'datepicker',
    name: 'DatePicker',
    render: (args: Args, action: Action) =>
      narrow(
        320,
        h(VModel, {
          action,
          attrs: {
            disabled: bool(args, 'disabled'),
            error: str(args, 'error') || undefined,
            label: str(args, 'label'),
            required: bool(args, 'required'),
          },
          format: quoted,
          is: DatePicker,
        }),
      ),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {error: 'You must be 16 or older.'}, id: 'error', name: 'With error'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Alert'],
      template: tpl('Alert', omit(args, 'children'), {
        children: str(args, 'children'),
        defaults: {severity: 'info'},
        extra: bool(args, 'dismissible') ? ['@dismiss="hide"'] : [],
      }),
    }),
    controls: [
      {
        control: ['info', 'success', 'warning', 'error'],
        description: 'Color and icon of the alert.',
        name: 'severity',
        type: "'info' | 'success' | 'warning' | 'error'",
      },
      {control: 'text', description: 'Message, passed in the default slot.', name: 'children', type: 'slot'},
      {control: 'bool', description: 'Shows a dismiss button.', name: 'dismissible', type: 'boolean'},
    ],
    defaults: {children: 'We sent a sign-in link to liam.chen@acme.io.', dismissible: false, severity: 'info'},
    group: 'Primitives',
    id: 'alert',
    name: 'Alert',
    render: (args: Args, action: Action) =>
      narrow(
        420,
        h(
          Alert,
          {
            dismissible: bool(args, 'dismissible'),
            onDismiss: () => action('dismiss'),
            severity: str(args, 'severity'),
          },
          {default: () => str(args, 'children')},
        ),
      ),
    stories: [
      {id: 'info', name: 'Info'},
      {
        args: {children: 'You can now sign in with your new password.', severity: 'success'},
        id: 'success',
        name: 'Success',
      },
      {
        args: {children: 'You will be signed out in 2 minutes.', dismissible: true, severity: 'warning'},
        id: 'warning',
        name: 'Warning',
      },
      {args: {children: 'The email or password is incorrect.', severity: 'error'}, id: 'error', name: 'Error'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Button', 'Card', 'Typography'],
      template: `${tpl('Card', args, {defaults: {variant: 'elevated'}}).replace(/ ?\/>$/, '>')}\n  <Typography variant="h5">Verify your identity</Typography>\n  <Typography variant="body2">Use a passkey, an authenticator app, or a code sent by email.</Typography>\n  <Button full-width>Continue</Button>\n</Card>`,
    }),
    controls: [
      {control: CARD_VARIANT, description: 'Surface style.', name: 'variant', type: "'elevated' | 'outlined' | 'flat'"},
    ],
    defaults: {variant: 'outlined'},
    group: 'Primitives',
    id: 'card',
    name: 'Card',
    render: (args: Args, action: Action) =>
      narrow(
        360,
        h(
          Card,
          {style: {display: 'grid', gap: '12px', padding: '20px'}, variant: str(args, 'variant')},
          {
            default: () => [
              h(Typography, {variant: 'h5'}, {default: () => 'Verify your identity'}),
              h(
                Typography,
                {variant: 'body2'},
                {default: () => 'Use a passkey, an authenticator app, or a code sent by email.'},
              ),
              h(Button, {fullWidth: true, onClick: () => action('click', 'Continue')}, {default: () => 'Continue'}),
            ],
          },
        ),
      ),
    stories: [
      {id: 'outlined', name: 'Outlined'},
      {args: {variant: 'elevated'}, id: 'elevated', name: 'Elevated'},
      {args: {variant: 'flat'}, id: 'flat', name: 'Flat'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Typography'],
      template: tpl('Typography', omit(args, 'children'), {
        children: str(args, 'children'),
        defaults: {variant: 'body1'},
      }),
    }),
    controls: [
      {control: 'text', description: 'Text, passed in the default slot.', name: 'children', type: 'slot'},
      {
        control: [
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'subtitle1',
          'subtitle2',
          'body1',
          'body2',
          'caption',
          'overline',
        ],
        description: 'Type scale step.',
        name: 'variant',
        type: 'TypographyVariant',
      },
      {control: 'text', description: 'Overrides the rendered element.', name: 'component', type: 'string'},
    ],
    defaults: {children: 'Welcome back, Liam', component: '', variant: 'h4'},
    group: 'Primitives',
    id: 'typography',
    name: 'Typography',
    render: (args: Args) =>
      h(
        Typography,
        {component: str(args, 'component') || undefined, variant: str(args, 'variant')},
        {default: () => str(args, 'children')},
      ),
    stories: [
      {id: 'heading', name: 'Heading'},
      {args: {children: 'Signed in with a passkey.', variant: 'body2'}, id: 'body', name: 'Body'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Divider'],
      template: tpl('Divider', omit(args, 'children'), {children: str(args, 'children') || undefined}),
    }),
    controls: [
      {control: 'text', description: 'Optional label in the middle (default slot).', name: 'children', type: 'slot'},
    ],
    defaults: {children: 'or'},
    group: 'Primitives',
    id: 'divider',
    name: 'Divider',
    render: (args: Args) => narrow(320, h(Divider, null, slot(str(args, 'children')))),
    stories: [
      {id: 'label', name: 'With label'},
      {args: {children: ''}, id: 'plain', name: 'Plain'},
    ],
  },
  {
    code: (args: Args) => ({imports: ['Spinner'], template: tpl('Spinner', args, {defaults: {size: 'medium'}})}),
    controls: [{control: SIZE, description: 'Spinner size.', name: 'size', type: "'small' | 'medium' | 'large'"}],
    defaults: {size: 'medium'},
    group: 'Primitives',
    id: 'spinner',
    name: 'Spinner',
    render: (args: Args) => h(Spinner, {size: str(args, 'size')}),
    stories: [
      {id: 'medium', name: 'Medium'},
      {args: {size: 'large'}, id: 'large', name: 'Large'},
    ],
  },
  {
    code: (args: Args) => ({imports: ['CopyableText'], template: tpl('CopyableText', args)}),
    controls: [
      {control: 'text', description: 'Label above the value.', name: 'label', type: 'string'},
      {control: 'text', description: 'Text to show and copy.', name: 'value', type: 'string'},
      {control: 'bool', description: 'Masks the value until revealed.', name: 'masked', type: 'boolean'},
    ],
    defaults: {label: 'Recovery code', masked: false, value: 'K7QF-29XM-PL4D'},
    group: 'Primitives',
    id: 'copyabletext',
    name: 'CopyableText',
    render: (args: Args) =>
      narrow(
        360,
        h(CopyableText, {label: str(args, 'label'), masked: bool(args, 'masked'), value: str(args, 'value')}),
      ),
    stories: [
      {id: 'default', name: 'Default'},
      {args: {masked: true}, id: 'masked', name: 'Masked'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['KeyValueList'],
      script: [
        "const pairs = [{label: 'Client ID', value: 'spa-app'}, {label: 'Grant', value: 'authorization_code'}];",
      ],
      template: tpl('KeyValueList', args, {extra: [':pairs="pairs"']}),
    }),
    controls: [{control: 'text', description: 'Optional label above the list.', name: 'label', type: 'string'}],
    defaults: {label: 'Application'},
    group: 'Primitives',
    id: 'keyvaluelist',
    name: 'KeyValueList',
    render: (args: Args) =>
      narrow(
        360,
        h(KeyValueList, {
          label: str(args, 'label') || undefined,
          pairs: [
            {label: 'Client ID', value: 'spa-app'},
            {label: 'Grant', value: 'authorization_code'},
            {label: 'Redirect', value: 'http://localhost:5174'},
          ],
        }),
      ),
    stories: [{id: 'default', name: 'Default'}],
  },
  {
    code: (args: Args) => ({imports: ['Logo'], template: tpl('Logo', args)}),
    controls: [
      {control: 'text', description: 'Image URL.', name: 'src', type: 'string'},
      {control: 'text', description: 'Alternative text.', name: 'alt', type: 'string'},
      {control: 'number', description: 'Height in px.', name: 'height', type: 'string | number'},
    ],
    defaults: {alt: 'ThunderID', height: 32, src: '/thunderid-logo.svg'},
    group: 'Primitives',
    id: 'logo',
    name: 'Logo',
    render: (args: Args) => h(Logo, {alt: str(args, 'alt'), height: num(args, 'height'), src: str(args, 'src')}),
    stories: [{id: 'default', name: 'Default'}],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {
            imports: ['SignInButton'],
            template: tpl('SignInButton', {}, {children: str(args, 'children') || undefined}),
          }
        : {
            imports: ['BaseSignInButton'],
            script: handler('handleSignIn'),
            template: tpl('BaseSignInButton', {}, {children: str(args, 'children'), extra: ['@click="handleSignIn"']}),
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: 'Button label (default slot); empty uses the translated default.',
        name: 'children',
        type: 'slot',
      },
    ],
    defaults: {children: 'Sign in', source: 'base'},
    group: 'Actions',
    id: 'signinbutton',
    live: true,
    name: 'SignInButton',
    render: (args: Args, action: Action) =>
      str(args, 'source') === 'live'
        ? h(
            SignInButton,
            {
              onClick: () => action('click', 'signIn() redirected'),
              onError: (error: Error) => action('error', error.message),
            },
            slot(str(args, 'children')),
          )
        : h(BaseSignInButton, {onClick: () => action('click', 'base, no redirect')}, slot(str(args, 'children'))),
    stories: [
      {id: 'base', name: 'Base (no redirect)'},
      {args: {children: '', source: 'live'}, id: 'live', name: 'Live (redirects)'},
    ],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {
            imports: ['SignOutButton'],
            template: tpl('SignOutButton', {}, {children: str(args, 'children') || undefined}),
          }
        : {
            imports: ['BaseSignOutButton'],
            script: handler('handleSignOut'),
            template: tpl(
              'BaseSignOutButton',
              {},
              {children: str(args, 'children'), extra: ['@click="handleSignOut"']},
            ),
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: 'Button label (default slot); empty uses the translated default.',
        name: 'children',
        type: 'slot',
      },
    ],
    defaults: {children: 'Sign out', source: 'base'},
    group: 'Actions',
    id: 'signoutbutton',
    live: true,
    name: 'SignOutButton',
    render: (args: Args, action: Action) =>
      str(args, 'source') === 'live'
        ? h(
            SignOutButton,
            {
              onClick: () => action('click', 'signOut() resolved'),
              onError: (error: Error) => action('error', error.message),
            },
            slot(str(args, 'children')),
          )
        : h(BaseSignOutButton, {onClick: () => action('click', 'base')}, slot(str(args, 'children'))),
    stories: [
      {id: 'base', name: 'Base'},
      {args: {children: '', source: 'live'}, id: 'live', name: 'Live (signs out)'},
    ],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {
            imports: ['SignUpButton'],
            template: tpl('SignUpButton', {}, {children: str(args, 'children') || undefined}),
          }
        : {
            imports: ['BaseSignUpButton'],
            script: handler('handleSignUp'),
            template: tpl('BaseSignUpButton', {}, {children: str(args, 'children'), extra: ['@click="handleSignUp"']}),
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: 'Button label (default slot); empty uses the translated default.',
        name: 'children',
        type: 'slot',
      },
    ],
    defaults: {children: 'Create account', source: 'base'},
    group: 'Actions',
    id: 'signupbutton',
    live: true,
    name: 'SignUpButton',
    render: (args: Args, action: Action) =>
      str(args, 'source') === 'live'
        ? h(
            SignUpButton,
            {
              onClick: () => action('click', 'signUp() started'),
              onError: (error: Error) => action('error', error.message),
            },
            slot(str(args, 'children')),
          )
        : h(BaseSignUpButton, {onClick: () => action('click', 'base')}, slot(str(args, 'children'))),
    stories: [
      {id: 'base', name: 'Base'},
      {args: {children: '', source: 'live'}, id: 'live', name: 'Live'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: [str(args, 'provider')],
      script: handler('handleClick'),
      template: tpl(str(args, 'provider'), omit(args, 'provider', 'children'), {
        children: str(args, 'children') || undefined,
        extra: ['@click="handleClick"'],
      }),
    }),
    controls: [
      {
        control: Object.keys(SOCIAL),
        description: 'Which adapter button to render.',
        name: 'provider',
        type: 'component',
      },
      {
        control: 'text',
        description: 'Label (default slot); empty uses the translated default.',
        name: 'children',
        type: 'slot',
      },
      {control: 'bool', description: 'Shows a loading state.', name: 'isLoading', type: 'boolean'},
    ],
    defaults: {children: '', isLoading: false, provider: 'GoogleButton'},
    group: 'Actions',
    id: 'social',
    name: 'Social buttons',
    render: (args: Args, action: Action) =>
      narrow(
        320,
        h(
          SOCIAL[str(args, 'provider')] ?? GoogleButton,
          {isLoading: bool(args, 'isLoading'), onClick: () => action('click', str(args, 'provider'))},
          slot(str(args, 'children')),
        ),
      ),
    stories: [
      {id: 'google', name: 'Google'},
      {args: {provider: 'GitHubButton'}, id: 'github', name: 'GitHub'},
      {args: {provider: 'MicrosoftButton'}, id: 'microsoft', name: 'Microsoft'},
      {args: {provider: 'FacebookButton'}, id: 'facebook', name: 'Facebook'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['SignIn'],
      script: [...handler('handleSuccess'), ...handler('handleError')],
      template: tpl('SignIn', args, {
        defaults: {size: 'medium', variant: 'outlined'},
        extra: ['@success="handleSuccess"', '@error="handleError"'],
      }),
    }),
    controls: [
      {control: SIZE, description: 'Spacing and control size.', name: 'size', type: "'small' | 'medium' | 'large'"},
      {
        control: CARD_VARIANT,
        description: 'Card variant of the flow container.',
        name: 'variant',
        type: "'elevated' | 'outlined' | 'flat'",
      },
    ],
    defaults: {size: 'medium', variant: 'outlined'},
    group: 'Auth flows',
    id: 'signin',
    live: true,
    name: 'SignIn',
    render: (args: Args, action: Action) =>
      narrow(
        400,
        h(SignIn, {
          onError: (error: Error) => action('error', error.message),
          onSuccess: (data: unknown) => action('success', JSON.stringify(data).slice(0, 120)),
          size: str(args, 'size'),
          variant: str(args, 'variant'),
        }),
      ),
    stories: [
      {id: 'default', name: 'Default'},
      {args: {size: 'small', variant: 'elevated'}, id: 'compact', name: 'Compact'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['SignUp'],
      script: [...handler('handleComplete'), ...handler('handleError')],
      template: tpl('SignUp', args, {
        defaults: {size: 'medium', variant: 'outlined'},
        extra: [':on-complete="handleComplete"', ':on-error="handleError"'],
      }),
    }),
    controls: [
      {control: SIZE, description: 'Spacing and control size.', name: 'size', type: "'small' | 'medium' | 'large'"},
      {
        control: CARD_VARIANT,
        description: 'Card variant of the flow container.',
        name: 'variant',
        type: "'elevated' | 'outlined' | 'flat'",
      },
    ],
    defaults: {size: 'medium', variant: 'outlined'},
    group: 'Auth flows',
    id: 'signup',
    live: true,
    name: 'SignUp',
    render: (args: Args, action: Action) =>
      narrow(
        400,
        h(SignUp, {
          onComplete: () => action('onComplete'),
          onError: (error: Error) => action('onError', error.message),
          size: str(args, 'size'),
          variant: str(args, 'variant'),
        }),
      ),
    stories: [{id: 'default', name: 'Default'}],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {
            imports: ['ChangeCredential'],
            script: handler('handleSuccess'),
            template: tpl('ChangeCredential', omit(args, 'source', 'loading', 'success', 'error'), {
              defaults: {showRequirements: true},
              extra: ['@success="handleSuccess"'],
            }),
          }
        : {
            imports: ['BaseChangeCredential'],
            script: ['const handleSubmit = ({newPassword}: {newPassword: string}): void => {};'],
            template: tpl('BaseChangeCredential', omit(args, 'source'), {
              defaults: {showRequirements: true},
              extra: ['@submit="handleSubmit"'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      {control: 'text', description: 'Heading of the form.', name: 'title', type: 'string'},
      {control: 'bool', description: 'Wraps the form in a card.', name: 'cardLayout', type: 'boolean'},
      {control: 'bool', description: 'Lists the password policy.', name: 'showRequirements', type: 'boolean'},
      {control: 'bool', description: 'Base only: shows the busy state.', name: 'loading', type: 'boolean'},
      {control: 'bool', description: 'Base only: shows the success state.', name: 'success', type: 'boolean'},
      {control: 'text', description: 'Base only: form error.', name: 'error', type: 'string'},
    ],
    defaults: {
      cardLayout: true,
      error: '',
      loading: false,
      showRequirements: true,
      source: 'base',
      success: false,
      title: 'Change password',
    },
    group: 'Auth flows',
    id: 'changecredential',
    live: true,
    name: 'ChangeCredential',
    render: (args: Args, action: Action) =>
      narrow(
        420,
        str(args, 'source') === 'live'
          ? h(ChangeCredential, {
              cardLayout: bool(args, 'cardLayout'),
              onSuccess: () => action('success'),
              showRequirements: bool(args, 'showRequirements'),
              title: str(args, 'title') || undefined,
            })
          : h(BaseChangeCredential, {
              cardLayout: bool(args, 'cardLayout'),
              error: str(args, 'error') || null,
              loading: bool(args, 'loading'),
              onSubmit: (values: {newPassword: string}) =>
                action('submit', `newPassword "${'•'.repeat(values.newPassword.length)}"`),
              showRequirements: bool(args, 'showRequirements'),
              success: bool(args, 'success'),
              title: str(args, 'title') || undefined,
            }),
      ),
    stories: [
      {id: 'base', name: 'Base'},
      {args: {error: 'The current password is incorrect.'}, id: 'error', name: 'With error'},
      {args: {source: 'live'}, id: 'live', name: 'Signed-in user'},
    ],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {
            imports: ['UserDropdown'],
            script: handler('openProfile'),
            template: tpl('UserDropdown', omit(args, 'source'), {
              defaults: {size: 'md'},
              extra: [':on-manage-profile="openProfile"'],
            }),
          }
        : {
            imports: ['BaseUserDropdown'],
            script: handler('signOut'),
            template: tpl('BaseUserDropdown', omit(args, 'source'), {
              defaults: {size: 'md'},
              extra: [':user="user"', ':on-sign-out="signOut"'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      {control: 'bool', description: 'Shows the name next to the avatar.', name: 'showTriggerLabel', type: 'boolean'},
      {control: 'bool', description: 'Shows a chevron on the trigger.', name: 'showChevron', type: 'boolean'},
      {control: ['sm', 'md', 'lg'], description: 'Trigger size.', name: 'size', type: "'sm' | 'md' | 'lg'"},
    ],
    defaults: {showChevron: true, showTriggerLabel: true, size: 'md', source: 'base'},
    group: 'User',
    id: 'userdropdown',
    live: true,
    name: 'UserDropdown',
    render: (args: Args, action: Action) =>
      str(args, 'source') === 'live'
        ? h(UserDropdown, {
            onManageProfile: () => action('onManageProfile'),
            showChevron: bool(args, 'showChevron'),
            showTriggerLabel: bool(args, 'showTriggerLabel'),
            size: str(args, 'size'),
          })
        : h(BaseUserDropdown, {
            onProfileClick: () => action('onProfileClick'),
            onSignOut: () => action('onSignOut'),
            showChevron: bool(args, 'showChevron'),
            showTriggerLabel: bool(args, 'showTriggerLabel'),
            size: str(args, 'size'),
            user: SAMPLE_USER,
          }),
    stories: [
      {id: 'base', name: 'Sample user'},
      {args: {source: 'live'}, id: 'live', name: 'Signed-in user'},
    ],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {
            imports: ['UserProfile'],
            template: tpl('UserProfile', omit(args, 'source'), {
              defaults: {cardLayout: true, editable: true, showAvatar: true, title: 'Profile'},
            }),
          }
        : {
            imports: ['BaseUserProfile'],
            script: ['const handleUpdate = async (payload: Record<string, unknown>): Promise<void> => {};'],
            template: tpl('BaseUserProfile', omit(args, 'source'), {
              defaults: {cardLayout: true, editable: true, showAvatar: true, title: 'Profile'},
              extra: [':profile="profile"', ':on-update="handleUpdate"'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      {control: 'text', description: 'Heading of the profile card.', name: 'title', type: 'string'},
      {control: 'bool', description: 'Allows editing fields.', name: 'editable', type: 'boolean'},
      {control: 'bool', description: 'Wraps the profile in a card.', name: 'cardLayout', type: 'boolean'},
      {control: 'bool', description: 'Shows the avatar.', name: 'showAvatar', type: 'boolean'},
      {control: 'bool', description: 'Tighter spacing.', name: 'compact', type: 'boolean'},
    ],
    defaults: {cardLayout: true, compact: false, editable: true, showAvatar: true, source: 'base', title: 'Profile'},
    group: 'User',
    id: 'userprofile',
    live: true,
    name: 'UserProfile',
    render: (args: Args, action: Action) => {
      const common: Record<string, unknown> = {
        cardLayout: bool(args, 'cardLayout'),
        compact: bool(args, 'compact'),
        editable: bool(args, 'editable'),
        showAvatar: bool(args, 'showAvatar'),
        title: str(args, 'title'),
      };

      return narrow(
        520,
        str(args, 'source') === 'live'
          ? h(UserProfile, common)
          : h(BaseUserProfile, {
              ...common,
              flattenedProfile: SAMPLE_PROFILE,
              onUpdate: (payload: unknown) => {
                action('onUpdate', JSON.stringify(payload));

                return Promise.resolve();
              },
              profile: SAMPLE_PROFILE,
            }),
      );
    },
    stories: [
      {id: 'base', name: 'Sample profile'},
      {args: {source: 'live'}, id: 'live', name: 'Signed-in user (editable)'},
    ],
  },
  {
    code: () => ({
      imports: ['User'],
      template:
        '<User>\n  <template #default="{user}">\n    <p>Hello, {{ user.given_name }}</p>\n  </template>\n  <template #fallback>\n    <p>Not signed in</p>\n  </template>\n</User>',
    }),
    controls: [],
    defaults: {},
    group: 'User',
    id: 'user',
    live: true,
    name: 'User',
    render: () =>
      h(User, null, {
        default: ({user}: {user: Record<string, unknown>}) =>
          h(Typography, {variant: 'body1'}, {default: () => `Hello, ${getDisplayName(user)}`}),
        fallback: () => h(Typography, {variant: 'body1'}, {default: () => 'Not signed in'}),
      }),
    stories: [{id: 'default', name: 'Scoped slot'}],
  },
  {
    code: () => ({
      imports: ['SignedIn', 'SignedOut', 'SignInButton', 'SignOutButton'],
      template: '<SignedIn>\n  <SignOutButton />\n</SignedIn>\n<SignedOut>\n  <SignInButton />\n</SignedOut>',
    }),
    controls: [],
    defaults: {},
    group: 'Control',
    id: 'signedin',
    live: true,
    name: 'SignedIn / SignedOut',
    render: () =>
      h('div', {style: {alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '12px'}}, [
        h(SignedIn, null, {
          default: () => [
            h(Typography, {variant: 'body2'}, {default: () => 'Rendered by <SignedIn>'}),
            h(SignOutButton),
          ],
        }),
        h(SignedOut, null, {
          default: () => [
            h(Typography, {variant: 'body2'}, {default: () => 'Rendered by <SignedOut>'}),
            h(SignInButton),
          ],
        }),
      ]),
    stories: [{id: 'default', name: 'Session gate'}],
  },
  {
    code: () => ({
      imports: ['Loading', 'Spinner'],
      template: '<Loading>\n  <Spinner />\n  <template #fallback>\n    <p>Ready</p>\n  </template>\n</Loading>',
    }),
    controls: [],
    defaults: {},
    group: 'Control',
    id: 'loading',
    live: true,
    name: 'Loading',
    render: () =>
      h(Loading, null, {
        default: () => h(Spinner),
        fallback: () =>
          h(Typography, {variant: 'body2'}, {default: () => 'Rendered by the fallback slot: not loading'}),
      }),
    stories: [{id: 'default', name: 'Loading gate'}],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {imports: ['LanguageSwitcher'], template: '<LanguageSwitcher />'}
        : {
            imports: ['BaseLanguageSwitcher'],
            script: [
              "const language = ref('en');",
              "const languages = [{label: 'English', value: 'en'}, {label: 'French', value: 'fr'}];",
            ],
            template: tpl(
              'BaseLanguageSwitcher',
              {},
              {
                extra: [
                  ':languages="languages"',
                  ':current-language="language"',
                  ':on-language-change="(lang) => (language = lang)"',
                ],
              },
            ),
            vueImports: ['ref'],
          },
    controls: [SOURCE_CONTROL],
    defaults: {source: 'live'},
    group: 'Control',
    id: 'languageswitcher',
    name: 'LanguageSwitcher',
    render: (args: Args, action: Action) =>
      str(args, 'source') === 'live'
        ? h(LanguageSwitcher)
        : h(BaseLanguageSwitcher, {
            currentLanguage: 'en',
            languages: [
              {label: 'English', value: 'en'},
              {label: 'French', value: 'fr'},
              {label: 'Spanish', value: 'es'},
            ],
            onLanguageChange: (language: string) => action('onLanguageChange', quoted(language)),
          }),
    stories: [
      {id: 'live', name: 'Live (useI18n)'},
      {args: {source: 'base'}, id: 'base', name: 'Base'},
    ],
  },
  ...ADMIN_COMPONENTS,
  ...CUSTOM_RENDER_COMPONENTS,
];

export const STORY_COUNT: number = COMPONENTS.reduce(
  (total: number, component: ComponentDef) => total + component.stories.length,
  0,
);

export const GROUPS: string[] = Array.from(new Set(COMPONENTS.map((component: ComponentDef) => component.group)));

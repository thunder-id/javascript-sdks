// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Alert,
  BaseSignInButton,
  BaseSignOutButton,
  BaseSignUpButton,
  BaseUserDropdown,
  BaseUserProfile,
  Button,
  Card,
  Divider,
  FacebookButton,
  GitHubButton,
  GoogleButton,
  LanguageSwitcher,
  MicrosoftButton,
  Spinner,
  Typography,
} from '@thunderid/vue';
import {defineComponent, h, ref, type Component, type PropType, type Ref, type VNode} from 'vue';
import {ADMIN_COMPONENTS} from './adminStories';
import {CUSTOM_RENDER_COMPONENTS} from './customRenderStories';
import {tag} from './storyCode';
import type {Action, Args, ArgValue, ComponentDef, PropControl} from './storyTypes';
import {CheckboxStory, narrow, OtpFieldStory, PasswordFieldStory, SelectStory, TextFieldStory} from './storyWidgets';
import {getDisplayName} from './user';
import {
  AuthFlowSelect,
  ChangeCredential,
  Loading,
  SignedIn,
  SignedOut,
  SignIn,
  SignInButton,
  SignOutButton,
  SignUp,
  SignUpButton,
  User,
  UserDropdown,
  UserProfile,
  UserSelect,
  UserTypeSelect,
} from '#components';

const str = (args: Args, key: string): string => String(args[key] ?? '');
const bool = (args: Args, key: string): boolean => args[key] === true;

const omit = (args: Args, ...keys: string[]): Args =>
  Object.fromEntries(Object.entries(args).filter(([key]: [string, ArgValue]) => !keys.includes(key)));

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
const CARD_VARIANT: readonly string[] = ['elevated', 'outlined', 'flat'];
const SOURCE_CONTROL: PropControl = {
  control: ['base', 'live'],
  description:
    'base renders the presentational Base component from @thunderid/vue with sample data; live uses the module.',
  name: 'source',
  type: "'base' | 'live' (playground only)",
};

const SOCIAL: Record<string, Component> = {FacebookButton, GitHubButton, GoogleButton, MicrosoftButton};

const modelScript: string[] = ["const value = ref('');"];

/** Wraps a picker of the module in a story component that holds its `v-model`. */
const pickerStory = (name: string, picker: Component): Component =>
  defineComponent({
    name,
    props: {
      action: {required: true, type: Function as PropType<Action>},
      args: {required: true, type: Object as PropType<Args>},
    },
    setup(props: {action: Action; args: Args}): () => VNode {
      const value: Ref<string> = ref('');

      return (): VNode =>
        narrow(
          340,
          h(picker, {
            label: str(props.args, 'label'),
            modelValue: value.value,
            'onUpdate:modelValue': (next: string) => {
              value.value = next;
              props.action('update:modelValue', `"${next}"`);
            },
          }),
        );
    },
  });

const UserSelectStory: Component = pickerStory('UserSelectStory', UserSelect);
const AuthFlowSelectStory: Component = pickerStory('AuthFlowSelectStory', AuthFlowSelect);
const UserTypeSelectStory: Component = pickerStory('UserTypeSelectStory', UserTypeSelect);

const pickerDef = (
  id: string,
  name: string,
  story: Component,
  label: string,
  route: string,
  option: string,
): ComponentDef => ({
  code: (args: Args) => ({
    imports: [],
    script: modelScript,
    template: tag(name, args, {extra: ['v-model="value"']}),
  }),
  controls: [{control: 'text', description: 'Visible field label.', name: 'label', type: 'string'}],
  defaults: {label},
  group: 'Pickers',
  id,
  live: true,
  name,
  render: (args: Args, action: Action) => h(story, {action, args}),
  stories: [{id: 'default', name: `Loads ${route} (resourcePickers.${option})`}],
});

const actionButton = (
  id: string,
  name: string,
  base: Component,
  live: Component,
  label: string,
  call: string,
): ComponentDef => ({
  code: (args: Args) =>
    str(args, 'source') === 'live'
      ? {imports: [], template: tag(name, {}, {children: str(args, 'children') || undefined})}
      : {
          imports: [`Base${name}`],
          template: tag(`Base${name}`, {}, {children: str(args, 'children'), extra: ['@click="handleClick"']}),
        },
  controls: [
    SOURCE_CONTROL,
    {control: 'text', description: 'Button label; empty uses the translated default.', name: 'children', type: 'slot'},
  ],
  defaults: {children: label, source: 'base'},
  group: 'Actions',
  id: id,
  live: true,
  name,
  render: (args: Args, action: Action) => {
    const text: string = str(args, 'children');

    if (str(args, 'source') === 'live') {
      return h(
        live,
        {
          onClick: () => action('click', `${call} called`),
          onError: (error: Error) => action('error', error.message),
        },
        text ? {default: () => text} : undefined,
      );
    }

    return h(base, {onClick: () => action('click', 'base button, no SDK call')}, {default: () => text});
  },
  stories: [
    {id: 'base', name: 'Base (no SDK call)'},
    {args: {children: '', source: 'live'}, id: 'live', name: `Live (${call})`},
  ],
});

export const COMPONENTS: ComponentDef[] = [
  {
    code: (args: Args) => ({
      imports: ['Button'],
      template: tag('Button', omit(args, 'children'), {
        children: str(args, 'children'),
        defaults: {color: 'primary', size: 'medium', variant: 'solid'},
        extra: ['@click="handleClick"'],
      }),
    }),
    controls: [
      {control: 'text', description: 'Button label.', name: 'children', type: 'slot'},
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
      {args: {color: 'secondary', variant: 'text'}, id: 'text', name: 'Text'},
      {args: {color: 'danger', variant: 'solid'}, id: 'danger', name: 'Danger'},
      {args: {loading: true}, id: 'loading', name: 'Loading'},
      {args: {disabled: true}, id: 'disabled', name: 'Disabled'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['TextField'],
      script: modelScript,
      template: tag('TextField', args, {extra: ['v-model="value"']}),
    }),
    controls: [
      {control: 'text', description: 'Visible field label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Hint shown when empty.', name: 'placeholder', type: 'string'},
      {control: 'text', description: 'Help text below the field.', name: 'helperText', type: 'string'},
      {control: 'text', description: 'Error message; marks the field invalid.', name: 'error', type: 'string'},
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
    },
    group: 'Primitives',
    id: 'textfield',
    name: 'TextField',
    render: (args: Args, action: Action) => h(TextFieldStory, {action, args}),
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
      script: modelScript,
      template: tag('PasswordField', args, {extra: ['v-model="value"']}),
    }),
    controls: [
      {control: 'text', description: 'Visible field label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Hint shown when empty.', name: 'placeholder', type: 'string'},
      {control: 'text', description: 'Error message; marks the field invalid.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Marks the field as required.', name: 'required', type: 'boolean'},
      {control: 'bool', description: 'Disables the field.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', label: 'Password', placeholder: 'Enter your password', required: true},
    group: 'Primitives',
    id: 'passwordfield',
    name: 'PasswordField',
    render: (args: Args, action: Action) => h(PasswordFieldStory, {action, args}),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {error: 'Password must be at least 8 characters.'}, id: 'error', name: 'With error'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['OtpField'],
      script: modelScript,
      template: tag('OtpField', args, {defaults: {length: 6, numericOnly: true}, extra: ['v-model="value"']}),
    }),
    controls: [
      {control: 'text', description: 'Visible field label.', name: 'label', type: 'string'},
      {control: 'number', description: 'Number of digits.', name: 'length', type: 'number'},
      {control: 'bool', description: 'Accepts digits only.', name: 'numericOnly', type: 'boolean'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Disables the field.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', label: 'Verification code', length: 6, numericOnly: true},
    group: 'Primitives',
    id: 'otpfield',
    name: 'OtpField',
    render: (args: Args, action: Action) => h(OtpFieldStory, {action, args}),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {length: 4}, id: 'four', name: 'Four digits'},
      {args: {error: 'That code has expired.'}, id: 'error', name: 'With error'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Checkbox'],
      script: ['const value = ref(false);'],
      template: tag('Checkbox', args, {extra: ['v-model="value"']}),
    }),
    controls: [
      {control: 'text', description: 'Label next to the box.', name: 'label', type: 'string'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Marks the field as required.', name: 'required', type: 'boolean'},
      {control: 'bool', description: 'Disables the checkbox.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', label: 'I agree to the terms of service', required: false},
    group: 'Primitives',
    id: 'checkbox',
    name: 'Checkbox',
    render: (args: Args, action: Action) => h(CheckboxStory, {action, args}),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {error: 'You must accept the terms.', required: true}, id: 'error', name: 'With error'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Select'],
      script: [
        "const value = ref('');",
        'const options = [',
        "  {label: 'Engineering', value: 'eng'},",
        "  {label: 'Design', value: 'design'},",
        "  {label: 'Sales', value: 'sales'},",
        '];',
      ],
      template: tag('Select', args, {extra: ['v-model="value"', ':options="options"']}),
    }),
    controls: [
      {control: 'text', description: 'Visible field label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Text of the empty option.', name: 'placeholder', type: 'string'},
      {control: 'text', description: 'Help text below the field.', name: 'helperText', type: 'string'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Shows that options are loading.', name: 'loading', type: 'boolean'},
      {control: 'bool', description: 'Disables the field.', name: 'disabled', type: 'boolean'},
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
    render: (args: Args, action: Action) => h(SelectStory, {action, args}),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {loading: true}, id: 'loading', name: 'Loading'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Alert'],
      template: tag('Alert', omit(args, 'message'), {
        children: str(args, 'message'),
        defaults: {severity: 'info'},
        extra: bool(args, 'dismissible') ? ['@dismiss="handleDismiss"'] : [],
      }),
    }),
    controls: [
      {control: 'text', description: 'Alert text.', name: 'message', type: 'slot'},
      {
        control: ['info', 'success', 'warning', 'error'],
        description: 'Color and icon.',
        name: 'severity',
        type: "'success' | 'error' | 'warning' | 'info'",
      },
      {control: 'bool', description: 'Shows a close button.', name: 'dismissible', type: 'boolean'},
    ],
    defaults: {dismissible: false, message: 'We sent a code to liam.chen@acme.io.', severity: 'info'},
    group: 'Primitives',
    id: 'alert',
    name: 'Alert',
    render: (args: Args, action: Action) =>
      narrow(
        420,
        h(
          Alert,
          {dismissible: bool(args, 'dismissible'), onDismiss: () => action('dismiss'), severity: str(args, 'severity')},
          {default: () => str(args, 'message')},
        ),
      ),
    stories: [
      {id: 'info', name: 'Info'},
      {args: {message: 'Your profile was updated.', severity: 'success'}, id: 'success', name: 'Success'},
      {args: {message: 'Your session expires in 2 minutes.', severity: 'warning'}, id: 'warning', name: 'Warning'},
      {
        args: {dismissible: true, message: 'Those credentials did not match.', severity: 'error'},
        id: 'error',
        name: 'Error, dismissible',
      },
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Card', 'Typography'],
      template: tag('Card', args, {
        children:
          '\n  <Typography variant="h6">Card title</Typography>\n  <Typography variant="body2">Card content.</Typography>\n',
        defaults: {variant: 'elevated'},
      }),
    }),
    controls: [
      {
        control: CARD_VARIANT,
        description: 'Shadow or border.',
        name: 'variant',
        type: "'elevated' | 'outlined' | 'flat'",
      },
    ],
    defaults: {variant: 'outlined'},
    group: 'Primitives',
    id: 'card',
    name: 'Card',
    render: (args: Args) =>
      narrow(
        360,
        h(
          Card,
          {variant: str(args, 'variant')},
          {
            default: () =>
              h('div', {style: {padding: '20px'}}, [
                h(Typography, {variant: 'h6'}, {default: () => 'Workspace settings'}),
                h(Typography, {variant: 'body2'}, {default: () => 'Cards group related content and actions.'}),
              ]),
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
      template: tag('Typography', omit(args, 'text'), {children: str(args, 'text'), defaults: {variant: 'body1'}}),
    }),
    controls: [
      {control: 'text', description: 'Text content.', name: 'text', type: 'slot'},
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
    ],
    defaults: {text: 'Welcome back', variant: 'h4'},
    group: 'Primitives',
    id: 'typography',
    name: 'Typography',
    render: (args: Args) => h(Typography, {variant: str(args, 'variant')}, {default: () => str(args, 'text')}),
    stories: [
      {id: 'heading', name: 'Heading'},
      {args: {text: 'Sign in to continue to Acme.', variant: 'body1'}, id: 'body', name: 'Body'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Divider'],
      template: tag('Divider', omit(args, 'label'), {
        children: str(args, 'label') || undefined,
        defaults: {orientation: 'horizontal'},
      }),
    }),
    controls: [{control: 'text', description: 'Optional centered label.', name: 'label', type: 'slot'}],
    defaults: {label: 'or'},
    group: 'Primitives',
    id: 'divider',
    name: 'Divider',
    render: (args: Args) =>
      narrow(360, h(Divider, null, str(args, 'label') ? {default: () => str(args, 'label')} : undefined)),
    stories: [
      {id: 'label', name: 'With label'},
      {args: {label: ''}, id: 'plain', name: 'Plain'},
    ],
  },
  {
    code: (args: Args) => ({imports: ['Spinner'], template: tag('Spinner', args, {defaults: {size: 'medium'}})}),
    controls: [{control: SIZE, description: 'Diameter.', name: 'size', type: "'small' | 'medium' | 'large'"}],
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
  actionButton('signinbutton', 'SignInButton', BaseSignInButton, SignInButton, 'Sign in', 'signIn()'),
  actionButton('signoutbutton', 'SignOutButton', BaseSignOutButton, SignOutButton, 'Sign out', 'signOut()'),
  actionButton('signupbutton', 'SignUpButton', BaseSignUpButton, SignUpButton, 'Create account', 'signUp()'),
  {
    code: (args: Args) => ({
      imports: [str(args, 'provider')],
      template: tag(str(args, 'provider'), {}, {extra: ['@click="handleClick"']}),
    }),
    controls: [
      {
        control: Object.keys(SOCIAL),
        description: 'Which adapter button to render.',
        name: 'provider',
        type: 'component',
      },
    ],
    defaults: {provider: 'GoogleButton'},
    group: 'Actions',
    id: 'social',
    name: 'Social buttons',
    render: (args: Args, action: Action) =>
      narrow(
        320,
        h(SOCIAL[str(args, 'provider')] ?? GoogleButton, {onClick: () => action('click', str(args, 'provider'))}),
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
      imports: [],
      template: tag('SignIn', args, {
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
    code: () => ({
      imports: [],
      template: '<SignUp :on-complete="handleComplete" :on-error="handleError" />',
    }),
    controls: [],
    defaults: {},
    group: 'Auth flows',
    id: 'signup',
    live: true,
    name: 'SignUp',
    render: (_args: Args, action: Action) =>
      narrow(
        400,
        h(SignUp, {
          onComplete: () => action('onComplete'),
          onError: (error: Error) => action('onError', error.message),
          shouldRedirectAfterSignUp: false,
        }),
      ),
    stories: [{id: 'default', name: 'Default'}],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {imports: [], template: tag('UserDropdown', omit(args, 'source'), {defaults: {showTriggerLabel: false}})}
        : {
            imports: ['BaseUserDropdown'],
            template: tag('BaseUserDropdown', omit(args, 'source'), {
              defaults: {showTriggerLabel: false},
              extra: [':user="user"', ':on-sign-out="signOut"'],
            }),
          },
    controls: [
      SOURCE_CONTROL,
      {control: 'bool', description: 'Shows the name next to the avatar.', name: 'showTriggerLabel', type: 'boolean'},
      {
        control: ['sm', 'md', 'lg'],
        description: 'Avatar size and menu density.',
        name: 'size',
        type: "'sm' | 'md' | 'lg'",
      },
    ],
    defaults: {showTriggerLabel: true, size: 'md', source: 'base'},
    group: 'User',
    id: 'userdropdown',
    live: true,
    name: 'UserDropdown',
    render: (args: Args, action: Action) =>
      str(args, 'source') === 'live'
        ? h(UserDropdown, {
            onProfileClick: () => action('profileClick'),
            showTriggerLabel: bool(args, 'showTriggerLabel'),
            size: str(args, 'size'),
          })
        : h(BaseUserDropdown, {
            onProfileClick: () => action('profileClick'),
            onSignOut: () => action('signOut'),
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
            imports: [],
            template: tag('UserProfile', omit(args, 'source'), {
              defaults: {cardLayout: true, editable: true, title: 'Profile'},
            }),
          }
        : {
            imports: ['BaseUserProfile'],
            template: tag('BaseUserProfile', omit(args, 'source'), {
              defaults: {cardLayout: true, editable: true, title: 'Profile'},
              extra: [':profile="profile"', ':on-update="handleUpdate"'],
            }),
          },
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
      narrow(
        520,
        str(args, 'source') === 'live'
          ? h(UserProfile, {
              cardLayout: bool(args, 'cardLayout'),
              editable: bool(args, 'editable'),
              title: str(args, 'title'),
            })
          : h(BaseUserProfile, {
              cardLayout: bool(args, 'cardLayout'),
              editable: bool(args, 'editable'),
              flattenedProfile: SAMPLE_PROFILE,
              onUpdate: (payload: unknown) => {
                action('onUpdate', JSON.stringify(payload));

                return Promise.resolve();
              },
              profile: SAMPLE_PROFILE,
              title: str(args, 'title'),
            }),
      ),
    stories: [
      {id: 'base', name: 'Sample profile'},
      {args: {source: 'live'}, id: 'live', name: 'Signed-in user (editable)'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: [],
      template: tag('ChangeCredential', args, {
        defaults: {cardLayout: false, showRequirements: true},
        extra: ['@success="handleSuccess"'],
      }),
    }),
    controls: [
      {control: 'text', description: 'Heading; empty uses the attribute name.', name: 'title', type: 'string'},
      {control: 'bool', description: 'Wraps the form in a card.', name: 'cardLayout', type: 'boolean'},
      {control: 'bool', description: 'Lists the password policy.', name: 'showRequirements', type: 'boolean'},
    ],
    defaults: {cardLayout: true, showRequirements: true, title: ''},
    group: 'User',
    id: 'changecredential',
    live: true,
    name: 'ChangeCredential',
    render: (args: Args, action: Action) =>
      narrow(
        440,
        h(ChangeCredential, {
          cardLayout: bool(args, 'cardLayout'),
          onSuccess: () => action('success', 'PATCH /api/auth/user/credentials'),
          showRequirements: bool(args, 'showRequirements'),
          title: str(args, 'title') || undefined,
        }),
      ),
    stories: [{id: 'default', name: 'Change password'}],
  },
  {
    code: () => ({
      imports: [],
      template:
        '<User>\n  <template #default="{user}">Hello, {{ user?.username }}</template>\n  <template #fallback>Not signed in</template>\n</User>',
    }),
    controls: [],
    defaults: {},
    group: 'User',
    id: 'user',
    live: true,
    name: 'User',
    render: () =>
      h(User, null, {
        default: ({user}: {user: Record<string, unknown> | null}) =>
          h(Typography, {variant: 'body1'}, {default: () => `Hello, ${getDisplayName(user)}`}),
        fallback: () => h(Typography, {variant: 'body1'}, {default: () => 'Not signed in'}),
      }),
    stories: [{id: 'default', name: 'Scoped slot'}],
  },
  {
    code: () => ({
      imports: [],
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
      imports: [],
      template: '<Loading>\n  Checking your session\n  <template #fallback>Ready</template>\n</Loading>',
    }),
    controls: [],
    defaults: {},
    group: 'Control',
    id: 'loading',
    live: true,
    name: 'Loading',
    render: () =>
      h(Loading, null, {
        default: () => h(Typography, {variant: 'body2'}, {default: () => 'Checking your session'}),
        fallback: () => h(Typography, {variant: 'body2'}, {default: () => 'Ready: isLoading is false'}),
      }),
    stories: [{id: 'default', name: 'Default'}],
  },
  {
    code: () => ({imports: ['LanguageSwitcher'], template: '<LanguageSwitcher />'}),
    controls: [],
    defaults: {},
    group: 'Control',
    id: 'languageswitcher',
    name: 'LanguageSwitcher',
    render: () => h(LanguageSwitcher),
    stories: [{id: 'default', name: 'Default'}],
  },
  pickerDef('userselect', 'UserSelect', UserSelectStory, 'Owner', 'GET /api/auth/users', 'users'),
  pickerDef(
    'authflowselect',
    'AuthFlowSelect',
    AuthFlowSelectStory,
    'Sign-in flow',
    'GET /api/auth/auth-flows',
    'authFlows',
  ),
  pickerDef(
    'usertypeselect',
    'UserTypeSelect',
    UserTypeSelectStory,
    'User type',
    'GET /api/auth/user-types',
    'userTypes',
  ),
  ...ADMIN_COMPONENTS,
  ...CUSTOM_RENDER_COMPONENTS,
];

export const STORY_COUNT: number = COMPONENTS.reduce(
  (total: number, component: ComponentDef) => total + component.stories.length,
  0,
);

export const GROUPS: string[] = Array.from(new Set(COMPONENTS.map((component: ComponentDef) => component.group)));

/** Builds the Vue single-file component shown in the Code panel. */
export const buildCode = (component: ComponentDef, args: Args): string => {
  const snippet = component.code(args);
  const imports: string[] = Array.from(new Set(snippet.imports)).sort();
  const vueImports: string[] = ['computed', 'ref'].filter((name: string) =>
    (snippet.script ?? []).some((line: string) => line.includes(`${name}(`)),
  );
  const script: string[] = [
    ...(vueImports.length ? [`import {${vueImports.join(', ')}} from 'vue';`] : []),
    ...(snippet.otherImports ?? []),
    ...(imports.length ? [`import {${imports.join(', ')}} from '@thunderid/vue';`] : []),
  ];
  const body: string[] = snippet.script ?? [];
  const scriptBlock: string = [...script, ...(script.length && body.length ? [''] : []), ...body].join('\n');
  const template: string = snippet.template
    .split('\n')
    .map((line: string) => `  ${line}`)
    .join('\n');
  const autoImported = '<!-- Auto-imported by @thunderid/nuxt (admin components with thunderid.management). -->';

  return `${scriptBlock ? `<script setup lang="ts">\n${scriptBlock}\n</script>\n\n` : ''}<template>\n${
    imports.length ? '' : `  ${autoImported}\n`
  }${template}\n</template>`;
};

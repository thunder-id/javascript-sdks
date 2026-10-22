// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Alert,
  BaseSignInButton,
  BaseSignOutButton,
  BaseSignUpButton,
  BaseUserAvatar,
  BaseUserDropdown,
  BaseUserProfile,
  Button,
  Card,
  Checkbox,
  Divider,
  FacebookButton,
  FlowTimer,
  GitHubButton,
  GoogleButton,
  LanguageSwitcher,
  LinkedInButton,
  MicrosoftButton,
  Recovery,
  SignedIn,
  SignedOut,
  SignIn,
  SignInButton,
  SignInWithEthereumButton,
  SignOutButton,
  SignUp,
  SignUpButton,
  Spinner,
  TextField,
  Toggle,
  Typography,
  User,
  UserAvatar,
  UserDropdown,
  UserProfile,
} from '@thunderid/react';
import {ChangeEvent, FC, ReactNode} from 'react';
import {ADMIN_COMPONENTS} from './adminStories';
import {bool, jsx, num, omit, SOURCE_CONTROL, str} from './storyHelpers';
import {Narrow, OtpFieldStory, PasswordFieldStory, SelectStory} from './StoryWidgets';
import type {Action, Args, ComponentDef} from './types';
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

const SIZE: readonly string[] = ['small', 'medium', 'large'];

const SOCIAL: Record<string, FC<{children?: ReactNode; onClick?: () => void}>> = {
  FacebookButton,
  GitHubButton,
  GoogleButton,
  LinkedInButton,
  MicrosoftButton,
  SignInWithEthereumButton,
};

export const COMPONENTS: ComponentDef[] = [
  {
    code: (args: Args) => ({
      imports: ['Button'],
      jsx: jsx('Button', omit(args, 'children'), {
        children: str(args, 'children'),
        defaults: {color: 'primary', size: 'medium', variant: 'solid'},
        extra: ['onClick={handleClick}'],
      }),
    }),
    controls: [
      {control: 'text', description: 'Button label.', name: 'children', type: 'ReactNode'},
      {
        control: ['solid', 'outline', 'text'],
        description: 'Visual style of the button.',
        name: 'variant',
        type: "'solid' | 'outline' | 'text' | 'icon'",
      },
      {
        control: ['primary', 'secondary', 'tertiary'],
        description: 'Color intent.',
        name: 'color',
        type: "'primary' | 'secondary' | 'tertiary' | string",
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
    render: (args: Args, action: Action) => (
      <div style={bool(args, 'fullWidth') ? {width: 360, maxWidth: '100%'} : undefined}>
        <Button
          variant={str(args, 'variant') as 'solid'}
          color={str(args, 'color')}
          size={str(args, 'size') as 'medium'}
          loading={bool(args, 'loading')}
          disabled={bool(args, 'disabled')}
          fullWidth={bool(args, 'fullWidth')}
          onClick={() => action('onClick', 'MouseEvent { target: button }')}
        >
          {str(args, 'children')}
        </Button>
      </div>
    ),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {color: 'primary', disabled: false, loading: false, variant: 'solid'}, id: 'primary', name: 'Primary'},
      {args: {color: 'primary', variant: 'outline'}, id: 'outline', name: 'Outline'},
      {args: {color: 'secondary', variant: 'text'}, id: 'text', name: 'Text'},
      {args: {loading: true}, id: 'loading', name: 'Loading'},
      {args: {disabled: true}, id: 'disabled', name: 'Disabled'},
    ],
  },
  {
    code: (args: Args) => ({imports: ['TextField'], jsx: jsx('TextField', args, {extra: ['onChange={handleChange}']})}),
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
    render: (args: Args, action: Action) => (
      <Narrow width={320}>
        <TextField
          label={str(args, 'label')}
          placeholder={str(args, 'placeholder')}
          helperText={str(args, 'helperText') || undefined}
          error={str(args, 'error') || undefined}
          required={bool(args, 'required')}
          disabled={bool(args, 'disabled')}
          onChange={(event: ChangeEvent<HTMLInputElement>) => action('onChange', `"${event.target.value}"`)}
          onFocus={() => action('onFocus')}
          onBlur={() => action('onBlur')}
        />
      </Narrow>
    ),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {error: 'Enter a valid email address.'}, id: 'error', name: 'With error'},
      {args: {helperText: 'We never share your email.'}, id: 'helper', name: 'With helper text'},
      {args: {disabled: true, error: ''}, id: 'disabled', name: 'Disabled'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['PasswordField'],
      jsx: jsx('PasswordField', args, {extra: ['value={password}', 'onChange={setPassword}']}),
    }),
    controls: [
      {control: 'text', description: 'Visible field label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Hint shown when empty.', name: 'placeholder', type: 'string'},
      {control: 'text', description: 'Help text below the field.', name: 'helperText', type: 'string'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Marks the field as required.', name: 'required', type: 'boolean'},
      {control: 'bool', description: 'Disables the field.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', helperText: '', label: 'Password', placeholder: 'Password', required: true},
    group: 'Primitives',
    id: 'passwordfield',
    name: 'PasswordField',
    render: (args: Args, action: Action) => <PasswordFieldStory args={args} action={action} />,
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {error: 'Password must be at least 8 characters.'}, id: 'error', name: 'With error'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['OtpField'],
      jsx: jsx('OtpField', args, {defaults: {length: 6, type: 'text'}, extra: ['onComplete={verify}']}),
    }),
    controls: [
      {control: 'text', description: 'Visible label.', name: 'label', type: 'string'},
      {control: 'number', description: 'Number of digits.', name: 'length', type: 'number'},
      {control: ['text', 'number', 'password'], description: 'Input type.', name: 'type', type: 'OtpFieldType'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Disables the inputs.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', label: 'Verification code', length: 6, type: 'text'},
    group: 'Primitives',
    id: 'otpfield',
    name: 'OtpField',
    render: (args: Args, action: Action) => <OtpFieldStory args={args} action={action} />,
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {length: 4, type: 'number'}, id: 'four', name: 'Four digits'},
      {args: {error: 'That code has expired.'}, id: 'error', name: 'With error'},
    ],
  },
  {
    code: (args: Args) => ({imports: ['Checkbox'], jsx: jsx('Checkbox', args, {extra: ['onChange={handleChange}']})}),
    controls: [
      {control: 'text', description: 'Visible label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Help text.', name: 'helperText', type: 'string'},
      {control: 'text', description: 'Error message.', name: 'error', type: 'string'},
      {control: 'bool', description: 'Marks as required.', name: 'required', type: 'boolean'},
      {control: 'bool', description: 'Disables the checkbox.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, error: '', helperText: '', label: 'Remember this device', required: false},
    group: 'Primitives',
    id: 'checkbox',
    name: 'Checkbox',
    render: (args: Args, action: Action) => (
      <Checkbox
        label={str(args, 'label')}
        helperText={str(args, 'helperText') || undefined}
        error={str(args, 'error') || undefined}
        required={bool(args, 'required')}
        disabled={bool(args, 'disabled')}
        onChange={(event: ChangeEvent<HTMLInputElement>) => action('onChange', `checked=${event.target.checked}`)}
      />
    ),
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
    code: (args: Args) => ({imports: ['Toggle'], jsx: jsx('Toggle', args, {extra: ['onChange={handleChange}']})}),
    controls: [
      {control: 'text', description: 'Visible label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Help text.', name: 'helperText', type: 'string'},
      {control: 'bool', description: 'Disables the toggle.', name: 'disabled', type: 'boolean'},
    ],
    defaults: {disabled: false, helperText: '', label: 'Enable passkeys'},
    group: 'Primitives',
    id: 'toggle',
    name: 'Toggle',
    render: (args: Args, action: Action) => (
      <Toggle
        label={str(args, 'label')}
        helperText={str(args, 'helperText') || undefined}
        disabled={bool(args, 'disabled')}
        onChange={(event: ChangeEvent<HTMLInputElement>) => action('onChange', `checked=${event.target.checked}`)}
      />
    ),
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {disabled: true}, id: 'disabled', name: 'Disabled'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Select'],
      jsx: jsx('Select', args, {extra: ['options={departments}', 'onChange={handleChange}']}),
    }),
    controls: [
      {control: 'text', description: 'Visible label.', name: 'label', type: 'string'},
      {control: 'text', description: 'Placeholder option.', name: 'placeholder', type: 'string'},
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
    render: (args: Args, action: Action) => <SelectStory args={args} action={action} />,
    stories: [
      {id: 'playground', name: 'Playground'},
      {args: {loading: true}, id: 'loading', name: 'Loading'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Alert'],
      jsx: `<Alert${str(args, 'variant') === 'info' ? '' : ` variant="${str(args, 'variant')}"`}${
        bool(args, 'showIcon') ? '' : ' showIcon={false}'
      }>\n  <Alert.Title>${str(args, 'title')}</Alert.Title>\n  <Alert.Description>${str(
        args,
        'description',
      )}</Alert.Description>\n</Alert>`,
    }),
    controls: [
      {
        control: ['info', 'success', 'warning', 'error'],
        description: 'Color and icon of the alert.',
        name: 'variant',
        type: "'info' | 'success' | 'warning' | 'error'",
      },
      {control: 'text', description: 'Rendered in <Alert.Title>.', name: 'title', type: 'ReactNode'},
      {control: 'text', description: 'Rendered in <Alert.Description>.', name: 'description', type: 'ReactNode'},
      {control: 'bool', description: 'Shows the variant icon.', name: 'showIcon', type: 'boolean'},
    ],
    defaults: {
      description: 'We sent a sign-in link to liam.chen@acme.io.',
      showIcon: true,
      title: 'Check your inbox',
      variant: 'info',
    },
    group: 'Primitives',
    id: 'alert',
    name: 'Alert',
    render: (args: Args) => (
      <Narrow width={420}>
        <Alert variant={str(args, 'variant') as 'info'} showIcon={bool(args, 'showIcon')}>
          <Alert.Title>{str(args, 'title')}</Alert.Title>
          <Alert.Description>{str(args, 'description')}</Alert.Description>
        </Alert>
      </Narrow>
    ),
    stories: [
      {args: {variant: 'info'}, id: 'info', name: 'Info'},
      {
        args: {
          description: 'You can now sign in with your new password.',
          title: 'Password updated',
          variant: 'success',
        },
        id: 'success',
        name: 'Success',
      },
      {
        args: {description: 'You will be signed out in 2 minutes.', title: 'Session expiring', variant: 'warning'},
        id: 'warning',
        name: 'Warning',
      },
      {
        args: {description: 'The email or password is incorrect.', title: 'Sign-in failed', variant: 'error'},
        id: 'error',
        name: 'Error',
      },
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Button', 'Card'],
      jsx: `<Card${str(args, 'variant') === 'default' ? '' : ` variant="${str(args, 'variant')}"`}>\n  <Card.Header>\n    <Card.Title>${str(
        args,
        'title',
      )}</Card.Title>\n    <Card.Description>${str(args, 'description')}</Card.Description>\n  </Card.Header>\n  <Card.Content>...</Card.Content>\n  <Card.Footer>\n    <Button>Continue</Button>\n  </Card.Footer>\n</Card>`,
    }),
    controls: [
      {
        control: ['default', 'outlined', 'elevated'],
        description: 'Surface style.',
        name: 'variant',
        type: "'default' | 'outlined' | 'elevated'",
      },
      {control: 'text', description: 'Card.Title content.', name: 'title', type: 'ReactNode'},
      {control: 'text', description: 'Card.Description content.', name: 'description', type: 'ReactNode'},
    ],
    defaults: {
      description: 'Choose how you want to verify it is you.',
      title: 'Verify your identity',
      variant: 'outlined',
    },
    group: 'Primitives',
    id: 'card',
    name: 'Card',
    render: (args: Args, action: Action) => (
      <Narrow>
        <Card variant={str(args, 'variant') as 'outlined'}>
          <Card.Header>
            <Card.Title>{str(args, 'title')}</Card.Title>
            <Card.Description>{str(args, 'description')}</Card.Description>
          </Card.Header>
          <Card.Content>
            <Typography variant="body2">Use a passkey, an authenticator app, or a code sent by email.</Typography>
          </Card.Content>
          <Card.Footer>
            <Button fullWidth onClick={() => action('onClick', 'Continue')}>
              Continue
            </Button>
          </Card.Footer>
        </Card>
      </Narrow>
    ),
    stories: [
      {id: 'outlined', name: 'Outlined'},
      {args: {variant: 'elevated'}, id: 'elevated', name: 'Elevated'},
      {args: {variant: 'default'}, id: 'default', name: 'Default'},
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Typography'],
      jsx: jsx('Typography', omit(args, 'children'), {
        children: str(args, 'children'),
        defaults: {align: 'left', color: 'textPrimary', variant: 'body1'},
      }),
    }),
    controls: [
      {control: 'text', description: 'Text content.', name: 'children', type: 'ReactNode'},
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
      {
        control: ['textPrimary', 'textSecondary', 'primary', 'error', 'success', 'warning'],
        description: 'Text color.',
        name: 'color',
        type: 'TypographyColor',
      },
      {control: ['left', 'center', 'right'], description: 'Alignment.', name: 'align', type: 'TypographyAlign'},
    ],
    defaults: {align: 'left', children: 'Welcome back, Liam', color: 'textPrimary', variant: 'h4'},
    group: 'Primitives',
    id: 'typography',
    name: 'Typography',
    render: (args: Args) => (
      <Typography
        variant={str(args, 'variant') as 'h4'}
        color={str(args, 'color') as 'textPrimary'}
        align={str(args, 'align') as 'left'}
      >
        {str(args, 'children')}
      </Typography>
    ),
    stories: [
      {id: 'heading', name: 'Heading'},
      {
        args: {children: 'Signed in with a passkey.', color: 'textSecondary', variant: 'body2'},
        id: 'body',
        name: 'Body',
      },
    ],
  },
  {
    code: (args: Args) => ({
      imports: ['Divider'],
      jsx: str(args, 'children')
        ? jsx('Divider', omit(args, 'children'), {children: str(args, 'children'), defaults: {variant: 'solid'}})
        : jsx('Divider', omit(args, 'children'), {defaults: {variant: 'solid'}}),
    }),
    controls: [
      {control: 'text', description: 'Optional label in the middle.', name: 'children', type: 'ReactNode'},
      {control: ['solid', 'dashed', 'dotted'], description: 'Line style.', name: 'variant', type: 'DividerVariant'},
    ],
    defaults: {children: 'or', variant: 'solid'},
    group: 'Primitives',
    id: 'divider',
    name: 'Divider',
    render: (args: Args) => (
      <Narrow width={320}>
        <Divider variant={str(args, 'variant') as 'solid'}>{str(args, 'children') || undefined}</Divider>
      </Narrow>
    ),
    stories: [
      {id: 'label', name: 'With label'},
      {args: {children: '', variant: 'dashed'}, id: 'dashed', name: 'Dashed'},
    ],
  },
  {
    code: (args: Args) => ({imports: ['Spinner'], jsx: jsx('Spinner', args, {defaults: {size: 'medium'}})}),
    controls: [{control: SIZE, description: 'Spinner size.', name: 'size', type: 'SpinnerSize'}],
    defaults: {size: 'medium'},
    group: 'Primitives',
    id: 'spinner',
    name: 'Spinner',
    render: (args: Args) => <Spinner size={str(args, 'size') as 'medium'} />,
    stories: [
      {id: 'medium', name: 'Medium'},
      {args: {size: 'large'}, id: 'large', name: 'Large'},
    ],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {imports: ['SignInButton'], jsx: jsx('SignInButton', {}, {children: str(args, 'children') || undefined})}
        : {
            imports: ['BaseSignInButton'],
            jsx: jsx('BaseSignInButton', {}, {children: str(args, 'children'), extra: ['signIn={handleSignIn}']}),
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: 'Button label; empty uses the translated default.',
        name: 'children',
        type: 'ReactNode',
      },
    ],
    defaults: {children: 'Sign in', source: 'base'},
    group: 'Actions',
    id: 'signinbutton',
    live: true,
    name: 'SignInButton',
    render: (args: Args, action: Action) =>
      str(args, 'source') === 'live' ? (
        <SignInButton onClick={() => action('onClick', 'signIn() redirected')}>
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
      str(args, 'source') === 'live'
        ? {imports: ['SignOutButton'], jsx: jsx('SignOutButton', {}, {children: str(args, 'children') || undefined})}
        : {
            imports: ['BaseSignOutButton'],
            jsx: jsx('BaseSignOutButton', {}, {children: str(args, 'children'), extra: ['signOut={handleSignOut}']}),
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: 'Button label; empty uses the translated default.',
        name: 'children',
        type: 'ReactNode',
      },
    ],
    defaults: {children: 'Sign out', source: 'base'},
    group: 'Actions',
    id: 'signoutbutton',
    live: true,
    name: 'SignOutButton',
    render: (args: Args, action: Action) =>
      str(args, 'source') === 'live' ? (
        <SignOutButton onClick={() => action('onClick', 'signOut() resolved')}>
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
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {imports: ['SignUpButton'], jsx: jsx('SignUpButton', {}, {children: str(args, 'children') || undefined})}
        : {
            imports: ['BaseSignUpButton'],
            jsx: jsx('BaseSignUpButton', {}, {children: str(args, 'children'), extra: ['signUp={handleSignUp}']}),
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: 'Button label; empty uses the translated default.',
        name: 'children',
        type: 'ReactNode',
      },
    ],
    defaults: {children: 'Create account', source: 'base'},
    group: 'Actions',
    id: 'signupbutton',
    live: true,
    name: 'SignUpButton',
    render: (args: Args, action: Action) =>
      str(args, 'source') === 'live' ? (
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
    code: (args: Args) => ({
      imports: [str(args, 'provider')],
      jsx: jsx(
        str(args, 'provider'),
        {},
        {children: str(args, 'children') || undefined, extra: ['onClick={handleClick}']},
      ),
    }),
    controls: [
      {
        control: Object.keys(SOCIAL),
        description: 'Which adapter button to render.',
        name: 'provider',
        type: 'component',
      },
      {control: 'text', description: 'Label; empty uses the translated default.', name: 'children', type: 'ReactNode'},
    ],
    defaults: {children: '', provider: 'GoogleButton'},
    group: 'Actions',
    id: 'social',
    name: 'Social buttons',
    render: (args: Args, action: Action) => {
      const SocialButton: FC<{children?: ReactNode; onClick?: () => void}> =
        SOCIAL[str(args, 'provider')] ?? GoogleButton;

      return (
        <Narrow width={320}>
          <SocialButton onClick={() => action('onClick', str(args, 'provider'))}>
            {str(args, 'children') || undefined}
          </SocialButton>
        </Narrow>
      );
    },
    stories: [
      {id: 'google', name: 'Google'},
      {args: {provider: 'GitHubButton'}, id: 'github', name: 'GitHub'},
      {args: {provider: 'MicrosoftButton'}, id: 'microsoft', name: 'Microsoft'},
      {args: {provider: 'SignInWithEthereumButton'}, id: 'ethereum', name: 'Ethereum'},
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
      {
        control: ['default', 'outlined', 'elevated'],
        description: 'Card variant of the flow container.',
        name: 'variant',
        type: 'CardVariant',
      },
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
      {
        control: ['default', 'outlined', 'elevated'],
        description: 'Card variant of the flow container.',
        name: 'variant',
        type: 'CardVariant',
      },
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
    code: () => ({imports: ['Recovery'], jsx: '<Recovery onComplete={handleComplete} onError={handleError} />'}),
    controls: [],
    defaults: {},
    group: 'Auth flows',
    id: 'recovery',
    live: true,
    name: 'Recovery',
    render: (_args: Args, action: Action) => (
      <Narrow width={400}>
        <Recovery
          onComplete={() => action('onComplete')}
          onError={(error: Error) => action('onError', error.message)}
        />
      </Narrow>
    ),
    stories: [{id: 'default', name: 'Default'}],
  },
  {
    code: (args: Args) =>
      str(args, 'source') === 'live'
        ? {imports: ['UserAvatar'], jsx: jsx('UserAvatar', omit(args, 'source'), {defaults: {size: 40}})}
        : {
            imports: ['BaseUserAvatar'],
            jsx: jsx('BaseUserAvatar', omit(args, 'source'), {defaults: {size: 40}, extra: ['user={user}']}),
          },
    controls: [SOURCE_CONTROL, {control: 'number', description: 'Diameter in px.', name: 'size', type: 'number'}],
    defaults: {size: 56, source: 'base'},
    group: 'User',
    id: 'useravatar',
    name: 'UserAvatar',
    render: (args: Args) =>
      str(args, 'source') === 'live' ? (
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
      str(args, 'source') === 'live'
        ? {
            imports: ['UserDropdown'],
            jsx: jsx('UserDropdown', omit(args, 'source'), {extra: ['onManageProfile={openProfile}']}),
          }
        : {
            imports: ['BaseUserDropdown'],
            jsx: jsx('BaseUserDropdown', omit(args, 'source'), {
              extra: ['user={user}', 'onSignOut={signOut}', 'onManageProfile={openProfile}'],
            }),
          },
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
      str(args, 'source') === 'live' ? (
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
      str(args, 'source') === 'live'
        ? {imports: ['UserProfile'], jsx: jsx('UserProfile', omit(args, 'source'), {defaults: {editable: true}})}
        : {
            imports: ['BaseUserProfile'],
            jsx: jsx('BaseUserProfile', omit(args, 'source'), {
              extra: ['profile={profile}', 'onUpdate={handleUpdate}'],
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
      str(args, 'source') === 'live' ? (
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
      <div style={{display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center'}}>
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
  {
    code: () => ({imports: ['LanguageSwitcher'], jsx: '<LanguageSwitcher />'}),
    controls: [],
    defaults: {},
    group: 'Control',
    id: 'languageswitcher',
    name: 'LanguageSwitcher',
    render: () => <LanguageSwitcher />,
    stories: [{id: 'default', name: 'Default'}],
  },
  {
    code: (args: Args) => ({imports: ['FlowTimer'], jsx: jsx('FlowTimer', args)}),
    controls: [
      {control: 'number', description: 'Seconds to count down from.', name: 'expiresIn', type: 'number'},
      {control: 'text', description: 'Template; {time} is replaced.', name: 'textTemplate', type: 'string'},
    ],
    defaults: {expiresIn: 120, textTemplate: 'Code expires in {time}'},
    group: 'Control',
    id: 'flowtimer',
    name: 'FlowTimer',
    render: (args: Args) => (
      <FlowTimer
        key={num(args, 'expiresIn')}
        expiresIn={num(args, 'expiresIn')}
        textTemplate={str(args, 'textTemplate')}
      />
    ),
    stories: [
      {id: 'default', name: 'Two minutes'},
      {args: {expiresIn: 5}, id: 'short', name: 'Expiring'},
    ],
  },
  ...ADMIN_COMPONENTS,
];

export const STORY_COUNT: number = COMPONENTS.reduce(
  (total: number, component: ComponentDef) => total + component.stories.length,
  0,
);

export const GROUPS: string[] = Array.from(new Set(COMPONENTS.map((component: ComponentDef) => component.group)));

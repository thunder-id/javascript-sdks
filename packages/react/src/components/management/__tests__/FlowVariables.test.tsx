// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {createResourceInvalidator, ApiFetcher, FlowVariableDefinition} from '@thunderid/browser';
import {ReactElement, ReactNode} from 'react';
import {Mock, afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../contexts/ThunderID/ThunderIDContext';
import BaseFlowVariables from '../FlowVariables/BaseFlowVariables';
import FlowVariablesForm from '../FlowVariables/FlowVariablesForm';

const baseUrl = 'https://localhost:8090';

const variables: FlowVariableDefinition[] = [
  {
    defaultValue: 'support@acme.io',
    description: 'Shown to users who cannot sign in',
    identifier: 'supportEmail',
    label: 'Support email',
    type: 'EMAIL_INPUT',
  },
  {
    defaultValue: 'EMAIL_OTP',
    identifier: 'mfaMode',
    label: 'Second factor',
    options: ['SMS_OTP', 'EMAIL_OTP'],
    type: 'SELECT',
  },
  {defaultValue: true, identifier: 'showSignUp', label: 'Show sign up', type: 'BOOLEAN_INPUT'},
  {
    category: 'IDENTITY_PROVIDER',
    defaultValue: 'c-1',
    description: 'Select your connection',
    identifier: 'social',
    label: 'connection1',
    type: 'CONNECTION_SELECT',
  },
];

const connections = [
  {categories: ['identity-provider' as const], id: 'c-1', name: 'Google login', type: 'google' as const},
  {categories: ['identity-provider' as const], id: 'c-2', name: 'GitHub login', type: 'github' as const},
  {categories: ['sms-provider' as const], id: 'c-3', name: 'Twilio', type: 'twilio' as const},
];

const respond = (body: unknown, status = 200): Response =>
  ({
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

const renderWithProviders = (ui: ReactElement, fetcher?: ApiFetcher): ReturnType<typeof render> => {
  const thunderID = {
    baseUrl,
    http: {fetcher},
    instanceId: 0,
    invalidator: createResourceInvalidator(),
    isInitialized: true,
    isLoading: false,
    vendor: 'thunderid',
  } as unknown as ThunderIDContextProps;

  function Providers({children}: {children: ReactNode}): ReactElement {
    return (
      <ThunderIDContext.Provider value={thunderID}>
        <I18nProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>
    );
  }

  return render(ui, {wrapper: Providers});
};

afterEach(() => {
  cleanup();
});

describe('BaseFlowVariables', () => {
  it('shows each variable as its label, description and input', () => {
    renderWithProviders(<BaseFlowVariables variables={variables} connections={connections} />);

    expect(screen.getByText('Support email')).toBeTruthy();
    expect(screen.getByText('Shown to users who cannot sign in')).toBeTruthy();
    expect(screen.getByLabelText('Support email').value).toBe('support@acme.io');
    expect(screen.getByText('connection1')).toBeTruthy();
    expect(screen.getByText('Select your connection')).toBeTruthy();
    expect(screen.getByLabelText('Show sign up').checked).toBe(true);
  });

  it('offers only the connections of the variable category in a connection select', () => {
    renderWithProviders(<BaseFlowVariables variables={variables} connections={connections} />);

    const select: HTMLSelectElement = screen.getByLabelText('connection1');
    const labels: string[] = Array.from(select.options).map((option: HTMLOptionElement) => option.text);

    expect(labels).toContain('Google login');
    expect(labels).toContain('GitHub login');
    expect(labels).not.toContain('Twilio');
    // A connection that is the default shows as the first entry, which stands for the default.
    expect(select.value).toBe('');
    expect(select.options[0].text).toBe('Use the default: Google login');
  });

  it('keeps the type of a select option when it is chosen', () => {
    const onChange: Mock = vi.fn();

    renderWithProviders(
      <BaseFlowVariables
        variables={[{defaultValue: 30, identifier: 'ttl', label: 'TTL', options: [30, 60], type: 'SELECT'}]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('TTL'), {target: {value: '60'}});

    expect(onChange).toHaveBeenCalledWith({ttl: 60});
  });

  it('reports an invalid value only once the field has been touched', () => {
    renderWithProviders(<BaseFlowVariables variables={variables} connections={connections} onSubmit={vi.fn()} />);

    expect(screen.queryByText('Enter a valid value.')).toBeNull();
    fireEvent.change(screen.getByLabelText('Support email'), {target: {value: 'nope'}});

    expect(screen.getByText('Enter a valid value.')).toBeTruthy();
  });

  it('submits every value, and not while one is invalid', async () => {
    const onSubmit: Mock = vi.fn();

    renderWithProviders(<BaseFlowVariables variables={variables} connections={connections} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText('Support email'), {target: {value: 'nope'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Support email'), {target: {value: 'help@acme.io'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        {mfaMode: 'EMAIL_OTP', showSignUp: true, social: 'c-1', supportEmail: 'help@acme.io'},
        {supportEmail: 'help@acme.io'},
      ),
    );
  });

  it('has no save button when it only previews', () => {
    renderWithProviders(<BaseFlowVariables variables={variables} connections={connections} />);

    expect(screen.queryByRole('button', {name: 'Save changes'})).toBeNull();
  });

  it('returns every variable to its default on reset to defaults', () => {
    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        connections={connections}
        initialValues={{supportEmail: 'emea@acme.io'}}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Reset to defaults'}));

    expect(screen.getByLabelText('Support email').value).toBe('support@acme.io');
  });

  it('starts from the values a unit has set over the defaults', () => {
    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        connections={connections}
        initialValues={{supportEmail: 'emea@acme.io'}}
      />,
    );

    expect(screen.getByLabelText('Support email').value).toBe('emea@acme.io');
  });

  it('renders a variable whose identifier another variable repeats', () => {
    renderWithProviders(
      <BaseFlowVariables
        variables={[
          {defaultValue: 'a', identifier: 'same', label: 'First', type: 'TEXT_INPUT'},
          {defaultValue: 'b', identifier: 'same', label: 'Second', type: 'TEXT_INPUT'},
        ]}
      />,
    );

    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
  });

  it('marks only a customized variable', () => {
    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        connections={connections}
        initialValues={{supportEmail: 'emea@acme.io'}}
      />,
    );

    const statuses: string[] = screen
      .getAllByTestId('flow-variable-status')
      .map((chip: HTMLElement) => chip.textContent ?? '');

    expect(statuses).toEqual(['Customized']);
  });

  it('shows what the default was once a variable is customized', () => {
    renderWithProviders(<BaseFlowVariables variables={variables} connections={connections} />);

    expect(screen.queryByText('Default: support@acme.io')).toBeNull();
    fireEvent.change(screen.getByLabelText('Support email'), {target: {value: 'other@acme.io'}});

    expect(screen.getByText('Default: support@acme.io')).toBeTruthy();
  });

  it('offers the default as the first choice of a select, and picking it clears the customization', () => {
    renderWithProviders(<BaseFlowVariables variables={variables} connections={connections} />);

    const select = screen.getByLabelText<HTMLSelectElement>('connection1');

    expect(select.options[0].text).toBe('Use the default: Google login');

    fireEvent.change(select, {target: {value: 'c-2'}});
    expect(screen.getByText('Default: Google login')).toBeTruthy();

    fireEvent.change(select, {target: {value: ''}});
    expect(select.value).toBe('');
    expect(screen.queryByText('Default: Google login')).toBeNull();
  });

  it('shows a variable the unit may not set as set by its owner, at the value it is pinned to', () => {
    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        connections={connections}
        ownerName="Root organization"
        overlay={{
          owned: false,
          rules: {
            'variables.showSignUp': {editable: false, value: ['false']},
            'variables.supportEmail': {editable: true},
          },
        }}
      />,
    );

    expect(screen.getAllByText(/Set by Root organization/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Set by Root organization · Off/)).toBeTruthy();
    expect(screen.getByLabelText<HTMLInputElement>('Show sign up').disabled).toBe(true);
    expect(screen.getByLabelText<HTMLInputElement>('Show sign up').checked).toBe(false);
  });

  it('locks every variable no policy names', () => {
    renderWithProviders(<BaseFlowVariables variables={variables} overlay={{owned: false, rules: {}}} />);

    expect(screen.queryByTestId('flow-variable-status')).toBeNull();
    expect(screen.getAllByText(/Set by the flow owner/)).toHaveLength(variables.length);
  });

  it('lets the owner of the flow edit everything', () => {
    renderWithProviders(<BaseFlowVariables variables={variables} overlay={{owned: true, rules: {}}} />);

    expect(screen.queryByTestId('flow-variable-status')).toBeNull();
  });

  it('narrows the choices to what the policy allows', () => {
    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        connections={connections}
        overlay={{
          owned: false,
          rules: {
            'variables.mfaMode': {allowedValues: ['SMS_OTP'], editable: true},
            'variables.social': {editable: true, excludedValues: ['c-2']},
          },
        }}
      />,
    );

    const mfa = screen.getByLabelText<HTMLSelectElement>('Second factor');
    const social = screen.getByLabelText<HTMLSelectElement>('connection1');

    expect(Array.from(mfa.options).map((o: HTMLOptionElement) => o.value)).toEqual(['', 'SMS_OTP']);
    expect(Array.from(social.options).map((o: HTMLOptionElement) => o.value)).not.toContain('c-2');
  });

  it('starts a variable at the value the policy sets for the unit', () => {
    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        overlay={{owned: false, rules: {'variables.supportEmail': {editable: true, value: ['team@acme.io']}}}}
      />,
    );

    expect(screen.getByLabelText<HTMLInputElement>('Support email').value).toBe('team@acme.io');
  });

  it('submits only the overrides of variables the unit may set', () => {
    const onSubmit: Mock = vi.fn();

    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        connections={connections}
        overlay={{
          owned: false,
          rules: {
            'variables.showSignUp': {editable: false, value: ['false']},
            'variables.supportEmail': {editable: true},
          },
        }}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Support email'), {target: {value: 'help@acme.io'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][1]).toEqual({supportEmail: 'help@acme.io'});
  });

  it('says the settings apply to the unit, and where connections come from', () => {
    const onCreateConnection: Mock = vi.fn();

    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        connections={connections}
        ouName="Tenant A"
        showScopeNotice
        onCreateConnection={onCreateConnection}
      />,
    );

    expect(screen.getByText('Applies to Tenant A')).toBeTruthy();
    expect(screen.getByText('Only connections that belong to Tenant A are listed.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {name: 'Create a connection'}));
    expect(onCreateConnection).toHaveBeenCalled();
  });

  it('does not offer to create a connection unless it is asked to', () => {
    renderWithProviders(<BaseFlowVariables variables={variables} connections={connections} />);

    expect(screen.queryByRole('button', {name: 'Create a connection'})).toBeNull();
  });

  it('says so when the flow declares nothing', () => {
    renderWithProviders(<BaseFlowVariables variables={[]} />);

    expect(screen.getByText('This flow has no variables to configure.')).toBeTruthy();
  });

  it('hands the form state to a custom render', () => {
    renderWithProviders(
      <BaseFlowVariables variables={variables}>
        {({handleChange, values}): ReactNode => (
          <button type="button" onClick={(): void => handleChange('supportEmail', 'x@y.co')}>
            {String(values['supportEmail'])}
          </button>
        )}
      </BaseFlowVariables>,
    );

    fireEvent.click(screen.getByRole('button', {name: 'support@acme.io'}));

    expect(screen.getByRole('button', {name: 'x@y.co'})).toBeTruthy();
  });

  it('lets the host wrap the card of each variable', () => {
    const onRemove = vi.fn();

    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        renderField={(field, definition, index): ReactNode => (
          <div data-testid={`wrap-${index}`}>
            {field}
            <button
              type="button"
              onClick={(): void => {
                onRemove(definition.identifier);
              }}
            >
              {`Remove ${definition.identifier}`}
            </button>
          </div>
        )}
      />,
    );

    expect(screen.getAllByTestId(/^wrap-/)).toHaveLength(variables.length);
    expect(screen.getByTestId('wrap-0').textContent).toContain('Support email');

    fireEvent.click(screen.getByRole('button', {name: 'Remove mfaMode'}));

    expect(onRemove).toHaveBeenCalledWith('mfaMode');
  });

  it('lets the host add a control to the label row of each variable', () => {
    renderWithProviders(
      <BaseFlowVariables
        variables={variables}
        renderFieldAction={(definition): ReactNode => (
          <button type="button">{`Delete ${definition.identifier}`}</button>
        )}
      />,
    );

    const card = screen.getByRole('button', {name: 'Delete mfaMode'}).closest('section');

    expect(card?.getAttribute('data-variable')).toBe('mfaMode');
    expect(screen.getAllByRole('button', {name: /^Delete /})).toHaveLength(variables.length);
  });
});

describe('FlowVariablesForm', () => {
  const flow = {
    flowType: 'AUTHENTICATION',
    handle: 'acme-login',
    id: 'f-1',
    isOwnedByOU: false,
    isReadOnly: true,
    name: 'Acme Login',
    ouId: 'ou-1',
    variables,
  };

  const overlay = {
    owned: false,
    ouId: 'ou-1',
    policyIds: ['p-1'],
    rules: {
      'variables.mfaMode': {editable: true},
      'variables.showSignUp': {editable: false, value: ['false']},
      'variables.social': {editable: true},
      'variables.supportEmail': {editable: true},
    },
    visible: true,
  };

  const fetcherFor = (): Mock<ApiFetcher> =>
    vi.fn((url: string, init: RequestInit) => {
      if (url.includes('/flows/f-1/overlay-rules')) {
        return Promise.resolve(respond(overlay));
      }
      if (url.includes('/flows/f-1/variables') && init.method === 'PUT') {
        return Promise.resolve(respond({values: (JSON.parse(init.body as string) as {values: unknown}).values}));
      }
      if (url.includes('/flows/f-1/variables')) {
        return Promise.resolve(respond({values: {supportEmail: 'emea@acme.io'}}));
      }
      if (url.includes('/flows/f-1')) {
        return Promise.resolve(respond(flow));
      }
      if (url.includes('/connections')) {
        return Promise.resolve(respond({connections, count: 3, links: [], startIndex: 1, totalResults: 3}));
      }
      return Promise.resolve(respond({}, 404));
    }) as Mock<ApiFetcher>;

  it('loads the shared variables and the values the unit has set', async () => {
    const fetcher = fetcherFor();

    renderWithProviders(<FlowVariablesForm flowId="f-1" ouId="ou-1" />, fetcher);

    await waitFor(() => expect(screen.getByLabelText('Support email').value).toBe('emea@acme.io'));
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/flows/f-1?ouId=ou-1`, expect.anything());
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/flows/f-1/variables?ouId=ou-1`, expect.anything());
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/flows/f-1/overlay-rules?ouId=ou-1`, expect.anything());
    await waitFor(() => expect(screen.getByLabelText('connection1')).toBeTruthy());
  });

  it('asks only for the connections the unit owns or was shared', async () => {
    const fetcher = fetcherFor();

    renderWithProviders(<FlowVariablesForm flowId="f-1" ouId="ou-1" />, fetcher);
    const requested = (): string | undefined =>
      fetcher.mock.calls.map(([url]) => url).find((url) => url.includes('/connections'));

    await waitFor(() => expect(requested()).toBeDefined());

    expect(requested()).toBe(`${baseUrl}/connections?filter=ouId+eq+%22ou-1%22&limit=100`);
  });

  it('saves only the values that differ from their defaults', async () => {
    const fetcher = fetcherFor();
    const onSaved: Mock = vi.fn();

    renderWithProviders(<FlowVariablesForm flowId="f-1" ouId="ou-1" onSaved={onSaved} />, fetcher);
    await waitFor(() => screen.getByLabelText('Support email'));

    fireEvent.change(screen.getByLabelText('Second factor'), {target: {value: 'SMS_OTP'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());

    const put = fetcher.mock.calls.find(([, init]) => init.method === 'PUT');

    expect(JSON.parse(put?.[1].body as string)).toEqual({
      ouId: 'ou-1',
      values: {mfaMode: 'SMS_OTP', supportEmail: 'emea@acme.io'},
    });
  });
});

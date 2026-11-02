// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {
  EmbeddedFlowType,
  EmbeddedSignInFlowType,
  ThunderIDAPIError,
  ThunderIDRuntimeError,
  executeEmbeddedDeviceGrantFlow,
} from '@thunderid/browser';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import {initiateOAuthRedirect} from '../../../../utils/oauth';
import DeviceGrant from '../DeviceGrant';

const storageState = vi.hoisted(() => ({
  isInitialized: true,
  temporaryData: undefined as Record<string, unknown> | undefined,
}));

vi.mock('@thunderid/browser', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@thunderid/browser')>()),
  executeEmbeddedDeviceGrantFlow: vi.fn(),
}));

vi.mock('../../../../contexts/ThunderID/useThunderID', () => ({
  default: () => ({
    applicationId: undefined,
    baseUrl: 'https://id.example.com',
    getStorageManager: () =>
      Promise.resolve({
        getTemporaryData: () => Promise.resolve(storageState.temporaryData),
        removeTemporaryDataParameter: vi.fn(),
        setTemporaryDataParameter: vi.fn(),
      }),
    isInitialized: storageState.isInitialized,
    isLoading: false,
    meta: {application: {name: 'Example App'}},
    vendor: 'test-vendor',
  }),
}));

vi.mock('../../../../hooks/useTranslation', () => ({
  default: () => ({t: (key: string) => key}),
}));

vi.mock('../../../../utils/oauth', () => ({initiateOAuthRedirect: vi.fn()}));

vi.mock('../../../../utils/flowTransformer', () => ({
  extractErrorMessage: () => 'deviceGrant.messages.failed',
  normalizeFlowResponse: (response: {
    data?: {additionalData?: Record<string, unknown>; meta?: {components?: unknown[]}};
  }) => ({
    additionalData: response.data?.additionalData ?? {},
    components: response.data?.meta?.components ?? [],
  }),
}));

vi.mock('../BaseDeviceGrant', () => ({
  default: (props: {
    components: unknown[];
    additionalData?: Record<string, unknown>;
    error?: Error | null;
    initialValues?: Record<string, string>;
    onSubmit: (payload: {action: string; inputs: Record<string, unknown>}, component: {id: string}) => void;
    result?: string | null;
  }) => (
    <div>
      <span data-testid="code-value">{props.initialValues?.['user_code'] ?? ''}</span>
      <span data-testid="component-count">{props.components.length}</span>
      <span data-testid="consent-prompt">{JSON.stringify(props.additionalData?.['consentPrompt'] ?? null)}</span>
      <span data-testid="flow-error">{props.error?.message ?? ''}</span>
      <span data-testid="flow-result">{props.result ?? ''}</span>
      <button
        onClick={() =>
          props.onSubmit(
            {action: 'continue', inputs: {user_code: props.initialValues?.['user_code'] ?? ''}},
            {id: 'continue'},
          )
        }
      >
        Continue
      </button>
      <button
        onClick={() =>
          props.onSubmit(
            {
              action: 'authorize',
              inputs: {
                consent_decisions: {profile: {email: true}},
                '__consent_opt__profile.email': 'true',
              },
            },
            {id: 'authorize'},
          )
        }
      >
        Submit consent
      </button>
    </div>
  ),
}));

const mockedExecute = vi.mocked(executeEmbeddedDeviceGrantFlow);

const renderDeviceGrant = (onError?: (error: Error) => void) => {
  return render(
    <ThemeProvider>
      <DeviceGrant onError={onError} />
    </ThemeProvider>,
  );
};

beforeEach(() => {
  window.history.replaceState({}, '', '/device?applicationId=app-1&user_code=BCDF-GHJK');
  sessionStorage.removeItem('test-vendor_device_grant_execution_id');
  storageState.isInitialized = true;
  storageState.temporaryData = undefined;
  mockedExecute.mockReset();
  mockedExecute.mockResolvedValue({
    executionId: 'execution-1',
    flowStatus: 'INCOMPLETE',
    challengeToken: 'challenge-1',
    data: {
      meta: {components: [{id: 'user-code', ref: 'user_code'}]},
      additionalData: {consentPrompt: JSON.stringify([{purposeId: 'profile', optional: [{name: 'name'}]}])},
    },
  } as never);
});

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('DeviceGrant', () => {
  it('waits for SDK initialization before starting the configured flow', async () => {
    storageState.isInitialized = false;
    const view = renderDeviceGrant();

    await waitFor(() => expect(mockedExecute).not.toHaveBeenCalled());

    storageState.isInitialized = true;
    view.rerender(
      <ThemeProvider>
        <DeviceGrant />
      </ThemeProvider>,
    );

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(1));
  });

  it('submits timed-out consent as a denial with the timeout reason', async () => {
    mockedExecute.mockResolvedValueOnce({
      executionId: 'execution-1',
      flowStatus: 'INCOMPLETE',
      challengeToken: 'challenge-1',
      data: {
        meta: {
          components: [
            {eventType: 'SUBMIT', id: 'allow', label: 'Allow', type: 'ACTION', variant: 'PRIMARY'},
            {eventType: 'SUBMIT', id: 'deny', label: 'Deny', type: 'ACTION', variant: 'SECONDARY'},
          ],
        },
        additionalData: {
          consentPrompt: JSON.stringify([{essential: [], optional: [], purposeId: 'profile'}]),
          stepTimeout: Date.now() + 50,
        },
      },
    } as never);

    renderDeviceGrant();

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(2));

    const payload = mockedExecute.mock.calls[1][0]?.payload;
    expect(payload).toMatchObject({action: 'deny'});
    if (!payload || !('inputs' in payload)) throw new Error('Expected a flow continuation payload');
    const inputs = payload.inputs ?? {};
    expect(JSON.parse(inputs['consent_decisions'] as string)).toMatchObject({
      approved: false,
      reason: 'timeout',
    });
    expect(inputs).not.toHaveProperty('__consent_reason__');
  });

  it('prefills the configured flow code prompt without submitting the code at flow start', async () => {
    window.history.replaceState({}, '', '/device?applicationId=app-1&user_code=BCDF-GHJK');

    renderDeviceGrant();

    await waitFor(() => {
      expect(mockedExecute).toHaveBeenCalledWith({
        baseUrl: 'https://id.example.com',
        payload: {
          applicationId: 'app-1',
          flowType: EmbeddedFlowType.DeviceGrant,
          inputs: {},
        },
      });
    });
    expect(screen.getByTestId('code-value')).toHaveTextContent('BCDF-GHJK');
    expect(window.location.search).toBe('');

    fireEvent.click(screen.getByRole('button', {name: 'Continue'}));

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(2));
    expect(mockedExecute).toHaveBeenLastCalledWith({
      baseUrl: 'https://id.example.com',
      payload: {
        action: 'continue',
        challengeToken: 'challenge-1',
        executionId: 'execution-1',
        inputs: {user_code: 'BCDF-GHJK'},
      },
    });
  });

  it('lets the configured flow provide its code prompt when the URI has no code', async () => {
    window.history.replaceState({}, '', '/device?applicationId=app-1');
    renderDeviceGrant();

    await waitFor(() => {
      expect(mockedExecute).toHaveBeenCalledWith({
        baseUrl: 'https://id.example.com',
        payload: {
          applicationId: 'app-1',
          flowType: EmbeddedFlowType.DeviceGrant,
          inputs: {},
        },
      });
    });
    expect(screen.getByTestId('component-count')).toHaveTextContent('1');
  });

  it('continues the Device Grant flow after it has started', async () => {
    mockedExecute.mockResolvedValueOnce({
      executionId: 'execution-1',
      flowStatus: 'INCOMPLETE',
      challengeToken: 'challenge-1',
      data: {meta: {components: [{id: 'sign-in', ref: 'username'}]}},
    } as never);
    mockedExecute.mockResolvedValueOnce({
      executionId: 'execution-1',
      flowStatus: 'INCOMPLETE',
      challengeToken: 'challenge-2',
      data: {meta: {components: [{id: 'sign-in', ref: 'username'}]}},
    } as never);
    renderDeviceGrant();

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.search).toBe(''));
    fireEvent.click(screen.getByRole('button', {name: 'Continue'}));

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(2));
    expect(mockedExecute).toHaveBeenLastCalledWith({
      baseUrl: 'https://id.example.com',
      payload: {
        action: 'continue',
        challengeToken: 'challenge-1',
        executionId: 'execution-1',
        inputs: {user_code: undefined},
      },
    });
  });

  it('persists the execution before redirecting to a federated provider', async () => {
    vi.mocked(initiateOAuthRedirect).mockImplementation(() => {
      expect(sessionStorage.getItem('test-vendor_device_grant_execution_id')).toBe('execution-redirect');
    });
    mockedExecute.mockResolvedValueOnce({
      type: EmbeddedSignInFlowType.Redirection,
      executionId: 'execution-redirect',
      challengeToken: 'challenge-redirect',
      data: {redirectURL: 'https://identity-provider.example/authorize'},
    } as never);

    renderDeviceGrant();

    await waitFor(() =>
      expect(initiateOAuthRedirect).toHaveBeenCalledWith('https://identity-provider.example/authorize', 'test-vendor'),
    );
  });

  it('resumes a stored execution after reload instead of starting another flow', async () => {
    window.history.replaceState({}, '', '/device');
    sessionStorage.setItem('test-vendor_device_grant_execution_id', 'execution-resume');

    renderDeviceGrant();

    await waitFor(() =>
      expect(mockedExecute).toHaveBeenCalledWith({
        baseUrl: 'https://id.example.com',
        payload: {executionId: 'execution-resume'},
      }),
    );
    expect(mockedExecute).toHaveBeenCalledTimes(1);
  });

  it('clears a stale stored execution without starting a replacement flow', async () => {
    window.history.replaceState({}, '', '/device');
    sessionStorage.setItem('test-vendor_device_grant_execution_id', 'execution-stale');
    mockedExecute.mockRejectedValueOnce(
      new ThunderIDAPIError('expired execution', 'stale', 'javascript', 400, 'Bad Request'),
    );

    renderDeviceGrant();

    await waitFor(() => expect(sessionStorage.getItem('test-vendor_device_grant_execution_id')).toBeNull());
    expect(mockedExecute).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('flow-result')).toHaveTextContent('failure');
  });

  it('continues the stored execution with the OAuth callback code and nonce', async () => {
    window.history.replaceState({}, '', '/device?code=provider-code&nonce=provider-nonce&state=oauth-state');
    sessionStorage.setItem('test-vendor_device_grant_execution_id', 'execution-callback');
    storageState.temporaryData = {challengeToken: 'challenge-restored'};
    mockedExecute.mockResolvedValueOnce({
      executionId: 'execution-callback',
      flowStatus: 'INCOMPLETE',
      challengeToken: 'challenge-next',
      data: {meta: {components: []}},
    } as never);

    renderDeviceGrant();

    await waitFor(() =>
      expect(mockedExecute).toHaveBeenCalledWith({
        baseUrl: 'https://id.example.com',
        payload: {
          challengeToken: 'challenge-restored',
          executionId: 'execution-callback',
          inputs: {code: 'provider-code', nonce: 'provider-nonce'},
        },
      }),
    );
    expect(mockedExecute).toHaveBeenCalledTimes(1);
  });

  it('strips internal consent option fields but preserves consent_decisions', async () => {
    window.history.replaceState({}, '', '/device?applicationId=app-1');
    mockedExecute.mockResolvedValueOnce({
      executionId: 'execution-1',
      flowStatus: 'INCOMPLETE',
      challengeToken: 'challenge-1',
      data: {meta: {components: [{id: 'consent', type: 'CONSENT'}]}},
    } as never);
    renderDeviceGrant();

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', {name: 'Submit consent'}));

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(2));
    expect(mockedExecute).toHaveBeenLastCalledWith({
      baseUrl: 'https://id.example.com',
      payload: {
        action: 'authorize',
        challengeToken: 'challenge-1',
        executionId: 'execution-1',
        inputs: {consent_decisions: {profile: {email: true}}, user_code: undefined},
      },
    });
  });

  it('compiles consent decisions and strips internal fields for custom render submissions', async () => {
    window.history.replaceState({}, '', '/device?applicationId=app-1');
    mockedExecute.mockResolvedValueOnce({
      executionId: 'execution-consent',
      flowStatus: 'INCOMPLETE',
      challengeToken: 'challenge-consent',
      data: {
        meta: {
          components: [{eventType: 'SUBMIT', id: 'approve', type: 'ACTION', variant: 'PRIMARY'}],
        },
        additionalData: {
          consentPrompt: [{essential: [], optional: [{name: 'email'}], purposeId: 'profile', purposeName: 'Profile'}],
        },
      },
    } as never);
    mockedExecute.mockResolvedValueOnce({
      executionId: 'execution-consent',
      flowStatus: 'INCOMPLETE',
      data: {meta: {components: []}},
    } as never);

    render(
      <ThemeProvider>
        <DeviceGrant>
          {({onSubmit}) => (
            <button
              onClick={() =>
                void onSubmit({
                  action: 'approve',
                  inputs: {
                    __consent_opt__profile__email: 'true',
                    __consent_modified__profile__email__value: '{"name":"private"}',
                    __consent_invalid__profile__email__value: 'true',
                  },
                })
              }
            >
              Approve
            </button>
          )}
        </DeviceGrant>
      </ThemeProvider>,
    );

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', {name: 'Approve'}));

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(2));
    const submittedInputs = mockedExecute.mock.calls[1][0]?.payload;
    expect(submittedInputs).toMatchObject({action: 'approve'});
    if (!submittedInputs || !('inputs' in submittedInputs)) throw new Error('Expected a flow continuation payload');
    const inputs = submittedInputs.inputs ?? {};
    // eslint-disable-next-line @typescript-eslint/dot-notation -- `inputs` is an index-signature payload.
    expect(JSON.parse(inputs['consent_decisions'] as string)).toEqual({
      approved: true,
      purposes: [
        {
          approved: true,
          elements: [{approved: true, name: 'email'}],
          purposeName: 'Profile',
        },
      ],
    });
    expect(submittedInputs.inputs).not.toHaveProperty('__consent_opt__profile__email');
    expect(submittedInputs.inputs).not.toHaveProperty('__consent_modified__profile__email__value');
    expect(submittedInputs.inputs).not.toHaveProperty('__consent_invalid__profile__email__value');
  });

  it('shows continuation failures from the OAuth callback', async () => {
    mockedExecute
      .mockResolvedValueOnce({
        executionId: 'execution-1',
        flowStatus: 'INCOMPLETE',
        challengeToken: 'challenge-1',
        data: {meta: {components: [{id: 'user-code', ref: 'user_code'}]}},
      } as never)
      .mockRejectedValueOnce(new Error('callback rejected approval'));
    renderDeviceGrant();

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(window.location.search).toBe(''));
    fireEvent.click(screen.getByRole('button', {name: 'Continue'}));

    await waitFor(() => expect(screen.getByTestId('flow-error')).toHaveTextContent('callback rejected approval'));
    expect(screen.getByTestId('flow-result')).toHaveTextContent('failure');
  });

  it('maps only a COMPLETE flow response to success and calls onComplete', async () => {
    const onComplete = vi.fn();
    mockedExecute.mockResolvedValueOnce({
      executionId: 'execution-1',
      flowStatus: 'COMPLETE',
      data: {meta: {components: []}},
    } as never);

    render(
      <ThemeProvider>
        <DeviceGrant onComplete={onComplete} />
      </ThemeProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('flow-result')).toHaveTextContent('success'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps an empty INCOMPLETE response non-terminal', async () => {
    mockedExecute.mockResolvedValueOnce({
      executionId: 'execution-1',
      flowStatus: 'INCOMPLETE',
      data: {meta: {components: []}},
    } as never);

    renderDeviceGrant();

    await waitFor(() => expect(mockedExecute).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('flow-result')).toBeEmptyDOMElement();
  });

  it('reports a start error when no application ID is available', async () => {
    window.history.replaceState({}, '', '/device');
    const onError = vi.fn();

    renderDeviceGrant(onError);

    await waitFor(() => expect(screen.getByTestId('flow-error')).toHaveTextContent('deviceGrant.errors.start'));
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(ThunderIDRuntimeError);
    expect((onError.mock.calls[0][0] as ThunderIDRuntimeError).code).toBe('DEVICE_GRANT_ERROR');
    expect(mockedExecute).not.toHaveBeenCalled();
  });
});

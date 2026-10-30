// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {ReactElement, StrictMode} from 'react';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import UserContext, {UserContextProps} from '../../../../contexts/User/UserContext';
import {BaseVerifyAttributeRenderProps} from '../BaseVerifyAttribute';
import VerifyAttribute, {VerifyAttributeProps} from '../VerifyAttribute';

const mockExecute = vi.fn() as Mock;

vi.mock('../../../../api/auth/executeEmbeddedSelfServiceFlow', () => ({
  default: (...args: unknown[]): unknown => mockExecute(...args) as unknown,
}));

const thunderIDContext: ThunderIDContextProps = {
  baseUrl: 'https://localhost:8090',
  endpoints: {flowExecute: 'https://auth.example.com/flow/execute'},
  instanceId: 3,
  isInitialized: true,
  isLoading: false,
  meta: null,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

const workEmailSchema: UserContextProps['userSchema'] = {
  given_name: {displayName: 'First name', type: 'string'},
  workEmail: {type: 'email'},
};

const mockRevalidateProfile = vi.fn() as Mock;

const userContext = (userSchema: UserContextProps['userSchema']): UserContextProps =>
  ({
    flattenedProfile: null,
    onUpdateProfile: vi.fn(),
    profile: null,
    revalidateProfile: mockRevalidateProfile,
    updateProfile: vi.fn(),
    userSchema,
  }) as unknown as UserContextProps;

interface TestProps {
  attribute: string;
  attributeDisplayName?: string;
  children?: VerifyAttributeProps['children'];
  flowHandle?: string;
  onComplete?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

const tree = (
  props: TestProps,
  schema: UserContextProps['userSchema'] = workEmailSchema,
  context: Partial<ThunderIDContextProps> = {},
): ReactElement => (
  <ThunderIDContext.Provider value={{...thunderIDContext, ...context}}>
    <UserContext.Provider value={userContext(schema)}>
      <I18nProvider>
        <ThemeProvider>
          <VerifyAttribute {...props} />
        </ThemeProvider>
      </I18nProvider>
    </UserContext.Provider>
  </ThunderIDContext.Provider>
);

const renderVerifyAttribute = (
  props: TestProps,
  schema: UserContextProps['userSchema'] = workEmailSchema,
  context: Partial<ThunderIDContextProps> = {},
): ReturnType<typeof render> => render(tree(props, schema, context));

describe('VerifyAttribute', () => {
  beforeEach(() => {
    mockExecute.mockReset().mockReturnValue(new Promise(() => undefined));
    mockRevalidateProfile.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('starts the default self attribute verification flow for the attribute through the configured endpoint', async () => {
    renderVerifyAttribute({attribute: 'workEmail'});

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
    expect(mockExecute).toHaveBeenCalledWith({
      baseUrl: 'https://localhost:8090',
      instanceId: 3,
      payload: {
        flowType: 'SELF_SERVICE',
        handle: 'default-self-attribute-verification-flow',
        inputs: {attribute: 'workEmail'},
      },
      url: 'https://auth.example.com/flow/execute',
    });
  });

  it('posts to /flow/execute on baseUrl when no flowExecute endpoint is configured', async () => {
    renderVerifyAttribute({attribute: 'workEmail'}, workEmailSchema, {endpoints: undefined});

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
    expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({url: 'https://localhost:8090/flow/execute'}));
  });

  it('starts the flow the app names by handle', async () => {
    renderVerifyAttribute({attribute: 'workEmail', flowHandle: 'email-link-verification'});

    await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          flowType: 'SELF_SERVICE',
          handle: 'email-link-verification',
          inputs: {attribute: 'workEmail'},
        },
      }),
    );
  });

  it('names the attribute with its schema display name', async () => {
    mockExecute.mockResolvedValue({
      data: {additionalData: {maskedDestination: 'a•••@example.com'}, components: []},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
    });

    renderVerifyAttribute({attribute: 'workEmail'}, {workEmail: {displayName: 'Work email', type: 'email'}});

    expect(await screen.findByText('Verify Work email')).toBeTruthy();
  });

  it('falls back to a readable attribute name without a schema display name', async () => {
    mockExecute.mockResolvedValue({
      data: {additionalData: {maskedDestination: 'a•••@example.com'}, components: []},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
    });

    renderVerifyAttribute({attribute: 'workEmail'});

    expect(await screen.findByText('Verify Work Email')).toBeTruthy();
  });

  describe('once per showing', () => {
    it('starts one verification under StrictMode, which runs effects twice', async () => {
      render(<StrictMode>{tree({attribute: 'workEmail'})}</StrictMode>);

      await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
      await new Promise((resolve: (value: unknown) => void) => {
        setTimeout(resolve, 50);
      });
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('does not retry a start that failed', async () => {
      const onError: Mock = vi.fn();
      mockExecute.mockRejectedValue(new Error('network down'));
      const {rerender} = renderVerifyAttribute({attribute: 'workEmail', onError});

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      rerender(tree({attribute: 'workEmail', onError}, workEmailSchema, {baseUrl: 'https://localhost:8091'}));
      await new Promise((resolve: (value: unknown) => void) => {
        setTimeout(resolve, 50);
      });

      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Verification failed. Please try again.')).toBeTruthy();
    });
  });

  describe('profile re-read', () => {
    it('re-reads the profile once the server records the verification, then reports it', async () => {
      const onComplete: Mock = vi.fn();
      mockExecute.mockResolvedValue({executionId: 'exec-1', flowStatus: 'COMPLETE'});

      renderVerifyAttribute({attribute: 'workEmail', onComplete});

      await waitFor(() => expect(mockRevalidateProfile).toHaveBeenCalledTimes(1));
      expect(onComplete).toHaveBeenCalledWith({executionId: 'exec-1', flowStatus: 'COMPLETE'});
    });

    it('still reports the verification when the re-read fails', async () => {
      const onComplete: Mock = vi.fn();
      mockRevalidateProfile.mockRejectedValue(new Error('offline'));
      mockExecute.mockResolvedValue({executionId: 'exec-1', flowStatus: 'COMPLETE'});

      renderVerifyAttribute({attribute: 'workEmail', onComplete});

      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
      expect(await screen.findByText('Work Email verified.')).toBeTruthy();
    });

    it('offers Done for a link and re-reads the profile when it is selected, without polling', async () => {
      const onDone: Mock = vi.fn();
      mockExecute.mockResolvedValue({
        data: {additionalData: {maskedDestination: 'a•••@example.com'}, components: []},
        executionId: 'exec-1',
        flowStatus: 'INCOMPLETE',
      });

      renderVerifyAttribute({attribute: 'workEmail', onDone});
      fireEvent.click(await screen.findByText('Done'));

      expect(mockRevalidateProfile).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('offers Done for a link even when the app handles none', async () => {
      mockExecute.mockResolvedValue({
        data: {additionalData: {maskedDestination: 'a•••@example.com'}, components: []},
        executionId: 'exec-1',
        flowStatus: 'INCOMPLETE',
      });

      renderVerifyAttribute({attribute: 'workEmail'});
      fireEvent.click(await screen.findByText('Done'));

      expect(mockRevalidateProfile).toHaveBeenCalledTimes(1);
    });

    it('does not re-read the profile before the verification completes', async () => {
      mockExecute.mockResolvedValue({
        data: {additionalData: {maskedDestination: 'a•••@example.com'}, components: []},
        executionId: 'exec-1',
        flowStatus: 'INCOMPLETE',
      });

      renderVerifyAttribute({attribute: 'workEmail'});
      await screen.findByText('Done');

      expect(mockRevalidateProfile).not.toHaveBeenCalled();
    });
  });

  describe('attribute eligibility', () => {
    it('starts nothing for a string attribute such as a first name and reports the refusal', async () => {
      const onError: Mock = vi.fn();
      renderVerifyAttribute({attribute: 'given_name', onError});

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect((onError.mock.calls[0][0] as {code: string}).code).toBe(
        'VerifyAttribute-handleInitialize-RuntimeError-001',
      );
      expect(screen.getByText('Verification failed. Please try again.')).toBeTruthy();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('starts nothing for a multi-valued attribute', async () => {
      const onError: Mock = vi.fn();
      renderVerifyAttribute({attribute: 'emails', onError}, {emails: {type: 'array'}});

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('starts nothing for an attribute the schema does not declare', async () => {
      const onError: Mock = vi.fn();
      renderVerifyAttribute({attribute: 'email', onError});

      await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('waits, without refusing, while the schema is unknown after the session loads', async () => {
      const onError: Mock = vi.fn();
      const {rerender} = renderVerifyAttribute({attribute: 'workEmail', onError}, null);

      await new Promise((resolve: (value: unknown) => void) => {
        setTimeout(resolve, 50);
      });
      expect(onError).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();

      rerender(tree({attribute: 'workEmail', onError}));

      await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
      expect(onError).not.toHaveBeenCalled();
    });

    it('waits for the user schema to load before deciding', async () => {
      const onError: Mock = vi.fn();
      const {rerender} = renderVerifyAttribute({attribute: 'workEmail', onError}, null, {isLoading: true});

      await new Promise((resolve: (value: unknown) => void) => {
        setTimeout(resolve, 50);
      });
      expect(onError).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();

      rerender(
        <ThunderIDContext.Provider value={thunderIDContext}>
          <UserContext.Provider value={userContext(workEmailSchema)}>
            <I18nProvider>
              <ThemeProvider>
                <VerifyAttribute attribute="workEmail" onError={onError} />
              </ThemeProvider>
            </I18nProvider>
          </UserContext.Provider>
        </ThunderIDContext.Provider>,
      );

      await waitFor(() => expect(mockExecute).toHaveBeenCalledTimes(1));
      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe('custom render', () => {
    const codeStep = {
      challengeToken: 'ct-1',
      data: {
        additionalData: {maskedDestination: 'a•••@example.com'},
        components: [
          {
            components: [
              {id: 'input_otp', label: 'Code', ref: 'otp', required: true, type: 'OTP_INPUT'},
              {eventType: 'SUBMIT', id: 'action_verify', label: 'Verify', type: 'ACTION', variant: 'PRIMARY'},
            ],
            id: 'block_otp',
            type: 'BLOCK',
          },
        ],
      },
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
    };

    const custom: VerifyAttributeProps['children'] = ({
      components,
      handleInputChange,
      handleSubmit,
      isComplete,
      onDone,
      subtitle,
      successMessage,
      title,
      values,
    }: BaseVerifyAttributeRenderProps) => (
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
        {isComplete && <p>{successMessage}</p>}
        <input aria-label="Code" onChange={(event): void => handleInputChange('otp', event.target.value)} />
        {components[0]?.components?.[1] && (
          <button type="button" onClick={(): void => void handleSubmit(components[0].components![1], values)}>
            Check
          </button>
        )}
        {onDone && (
          <button type="button" onClick={onDone}>
            Opened it
          </button>
        )}
      </div>
    );

    it('passes the step the connected component started to its render function', async () => {
      mockExecute.mockResolvedValue(codeStep);
      renderVerifyAttribute({attribute: 'workEmail', children: custom});

      expect(await screen.findByText('Verify Work Email')).toBeTruthy();
      expect(screen.getByText('Enter the code sent to a•••@example.com.')).toBeTruthy();
      expect(screen.queryByRole('button', {name: 'Verify'})).toBeNull();
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute.mock.calls[0][0]).toMatchObject({instanceId: 3, payload: {flowType: 'SELF_SERVICE'}});
    });

    it('re-reads the profile and reports the verification a custom UI submitted', async () => {
      const onComplete: Mock = vi.fn();
      mockExecute
        .mockResolvedValueOnce(codeStep)
        .mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'COMPLETE'});
      renderVerifyAttribute({attribute: 'workEmail', children: custom, onComplete});

      fireEvent.change(await screen.findByLabelText('Code'), {target: {value: '123456'}});
      fireEvent.click(screen.getByRole('button', {name: 'Check'}));

      expect(await screen.findByText('Work Email verified.')).toBeTruthy();
      expect(mockExecute).toHaveBeenLastCalledWith(
        expect.objectContaining({
          payload: {action: 'action_verify', challengeToken: 'ct-1', executionId: 'exec-1', inputs: {otp: '123456'}},
        }),
      );
      expect(mockRevalidateProfile).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith({executionId: 'exec-1', flowStatus: 'COMPLETE'});
    });

    it('re-reads the profile when a custom UI confirms a link', async () => {
      const onDone: Mock = vi.fn();
      mockExecute.mockResolvedValue({
        data: {additionalData: {maskedDestination: 'a•••@example.com'}, components: []},
        executionId: 'exec-1',
        flowStatus: 'INCOMPLETE',
      });
      renderVerifyAttribute({attribute: 'workEmail', children: custom, onDone});

      fireEvent.click(await screen.findByRole('button', {name: 'Opened it'}));

      expect(mockRevalidateProfile).toHaveBeenCalledTimes(1);
      expect(onDone).toHaveBeenCalledTimes(1);
    });
  });
});

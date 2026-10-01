// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen, cleanup, fireEvent, waitFor} from '@testing-library/react';
import {EmbeddedFlowComponentType} from '@thunderid/browser';
import type {EmbeddedFlowComponent} from '@thunderid/browser';
import {ReactElement} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import BaseAcceptInvite from '../AcceptInvite/BaseAcceptInvite';
import BaseRecovery from '../Recovery/BaseRecovery';
import BaseSignIn from '../SignIn/BaseSignIn';
import BaseSignUp from '../SignUp/BaseSignUp';

const thunderIDContext: ThunderIDContextProps = {
  applicationId: 'app-1',
  getStorageManager: vi.fn(() =>
    Promise.resolve({
      getTemporaryData: vi.fn(() => Promise.resolve({})),
      removeTemporaryDataParameter: vi.fn(),
      setTemporaryDataParameter: vi.fn(),
    }),
  ),
  isInitialized: true,
  isLoading: false,
  meta: null,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

const withProviders = (ui: ReactElement): ReactElement => (
  <ThunderIDContext.Provider value={thunderIDContext}>
    <I18nProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </I18nProvider>
  </ThunderIDContext.Provider>
);

const ownerPicker = (required = false): EmbeddedFlowComponent =>
  ({
    id: 'owner_input',
    label: 'Owner',
    ref: 'owner',
    required,
    type: EmbeddedFlowComponentType.UserSelect,
  }) as EmbeddedFlowComponent;

const submitAction = {
  eventType: 'SUBMIT',
  id: 'continue_action',
  label: 'Continue',
  type: EmbeddedFlowComponentType.Action,
  variant: 'PRIMARY',
} as EmbeddedFlowComponent;

const incompleteStep = (components: EmbeddedFlowComponent[]) => ({
  data: {components},
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
});

/** The shape the server sends and BaseSignUp normalizes: components live under `data.meta`. */
const incompleteServerStep = (components: EmbeddedFlowComponent[]) => ({
  data: {meta: {components}},
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
});

const ownerPickerOnly = (): EmbeddedFlowComponent[] => [ownerPicker(), submitAction];

const expectNoPicker = async (): Promise<void> => {
  await screen.findByRole('button', {name: /continue/i});
  expect(screen.queryByRole('combobox', {name: /owner/i})).not.toBeInTheDocument();
};

describe('USER_SELECT is skipped where no signed-in user exists', () => {
  afterEach(() => {
    cleanup();
  });

  it('BaseSignIn skips the picker and still renders the rest of the step', async () => {
    render(withProviders(<BaseSignIn components={ownerPickerOnly()} onSubmit={vi.fn()} />));

    await expectNoPicker();
  });

  it('BaseSignUp skips the picker and still renders the rest of the step', async () => {
    const onInitialize = vi.fn().mockResolvedValue(incompleteServerStep(ownerPickerOnly()));

    render(withProviders(<BaseSignUp isInitialized onInitialize={onInitialize} onSubmit={vi.fn()} />));

    await expectNoPicker();
  });

  it('BaseRecovery skips the picker and still renders the rest of the step', async () => {
    const onInitialize = vi.fn().mockResolvedValue(incompleteStep(ownerPickerOnly()));

    render(withProviders(<BaseRecovery isInitialized onInitialize={onInitialize} onSubmit={vi.fn()} />));

    await expectNoPicker();
  });

  it('BaseAcceptInvite skips the picker and still renders the rest of the step', async () => {
    const onSubmit = vi.fn().mockResolvedValue(incompleteStep(ownerPickerOnly()));

    render(withProviders(<BaseAcceptInvite executionId="exec-1" inviteToken="token-1" onSubmit={onSubmit} />));

    await expectNoPicker();
  });

  it('a required USER_SELECT that is not rendered does not block the step from being submitted', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(withProviders(<BaseSignIn components={[ownerPicker(true), submitAction]} onSubmit={onSubmit} />));
    fireEvent.click(await screen.findByRole('button', {name: /continue/i}));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {EmbeddedFlowComponent, EmbeddedFlowComponentType} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import {UseTranslation} from '../../../../hooks/useTranslation';
import {transformComponents} from '../../../../utils/flowTransformer';
import {chooseOption} from '../../../primitives/Select/__tests__/selectTestUtils';
import {renderSignInComponents} from '../AuthOptionFactory';

/**
 * A Resolve OU step, as the server's OUResolverExecutor describes it: one input (`ou_selection_input`,
 * identifier `ouId`), drawn by the flow's prompt as OU_SELECT before sign-in or as SELECT with the
 * eligible units after sign-in.
 */
const resolveOuResponse = (type: 'OU_SELECT' | 'SELECT', options?: string[]): unknown => ({
  data: {
    actions: [{nextNode: 'resolve_ou', ref: 'action_continue'}],
    inputs: [{identifier: 'ouId', ref: 'ou_selection_input', required: true, type, ...(options ? {options} : {})}],
    meta: {
      components: [
        {
          id: 'ou_selection_input',
          label: 'Organization',
          ref: 'ou_selection_input',
          required: true,
          type,
        },
        {eventType: 'SUBMIT', id: 'action_continue', label: 'Continue', type: 'ACTION', variant: 'PRIMARY'},
      ],
    },
  },
  executionId: 'execution-1',
  flowStatus: 'INCOMPLETE',
});

const t: UseTranslation['t'] = ((key: string) => key) as UseTranslation['t'];

const renderStep = (
  components: EmbeddedFlowComponent[],
  values: Record<string, string>,
  onInputChange: (name: string, value: string) => void,
): ReturnType<typeof render> =>
  render(
    <I18nProvider>
      <ThemeProvider>
        <div>{renderSignInComponents(components, values, {}, {}, false, true, () => undefined, onInputChange, {})}</div>
      </ThemeProvider>
    </I18nProvider>,
  );

describe('Resolve OU step', () => {
  afterEach(() => {
    cleanup();
  });

  it('asks for the organization unit before sign-in as a text field bound to ouId', () => {
    const components: EmbeddedFlowComponent[] = transformComponents(resolveOuResponse('OU_SELECT'), t, false);
    const onInputChange = vi.fn();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(components[0]).toMatchObject({ref: 'ouId', type: EmbeddedFlowComponentType.OuSelect});

    renderStep(components, {}, onInputChange);

    const field: HTMLInputElement = screen.getByRole('textbox', {name: /organization/i});
    fireEvent.change(field, {target: {value: 'acme'}});

    expect(onInputChange).toHaveBeenCalledWith('ouId', 'acme');
    expect(warn.mock.calls.flat().join(' ')).not.toContain('OU_SELECT component type is not supported');
    warn.mockRestore();
  });

  it('offers the eligible units after sign-in from the step description and submits the pick as ouId', () => {
    const components: EmbeddedFlowComponent[] = transformComponents(
      resolveOuResponse('SELECT', ['acme/eu', 'acme/us']),
      t,
      false,
    );
    const onInputChange = vi.fn();

    renderStep(components, {}, onInputChange);

    const picker: HTMLSelectElement = screen.getByRole('combobox', {name: /organization/i});
    expect(Array.from(picker.options).map((option: HTMLOptionElement) => option.textContent)).toEqual(
      expect.arrayContaining(['acme/eu', 'acme/us']),
    );

    chooseOption(picker, 'acme/us');

    expect(onInputChange).toHaveBeenCalledWith('ouId', 'acme/us');
  });
});

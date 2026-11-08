// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {MouseEvent, ReactElement, Ref} from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import SignOutButton, {SignOutButtonProps} from '../SignOutButton';

const {signOut} = vi.hoisted(() => ({signOut: vi.fn()}));

vi.mock('../../../../../contexts/ThunderID/useThunderID', () => ({default: () => ({signOut})}));
vi.mock('../../../../../../utils/logger', () => ({default: {debug: vi.fn(), error: vi.fn()}}));
vi.mock('@thunderid/react', () => ({
  BaseSignOutButton: 'BaseSignOutButton',
  useTranslation: () => ({t: (key: string) => key}),
}));
// The component is rendered by calling it directly, outside React, so its state hook keeps the initial value.
vi.mock('react', async (importOriginal: () => Promise<typeof import('react')>) => ({
  ...(await importOriginal()),
  useState: <T>(initial: T) => [initial, vi.fn()],
}));

interface BaseProps {
  className?: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => Promise<void>;
  signOut: () => Promise<void>;
  style?: object;
}

const render = (props: Partial<SignOutButtonProps>): BaseProps =>
  (
    SignOutButton as unknown as {
      render: (props: Partial<SignOutButtonProps>, ref: Ref<HTMLButtonElement>) => ReactElement<BaseProps>;
    }
  ).render(props, null).props;

const click = {} as MouseEvent<HTMLButtonElement>;

describe('SignOutButton', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('hands a render function a signOut that signs the user out', async () => {
    signOut.mockResolvedValue(undefined);

    await render({children: () => null}).signOut();

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('passes className and style to the button', () => {
    const props: BaseProps = render({className: 'sign-out', style: {color: 'red'}});

    expect(props.className).toBe('sign-out');
    expect(props.style).toEqual({color: 'red'});
  });

  it('calls onClick after a click signs the user out', async () => {
    signOut.mockResolvedValue(undefined);
    const onClick = vi.fn();

    await render({onClick}).onClick(click);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(click);
  });

  it('does not call onClick when the sign-out fails', async () => {
    signOut.mockRejectedValue(new Error('network'));
    const onClick = vi.fn();

    await render({onClick}).onClick(click);

    expect(onClick).not.toHaveBeenCalled();
  });
});

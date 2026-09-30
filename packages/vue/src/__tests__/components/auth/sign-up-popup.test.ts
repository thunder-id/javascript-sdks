// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi, type Mock, type MockInstance} from 'vitest';
import {nextTick, ref, type Ref} from 'vue';
import BaseSignUp, {type BaseSignUpRenderProps} from '../../../components/auth/sign-up/BaseSignUp';
import {FLOW_META_KEY, I18N_KEY} from '../../../keys';

const callbackUrl = (code: string, state: string): string =>
  `${window.location.origin}/callback?code=${code}&state=${state}`;

const chainedRedirect = {
  data: {redirectURL: 'https://idp.example.com/authorize?state=s2'},
  flowStatus: 'INCOMPLETE',
  type: 'REDIRECTION',
};

describe('BaseSignUp social sign-up popup', () => {
  let popup: {close: Mock; closed: boolean; location: {href: string}};
  // Where the popup was told to go. Its `href` keeps the current page until a test lands it, as a real
  // navigation commits only after the new page responds.
  let navigations: string[];
  let land: (url: string) => void;
  let open: MockInstance<typeof window.open>;
  let addListener: MockInstance<typeof window.addEventListener>;
  let onSubmit: Mock;

  beforeEach(() => {
    let href = 'about:blank';
    navigations = [];
    land = (url: string): void => {
      href = url;
    };
    popup = {
      close: vi.fn(() => {
        popup.closed = true;
      }),
      closed: false,
      location: {
        get href(): string {
          return href;
        },
        set href(url: string) {
          navigations.push(url);
        },
      },
    };
    open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    addListener = vi.spyOn(window, 'addEventListener');
    onSubmit = vi.fn();
  });

  afterEach(() => {
    // Stops the poll of any popup a failed assertion left open.
    popup.closed = true;
    open.mockRestore();
    addListener.mockRestore();
  });

  /**
   * Delivers the callback the way a callback page posting to its opener does. A synthetic MessageEvent cannot
   * carry the stand-in popup as its source, so the newest registered listener is called directly.
   */
  const postCallback = async (code: string, state: string): Promise<void> => {
    const handlers: Parameters<typeof window.addEventListener>[] = addListener.mock.calls.filter(
      ([type]) => type === 'message',
    );
    const handler = handlers[handlers.length - 1][1] as (event: unknown) => Promise<void>;
    await handler({data: {code, state}, origin: window.location.origin, source: popup});
  };

  const startSocialSignUp = async (onError?: Mock): Promise<() => void> => {
    let submit: ((component: unknown, data?: unknown, skipValidation?: boolean) => Promise<void>) | undefined;
    const wrapper = mount(BaseSignUp, {
      global: {
        provide: {
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
        },
      },
      props: {
        isInitialized: true,
        onError,
        onInitialize: (): Promise<unknown> => Promise.resolve({flowStatus: 'INCOMPLETE', type: 'VIEW'}),
        onSubmit,
      },
      slots: {
        default: ({handleSubmit}: {handleSubmit: typeof submit}) => {
          submit = handleSubmit;
          return [];
        },
      },
    });
    await vi.waitFor(() => {
      expect(submit).toBeDefined();
    });

    onSubmit.mockResolvedValueOnce({
      data: {redirectURL: 'https://idp.example.com/authorize?state=s1'},
      flowStatus: 'INCOMPLETE',
      type: 'REDIRECTION',
    });
    await submit?.({id: 'google'}, {}, true);
    expect(open).toHaveBeenCalledWith('https://idp.example.com/authorize?state=s1', 'oauth_popup', expect.any(String));
    return (): void => wrapper.unmount();
  };

  it('follows a REDIRECTION that the polled callback leads into', async () => {
    await startSocialSignUp();

    // The callback answers with the account-linking re-authentication: a second redirect.
    onSubmit.mockResolvedValueOnce(chainedRedirect);
    land(callbackUrl('c1', 's1'));

    // No user activation is left to open a new popup, so the open one is navigated instead.
    await vi.waitFor(
      () => {
        expect(navigations).toEqual(['https://idp.example.com/authorize?state=s2']);
      },
      {timeout: 3000},
    );
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({inputs: {code: 'c1', state: 's1'}}));
    expect(open).toHaveBeenCalledTimes(1);
    expect(popup.close).not.toHaveBeenCalled();

    // The popup still shows the first callback until the new page responds; it must not be submitted again.
    await new Promise((resolve) => {
      setTimeout(resolve, 1500);
    });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('follows a REDIRECTION that the posted callback leads into', async () => {
    await startSocialSignUp();

    onSubmit.mockResolvedValueOnce(chainedRedirect);
    await postCallback('c1', 's1');

    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({inputs: {code: 'c1', state: 's1'}}));
    expect(navigations).toEqual(['https://idp.example.com/authorize?state=s2']);
    expect(open).toHaveBeenCalledTimes(1);
    expect(popup.close).not.toHaveBeenCalled();
  });

  it.each([
    ['the posted message', 'the poll'],
    ['the poll', 'the posted message'],
  ])('submits a callback once when %s delivers it before %s', async (first: string) => {
    await startSocialSignUp();

    let resolveCallback: (value: unknown) => void = () => undefined;
    onSubmit.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCallback = resolve;
      }),
    );
    // Both deliveries land while the first submit is still in flight.
    let pending: Promise<void> | undefined;
    if (first === 'the poll') {
      land(callbackUrl('c1', 's1'));
      await vi.waitFor(
        () => {
          expect(onSubmit).toHaveBeenCalledTimes(2);
        },
        {timeout: 3000},
      );
      pending = postCallback('c1', 's1');
    } else {
      pending = postCallback('c1', 's1');
      land(callbackUrl('c1', 's1'));
      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });
    }
    resolveCallback(chainedRedirect);
    await pending;

    await vi.waitFor(() => {
      expect(navigations).toEqual(['https://idp.example.com/authorize?state=s2']);
    });
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(popup.close).not.toHaveBeenCalled();
  });

  it('ignores a late message from the previous callback page once the chained redirect starts', async () => {
    await startSocialSignUp();

    onSubmit.mockResolvedValueOnce(chainedRedirect);
    land(callbackUrl('c1', 's1'));
    await vi.waitFor(
      () => {
        expect(navigations).toEqual(['https://idp.example.com/authorize?state=s2']);
      },
      {timeout: 3000},
    );

    // The first callback page boots and posts after the poll already submitted its code.
    await postCallback('c1', 's1');

    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(popup.close).not.toHaveBeenCalled();
  });

  it('exposes the step additionalData to the default slot', async () => {
    const slot: Mock = vi.fn(() => []);
    mount(BaseSignUp, {
      global: {
        provide: {
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
        },
      },
      props: {
        isInitialized: true,
        onInitialize: (): Promise<unknown> =>
          Promise.resolve({
            data: {additionalData: {linkingPromptDetails: '[]'}, components: []},
            executionId: 'exec-1',
            flowStatus: 'INCOMPLETE',
            type: 'VIEW',
          }),
        onSubmit,
      },
      slots: {default: slot},
    });

    await vi.waitFor(() => {
      expect(slot).toHaveBeenLastCalledWith(expect.objectContaining({additionalData: {linkingPromptDetails: '[]'}}));
    });
  });

  it('stops listening for the popup when unmounted', async () => {
    const removeListener: MockInstance<typeof window.removeEventListener> = vi.spyOn(window, 'removeEventListener');
    const unmount: () => void = await startSocialSignUp();
    const handler = addListener.mock.calls.filter(([type]) => type === 'message').pop()?.[1];

    unmount();

    expect(removeListener).toHaveBeenCalledWith('message', handler);
    removeListener.mockRestore();
  });

  it('closes the popup and reports an error when the chained REDIRECTION cannot be followed', async () => {
    const onError: Mock = vi.fn();
    await startSocialSignUp(onError);

    // A REDIRECTION without a redirectURL has nowhere to send the popup.
    onSubmit.mockResolvedValueOnce({flowStatus: 'INCOMPLETE', type: 'REDIRECTION'});
    await postCallback('c1', 's1');

    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(navigations).toEqual([]);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({message: 'errors.signup.popup.failure'}));
  });
});

describe('BaseSignUp error message', () => {
  it('translates a server error message again when the language changes', async () => {
    const translations: Record<string, Record<string, string>> = {
      'en-US': {user_exists: 'The user already exists.'},
      'fr-FR': {user_exists: "L'utilisateur existe déjà."},
    };
    const language: Ref<string> = ref('en-US');
    const slot: Mock<(props: BaseSignUpRenderProps) => never[]> = vi.fn(() => []);

    mount(BaseSignUp, {
      global: {
        provide: {
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {
            currentLanguage: language,
            t: (key: string): string => translations[language.value][key] ?? key,
          },
        },
      },
      props: {
        isInitialized: true,
        onInitialize: (): Promise<unknown> =>
          Promise.resolve({
            error: {code: 'user_exists', message: {defaultValue: 'User exists', key: 'user_exists'}},
            flowStatus: 'INCOMPLETE',
            type: 'VIEW',
          }),
      },
      slots: {default: slot},
    });

    await vi.waitFor(() => {
      expect(slot.mock.lastCall?.[0].messages).toEqual([{message: 'The user already exists.', type: 'error'}]);
    });
    expect(slot.mock.lastCall?.[0].error?.message).toBe('The user already exists.');

    language.value = 'fr-FR';
    await nextTick();

    expect(slot.mock.lastCall?.[0].messages).toEqual([{message: "L'utilisateur existe déjà.", type: 'error'}]);
    expect(slot.mock.lastCall?.[0].error?.message).toBe("L'utilisateur existe déjà.");
  });
});

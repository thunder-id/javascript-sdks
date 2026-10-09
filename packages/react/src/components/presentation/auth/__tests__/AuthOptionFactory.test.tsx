// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {
  ConsentConstants,
  createTheme,
  ConsentDecisions,
  EmbeddedFlowComponent,
  EmbeddedFlowComponentType,
  EmbeddedFlowEventType,
  PagedSelectPage,
} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeContext, {ThemeContextValue} from '../../../../contexts/Theme/ThemeContext';
import {renderInviteUserComponents, renderSignInComponents} from '../AuthOptionFactory';

const richTextWithLink = (label: string, action?: {ref: string; eventType?: string}): EmbeddedFlowComponent => ({
  action,
  id: 'text_1',
  label,
  type: EmbeddedFlowComponentType.RichText,
});

const renderInto = (
  component: EmbeddedFlowComponent,
  onSubmit?: (submitted: EmbeddedFlowComponent, data?: Record<string, string>, skipValidation?: boolean) => void,
): {container: HTMLElement} => {
  const elements = renderSignInComponents(
    [component],
    {empty: '', username: 'alice'},
    {},
    {},
    false,
    true,
    () => undefined,
    () => undefined,
    {onSubmit},
  );
  return render(<div>{elements}</div>);
};

describe('AuthOptionFactory rich-text action', () => {
  it('renders a plain rich-text component without any click handler', () => {
    const onSubmit = vi.fn();
    const {container} = renderInto(
      richTextWithLink('<p>Have an account? <a href="#" data-action-ref="action_signin">Sign in</a></p>'),
      onSubmit,
    );

    const anchor = container.querySelector<HTMLAnchorElement>('a[data-action-ref="action_signin"]')!;
    expect(anchor).not.toBeNull();
    anchor.click();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('dispatches a synthetic action with SUBMIT semantics when the sentinel anchor is clicked', () => {
    const onSubmit = vi.fn();
    const {container} = renderInto(
      richTextWithLink('<p>Have an account? <a href="#" data-action-ref="action_signin">Sign in</a></p>', {
        eventType: EmbeddedFlowEventType.Submit,
        ref: 'action_signin',
      }),
      onSubmit,
    );

    container.querySelector<HTMLAnchorElement>('a[data-action-ref="action_signin"]')!.click();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0] as [EmbeddedFlowComponent, Record<string, string>, boolean];
    expect(call[0].type).toBe(EmbeddedFlowComponentType.Action);
    expect(call[0].ref).toBe('action_signin');
    expect(call[0].eventType).toBe('SUBMIT');
    expect(call[1]).toEqual({empty: '', username: 'alice'});
    expect(call[2]).toBe(false);
  });

  it('bypasses validation when the wired eventType is TRIGGER', () => {
    const onSubmit = vi.fn();
    const {container} = renderInto(
      richTextWithLink('<p><a data-action-ref="action_signup">Sign up</a></p>', {
        eventType: EmbeddedFlowEventType.Trigger,
        ref: 'action_signup',
      }),
      onSubmit,
    );

    container.querySelector<HTMLAnchorElement>('a[data-action-ref="action_signup"]')!.click();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0] as [EmbeddedFlowComponent, Record<string, string>, boolean];
    expect(call[2]).toBe(true);
  });

  it('defaults to SUBMIT semantics when the eventType is omitted', () => {
    const onSubmit = vi.fn();
    const {container} = renderInto(
      richTextWithLink('<p><a data-action-ref="action_signup">Sign up</a></p>', {ref: 'action_signup'}),
      onSubmit,
    );

    container.querySelector<HTMLAnchorElement>('a[data-action-ref="action_signup"]')!.click();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0] as [EmbeddedFlowComponent, Record<string, string>, boolean];
    expect(call[0].eventType).toBe('SUBMIT');
    expect(call[2]).toBe(false);
  });

  it('walks up from a descendant to the nearest anchor before dispatching', () => {
    const onSubmit = vi.fn();
    const {container} = renderInto(
      richTextWithLink('<p><a data-action-ref="action_signup"><span class="child">Sign up</span></a></p>', {
        ref: 'action_signup',
      }),
      onSubmit,
    );

    container.querySelector<HTMLSpanElement>('span.child')!.click();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const call = onSubmit.mock.calls[0] as [EmbeddedFlowComponent, Record<string, string>, boolean];
    expect(call[0].ref).toBe('action_signup');
  });

  it('ignores clicks on anchors whose data-action-ref does not match the wired ref', () => {
    const onSubmit = vi.fn();
    const {container} = renderInto(
      richTextWithLink('<p><a data-action-ref="action_other">Other</a></p>', {ref: 'action_signup'}),
      onSubmit,
    );

    container.querySelector<HTMLAnchorElement>('a[data-action-ref="action_other"]')!.click();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ignores clicks on anchors that lack the data-action-ref sentinel', () => {
    const onSubmit = vi.fn();
    const {container} = renderInto(
      richTextWithLink('<p>Have an account? <a href="#" target="_blank">Sign up</a></p>', {ref: 'action_signup'}),
      onSubmit,
    );

    container.querySelector<HTMLAnchorElement>('a')!.click();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('ignores clicks outside any anchor in an action-bearing rich text', () => {
    const onSubmit = vi.fn();
    const {container} = renderInto(
      richTextWithLink('<p><span class="outside">Not a link</span></p>', {ref: 'action_signup'}),
      onSubmit,
    );

    container.querySelector<HTMLSpanElement>('span.outside')!.click();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not throw when onSubmit is omitted from options', () => {
    const {container} = renderInto(
      richTextWithLink('<p><a data-action-ref="action_signup">Sign up</a></p>', {ref: 'action_signup'}),
    );

    expect(() => container.querySelector<HTMLAnchorElement>('a')!.click()).not.toThrow();
  });
});

describe('AuthOptionFactory stack grid layout', () => {
  const stackWith = (extra: Record<string, unknown>, childCount = 4): EmbeddedFlowComponent =>
    ({
      components: Array.from({length: childCount}, (_, index) => ({
        id: `text_${index}`,
        label: `<p>Option ${index}</p>`,
        type: EmbeddedFlowComponentType.RichText,
      })),
      id: 'stack_1',
      type: EmbeddedFlowComponentType.Stack,
      ...extra,
    }) as EmbeddedFlowComponent;

  const stackElement = (component: EmbeddedFlowComponent): HTMLElement => {
    const {container} = renderInto(component);
    return container.querySelector<HTMLElement>('#stack_1')!;
  };

  /**
   * The stack's layout is applied via a generated Emotion class (not an inline `style`
   * attribute) so it participates in the shared CSP nonce. Reads the *declared* CSSOM rule
   * for that class - as opposed to `getComputedStyle`, which resolves shorthand values like
   * `repeat(2, 1fr)` into browser-computed pixel track lists and is not a useful comparison
   * target here.
   */
  const declaredStyleFor = (element: HTMLElement): CSSStyleDeclaration => {
    const generatedClass = element.className.split(' ').pop()!;

    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule && rule.selectorText === `.${generatedClass}`) {
          return rule.style;
        }
      }
    }

    throw new Error(`No generated stylesheet rule found for class "${generatedClass}"`);
  };

  it('renders a grid with the configured number of columns when items is 2', () => {
    const stack = stackElement(stackWith({items: 2}));

    expect(declaredStyleFor(stack).display).toBe('grid');
    expect(declaredStyleFor(stack).gridTemplateColumns).toBe('repeat(2, 1fr)');
    expect(stack.children).toHaveLength(4);
  });

  it('supports arbitrary column counts provided as a numeric string', () => {
    const stack = stackElement(stackWith({items: '3'}, 5));

    expect(declaredStyleFor(stack).display).toBe('grid');
    expect(declaredStyleFor(stack).gridTemplateColumns).toBe('repeat(3, 1fr)');
    expect(stack.children).toHaveLength(5);
  });

  it('keeps the flex layout when items is absent', () => {
    const stack = stackElement(stackWith({direction: 'column'}));

    expect(declaredStyleFor(stack).display).toBe('flex');
    expect(declaredStyleFor(stack).flexDirection).toBe('column');
  });

  it('keeps the flex layout when items is 1', () => {
    // Stacks authored in the flow builder are seeded with items 1, so a single slot
    // must not promote them to a grid.
    const stack = stackElement(stackWith({items: 1}));

    expect(declaredStyleFor(stack).display).toBe('flex');
  });

  it('falls back to the base axis for the reverse directions', () => {
    expect(declaredStyleFor(stackElement(stackWith({direction: 'column-reverse', items: 2}))).gridAutoFlow).toBe(
      'column',
    );
    expect(declaredStyleFor(stackElement(stackWith({direction: 'row-reverse', items: 2}))).gridAutoFlow).toBe('row');
  });

  it('uses content-sized tracks when justify has to distribute free space', () => {
    const stack = stackElement(stackWith({items: 2, justify: 'space-between'}));

    expect(declaredStyleFor(stack).gridTemplateColumns).toBe('repeat(2, auto)');
    expect(declaredStyleFor(stack).justifyContent).toBe('space-between');
  });

  it('keeps equal tracks when justify is unset', () => {
    expect(declaredStyleFor(stackElement(stackWith({items: 2}))).gridTemplateColumns).toBe('repeat(2, 1fr)');
  });

  it('clamps absurd slot counts', () => {
    const stack = stackElement(stackWith({items: 5000}));

    expect(declaredStyleFor(stack).gridTemplateColumns).toBe('repeat(12, 1fr)');
  });

  it('treats items as the row count when direction is column', () => {
    const stack = stackElement(stackWith({direction: 'column', items: 2}));

    expect(declaredStyleFor(stack).display).toBe('grid');
    expect(declaredStyleFor(stack).gridTemplateRows).toBe('repeat(2, 1fr)');
    expect(declaredStyleFor(stack).gridAutoFlow).toBe('column');
    expect(declaredStyleFor(stack).gridTemplateColumns).toBe('');
  });

  it('falls back to the flex layout when items is not numeric', () => {
    const stack = stackElement(stackWith({items: 'garbage'}));

    expect(declaredStyleFor(stack).display).toBe('flex');
  });

  it('falls back to the flex layout when items is a malformed numeric string', () => {
    const stack = stackElement(stackWith({items: '2invalid'}));

    expect(declaredStyleFor(stack).display).toBe('flex');
  });
});

describe('AuthOptionFactory consent decisions', () => {
  const attributesPurpose = {
    essential: [{name: 'email'}],
    optional: [{name: 'phone'}],
    purposeId: 'p1',
    purposeName: 'attributes:app1',
    type: 'attributes',
  };

  // The server builds permission purposes at request time, so they carry no id and a null essential
  const permissionsPurpose = {
    essential: null,
    optional: [{name: 'system'}],
    purposeId: '',
    purposeName: 'permissions:app1',
    type: 'permissions',
  };

  const themeContextValue: ThemeContextValue = {
    colorScheme: 'light',
    direction: 'ltr',
    theme: createTheme(),
    toggleTheme: vi.fn(),
  };

  const consentAction = (variant: string): EmbeddedFlowComponent =>
    ({
      eventType: EmbeddedFlowEventType.Submit,
      id: `action_${variant}`,
      label: variant,
      type: EmbeddedFlowComponentType.Action,
      variant,
    }) as unknown as EmbeddedFlowComponent;

  const submitConsent = (
    variant: string,
    purposes: unknown[],
    formValues: Record<string, string> = {},
  ): ConsentDecisions => {
    const onSubmit = vi.fn();
    const elements = renderSignInComponents(
      [consentAction(variant)],
      formValues,
      {},
      {},
      false,
      true,
      () => undefined,
      () => undefined,
      {additionalData: {consentPrompt: {purposes}}, onSubmit},
    );
    const {container} = render(
      <ThemeContext.Provider value={themeContextValue}>
        <div>{elements}</div>
      </ThemeContext.Provider>,
    );
    container.querySelector('button')!.click();

    expect(onSubmit).toHaveBeenCalled();
    const submitted = onSubmit.mock.calls[0][1] as Record<string, string>;

    return JSON.parse(submitted['consent_decisions']) as ConsentDecisions;
  };

  it('marks the whole consent approved when the primary action submits', () => {
    const decisions = submitConsent('PRIMARY', [attributesPurpose], {__consent_opt__p1__phone: 'true'});

    expect(decisions.approved).toBe(true);
  });

  it('marks the whole consent denied when a non-primary action submits', () => {
    const decisions = submitConsent('SECONDARY', [attributesPurpose], {__consent_opt__p1__phone: 'true'});

    expect(decisions.approved).toBe(false);
  });

  it('denies every element when the consent is denied as a whole', () => {
    const decisions = submitConsent('SECONDARY', [attributesPurpose], {__consent_opt__p1__phone: 'true'});
    const purpose = decisions.purposes[0];

    expect(purpose.approved).toBe(false);
    expect(purpose.elements.every((e) => !e.approved)).toBe(true);
  });

  it('approves only the optional elements the user turned on', () => {
    const decisions = submitConsent('PRIMARY', [attributesPurpose], {});
    const {elements} = decisions.purposes[0];

    expect(elements.find((e) => e.name === 'email')?.approved).toBe(true);
    expect(elements.find((e) => e.name === 'phone')?.approved).toBe(false);
  });

  it('records a user_denied reason when a non-primary action submits', () => {
    const decisions = submitConsent('SECONDARY', [attributesPurpose]);

    expect(decisions.reason).toBe(ConsentConstants.REASON_USER_DENIED);
  });

  it('omits the reason when the user approves', () => {
    const decisions = submitConsent('PRIMARY', [attributesPurpose]);

    expect(decisions.reason).toBeUndefined();
  });

  it('compiles permission purposes that carry no essential elements', () => {
    const decisions = submitConsent('PRIMARY', [permissionsPurpose], {__consent_opt____system: 'true'});
    const purpose = decisions.purposes[0];

    expect(purpose.purposeName).toBe('permissions:app1');
    expect(purpose.elements).toHaveLength(1);
    expect(purpose.elements[0]).toEqual({approved: true, name: 'system'});
  });
});

describe('AuthOptionFactory USER_SELECT', () => {
  afterEach(() => {
    cleanup();
  });

  const themeContextValue: ThemeContextValue = {
    colorScheme: 'light',
    direction: 'ltr',
    theme: createTheme(),
    toggleTheme: vi.fn(),
  };

  const ownerInput: EmbeddedFlowComponent = {
    id: 'owner_input',
    label: 'Owner',
    placeholder: 'Select an owner',
    ref: 'owner',
    required: false,
    type: EmbeddedFlowComponentType.UserSelect,
  };

  const usersPage: PagedSelectPage = {
    items: [
      {attributes: {username: 'ada'}, display: 'Ada Lovelace', id: 'user-1'},
      {attributes: {username: 'grace'}, display: 'Grace Hopper', id: 'user-2'},
    ],
    nextOffset: null,
    totalResults: 2,
  };

  const renderOwnerInput = ({
    fetchUsers,
    formErrors = {},
    onInputChange = vi.fn(),
    touchedFields = {},
  }: {
    fetchUsers?: ReturnType<typeof vi.fn>;
    formErrors?: Record<string, string>;
    onInputChange?: (name: string, value: string) => void;
    touchedFields?: Record<string, boolean>;
  }): ReturnType<typeof render> => {
    const elements = renderInviteUserComponents(
      [ownerInput],
      {owner: ''},
      touchedFields,
      formErrors,
      false,
      true,
      () => undefined,
      onInputChange,
      {fetchUsers},
    );

    return render(
      <I18nProvider>
        <ThemeContext.Provider value={themeContextValue}>{elements}</ThemeContext.Provider>
      </I18nProvider>,
    );
  };

  it('renders a labelled picker that requests no users until it is opened', () => {
    const fetchUsers = vi.fn();
    renderOwnerInput({fetchUsers});

    expect(screen.getByRole('combobox', {name: /owner/i})).toBeInTheDocument();
    expect(fetchUsers).not.toHaveBeenCalled();
  });

  it("loads the first page from the supplied data source and submits the chosen user's ID under the field ref", async () => {
    const fetchUsers = vi.fn().mockResolvedValue(usersPage);
    const onInputChange = vi.fn();
    renderOwnerInput({fetchUsers, onInputChange});

    fireEvent.click(screen.getByRole('combobox', {name: /owner/i}));
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
    expect(fetchUsers).toHaveBeenCalledTimes(1);
    expect(fetchUsers).toHaveBeenCalledWith(expect.objectContaining({limit: 30, offset: 0}));

    fireEvent.click(screen.getByRole('option', {name: 'Grace Hopper'}));

    expect(onInputChange).toHaveBeenCalledWith('owner', 'user-2');
  });

  it('shows the field error once the field has been touched', () => {
    renderOwnerInput({
      fetchUsers: vi.fn(),
      formErrors: {owner: 'Owner is not valid'},
      touchedFields: {owner: true},
    });

    expect(screen.getByText('Owner is not valid')).toBeInTheDocument();
  });

  it('renders nothing when no data source is supplied', () => {
    const {container} = renderOwnerInput({});

    expect(container.querySelector('[role="combobox"]')).toBeNull();
  });
});

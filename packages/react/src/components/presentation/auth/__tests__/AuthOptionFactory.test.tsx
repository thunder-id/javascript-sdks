/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {render} from '@testing-library/react';
import {EmbeddedFlowComponent, EmbeddedFlowComponentType, EmbeddedFlowEventType} from '@thunderid/browser';
import {describe, expect, it, vi} from 'vitest';
import {renderSignInComponents} from '../AuthOptionFactory';

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
      richTextWithLink('<p>Have an account? <a href="/signin" data-action-ref="action_signin">Sign in</a></p>'),
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
      richTextWithLink('<p>Have an account? <a href="/signin" data-action-ref="action_signin">Sign in</a></p>', {
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
      richTextWithLink('<p>Have an account? <a href="/plain" target="_blank">Sign up</a></p>', {ref: 'action_signup'}),
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

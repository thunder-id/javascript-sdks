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

import {describe, expect, it} from 'vitest';
import {
  EmbeddedFlowComponent,
  EmbeddedFlowComponentAction,
  EmbeddedFlowComponentType,
  EmbeddedFlowEventType,
} from '../embedded-flow';

describe('EmbeddedFlowComponentAction', () => {
  it('accepts a ref-only action (defaults to SUBMIT semantics at the renderer)', () => {
    const action: EmbeddedFlowComponentAction = {ref: 'action_signup'};
    expect(action.ref).toBe('action_signup');
    expect(action.eventType).toBeUndefined();
  });

  it('accepts an explicit TRIGGER eventType', () => {
    const action: EmbeddedFlowComponentAction = {
      eventType: EmbeddedFlowEventType.Trigger,
      ref: 'action_signup',
    };
    expect(action.eventType).toBe('TRIGGER');
  });

  it('accepts a string eventType for forward-compatibility', () => {
    const action: EmbeddedFlowComponentAction = {
      eventType: 'CUSTOM_EVENT',
      ref: 'action_signup',
    };
    expect(action.eventType).toBe('CUSTOM_EVENT');
  });
});

describe('EmbeddedFlowComponent.action', () => {
  it('is optional — a plain rich-text component has no action', () => {
    const component: EmbeddedFlowComponent = {
      id: 'text_1',
      label: '<p>Hello</p>',
      type: EmbeddedFlowComponentType.RichText,
    };
    expect(component.action).toBeUndefined();
  });

  it('can carry an action wiring on a RICH_TEXT component', () => {
    const component: EmbeddedFlowComponent = {
      action: {eventType: EmbeddedFlowEventType.Submit, ref: 'action_signup'},
      id: 'text_1',
      label: '<p>Have an account? <a data-action-ref="action_signup">Sign in</a></p>',
      type: EmbeddedFlowComponentType.RichText,
    };
    expect(component.action?.ref).toBe('action_signup');
    expect(component.action?.eventType).toBe('SUBMIT');
  });
});

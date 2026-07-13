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

import {EmbeddedFlowComponent} from '../embedded-flow';
import {FlowMetadataResponse} from '../flow-meta';

/**
 * Context passed to a custom component renderer. Provides the current form
 * state and callbacks so the renderer can render an interactive control.
 */
export interface ComponentRenderContext {
  additionalData?: Record<string, any>;
  authType: 'signin' | 'signup' | 'recovery';
  formErrors: Record<string, string>;
  formValues: Record<string, string>;
  isFormValid: boolean;
  isLoading: boolean;
  meta?: FlowMetadataResponse | null;
  resetForm?: () => void;
  onInputBlur?: (name: string) => void;
  onInputChange: (name: string, value: string) => void;
  onSubmit?: (component: EmbeddedFlowComponent, data?: Record<string, any>, skipValidation?: boolean) => void;
  touchedFields: Record<string, boolean>;
}

/**
 * A function that renders a custom UI element for a given flow component.
 * Framework-specific packages (e.g. `@thunderid/react`) narrow this type to
 * their own element type (e.g. `ReactElement | null`).
 */
export type ComponentRenderer = (component: EmbeddedFlowComponent, context: ComponentRenderContext) => unknown;

/**
 * A map of component type identifiers to their custom renderer functions.
 */
export type ComponentRendererMap = Record<string, ComponentRenderer>;

/**
 * Extension configuration for customising how SDK flow components are rendered.
 * Pass a `renderers` map to override the default rendering of specific component
 * types with your own UI elements.
 */
export interface ComponentsExtensions {
  renderers?: ComponentRendererMap;
}

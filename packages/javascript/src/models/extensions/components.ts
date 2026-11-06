// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowComponent} from '../embedded-flow';
import {FlowMetadataResponse} from '../flow-meta';

/**
 * Context passed to a custom component renderer. Provides the current form
 * state and callbacks so the renderer can render an interactive control.
 */
export interface ComponentRenderContext {
  additionalData?: Record<string, any>;
  authType: 'signin' | 'signup' | 'recovery' | 'verification';
  /**
   * Marks the current step as expired from the client, e.g. when an OTP countdown a renderer owns
   * runs out. Built-in action buttons stay disabled until the next step response arrives, exactly
   * as when a server `stepTimeout` elapses. Absent where the host component has no step expiry.
   */
  expireStep?: () => void;
  formErrors: Record<string, string>;
  formValues: Record<string, string>;
  isFormValid: boolean;
  isLoading: boolean;
  /** Whether the step has expired, from a server `stepTimeout` or a renderer's `expireStep()`. */
  isTimeoutDisabled?: boolean;
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

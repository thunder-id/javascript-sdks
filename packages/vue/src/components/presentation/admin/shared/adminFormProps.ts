// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Preferences} from '@thunderid/browser';
import type {PropType} from 'vue';

/**
 * Props shared by the presentational admin create forms (`BaseUserCreate`, `BaseGroupCreate`, ...).
 */
export const adminFormProps = {
  /** Extra CSS class added to the root element. */
  className: {default: '', type: String},
  /** Text shown under the title. */
  description: {default: undefined, type: String},
  /** An error message, already translated. */
  error: {default: null, type: String as PropType<string | null>},
  /** Whether a submission is in flight. */
  isSubmitting: {default: false, type: Boolean},
  /** Shows a cancel button that calls it. Also available as `@cancel`. */
  onCancel: {default: undefined, type: Function as PropType<() => void>},
  /** Component-level preferences, for example `i18n.bundles` overrides. */
  preferences: {default: undefined, type: Object as PropType<Preferences>},
  /** Heading of the form. Pass an empty string to hide it. */
  title: {default: undefined, type: String},
} as const;

/**
 * What every admin create form hands its default scoped slot. Each form adds its values and setters.
 */
export interface AdminFormRenderProps {
  error: string | null;
  /** Submits the current values. Does nothing while they are not valid or a submission is in flight. */
  handleSubmit: () => void;
  isSubmitting: boolean;
  /** Whether the values can be submitted. */
  isValid: boolean;
  onCancel?: () => void;
}

/**
 * The resolved values of {@link adminFormProps}.
 */
export type AdminFormProps = Readonly<{
  className: string;
  description: string | undefined;
  error: string | null;
  isSubmitting: boolean;
  onCancel: (() => void) | undefined;
  preferences: Preferences | undefined;
  title: string | undefined;
}>;

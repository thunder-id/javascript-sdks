// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowComponent, FlowMetadataResponse} from '@thunderid/browser';
import {Context, createContext, ReactElement} from 'react';

export interface ComponentRenderContext {
  additionalData?: Record<string, any>;
  authType: 'signin' | 'signup' | 'recovery' | 'verification';
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

export type ComponentRenderer = (
  component: EmbeddedFlowComponent,
  context: ComponentRenderContext,
) => ReactElement | null;

export type ComponentRendererMap = Record<string, ComponentRenderer>;

const ComponentRendererContext: Context<ComponentRendererMap> = createContext<ComponentRendererMap>({});

export default ComponentRendererContext;

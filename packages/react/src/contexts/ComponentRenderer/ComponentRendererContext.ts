// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ComponentRenderContext, EmbeddedFlowComponent} from '@thunderid/browser';
import {Context, createContext, ReactElement} from 'react';

export type {ComponentRenderContext};

export type ComponentRenderer = (
  component: EmbeddedFlowComponent,
  context: ComponentRenderContext,
) => ReactElement | null;

export type ComponentRendererMap = Record<string, ComponentRenderer>;

const ComponentRendererContext: Context<ComponentRendererMap> = createContext<ComponentRendererMap>({});

export default ComponentRendererContext;

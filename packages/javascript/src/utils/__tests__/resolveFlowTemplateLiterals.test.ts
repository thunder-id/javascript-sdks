// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it, vi} from 'vitest';
import {FlowMetadataResponse} from '../../models/flow-meta';
import resolveFlowTemplateLiterals from '../resolveFlowTemplateLiterals';

describe('resolveFlowTemplateLiterals', () => {
  const t = vi.fn((key: string): string => `translated:${key}`);

  it('returns empty string for undefined input', () => {
    expect(resolveFlowTemplateLiterals(undefined, {t})).toBe('');
  });

  it('leaves plain strings unchanged', () => {
    expect(resolveFlowTemplateLiterals('hello world', {t})).toBe('hello world');
  });

  it('resolves a translation literal, converting namespace colon to dot', () => {
    expect(resolveFlowTemplateLiterals('{{ t(signin:heading) }}', {t})).toBe('translated:signin.heading');
  });

  it('resolves a meta literal via dot-path lookup', () => {
    const meta = {application: {name: 'My App'}} as FlowMetadataResponse;
    expect(resolveFlowTemplateLiterals('Login to {{ meta(application.name) }}', {meta, t})).toBe('Login to My App');
  });

  it('leaves unrecognized expressions unchanged', () => {
    expect(resolveFlowTemplateLiterals('{{ unknown(x) }}', {t})).toBe('{{ unknown(x) }}');
  });

  it('resolves a meta value that is itself a translation template (nested resolution)', () => {
    const meta = {application: {name: '{{t(client-001:client.name)}}'}} as FlowMetadataResponse;
    expect(resolveFlowTemplateLiterals('{{ meta(application.name) }}', {meta, t})).toBe(
      'translated:client-001.client.name',
    );
  });

  it('does not treat a meta value with embedded (non-exact) template text as a translation ref', () => {
    // isTranslationFlowTemplateLiteral requires the *entire* value to be the template, so a
    // value that merely contains one is returned as plain text, not translated.
    const meta = {application: {name: 'Say {{t(x:y)}} literally'}} as FlowMetadataResponse;
    expect(resolveFlowTemplateLiterals('{{ meta(application.name) }}', {meta, t})).toBe('Say {{t(x:y)}} literally');
  });
});

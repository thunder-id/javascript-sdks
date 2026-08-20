// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import isTranslationFlowTemplateLiteral, {
  TRANSLATION_FLOW_TEMPLATE_LITERAL_KEY_PATTERN,
} from './isTranslationFlowTemplateLiteral';
import parseFlowTemplateLiteral, {
  FLOW_TEMPLATE_LITERAL_REGEX,
  FlowTemplateLiteralResult,
  FlowTemplateLiteralType,
} from './parseFlowTemplateLiteral';
import resolveMeta from './resolveMeta';
import {TranslationFn} from '../models/translation';
import {ResolveFlowTemplateLiteralsOptions} from '../models/vars';

/**
 * Global version of {@link FLOW_TEMPLATE_LITERAL_REGEX} for use with `String.prototype.replace`.
 */
const FLOW_TEMPLATE_LITERAL_REGEX_GLOBAL = new RegExp(FLOW_TEMPLATE_LITERAL_REGEX.source, 'g');

/**
 * Resolves a `{{ t(key) }}` translation key, converting its colon-separated namespace to dots
 * e.g. "signin:fields.password.label" → "signin.fields.password.label".
 */
function resolveTranslation<TFn extends TranslationFn>(key: string, t: TFn): string {
  return t(key.replace(/:/g, '.'));
}

/**
 * Resolves all flow template literal expressions in a string.
 *
 * Supported patterns:
 *   - `{{ t(key) }}`       — resolved via the i18n translation function.
 *                            Colon-separated namespaces are converted to dots:
 *                            `{{ t(signin:heading.label) }}` → `t('signin.heading.label')`
 *   - `{{ meta(path) }}`   — resolved via a dot-path lookup on FlowMetadataResponse.
 *                            `{{ meta(application.name) }}` → `meta.application?.name`
 *
 * Flow template literals can be embedded inside larger strings:
 *   `"Login using {{ meta(application.name) }}"` → `"Login using My App"`
 *
 * A meta field can itself hold a translation reference instead of final display text — that case is
 * detected and resolved via `t()` too, so the raw template never reaches the screen.
 *
 * Unrecognized expressions are left unchanged.
 *
 * @template TFn - The concrete translation function type.
 *
 * @param text - The string to resolve (may contain zero or more flow template literals)
 * @param options - Resolution context: translation function and optional flow metadata
 * @returns The resolved string
 */
export default function resolveFlowTemplateLiterals<TFn extends TranslationFn = TranslationFn>(
  text: string | undefined,
  {t, meta}: ResolveFlowTemplateLiteralsOptions<TFn>,
): string {
  if (!text) {
    return '';
  }

  return text.replace(FLOW_TEMPLATE_LITERAL_REGEX_GLOBAL, (match: string, content: string): string => {
    const parsed: FlowTemplateLiteralResult = parseFlowTemplateLiteral(content.trim());

    if (parsed.type === FlowTemplateLiteralType.TRANSLATION && parsed.key) {
      return resolveTranslation(parsed.key, t);
    }

    if (parsed.type === FlowTemplateLiteralType.META && parsed.key && meta) {
      const value: string = resolveMeta(parsed.key, meta);

      if (isTranslationFlowTemplateLiteral(value)) {
        const innerKey: string = value.trim().match(TRANSLATION_FLOW_TEMPLATE_LITERAL_KEY_PATTERN)![1];
        return resolveTranslation(innerKey, t);
      }

      return value;
    }

    return match;
  });
}

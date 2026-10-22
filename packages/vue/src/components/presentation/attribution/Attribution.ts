// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type Preferences,
  ThunderIDWordmark as WORDMARK,
  type ThunderIDWordmarkPath,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {type Component, type PropType, type VNode, defineComponent, h} from 'vue';
import useAdminTranslation, {type AdminTranslate} from '../admin/shared/useAdminTranslation';

const cls = (suffix: string): string => withVendorCSSClassPrefix(`attribution${suffix}`);

const wordmark = (className: string): VNode =>
  h(
    'svg',
    {
      'aria-label': 'ThunderID',
      class: className,
      fill: 'none',
      role: 'img',
      viewBox: WORDMARK.viewBox,
      xmlns: 'http://www.w3.org/2000/svg',
    },
    WORDMARK.paths.map(({accent, d}: ThunderIDWordmarkPath) =>
      h('path', {d, fill: accent ? WORDMARK.accentColor : 'currentColor'}),
    ),
  );

/**
 * A small "Secured by ThunderID" credit: a line of text for the footer of an app, or a ribbon on the
 * edge of a sign-in card (the card must be `position: relative`). The inline credit follows the
 * theme's text colors, so it reads on light and dark surfaces.
 *
 * @example
 * ```vue
 * <Attribution />
 * <Attribution appearance="ribbon" variant="powered" />
 * ```
 */
const Attribution: Component = defineComponent({
  name: 'Attribution',
  props: {
    appearance: {default: 'inline', type: String as PropType<'inline' | 'ribbon'>},
    href: {default: undefined, type: String},
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    variant: {default: 'secured', type: String as PropType<'powered' | 'secured'>},
  },
  setup(props) {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);

    return (): VNode => {
      const isRibbon: boolean = props.appearance === 'ribbon';
      const label: string = t(props.variant === 'powered' ? 'attribution.powered_by' : 'attribution.secured_by');
      const className: string[] = [cls(''), ...(isRibbon ? [cls('--ribbon')] : [])];
      const content: VNode | VNode[] = isRibbon
        ? h('span', {class: cls('__ribbon-content')}, [
            h('span', {class: cls('__ribbon-label')}, label),
            wordmark(cls('__ribbon-wordmark')),
          ])
        : [h('span', {class: cls('__label')}, label), wordmark(cls('__wordmark'))];

      if (props.href) {
        return h('a', {class: className, href: props.href, rel: 'noopener noreferrer', target: '_blank'}, content);
      }

      return h('span', {class: className}, content);
    };
  },
});

export default Attribution;

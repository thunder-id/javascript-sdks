// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type Ref, type VNode, defineComponent, h, onMounted, ref} from 'vue';
import type {FlowExpiryRedirect} from '../../../composables/auth/useFlowExpiryRedirect';
import useFlowMeta from '../../../composables/useFlowMeta';
import useI18n from '../../../composables/useI18n';
import Button from '../../primitives/Button';
import Typography from '../../primitives/Typography';

// Stands in for the application name in the link text, to find where the name goes.
const APPLICATION_MARKER = '\u0000';

const TimerIcon = (): VNode =>
  h(
    'svg',
    {
      fill: 'none',
      height: '44',
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'stroke-width': '1.6',
      viewBox: '0 0 24 24',
      width: '44',
      xmlns: 'http://www.w3.org/2000/svg',
    },
    [
      h('line', {x1: '10', x2: '14', y1: '2', y2: '2'}),
      h('line', {x1: '12', x2: '15', y1: '14', y2: '11'}),
      h('circle', {cx: '12', cy: '14', r: '8'}),
    ],
  );

export interface FlowExpiredProps {
  /** Starts the flow again. Offered when there is no redirect. */
  onRestart?: () => void;
  /** The countdown that sends the user back to the application. Takes the place of starting again. */
  redirect?: FlowExpiryRedirect | null;
}

/**
 * Shown in place of a sign-in or sign-up flow whose execution expired. The flow cannot continue, so it counts
 * down to the application, offers to start again, or tells the user to go back to the application.
 */
const FlowExpired: Component = defineComponent({
  name: 'FlowExpired',
  props: {
    onRestart: {default: undefined, type: Function as PropType<() => void>},
    redirect: {default: null, type: Object as PropType<FlowExpiryRedirect | null>},
  },
  setup(props: Readonly<FlowExpiredProps>): () => VNode {
    const {meta} = useFlowMeta();
    const {t} = useI18n();
    const rootRef: Ref<HTMLElement | null> = ref(null);

    // The expired state replaces the flow in place, so move focus to it for a screen reader to read it.
    onMounted(() => {
      rootRef.value?.focus();
    });

    return (): VNode => {
      const {redirect, onRestart} = props;
      const name: string | undefined = meta.value?.application?.name;
      const application: string = name !== undefined && name !== '' ? name : t('flow.expired.application');

      const renderAction = (): VNode | null => {
        if (redirect) {
          // Splits the text around the name, so a long name shortens and the rest of the text stays.
          const [before = '', after = ''] = t(
            redirect.isCountingDown ? 'flow.expired.redirect.now' : 'flow.expired.redirect.link',
            {application: APPLICATION_MARKER},
          ).split(APPLICATION_MARKER);

          return h('a', {class: withVendorCSSClassPrefix('flow-expired__link'), href: redirect.url}, [
            before,
            h('span', {class: withVendorCSSClassPrefix('flow-expired__name')}, application),
            after,
          ]);
        }
        if (onRestart) {
          return h(
            Button,
            {class: withVendorCSSClassPrefix('flow-expired__action'), onClick: onRestart, variant: 'outline'},
            () => t('flow.expired.restart'),
          );
        }

        return null;
      };

      const description = (): string => {
        // The countdown shows only while it runs, not while it waits for the user.
        if (redirect?.isCountingDown) {
          return t('flow.expired.redirecting', {application, seconds: redirect.secondsLeft});
        }
        if (!redirect && onRestart) {
          return t('flow.expired.restart.description');
        }

        return t('flow.expired.return.description', {application});
      };

      return h('div', {class: withVendorCSSClassPrefix('flow-expired'), ref: rootRef, tabindex: -1}, [
        h('span', {'aria-hidden': 'true', class: withVendorCSSClassPrefix('flow-expired__icon')}, [TimerIcon()]),
        h(Typography, {component: 'h1', variant: 'h5'}, () => t('flow.expired.heading')),
        h(Typography, {variant: 'body1'}, () => description()),
        renderAction(),
      ]);
    };
  },
});

export default FlowExpired;

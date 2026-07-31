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

import {cx} from '@emotion/css';
import {
  ATTRIBUTION_BLOCK,
  ATTRIBUTION_CONTENT_CLASS,
  ATTRIBUTION_LABEL_CLASS,
  ATTRIBUTION_LOGO_CLASS,
  ATTRIBUTION_LOGO_SVG_MARKUP,
  buildAttributionCss,
} from '@thunderid/browser';
import {FC, ReactElement, useMemo} from 'react';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';

export interface AttributionProps {
  /**
   * Custom CSS class name for the attribution badge container.
   */
  className?: string;
}

/**
 * The "Powered by ThunderID" attribution badge.
 *
 * Renders as a vertical tab attached to the trailing edge of the nearest positioned
 * ancestor (the host must set `position: relative` and allow horizontal overflow, since
 * the badge is drawn outside its own box). This is a fixed brand mark shared across every
 * ThunderID framework SDK via `@thunderid/browser` — see `buildAttributionCss` — so it
 * always renders in ThunderID's own colors, and the official ThunderID logo mark, rather
 * than the host theme or plain text.
 *
 * Shown by default on pre-login surfaces (sign in, sign up, account recovery). Consumers
 * can hide it globally via `ThunderIDProvider`'s `showAttribution` config option, or
 * per-component via that same component's `showAttribution` prop.
 */
const Attribution: FC<AttributionProps> = ({className = ''}: AttributionProps): ReactElement => {
  const {theme} = useTheme();
  const {t} = useTranslation();

  const css: string = useMemo(
    () => buildAttributionCss(theme.vars.colors.border, theme.vars.shadows.medium),
    [theme.vars.colors.border, theme.vars.shadows.medium],
  );

  return (
    <>
      <style>{css}</style>
      <div className={cx(ATTRIBUTION_BLOCK, className)} data-testid="thunderid-attribution">
        <div className={ATTRIBUTION_CONTENT_CLASS}>
          <span className={ATTRIBUTION_LABEL_CLASS}>{t('elements.display.attribution.powered_by')}</span>
          <span
            className={ATTRIBUTION_LOGO_CLASS}
            role="img"
            aria-label="ThunderID"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{__html: ATTRIBUTION_LOGO_SVG_MARKUP}}
          />
        </div>
      </div>
    </>
  );
};

export default Attribution;

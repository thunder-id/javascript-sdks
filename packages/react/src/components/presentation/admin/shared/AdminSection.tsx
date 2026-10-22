// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useStyles from './AdminSection.styles';
import ComponentPreferencesContext from '../../../../contexts/I18n/ComponentPreferencesContext';
import useTheme from '../../../../contexts/Theme/useTheme';
import {cx} from '../../../../styles/emotion';

export interface AdminSectionProps {
  /**
   * Controls rendered next to the title, such as a create button.
   */
  actions?: ReactNode;
  /**
   * BEM block name of the component that renders the section, used for its CSS class.
   */
  block: string;
  children?: ReactNode;
  className?: string;
  description?: string;
  /**
   * Heading level of the title.
   * @default 2
   */
  headingLevel?: 2 | 3 | 4;
  /**
   * Component-level preferences, applied to this section and everything rendered inside it.
   */
  preferences?: Preferences;
  title?: string;
}

/**
 * Frames an admin component with a title, a description and actions.
 */
const AdminSection: FC<AdminSectionProps> = ({
  actions,
  block,
  children,
  className,
  description,
  headingLevel = 2,
  preferences,
  title,
}: AdminSectionProps): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const Heading: `h${typeof headingLevel}` = `h${headingLevel}`;

  const content: ReactElement = (
    <section className={cx(withVendorCSSClassPrefix(bem(block)), styles['root'], className)}>
      {(Boolean(title) || Boolean(actions)) && (
        <div className={cx(withVendorCSSClassPrefix(bem(block, 'header')), styles['header'])}>
          <div>
            {title && <Heading className={styles['title']}>{title}</Heading>}
            {description && <p className={styles['description']}>{description}</p>}
          </div>
          {actions && <div className={styles['actions']}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );

  return preferences ? (
    <ComponentPreferencesContext.Provider value={preferences}>{content}</ComponentPreferencesContext.Provider>
  ) : (
    content
  );
};

export default AdminSection;

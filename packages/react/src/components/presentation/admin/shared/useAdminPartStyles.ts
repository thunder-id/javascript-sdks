// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import useStyles from './AdminParts.styles';
import useTheme from '../../../../contexts/Theme/useTheme';

/**
 * Returns the shared admin part styles for the active theme.
 *
 * @returns The CSS class names of the admin parts.
 */
const useAdminPartStyles = (): Record<string, string> => {
  const {theme, colorScheme} = useTheme();

  return useStyles(theme, colorScheme);
};

export default useAdminPartStyles;

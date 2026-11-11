// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type ConsentPermissionBranch,
  type ConsentPermissionBranchItem,
  type ConsentPurposeData,
  bem,
  getConsentPermissionBranches,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {type ChangeEvent, FC, ReactNode} from 'react';
import {getConsentOptionalKey} from './ConsentCheckboxList';
import useStyles from './ConsentCheckboxList.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import {UseTranslation} from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import Toggle from '../../primitives/Toggle/Toggle';
import Typography from '../../primitives/Typography/Typography';

/**
 * Render props exposed by ConsentPermissionBranchList when using the render-prop pattern.
 */
export interface ConsentPermissionBranchListRenderProps {
  /** One branch per top-level permission, with the permissions its approval covers. */
  branches: ConsentPermissionBranch[];
  /** Approves or declines a branch, setting the decision of every permission it covers. */
  handleChange: (branch: ConsentPermissionBranch, checked: boolean) => void;
  /** Whether a branch is approved. */
  isChecked: (branch: ConsentPermissionBranch) => boolean;
  /** The translated notice that an approval also covers permissions added beneath it later. */
  notice: string;
}

/**
 * Props for the ConsentPermissionBranchList component.
 */
export interface ConsentPermissionBranchListProps {
  /** Render-props callback. When provided, it replaces the built-in branch list. */
  children?: (props: ConsentPermissionBranchListRenderProps) => ReactNode;
  /** Current form values, used to read each branch's decision. */
  formValues: Record<string, string>;
  /** Callback invoked with each decision a branch switch sets. */
  onInputChange: (name: string, value: string) => void;
  /** A permission purpose carrying `permissionDelimiter`. */
  purpose: ConsentPurposeData;
  /** translation data */
  t?: UseTranslation['t'];
}

/**
 * Renders a hierarchical permission purpose: one switch per top-level permission, with the permissions its
 * approval covers listed read-only beneath it. Renders nothing for a purpose without `permissionDelimiter`.
 */
const ConsentPermissionBranchList: FC<ConsentPermissionBranchListProps> = ({
  purpose,
  formValues,
  onInputChange,
  children = undefined,
  t = undefined,
}: ConsentPermissionBranchListProps) => {
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);

  const resolve = (key: string, fallback: string): string => {
    const translated: string | undefined = t?.(key);
    return translated && translated !== key ? translated : fallback;
  };

  const branches: ConsentPermissionBranch[] = getConsentPermissionBranches(purpose);

  if (branches.length === 0) {
    return null;
  }

  const notice: string = resolve(
    'consent.permissions.subtree_notice',
    'Approving a permission also approves the permissions beneath it, including any added later.',
  );

  const isChecked = (branch: ConsentPermissionBranch): boolean =>
    formValues[getConsentOptionalKey(purpose.purposeId, branch.name)] === 'true';

  const handleChange = (branch: ConsentPermissionBranch, checked: boolean): void => {
    branch.decisions.forEach((name: string) => {
      onInputChange(getConsentOptionalKey(purpose.purposeId, name), checked ? 'true' : 'false');
    });
  };

  if (children) {
    return <>{children({branches, handleChange, isChecked, notice})}</>;
  }

  const label = (name: string): string => resolve(`consent.${name}`, name);

  return (
    <div className={cx(withVendorCSSClassPrefix(bem('consent-permission-branch-list')), styles['listContainer'])}>
      {branches.map((branch: ConsentPermissionBranch) => (
        <div
          key={branch.name}
          className={cx(withVendorCSSClassPrefix(bem('consent-permission-branch-list', 'item')), styles['listItem'])}
        >
          <div
            className={cx(withVendorCSSClassPrefix(bem('consent-permission-branch-list', 'row')), styles['listRow'])}
          >
            <div className={styles['labelContainer']}>
              <div className={styles['bullet']} />
              <Typography variant="body2" className={styles['typography']}>
                {label(branch.name)}
              </Typography>
            </div>
            <Toggle
              id={`consent_opt_${purpose.purposeId}_${branch.name}`}
              checked={isChecked(branch)}
              aria-label={label(branch.name)}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => handleChange(branch, e.target.checked)}
            />
          </div>
          {branch.descendants.map((item: ConsentPermissionBranchItem) => (
            <div
              key={item.name}
              className={withVendorCSSClassPrefix(bem('consent-permission-branch-list', 'descendant'))}
              style={{paddingLeft: `${item.depth}rem`}}
            >
              <Typography variant="body2" className={styles['typography']}>
                {label(item.name)}
              </Typography>
            </div>
          ))}
        </div>
      ))}
      <Typography
        variant="caption"
        className={cx(withVendorCSSClassPrefix(bem('consent-permission-branch-list', 'notice')), styles['typography'])}
      >
        {notice}
      </Typography>
    </div>
  );
};

export default ConsentPermissionBranchList;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {KeyValuePair} from '@thunderid/browser';
import {FC, Fragment, ReactElement, useId} from 'react';
import useStyles from './KeyValueList.styles';
import useTheme from '../../../contexts/Theme/useTheme';

export interface KeyValueListProps {
  /**
   * Optional label displayed above the list.
   */
  label?: string;
  /**
   * The label and value pairs to display, in order.
   */
  pairs: KeyValuePair[];
}

/**
 * A React component that displays label and value pairs as a two-column description list, with an optional
 * label above it.
 */
const KeyValueList: FC<KeyValueListProps> = ({label = undefined, pairs}: KeyValueListProps): ReactElement => {
  const {theme} = useTheme();
  const styles: Record<string, string> = useStyles(theme);
  const labelId: string = useId();

  return (
    <div className={styles['container']}>
      {label && (
        <span id={labelId} className={styles['label']}>
          {label}
        </span>
      )}
      <dl className={styles['list']} aria-labelledby={label ? labelId : undefined}>
        {pairs.map((pair: KeyValuePair, index: number) => (
          // Pairs are positional and carry no id, so the index is the only stable key available.
          // eslint-disable-next-line react/no-array-index-key
          <Fragment key={`${pair.label}-${index}`}>
            <dt className={styles['pairLabel']}>{pair.label}</dt>
            <dd className={styles['pairValue']}>{pair.value}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
};

export default KeyValueList;

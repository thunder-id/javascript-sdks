// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDWordmark as WORDMARK, type ThunderIDWordmarkPath} from '@thunderid/browser';
import type {FC, ReactElement, SVGProps} from 'react';

/**
 * The ThunderID wordmark, sized by its height. The mark keeps its brand blue; the lettering follows
 * the surrounding text color, so it reads on light and dark surfaces alike.
 */
const ThunderIDWordmark: FC<SVGProps<SVGSVGElement>> = (props: SVGProps<SVGSVGElement>): ReactElement => (
  <svg viewBox={WORDMARK.viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    {WORDMARK.paths.map(({accent, d}: ThunderIDWordmarkPath) => (
      <path key={d.slice(0, 24)} d={d} fill={accent ? WORDMARK.accentColor : 'currentColor'} />
    ))}
  </svg>
);

export default ThunderIDWordmark;

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
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import {render, screen, cleanup} from '@testing-library/react';
import {createTheme, ANONYMOUS_ANIMAL_ICONS} from '@thunderid/browser';
import {ReactElement} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ThemeContext, {ThemeContextValue} from '../../../../contexts/Theme/ThemeContext';
import {Avatar} from '../Avatar';

const themeContextValue: ThemeContextValue = {
  colorScheme: 'light',
  direction: 'ltr',
  theme: createTheme(),
  toggleTheme: vi.fn(),
};

const withTheme = (ui: ReactElement): ReactElement => (
  <ThemeContext.Provider value={themeContextValue}>{ui}</ThemeContext.Provider>
);

describe('Avatar', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a plain image URL as-is', () => {
    render(withTheme(<Avatar imageUrl="https://example.com/logo.png" alt="Acme" />));
    const img: HTMLElement = screen.getByAltText('Acme');
    expect(img).toHaveAttribute('src', 'https://example.com/logo.png');
  });

  it('renders an emoji: spec as its glyph, not an image', () => {
    const {container} = render(withTheme(<Avatar imageUrl="emoji:🐼" alt="Panda" />));
    expect(screen.getByText('🐼')).toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('renders an anonymous_animal avatar: spec using the bundled icon markup', () => {
    const [name] = Object.keys(ANONYMOUS_ANIMAL_ICONS);
    render(
      withTheme(<Avatar imageUrl={`avatar:shape=rounded,variant=anonymous_animal,content=${name}`} alt="Anonymous" />),
    );
    const img: HTMLElement = screen.getByAltText('Anonymous');
    expect(decodeURIComponent(img.getAttribute('src') ?? '')).toContain(ANONYMOUS_ANIMAL_ICONS[name].color);
  });

  it('falls back to initials when only a name is provided', () => {
    render(withTheme(<Avatar name="Ada Lovelace" />));
    expect(screen.getByText('AL')).toBeInTheDocument();
  });

  it('renders the default icon when neither imageUrl nor name is provided', () => {
    const {container} = render(withTheme(<Avatar />));
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

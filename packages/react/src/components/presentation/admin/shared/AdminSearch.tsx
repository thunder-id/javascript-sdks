// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {SelectOption} from '@thunderid/browser';
import {ChangeEvent, FormEvent, ReactElement, useState} from 'react';
import useAdminPartStyles from './useAdminPartStyles';
import useTranslation from '../../../../hooks/useTranslation';
import Button from '../../../primitives/Button/Button';
import Select from '../../../primitives/Select/Select';
import TextField from '../../../primitives/TextField/TextField';

/**
 * A search an admin list applies on the server: the attribute to match and the value it must equal.
 */
export interface AdminSearchValue {
  attribute: string;
  value: string;
}

export interface AdminSearchProps {
  /**
   * The attributes that can be searched, with translated labels. The attribute select is hidden when
   * there is only one.
   */
  attributes: SelectOption[];
  /**
   * Called with the search to apply when the form is submitted, or `null` when it is cleared.
   */
  onSearch: (search: AdminSearchValue | null) => void;
  /**
   * The search currently applied.
   */
  search?: AdminSearchValue | null;
}

/**
 * Searches an admin list by one attribute. The server matches the whole value, so the search runs when
 * submitted rather than on every keystroke.
 */
const AdminSearch = ({attributes, onSearch, search = null}: AdminSearchProps): ReactElement => {
  const styles: Record<string, string> = useAdminPartStyles();
  const {t} = useTranslation();
  const [attribute, setAttribute] = useState<string>(search?.attribute ?? attributes[0]?.value ?? '');
  const [value, setValue] = useState<string>(search?.value ?? '');
  const label: string = attributes.find((option: SelectOption) => option.value === attribute)?.label ?? attribute;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSearch(value.trim() ? {attribute, value: value.trim()} : null);
  };

  return (
    <form className={styles['row']} onSubmit={handleSubmit} role="search" style={{alignItems: 'flex-end'}}>
      {attributes.length > 1 && (
        <Select
          label={t('admin.common.search.attribute')}
          name="searchAttribute"
          value={attribute}
          options={attributes}
          onChange={(event: ChangeEvent<HTMLSelectElement>): void => setAttribute(event.target.value)}
        />
      )}
      <TextField
        name="search"
        type="search"
        label={attributes.length > 1 ? undefined : label}
        aria-label={label}
        placeholder={t('admin.common.search.placeholder', {attribute: label.toLowerCase()})}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>): void => setValue(event.target.value)}
      />
      <Button type="submit" variant="outline">
        {t('admin.common.search.submit')}
      </Button>
      {search && (
        <Button
          type="button"
          variant="text"
          onClick={(): void => {
            setValue('');
            onSearch(null);
          }}
        >
          {t('admin.common.search.clear')}
        </Button>
      )}
    </form>
  );
};

export default AdminSearch;

// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {SelectOption} from '@thunderid/browser';
import {ChangeEvent, FormEvent, ReactElement, useState} from 'react';
import useAdminPartStyles from './useAdminPartStyles';
import useTranslation from '../../../../hooks/useTranslation';
import Button from '../../../primitives/Button/Button';
import Select from '../../../primitives/Select/Select';

/**
 * An identity that can be picked, such as a user, agent or group.
 */
export interface IdentityCandidate {
  id: string;
  label: string;
}

export interface IdentityPickerProps<TType extends string> {
  /**
   * Label of the add button, already translated.
   */
  addLabel: string;
  /**
   * The identities to choose from, keyed by identity type.
   */
  candidates: Partial<Record<TType, IdentityCandidate[]>>;
  /**
   * Identifiers to leave out, such as current members.
   */
  excludedIds?: string[];
  isSubmitting?: boolean;
  onAdd: (identity: {id: string; type: TType}) => void;
  /**
   * The identity types to choose from, with translated labels.
   */
  types: {label: string; value: TType}[];
}

/**
 * Picks one identity of a chosen type and adds it, for example as a group member or a role assignee.
 */
const IdentityPicker = <TType extends string>({
  addLabel,
  candidates,
  excludedIds = [],
  isSubmitting = false,
  onAdd,
  types,
}: IdentityPickerProps<TType>): ReactElement => {
  const styles: Record<string, string> = useAdminPartStyles();
  const {t} = useTranslation();
  const [type, setType] = useState<TType>(types[0]?.value);
  const [identityId, setIdentityId] = useState<string>('');

  const options: SelectOption[] = (candidates[type] ?? [])
    .filter((candidate: IdentityCandidate) => !excludedIds.includes(candidate.id))
    .map((candidate: IdentityCandidate) => ({label: candidate.label, value: candidate.id}));

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (identityId) {
      onAdd({id: identityId, type});
      setIdentityId('');
    }
  };

  return (
    <form className={styles['row']} onSubmit={handleSubmit} style={{alignItems: 'flex-end'}}>
      <Select
        label={t('admin.common.fields.identity_type')}
        name="identityType"
        value={type}
        options={types}
        onChange={(event: ChangeEvent<HTMLSelectElement>): void => {
          setType(event.target.value as TType);
          setIdentityId('');
        }}
      />
      <Select
        label={t('admin.common.fields.identity')}
        name="identity"
        value={identityId}
        placeholder={t('admin.common.fields.identity_placeholder')}
        emptyText={t('admin.common.fields.identity_empty')}
        options={options}
        onChange={(event: ChangeEvent<HTMLSelectElement>): void => setIdentityId(event.target.value)}
      />
      <Button type="submit" loading={isSubmitting} disabled={!identityId || isSubmitting}>
        {addLabel}
      </Button>
    </form>
  );
};

export default IdentityPicker;

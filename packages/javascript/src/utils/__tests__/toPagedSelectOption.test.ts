// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import toPagedSelectOption from '../toPagedSelectOption';

describe('toPagedSelectOption', () => {
  describe('plain text', () => {
    it('is used for both label and value', () => {
      expect(toPagedSelectOption('alice@example.com')).toEqual({
        label: 'alice@example.com',
        value: 'alice@example.com',
      });
      expect(toPagedSelectOption(7)).toEqual({label: '7', value: '7'});
    });

    it('is dropped when blank', () => {
      expect(toPagedSelectOption('   ')).toBeNull();
    });
  });

  describe('objects with a configured mapping', () => {
    const item = {email: 'a@example.com', fullName: 'Alice Example', id: 'u1'};

    it('uses the configured label and value fields', () => {
      expect(toPagedSelectOption(item, {labelAttributes: ['fullName'], valueAttribute: 'email'})).toEqual({
        label: 'Alice Example',
        value: 'a@example.com',
      });
    });

    it('resolves nested paths, on the item or inside its attributes', () => {
      const nested = {attributes: {name: {given: 'Alice'}}, id: 'u1'};

      expect(toPagedSelectOption(nested, {labelAttributes: ['name.given']})?.label).toBe('Alice');
    });

    it('tries label fields in order and falls back to the value', () => {
      expect(toPagedSelectOption(item, {labelAttributes: ['missing', 'email']})?.label).toBe('a@example.com');
      expect(toPagedSelectOption(item, {labelAttributes: ['missing']})?.label).toBe('u1');
    });

    it('prefers getLabel and getValue, falling through when they return nothing', () => {
      expect(toPagedSelectOption(item, {getLabel: () => 'Custom', getValue: () => 'custom-value'})).toEqual({
        label: 'Custom',
        value: 'custom-value',
      });
      expect(toPagedSelectOption(item, {getLabel: () => '', getValue: () => undefined})).toEqual({
        label: 'u1',
        value: 'u1',
      });
    });

    it('types the callbacks to the consumer’s item shape', () => {
      interface Member {
        fullName: string;
        handle: string;
      }
      const member: Member = {fullName: 'Alice Example', handle: 'alice'};

      expect(toPagedSelectOption<Member>(member, {getLabel: (m) => m.fullName, getValue: (m) => m.handle})).toEqual({
        label: 'Alice Example',
        value: 'alice',
      });
    });

    it('drops an item with nothing at the configured value field, with no silent fallback', () => {
      expect(toPagedSelectOption({id: 'u1'}, {valueAttribute: 'email'})).toBeNull();
    });

    it('follows the shape rules for the label when only the value is configured', () => {
      expect(toPagedSelectOption({code: 'X1', name: 'Alice'}, {valueAttribute: 'code'})).toEqual({
        label: 'X1',
        value: 'X1',
      });
    });
  });

  describe('objects with no mapping', () => {
    it('uses an {label, value} object as is', () => {
      expect(toPagedSelectOption({label: 'Alice', value: 'a1'})).toEqual({label: 'Alice', value: 'a1'});
    });

    it('submits the id of an object that has one, labelling it from the default fields', () => {
      expect(toPagedSelectOption({id: 'u1', name: 'Alice'})).toEqual({label: 'Alice', value: 'u1'});
      expect(toPagedSelectOption({id: 'u1'})).toEqual({label: 'u1', value: 'u1'});
    });

    it('labels an object with an id from the defaults passed in', () => {
      const item = {attributes: {email: 'a@example.com'}, id: 'u1'};

      expect(toPagedSelectOption(item, undefined, {labelAttributes: ['email']})).toEqual({
        label: 'a@example.com',
        value: 'u1',
      });
    });

    it('skips a label candidate that merely repeats the id', () => {
      const item = {display: 'u1', id: 'u1', username: 'alice'};

      expect(toPagedSelectOption(item, undefined, {labelAttributes: ['display', 'username']})?.label).toBe('alice');
    });

    it('uses the first text field for both label and value otherwise', () => {
      expect(toPagedSelectOption({name: 'Alice', email: 'a@example.com'})).toEqual({label: 'Alice', value: 'Alice'});
      expect(toPagedSelectOption({active: true, meta: {x: 1}, city: 'Colombo', zip: 10100})).toEqual({
        label: 'Colombo',
        value: 'Colombo',
      });
    });

    it('drops an object with no text fields', () => {
      expect(toPagedSelectOption({active: true, meta: {x: 1}})).toBeNull();
    });
  });

  it('ignores values that are not text, numbers, or objects', () => {
    expect(toPagedSelectOption(null)).toBeNull();
    expect(toPagedSelectOption(undefined)).toBeNull();
    expect(toPagedSelectOption(true)).toBeNull();
  });
});

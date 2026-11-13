// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import AttributeVerificationConstants from '../constants/AttributeVerificationConstants';
import {EntityTypeSchema} from '../models/entity-type';
import {ManagedUser} from '../models/managed-user';

const hasReportedStatus = (user: ManagedUser | null | undefined, attribute: string): boolean => {
  const value: unknown = user?.attributes?.[attribute];
  const verified: unknown = user?.verifiedAttributes;

  return (
    typeof value === 'string' &&
    value.trim() !== '' &&
    !!verified &&
    typeof verified === 'object' &&
    !Array.isArray(verified)
  );
};

const getContactType = (schema: EntityTypeSchema, attribute: string): 'email' | 'mobile' | undefined => {
  if (!Object.prototype.hasOwnProperty.call(schema, attribute)) {
    return undefined;
  }
  const field = schema[attribute];
  return (field?.type === 'email' || field?.type === 'mobile') && !field.credential ? field.type : undefined;
};

/**
 * Whether the administrator view knows the verification status of a stored contact.
 * A recorded verification remains visible when the schema cannot be read.
 *
 * @internal Shared by the SDK packages. It is not part of the public API and can change in any release.
 */
export const hasAdminVerificationStatus = (
  user: ManagedUser | null | undefined,
  attribute: string,
  schema?: EntityTypeSchema,
): boolean =>
  hasReportedStatus(user, attribute) &&
  (Object.prototype.hasOwnProperty.call(user?.verifiedAttributes, attribute) ||
    (schema
      ? getContactType(schema, attribute) !== undefined
      : AttributeVerificationConstants.ADMIN_VERIFIABLE_ATTRIBUTES.includes(attribute)));

/**
 * Whether the stored attribute can be verified through the shipped administrator email flow.
 * With a schema, the property must be a top-level email. Without one, the base view recognizes
 * the default email field for applications that supply their own send callback.
 *
 * @param user - The user, as read from `GET /users/{id}`.
 * @param attribute - The concrete attribute name, such as `workEmail`.
 * @param schema - The user's type schema.
 * @returns Whether the administrator email flow supports the attribute.
 */
const isAdminVerifiableAttribute = (
  user: ManagedUser | null | undefined,
  attribute: string,
  schema?: EntityTypeSchema,
): boolean =>
  hasReportedStatus(user, attribute) &&
  (schema
    ? getContactType(schema, attribute) === 'email'
    : AttributeVerificationConstants.ADMIN_VERIFIABLE_ATTRIBUTES.includes(attribute));

export default isAdminVerifiableAttribute;

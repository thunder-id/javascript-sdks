// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  User,
  withVendorCSSClassPrefix,
  bem,
  Preferences,
  startCase,
  AttributeSchema,
  AttributeVerificationConstants,
  VerifiedAttribute,
  getVerifiedAttributes,
  isVerifiableAttribute,
} from '@thunderid/browser';
import {FC, ReactElement, ReactNode, useState, useCallback, useEffect, useMemo} from 'react';
import useStyles from './BaseUserProfile.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import getDisplayName from '../../../utils/getDisplayName';
import getMappedUserProfileValue from '../../../utils/getMappedUserProfileValue';
import AlertPrimitive from '../../primitives/Alert/Alert';
import {Avatar} from '../../primitives/Avatar/Avatar';
import Button from '../../primitives/Button/Button';
import CardPrimitive from '../../primitives/Card/Card';
import Checkbox from '../../primitives/Checkbox/Checkbox';
import DatePicker from '../../primitives/DatePicker/DatePicker';
import DialogPrimitive from '../../primitives/Dialog/Dialog';
import Divider from '../../primitives/Divider/Divider';
import MultiInput from '../../primitives/MultiInput/MultiInput';
import TextField from '../../primitives/TextField/TextField';
import Typography from '../../primitives/Typography/Typography';

interface ExtendedFlatSchema {
  path?: string;
  schemaId?: string;
}

interface Schema extends ExtendedFlatSchema {
  caseExact?: boolean;
  description?: string;
  displayName?: string;
  displayOrder?: string;
  multiValued?: boolean;
  mutability?: string;
  name?: string;
  regex?: string;
  required?: boolean;
  returned?: string;
  subAttributes?: Schema[];
  type?: string;
  uniqueness?: string;
  value?: any;
}

export interface BaseUserProfileProps {
  attributeMapping?: {
    [key: string]: string | string[] | undefined;
    firstName?: string | string[];
    lastName?: string | string[];
    picture?: string | string[];
    username?: string | string[];
  };
  cardLayout?: boolean;
  className?: string;
  displayNameAttributes?: string[];
  editable?: boolean;
  error?: string | null;
  fallback?: ReactElement | null;
  flattenedProfile?: User;
  hideFields?: string[];
  isLoading?: boolean;
  mode?: 'inline' | 'popup';
  onOpenChange?: (open: boolean) => void;
  onUpdate?: (payload: any) => Promise<void>;
  open?: boolean;
  /**
   * Component-level preferences to override global i18n and theme settings.
   * Preferences are deep-merged with global ones, with component preferences
   * taking precedence. Affects this component and all its descendants.
   */
  preferences?: Preferences;
  profile?: User;
  /**
   * Renders the verification panel for an attribute. When omitted, or when the profile is not
   * editable, verification statuses are shown without a Verify action.
   */
  renderVerification?: (props: BaseUserProfileVerificationRenderProps) => ReactNode;
  showFields?: string[];

  title?: string;
  userSchema?: Record<string, AttributeSchema> | null;
}

/**
 * Props passed to `renderVerification`.
 */
export interface BaseUserProfileVerificationRenderProps {
  /**
   * Name of the attribute to verify.
   */
  attribute: string;
  /**
   * Label of the attribute.
   */
  attributeDisplayName: string;
  /**
   * Closes the panel.
   */
  onCancel: () => void;
}

// Fields to skip based on schema.name
const fieldsToSkip: string[] = [
  'roles.default',
  'active',
  'groups',
  'accountLocked',
  'accountDisabled',
  'oneTimePassword',
  'userSourceId',
  'idpType',
  'localCredentialExists',
  'active',
  'ResourceType',
  'ExternalID',
  'MetaData',
  'verifiedMobileNumbers',
  'verifiedEmailAddresses',
  'phoneNumbers.mobile',
  'emailAddresses',
  'preferredMFAOption',
  'attributes',
  'picture',
  'isReadOnly',
  'isReadonly',
  AttributeVerificationConstants.VERIFIED_ATTRIBUTES_KEY,
];

// Fields that should be readonly
const readonlyFields: string[] = ['attributes', 'id', 'isReadOnly', 'ouId', 'username', 'sub'];

const isStatusType = (type?: string): boolean =>
  !!type && AttributeVerificationConstants.VERIFIABLE_ATTRIBUTE_TYPES.includes(type.toLowerCase());

const isVerifiedAfterSave = (type?: string): boolean =>
  !!type && AttributeVerificationConstants.VERIFY_AFTER_SAVE_ATTRIBUTE_TYPES.includes(type.toLowerCase());

const BaseUserProfile: FC<BaseUserProfileProps> = ({
  fallback = null,
  className = '',
  cardLayout = true,
  profile,
  flattenedProfile,
  userSchema,
  mode = 'inline',
  title,
  attributeMapping = {},
  editable = true,
  onOpenChange,
  onUpdate,
  open = false,
  error = null,
  isLoading = false,
  preferences,
  showFields = [],
  hideFields = [],
  displayNameAttributes = [],
  renderVerification = undefined,
}: BaseUserProfileProps): ReactElement | null => {
  const {theme, colorScheme} = useTheme();
  const [editedUser, setEditedUser] = useState(flattenedProfile || profile);
  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  // Attribute whose verification panel is open.
  const [verifyingField, setVerifyingField] = useState<string | null>(null);
  // A saved attribute to verify once the profile reflects the change.
  const [pendingVerification, setPendingVerification] = useState<{name: string; previousValue: unknown} | null>(null);
  // Fields whose save is in flight; their stored value is about to change.
  const [savingFields, setSavingFields] = useState<Record<string, boolean>>({});
  const {t, currentLanguage} = useTranslation(preferences?.i18n);

  const reportedVerifiedAttributes: Record<string, VerifiedAttribute> | undefined = useMemo(
    () => getVerifiedAttributes(profile ?? flattenedProfile),
    [profile, flattenedProfile],
  );
  // A server without verification support omits the field, so no status is known.
  const supportsVerification: boolean = reportedVerifiedAttributes !== undefined;
  const verifiedAttributes: Record<string, VerifiedAttribute> = useMemo(
    () => reportedVerifiedAttributes ?? {},
    [reportedVerifiedAttributes],
  );

  useEffect(() => {
    if (!pendingVerification) return;

    if (error) {
      setPendingVerification(null);
      return;
    }

    const {name, previousValue} = pendingVerification;
    const storedUser: User | undefined = flattenedProfile ?? profile;
    const storedAttributes: Record<string, unknown> | undefined = storedUser?.['attributes'] as
      | Record<string, unknown>
      | undefined;
    const storedValue: unknown = storedAttributes?.[name] ?? storedUser?.[name];

    if (storedValue === previousValue) return;

    // An absent verification record leaves the status unknown, so nothing opens on that basis.
    if (
      supportsVerification &&
      typeof storedValue === 'string' &&
      storedValue.trim() !== '' &&
      !verifiedAttributes[name]
    ) {
      setVerifyingField(name);
    }
    setPendingVerification(null);
  }, [pendingVerification, flattenedProfile, profile, error, verifiedAttributes, supportsVerification]);

  useEffect(() => {
    const nextUser = flattenedProfile ?? profile;
    if (!nextUser) return;

    setEditedUser((prev: any) => {
      if (!prev) return nextUser;

      const updated = {...nextUser};
      Object.keys(prev).forEach((key) => {
        if (editingFields[key]) {
          updated[key] = prev[key];
        }
      });
      return updated;
    });
  }, [flattenedProfile, profile, editingFields]);

  /**
   * Determines if a field should be visible based on showFields, hideFields, and fallback fieldsToSkip arrays.
   * When isSchemaBased is true, fieldsToSkip is bypassed so schema-defined fields render dynamically.
   */
  const shouldShowField = useCallback(
    (fieldName: string, isSchemaBased: boolean = false): boolean => {
      // For fallback without schema metadata, skip internal system fields
      if (!isSchemaBased && fieldsToSkip.includes(fieldName)) {
        return false;
      }

      // If hideFields is provided and contains this field, hide it
      if (hideFields.length > 0 && hideFields.includes(fieldName)) {
        return false;
      }

      // If showFields is provided and not empty, only show fields in that array
      if (showFields.length > 0) {
        return showFields.includes(fieldName);
      }

      return true;
    },
    [showFields, hideFields],
  );

  const PencilIcon = (): any => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );

  const toggleFieldEdit: any = useCallback((fieldName: string) => {
    setEditingFields((prev: any) => ({
      ...prev,
      [fieldName]: !prev[fieldName],
    }));
  }, []);

  const getFieldPlaceholder: any = useCallback(
    (schema: Schema): string => {
      const {type, displayName, description, name} = schema;

      const fieldLabel: any = displayName || description || name || 'value';

      switch (type) {
        case 'DATE_TIME':
        case 'STRING':
        default:
          return t('elements.fields.generic.placeholder', {field: fieldLabel.toLowerCase()});
      }
    },
    [t],
  );

  const formatLabel: any = useCallback(
    (key: string): string =>
      key
        .split(/(?=[A-Z])|_/)
        .map((word: any) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' '),
    [],
  );

  const styles: any = useStyles(theme, colorScheme);
  // Typed view of the same classes for the verification markup.
  const verificationStyles: Record<string, string> = styles as Record<string, string>;

  const ObjectDisplay: FC<{data: unknown}> = ({data}: {data: unknown}): ReactElement | null => {
    if (!data || typeof data !== 'object') return null;

    return (
      <table className={styles.value}>
        <tbody>
          {Object.entries(data).map(([key, value]: any) => (
            <tr key={key}>
              <td className={styles.objectKey}>
                <strong>{formatLabel(key)}:</strong>
              </td>
              <td className={styles.objectValue}>
                {typeof value === 'object' ? <ObjectDisplay data={value} /> : String(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  function set(obj: Record<string, any>, path: string, value: any): void {
    const keys: any = path.split('.');
    let current: any = obj;

    for (let i: any = 0; i < keys.length; i += 1) {
      const key: any = keys[i];

      if (i === keys.length - 1) {
        current[key] = value;
      } else {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
    }
  }

  const handleFieldSave: any = useCallback(
    (schema: Schema): void => {
      if (!onUpdate || !schema.name) return;

      const fieldName: string = schema.name;
      const currentUser: any = flattenedProfile || profile;
      let fieldValue: any;
      if (editedUser && fieldName && editedUser[fieldName] !== undefined) {
        fieldValue = editedUser[fieldName];
      } else if (currentUser?.attributes?.[fieldName] !== undefined) {
        fieldValue = currentUser.attributes[fieldName];
      } else if (flattenedProfile?.[fieldName] !== undefined) {
        fieldValue = flattenedProfile[fieldName];
      } else {
        fieldValue = '';
      }

      if (Array.isArray(fieldValue)) {
        fieldValue = fieldValue.filter((v: any) => v !== undefined && v !== null && v !== '');
      }

      const strVal = String(fieldValue ?? '').trim();
      const fieldLabel = schema.displayName || (schema.name ? startCase(schema.name) : 'Field');

      // 1. Required validation
      if (schema.required && !strVal) {
        setFieldErrors((prev: Record<string, string>) => ({
          ...prev,
          [fieldName]: t('validations.required.field.error'),
        }));
        return;
      }

      // 2. Regex validation
      if (schema.regex && strVal) {
        try {
          const reg = new RegExp(schema.regex);
          if (!reg.test(strVal)) {
            setFieldErrors((prev: Record<string, string>) => ({
              ...prev,
              [fieldName]: t('validation.pattern.invalid'),
            }));
            return;
          }
        } catch (e) {
          // ignore invalid regex syntax safely
        }
      }

      // Clear field error if valid
      setFieldErrors((prev: Record<string, string>) => {
        const next = {...prev};
        delete next[fieldName];
        return next;
      });

      let payload: Record<string, any> = {};
      set(payload, fieldName, fieldValue);

      setSavingFields((prev: Record<string, boolean>) => ({...prev, [fieldName]: true}));
      // A failed save is reported through `error`; it only drops the verification it would have opened.
      Promise.resolve(onUpdate(payload))
        .catch((): void => setPendingVerification(null))
        .finally((): void =>
          setSavingFields((prev: Record<string, boolean>) => {
            const next: Record<string, boolean> = {...prev};
            delete next[fieldName];
            return next;
          }),
        );

      toggleFieldEdit(fieldName);

      // Offer verification once a changed, verifiable value is saved.
      const savedUser: User | undefined = flattenedProfile ?? profile;
      const savedAttributes: Record<string, unknown> | undefined = savedUser?.['attributes'] as
        | Record<string, unknown>
        | undefined;
      const storedValue: unknown = savedAttributes?.[fieldName] ?? savedUser?.[fieldName];
      if (
        renderVerification &&
        isVerifiedAfterSave(schema.type) &&
        isVerifiableAttribute(userSchema, fieldName) &&
        typeof fieldValue === 'string' &&
        fieldValue.trim() !== '' &&
        fieldValue !== storedValue
      ) {
        setPendingVerification({name: fieldName, previousValue: storedValue});
      } else {
        setPendingVerification(null);
      }
    },
    [editedUser, flattenedProfile, profile, onUpdate, toggleFieldEdit, t, renderVerification, userSchema],
  );

  const handleFieldCancel: any = useCallback(
    (fieldName: string) => {
      const currentUser: any = flattenedProfile || profile;
      const initialVal = currentUser?.attributes?.[fieldName] ?? currentUser?.[fieldName];
      setEditedUser((prev: any) => ({
        ...prev,
        [fieldName]: initialVal,
      }));
      setFieldErrors((prev: Record<string, string>) => {
        const next = {...prev};
        delete next[fieldName];
        return next;
      });
      toggleFieldEdit(fieldName);
    },
    [flattenedProfile, profile, toggleFieldEdit],
  );

  const defaultAttributeMappings: Record<string, string | string[]> = {
    email: ['emails', 'email'],
    firstName: ['name.givenName', 'given_name'],
    lastName: ['name.familyName', 'family_name'],
    picture: ['profile', 'profileUrl', 'picture', 'URL'],
    username: ['userName', 'username', 'user_name'],
  };

  const mergedMappings: Record<string, string | string[]> = Object.fromEntries(
    Object.entries({...defaultAttributeMappings, ...attributeMapping}).filter(
      (entry): entry is [string, string | string[]] => entry[1] !== undefined,
    ),
  );

  const renderSchemaField = (
    schema: Schema,
    isEditing: boolean,
    onEditValue?: (value: any) => void,
    onStartEdit?: () => void,
  ): ReactElement | null => {
    if (!schema) return null;
    const {value, displayName, description, name, type, required, mutability, subAttributes, multiValued} = schema;
    const label: any = displayName || description || (name ? startCase(name) : '');

    if (subAttributes && Array.isArray(subAttributes)) {
      return (
        <>
          {subAttributes.map((subAttr: any, index: any) => {
            let displayValue: string;
            if (Array.isArray(subAttr.value)) {
              displayValue = subAttr.value
                .map((item: any) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
                .join(', ');
            } else if (typeof subAttr.value === 'object') {
              displayValue = JSON.stringify(subAttr.value);
            } else {
              displayValue = String(subAttr.value);
            }

            return (
              <div key={index} className={styles.field}>
                <span className={styles.label}>{subAttr.displayName || subAttr.description || ''}</span>
                <div className={styles.value}>{displayValue}</div>
              </div>
            );
          })}
        </>
      );
    }

    if (Array.isArray(value) || multiValued) {
      const hasValues: any = Array.isArray(value)
        ? value.length > 0
        : value !== undefined && value !== null && value !== '';
      const isEditable: any = editable && mutability !== 'READ_ONLY' && !readonlyFields.includes(name || '');

      if (isEditing && onEditValue && isEditable) {
        let currentValue: any;
        if (editedUser && name && editedUser[name] !== undefined) {
          currentValue = editedUser[name];
        } else if (flattenedProfile && name && flattenedProfile[name] !== undefined) {
          currentValue = flattenedProfile[name];
        } else {
          currentValue = value;
        }

        let fieldValues: string[];
        if (Array.isArray(currentValue)) {
          fieldValues = currentValue.map(String);
        } else if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
          fieldValues = [String(currentValue)];
        } else {
          fieldValues = [];
        }

        return (
          <>
            <span className={styles.label}>{label}</span>
            <div className={styles.value}>
              <MultiInput
                values={fieldValues}
                onChange={(newValues: any): void => {
                  if (multiValued || Array.isArray(currentValue)) {
                    onEditValue(newValues);
                  } else {
                    onEditValue(newValues[0] || '');
                  }
                }}
                placeholder={getFieldPlaceholder(schema)}
                fieldType={type as 'STRING' | 'DATE_TIME' | 'BOOLEAN'}
                type={type === 'DATE_TIME' ? 'date' : 'text'}
                required={required}
              />
            </div>
          </>
        );
      }

      let displayValue: string;
      if (hasValues) {
        if (Array.isArray(value)) {
          displayValue = value
            .map((item: any) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
            .join(', ');
        } else {
          displayValue = String(value);
        }
      } else if (isEditable) {
        displayValue = getFieldPlaceholder(schema);
      } else {
        displayValue = '-';
      }

      return (
        <>
          <span className={styles.label}>{label}</span>
          <div className={cx(styles.value, !hasValues ? styles.valuePlaceholder : '')}>
            {!hasValues && isEditable && onStartEdit ? (
              <Button
                onClick={onStartEdit}
                variant="text"
                color="secondary"
                size="small"
                title="Click to edit"
                className={styles.editButton}
              >
                {displayValue}
              </Button>
            ) : (
              displayValue
            )}
          </div>
        </>
      );
    }
    if (type === 'COMPLEX' && typeof value === 'object') {
      return <ObjectDisplay data={value} />;
    }

    if (isEditing && onEditValue && mutability !== 'READ_ONLY' && !readonlyFields.includes(name || '')) {
      let fieldValue: any;
      if (editedUser && name && editedUser[name] !== undefined) {
        fieldValue = editedUser[name];
      } else if (flattenedProfile && name && flattenedProfile[name] !== undefined) {
        fieldValue = flattenedProfile[name];
      } else {
        fieldValue = value || '';
      }

      const commonProps: any = {
        label: undefined,
        onChange: (e: any) => onEditValue(e.target ? e.target.value : e),
        placeholder: getFieldPlaceholder(schema),
        required,
        value: fieldValue,
        // Removed inline style, use .styles.ts for marginBottom if needed
      };
      let field: ReactElement;
      switch (type) {
        case 'STRING':
          field = <TextField {...commonProps} />;
          break;
        case 'DATE_TIME':
          field = <DatePicker {...commonProps} />;
          break;
        case 'BOOLEAN':
          field = (
            <Checkbox
              {...commonProps}
              checked={!!fieldValue}
              onChange={(e: any): void => {
                onEditValue(e.target.checked);
              }}
            />
          );
          break;
        case 'COMPLEX':
          field = (
            <textarea
              value={fieldValue}
              onChange={(e: any): void => onEditValue(e.target.value)}
              placeholder={getFieldPlaceholder(schema)}
              required={required}
              className={styles.complexTextarea}
            />
          );
          break;
        default:
          field = <TextField {...commonProps} />;
      }
      return (
        <>
          <span className={styles.label}>{label}</span>
          <div className={styles.value}>{field}</div>
        </>
      );
    }

    const hasValue: any = value !== undefined && value !== null && value !== '';
    const isEditable: any = editable && mutability !== 'READ_ONLY' && !readonlyFields.includes(name || '');

    let displayValue: string;
    if (hasValue) {
      displayValue = String(value);
    } else if (isEditable) {
      displayValue = getFieldPlaceholder(schema);
    } else {
      displayValue = '-';
    }

    return (
      <>
        <span className={styles.label}>{label}</span>
        <div className={cx(styles.value, !hasValue ? styles.valuePlaceholder : '')}>
          {!hasValue && isEditable && onStartEdit ? (
            <Button
              onClick={onStartEdit}
              variant="text"
              color="secondary"
              size="small"
              title="Click to edit"
              className={styles.editButton}
            >
              {displayValue}
            </Button>
          ) : (
            displayValue
          )}
        </div>
      </>
    );
  };

  const renderVerificationStatus = (schema: Schema): ReactElement | null => {
    const verification: VerifiedAttribute | undefined = verifiedAttributes[schema.name!];
    let verifiedAtTitle: string | undefined;

    if (verification?.verifiedAt) {
      const verifiedAt: Date = new Date(verification.verifiedAt);
      const date: string = Number.isNaN(verifiedAt.getTime())
        ? verification.verifiedAt
        : verifiedAt.toLocaleString(currentLanguage);
      verifiedAtTitle = t('user.verification.status.verified_at', {date});
    }

    return (
      <span
        className={cx(
          withVendorCSSClassPrefix(bem('user-profile', 'verification-status')),
          withVendorCSSClassPrefix(
            bem('user-profile', 'verification-status', verification ? 'verified' : 'unverified'),
          ),
          verificationStyles['verificationStatus'],
          verification ? verificationStyles['verified'] : verificationStyles['unverified'],
        )}
        title={verifiedAtTitle}
        data-testid={`thunderid-verification-status-${schema.name}`}
      >
        {verification ? t('user.verification.status.verified') : t('user.verification.status.unverified')}
        {/* A title is not reachable by keyboard or touch, so the time is also given as text. */}
        {verifiedAtTitle && <span className={verificationStyles['visuallyHidden']}>{` (${verifiedAtTitle})`}</span>}
      </span>
    );
  };

  const renderVerificationPanel = (schema: Schema): ReactNode => {
    if (!renderVerification || !schema.name || verifyingField !== schema.name) {
      return null;
    }

    return (
      <div
        className={cx(
          withVendorCSSClassPrefix(bem('user-profile', 'verification')),
          verificationStyles['verification'],
        )}
      >
        {renderVerification({
          attribute: schema.name,
          attributeDisplayName: schema.displayName ?? startCase(schema.name),
          onCancel: (): void => setVerifyingField(null),
        })}
      </div>
    );
  };

  const renderUserInfo = (schema: Schema): any => {
    if (!schema?.name) return null;

    const hasValue: any = schema.value !== undefined && schema.value !== '' && schema.value !== null;
    const isFieldEditing: any = editingFields[schema.name];
    const isReadonlyField: any = readonlyFields.includes(schema.name);

    const shouldShow: any = hasValue || isFieldEditing || (editable && schema.mutability === 'READ_WRITE');

    if (!shouldShow) {
      return null;
    }

    // Status describes the stored value, so it is shown only while the row shows that value and no
    // save is about to replace it.
    const storedUser: User | undefined = flattenedProfile ?? profile;
    const storedAttributes: Record<string, unknown> | undefined = storedUser?.['attributes'] as
      | Record<string, unknown>
      | undefined;
    const storedValue: unknown = storedAttributes?.[schema.name] ?? storedUser?.[schema.name];
    const showsVerificationStatus: boolean =
      supportsVerification &&
      !!hasValue &&
      !isFieldEditing &&
      !savingFields[schema.name] &&
      schema.value === storedValue &&
      isStatusType(schema.type);
    // A read-only profile shows the status only.
    const canVerify: boolean =
      editable &&
      !!renderVerification &&
      showsVerificationStatus &&
      !verifiedAttributes[schema.name] &&
      verifyingField !== schema.name &&
      isVerifiableAttribute(userSchema, schema.name) &&
      typeof schema.value === 'string';

    return (
      <div className={styles.field}>
        <div className={styles.fieldInner}>
          {renderSchemaField(
            schema,
            isFieldEditing,
            (value: any) => {
              const tempEditedUser: any = {...editedUser};
              tempEditedUser[schema.name!] = value;
              setEditedUser(tempEditedUser);
            },
            () => toggleFieldEdit(schema.name),
          )}
          {showsVerificationStatus && renderVerificationStatus(schema)}
          {fieldErrors[schema.name] && (
            <div style={{color: '#d32f2f', fontSize: '0.8rem', marginTop: '4px', fontWeight: 500}}>
              {fieldErrors[schema.name]}
            </div>
          )}
        </div>
        {canVerify && (
          <div className={verificationStyles['fieldActions']}>
            <Button
              size="small"
              color="primary"
              variant="text"
              onClick={(): void => setVerifyingField(schema.name!)}
              className={withVendorCSSClassPrefix(bem('user-profile', 'verify-button'))}
              data-testid={`thunderid-verify-${schema.name}`}
            >
              {t('user.verification.buttons.verify.text')}
            </Button>
          </div>
        )}
        {editable && schema.mutability !== 'READ_ONLY' && !isReadonlyField && (
          <div className={styles.fieldActions}>
            {isFieldEditing && (
              <>
                <Button size="small" color="primary" variant="solid" onClick={(): any => handleFieldSave(schema)}>
                  Save
                </Button>
                <Button
                  size="small"
                  color="secondary"
                  variant="solid"
                  onClick={(): any => handleFieldCancel(schema.name)}
                >
                  Cancel
                </Button>
              </>
            )}
            {!isFieldEditing && hasValue && (
              <Button
                size="small"
                color="tertiary"
                variant="icon"
                onClick={(): any => {
                  if (verifyingField === schema.name) setVerifyingField(null);
                  toggleFieldEdit(schema.name);
                }}
                title="Edit"
                className={styles.editButton}
              >
                <PencilIcon />
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!profile && !flattenedProfile) {
    return fallback;
  }

  const containerClasses: any = cx(
    styles.root,
    cardLayout ? styles.card : '',
    withVendorCSSClassPrefix('user-profile'),
    className,
  );

  const currentUser: any = flattenedProfile || profile;

  const renderProfileContent = (): any => {
    if (!currentUser) return null;

    const displayName: any = getDisplayName(mergedMappings, profile!, displayNameAttributes);

    let schemaItems: Schema[] = [];

    if (userSchema && typeof userSchema === 'object' && Object.keys(userSchema).length > 0) {
      schemaItems = Object.entries(userSchema)
        .filter(([key, metaAttr]: [string, AttributeSchema]) => {
          if (metaAttr?.credential) return false;
          return shouldShowField(key, true);
        })
        .map(([key, metaAttr]: [string, AttributeSchema]) => {
          const val = editedUser?.[key] ?? currentUser?.attributes?.[key] ?? currentUser?.[key] ?? '';

          const isReadonly =
            metaAttr.readOnly === true || metaAttr.mutability === 'READ_ONLY' || readonlyFields.includes(key);

          return {
            name: key,
            displayName: metaAttr.displayName ?? (key ? startCase(key) : ''),
            type: (metaAttr.type ?? 'STRING').toUpperCase(),
            regex: metaAttr.regex,
            required: !!metaAttr.required,
            mutability: isReadonly ? 'READ_ONLY' : 'READ_WRITE',
            value: val,
          };
        });
    } else {
      const profileEntries: any = Object.entries(currentUser)
        .filter(([key, value]: [string, any]) => {
          if (!shouldShowField(key)) return false;

          return value !== undefined && value !== '' && value !== null;
        })
        .sort(([a]: [string, ...any[]], [b]: [string, ...any[]]) => a.localeCompare(b));

      schemaItems = profileEntries.map(([key, value]: any) => {
        const isReadonly = readonlyFields.includes(key);
        return {
          name: key,
          displayName: startCase(key),
          mutability: isReadonly ? 'READ_ONLY' : 'READ_WRITE',
          value,
        };
      });
    }

    return (
      <>
        <div className={styles.profileSummary}>
          <Avatar
            imageUrl={getMappedUserProfileValue('picture', mergedMappings, currentUser)}
            name={displayName}
            size={70}
            alt={`${displayName}'s avatar`}
            isLoading={isLoading}
          />
          <Typography variant="h3" fontWeight="medium">
            {displayName}
          </Typography>
          {getMappedUserProfileValue('email', mergedMappings, currentUser) && (
            <Typography variant="body2" color="textSecondary">
              {getMappedUserProfileValue('email', mergedMappings, currentUser)}
            </Typography>
          )}
        </div>
        <Divider />
        {schemaItems.map((schemaWithValue: Schema) => (
          <div key={schemaWithValue.name} className={styles.info}>
            {renderUserInfo(schemaWithValue)}
            {renderVerificationPanel(schemaWithValue)}
          </div>
        ))}
      </>
    );
  };

  const profileContent: any = (
    <CardPrimitive className={containerClasses}>
      {error && (
        <AlertPrimitive
          variant="error"
          className={cx(withVendorCSSClassPrefix(bem('user-profile', 'alert')), styles.alert)}
        >
          <AlertPrimitive.Title>{t('errors.heading') || 'Error'}</AlertPrimitive.Title>
          <AlertPrimitive.Description>{error}</AlertPrimitive.Description>
        </AlertPrimitive>
      )}
      <div className={styles.infoContainer}>{renderProfileContent()}</div>
    </CardPrimitive>
  );

  if (mode === 'popup') {
    return (
      <DialogPrimitive open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Content>
          <DialogPrimitive.Heading>{title ?? t('user.profile.heading')}</DialogPrimitive.Heading>
          <div className={styles.popup}>{profileContent}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive>
    );
  }

  return profileContent;
};

export default BaseUserProfile;

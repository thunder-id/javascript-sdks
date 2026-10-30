// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeSchema,
  AttributeVerificationConstants,
  Preferences,
  type User,
  type VerifiedAttribute,
  getDefaultI18nBundles,
  getVerifiedAttributes,
  isVerifiableAttribute,
  startCase,
  substituteTranslationParams,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  type Component,
  Fragment,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  inject,
  ref,
  watch,
} from 'vue';
import {I18N_KEY} from '../../../keys';
import type {I18nContextValue} from '../../../models/contexts';
import getDisplayName from '../../../utils/getDisplayName';
import getMappedUserProfileValue from '../../../utils/getMappedUserProfileValue';
import Alert from '../../primitives/Alert';
import Button from '../../primitives/Button';
import Card from '../../primitives/Card';
import Checkbox from '../../primitives/Checkbox';
import DatePicker from '../../primitives/DatePicker';
import Divider from '../../primitives/Divider';
import {PencilIcon} from '../../primitives/Icons';
import Spinner from '../../primitives/Spinner';
import TextField from '../../primitives/TextField';
import Typography from '../../primitives/Typography';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExtendedSchema {
  description?: string;
  displayName?: string;
  displayOrder?: string;
  multiValued?: boolean;
  mutability?: string;
  name?: string;
  regex?: string;
  required?: boolean;
  schemaId?: string;
  subAttributes?: ExtendedSchema[];
  type?: string;
  value?: any;
}

export interface BaseUserProfileProps {
  avatarSize?: 'sm' | 'md' | 'lg';
  cardLayout?: boolean;
  cardVariant?: 'elevated' | 'outlined' | 'flat';
  className?: string;
  compact?: boolean;
  editable?: boolean;
  error?: string | null;
  flattenedProfile?: User | null;
  hideFields?: string[];
  isLoading?: boolean;
  onUpdate?: (payload: any) => Promise<void>;
  preferences?: Preferences;
  profile?: User | null;
  schemas?: any[] | null;
  showAvatar?: boolean;
  showFields?: string[];
  t?: (key: string, fallback?: string) => string;
  title?: string;
  userSchema?: Record<string, AttributeSchema> | null;
}

/**
 * Slot props of the `verification` slot, which renders the verification panel for an attribute.
 * Without the slot, or when the profile is not editable, statuses are shown without a Verify action.
 */
export interface BaseUserProfileVerificationSlotProps {
  /** Name of the attribute to verify. */
  attribute: string;
  /** Label of the attribute. */
  attributeDisplayName: string;
  /** Closes the panel. */
  onCancel: () => void;
}

/**
 * Verification state and actions added to the default slot's props, so a custom profile can show
 * each attribute's status and start a verification.
 */
export interface BaseUserProfileVerificationState {
  /**
   * Whether the user can verify the attribute now: the profile is editable, the server reports
   * verification, and the attribute is an unverified `email` or `mobile` property with a stored value.
   */
  canVerify: (attribute: string) => boolean;
  /** Closes the open verification. */
  cancelVerification: () => void;
  /** Renders the `verification` slot for the open attribute, or nothing when none is open. */
  renderVerification: () => VNode | null;
  /** Opens the verification of an attribute that `canVerify` allows. */
  verify: (attribute: string) => void;
  /**
   * The attribute's status: `verified` or `unverified` for an `email` or `mobile` property with a stored
   * value, else `null`, also when the server does not report verification.
   */
  verificationStatus: (attribute: string) => 'verified' | 'unverified' | null;
  /** Verified attributes as the server reports them, with `verifiedAt`; `undefined` when it does not. */
  verifiedAttributes: Record<string, VerifiedAttribute> | undefined;
  /** The attribute whose verification is open. */
  verifyingAttribute: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FIELDS_TO_SKIP: string[] = [
  'roles.default',
  'active',
  'groups',
  'accountLocked',
  'accountDisabled',
  'oneTimePassword',
  'userSourceId',
  'idpType',
  'localCredentialExists',
  'ResourceType',
  'ExternalID',
  'MetaData',
  'verifiedMobileNumbers',
  'verifiedEmailAddresses',
  'phoneNumbers.mobile',
  'emailAddresses',
  'preferredMFAOption',
  'attributes',
  'isReadOnly',
  'isReadonly',
  AttributeVerificationConstants.VERIFIED_ATTRIBUTES_KEY,
];

const READONLY_FIELDS: string[] = [
  'username',
  'userName',
  'user_name',
  'sub',
  'id',
  'ouId',
  'attributes',
  'isReadOnly',
  'isReadonly',
];

const DEFAULT_ATTRIBUTE_MAPPINGS: Record<string, string | string[]> = {
  email: ['emails', 'email'],
  firstName: ['name.givenName', 'given_name'],
  lastName: ['name.familyName', 'family_name'],
  picture: ['picture', 'avatar', 'pictureUrl', 'attributes.picture'],
  username: ['userName', 'username', 'user_name'],
};

const AVATAR_GRADIENTS: string[] = [
  'linear-gradient(135deg, #4b6ef5 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #4b6ef5 100%)',
  'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
  'linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #4b6ef5 100%)',
  'linear-gradient(135deg, #14b8a6 0%, #0ea5e9 100%)',
  'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isVerificationType = (type?: string): boolean =>
  !!type && AttributeVerificationConstants.VERIFIABLE_ATTRIBUTE_TYPES.includes(type.toLowerCase());

const isVerifiedAfterSave = (type?: string): boolean =>
  !!type && AttributeVerificationConstants.VERIFY_AFTER_SAVE_ATTRIBUTE_TYPES.includes(type.toLowerCase());

// The stored value of an attribute: `/users/me` nests attributes and may also spread them to the top level.
const storedValueOf = (user: User | null | undefined, name: string): unknown => {
  const attributes: Record<string, unknown> | undefined = user?.['attributes'] as Record<string, unknown> | undefined;
  return attributes?.[name] ?? user?.[name];
};

function getAvatarGradient(seed: string): string {
  if (!seed) return AVATAR_GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function formatLabel(key: string): string {
  return key
    .split(/(?=[A-Z])|[_.]/)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function buildPatchValue(
  flatKey: string,
  rawValue: any,
  _schemaId: string | undefined,
  multiValued: boolean | undefined,
): Record<string, unknown> {
  const value: unknown = multiValued ? [rawValue] : rawValue;

  const segments: string[] = flatKey.split('.');
  const nested: Record<string, unknown> = {};
  let cursor: Record<string, unknown> = nested;
  for (let i = 0; i < segments.length - 1; i += 1) {
    cursor[segments[i]] = {};
    cursor = cursor[segments[i]] as Record<string, unknown>;
  }
  cursor[segments[segments.length - 1]] = value;
  return nested;
}

// ─── Component ───────────────────────────────────────────────────────────────

const BaseUserProfile: Component = defineComponent({
  name: 'BaseUserProfile',
  inheritAttrs: false,
  props: {
    /** Avatar circle size. */
    avatarSize: {
      default: 'lg',
      type: String as PropType<'sm' | 'md' | 'lg'>,
    },
    cardLayout: {default: true, type: Boolean},
    /** Shadow / border style of the Card wrapper. */
    cardVariant: {
      default: 'elevated',
      type: String as PropType<'elevated' | 'outlined' | 'flat'>,
    },
    className: {default: '', type: String},
    /** Tighter field spacing for modal / dropdown contexts. */
    compact: {default: false, type: Boolean},
    editable: {default: true, type: Boolean},
    error: {default: null, type: String as PropType<string | null>},
    flattenedProfile: {default: null, type: Object as PropType<User | null>},
    hideFields: {default: () => [], type: Array as PropType<string[]>},
    isLoading: {default: false, type: Boolean},
    onUpdate: {default: undefined, type: Function as PropType<(payload: any) => Promise<void>>},
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    profile: {default: null, type: Object as PropType<User | null>},
    schemas: {default: () => [], type: Array as PropType<any[] | null>},
    /** Whether to render the avatar hero banner. */
    showAvatar: {default: true, type: Boolean},
    showFields: {default: () => [], type: Array as PropType<string[]>},
    t: {default: undefined, type: Function as PropType<(key: string, fallback?: string) => string>},
    title: {default: 'Profile', type: String},
    /** User schema metadata. */
    userSchema: {default: null, type: Object as PropType<Record<string, AttributeSchema> | null>},
  },
  setup(props: BaseUserProfileProps, {slots}: SetupContext): () => VNode | VNode[] | null {
    const editingFields: Ref<Record<string, boolean>> = ref({});
    const editedValues: Ref<Record<string, any>> = ref({});

    const px: typeof withVendorCSSClassPrefix = withVendorCSSClassPrefix;
    const regexCache = new Map<string, RegExp | null>();

    const t = (key: string, fallback?: string): string => {
      if (props.t) {
        const res = props.t(key);
        if (res && res !== key) return res;
      }
      return fallback ?? key;
    };

    // Translates with parameters. UserProfile passes the i18n `t`, which takes them; without it, or for
    // a key it lacks, the default bundle answers.
    const tp = (key: string, params: Record<string, string> = {}): string => {
      const translate = props.t as ((key: string, params?: Record<string, string>) => string) | undefined;
      const res: string | undefined = translate?.(key, params);
      if (res && res !== key) return res;
      const fallback: string | undefined = (
        getDefaultI18nBundles()['en-US']?.translations as unknown as Record<string, string> | undefined
      )?.[key];
      return fallback ? substituteTranslationParams(fallback, params) : key;
    };

    // ── Verification ──────────────────────────────────────────────────────────

    const i18n: I18nContextValue | null = inject(I18N_KEY, null);

    // Attribute whose verification panel is open.
    const verifyingField: Ref<string | null> = ref(null);
    // A saved attribute to verify once the profile reflects the change.
    const pendingVerification: Ref<{name: string; previousValue: unknown} | null> = ref(null);

    const storedUser = (): User | null => props.flattenedProfile ?? props.profile ?? null;
    // A server without verification support omits the field, so no status is known.
    const reportedVerifiedAttributes = (): Record<string, VerifiedAttribute> | undefined =>
      getVerifiedAttributes(props.profile ?? props.flattenedProfile);

    watch(
      () => [props.profile, props.flattenedProfile, props.error] as const,
      () => {
        const pending: {name: string; previousValue: unknown} | null = pendingVerification.value;
        if (!pending) return;

        if (props.error) {
          pendingVerification.value = null;
          return;
        }

        const storedValue: unknown = storedValueOf(storedUser(), pending.name);
        if (storedValue === pending.previousValue) return;

        const verified: Record<string, VerifiedAttribute> | undefined = reportedVerifiedAttributes();
        // An absent verification record leaves the status unknown, so nothing opens on that basis.
        if (verified && typeof storedValue === 'string' && storedValue.trim() !== '' && !verified[pending.name]) {
          verifyingField.value = pending.name;
        }
        pendingVerification.value = null;
      },
    );

    // ── Visibility ────────────────────────────────────────────────────────────

    function shouldShowField(fieldName: string, isSchemaBased = false): boolean {
      if (!isSchemaBased && FIELDS_TO_SKIP.includes(fieldName)) return false;
      if (props.hideFields && props.hideFields.length > 0 && props.hideFields.includes(fieldName)) return false;
      if (props.showFields && props.showFields.length > 0) return props.showFields.includes(fieldName);
      return true;
    }

    const fieldErrors: Ref<Record<string, string>> = ref({});

    function startEditing(fieldName: string, currentValue: any): void {
      editedValues.value = {...editedValues.value, [fieldName]: currentValue ?? ''};
      editingFields.value = {...editingFields.value, [fieldName]: true};
      fieldErrors.value = {...fieldErrors.value, [fieldName]: ''};
    }

    // Drops a field's edited value, so the row shows the stored one again.
    function clearEditedValue(fieldName: string): void {
      const next: Record<string, unknown> = {...editedValues.value};
      delete next[fieldName];
      editedValues.value = next;
    }

    function cancelEditing(fieldName: string): void {
      const data: User | null = props.flattenedProfile ?? props.profile ?? null;
      const originalValue: any =
        (data as Record<string, any>)?.[fieldName] ?? (data as any)?.attributes?.[fieldName] ?? '';
      editedValues.value = {...editedValues.value, [fieldName]: originalValue};
      editingFields.value = {...editingFields.value, [fieldName]: false};
      fieldErrors.value = {...fieldErrors.value, [fieldName]: ''};
    }

    async function saveField(schema: ExtendedSchema): Promise<void> {
      if (!props.onUpdate || !schema.name) return;
      const fieldName: string = schema.name;
      const value: any = editedValues.value[fieldName] ?? '';
      const strVal: string = String(value ?? '').trim();
      const fieldLabel: string = schema.displayName || formatLabel(fieldName);

      if (schema.required && !strVal) {
        fieldErrors.value = {
          ...fieldErrors.value,
          [fieldName]: t('userProfile.field.required', `${fieldLabel} is required.`),
        };
        return;
      }

      if (schema.regex && strVal) {
        if (schema.regex.length > 250) {
          console.warn(`Regex pattern for field "${fieldName}" exceeds maximum length limit (250 chars).`);
        } else {
          let reg: RegExp | null | undefined = regexCache.get(schema.regex);
          if (reg === undefined) {
            try {
              reg = new RegExp(schema.regex);
              regexCache.set(schema.regex, reg);
            } catch (err) {
              regexCache.set(schema.regex, null);
              console.warn(`Invalid regular expression syntax in user schema for field "${fieldName}":`, err);
            }
          }
          if (reg && !reg.test(strVal)) {
            fieldErrors.value = {
              ...fieldErrors.value,
              [fieldName]: t('userProfile.field.invalidFormat', `${fieldLabel} has an invalid format.`),
            };
            return;
          }
        }
      }

      fieldErrors.value = {...fieldErrors.value, [fieldName]: ''};
      const submitVal: any = typeof value === 'string' ? strVal : value;
      const payload: Record<string, unknown> = buildPatchValue(
        fieldName,
        submitVal,
        schema.schemaId,
        schema.multiValued,
      );
      // Offer verification once a changed, verifiable email is saved.
      const previousValue: unknown = storedValueOf(storedUser(), fieldName);
      pendingVerification.value =
        slots['verification'] &&
        isVerifiedAfterSave(schema.type) &&
        isVerifiableAttribute(props.userSchema, fieldName) &&
        typeof submitVal === 'string' &&
        submitVal !== '' &&
        submitVal !== previousValue
          ? {name: fieldName, previousValue}
          : null;

      try {
        await props.onUpdate(payload);
        editingFields.value = {...editingFields.value, [fieldName]: false};
        // The row shows the stored value from here on, never the typed one, even if the save failed.
        clearEditedValue(fieldName);
      } catch {
        // Keep field in editing mode on error so user input is preserved
        pendingVerification.value = null;
      }
    }

    function renderVerificationStatus(name: string): VNode {
      const verification: VerifiedAttribute | undefined = reportedVerifiedAttributes()?.[name];
      let verifiedAtText: string | undefined;

      if (verification?.verifiedAt) {
        const verifiedAt: Date = new Date(verification.verifiedAt);
        const date: string = Number.isNaN(verifiedAt.getTime())
          ? verification.verifiedAt
          : verifiedAt.toLocaleString(i18n?.currentLanguage?.value ?? props.preferences?.i18n?.language);
        verifiedAtText = tp('user.verification.status.verified_at', {date});
      }

      const modifier: string = verification ? 'verified' : 'unverified';

      return h(
        'span',
        {
          class: [px('user-profile__verification-status'), px(`user-profile__verification-status--${modifier}`)].join(
            ' ',
          ),
          'data-testid': `thunderid-verification-status-${name}`,
          title: verifiedAtText,
        },
        [
          tp(`user.verification.status.${modifier}`),
          // A title is not reachable by keyboard or touch, so the time is also given as text.
          verifiedAtText ? h('span', {class: px('user-profile__visually-hidden')}, ` (${verifiedAtText})`) : null,
        ],
      );
    }

    // Status of a stored `email` or `mobile` value, for a custom render.
    const verificationStatusOf = (name: string): 'verified' | 'unverified' | null => {
      const verified: Record<string, VerifiedAttribute> | undefined = reportedVerifiedAttributes();
      const stored: unknown = storedValueOf(storedUser(), name);
      if (!verified || !isVerifiableAttribute(props.userSchema, name)) return null;
      if (typeof stored !== 'string' || stored.trim() === '') return null;
      return verified[name] ? 'verified' : 'unverified';
    };

    const verificationRenderProps = (): BaseUserProfileVerificationState => {
      const canVerify = (name: string): boolean =>
        Boolean(props.editable) && !!slots['verification'] && verificationStatusOf(name) === 'unverified';

      return {
        canVerify,
        cancelVerification: (): void => {
          verifyingField.value = null;
        },
        renderVerification: (): VNode | null => {
          const name: string | null = verifyingField.value;
          if (!name) return null;
          return renderVerificationPanel({displayName: props.userSchema?.[name]?.displayName, name});
        },
        verificationStatus: verificationStatusOf,
        verifiedAttributes: reportedVerifiedAttributes(),
        verify: (name: string): void => {
          if (canVerify(name)) verifyingField.value = name;
        },
        verifyingAttribute: verifyingField.value,
      };
    };

    function renderVerificationPanel(schema: ExtendedSchema): VNode | null {
      const name: string | undefined = schema.name;
      if (!slots['verification'] || !name || verifyingField.value !== name) return null;

      return h(
        'div',
        {class: px('user-profile__verification')},
        slots['verification']({
          attribute: name,
          attributeDisplayName: schema.displayName ?? startCase(name),
          onCancel: (): void => {
            verifyingField.value = null;
          },
        } as BaseUserProfileVerificationSlotProps),
      );
    }

    // ── Input rendering per schema type ───────────────────────────────────────

    function renderInput(schema: ExtendedSchema): VNode {
      const fieldName: string = schema.name ?? '';
      const currentValue: any = editedValues.value[fieldName];

      switch (schema.type) {
        case 'DATE_TIME':
          return h(DatePicker, {
            modelValue: String(currentValue ?? ''),
            'onUpdate:modelValue': (v: string) => {
              editedValues.value = {...editedValues.value, [fieldName]: v};
            },
            placeholder: `Enter your ${(schema.displayName || fieldName).toLowerCase()}`,
            required: schema.required,
          });

        case 'BOOLEAN':
          return h(Checkbox, {
            label: schema.displayName || fieldName,
            modelValue: Boolean(currentValue),
            'onUpdate:modelValue': (v: boolean) => {
              editedValues.value = {...editedValues.value, [fieldName]: v};
            },
          });

        default:
          return h(TextField, {
            modelValue: String(currentValue ?? ''),
            'onUpdate:modelValue': (v: string) => {
              editedValues.value = {...editedValues.value, [fieldName]: v};
            },
            placeholder: `Enter your ${(schema.displayName || fieldName).toLowerCase()}`,
            required: schema.required,
          });
      }
    }

    // ── Schema-driven field row ───────────────────────────────────────────────

    function renderSchemaFieldRow(schema: ExtendedSchema): VNode | null {
      const {name, displayName, description, mutability, value} = schema;
      if (!name || !shouldShowField(name)) return null;

      const label: string = displayName || description || formatLabel(name);
      const isReadonly: boolean = mutability === 'READ_ONLY' || READONLY_FIELDS.includes(name);
      const isEditable: boolean = Boolean(props.editable) && !isReadonly;
      const isEditing = Boolean(editingFields.value[name]);
      const hasValue: boolean = value !== undefined && value !== null && value !== '';

      if (!hasValue && !isEditing && !(isEditable && mutability === 'READ_WRITE')) return null;

      // Status describes the stored value, which the row shows whenever it is not being edited: a save
      // keeps the field in edit mode until it settles, then drops the typed value.
      const verified: Record<string, VerifiedAttribute> | undefined = reportedVerifiedAttributes();
      const showsVerificationStatus: boolean =
        verified !== undefined && hasValue && !isEditing && isVerificationType(schema.type);
      // A read-only profile shows the status only.
      const canVerify: boolean =
        Boolean(props.editable) &&
        !!slots['verification'] &&
        showsVerificationStatus &&
        !verified?.[name] &&
        verifyingField.value !== name &&
        isVerifiableAttribute(props.userSchema, name) &&
        typeof value === 'string';

      const editablePlaceholder: VNode | null = isEditable
        ? h(
            'span',
            {class: px('user-profile__field-placeholder'), onClick: () => startEditing(name, value)},
            `Enter your ${label.toLowerCase()}`,
          )
        : null;
      const displayValueNode: VNode | null = hasValue
        ? h('span', {class: px('user-profile__field-value')}, String(value))
        : editablePlaceholder;

      return h('div', {class: px('user-profile__field'), key: name}, [
        h('div', {class: px('user-profile__field-inner')}, [
          h('span', {class: px('user-profile__field-label')}, label),
          isEditing
            ? h('div', {class: px('user-profile__field-edit')}, [
                renderInput(schema),
                fieldErrors.value[name]
                  ? h('div', {class: px('user-profile__field-error')}, fieldErrors.value[name])
                  : null,
              ])
            : displayValueNode,
          showsVerificationStatus ? renderVerificationStatus(name) : null,
        ]),
        canVerify
          ? h('div', {class: px('user-profile__field-actions')}, [
              h(
                Button,
                {
                  class: px('user-profile__verify-button'),
                  color: 'primary' as const,
                  'data-testid': `thunderid-verify-${name}`,
                  onClick: () => {
                    verifyingField.value = name;
                  },
                  size: 'small' as const,
                  variant: 'text' as const,
                },
                () => tp('user.verification.buttons.verify.text'),
              ),
            ])
          : null,
        isEditable && !isReadonly
          ? h('div', {class: px('user-profile__field-actions')}, [
              isEditing
                ? [
                    h(
                      Button,
                      {
                        color: 'primary' as const,
                        onClick: () => saveField(schema),
                        size: 'small' as const,
                        variant: 'solid' as const,
                      },
                      () => t('userProfile.actions.save', 'Save'),
                    ),
                    h(
                      Button,
                      {
                        color: 'secondary' as const,
                        onClick: () => cancelEditing(name),
                        size: 'small' as const,
                        variant: 'solid' as const,
                      },
                      () => t('userProfile.actions.cancel', 'Cancel'),
                    ),
                  ]
                : hasValue
                  ? h(Button, {
                      class: px('user-profile__field-edit-btn'),
                      color: 'secondary' as const,
                      onClick: () => {
                        if (verifyingField.value === name) verifyingField.value = null;
                        startEditing(name, value);
                      },
                      size: 'small' as const,
                      startIcon: h(PencilIcon),
                      title: t('userProfile.actions.edit', 'Edit'),
                      variant: 'ghost' as const,
                    })
                  : null,
            ])
          : null,
      ]);
    }

    // ── Fallback: no schemas ──────────────────────────────────────────────────

    function renderProfileWithoutSchemas(): VNode[] {
      const data: Record<string, any> | null = (props.flattenedProfile || props.profile) as Record<string, any> | null;
      if (!data) return [];

      return Object.entries(data)
        .filter(([key, value]: [string, any]) => {
          if (!shouldShowField(key)) return false;
          return value !== undefined && value !== null && value !== '';
        })
        .sort(([a]: [string, any], [b]: [string, any]) => a.localeCompare(b))
        .map(([key, value]: [string, any]) =>
          h('div', {class: px('user-profile__field'), key}, [
            h('div', {class: px('user-profile__field-inner')}, [
              h('span', {class: px('user-profile__field-label')}, formatLabel(key)),
              h(
                'span',
                {class: px('user-profile__field-value')},
                typeof value === 'object' ? JSON.stringify(value) : String(value),
              ),
            ]),
          ]),
        );
    }

    // ── Hero section ──────────────────────────────────────────────────────────

    function renderHero(currentUser: Record<string, any>): VNode {
      const displayName: string = getDisplayName(DEFAULT_ATTRIBUTE_MAPPINGS, currentUser as User);
      const email: any =
        getMappedUserProfileValue('email', DEFAULT_ATTRIBUTE_MAPPINGS, currentUser as User) ||
        getMappedUserProfileValue('username', DEFAULT_ATTRIBUTE_MAPPINGS, currentUser as User);

      const picture: string | null =
        getMappedUserProfileValue('picture', DEFAULT_ATTRIBUTE_MAPPINGS, currentUser as User) || null;

      const avatarSeed = String(
        currentUser['username'] || currentUser['userName'] || currentUser['email'] || currentUser['sub'] || displayName,
      );
      const avatarGradient: string = getAvatarGradient(avatarSeed);
      const initials: string =
        displayName
          .split(' ')
          .map((w: string) => w.charAt(0))
          .slice(0, 2)
          .join('')
          .toUpperCase() || '?';

      const avatarSizeClass: string = px(`user-profile__avatar--${props.avatarSize ?? 'lg'}`);

      return h('div', {class: px('user-profile__hero')}, [
        h('div', {class: px('user-profile__avatar-wrapper')}, [
          picture
            ? h('img', {
                alt: displayName,
                class: [px('user-profile__avatar'), avatarSizeClass].join(' '),
                src: picture,
              })
            : h(
                'div',
                {class: [px('user-profile__avatar'), avatarSizeClass].join(' '), style: {background: avatarGradient}},
                [h('span', {class: px('user-profile__avatar-initials')}, initials)],
              ),
        ]),
        h('div', {class: px('user-profile__hero-info')}, [
          h('span', {class: px('user-profile__hero-name')}, displayName),
          email ? h('span', {class: px('user-profile__hero-subtitle')}, String(email)) : null,
        ]),
      ]);
    }

    // ── Main render ───────────────────────────────────────────────────────────

    return (): VNode | VNode[] | null => {
      const data: User | null = props.flattenedProfile ?? props.profile ?? null;

      if (!data && !props.isLoading) {
        return slots['default']
          ? slots['default']({
              error: props.error,
              isLoading: props.isLoading,
              profile: null,
              ...verificationRenderProps(),
            })
          : null;
      }

      if (slots['default']) {
        return slots['default']({
          error: props.error,
          isLoading: props.isLoading,
          profile: data,
          ...verificationRenderProps(),
        });
      }

      const currentUser: Record<string, any> = data as Record<string, any>;
      const schemas: ExtendedSchema[] = (props.schemas ?? []) as ExtendedSchema[];
      const hasSchemas: boolean = schemas.length > 0;

      const rootClasses: string = [
        px('user-profile'),
        props.compact ? px('user-profile--compact') : '',
        props.className ?? '',
      ]
        .filter(Boolean)
        .join(' ');

      const children: VNode[] = [];

      // Hero
      if (props.showAvatar !== false && currentUser) {
        children.push(renderHero(currentUser));
      }

      // Error alert
      if (props.error) {
        children.push(h(Alert, {class: px('user-profile__error'), severity: 'error' as const}, () => props.error));
      }

      // Fields
      if (props.isLoading) {
        children.push(h('div', {class: px('user-profile__loading')}, [h(Spinner)]));
      } else if (props.userSchema && typeof props.userSchema === 'object' && Object.keys(props.userSchema).length > 0) {
        const metaSchemas: ExtendedSchema[] = Object.entries(props.userSchema)
          .filter(([key, metaAttr]: [string, AttributeSchema]) => {
            if (metaAttr?.credential) return false;
            return shouldShowField(key, true);
          })
          .map(([key, metaAttr]: [string, AttributeSchema]) => {
            const val =
              editedValues.value?.[key] ?? (currentUser as any)?.attributes?.[key] ?? (currentUser as any)?.[key] ?? '';
            const isReadonly =
              metaAttr.readOnly === true || metaAttr.mutability === 'READ_ONLY' || READONLY_FIELDS.includes(key);

            return {
              displayName: metaAttr.displayName ?? (key ? startCase(key) : ''),
              mutability: isReadonly ? 'READ_ONLY' : 'READ_WRITE',
              name: key,
              regex: metaAttr.regex,
              required: !!metaAttr.required,
              type: (metaAttr.type ?? 'STRING').toUpperCase(),
              value: val,
            };
          });

        const fieldRows: VNode[] = metaSchemas
          .map((schema: ExtendedSchema) => {
            const row: VNode | null = renderSchemaFieldRow(schema);
            const panel: VNode | null = row ? renderVerificationPanel(schema) : null;
            return panel ? h(Fragment, {key: schema.name}, [row, panel]) : row;
          })
          .filter((node: VNode | null): node is VNode => node !== null);

        children.push(h('div', {class: px('user-profile__fields')}, fieldRows));
      } else if (hasSchemas) {
        const fieldRows: VNode[] = schemas
          .filter((s: ExtendedSchema) => s.name && shouldShowField(s.name))
          .sort((a: ExtendedSchema, b: ExtendedSchema) => {
            const orderA: number = a.displayOrder ? parseInt(a.displayOrder, 10) : 999;
            const orderB: number = b.displayOrder ? parseInt(b.displayOrder, 10) : 999;
            return orderA - orderB;
          })
          .map((schema: ExtendedSchema) => {
            const value: any = currentUser && schema.name ? currentUser[schema.name] : undefined;
            return renderSchemaFieldRow({...schema, value});
          })
          .filter((node: VNode | null): node is VNode => node !== null);

        children.push(h('div', {class: px('user-profile__fields')}, fieldRows));
      } else {
        children.push(h('div', {class: px('user-profile__fields')}, renderProfileWithoutSchemas()));
      }

      if (slots['footer']) {
        children.push(h('div', {class: px('user-profile__footer')}, slots['footer']()));
      }

      if (props.cardLayout) {
        return h(Card, {class: rootClasses, variant: props.cardVariant ?? 'elevated'}, () => children);
      }

      return h('div', {class: rootClasses}, children);
    };
  },
});

export default BaseUserProfile;

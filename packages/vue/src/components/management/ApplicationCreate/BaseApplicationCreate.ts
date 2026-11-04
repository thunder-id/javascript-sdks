// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  APPLICATION_GRANT_TYPES,
  type ApplicationSubmission,
  DEFAULT_APPLICATION_GRANT_TYPES,
  isApplicationSubmissionValid,
  parseRedirectUris,
  type SelectOption,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  ref,
  useId,
} from 'vue';
import {type AdminFormProps, type AdminFormRenderProps, adminFormProps} from '../shared/adminFormProps';
import AdminSection from '../shared/AdminSection';
import ClientSecretNotice from '../shared/ClientSecretNotice';
import renderAdminForm from '../shared/renderAdminForm';
import renderApplicationFields, {
  type ApplicationFormValues,
  type ApplicationTextField,
} from '../shared/renderApplicationFields';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * The application `BaseApplicationCreate` emits on `submit`. The organization unit is added by the caller.
 */
export type ApplicationCreateSubmission = ApplicationSubmission;

type BaseApplicationCreateProps = AdminFormProps &
  Readonly<{clientSecret: string | null; onSecretDismiss: (() => void) | undefined}>;

/**
 * What `BaseApplicationCreate` hands its default scoped slot, so the form can be built with any UI.
 */
export interface BaseApplicationCreateRenderProps extends AdminFormRenderProps {
  /** The client secret of the application just created, to show once. `null` while there is none. */
  clientSecret: string | null;
  /** The grant types to choose from, with translated labels. */
  grantTypeOptions: SelectOption[];
  /** Sets the chosen grant types. */
  handleGrantTypesChange: (grantTypes: string[]) => void;
  /** Sets one text field of the form. `redirectUris` takes URIs separated by commas. */
  handleInputChange: (field: ApplicationTextField, value: string) => void;
  /** Sets whether the client is public. */
  handlePublicClientChange: (publicClient: boolean) => void;
  /** Hides the client secret once it has been copied. Undefined while there is no secret. */
  onSecretDismiss?: () => void;
  values: ApplicationFormValues;
}

/**
 * A form that collects a new application's name, description, links and OAuth basics: redirect URIs,
 * grant types and whether the client is public. Holds no data of its own: handle the `submit` event,
 * which carries an {@link ApplicationCreateSubmission}, and pass back the client secret the server
 * returned as `clientSecret` to show it once. Slots: `default`, a scoped slot that replaces the form
 * with custom UI and receives {@link BaseApplicationCreateRenderProps}.
 */
const BaseApplicationCreate: Component = defineComponent({
  name: 'BaseApplicationCreate',
  props: {
    ...adminFormProps,
    /**
     * The client secret of the application just created. When set, the form gives way to the secret,
     * which can be read only this once, until `onSecretDismiss` clears it.
     */
    clientSecret: {default: null, type: String as PropType<string | null>},
    /** Called when the user has copied the client secret. Also available as `@secret-dismiss`. */
    onSecretDismiss: {default: undefined, type: Function as PropType<() => void>},
  },
  emits: ['submit'],
  setup(props: BaseApplicationCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const values: Ref<ApplicationFormValues> = ref({
      description: '',
      grantTypes: [...DEFAULT_APPLICATION_GRANT_TYPES],
      logoUrl: '',
      name: '',
      publicClient: false,
      redirectUris: '',
      url: '',
    });

    const setInput = (field: ApplicationTextField, value: string): void => {
      values.value = {...values.value, [field]: value};
    };
    const setGrantTypes = (grantTypes: string[]): void => {
      values.value = {...values.value, grantTypes};
    };
    const setPublicClient = (publicClient: boolean): void => {
      values.value = {...values.value, publicClient};
    };

    return (): VNode => {
      const current: ApplicationFormValues = values.value;
      const submission: ApplicationCreateSubmission = {
        description: current.description.trim() || undefined,
        grantTypes: current.grantTypes,
        logoUrl: current.logoUrl.trim() || undefined,
        name: current.name.trim(),
        publicClient: current.publicClient,
        redirectUris: parseRedirectUris(current.redirectUris),
        url: current.url.trim() || undefined,
      };

      if (props.clientSecret && !slots['default']) {
        return h(
          AdminSection,
          {
            block: 'application-create',
            className: props.className,
            description: props.description,
            title: props.title ?? t('admin.applications.create.title'),
          },
          {
            default: (): VNode =>
              h(ClientSecretNotice, {onDismiss: props.onSecretDismiss, secret: props.clientSecret!, t}),
          },
        );
      }

      return renderAdminForm({
        block: 'application-create',
        canSubmit: isApplicationSubmissionValid(submission),
        fields: renderApplicationFields({
          onGrantTypesChange: setGrantTypes,
          onInputChange: setInput,
          onPublicClientChange: setPublicClient,
          t,
          uid,
          values: current,
        }),
        onSubmit: (): void => {
          emit('submit', submission);
        },
        props,
        renderProps: {
          clientSecret: props.clientSecret,
          grantTypeOptions: APPLICATION_GRANT_TYPES.map((grantType: string) => ({
            label: t(`admin.applications.grant_types.${grantType}`),
            value: grantType,
          })),
          handleGrantTypesChange: setGrantTypes,
          handleInputChange: setInput,
          handlePublicClientChange: setPublicClient,
          onSecretDismiss: props.clientSecret ? props.onSecretDismiss : undefined,
          values: current,
        } satisfies Omit<BaseApplicationCreateRenderProps, keyof AdminFormRenderProps>,
        slot: slots['default'],
        submitLabel: t('admin.applications.create.submit'),
        t,
        title: t('admin.applications.create.title'),
      });
    };
  },
});

export default BaseApplicationCreate;

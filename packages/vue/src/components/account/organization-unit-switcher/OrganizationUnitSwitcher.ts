// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AccessibleOrganizationUnit,
  type AccessibleOrganizationUnitList,
  type AccessibleOrganizationUnitScope,
  OrganizationUnitSwitchErrorCodes,
  type Preferences,
  resolveResourceEndpoint,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  onMounted,
  ref,
  watch,
} from 'vue';
import BaseOrganizationUnitSwitcher from './BaseOrganizationUnitSwitcher';
import getAccessibleOrganizationUnits from '../../../api/account/getAccessibleOrganizationUnits';
import useThunderID from '../../../composables/useThunderID';
import useAdminTranslation, {type AdminTranslate} from '../../management/shared/useAdminTranslation';

type OrganizationUnitSwitcherProps = Readonly<{
  className: string;
  limit: number;
  onSelect: ((unit: AccessibleOrganizationUnit) => void) | undefined;
  preferences: Preferences | undefined;
  scope: AccessibleOrganizationUnitScope | undefined;
  title: string | undefined;
}>;

/**
 * Translation key for a failed switch, from the switch error's code.
 */
const switchErrorKey = (error: unknown): string => {
  const code: unknown = (error as {code?: unknown} | null)?.code;

  if (code === OrganizationUnitSwitchErrorCodes.UnauthorizedClient) {
    return 'organization_unit.switcher.error.unauthorized';
  }

  if (code === OrganizationUnitSwitchErrorCodes.InteractionRequired) {
    return 'organization_unit.switcher.error.interaction_required';
  }

  return 'organization_unit.switcher.error.switch';
};

/**
 * Shows the current organization unit in a field that opens a menu of the units the signed-in user can
 * access (`/users/me/ous`), and switches to the one picked through `switchOrganizationUnit`: the server reuses the SSO session, so
 * normally no credentials are asked. A failed switch leaves the session as it was and shows a translated
 * message. Pass `onSelect` (or `@select`) to take over the switch yourself.
 *
 * The default scoped slot replaces the built-in UI and receives `OrganizationUnitSwitcherRenderProps`.
 * Emits `switch` with the unit after a successful switch.
 */
const OrganizationUnitSwitcher: Component = defineComponent({
  name: 'OrganizationUnitSwitcher',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Page size. */
    limit: {default: 10, type: Number},
    /** Takes over the switch: called with the chosen unit instead of switching. */
    onSelect: {default: undefined, type: Function as PropType<(unit: AccessibleOrganizationUnit) => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Narrows the list relative to the current unit: `siblings`. Omit to list every accessible unit. */
    scope: {default: undefined, type: String as PropType<AccessibleOrganizationUnitScope>},
    /** Overrides the small label above the current unit. An empty string omits it. */
    title: {default: undefined, type: String},
  },
  emits: ['switch'],
  setup(props: OrganizationUnitSwitcherProps, {emit, slots}: SetupContext): () => VNode {
    const {baseUrl, endpoints, instanceId, currentOrganizationUnit, switchOrganizationUnit} = useThunderID();
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);

    const organizationUnits: Ref<AccessibleOrganizationUnit[]> = ref([]);
    const current: Ref<string | null> = ref(null);
    const totalResults: Ref<number> = ref(0);
    const offset: Ref<number> = ref(0);
    const isLoading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);
    const switchingId: Ref<string | null> = ref(null);

    let request = 0;

    const load = async (): Promise<void> => {
      request += 1;
      const thisRequest: number = request;

      isLoading.value = true;
      error.value = null;

      try {
        const list: AccessibleOrganizationUnitList = await getAccessibleOrganizationUnits({
          baseUrl,
          instanceId,
          limit: props.limit,
          offset: offset.value,
          scope: props.scope,
          url: resolveResourceEndpoint('usersMeOrganizationUnits', {endpoints}),
        });

        if (thisRequest !== request) {
          return;
        }

        organizationUnits.value = list.organizationUnits;
        totalResults.value = list.totalResults;
        current.value = list.current !== '' ? list.current : (currentOrganizationUnit?.value?.id ?? null);
      } catch {
        if (thisRequest === request) {
          error.value = t('organization_unit.switcher.error.load');
        }
      } finally {
        if (thisRequest === request) {
          isLoading.value = false;
        }
      }
    };

    const onPageChange = (nextOffset: number): void => {
      offset.value = nextOffset;
      void load();
    };

    const onSwitch = async (unit: AccessibleOrganizationUnit): Promise<void> => {
      if (props.onSelect) {
        props.onSelect(unit);
        return;
      }

      error.value = null;
      switchingId.value = unit.id;

      try {
        await switchOrganizationUnit(unit.id);
        current.value = unit.id;
        emit('switch', unit);
      } catch (caught: unknown) {
        error.value = t(switchErrorKey(caught), {name: unit.name});
      } finally {
        switchingId.value = null;
      }
    };

    onMounted(() => {
      void load();
    });

    watch(
      () => [props.scope, props.limit],
      () => {
        offset.value = 0;
        void load();
      },
    );

    return (): VNode =>
      h(
        BaseOrganizationUnitSwitcher,
        {
          class: withVendorCSSClassPrefix('organization-unit-switcher--styled'),
          className: props.className,
          current: current.value,
          // The session's unit names the field when the page does not list the current unit.
          currentName:
            currentOrganizationUnit?.value?.id === current.value
              ? (currentOrganizationUnit?.value?.name ?? null)
              : null,
          error: error.value,
          isLoading: isLoading.value,
          limit: props.limit,
          offset: offset.value,
          onPageChange,
          onSwitch,
          organizationUnits: organizationUnits.value,
          preferences: props.preferences,
          switchingId: switchingId.value,
          title: props.title,
          totalResults: totalResults.value,
        },
        slots['default'] ? {default: slots['default']} : undefined,
      );
  },
});

export default OrganizationUnitSwitcher;

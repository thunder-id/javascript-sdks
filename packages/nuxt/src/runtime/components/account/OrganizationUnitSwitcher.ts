// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AccessibleOrganizationUnit,
  type AccessibleOrganizationUnitList,
  type AccessibleOrganizationUnitScope,
  type Preferences,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {BaseOrganizationUnitSwitcher, useI18n} from '@thunderid/vue';
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
import NuxtAPIRoutes from '../../constants/NuxtAPIRoutes';
import {useThunderID} from '#imports';

type OrganizationUnitSwitcherProps = Readonly<{
  className: string;
  limit: number;
  onSelect: ((unit: AccessibleOrganizationUnit) => void) | undefined;
  preferences: Preferences | undefined;
  scope: AccessibleOrganizationUnitScope | undefined;
  title: string | undefined;
}>;

/**
 * Nuxt-specific OrganizationUnitSwitcher container.
 *
 * Lists the units through `GET /api/auth/user/organization-units` (`NuxtAPIRoutes.USER_ORGANIZATION_UNITS`),
 * which reads `/users/me/ous` with the server-held session, so the access token never reaches the browser.
 * Switching goes through the context's `switchOrganizationUnit`, which exchanges the session's device secret on
 * the server and stays on the page. Without one, it sends the page to the sign-in route bounded to the unit; the
 * server reuses the SSO session, and the callback replaces the session only when it succeeds. Pass `onSelect`
 * (or `@select`) to take over the switch.
 *
 * Renders {@link BaseOrganizationUnitSwitcher} from `@thunderid/vue`, with the same props, events and default
 * scoped slot as the Vue SDK's `OrganizationUnitSwitcher`.
 */
const OrganizationUnitSwitcher: Component = defineComponent({
  name: 'OrganizationUnitSwitcher',
  props: {
    className: {default: '', type: String},
    limit: {default: 10, type: Number},
    onSelect: {default: undefined, type: Function as PropType<(unit: AccessibleOrganizationUnit) => void>},
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    scope: {default: undefined, type: String as PropType<AccessibleOrganizationUnitScope>},
    title: {default: undefined, type: String},
  },
  emits: ['switch'],
  setup(props: OrganizationUnitSwitcherProps, {emit, slots}: SetupContext): () => VNode {
    const {currentOrganizationUnit, switchOrganizationUnit} = useThunderID();
    const {t} = useI18n();

    const organizationUnits: Ref<AccessibleOrganizationUnit[]> = ref([]);
    const current: Ref<string | null> = ref(null);
    const totalResults: Ref<number> = ref(0);
    const offset: Ref<number> = ref(0);
    const isLoading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);
    const switchingId: Ref<string | null> = ref(null);

    const load = async (): Promise<void> => {
      isLoading.value = true;
      error.value = null;

      try {
        const list: AccessibleOrganizationUnitList = await $fetch<AccessibleOrganizationUnitList>(
          NuxtAPIRoutes.USER_ORGANIZATION_UNITS,
          {query: {limit: props.limit, offset: offset.value, ...(props.scope ? {scope: props.scope} : {})}},
        );

        organizationUnits.value = list.organizationUnits;
        totalResults.value = list.totalResults;
        current.value = list.current !== '' ? list.current : (currentOrganizationUnit?.value?.id ?? null);
      } catch {
        error.value = t('organization_unit.switcher.error.load');
      } finally {
        isLoading.value = false;
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
      } catch {
        error.value = t('organization_unit.switcher.error.switch', {name: unit.name});
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
        slots.default ? {default: slots.default} : undefined,
      );
  },
});

export default OrganizationUnitSwitcher;

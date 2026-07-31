<script lang="ts">
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
   * Unless required by applicable law or agreed to in writing,
   * software distributed under the License is distributed on an
   * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
   * KIND, either express or implied. See the License for the
   * specific language governing permissions and limitations
   * under the License.
   */

  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children?: import('svelte').Snippet<[{profile: Record<string, any> | null; user: any | null}]>;
  }

  let {children}: Props = $props();

  const tid = useThunderID();
</script>

{#if children}
  {@render children({profile: tid.userProfile, user: tid.user})}
{:else}
  <div class="tid-user-profile" role="region" aria-label={tid.t('userProfile.empty')}>
    {#if tid.user}
      <div class="tid-user-profile__name" role="status" aria-live="polite">{tid.user['displayName'] ?? tid.user['userName'] ?? tid.t('user.displayName')}</div>
      {#if tid.user['emails']?.length}
        <div class="tid-user-profile__email">{tid.user['emails'][0]}</div>
      {/if}
    {:else}
      <div class="tid-user-profile__empty">{tid.t('userProfile.empty')}</div>
    {/if}
  </div>
{/if}

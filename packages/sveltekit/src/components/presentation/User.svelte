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
    children?: import('svelte').Snippet<[{user: any | null; isSignedIn: boolean}]>;
  }

  let {children}: Props = $props();

  const tid = useThunderID();

  let userData = $derived(tid.user ?? tid.userProfile?.flattenedProfile ?? null);
  let signedIn = $derived(tid.isSignedIn);
</script>

{#if children}
  {@render children({user: userData, isSignedIn: signedIn})}
{:else if signedIn && userData}
  <div class="tid-user" role="status" aria-live="polite">
    <span class="tid-user__name">{userData['displayName'] ?? userData['userName'] ?? tid.t('user.displayName')}</span>
  </div>
{:else}
  <div class="tid-user tid-user--signed-out" role="status" aria-live="polite">{tid.t('user.notSignedIn')}</div>
{/if}

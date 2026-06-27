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

  import {ThunderIDRuntimeError} from '@thunderid/browser';
  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children?: import('svelte').Snippet;
  }

  let {children}: Props = $props();

  const {signOut} = useThunderID();

  let loading = $state(false);

  async function handleClick(): Promise<void> {
    try {
      loading = true;
      await signOut();
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Sign out failed: ${error instanceof Error ? error.message : String(error)}`,
        'SignOutButton-handleSignOut-RuntimeError-001',
        'svelte',
        'Something went wrong while trying to sign out. Please try again later.',
      );
    } finally {
      loading = false;
    }
  }
</script>

<button disabled={loading} type="button" onclick={handleClick}>
  {#if children}
    {@render children()}
  {:else}
    Sign Out
  {/if}
</button>

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
    children?: import('svelte').Snippet<[{signUp: () => Promise<void>; loading: boolean}]>;
    signUpOptions?: Record<string, unknown>;
  }

  let {children, signUpOptions = undefined}: Props = $props();

  const tid = useThunderID();

  let loading = $state(false);
  let error = $state<string | null>(null);

  async function handleSignUp(): Promise<void> {
    loading = true;
    error = null;
    try {
      await tid.signUp(signUpOptions);
    } catch (err: unknown) {
      error = (err as any)?.message ?? String(err);
    } finally {
      loading = false;
    }
  }
</script>

{#if children}
  {@render children({signUp: handleSignUp, loading})}
{:else}
  <div class="tid-signup" role="region" aria-label={tid.t('signUp.title')}>
    <h2 class="tid-signup__title">{tid.t('signUp.title')}</h2>
    {#if error}
      <div class="tid-signup__error" role="alert" aria-live="assertive">{tid.t('signUp.error', {error: error ?? ''})}</div>
    {/if}
    <button class="tid-signup__button" disabled={loading} onclick={handleSignUp} aria-busy={loading || undefined}>
      {loading ? tid.t('signUp.loading') : tid.t('signUp.button')}
    </button>
  </div>
{/if}

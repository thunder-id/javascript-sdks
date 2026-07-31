<script lang="ts">
  import BaseLanguageSwitcher from './BaseLanguageSwitcher.svelte';
  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children?: import('svelte').Snippet<[{currentLanguage: string; switchLanguage: (lang: string) => void; languages: string[]}]>;
    languages?: string[];
  }

  let {children: customChildren, languages = undefined}: Props = $props();

  const tid = useThunderID();
</script>

<BaseLanguageSwitcher {languages}>
  {#snippet children({currentLanguage, switchLanguage, languages})}
    {#if customChildren}
      {@render customChildren({currentLanguage, switchLanguage, languages})}
    {:else}
      <select class="tid-language-switcher" aria-label="Language" value={currentLanguage} onchange={(e) => { switchLanguage((e.target as HTMLSelectElement).value); }}>
        {#each languages as lang}
          <option value={lang}>{lang}</option>
        {/each}
      </select>
    {/if}
  {/snippet}
</BaseLanguageSwitcher>

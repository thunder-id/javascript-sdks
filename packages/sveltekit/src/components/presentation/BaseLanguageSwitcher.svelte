<script lang="ts">
  interface Props {
    children: import('svelte').Snippet<[{currentLanguage: string; switchLanguage: (lang: string) => void; languages: string[]}]>;
    languages?: string[];
  }

  let {children, languages = ['en']}: Props = $props();

  let currentLanguage = $state('en');

  function switchLanguage(lang: string): void {
    currentLanguage = lang;
  }
</script>

{@render children({currentLanguage, switchLanguage, languages})}

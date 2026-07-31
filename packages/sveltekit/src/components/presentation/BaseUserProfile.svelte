<script lang="ts">
  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children: import('svelte').Snippet<[{profile: any | null; user: any | null}]>;
  }

  let {children}: Props = $props();

  const tid = useThunderID();
</script>

{@render children({profile: tid.userProfile, user: tid.user})}

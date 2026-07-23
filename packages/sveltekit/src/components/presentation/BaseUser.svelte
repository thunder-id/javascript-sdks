<script lang="ts">
  import {useThunderID} from '../../composables/useThunderID';

  interface Props {
    children: import('svelte').Snippet<[{user: any | null; isSignedIn: boolean}]>;
  }

  let {children}: Props = $props();

  const tid = useThunderID();

  let userData = $derived(tid.user ?? tid.userProfile?.flattenedProfile ?? null);
  let signedIn = $derived(tid.isSignedIn);
</script>

{@render children({user: userData, isSignedIn: signedIn})}

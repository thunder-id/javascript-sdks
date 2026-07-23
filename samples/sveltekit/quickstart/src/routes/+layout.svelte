<script lang="ts">
	import {ThunderID} from '@thunderid/sveltekit';
	import AppShell from '$lib/AppShell.svelte';

	let {children, data} = $props();
	let ssrData = $derived(data?.thunderid);
</script>

<ThunderID {ssrData}>
	<AppShell>
		{@render children()}
	</AppShell>
</ThunderID>

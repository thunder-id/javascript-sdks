<script lang="ts">
	import {SignedIn, SignedOut, useThunderID, UserDropdown, LanguageSwitcher, BaseSignInButton} from '@thunderid/sveltekit';
	import {onMount} from 'svelte';
	import {on, off} from '@thunderid/sveltekit';
	import {SDKEvent} from '@thunderid/sveltekit';

	let {children} = $props();

	const tid = useThunderID();

	let eventLog: string[] = $state([]);
	const eventListeners: Array<{event: SDKEvent; listener: (data?: unknown) => void}> = [];

	onMount(() => {
		const events = [SDKEvent.SIGN_IN, SDKEvent.SIGN_IN_FAILED, SDKEvent.SIGN_OUT, SDKEvent.TOKEN_REFRESHED, SDKEvent.TOKEN_REFRESH_FAILED, SDKEvent.INITIALIZED];
		for (const evt of events) {
			const listener = (data?: unknown) => {
				eventLog = [`${evt}: ${JSON.stringify(data)}`, ...eventLog].slice(0, 20);
			};
			eventListeners.push({event: evt, listener});
			on(evt, listener);
		}
		return () => {
			for (const {event, listener} of eventListeners) {
				off(event, listener);
			}
		};
	});
</script>

<nav>
	<a href="/">Home</a> |
	<a href="/protected">Protected</a>

	<span style="float: right;">
		<LanguageSwitcher />

		<SignedIn>
			<UserDropdown />
		</SignedIn>

		<SignedOut>
			<BaseSignInButton>
				{#snippet children({loading, handleClick})}
					<button onclick={handleClick} disabled={loading}>
						{loading ? 'Signing in...' : 'Custom Sign In'}
					</button>
				{/snippet}
			</BaseSignInButton>
		</SignedOut>
	</span>
</nav>
<hr />

{#if eventLog.length > 0}
	<details>
		<summary>SDK Events ({eventLog.length})</summary>
		<pre style="font-size: 0.75rem; max-height: 150px; overflow: auto;">
{#each eventLog as evt}{evt}
{/each}</pre>
	</details>
	<hr />
{/if}

{@render children()}

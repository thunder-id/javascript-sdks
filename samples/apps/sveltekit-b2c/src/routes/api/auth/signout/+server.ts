import {THUNDERID_BASE_URL, THUNDERID_CLIENT_ID, THUNDERID_CLIENT_SECRET, THUNDERID_SESSION_SECRET} from '$env/static/private';
import {createSignOutHandler} from '@thunderid/sveltekit/server';

export const GET = createSignOutHandler({
	baseUrl: THUNDERID_BASE_URL,
	clientId: THUNDERID_CLIENT_ID,
	clientSecret: THUNDERID_CLIENT_SECRET,
	sessionSecret: THUNDERID_SESSION_SECRET,
	afterSignOutUrl: '/',
});

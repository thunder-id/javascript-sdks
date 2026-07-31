import {requireServerSession} from '@thunderid/sveltekit/server';
import {redirect} from '@sveltejs/kit';
import {isGuardRedirect} from '@thunderid/sveltekit/server';
import type {PageServerLoad} from './$types';

export const load: PageServerLoad = (event) => {
	try {
		const ssrData = requireServerSession(event, '/api/auth/signin');
		return {
			user: ssrData.user,
			session: ssrData.session,
		};
	} catch (e) {
		if (isGuardRedirect(e)) {
			throw redirect(e.status, e.location);
		}
		throw e;
	}
};

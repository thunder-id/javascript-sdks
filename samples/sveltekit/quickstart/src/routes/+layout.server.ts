import {loadThunderID} from '@thunderid/sveltekit/server';
import type {LayoutServerLoad} from './$types';

export const load: LayoutServerLoad = (event) => {
	return {thunderid: loadThunderID(event)};
};

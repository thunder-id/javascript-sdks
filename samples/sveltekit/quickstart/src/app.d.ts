import type {ThunderIDSSRData} from '@thunderid/sveltekit';

declare global {
	namespace App {
		interface Locals {
			thunderid: ThunderIDSSRData;
		}
	}
}

export {};

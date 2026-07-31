import type {RequestEvent} from '@sveltejs/kit';
import type {ThunderIDSSRData} from '../models/session';

export function loadThunderID(event: RequestEvent): ThunderIDSSRData {
  return event.locals.thunderid;
}

import {ThunderIDJavaScriptClient} from '@thunderid/node';
import type {ThunderIDSvelteKitConfig} from './config';

let cachedClient: ThunderIDJavaScriptClient | null = null;

export async function getClient(config: ThunderIDSvelteKitConfig): Promise<ThunderIDJavaScriptClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const client = new ThunderIDJavaScriptClient();
  await client.initialize(config as any);
  cachedClient = client;
  return cachedClient;
}

export function resetClient(): void {
  cachedClient = null;
}

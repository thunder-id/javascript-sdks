import {
  type Schema,
  getSchemas as baseGetSchemas,
  type GetSchemasConfig as BaseGetSchemasConfig,
} from '@thunderid/node';

export interface GetSchemasConfig extends Omit<BaseGetSchemasConfig, 'fetcher'> {
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
}

const getSchemas = async ({fetcher, ...requestConfig}: GetSchemasConfig): Promise<Schema[]> => {
  const defaultFetcher = async (url: string, config: RequestInit): Promise<Response> => {
    const response: globalThis.Response = await fetch(url, config);
    const data: unknown = await response.json();
    return {
      json: () => Promise.resolve(data),
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
    } as Response;
  };

  return baseGetSchemas({
    ...requestConfig,
    fetcher: fetcher || defaultFetcher,
  });
};

export default getSchemas;

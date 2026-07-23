import {
  type User,
  getScim2Me as baseGetScim2Me,
  type GetScim2MeConfig as BaseGetScim2MeConfig,
} from '@thunderid/node';

export interface GetScim2MeConfig extends Omit<BaseGetScim2MeConfig, 'fetcher'> {
  fetcher?: (url: string, config: RequestInit) => Promise<Response>;
}

const getScim2Me = async ({fetcher, ...requestConfig}: GetScim2MeConfig): Promise<User> => {
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

  return baseGetScim2Me({
    ...requestConfig,
    fetcher: fetcher || defaultFetcher,
  });
};

export default getScim2Me;

export interface HTTPResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

export interface HTTPAdapter {
  request(method: string, url: string, headers?: Record<string, string>, body?: unknown): Promise<HTTPResponse>;
}

export class DefaultHTTPAdapter implements HTTPAdapter {
  async request(
    method: string,
    url: string,
    headers?: Record<string, string>,
    body?: unknown,
  ): Promise<HTTPResponse> {
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response: Response = await fetch(url, init);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value: string, key: string) => {
      responseHeaders[key] = value;
    });

    return {
      body: await response.text(),
      headers: responseHeaders,
      statusCode: response.status,
    };
  }
}

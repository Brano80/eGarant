export type ApiOptions = {
  json?: any;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
};

export const api = {
  post: (url: string, opts?: ApiOptions) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(opts?.headers || {}),
    };
    const init: RequestInit = {
      method: 'POST',
      headers,
      body: opts?.json ? JSON.stringify(opts.json) : undefined,
      credentials: opts?.credentials ?? 'same-origin',
    };
    return fetch(url, init);
  },
  get: (url: string, opts?: ApiOptions) => {
    const init: RequestInit = {
      method: 'GET',
      headers: opts?.headers,
      credentials: opts?.credentials ?? 'same-origin',
    };
    return fetch(url, init);
  },
};

export default api;

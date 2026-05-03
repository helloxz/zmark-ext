import { baseUrlStorage, tokenStorage } from '@/utils/storage';

const REQUEST_TIMEOUT_MS = 90_000;

export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T;
}

export interface RequestOptions extends RequestInit {
  auth?: boolean;
}

function joinUrl(baseUrl: string, path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

export async function requestRaw(path: string, options: RequestOptions = {}) {
  const { auth = true, headers, signal, ...init } = options;
  const [baseUrl, token] = await Promise.all([
    baseUrlStorage.getValue(),
    auth ? tokenStorage.getValue() : Promise.resolve(''),
  ]);

  const url = joinUrl(baseUrl, path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, REQUEST_TIMEOUT_MS);

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
  }

  const requestHeaders = new Headers(headers);

  if (auth && token.trim()) {
    requestHeaders.set('Authorization', `Bearer ${token.trim()}`);
  }

  try {
    return await fetch(url, {
      ...init,
      headers: requestHeaders,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await requestRaw(path, options);

  if (response.status !== 200) {
    const statusDetail = response.statusText ? ` ${response.statusText}` : '';
    throw new Error(`请求失败 (HTTP ${response.status}${statusDetail})`);
  }

  let result: ApiResponse<T>;

  try {
    result = await response.json() as ApiResponse<T>;
  } catch {
    throw new Error('响应格式不正确');
  }

  if (result.code !== 200) {
    throw new Error(result.msg || '请求失败');
  }

  return result.data;
}

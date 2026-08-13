/**
 * HTTP client for the ItemIQ API.
 *
 * In development Vite proxies /api to the FastAPI server on :8000; in
 * production FastAPI serves this bundle itself, so the same relative base
 * works in both. Set VITE_API_URL to point at a different host.
 */

const BASE = import.meta.env.VITE_API_URL ?? '/api';
const TOKEN_KEY = 'itemiq-token';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The session is gone or expired — the caller should send the user to login. */
  get isAuthError() {
    return this.status === 401;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the ItemIQ server. Is the backend running?');
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const payload = text ? safeParse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(payload) ?? res.statusText);
  }
  return payload as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** FastAPI reports errors as `detail`, which is a string or a validation array. */
function extractMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return typeof payload === 'string' ? payload : null;
  const detail = (payload as { detail?: unknown }).detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined;
    if (first?.msg) {
      const field = Array.isArray(first.loc) ? first.loc.at(-1) : undefined;
      return field ? `${field}: ${first.msg}` : first.msg;
    }
  }
  return null;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all',
  );
  if (entries.length === 0) return '';
  return `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString()}`;
}

/** POST a file as multipart/form-data. The browser sets the boundary itself,
 *  so Content-Type is deliberately left unset.
 *  Accepts a single File or a pre-built FormData for multi-file uploads. */
async function upload<T>(path: string, fileOrForm: File | FormData): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const form = fileOrForm instanceof FormData ? fileOrForm : (() => {
    const fd = new FormData();
    fd.append('file', fileOrForm);
    return fd;
  })();

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: form });
  } catch {
    throw new ApiError(0, 'Cannot reach the ItemIQ server. Is the backend running?');
  }

  const text = await res.text();
  const payload = text ? safeParse(text) : null;
  if (!res.ok) throw new ApiError(res.status, extractMessage(payload) ?? res.statusText);
  return payload as T;
}

/**
 * Fetch a generated document and hand it to the browser as a download.
 *
 * Not a plain link, because the endpoint needs the bearer token and an anchor
 * cannot carry one. The object URL is revoked immediately after the click —
 * the blob is already in the download queue by then.
 */
async function download(path: string, fallbackName: string): Promise<void> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the ItemIQ server. Is the backend running?');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, extractMessage(safeParse(text)) ?? res.statusText);
  }

  const disposition = res.headers.get('content-disposition') ?? '';
  const named = /filename="?([^"]+)"?/.exec(disposition);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = named?.[1] ?? fallbackName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function getBlob(path: string): Promise<Blob> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { headers });
  } catch {
    throw new ApiError(0, 'Cannot reach the ItemIQ server. Is the backend running?');
  }
  if (!res.ok) {
    const text = await res.text();
    throw new ApiError(res.status, extractMessage(safeParse(text)) ?? res.statusText);
  }
  return res.blob();
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body ?? {}),
  del: <T>(path: string) => request<T>('DELETE', path),
  upload,
  download,
  getBlob,
  qs,
};


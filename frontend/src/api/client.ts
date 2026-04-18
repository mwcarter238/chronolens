const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`

function getToken(): string | null {
  return localStorage.getItem('token')
}

function buildHeaders(extra?: Record<string, string>): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  const token = getToken()
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: buildHeaders(options.headers as Record<string, string>),
  })

  if (res.status === 204) return undefined as T

  const data = await res.json().catch(() => ({ detail: res.statusText }))

  if (!res.ok) {
    throw new ApiError(res.status, data.detail ?? 'Request failed')
  }

  return data as T
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
}

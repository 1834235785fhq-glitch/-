export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('smart-dormitory-token')
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    throw new ApiError(
      response.status === 404
        ? 'API 服务未部署或路由配置错误，请检查 Vercel Functions'
        : '服务器响应格式异常，请稍后重试',
      response.status,
    )
  }
  const result = await response.json() as ApiResponse<T>
  if (!response.ok || result.code !== 0) {
    if (response.status === 401 && !url.includes('/auth/login')) {
      localStorage.removeItem('smart-dormitory-token')
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
    }
    throw new ApiError(result.message || '请求失败，请稍后重试', response.status)
  }
  return result.data
}

export const api = {
  get<T>(url: string) { return request<T>(url) },
  post<T>(url: string, body?: unknown) { return request<T>(url, { method: 'POST', body: JSON.stringify(body) }) },
  put<T>(url: string, body?: unknown) { return request<T>(url, { method: 'PUT', body: JSON.stringify(body) }) },
  patch<T>(url: string, body?: unknown) { return request<T>(url, { method: 'PATCH', body: JSON.stringify(body) }) },
  delete<T>(url: string) { return request<T>(url, { method: 'DELETE' }) },
}

function getApiBaseUrl(): string {
  let raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  raw = raw.trim().replace(/\/+$/, '');
  if (!raw.endsWith('/api')) {
    raw = `${raw}/api`;
  }
  return raw;
}

const API_BASE = getApiBaseUrl();

export function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('jwas_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('jwas_session_id', sid);
  }
  return sid;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('jwas_auth_token');
}

export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwas_auth_token', token);
  }
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwas_auth_token');
    localStorage.removeItem('jwas_user');
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('jwas_user');
  return user ? JSON.parse(user) : null;
}

export function setStoredUser(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwas_user', JSON.stringify(user));
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const sessionId = getSessionId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = 'Request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail || `HTTP error ${res.status}`);
  }

  // Handle empty responses
  const text = await res.text();
  return text ? JSON.parse(text) : (null as any);
}

/**
 * Resolves any image URL to a fully qualified, displayable URL.
 * Handles relative paths (/uploads/...), full localhost URLs, external URLs, and data URLs.
 * Dynamically re-binds any /uploads/... path to the active backend instance.
 */
export function resolveImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // If the URL contains an uploads path (e.g. /uploads/uuid.jpg or http://localhost:8000/uploads/uuid.jpg),
  // extract the clean relative path and route to the currently active backend base URL
  const uploadIndex = trimmed.indexOf('/uploads/');
  if (uploadIndex !== -1) {
    const relativePath = trimmed.substring(uploadIndex);
    const base = API_BASE.replace(/\/api\/?$/, '');
    return `${base}${relativePath}`;
  }

  // If it's an external web URL (Cloudinary, S3, Unsplash, etc.)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanUrl = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base = API_BASE.replace(/\/api\/?$/, '');
  return `${base}${cleanUrl}`;
}

export async function uploadImage(file: File): Promise<{ url: string; relative_url?: string; filename: string; size_bytes: number }> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/uploads/image`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (netErr: any) {
    throw new Error(`Upload server unreachable at ${API_BASE}. Please ensure backend is running.`);
  }

  if (!res.ok) {
    let err = 'Image upload failed';
    try {
      const errJson = await res.json();
      err = errJson.detail || errJson.message || err;
    } catch {
      err = await res.text();
    }
    throw new Error(err || `HTTP ${res.status}: Upload failed`);
  }

  const data = await res.json();
  // Ensure url is fully resolved and reachable
  const resolvedUrl = data.relative_url ? resolveImageUrl(data.relative_url) : (data.url || '');
  return {
    ...data,
    url: resolvedUrl,
  };
}

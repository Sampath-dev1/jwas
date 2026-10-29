export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    // If accessing via LAN IP or localhost/127.0.0.1, align backend address to matching host
    if (hostname === 'localhost' || hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return `${protocol}//${hostname}:8000/api`;
    }
  }
  let raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  raw = raw.trim().replace(/\/+$/, '');
  if (!raw.endsWith('/api')) {
    raw = `${raw}/api`;
  }
  return raw;
}

export function getActiveBackendBase(): string {
  const apiUrl = getApiBaseUrl();
  return apiUrl.replace(/\/api\/?$/, '');
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

export function isStaffOrAdmin(user: any): boolean {
  if (!user) return false;
  return Boolean(
    user.roles?.includes('Super Admin') ||
    user.roles?.includes('Admin') ||
    user.roles?.includes('Catalogue Manager') ||
    user.roles?.includes('Inventory Manager') ||
    user.roles?.includes('Order Manager') ||
    (user.permissions && user.permissions.length > 0)
  );
}

export function getAdminAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('jwas_admin_auth_token') ||
    localStorage.getItem('jwas_auth_token')
  );
}

export function setAdminAuthToken(token: string, user?: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwas_admin_auth_token', token);
    localStorage.setItem('jwas_auth_token', token);
    if (user) {
      localStorage.setItem('jwas_admin_user', JSON.stringify(user));
      localStorage.setItem('jwas_user', JSON.stringify(user));
    }
  }
}

export function clearAdminAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwas_admin_auth_token');
    localStorage.removeItem('jwas_admin_user');
  }
}

export function getAdminUser() {
  if (typeof window === 'undefined') return null;
  const adminUser = localStorage.getItem('jwas_admin_user');
  if (adminUser) {
    try {
      return JSON.parse(adminUser);
    } catch {}
  }
  return null;
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // If active on an /admin URL, always route through the persistent admin token
  if (window.location.pathname.startsWith('/admin')) {
    return getAdminAuthToken();
  }
  return (
    localStorage.getItem('jwas_customer_auth_token') ||
    localStorage.getItem('jwas_auth_token') ||
    localStorage.getItem('jwas_admin_auth_token')
  );
}

export function setAuthToken(token: string, user?: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwas_auth_token', token);
    if (isStaffOrAdmin(user)) {
      localStorage.setItem('jwas_admin_auth_token', token);
      if (user) localStorage.setItem('jwas_admin_user', JSON.stringify(user));
    } else {
      localStorage.setItem('jwas_customer_auth_token', token);
      if (user) localStorage.setItem('jwas_customer_user', JSON.stringify(user));
    }
  }
}

export function clearAuthToken() {
  if (typeof window !== 'undefined') {
    if (window.location.pathname.startsWith('/admin')) {
      clearAdminAuthToken();
      localStorage.removeItem('jwas_auth_token');
      localStorage.removeItem('jwas_user');
    } else {
      // Customer tab logout: preserves admin tab session so admin edits are never interrupted
      localStorage.removeItem('jwas_customer_auth_token');
      localStorage.removeItem('jwas_customer_user');
      localStorage.removeItem('jwas_auth_token');
      localStorage.removeItem('jwas_user');
    }
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname.startsWith('/admin')) {
    return getAdminUser() || (localStorage.getItem('jwas_user') ? JSON.parse(localStorage.getItem('jwas_user')!) : null);
  }
  const custUser = localStorage.getItem('jwas_customer_user');
  if (custUser) {
    try {
      return JSON.parse(custUser);
    } catch {}
  }
  const user = localStorage.getItem('jwas_user');
  if (user) {
    try {
      return JSON.parse(user);
    } catch {}
  }
  return getAdminUser();
}

export function setStoredUser(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwas_user', JSON.stringify(user));
    if (isStaffOrAdmin(user)) {
      localStorage.setItem('jwas_admin_user', JSON.stringify(user));
    } else {
      localStorage.setItem('jwas_customer_user', JSON.stringify(user));
    }
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Always use the dedicated admin token for any /admin endpoint or when inside /admin route
  const isAdminRequest =
    endpoint.startsWith('/admin') ||
    (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

  const token = isAdminRequest ? getAdminAuthToken() : getAuthToken();
  const sessionId = getSessionId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(sessionId ? { 'X-Session-ID': sessionId } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const currentBase = getApiBaseUrl();
  const res = await fetch(`${currentBase}${endpoint}`, {
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

  // If it's a relative path starting with /images/ or /icons/ (frontend public assets)
  if (trimmed.startsWith('/images/') || trimmed.startsWith('/icons/')) {
    return trimmed;
  }

  // If the URL contains an uploads path (e.g. /uploads/uuid.jpg or http://.../uploads/uuid.jpg),
  // extract the clean relative path and route to the currently active backend base URL
  const uploadIndex = trimmed.indexOf('/uploads/');
  if (uploadIndex !== -1) {
    const relativePath = trimmed.substring(uploadIndex);
    const base = getActiveBackendBase();
    return `${base}${relativePath}`;
  }

  // If it's an external web URL (Cloudinary, S3, Unsplash, etc.)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanUrl = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base = getActiveBackendBase();
  return `${base}${cleanUrl}`;
}

export async function uploadImage(file: File): Promise<{ url: string; relative_url?: string; filename: string; size_bytes: number }> {
  const token = getAdminAuthToken() || getAuthToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const currentBase = getApiBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${currentBase}/uploads/image`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch (netErr: any) {
    throw new Error(`Upload server unreachable at ${currentBase}. Please ensure backend is running.`);
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

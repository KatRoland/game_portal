const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

let accessToken: string | null = null;
if (typeof window !== 'undefined') {
  try {
    accessToken = localStorage.getItem('accessToken');
  } catch (e) { console.error(e) }
}

async function request(path: string, options: any = {}) {
  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) localStorage.setItem('accessToken', token);
      else localStorage.removeItem('accessToken');
    } catch (e) { console.error(e) }
  }
}


export async function handleDiscordCallback(hash?: string): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const h = hash ?? window.location.hash;
  if (!h || h.length < 2) return null;
  const params = new URLSearchParams(h.slice(1));
  const token = params.get('access_token');
  if (token) {
    setAccessToken(token);
    try {
      const cleanUrl = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', cleanUrl);
    } catch (e) { console.error(e) }
    return token;
  }
  return null;
}

export async function refreshToken() {
  try {
    const data = await request('/auth/refresh', { method: 'POST' });
    const newToken = (data as any).accessToken;
    if (newToken) setAccessToken(newToken);
    return !!newToken;
  } catch {
    return false;
  }
}

export function getDiscordAuthUrl() {
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || '');
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email`;
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (e) { console.error(e) }
  setAccessToken(null);
}

export async function getProfile() {
  return request('/me');
}

export async function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('avatar', file);
  return request('/me/avatar', { method: 'POST', body: form });
}

export function getUserAvatar(userId: string) {
  return `${BASE}/user/avatar/${userId}`;
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

let accessToken: string | null = null;

export async function request(path: string, options: any = {}) {
  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  let res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include'
  });

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/logout') {
    const refreshed = await refreshToken();
    if (refreshed && accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
      res = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
        credentials: 'include'
      });
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json();
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

/**
 * @deprecated
 */
export async function handleDiscordCallback(hash?: string): Promise<string | null> {
  await refreshToken();
  return accessToken;
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
  // const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  // const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI || '');
  return `https://${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/discord/login`;
  // return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email`;
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

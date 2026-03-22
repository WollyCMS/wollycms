/**
 * Google OAuth2 helpers — Web Crypto only (no npm deps).
 * Works on Cloudflare Workers and Node.js 22+.
 */
import { sign, verify } from 'hono/jwt';
import { env } from '../env.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

/** Build the Google OAuth2 authorization URL. */
export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/** Exchange an authorization code for tokens. */
export async function exchangeGoogleCode(
  code: string,
): Promise<{ access_token: string; id_token?: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }

  return res.json();
}

/** Fetch user info from Google using an access token. */
export async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google userinfo fetch failed: ${res.status}`);
  }

  return res.json();
}

/** Generate a random state string for CSRF protection. */
export function generateOAuthState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Create a signed state JWT for the OAuth cookie (5-minute expiry). */
export async function signOAuthState(state: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { state, purpose: 'oauth-state', exp: now + 300 },
    env.JWT_SECRET,
    'HS256',
  );
}

/** Verify the signed state JWT from the cookie. Returns the state string. */
export async function verifyOAuthState(token: string): Promise<string> {
  const payload = (await verify(token, env.JWT_SECRET, 'HS256')) as {
    state: string;
    purpose?: string;
  };
  if (payload.purpose !== 'oauth-state') {
    throw new Error('Invalid state token');
  }
  return payload.state;
}

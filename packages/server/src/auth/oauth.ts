/**
 * Multi-provider OAuth2 framework — Web Crypto only (no npm deps).
 * Works on Cloudflare Workers and Node.js 22+.
 *
 * Add a new provider by creating an OAuthProvider config object.
 * The route handler in api/admin/oauth.ts is generic.
 */
import { sign, verify } from 'hono/jwt';
import { env } from '../env.js';

/** Normalized user info returned by any provider. */
export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

/** Configuration for an OAuth2 provider. */
export interface OAuthProvider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  scope: string;
  clientId: () => string;
  clientSecret: () => string;
  redirectUri: () => string;
  autoCreate: () => boolean;
  /** Extra params to add to the auth URL (e.g., prompt, access_type). */
  authParams?: Record<string, string>;
  /** Parse the provider's userinfo response into our normalized format. */
  parseUserInfo: (data: Record<string, unknown>) => OAuthUserInfo;
  /** Userinfo endpoint URL. */
  userInfoUrl: string;
  /** Some providers return user info from the token response (not used here). */
}

// ---------------------------------------------------------------------------
// Provider definitions
// ---------------------------------------------------------------------------

export const google: OAuthProvider = {
  name: 'google',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
  scope: 'openid email profile',
  clientId: () => env.GOOGLE_CLIENT_ID,
  clientSecret: () => env.GOOGLE_CLIENT_SECRET,
  redirectUri: () => env.GOOGLE_REDIRECT_URI,
  autoCreate: () => env.GOOGLE_AUTO_CREATE,
  authParams: { access_type: 'online', prompt: 'select_account' },
  parseUserInfo: (data) => ({
    id: String(data.id),
    email: String(data.email),
    name: String(data.name || data.email),
    emailVerified: data.verified_email === true,
  }),
};

export const github: OAuthProvider = {
  name: 'github',
  authUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userInfoUrl: 'https://api.github.com/user',
  scope: 'read:user user:email',
  clientId: () => env.GITHUB_CLIENT_ID,
  clientSecret: () => env.GITHUB_CLIENT_SECRET,
  redirectUri: () => env.GITHUB_REDIRECT_URI,
  autoCreate: () => env.GITHUB_AUTO_CREATE,
  parseUserInfo: (data) => ({
    id: String(data.id),
    email: String(data.email || ''),
    name: String(data.name || data.login || ''),
    emailVerified: !!data.email,
  }),
};

export const microsoft: OAuthProvider = {
  name: 'microsoft',
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
  scope: 'openid email profile User.Read',
  clientId: () => env.MICROSOFT_CLIENT_ID,
  clientSecret: () => env.MICROSOFT_CLIENT_SECRET,
  redirectUri: () => env.MICROSOFT_REDIRECT_URI,
  autoCreate: () => env.MICROSOFT_AUTO_CREATE,
  authParams: { response_mode: 'query' },
  parseUserInfo: (data) => ({
    id: String(data.id),
    email: String(data.mail || data.userPrincipalName || ''),
    name: String(data.displayName || ''),
    emailVerified: !!(data.mail || data.userPrincipalName),
  }),
};

/** All registered providers, keyed by name. */
export const providers: Record<string, OAuthProvider> = { google, github, microsoft };

/** Get a provider by name, or undefined if not registered. */
export function getProvider(name: string): OAuthProvider | undefined {
  return providers[name];
}

/** Check if a provider is configured (has a client ID set). */
export function isProviderConfigured(provider: OAuthProvider): boolean {
  return !!provider.clientId();
}

// ---------------------------------------------------------------------------
// Generic OAuth2 flow helpers
// ---------------------------------------------------------------------------

/** Build the authorization URL for any provider. */
export function buildAuthUrl(provider: OAuthProvider, state: string): string {
  const params = new URLSearchParams({
    client_id: provider.clientId(),
    redirect_uri: provider.redirectUri(),
    response_type: 'code',
    scope: provider.scope,
    state,
    ...provider.authParams,
  });
  return `${provider.authUrl}?${params.toString()}`;
}

/** Exchange an authorization code for tokens. */
export async function exchangeCode(
  provider: OAuthProvider,
  code: string,
): Promise<{ access_token: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  // GitHub requires Accept: application/json to get JSON response
  if (provider.name === 'github') {
    headers['Accept'] = 'application/json';
  }

  const res = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams({
      code,
      client_id: provider.clientId(),
      client_secret: provider.clientSecret(),
      redirect_uri: provider.redirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  return res.json();
}

/** Fetch user info from the provider using an access token. */
export async function fetchUserInfo(
  provider: OAuthProvider,
  accessToken: string,
): Promise<OAuthUserInfo> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  // GitHub API requires User-Agent header
  if (provider.name === 'github') {
    headers['User-Agent'] = 'WollyCMS';
  }

  const res = await fetch(provider.userInfoUrl, { headers });

  if (!res.ok) {
    throw new Error(`User info fetch failed: ${res.status}`);
  }

  const data = await res.json() as Record<string, unknown>;
  let userInfo = provider.parseUserInfo(data);

  // GitHub may not include email in profile — fetch from emails endpoint
  if (provider.name === 'github' && !userInfo.email) {
    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'WollyCMS' },
    });
    if (emailRes.ok) {
      const emails = await emailRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primary = emails.find((e) => e.primary && e.verified);
      if (primary) {
        userInfo = { ...userInfo, email: primary.email, emailVerified: true };
      }
    }
  }

  return userInfo;
}

// ---------------------------------------------------------------------------
// CSRF state helpers (shared across all providers)
// ---------------------------------------------------------------------------

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

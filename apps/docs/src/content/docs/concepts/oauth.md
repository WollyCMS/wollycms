---
title: Google OAuth Login
description: Allow users to sign in with their Google account instead of (or in addition to) a password.
---

WollyCMS supports Google OAuth 2.0 as a login method. Users can click "Sign in with Google" on the admin login page to authenticate with their Google account. OAuth login **skips two-factor authentication** — Google has already verified the user's identity.

## How it works

1. User clicks **Sign in with Google** on the login page
2. Browser redirects to Google's consent screen
3. User approves access (email and profile)
4. Google redirects back to WollyCMS with an authorization code
5. WollyCMS exchanges the code for user info (email, name)
6. If the email matches an existing CMS user, the Google account is linked and a session is issued
7. If no match and `GOOGLE_AUTO_CREATE` is enabled, a new editor account is created
8. If no match and auto-create is off, the user sees "No CMS account matches that Google email"

```
Google email matches existing user  →  Auto-link + session JWT (24h)
Google email is new + auto-create   →  Create editor + session JWT (24h)
Google email is new + no auto-create →  Rejected with friendly error
```

## Setup

### 1. Create Google OAuth credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select an existing one)
3. Go to **APIs & Services → OAuth consent screen**
   - Choose **External** (or Internal for Google Workspace orgs)
   - App name: your site name
   - Scopes: add `email`, `profile`, `openid`
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://YOUR_CMS_DOMAIN/api/admin/auth/oauth/google/callback`
6. Copy the **Client ID** and **Client Secret**

### 2. Set environment variables

Add these to your deployment environment (Cloudflare Worker secrets, `.env` file, etc.):

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | OAuth client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes | OAuth client secret from Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Yes | Must match exactly: `https://YOUR_CMS_DOMAIN/api/admin/auth/oauth/google/callback` |
| `GOOGLE_AUTO_CREATE` | No | Set to `true` to auto-create accounts for new Google users. Default: `false` |

If `GOOGLE_CLIENT_ID` is not set, the "Sign in with Google" button is hidden and OAuth routes return 501.

### 3. Pre-create users (recommended)

With `GOOGLE_AUTO_CREATE=false` (the default), only existing CMS users can sign in with Google. The Google account is matched by email address.

1. Create users in **System → Users** with the email they use for Google
2. Those users can then click "Sign in with Google" — the accounts link automatically on first login
3. Users who aren't pre-created see a clear error message

This is the recommended setup for organizations where only specific people should have CMS access.

## Auto-create mode

Set `GOOGLE_AUTO_CREATE=true` to allow any Google user to sign in and get an editor account created automatically. This is useful for single-user or small-team deployments where you don't want to pre-create accounts.

:::caution
With auto-create enabled, **anyone with a Google account** can create a CMS account. Only use this on instances where open registration is acceptable.
:::

## Managing connected accounts

Users can manage their Google connection from **System → Account**:

- **Connected Accounts** section shows linked Google accounts
- **Disconnect** removes the link (blocked if it's the user's only login method)
- **Connect Google Account** links a Google account to an existing password-based account

A user can have both a password and a Google connection. They can log in with either method.

## Security details

- **CSRF protection**: A random 256-bit state token is signed as a JWT and stored in an HttpOnly cookie (`wolly_oauth_state`, 5-minute expiry). The callback verifies the state matches.
- **No server sessions**: State is carried entirely in signed cookies and URL parameters.
- **2FA is skipped**: OAuth login bypasses TOTP verification because Google has already authenticated the user. This follows the principle that the identity provider has already performed strong authentication.
- **No external dependencies**: The OAuth flow uses only the Web Crypto API and `fetch` — no npm packages required. Works on Cloudflare Workers and Node.js.
- **Token delivery**: The session JWT is passed to the admin UI via a URL fragment (`#oauth_token=...`), which is never sent to the server in HTTP requests.
- **Email verification**: Only Google accounts with verified emails are accepted.

## API endpoints

### OAuth flow (public)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/auth/oauth/providers` | GET | Returns which OAuth providers are configured |
| `/api/admin/auth/oauth/google` | GET | Redirects to Google consent screen |
| `/api/admin/auth/oauth/google/callback` | GET | Handles Google callback, issues session |

### Connection management (authenticated)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/auth/oauth/connections` | GET | List connected OAuth accounts |
| `/api/admin/auth/oauth/connections/:id` | DELETE | Disconnect an OAuth account |

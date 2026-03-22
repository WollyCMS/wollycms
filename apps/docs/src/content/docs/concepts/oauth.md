---
title: OAuth Login
description: Allow users to sign in with Google, GitHub, or Microsoft instead of (or in addition to) a password.
---

WollyCMS supports OAuth 2.0 login with multiple providers. Users can click a provider button on the admin login page to authenticate. OAuth login **skips two-factor authentication** — the identity provider has already verified the user.

## Supported providers

| Provider | Env var prefix | Scope |
|---|---|---|
| Google | `GOOGLE_` | `openid email profile` |
| GitHub | `GITHUB_` | `read:user user:email` |
| Microsoft | `MICROSOFT_` | `openid email profile User.Read` |

Each provider is independent — configure one, two, or all three. The login page automatically shows buttons only for configured providers.

## How it works

1. User clicks a provider button on the login page
2. Browser redirects to the provider's consent screen
3. User approves access (email and profile)
4. Provider redirects back to WollyCMS with an authorization code
5. WollyCMS exchanges the code for user info (email, name)
6. If the email matches an existing CMS user, the account is linked and a session is issued
7. If no match and auto-create is enabled, a new editor account is created
8. If no match and auto-create is off, the user sees an error

## Setup

Each provider requires three environment variables plus an optional auto-create flag.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `{PROVIDER}_CLIENT_ID` | Yes | OAuth client ID |
| `{PROVIDER}_CLIENT_SECRET` | Yes | OAuth client secret |
| `{PROVIDER}_REDIRECT_URI` | Yes | Callback URL (see below) |
| `{PROVIDER}_AUTO_CREATE` | No | Set to `true` to auto-create accounts. Default: `false` |

The redirect URI for each provider follows this pattern:

```
https://YOUR_CMS_DOMAIN/api/admin/auth/oauth/{provider}/callback
```

For example:
- `https://cms.example.com/api/admin/auth/oauth/google/callback`
- `https://cms.example.com/api/admin/auth/oauth/github/callback`
- `https://cms.example.com/api/admin/auth/oauth/microsoft/callback`

### Google

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project or select an existing one
3. Go to **APIs & Services → OAuth consent screen**
   - Choose **External** (or Internal for Google Workspace orgs)
   - Scopes: `email`, `profile`, `openid`
4. Go to **APIs & Services → Credentials**
5. Click **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URI: `https://YOUR_CMS_DOMAIN/api/admin/auth/oauth/google/callback`
6. Copy the Client ID and Client Secret

### GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
   - Application name: your site name
   - Homepage URL: your CMS domain
   - Authorization callback URL: `https://YOUR_CMS_DOMAIN/api/admin/auth/oauth/github/callback`
3. Copy the Client ID
4. Generate a Client Secret and copy it

### Microsoft

1. Go to [Azure App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click **New registration**
   - Name: your site name
   - Supported account types: choose based on your needs (single tenant, multi-tenant, or personal accounts)
   - Redirect URI: **Web** → `https://YOUR_CMS_DOMAIN/api/admin/auth/oauth/microsoft/callback`
3. Copy the **Application (client) ID**
4. Go to **Certificates & secrets → New client secret** and copy the value

## Auto-create mode

By default, `{PROVIDER}_AUTO_CREATE` is `false`. Only existing CMS users can sign in with OAuth — the provider email must match an existing CMS user's email.

Set `{PROVIDER}_AUTO_CREATE=true` to allow any user who authenticates with the provider to get an editor account created automatically.

:::caution
With auto-create enabled, **anyone who can authenticate with the provider** can create a CMS account. Only use this on instances where open registration is acceptable.
:::

For organizations, the recommended approach is:
1. Keep auto-create off (default)
2. Pre-create users in **System → Users** with their provider email
3. Users click the provider button — accounts link automatically on first login

## Managing connected accounts

Users can manage their OAuth connections from **System → Account**:

- **Connected Accounts** section shows all linked provider accounts
- **Disconnect** removes the link (blocked if it's the user's only login method)
- **Connect** buttons appear for configured providers that aren't yet linked

## Adding custom providers

WollyCMS uses a generic OAuth2 provider interface. To add a new provider:

1. Define a provider config in `packages/server/src/auth/oauth.ts`:

```typescript
export const myProvider: OAuthProvider = {
  name: 'myprovider',
  authUrl: 'https://auth.example.com/authorize',
  tokenUrl: 'https://auth.example.com/token',
  userInfoUrl: 'https://api.example.com/userinfo',
  scope: 'openid email profile',
  clientId: () => env.MYPROVIDER_CLIENT_ID,
  clientSecret: () => env.MYPROVIDER_CLIENT_SECRET,
  redirectUri: () => env.MYPROVIDER_REDIRECT_URI,
  autoCreate: () => env.MYPROVIDER_AUTO_CREATE,
  parseUserInfo: (data) => ({
    id: String(data.sub),
    email: String(data.email),
    name: String(data.name),
    emailVerified: !!data.email_verified,
  }),
};
```

2. Add it to the `providers` map in the same file
3. Add the env vars to `src/env.ts`
4. The routes and UI are generic — they'll pick up the new provider automatically

## Security details

- **CSRF protection**: A random 256-bit state token is signed as a JWT and stored in an HttpOnly cookie (5-minute expiry). The callback verifies the state matches.
- **2FA is skipped**: OAuth login bypasses TOTP verification because the provider has already authenticated the user.
- **No external dependencies**: The OAuth flow uses only the Web Crypto API and `fetch`.
- **Token delivery**: The session JWT is passed via URL fragment (`#oauth_token=...`), which is never sent to the server.
- **Email verification**: Only provider accounts with verified emails are accepted.
- **GitHub special handling**: If the GitHub profile doesn't include an email, WollyCMS fetches from the `/user/emails` endpoint to find the primary verified email.

## API endpoints

### OAuth flow (public)

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/auth/oauth/providers` | GET | Returns which providers are configured |
| `/api/admin/auth/oauth/:provider` | GET | Redirects to provider consent screen |
| `/api/admin/auth/oauth/:provider/callback` | GET | Handles provider callback, issues session |

### Connection management (authenticated)

| Endpoint | Method | Description |
|---|---|---|
| `/api/admin/auth/oauth/connections` | GET | List connected OAuth accounts |
| `/api/admin/auth/oauth/connections/:id` | DELETE | Disconnect an OAuth account |

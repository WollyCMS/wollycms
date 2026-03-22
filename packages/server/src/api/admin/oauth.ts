import { Hono } from 'hono';
import { setCookie, getCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../../db/index.js';
import { users, userOauth } from '../../db/schema/index.js';
import { env } from '../../env.js';
import { authMiddleware } from '../../auth/middleware.js';
import { logAudit } from '../../audit.js';
import {
  providers,
  getProvider,
  isProviderConfigured,
  buildAuthUrl,
  exchangeCode,
  fetchUserInfo,
  generateOAuthState,
  signOAuthState,
  verifyOAuthState,
} from '../../auth/oauth.js';

const app = new Hono();

const OAUTH_STATE_COOKIE = 'wolly_oauth_state';

/** Issue a full 24h session JWT. */
async function issueSessionToken(user: {
  id: number;
  email: string;
  role: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: user.id, email: user.email, role: user.role, exp: now + 86400 },
    env.JWT_SECRET,
    'HS256',
  );
}

/** GET /providers — Public: which OAuth providers are configured. */
app.get('/providers', (c) => {
  const configured: Record<string, boolean> = {};
  for (const [name, provider] of Object.entries(providers)) {
    configured[name] = isProviderConfigured(provider);
  }
  return c.json({ data: configured });
});

/** GET /connections — List connected OAuth accounts for the current user. */
app.get('/connections', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload');
  const db = getDb();

  const connections = await db
    .select({
      id: userOauth.id,
      provider: userOauth.provider,
      email: userOauth.email,
      name: userOauth.name,
      createdAt: userOauth.createdAt,
    })
    .from(userOauth)
    .where(eq(userOauth.userId, payload.sub));

  return c.json({ data: connections });
});

/** DELETE /connections/:id — Disconnect an OAuth account. */
app.delete('/connections/:id', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload');
  const id = parseInt(c.req.param('id') || '', 10);
  if (isNaN(id)) {
    return c.json(
      { errors: [{ code: 'VALIDATION', message: 'Invalid connection ID' }] },
      400,
    );
  }

  const db = getDb();

  const [connection] = await db
    .select()
    .from(userOauth)
    .where(and(eq(userOauth.id, id), eq(userOauth.userId, payload.sub)))
    .limit(1);

  if (!connection) {
    return c.json(
      { errors: [{ code: 'NOT_FOUND', message: 'Connection not found' }] },
      404,
    );
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.sub))
    .limit(1);

  const allConnections = await db
    .select({ id: userOauth.id })
    .from(userOauth)
    .where(eq(userOauth.userId, payload.sub));

  if (!user?.passwordHash && allConnections.length <= 1) {
    return c.json(
      {
        errors: [
          {
            code: 'LAST_AUTH',
            message:
              'Cannot disconnect — set a password first or keep at least one OAuth connection',
          },
        ],
      },
      400,
    );
  }

  await db.delete(userOauth).where(eq(userOauth.id, id));

  await logAudit(c, {
    action: 'oauth-disconnected',
    entity: 'user',
    entityId: payload.sub,
    details: { provider: connection.provider },
  });

  return c.json({ data: { ok: true } });
});

/** GET /:provider — Redirect to provider's OAuth2 consent screen. */
app.get('/:provider', async (c) => {
  const providerName = c.req.param('provider') || '';
  const provider = getProvider(providerName);

  if (!provider) {
    return c.json({ errors: [{ code: 'NOT_FOUND', message: 'Unknown OAuth provider' }] }, 404);
  }

  if (!isProviderConfigured(provider)) {
    return c.json(
      { errors: [{ code: 'NOT_CONFIGURED', message: `${provider.name} OAuth is not configured` }] },
      501,
    );
  }

  const state = generateOAuthState();
  const returnTo = c.req.query('returnTo') || undefined;
  const stateToken = await signOAuthState(state, returnTo);

  setCookie(c, OAUTH_STATE_COOKIE, stateToken, {
    path: '/',
    maxAge: 300,
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });

  return c.redirect(buildAuthUrl(provider, state));
});

/** GET /:provider/callback — Handle the OAuth2 callback. */
app.get('/:provider/callback', async (c) => {
  const providerName = c.req.param('provider') || '';
  const provider = getProvider(providerName);

  if (!provider) {
    return c.redirect('/admin/login#oauth_error=unknown_provider');
  }

  const code = c.req.query('code');
  const state = c.req.query('state');
  const errorParam = c.req.query('error');

  if (errorParam) {
    return c.redirect('/admin/login#oauth_error=' + encodeURIComponent(errorParam));
  }

  if (!code || !state) {
    return c.redirect('/admin/login#oauth_error=missing_params');
  }

  // Verify CSRF state
  const stateCookie = getCookie(c, OAUTH_STATE_COOKIE);
  if (!stateCookie) {
    return c.redirect('/admin/login#oauth_error=missing_state');
  }

  let expectedState: string;
  let returnTo: string | null = null;
  try {
    const stateResult = await verifyOAuthState(stateCookie);
    expectedState = stateResult.state;
    returnTo = stateResult.returnTo;
  } catch {
    return c.redirect('/admin/login#oauth_error=invalid_state');
  }

  if (state !== expectedState) {
    return c.redirect('/admin/login#oauth_error=state_mismatch');
  }

  // Clear the state cookie now that verification passed
  setCookie(c, OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 });

  // Exchange code for tokens
  let tokens: { access_token: string };
  try {
    tokens = await exchangeCode(provider, code);
  } catch {
    console.error(`OAuth token exchange failed for ${provider.name}`);
    return c.redirect('/admin/login#oauth_error=token_exchange_failed');
  }

  // Fetch user info
  let oauthUser;
  try {
    oauthUser = await fetchUserInfo(provider, tokens.access_token);
  } catch {
    console.error(`OAuth userinfo fetch failed for ${provider.name}`);
    return c.redirect('/admin/login#oauth_error=userinfo_failed');
  }

  if (!oauthUser.email || !oauthUser.emailVerified) {
    return c.redirect('/admin/login#oauth_error=email_not_verified');
  }

  const db = getDb();

  // Check if this provider account is already linked to a user
  const [existingOauth] = await db
    .select()
    .from(userOauth)
    .where(
      and(
        eq(userOauth.provider, provider.name),
        eq(userOauth.providerId, oauthUser.id),
      ),
    )
    .limit(1);

  let user;

  if (existingOauth) {
    // Known link — get the user
    const [linkedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingOauth.userId))
      .limit(1);

    if (!linkedUser) {
      return c.redirect('/admin/login#oauth_error=user_not_found');
    }
    user = linkedUser;
  } else {
    // No existing link — check if a user with this email exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, oauthUser.email))
      .limit(1);

    if (existingUser) {
      // Auto-link OAuth to existing user
      user = existingUser;
    } else if (provider.autoCreate()) {
      // Auto-create new user (OAuth-only, no password)
      const [newUser] = await db
        .insert(users)
        .values({
          email: oauthUser.email,
          name: oauthUser.name || oauthUser.email.split('@')[0],
          passwordHash: '',
          role: 'editor',
          createdAt: new Date().toISOString(),
        })
        .returning();
      user = newUser;
    } else {
      // No matching user and auto-create is off
      return c.redirect('/admin/login#oauth_error=no_account');
    }

    // Create the OAuth link
    await db.insert(userOauth).values({
      userId: user.id,
      provider: provider.name,
      providerId: oauthUser.id,
      email: oauthUser.email,
      name: oauthUser.name || null,
      createdAt: new Date().toISOString(),
    });
  }

  // OAuth login skips 2FA (identity proven by provider)
  const token = await issueSessionToken(user);

  // Set jwtPayload so logAudit can read it
  c.set('jwtPayload', { sub: user.id, email: user.email, role: user.role, exp: 0 });
  await logAudit(c, {
    action: 'oauth-login',
    entity: 'user',
    entityId: user.id,
    details: { provider: provider.name },
  });

  // Redirect: if connecting from account page, go back there.
  // Otherwise, go to login with token in fragment.
  if (returnTo && returnTo.startsWith('/admin/')) {
    return c.redirect(returnTo);
  }
  return c.redirect(`/admin/login#oauth_token=${token}`);
});

export default app;

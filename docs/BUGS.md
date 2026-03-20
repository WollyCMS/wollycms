# WollyCMS — Known Bugs

## BUG-001: Block editor auto-saves on click-out without user intent

**Severity**: High — causes data loss
**Reported**: 2026-03-20
**Component**: Admin UI — Block editor

**Description**: When editing a block (e.g., an embed block), clicking outside
the edit area dismisses the editor AND saves the changes. The user did not
click "Save" and may not have finished editing. This caused an embed block
(Workforce RFI on southside.edu) to be saved with incomplete/incorrect content
with no way to revert.

**Expected behavior**: Clicking outside the edit area should either:
1. Keep the editor open (require explicit close), or
2. Discard unsaved changes and show a confirmation if changes were made

**Root cause**: Block fields auto-save on blur (`Block auto-save toast feedback`
from Phase 4.5a). The blur event fires when clicking outside the block editor,
triggering an unintentional save.

**Fix approach**: Add a dirty-state check to the block editor. Only auto-save
if the user explicitly clicks Save. On click-out with unsaved changes, show a
"Save changes?" / "Discard" confirmation dialog.

---

## BUG-002: Login page flash on initial load

**Severity**: Low — cosmetic/UX
**Reported**: 2026-03-20
**Component**: Admin UI — Layout/Auth

**Description**: When navigating to cms.southside.edu (or any WollyCMS admin
URL), there is a brief flash of the authenticated CMS layout before the auth
check completes and redirects to the login page.

**Expected behavior**: Unauthenticated users should see either a loading
spinner or the login page immediately — no flash of the protected layout.

**Root cause**: The SvelteKit SPA renders the full layout (sidebar, header)
on mount, then the `onMount` callback checks auth state and redirects to
`/login`. The layout renders before auth.load() completes.

**Fix approach**: Add a loading gate in `+layout.svelte` that shows a
loading spinner (or blank screen) until `auth.loaded` is `true`. Only render
the sidebar/content area after auth state is resolved.

```svelte
{#if !auth.loaded}
  <div class="loading-screen">Loading...</div>
{:else if auth.user || isPublicPage}
  <!-- normal layout -->
{/if}
```

---

## BUG-003: Admin branding resets on new session

**Severity**: Low — cosmetic
**Reported**: 2026-03-20
**Component**: Admin UI — Branding/Config

**Description**: Every time a new session is started in the CMS, the admin
branding text in the top-left corner of the sidebar reverts to the default
"WollyCMS" instead of showing the configured brand name. The brand name
is correctly saved in Settings. Re-saving the settings makes it appear again
until the next session.

**Expected behavior**: The configured admin brand name should persist and
display correctly on every page load without re-saving settings.

**Root cause**: In `+layout.svelte`, `brandName` is initialized to `'WollyCMS'`
(line 26) and only updated when `loadBrandName()` completes. The function
fetches from `/api/admin/config`, but there may be a timing issue where:
1. The layout renders with the default before the API call returns, or
2. The config API returns the brand name under a different key than expected
   (`adminBrandName` vs what's actually stored), or
3. The config value is not being persisted correctly to the database (only
   stored in memory/cache until the next server restart)

**Fix approach**: Debug the `/api/admin/config` response to verify
`adminBrandName` is returned. Check if the site_config table has the correct
value. May need to ensure the brand name is read from the database on every
config fetch, not from a stale cache.

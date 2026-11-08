# Web notifications

The header bell opens an account-scoped inbox with unread counts, all/unread filters,
mark-as-read, mark-all-read, and clear-all actions. The newest 100 notifications per
account are stored in IndexedDB on this browser. The inbox survives reloads and
receives messages handled while the app is closed. It is not a server history or
cross-device sync. Opening the panel alone does not mark items as read.

## Test without a backend

1. Run the app on localhost or HTTPS and sign in.
2. Open the header bell, then **Set up & test notifications** (or the settings icon).
3. **Test inbox** sends a local test through the service worker without asking for
   notification permission.
4. Click **Enable browser notifications** and accept the browser prompt.
5. Click **Test browser push**. This stores the test in the inbox and displays a
   native browser/OS notification. Click that notification to open the workspace
   and mark the item read. Check the OS notification center if banners are hidden.

These tests simulate reception through the same worker handler as real pushes;
they do not test network push transport or delivery with the browser closed.
After the backend is connected, send a real push while the app is closed to verify
that path. The UI never claims the local test is a remote delivery.

If permission is denied, change it in browser site settings. OS focus modes and
notification settings can suppress banners. Feature detection handles unsupported
browsers and insecure origins. Use current Chrome, Edge, Firefox, or Safari. On
iOS/iPadOS 16.4+, install the app using **Add to Home Screen** and launch it from
there. The existing web app manifest provides standalone mode and icons. The
worker uses classic scripts for compatibility across browsers; it does not cache
pages or API responses.

## Backend integration contract

1. Generate a VAPID key pair on the backend. Set only the public base64url key as
   `VITE_WEB_PUSH_PUBLIC_KEY`, then rebuild. Leave it empty for local tests.
2. The user clicks **Set up push subscription** after granting permission.
   `enablePush()` creates/reuses a standards-based PushSubscription. **Copy push
   subscription** copies `{ userId, subscription: { endpoint, expirationTime, keys } }`
   for development. No subscription POST endpoint is invented by this frontend.
3. When the API exists, send that object to an authenticated subscription endpoint
   after `enablePush()`. Derive the recipient from server authentication and store
   subscriptions per user/device; do not trust a submitted userId for authorization.
   Re-register subscriptions at sign-in, handle key rotation, and remove expired
   endpoints on push-service 404/410 responses. Reconcile `getSubscription()` with
   the backend on subsequent sessions. None of those server operations exist yet.
4. Send an encrypted standards-based Web Push using the VAPID private key on the
   server. Payload:

```json
{
  "id": "unique-event-id",
  "userId": "authenticated-user-id",
  "title": "Workspace update",
  "body": "Open your workspace for details.",
  "url": "/",
  "test": false
}
```

`userId` must match the signed-in account, including for DevTools Push simulation.
Only internal application routes are accepted as notification destinations. IDs
are deduplicated in the local inbox. Duplicate pushes still show a native
notification to respect browsers' visible-push requirement. Missing/malformed or
wrong-recipient payloads show a generic native notification without saving data
to another account's inbox. Every valid push is shown even with an open app.

The worker persists notifications before notifying open tabs. Clicking native or
inbox notifications marks them read. Native clicks focus/navigate an existing tab
or open a new one. Account changes clear the active recipient, close visible
notifications, and unsubscribe the previous browser subscription. Inbox reads are
scoped to the current user. Browser notification permission is origin-wide and
cannot be revoked programmatically. One active account is supported per browser
profile. Logout must eventually also remove the subscription on the backend.

Keep titles and bodies generic: browser notifications may appear on lock screens.
Do not include patient names, readings, or other patient data. Clearing browser
storage removes the local inbox. A backend inbox API will be needed for durable,
cross-device history, read-state sync, and missed-event recovery.

## Worker deployment

Serve `/notification-sw.js` and `/notification-db.js` as JavaScript at the origin
root, and allow service workers in your Content Security Policy. Vite copies both
public files to the production output. The service worker should be revalidated
on deployment; the Vercel headers set `Cache-Control: no-cache` on both scripts.
Existing static files take precedence over the SPA rewrite.

Reference: [MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
and [WebKit iOS/iPadOS Web Push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

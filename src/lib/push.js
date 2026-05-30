// Device push registration for the Android APK (Capacitor + Firebase Cloud
// Messaging). On web / PWA this is a no-op — there's no FCM token without the
// native layer, and the daily-coach push only targets the APK for now.
//
// Flow: ask for notification permission → register with FCM → on the
// 'registration' event, store the token in push_subscriptions so the
// server-side Edge Function can push to this device. Idempotent + guarded so
// repeated calls (e.g. AuthedApp re-mounts) don't stack listeners.
//
// NOTE (Phase 1): we register on startup once the user is logged in, so the
// token lands in the DB for end-to-end testing. In Phase 2 this moves behind
// the "enable daily push" toggle so we only prompt when the user opts in.

import { Capacitor } from '@capacitor/core';
import * as db from './db';

let initialized = false;

export async function initPushNotifications() {
  if (initialized) return;
  // Android-only for now. iOS would need APNs setup; web has no FCM token.
  if (Capacitor.getPlatform() !== 'android') return;
  initialized = true;

  // Import lazily so the web bundle never pulls the native plugin shim into a
  // code path that runs on load.
  const { PushNotifications } = await import('@capacitor/push-notifications');

  PushNotifications.addListener('registration', (token) => {
    db.pushSubscriptions.upsertMyToken(token.value, 'android').catch((err) => {
      console.error('[push] token upsert failed:', err);
    });
  });
  PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] registration error:', err);
  });

  try {
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') {
      console.info('[push] notification permission not granted:', perm.receive);
      return;
    }
    // Android 8+ requires a notification channel or the tray notification is
    // silently dropped. Must match the channel_id the dispatch sends
    // (android.notification.channel_id = 'daily_coach'). importance 5 = HIGH
    // (heads-up). Safe to call repeatedly — Android upserts by id.
    try {
      await PushNotifications.createChannel({
        id: 'daily_coach',
        name: 'Daily coach',
        description: 'Your daily AI coach check-in',
        importance: 5,
        visibility: 1,
      });
    } catch (err) {
      console.warn('[push] createChannel failed (non-fatal):', err);
    }
    await PushNotifications.register();
  } catch (err) {
    console.error('[push] init failed:', err);
  }
}

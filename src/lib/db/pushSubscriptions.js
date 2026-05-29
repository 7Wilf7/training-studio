import { supabase } from '../supabase';
import { getCurrentUserId } from './_auth';

// push_subscriptions: one row per (user_id, fcm_token). Stores a device's FCM
// registration token so the daily-coach Edge Function (service role) can push
// to it. The app never reads other users' rows; RLS scopes normal access to
// auth.uid(), while the Edge Function uses the service role to fan out.
//
// Schema (run by user in Supabase — see project CLAUDE.md):
//   id          uuid PK default gen_random_uuid()
//   user_id     uuid → auth.users(id) on delete cascade
//   fcm_token   text NOT NULL
//   platform    text NOT NULL default 'android'
//   created_at  timestamptz default now()
//   updated_at  timestamptz default now()
//   UNIQUE (user_id, fcm_token)

export async function upsertMyToken(fcmToken, platform = 'android') {
  if (!fcmToken) return null;
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, fcm_token: fcmToken, platform, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,fcm_token' }
    )
    .select('*')
    .single();
  if (error) {
    console.error('upsertMyToken failed:', error);
    throw new Error(error.message);
  }
  return data;
}

// Drop a token when the device reports it's no longer valid (or on sign-out).
// Best-effort: failures are swallowed by callers.
export async function deleteMyToken(fcmToken) {
  if (!fcmToken) return;
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('fcm_token', fcmToken);
  if (error) {
    console.error('deleteMyToken failed:', error);
    throw new Error(error.message);
  }
}

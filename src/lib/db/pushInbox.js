import { supabase } from '../supabase';
import { getCurrentUserId } from './_auth';

// push_inbox: the in-app "inbox" — one row per delivered coach push, so the
// user can re-read / mark-read / delete / clear messages even after the system
// notification is gone. Rows are WRITTEN server-side by the daily-coach-dispatch
// Edge Function (service role); the client only reads + mutates its own rows
// (RLS scopes everything to auth.uid()).
//
// Schema (run by user in Supabase — see project CLAUDE.md):
//   id          uuid PK default gen_random_uuid()
//   user_id     uuid → auth.users(id) on delete cascade
//   title       text (nullable)
//   body        text NOT NULL
//   read        boolean NOT NULL default false
//   created_at  timestamptz NOT NULL default now()

function fromRow(row) {
  return {
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    read: row.read === true,
    createdAt: row.created_at,
  };
}

// Newest first. Capped — the inbox is a recent-history view, not an archive.
export async function listMine(limit = 50) {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('push_inbox')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.error('listMine (inbox) failed:', error);
    throw new Error(error.message);
  }
  return (data || []).map(fromRow);
}

export async function unreadCount() {
  const userId = await getCurrentUserId();
  const { count, error } = await supabase
    .from('push_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) {
    console.error('unreadCount (inbox) failed:', error);
    return 0; // best-effort — a badge count should never break the app
  }
  return count || 0;
}

export async function markRead(id) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('push_inbox')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('id', id);
  if (error) {
    console.error('markRead (inbox) failed:', error);
    throw new Error(error.message);
  }
}

export async function markAllRead() {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('push_inbox')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) {
    console.error('markAllRead (inbox) failed:', error);
    throw new Error(error.message);
  }
}

export async function deleteOne(id) {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('push_inbox')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);
  if (error) {
    console.error('deleteOne (inbox) failed:', error);
    throw new Error(error.message);
  }
}

export async function clearAll() {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('push_inbox')
    .delete()
    .eq('user_id', userId);
  if (error) {
    console.error('clearAll (inbox) failed:', error);
    throw new Error(error.message);
  }
}

import { supabase } from '../supabase';
import { getCurrentUserId } from './_auth';

// daily_notes: one row per (user_id, date). Holds day-level metadata that
// doesn't fit on a single workout — currently just tags[] (e.g. ['massage']
// to mark active recovery). Calendar reads this alongside workouts; the
// Activities list does NOT touch it.
//
// Schema (see project CLAUDE.md / SQL migration):
//   id          uuid PK
//   user_id     uuid → auth.users
//   date        date (UNIQUE per user)
//   tags        text[] NOT NULL DEFAULT '{}'
//   created_at  timestamptz
//   updated_at  timestamptz

function fromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    date: row.date,
    tags: Array.isArray(row.tags) ? row.tags : [],
    // Free-text destination for a day tagged "travel" (where the user is
    // going) — feeds local running tips to the coach + push.
    travelDest: row.travel_dest ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMyDailyNotes() {
  const { data, error } = await supabase
    .from('daily_notes')
    .select('*')
    .order('date', { ascending: false });
  if (error) {
    console.error('listMyDailyNotes failed:', error);
    throw new Error(error.message);
  }
  return (data ?? []).map(fromRow);
}

// Upsert by (user_id, date). If tags=[] we delete the row instead — there's
// no point storing empty notes, and it keeps the table tidy. Returns the
// resulting row (or null if deleted).
export async function setDailyTags(date, tags, travelDest = '') {
  if (!date) throw new Error('setDailyTags: date is required');
  const cleanTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  // Destination only makes sense alongside the "travel" tag; drop it otherwise.
  const dest = cleanTags.includes('travel') ? (travelDest || '').trim() : '';

  if (cleanTags.length === 0) {
    // Delete-by-date instead of upsert-with-empty. RLS already scopes to the
    // logged-in user but we add an explicit user_id filter as belt-and-braces.
    const userId = await getCurrentUserId();
    const { error } = await supabase
      .from('daily_notes')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);
    if (error) {
      console.error('setDailyTags (delete) failed:', error);
      throw new Error(error.message);
    }
    return null;
  }

  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('daily_notes')
    .upsert(
      { user_id: userId, date, tags: cleanTags, travel_dest: dest || null },
      { onConflict: 'user_id,date' }
    )
    .select('*')
    .single();
  if (error) {
    console.error('setDailyTags (upsert) failed:', error);
    throw new Error(error.message);
  }
  return fromRow(data);
}

import { supabase } from "./supabaseClient";

// CRUD for the user's saved places. RLS guarantees you only ever read/write your
// own rows, so none of these functions need to send user_id (it defaults to
// auth.uid() on insert). Each throws on error so callers can try/catch.

// 1) LOAD — all of the signed-in user's saved places, newest first.
export async function getSavedPlaces() {
  const { data, error } = await supabase
    .from("saved_places")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// 2) CREATE — add a new saved place. Returns the inserted row.
export async function addSavedPlace({ name, address = null, lng, lat }) {
  const { data, error } = await supabase
    .from("saved_places")
    .insert({ name, address, lng, lat }) // user_id defaults to auth.uid()
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 3) UPDATE — change fields on one place by id. Returns the updated row.
export async function updateSavedPlace(id, fields) {
  const { data, error } = await supabase
    .from("saved_places")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 4) DELETE — remove one place by id.
export async function deleteSavedPlace(id) {
  const { error } = await supabase.from("saved_places").delete().eq("id", id);
  if (error) throw error;
}

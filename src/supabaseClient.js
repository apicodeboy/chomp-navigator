import { createClient } from "@supabase/supabase-js";

// ───────────────────────────────────────────────────────────────
// 1) PASTE YOUR PROJECT URL HERE  (Supabase dashboard → Project Settings → API → Project URL)
const SUPABASE_URL = "https://sckpsqygxfujbzfkbyej.supabase.co";

// 2) PASTE YOUR PUBLIC KEY HERE  (Project Settings → API → Project API keys → publishable/anon)
//    This key is safe to use in client code.
const SUPABASE_PUBLIC_KEY = "sb_publishable_Q5NAY9CV9pNHIziTPJh1eQ_Emw5Yn7R";
// ───────────────────────────────────────────────────────────────

// 3) The Supabase client — import this anywhere: `import { supabase } from "../supabaseClient";`
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

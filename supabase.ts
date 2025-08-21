import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ;

if (!SUPABASE_URL || !supabaseServiceKey) {
  console.warn(
    "SUPABASE_URL or SUPABASE_KEY not set. Set env vars or the client will not connect."
  );
}

export const supabase = createClient(SUPABASE_URL, supabaseServiceKey);

import 'dotenv/config';

import { createClient } from "@supabase/supabase-js";

const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SUPABASE_KEY || !SUPABASE_URL) {
  throw new Error("Supabase environment variables are not set");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default supabase;

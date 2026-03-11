import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zpfppufxilrkoupovaae.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZnBwdWZ4aWxya291cG92YWFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODQ2NTUsImV4cCI6MjA4ODU2MDY1NX0.zmOGnoxvTsn3-OK21jMtbpn_Qo6cPKGSXivDrRDhbbA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

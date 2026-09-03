import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function createSupabaseClient(url, anonKey) {
  return createClient(url, anonKey);
}

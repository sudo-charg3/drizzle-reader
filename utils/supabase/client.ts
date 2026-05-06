import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,        // stores session in localStorage
      autoRefreshToken: true,      // refreshes when back online
      detectSessionInUrl: true,
      storageKey: 'drizzle-auth',  // explicit key for clarity
    },
  }
);

// Keep createClient for compatibility if it's used elsewhere
export function createClient() {
  return supabase;
}

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,           // keep session in localStorage
    autoRefreshToken: true,         // auto-renew token before expiry
    detectSessionInUrl: false,      // don't look for session in URL
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'duoxpnse-auth',    // unique key so it doesn't conflict
    flowType: 'implicit',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

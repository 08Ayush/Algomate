/**
 * Neon Database Client (Browser/Client-side)
 *
 * Drop-in replacement for the old Supabase browser client.
 * Uses the NeonClient compatibility shim -- same API, Neon backend.
 */

import { createNeonClient } from '@/lib/neon-supabase-compat';

export const supabaseBrowser = createNeonClient();
export default supabaseBrowser;

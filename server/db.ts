import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { Pool } = pg;

// ── Local PostgreSQL pool (primary database) ──────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;

// ── Supabase JS client (for HTTPS-based operations) ───────────────────────────
// Supabase direct TCP is blocked from Replit (IPv6), so we use the REST client.
// Data has been fully migrated to Supabase and kept in sync via this client.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

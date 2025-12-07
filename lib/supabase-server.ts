import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lwedavmgeheabeqvgdnj.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3ZWRhdm1nZWhlYWJlcXZnZG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwNzgxMzksImV4cCI6MjA4MDY1NDEzOX0.J8vwCRFnautIqyzFcNpSkS8S0yHxAs9611kTybEXPUU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simple password hashing (for MVP - in production use bcrypt)
export function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}


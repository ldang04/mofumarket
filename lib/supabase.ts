// This file will be used in server actions
// We'll use mcp_supabase_execute_sql directly in actions

// Simple password hashing (for MVP - in production use bcrypt)
export function hashPassword(password: string): string {
  // Simple hash for MVP - in production use bcrypt
  return Buffer.from(password).toString('base64');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}


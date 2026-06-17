/**
 * Auth middleware for Next.js App Router API routes.
 * Validates Supabase session tokens from Authorization headers.
 */
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface AuthUser {
  id: string;
  email: string | undefined;
  role: string;
}

/**
 * Extract and validate the Bearer token from the request.
 * Returns null if authentication fails.
 */
export async function requireAuth(req: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return null;

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email,
      role: (user.app_metadata?.role as string) || 'user',
    };
  } catch {
    return null;
  }
}

/**
 * Check if the authenticated user has the required role.
 */
export function hasRole(user: AuthUser, ...roles: string[]): boolean {
  return roles.includes(user.role);
}

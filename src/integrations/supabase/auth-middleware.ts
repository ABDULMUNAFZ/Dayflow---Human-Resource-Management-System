import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env['SUPABASE_URL'] || 'https://ihhnftqsrhlfbvvjgqnl.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY'] || 'mock_publishable_key';
    
    const request = getRequest();

    if (!request?.headers) {
      throw new Error('Unauthorized: No request headers available');
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new Error('Unauthorized: Only Bearer tokens are supported');
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      throw new Error('Unauthorized: No token provided');
    }

    // Resolve mock session bearer tokens directly from mock database
    const { getDb } = await import('../../lib/mock-db');
    const db = getDb();

    const employee = db.employees.find((e) => e.user_id === token || e.id === token);

    if (!employee) {
      throw new Error('Unauthorized: Mock session employee profile not found');
    }

    const roles = db.user_roles
      .filter((r) => r.user_id === employee.user_id || r.user_id === employee.id)
      .map((r) => r.role);

    const claims = {
      sub: employee.user_id || employee.id,
      email: employee.email,
      roles,
    };

    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    return next({
      context: {
        supabase,
        userId: employee.user_id || employee.id,
        claims,
      },
    });
  },
);

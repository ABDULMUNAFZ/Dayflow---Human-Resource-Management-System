import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

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

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env['VITE_SUPABASE_URL'] || process.env['SUPABASE_URL'];
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env['SUPABASE_PUBLISHABLE_KEY'];

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

// LocalStorage keys for Mock authentication
const MOCK_USER_ID_KEY = 'dayflow_mock_user_id';
const MOCK_USER_EMAIL_KEY = 'dayflow_mock_user_email';

export const supabase = {
  from: (table: any) => {
    return createSupabaseClient().from(table);
  },
  rpc: (fn: any, args?: any) => {
    return createSupabaseClient().rpc(fn, args);
  },
  auth: {
    getUser: async (): Promise<{ data: { user: any }; error: any }> => {
      if (typeof window === 'undefined') return { data: { user: null }, error: null };
      const userId = localStorage.getItem(MOCK_USER_ID_KEY);
      const email = localStorage.getItem(MOCK_USER_EMAIL_KEY);
      if (!userId || !email) return { data: { user: null }, error: null };

      const user = {
        id: userId,
        email: email,
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };
      return { data: { user }, error: null };
    },
    getSession: async (): Promise<{ data: { session: any }; error: any }> => {
      if (typeof window === 'undefined') return { data: { session: null }, error: null };
      const userId = localStorage.getItem(MOCK_USER_ID_KEY);
      const email = localStorage.getItem(MOCK_USER_EMAIL_KEY);
      if (!userId || !email) return { data: { session: null }, error: null };

      const user = {
        id: userId,
        email: email,
        user_metadata: {},
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      };

      const session = {
        access_token: userId,
        token_type: 'bearer',
        expires_in: 3600,
        user,
      };
      return { data: { session }, error: null };
    },
    signInWithPassword: async ({ email }: { email: string; password?: string }): Promise<{ data: { user: any; session: any }; error: any }> => {
      try {
        const { signInMock } = await import("@/lib/employees.functions");
        const res = await signInMock({ data: { loginInput: email.trim() } });
        if (res.error) throw new Error(res.error);

        const mockUserId = res.userId!;
        localStorage.setItem(MOCK_USER_ID_KEY, mockUserId);
        localStorage.setItem(MOCK_USER_EMAIL_KEY, res.email!);

        const user = {
          id: mockUserId,
          email: res.email!,
          user_metadata: {},
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        };

        const session = {
          access_token: mockUserId,
          token_type: 'bearer',
          expires_in: 3600,
          user,
        };

        return { data: { user, session }, error: null };
      } catch (err) {
        return { data: { user: null, session: null }, error: err instanceof Error ? err : new Error('Login failed') };
      }
    },
    signOut: async (): Promise<{ error: any }> => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(MOCK_USER_ID_KEY);
        localStorage.removeItem(MOCK_USER_EMAIL_KEY);
      }
      return { error: null };
    },
    signInWithOAuth: async (): Promise<{ data: any; error: any }> => {
      return { data: null, error: new Error('OAuth is disabled in mock auth mode.') };
    },
    signUp: async (): Promise<{ data: any; error: any }> => {
      return { data: null, error: new Error('Signup is disabled in mock auth mode.') };
    },
    updateUser: async (): Promise<{ data: any; error: any }> => {
      return { data: { user: {} }, error: null };
    }
  }
} as any;

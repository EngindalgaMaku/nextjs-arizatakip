import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Force dynamic rendering for this component
export const dynamic = 'force-dynamic';

// Create a server-side Supabase client for Next.js route handlers and server actions
// using the recommended @supabase/ssr package.
// Make the function async to properly handle cookie operations if needed internally by createServerClient
export const createSupabaseServerClient = async () => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gcxbfmqyvqchcrudxpmh.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeGJmbXF5dnFjaGNydWR4cG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzQ5NTcsImV4cCI6MjA2MDc1MDk1N30.ZVAsgNkAWqtSpEgUufOdvegyXVeN5H6fXYA7rn-8osQ',
    {
      db: {
        schema: 'public',
      },
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            const cookieStore = await cookies();
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}; 
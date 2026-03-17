import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _supabaseAdmin: ReturnType<typeof createClient<any>> | null = null;

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_KEY!;
    console.log("[DEBUG] SUPABASE_URL:", url?.substring(0, 30), "len:", url?.length, "KEY len:", key?.length);
    // Use <any> to avoid `never` types on untyped table queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _supabaseAdmin = createClient<any>(url, key);
  }
  return _supabaseAdmin;
}

export async function createAuthClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — cookies can't be set
          }
        },
      },
    }
  );
}

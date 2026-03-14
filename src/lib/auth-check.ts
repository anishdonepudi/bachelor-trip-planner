import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function getAuthUser(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookieHeader = request.headers.get("cookie") ?? "";
          return cookieHeader.split(";").filter(Boolean).map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll() {
          // Not needed for reading
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function canEditTrip(userId: string, tripId: string): Promise<boolean> {
  // Check if user is owner
  const { data: trip } = await supabaseAdmin
    .from("trips")
    .select("owner_id")
    .eq("id", tripId)
    .single();

  if (trip?.owner_id === userId) return true;

  // Check if user is collaborator
  const { data: collab } = await supabaseAdmin
    .from("trip_collaborators")
    .select("user_id")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .single();

  return !!collab;
}

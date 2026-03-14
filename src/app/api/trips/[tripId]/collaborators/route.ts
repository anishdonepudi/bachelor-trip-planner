import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth-check";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;

  try {
    const { data, error } = await supabaseAdmin
      .from("trip_collaborators")
      .select("user_id, role, added_at")
      .eq("trip_id", tripId);

    if (error) throw error;

    // Fetch email for each collaborator
    const collaborators = await Promise.all(
      (data ?? []).map(async (collab) => {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(collab.user_id);
        return {
          user_id: collab.user_id,
          email: userData?.user?.email ?? null,
          role: collab.role,
          added_at: collab.added_at,
        };
      })
    );

    return NextResponse.json({ collaborators });
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json({ error: "Failed to fetch collaborators" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params;

  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only owner can add collaborators
  const { data: trip } = await supabaseAdmin
    .from("trips")
    .select("owner_id")
    .eq("id", tripId)
    .single();

  if (!trip || trip.owner_id !== user.id) {
    return NextResponse.json({ error: "Only the trip owner can add collaborators" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user by email
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = users?.users?.find((u) => u.email === email);

    if (!targetUser) {
      return NextResponse.json({ error: "No user found with that email" }, { status: 404 });
    }

    // Add collaborator
    const { error } = await supabaseAdmin
      .from("trip_collaborators")
      .upsert({ trip_id: tripId, user_id: targetUser.id, role: "editor" });

    if (error) throw error;

    return NextResponse.json({ success: true, user_id: targetUser.id, email: targetUser.email });
  } catch (error) {
    console.error("Error adding collaborator:", error);
    return NextResponse.json({ error: "Failed to add collaborator" }, { status: 500 });
  }
}

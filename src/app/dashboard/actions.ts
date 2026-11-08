"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function switchActiveGym(formData: FormData) {
  const gymId = String(formData.get("gym_id") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(gymId)) redirect("/dashboard?error=invalid_gym");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Never trust a submitted gym ID: verify active membership and approval server-side.
  const { data: membership, error } = await supabase
    .from("gym_users")
    .select("gym_id")
    .eq("gym_id", gymId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !membership) redirect("/dashboard?error=gym_access_denied");

  const { data: gym } = await supabase
    .from("gyms")
    .select("id")
    .eq("id", gymId)
    .eq("approval_status", "approved")
    .maybeSingle();

  if (!gym) redirect("/dashboard?error=gym_not_available");

  const cookieStore = await cookies();
  cookieStore.set("gymos_active_gym", gymId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/dashboard");
}

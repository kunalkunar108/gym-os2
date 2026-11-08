import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getActiveGymContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships, error: membershipError } = await supabase
    .from("gym_users")
    .select("gym_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "staff"]);

  if (membershipError) throw new Error("Unable to load your gym memberships.");
  if (!memberships?.length) redirect("/onboarding");

  const { data: gyms, error: gymsError } = await supabase
    .from("gyms")
    .select("id,name,slug,approval_status")
    .in("id", memberships.map((item) => item.gym_id))
    .eq("approval_status", "approved")
    .order("created_at", { ascending: true });

  if (gymsError) throw new Error("Unable to load your approved gyms.");
  if (!gyms?.length) redirect("/onboarding");

  const cookieStore = await cookies();
  const requestedGymId = cookieStore.get("gymos_active_gym")?.value;
  const gym = gyms.find((item) => item.id === requestedGymId) ?? gyms[0];
  const membership = memberships.find((item) => item.gym_id === gym.id);

  return {
    supabase,
    user,
    gym,
    gymId: gym.id,
    role: membership?.role ?? "staff",
    gyms,
    memberships,
  };
}

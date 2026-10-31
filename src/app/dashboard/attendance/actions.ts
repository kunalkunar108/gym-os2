"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getGymContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships, error: accessError } = await supabase
    .from("gym_users")
    .select("gym_id,role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "staff"])
    .limit(10);

  if (accessError || !memberships?.length) redirect("/onboarding");

  const gymIds = memberships.map((item) => item.gym_id);
  const { data: gyms, error: gymError } = await supabase
    .from("gyms")
    .select("id,name")
    .in("id", gymIds)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(1);

  const gym = gyms?.[0];
  if (gymError || !gym) redirect("/onboarding");
  return { supabase, user, gym };
}

export async function checkInMember(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "").trim();
  if (!memberId) redirect("/dashboard/attendance?error=Select%20a%20member");

  const { supabase, user, gym } = await getGymContext();
  const { data: member, error: memberError } = await supabase
    .from("members")
    .select("id,status")
    .eq("id", memberId)
    .eq("gym_id", gym.id)
    .maybeSingle();

  if (memberError || !member || member.status !== "active") {
    redirect("/dashboard/attendance?error=Choose%20an%20active%20member");
  }

  const { error } = await supabase.from("attendance").insert({
    gym_id: gym.id,
    member_id: memberId,
    recorded_by: user.id,
    note: null,
  });

  if (error?.code === "23505") {
    redirect("/dashboard/attendance?error=This%20member%20is%20already%20checked%20in");
  }
  if (error) redirect(`/dashboard/attendance?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/dashboard/attendance");
  revalidatePath("/dashboard");
  redirect("/dashboard/attendance?success=Member%20checked%20in");
}

export async function checkOutMember(formData: FormData) {
  const attendanceId = String(formData.get("attendance_id") ?? "").trim();
  if (!attendanceId) redirect("/dashboard/attendance?error=Invalid%20attendance%20record");

  const { supabase, gym } = await getGymContext();
  const { data, error } = await supabase
    .from("attendance")
    .update({ checked_out_at: new Date().toISOString() })
    .eq("id", attendanceId)
    .eq("gym_id", gym.id)
    .is("checked_out_at", null)
    .select("id")
    .maybeSingle();

  if (error) redirect(`/dashboard/attendance?error=${encodeURIComponent(error.message)}`);
  if (!data) redirect("/dashboard/attendance?error=Record%20not%20found%20or%20already%20checked%20out");

  revalidatePath("/dashboard/attendance");
  redirect("/dashboard/attendance?success=Member%20checked%20out");
}

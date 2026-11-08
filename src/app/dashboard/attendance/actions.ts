"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymContext } from "@/lib/gym-context";

async function getGymContext() {
  const context = await getActiveGymContext();
  return { ...context, gym: { id: context.gymId, name: context.gym.name } };
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

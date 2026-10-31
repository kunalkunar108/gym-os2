"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getGymContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gym, error } = await supabase
    .from("gyms")
    .select("id")
    .eq("owner_user_id", user.id)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !gym) redirect("/onboarding");
  return { supabase, user, gymId: gym.id };
}

function value(formData: FormData, key: string, max = 100) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

function isValidDate(date: string) {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day + days));
  return result.toISOString().slice(0, 10);
}

export async function assignMembership(formData: FormData) {
  const memberId = value(formData, "member_id", 64);
  const planId = value(formData, "plan_id", 64);
  const startDate = value(formData, "start_date", 10);

  if (!memberId || !planId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    redirect("/dashboard/memberships?error=Select%20a%20member%2C%20plan%20and%20valid%20start%20date");
  }

  const { supabase, user, gymId } = await getGymContext();

  const [{ data: member, error: memberError }, { data: plan, error: planError }] = await Promise.all([
    supabase.from("members").select("id,full_name,status").eq("id", memberId).eq("gym_id", gymId).maybeSingle(),
    supabase.from("membership_plans").select("id,name,duration_days,price,is_active").eq("id", planId).eq("gym_id", gymId).maybeSingle(),
  ]);

  if (memberError || !member || member.status !== "active") {
    redirect("/dashboard/memberships?error=Choose%20an%20active%20member");
  }
  if (planError || !plan || !plan.is_active) {
    redirect("/dashboard/memberships?error=Choose%20an%20active%20membership%20plan");
  }

  const endDate = addDays(startDate, plan.duration_days - 1);
  const { data: overlap, error: overlapError } = await supabase
    .from("memberships")
    .select("id")
    .eq("gym_id", gymId)
    .eq("member_id", memberId)
    .eq("status", "active")
    .lte("start_date", endDate)
    .gte("end_date", startDate)
    .limit(1)
    .maybeSingle();

  if (overlapError) redirect(`/dashboard/memberships?error=${encodeURIComponent(overlapError.message)}`);
  if (overlap) redirect("/dashboard/memberships?error=This%20member%20already%20has%20an%20active%20membership%20on%20that%20date");

  const { error } = await supabase.from("memberships").insert({
    gym_id: gymId,
    member_id: memberId,
    plan_id: planId,
    start_date: startDate,
    end_date: endDate,
    price_snapshot: plan.price,
    status: "active",
    created_by: user.id,
  });

  if (error) redirect(`/dashboard/memberships?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/memberships");
  revalidatePath("/dashboard");
  redirect("/dashboard/memberships?success=Membership%20assigned%20successfully");
}

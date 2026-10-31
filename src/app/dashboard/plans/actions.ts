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

function textValue(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parsePlan(formData: FormData) {
  const name = textValue(formData.get("name"), 80);
  const durationDays = Number(textValue(formData.get("duration_days"), 5));
  const priceRaw = textValue(formData.get("price"), 20);
  const price = Number(priceRaw);
  if (name.length < 2 || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650 ||
      !/^\d+(\.\d{1,2})?$/.test(priceRaw) || !Number.isFinite(price) || price < 0 || price > 9999999999) {
    redirect("/dashboard/plans?error=Enter%20a%20valid%20name%2C%20duration%20and%20price");
  }
  return { name, duration_days: durationDays, price };
}

export async function createMembershipPlan(formData: FormData) {
  const plan = parsePlan(formData);
  const { supabase, user, gymId } = await getGymContext();

  const { error } = await supabase.from("membership_plans").insert({
    gym_id: gymId,
    ...plan,
    is_active: true,
    created_by: user.id,
  });

  if (error) redirect(`/dashboard/plans?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/plans");
  redirect("/dashboard/plans?success=Membership%20plan%20created");
}

export async function updateMembershipPlan(formData: FormData) {
  const planId = textValue(formData.get("plan_id"), 64);
  const plan = parsePlan(formData);
  const isActive = textValue(formData.get("is_active"), 10) === "true";
  if (!planId) redirect("/dashboard/plans?error=Invalid%20plan");

  const { supabase, gymId } = await getGymContext();
  const { error } = await supabase
    .from("membership_plans")
    .update({ ...plan, is_active: isActive })
    .eq("id", planId)
    .eq("gym_id", gymId);

  if (error) redirect(`/dashboard/plans?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/dashboard/plans");
  redirect("/dashboard/plans?success=Membership%20plan%20updated");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateGymSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership, error: membershipError } = await supabase
    .from("gym_users")
    .select("gym_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership) redirect("/dashboard?error=owner_access_required");

  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  const timeZone = String(formData.get("time_zone") ?? "").trim();
  const expiryWarningDays = Number(formData.get("expiry_warning_days"));

  const allowedCurrencies = ["INR", "USD", "AED"];
  const allowedTimeZones = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London"];
  if (!allowedCurrencies.includes(currency) || !allowedTimeZones.includes(timeZone)
      || !Number.isInteger(expiryWarningDays) || expiryWarningDays < 0 || expiryWarningDays > 90) {
    redirect("/dashboard/settings?error=invalid_settings");
  }

  const { error } = await supabase
    .from("gym_settings")
    .update({
      currency,
      time_zone: timeZone,
      expiry_warning_days: expiryWarningDays,
    })
    .eq("gym_id", membership.gym_id);

  if (error) redirect("/dashboard/settings?error=save_failed");

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  redirect("/dashboard/settings?success=1");
}

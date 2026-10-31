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
  return { supabase, gymId: gym.id };
}

function field(formData: FormData, key: string, max = 300) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim().slice(0, max) : "";
}

export async function recordMemberPayment(formData: FormData) {
  const membershipId = field(formData, "membership_id", 64);
  const amountText = field(formData, "amount", 30);
  const method = field(formData, "method", 30);
  const note = field(formData, "note", 300);
  const amount = Number(amountText);

  if (!membershipId || !/^\d+(\.\d{1,2})?$/.test(amountText) || !Number.isFinite(amount) || amount <= 0) {
    redirect("/dashboard/payments?error=Enter%20a%20valid%20payment%20amount");
  }
  if (!["cash", "upi", "bank_transfer", "card", "other"].includes(method)) {
    redirect("/dashboard/payments?error=Choose%20a%20valid%20payment%20method");
  }

  const { supabase, gymId } = await getGymContext();
  const { error } = await supabase.rpc("record_member_payment", {
    target_gym_id: gymId,
    target_membership_id: membershipId,
    payment_amount: amount,
    payment_method: method,
    payment_note: note || null,
  });

  if (error) {
    redirect(`/dashboard/payments?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/payments");
  revalidatePath("/dashboard");
  redirect("/dashboard/payments?success=Payment%20recorded%20successfully");
}

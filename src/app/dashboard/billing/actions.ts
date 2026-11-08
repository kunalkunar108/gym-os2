"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveGymContext } from "@/lib/gym-context";

export async function submitGymSubscription(formData: FormData) {
  const { supabase, gymId: activeGymId, role } = await getActiveGymContext();
  if (role !== "owner") redirect("/dashboard");
  const gymId = String(formData.get("gymId") ?? "");
  if (gymId !== activeGymId) redirect("/dashboard/billing?error=workspace_changed");
  const planId = String(formData.get("planId") ?? "");
  const billingCycle = String(formData.get("billingCycle") ?? "");
  const method = String(formData.get("method") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(gymId) || !/^[0-9a-f-]{36}$/i.test(planId)
      || !["monthly", "annual"].includes(billingCycle)
      || !["upi", "bank_transfer", "cash"].includes(method)
      || reference.length < 2 || reference.length > 160) {
    redirect("/dashboard/billing?error=invalid");
  }

  const { error } = await supabase.rpc("owner_submit_gym_subscription", {
    target_gym_id: gymId,
    target_plan_id: planId,
    target_billing_cycle: billingCycle,
    payment_method: method,
    payment_reference: reference,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already awaiting review")) redirect("/dashboard/billing?error=pending");
    if (message.includes("already active")) redirect("/dashboard/billing?error=active");
    redirect("/dashboard/billing?error=submit_failed");
  }

  revalidatePath("/dashboard/billing");
  revalidatePath("/admin/billing");
  redirect("/dashboard/billing?submitted=1");
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  if (profile?.platform_role !== "super_admin") redirect("/dashboard");
  return supabase;
}

export async function reviewSubscriptionPayment(formData: FormData) {
  const supabase = await requirePlatformAdmin();
  const paymentId = String(formData.get("paymentId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(paymentId) || !["verified", "rejected"].includes(decision)) redirect("/admin/billing?error=invalid");
  if (decision === "rejected" && note.length < 5) redirect("/admin/billing?error=note_required");

  const { error } = await supabase.rpc("admin_review_subscription_payment", {
    target_payment_id: paymentId, decision, review_note: decision === "rejected" ? note : null,
  });
  if (error) redirect("/admin/billing?error=review_failed");

  revalidatePath("/admin/billing");
  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard");
  redirect("/admin/billing?updated=1");
}

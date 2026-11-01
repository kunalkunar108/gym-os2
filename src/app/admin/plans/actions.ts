"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  if (profile?.platform_role !== "super_admin") redirect("/dashboard");
  return supabase;
}

export async function savePlatformPlan(formData: FormData) {
  const supabase = await requireAdmin();
  const rawId = String(formData.get("planId") ?? "").trim();
  const planId = rawId || null;
  if (planId && !/^[0-9a-f-]{36}$/i.test(planId)) redirect("/admin/plans?error=invalid");
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const setupFee = Number(formData.get("setupFee"));
  const monthlyFee = Number(formData.get("monthlyFee"));
  const annualFee = Number(formData.get("annualFee"));
  const active = String(formData.get("active") ?? "") === "true";
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(code) || name.length < 2 || name.length > 80
      || ![setupFee,monthlyFee,annualFee].every(v=>Number.isFinite(v)&&v>=0)
      || (monthlyFee===0&&annualFee===0)) redirect("/admin/plans?error=invalid");
  const { error } = await supabase.rpc("admin_save_platform_plan", {
    target_plan_id: planId, plan_code: code, plan_name: name,
    setup_amount: setupFee, monthly_amount: monthlyFee, annual_amount: annualFee, active_flag: active,
  });
  if (error) redirect("/admin/plans?error=save_failed");
  revalidatePath("/admin/plans");
  revalidatePath("/dashboard/billing");
  redirect("/admin/plans?saved=1");
}

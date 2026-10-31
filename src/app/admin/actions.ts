"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requirePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || profile?.platform_role !== "super_admin") {
    redirect("/dashboard");
  }

  return supabase;
}

export async function reviewGym(formData: FormData) {
  const supabase = await requirePlatformAdmin();
  const gymId = String(formData.get("gymId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(gymId)) {
    redirect("/admin?error=invalid_request");
  }
  if (decision !== "approved" && decision !== "rejected") {
    redirect("/admin?error=invalid_decision");
  }
  if (decision === "rejected" && reason.length < 5) {
    redirect("/admin?error=reason_required");
  }

  const { error } = await supabase.rpc("admin_set_gym_approval", {
    target_gym_id: gymId,
    decision,
    reason: decision === "rejected" ? reason : null,
  });

  if (error) {
    redirect("/admin?error=review_failed");
  }

  revalidatePath("/admin");
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  redirect("/admin?updated=1");
}

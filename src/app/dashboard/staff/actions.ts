"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships, error } = await supabase
    .from("gym_users")
    .select("gym_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .eq("status", "active")
    .limit(10);

  if (error || !memberships?.length) redirect("/dashboard");
  const gymIds = memberships.map((item) => item.gym_id);
  const { data: gyms } = await supabase
    .from("gyms")
    .select("id")
    .in("id", gymIds)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(1);
  const gym = gyms?.[0];
  if (!gym) redirect("/onboarding");
  return { supabase, gymId: gym.id };
}

export async function inviteStaff(formData: FormData) {
  const emailRaw = formData.get("email");
  // Normalize pasted addresses and remove invisible characters sometimes added by mobile keyboards.
  const email = typeof emailRaw === "string"
    ? emailRaw.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").trim().toLowerCase()
    : "";
  const [localPart, domain, ...extra] = email.split("@");
  const validEmail = extra.length === 0
    && !!localPart
    && localPart.length <= 64
    && !!domain
    && domain.includes(".")
    && !email.includes("..")
    && /^[^\s@]+$/.test(localPart)
    && /^[a-z0-9.-]+$/i.test(domain)
    && domain.split(".").every((label) => !!label && !label.startsWith("-") && !label.endsWith("-"));
  if (email.length > 254 || !validEmail) {
    redirect("/dashboard/staff?error=Enter%20a%20valid%20email%20address");
  }

  const { supabase, gymId } = await requireOwner();
  const { data: token, error } = await supabase.rpc("create_gym_staff_invitation", {
    target_gym_id: gymId,
    invite_email: email,
  });
  if (error || !token) {
    redirect("/dashboard/staff?error=" + encodeURIComponent(error?.message ?? "Could not create invitation"));
  }

  revalidatePath("/dashboard/staff");
  redirect("/dashboard/staff?inviteToken=" + encodeURIComponent(token));
}

export async function updateStaffStatus(formData: FormData) {
  const userIdRaw = formData.get("user_id");
  const statusRaw = formData.get("status");
  const userId = typeof userIdRaw === "string" ? userIdRaw.trim() : "";
  const status = typeof statusRaw === "string" ? statusRaw : "";
  if (!/^[0-9a-f-]{36}$/i.test(userId) || !["active", "disabled"].includes(status)) {
    redirect("/dashboard/staff?error=Invalid%20staff%20request");
  }

  const { supabase, gymId } = await requireOwner();
  const { error } = await supabase.rpc("set_gym_staff_status", {
    target_gym_id: gymId,
    target_user_id: userId,
    new_status: status,
  });
  if (error) redirect("/dashboard/staff?error=" + encodeURIComponent(error.message));

  revalidatePath("/dashboard/staff");
  revalidatePath("/dashboard");
  redirect("/dashboard/staff?success=Staff%20access%20updated");
}

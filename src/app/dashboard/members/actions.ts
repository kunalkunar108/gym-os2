"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymContext } from "@/lib/gym-context";

async function getApprovedGymId() {
  const context = await getActiveGymContext();
  return { ...context, gymId: context.gymId };
}

function requiredText(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function addMember(formData: FormData) {
  const fullName = requiredText(formData.get("full_name"), 120);
  const phone = requiredText(formData.get("phone"), 30);
  const email = requiredText(formData.get("email"), 254);
  const notes = requiredText(formData.get("notes"), 1000);

  if (fullName.length < 2 || phone.length < 5) {
    redirect("/dashboard/members?error=Please%20enter%20a%20valid%20name%20and%20phone%20number");
  }

  const { supabase, user, gymId } = await getApprovedGymId();
  const memberCode = `MEM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { error } = await supabase.from("members").insert({
    gym_id: gymId,
    member_code: memberCode,
    full_name: fullName,
    phone,
    email: email || null,
    notes: notes || null,
    created_by: user.id,
    status: "active",
  });

  if (error) {
    redirect(`/dashboard/members?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/members");
  redirect("/dashboard/members?success=Member%20added%20successfully");
}

export async function updateMember(formData: FormData) {
  const memberId = requiredText(formData.get("member_id"), 64);
  const fullName = requiredText(formData.get("full_name"), 120);
  const phone = requiredText(formData.get("phone"), 30);
  const email = requiredText(formData.get("email"), 254);
  const notes = requiredText(formData.get("notes"), 1000);
  const status = requiredText(formData.get("status"), 20);

  if (!memberId || fullName.length < 2 || phone.length < 5 || !["active", "inactive", "archived"].includes(status)) {
    redirect("/dashboard/members?error=Please%20check%20the%20member%20details");
  }

  const { supabase, gymId } = await getApprovedGymId();
  const { error } = await supabase
    .from("members")
    .update({
      full_name: fullName,
      phone,
      email: email || null,
      notes: notes || null,
      status,
    })
    .eq("id", memberId)
    .eq("gym_id", gymId);

  if (error) {
    redirect(`/dashboard/members?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/members");
  redirect("/dashboard/members?success=Member%20details%20updated");
}

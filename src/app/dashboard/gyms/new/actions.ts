"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function registerAdditionalGym(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  if (name.length < 2 || name.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 55) {
    redirect("/dashboard/gyms/new?error=Enter%20a%20valid%20gym%20name%20and%20workspace%20slug");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // The database insert policy requires owner_user_id to match the authenticated user
  // and forces pending approval. The DB trigger creates owner membership and settings.
  const { error } = await supabase.from("gyms").insert({
    name,
    slug,
    owner_user_id: user.id,
    approval_status: "pending",
  });

  if (error) {
    const message = error.code === "23505"
      ? "That workspace address is already in use. Choose another."
      : "The gym could not be registered. Please check the details and try again.";
    redirect("/dashboard/gyms/new?error=" + encodeURIComponent(message));
  }

  redirect("/dashboard/gyms/new?submitted=1");
}

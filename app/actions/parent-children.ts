"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ensureFamilyCode, generateChildPin } from "@/app/actions/child-auth";
import { randomBytes } from "crypto";

export async function createChild(input: {
  parentUserId: string;
  name:         string;
  grade:        string;
}): Promise<{ success: true; pin: string; childId: string } | { success: false; error: string }> {
  // Verify caller is a parent
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== input.parentUserId) {
    return { success: false, error: "לא מורשה" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "parent" || profile?.is_blocked) {
    return { success: false, error: "לא מורשה" };
  }

  const admin = createAdminClient();

  // 1. Ensure parent has a family code
  await ensureFamilyCode(input.parentUserId);

  // 2. Generate internal credentials — child never sees these
  const randomSuffix = randomBytes(8).toString("hex");
  const internalEmail    = `child-${randomSuffix}@crystal-champions.internal`;
  const internalPassword = randomBytes(16).toString("hex");

  // 3. Create auth user for child
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email:          internalEmail,
    password:       internalPassword,
    email_confirm:  true,
    user_metadata:  { role: "child", display_name: input.name },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? "שגיאה ביצירת המשתמש" };
  }

  const childUserId = authData.user.id;

  // 4. Ensure profile row exists
  await admin.from("profiles").upsert({
    id:        childUserId,
    email:     internalEmail,
    full_name: input.name,
    role:      "child",
  }, { onConflict: "id" });

  // 5. Create child_profile
  const { data: childProfile, error: cpError } = await admin
    .from("child_profiles")
    .insert({
      user_id:         childUserId,
      display_name_he: input.name,
      grade_level:     input.grade,
    })
    .select("id")
    .single();

  if (cpError || !childProfile) {
    return { success: false, error: "שגיאה ביצירת פרופיל הילד" };
  }

  // 6. Link parent → child
  await admin.from("parent_child_links").insert({
    parent_id: input.parentUserId,
    child_id:  childProfile.id,
  });

  // 7. Auto-generate PIN for child
  const pinResult = await generateChildPin(childProfile.id, input.parentUserId);
  const pin = pinResult.success ? pinResult.pin : "";

  revalidatePath("/parent/children");
  revalidatePath("/parent");

  return { success: true, pin, childId: childProfile.id };
}

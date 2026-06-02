import { createAdminClient } from "@/lib/supabase/admin";

// Writes an audit log entry via service role — never throws so it
// cannot break the main action that called it.
export async function writeAudit(
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("audit_logs").insert({
      actor_user_id: actorId,
      action_type:   action,
      target_type:   targetType,
      target_id:     targetId,
      details:       details ?? null,
    });
  } catch {
    // Audit failure must never surface to the user
  }
}

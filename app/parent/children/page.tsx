import { requireRole } from "@/lib/auth/helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ChildrenManager, type ChildSummary } from "@/components/parent/ChildrenManager";
import { ensureFamilyCode } from "@/app/actions/child-auth";

export default async function ParentChildrenPage() {
  await requireRole("parent");

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  const familyCode = await ensureFamilyCode(user.id);

  const { data: links } = await admin
    .from("parent_child_links")
    .select(`
      child_id,
      child:child_profiles (
        id,
        display_name_he,
        grade_level,
        total_coins,
        total_stars,
        total_xp,
        child_login_enabled,
        locked_until
      )
    `)
    .eq("parent_id", user.id);

  const children = (links ?? []).flatMap(l =>
    Array.isArray(l.child) ? l.child : l.child ? [l.child] : []
  ) as unknown as ChildSummary[];

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/parent" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← חזרה ללוח בקרה
          </Link>
          <h1 className="text-2xl font-black text-white mt-2">👨‍👩‍👧 הילדים שלי</h1>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-700/40 bg-amber-900/20 p-5 mb-8">
        <p className="text-amber-300 text-xs font-bold mb-1">קוד המשפחה שלך</p>
        <p className="text-white text-4xl font-mono font-black tracking-[0.4em]">{familyCode}</p>
        <p className="text-slate-400 text-xs mt-2">
          הילדים מזינים קוד זה במסך הכניסה, ואז את ה-PIN האישי שלהם
        </p>
      </div>

      <ChildrenManager parentUserId={user.id} items={children} />
    </main>
  );
}

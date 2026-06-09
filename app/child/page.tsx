import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { getChildDashboardData } from "@/app/actions/child-dashboard";
import Link from "next/link";

export default async function ChildPage() {
  await requireRole("child");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { activeAdventure } = await getChildDashboardData();

  const arenaHref = activeAdventure
    ? `/child/arena?adventure=${activeAdventure.id}`
    : null;

  return (
    <>
      <style>{`
        html,body{margin:0;padding:0;overflow:hidden}
        .ghost{background:transparent!important;border:none!important;box-shadow:none!important;outline:none!important;opacity:0!important;}
        .ghost:hover,.ghost:focus,.ghost:active{background:transparent!important;border:none!important;box-shadow:none!important;outline:none!important;opacity:0!important;}
      `}</style>

      <main dir="rtl" style={{
        position: "fixed", inset: 0,
        backgroundImage: "url('/child-hub-bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        overflow: "hidden",
      }}>

        {/* Hero hit area → /child/heroes */}
        <Link href="/child/heroes" className="ghost" style={{
          position: "absolute",
          top: "13%", left: "50%",
          transform: "translateX(-50%)",
          width: "min(280px,20vw)",
          height: "55%",
          display: "block",
          cursor: "pointer",
          zIndex: 20,
        }} aria-label="גיבור" />

        {/* Arena primary CTA hit area */}
        {arenaHref ? (
          <Link href={arenaHref} className="ghost" style={{
            position: "absolute",
            top: "73%", left: "50%",
            transform: "translateX(-50%)",
            width: "min(640px,44%)",
            height: "14%",
            display: "block",
            cursor: "pointer",
            zIndex: 25,
          }} aria-label="כניסה לזירה" />
        ) : (
          <div style={{
            position: "absolute",
            top: "73%", left: "50%",
            transform: "translateX(-50%)",
            width: "min(640px,44%)",
            height: "14%",
            zIndex: 25,
            cursor: "not-allowed",
          }} />
        )}

      </main>
    </>
  );
}

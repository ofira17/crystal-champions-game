// Child dashboard — background image only + transparent hit areas
// Visual design = /child-hub-bg.png (the approved image IS the UI)
// Only invisible click targets are overlaid — no duplicate rendering

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
        .hit:hover{background:rgba(255,255,255,0.06)!important}
        .hit:active{background:rgba(255,255,255,0.12)!important}
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
        <Link href="/child/heroes" className="hit" style={{
          position: "absolute",
          top: "13%", left: "50%",
          transform: "translateX(-50%)",
          width: "min(280px,20vw)",
          height: "55%",
          background: "transparent",
          borderRadius: 24,
          zIndex: 20,
          display: "block",
        }} aria-label="גיבור" />

        {/* Arena button hit area */}
        <div style={{
          position: "absolute",
          top: "74%", left: "50%",
          transform: "translateX(-50%)",
          width: "min(640px,44%)",
          zIndex: 25,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {arenaHref ? (
            <>
              <Link href={arenaHref} className="hit" style={{
                display: "block",
                height: "clamp(50px,6.5vh,72px)",
                background: "transparent",
                borderRadius: 18,
              }} aria-label="כניסה לזירה" />
              {/* second CTA line in image */}
              <Link href={arenaHref} className="hit" style={{
                display: "block",
                height: "clamp(44px,5.5vh,64px)",
                background: "transparent",
                borderRadius: 18,
              }} aria-label="כניסה לזירה" />
            </>
          ) : (
            <>
              <div style={{ height: "clamp(50px,6.5vh,72px)" }} />
              <div style={{ height: "clamp(44px,5.5vh,64px)" }} />
            </>
          )}
        </div>

        {/* World card hit areas row */}
        <div style={{
          position: "absolute",
          top: "84%", left: 0, right: 0,
          padding: "0 1%",
          zIndex: 20,
          display: "grid",
          gridTemplateColumns: "repeat(5,1fr)",
          gap: "0.7%",
          height: "clamp(80px,9vh,105px)",
        }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} className="hit" style={{
              borderRadius: 16,
              background: "transparent",
              cursor: "default",
            }} />
          ))}
        </div>

      </main>
    </>
  );
}

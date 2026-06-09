// ══════════════════════════════════════════════════════════
// Child dashboard — full fantasy hub screen.
// Visual target: illustrated game hub with castle, crystals,
// hero, panels, world cards. All data is real DB data.
// ══════════════════════════════════════════════════════════

import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { getChildDashboardData } from "@/app/actions/child-dashboard";
import {
  CHILD_ARENA_BUTTON,
  CHILD_HERO_RESTING_TEXT,
  CHILD_ADVENTURE_SUBTITLES,
  mapStrategyToArenaThreat,
  GRADE_LABELS,
  type MissionType,
} from "@/lib/terminology";
import Link from "next/link";
import { HeroDisplay } from "@/components/child/HeroDisplay";
import { ArenaButton } from "@/components/child/ArenaButton";
import LogoutButton from "@/components/auth/LogoutButton";

const WORLD_CARD_STYLES = [
  {
    cardIcon: "📦",
    gradFrom: "#4a2800", gradTo: "#7a4800",
    border: "#c97f00", bdrShadow: "#3a2000",
    glowColor: "rgba(201,127,0,0.45)",
  },
  {
    cardIcon: "🗺️",
    gradFrom: "#4a0a0a", gradTo: "#701515",
    border: "#b91c1c", bdrShadow: "#3d0a0a",
    glowColor: "rgba(185,28,28,0.4)",
  },
  {
    cardIcon: "🌳",
    gradFrom: "#062a1c", gradTo: "#054a30",
    border: "#059669", bdrShadow: "#042d1c",
    glowColor: "rgba(5,150,105,0.4)",
  },
  {
    cardIcon: "🏰",
    gradFrom: "#07162e", gradTo: "#102848",
    border: "#2563eb", bdrShadow: "#061020",
    glowColor: "rgba(37,99,235,0.4)",
  },
];

export default async function ChildPage() {
  await requireRole("child");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { profile, hero, activeAdventure, worlds, energyMax } =
    await getChildDashboardData();

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">מגדיר את הפרופיל שלך...</p>
      </main>
    );
  }

  const hasAdventure  = !!activeAdventure;
  const adventureType = (activeAdventure?.mission_type ?? "hero_training") as MissionType;
  const heroType      = hero?.color_theme ?? "default";
  const heroRarity    = (hero?.rarity ?? "Common") as "Common" | "Rare" | "Epic" | "Legendary";
  const heroName      = hero?.name_he ?? "הגיבור שלך";
  const heroGender    = (hero?.gender ?? "M") as "M" | "F";
  const gradeLabel    = profile.grade_level ? (GRADE_LABELS[profile.grade_level] ?? "") : "";
  const arenaThreat   = activeAdventure
    ? mapStrategyToArenaThreat(activeAdventure.selection_strategy)
    : null;

  const speechText = hasAdventure && activeAdventure.story_text_he
    ? activeAdventure.story_text_he
    : hasAdventure
      ? CHILD_ADVENTURE_SUBTITLES[adventureType]
      : "כל שאלה נכונה – עוד צעד אל הניצחון!";

  const overallProgress = worlds.length > 0
    ? Math.round(
        worlds.reduce((s, w) => s + (w.is_unlocked ? w.progress_percent : 0), 0) /
        Math.max(1, worlds.filter(w => w.is_unlocked).length)
      )
    : 0;

  return (
    <main
      dir="rtl"
      className="relative min-h-screen flex flex-col overflow-hidden"
      style={{ background: "#0a0320", fontFamily: "var(--font-sans)" }}
    >
      {/* ══════════════════════════════════════════
          FULL FANTASY BACKGROUND SCENE
      ══════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>

        {/* Sky gradient */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, #07021a 0%, #120540 25%, #1e0855 45%, #2a0f68 60%, #1a0840 80%, #0e0430 100%)",
        }} />

        {/* Nebula clouds */}
        <div className="absolute" style={{
          top: 0, left: 0, right: 0, height: "65%",
          background: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(100,40,200,0.55) 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(50,20,160,0.45) 0%, transparent 65%),
            radial-gradient(ellipse 50% 35% at 20% 25%, rgba(80,10,160,0.4) 0%, transparent 60%)
          `,
        }} />

        {/* Stars layer — many small */}
        {Array.from({ length: 60 }).map((_, i) => {
          const size = 1 + (i % 3);
          const x    = ((i * 137 + 17) % 98) + 1;
          const y    = ((i * 79  + 31) % 55) + 1;
          const op   = 0.25 + (i % 7) * 0.1;
          return (
            <div key={i} className="absolute rounded-full bg-white" style={{
              width: size, height: size,
              left: `${x}%`, top: `${y}%`,
              opacity: op,
              boxShadow: size > 1 ? `0 0 ${size * 2}px rgba(200,200,255,0.6)` : "none",
            }} />
          );
        })}

        {/* Bright star clusters */}
        {[
          { x: 15, y: 8, r: 3 }, { x: 45, y: 5, r: 2.5 }, { x: 72, y: 12, r: 3 },
          { x: 88, y: 7, r: 2 }, { x: 30, y: 18, r: 2 },  { x: 60, y: 3,  r: 2.5 },
        ].map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            width: s.r * 2, height: s.r * 2,
            left: `${s.x}%`, top: `${s.y}%`,
            opacity: 0.9,
            boxShadow: `0 0 ${s.r * 4}px ${s.r * 2}px rgba(200,180,255,0.5), 0 0 ${s.r * 8}px rgba(150,100,255,0.3)`,
          }} />
        ))}

        {/* ── FLOATING ISLANDS ── */}
        {/* Island 1 - upper left area */}
        <div className="absolute" style={{ left: "4%", top: "8%", width: "120px", height: "55px" }}>
          <div style={{
            width: "100%", height: "35px",
            background: "linear-gradient(to bottom, #3d2a6e 0%, #1e1040 100%)",
            borderRadius: "50% 50% 40% 40% / 60% 60% 40% 40%",
            boxShadow: "0 4px 20px rgba(100,50,220,0.5), 0 8px 30px rgba(0,0,0,0.6)",
          }} />
          <div style={{
            width: "80%", marginLeft: "10%", height: "20px", marginTop: "-5px",
            background: "linear-gradient(to bottom, #2a6040 0%, #143020 100%)",
            borderRadius: "0 0 50% 50%",
            boxShadow: "0 6px 16px rgba(0,0,0,0.7)",
          }} />
          {/* Crystals on island 1 */}
          {[{ x: 20, color: "#a855f7" }, { x: 50, color: "#38bdf8" }, { x: 75, color: "#e879f9" }].map((c, j) => (
            <div key={j} className="absolute particle" style={{
              left: `${c.x}%`, top: "-18px",
              width: "10px", height: "18px",
              background: `linear-gradient(160deg, white 0%, ${c.color} 50%)`,
              clipPath: "polygon(50% 0%, 100% 35%, 75% 100%, 25% 100%, 0% 35%)",
              filter: `drop-shadow(0 0 6px ${c.color}) drop-shadow(0 0 12px ${c.color}88)`,
              animationDuration: `${4 + j * 1.5}s`,
            }} />
          ))}
        </div>

        {/* Island 2 - upper center-left */}
        <div className="absolute" style={{ left: "22%", top: "3%", width: "90px", height: "45px" }}>
          <div style={{
            width: "100%", height: "28px",
            background: "linear-gradient(to bottom, #4a2080 0%, #220e50 100%)",
            borderRadius: "50% 50% 40% 40% / 60% 60% 40% 40%",
            boxShadow: "0 4px 16px rgba(130,60,240,0.4)",
          }} />
          <div style={{
            width: "70%", marginLeft: "15%", height: "16px", marginTop: "-4px",
            background: "linear-gradient(to bottom, #1a5030 0%, #0c2818 100%)",
            borderRadius: "0 0 50% 50%",
          }} />
          {/* Crystal on island 2 */}
          <div className="absolute particle" style={{
            left: "40%", top: "-14px",
            width: "8px", height: "14px",
            background: "linear-gradient(160deg, white 0%, #7c3aed 50%)",
            clipPath: "polygon(50% 0%, 100% 35%, 75% 100%, 25% 100%, 0% 35%)",
            filter: "drop-shadow(0 0 6px #7c3aed)",
            animationDuration: "5.5s",
          }} />
        </div>

        {/* Island 3 - right upper */}
        <div className="absolute" style={{ right: "28%", top: "5%", width: "70px", height: "40px" }}>
          <div style={{
            width: "100%", height: "25px",
            background: "linear-gradient(to bottom, #3a1870 0%, #1c0c3c 100%)",
            borderRadius: "50% 50% 40% 40% / 60% 60% 40% 40%",
            boxShadow: "0 4px 16px rgba(100,40,200,0.4)",
          }} />
          <div style={{
            width: "60%", marginLeft: "20%", height: "14px", marginTop: "-3px",
            background: "linear-gradient(to bottom, #205040 0%, #0e2820 100%)",
            borderRadius: "0 0 50% 50%",
          }} />
        </div>

        {/* ── CASTLE (right side) ── */}
        <div className="absolute" style={{
          right: "2%", bottom: "14%",
          width: "280px", height: "360px",
        }}>
          {/* Castle ambient glow */}
          <div className="absolute" style={{
            bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "300px", height: "200px",
            background: "radial-gradient(ellipse, rgba(100,40,220,0.35) 0%, rgba(60,20,160,0.2) 50%, transparent 75%)",
            filter: "blur(20px)",
          }} />

          {/* Castle base wall */}
          <svg viewBox="0 0 280 360" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="castleWall" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3d2570" />
                <stop offset="100%" stopColor="#180d38" />
              </linearGradient>
              <linearGradient id="castleTower" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4a2e82" />
                <stop offset="100%" stopColor="#1e0f46" />
              </linearGradient>
              <linearGradient id="castleRoof" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5c3aaa" />
                <stop offset="100%" stopColor="#2e1a60" />
              </linearGradient>
              <filter id="castleGlow">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>

            {/* Main wall */}
            <rect x="40" y="200" width="200" height="160" fill="url(#castleWall)" />

            {/* Gate arch */}
            <rect x="115" y="260" width="50" height="100" fill="#0a0420" />
            <ellipse cx="140" cy="260" rx="25" ry="18" fill="#0a0420" />

            {/* Gate glow (warm light from inside) */}
            <ellipse cx="140" cy="280" rx="22" ry="28" fill="rgba(255,140,30,0.12)" />

            {/* Battlements */}
            {[50, 70, 90, 110, 140, 170, 200, 220].map((x, i) => (
              <rect key={i} x={x} y={190} width={14} height={20} fill="url(#castleWall)" rx={2} />
            ))}

            {/* Left tower */}
            <rect x="20" y="140" width="55" height="220" fill="url(#castleTower)" />
            {/* Left tower battlements */}
            {[20, 35, 50, 60].map((x, i) => (
              <rect key={i} x={x} y={128} width={12} height={20} fill="url(#castleTower)" rx={2} />
            ))}
            {/* Left tower roof */}
            <polygon points="47,60 20,140 75,140" fill="url(#castleRoof)" />
            {/* Left tower flag */}
            <line x1="47" y1="60" x2="47" y2="20" stroke="#c084fc" strokeWidth="2" />
            <polygon points="47,20 65,30 47,42" fill="#a855f7" />

            {/* Right tower */}
            <rect x="205" y="130" width="60" height="230" fill="url(#castleTower)" />
            {/* Right tower battlements */}
            {[205, 220, 235, 250].map((x, i) => (
              <rect key={i} x={x} y={118} width={12} height={20} fill="url(#castleTower)" rx={2} />
            ))}
            {/* Right tower roof */}
            <polygon points="235,50 205,130 265,130" fill="url(#castleRoof)" />
            {/* Right tower flag */}
            <line x1="235" y1="50" x2="235" y2="8" stroke="#c084fc" strokeWidth="2" />
            <polygon points="235,8 255,20 235,32" fill="#7c3aed" />

            {/* Center tower (tallest) */}
            <rect x="110" y="100" width="60" height="260" fill="url(#castleTower)" />
            {/* Center tower battlements */}
            {[110, 125, 140, 155].map((x, i) => (
              <rect key={i} x={x} y={88} width={13} height={22} fill="url(#castleTower)" rx={2} />
            ))}
            {/* Center tower roof */}
            <polygon points="140,15 110,100 170,100" fill="url(#castleRoof)" />
            {/* Center tower flag */}
            <line x1="140" y1="15" x2="140" y2="-15" stroke="#e879f9" strokeWidth="2.5" />
            <polygon points="140,-15 162,-3 140,10" fill="#d946ef" />

            {/* Windows — glowing amber/orange */}
            {/* Left tower windows */}
            <ellipse cx="47" cy="175" rx="8" ry="10" fill="#ff8c00" opacity="0.85" filter="url(#castleGlow)" />
            <ellipse cx="47" cy="195" rx="5" ry="6" fill="#ffa020" opacity="0.6" />

            {/* Center tower windows */}
            <ellipse cx="140" cy="145" rx="9" ry="11" fill="#ff8c00" opacity="0.9" filter="url(#castleGlow)" />
            <ellipse cx="140" cy="170" rx="6" ry="7" fill="#ffb040" opacity="0.65" />
            <ellipse cx="140" cy="220" rx="8" ry="10" fill="#ff7c00" opacity="0.7" />

            {/* Right tower windows */}
            <ellipse cx="235" cy="165" rx="8" ry="10" fill="#ff8c00" opacity="0.85" filter="url(#castleGlow)" />
            <ellipse cx="235" cy="190" rx="5" ry="6" fill="#ffa020" opacity="0.6" />

            {/* Wall windows */}
            <ellipse cx="90" cy="240" rx="7" ry="9" fill="#ff8c00" opacity="0.7" />
            <ellipse cx="190" cy="240" rx="7" ry="9" fill="#ff8c00" opacity="0.7" />

            {/* Ground path */}
            <ellipse cx="140" cy="360" rx="90" ry="18" fill="rgba(80,40,160,0.3)" />

            {/* Stone texture lines */}
            {[210, 230, 250, 270, 290, 310, 330].map((y, i) => (
              <line key={i} x1="40" y1={y} x2="240" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            ))}
          </svg>

          {/* Castle purple glow aura */}
          <div className="absolute" style={{
            bottom: "10px", left: "50%", transform: "translateX(-50%)",
            width: "200px", height: "80px",
            background: "radial-gradient(ellipse, rgba(120,60,240,0.6) 0%, transparent 70%)",
            filter: "blur(15px)",
          }} />
        </div>

        {/* ── PATH TO CASTLE (glowing road) ── */}
        <div className="absolute" style={{
          bottom: "12%", right: "10%",
          width: "200px", height: "80px",
          background: "linear-gradient(to right, transparent 0%, rgba(120,60,200,0.2) 30%, rgba(140,80,220,0.35) 60%, transparent 100%)",
          borderRadius: "50%",
          filter: "blur(8px)",
          transform: "perspective(200px) rotateX(60deg)",
        }} />

        {/* LANTERNS along path */}
        {[
          { right: "20%", bottom: "15%", color: "#f59e0b" },
          { right: "15%", bottom: "13%", color: "#f59e0b" },
          { right: "12%", bottom: "12%", color: "#f59e0b" },
        ].map((l, i) => (
          <div key={i} className="absolute" style={{
            right: l.right, bottom: l.bottom,
            width: "6px", height: "6px",
            borderRadius: "50%",
            background: l.color,
            boxShadow: `0 0 8px 4px ${l.color}99, 0 0 16px 8px ${l.color}44`,
          }} />
        ))}

        {/* ── LARGE CRYSTAL FORMATIONS ── */}
        {/* Left side crystal cluster */}
        <div className="absolute" style={{ left: "1%", top: "30%", display: "flex", gap: "4px", alignItems: "flex-end" }}>
          {[
            { h: 60, w: 16, color: "#a855f7", delay: "0s" },
            { h: 90, w: 20, color: "#7c3aed", delay: "0.5s" },
            { h: 50, w: 14, color: "#c084fc", delay: "1s" },
          ].map((c, i) => (
            <div key={i} className="particle" style={{
              width: `${c.w}px`, height: `${c.h}px`,
              background: `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, ${c.color} 35%, ${c.color}cc 100%)`,
              clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
              filter: `drop-shadow(0 0 8px ${c.color}) drop-shadow(0 0 16px ${c.color}88)`,
              animationDuration: `${5 + i * 1.2}s`,
              animationDelay: c.delay,
            }} />
          ))}
        </div>

        {/* Left-center crystal cluster */}
        <div className="absolute particle" style={{
          left: "7%", top: "20%",
          width: "22px", height: "38px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, #38bdf8 35%, #0891b2cc 100%)",
          clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
          filter: "drop-shadow(0 0 10px #38bdf8) drop-shadow(0 0 20px #38bdf866)",
          animationDuration: "6s",
        }} />

        {/* Right-side large crystal */}
        <div className="absolute particle" style={{
          right: "5%", top: "18%",
          width: "26px", height: "46px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, #f59e0b 35%, #d97706cc 100%)",
          clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
          filter: "drop-shadow(0 0 10px #f59e0b) drop-shadow(0 0 20px #f59e0b66)",
          animationDuration: "5.5s",
          animationDelay: "0.8s",
        }} />

        {/* More right crystals */}
        <div className="absolute" style={{ right: "3%", top: "32%", display: "flex", gap: "3px", alignItems: "flex-end" }}>
          {[
            { h: 45, w: 14, color: "#a855f7", delay: "0.3s" },
            { h: 68, w: 18, color: "#7c3aed", delay: "1.2s" },
            { h: 38, w: 12, color: "#e879f9", delay: "0.7s" },
          ].map((c, i) => (
            <div key={i} className="particle" style={{
              width: `${c.w}px`, height: `${c.h}px`,
              background: `linear-gradient(180deg, rgba(255,255,255,0.9) 0%, ${c.color} 35%, ${c.color}cc 100%)`,
              clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
              filter: `drop-shadow(0 0 8px ${c.color}) drop-shadow(0 0 16px ${c.color}66)`,
              animationDuration: `${4.5 + i * 1.3}s`,
              animationDelay: c.delay,
            }} />
          ))}
        </div>

        {/* Dragon silhouette — upper left */}
        <div className="absolute" style={{ left: "3%", top: "50%", opacity: 0.85 }}>
          <svg viewBox="0 0 80 60" width="80" height="60" style={{ filter: "drop-shadow(0 0 8px #7c3aed)" }}>
            <path d="M40 30 C35 20, 20 15, 10 20 C5 22, 2 28, 8 32 C14 36, 22 33, 28 36 C34 39, 36 46, 40 48 C44 46, 46 39, 52 36 C58 33, 66 36, 72 32 C78 28, 75 22, 70 20 C60 15, 45 20, 40 30 Z" fill="#4c1d95" />
            {/* Wings */}
            <path d="M28 30 C20 18, 5 10, 2 18 C-1 26, 10 32, 28 30 Z" fill="#5b21b6" opacity="0.8" />
            <path d="M52 30 C60 18, 75 10, 78 18 C81 26, 70 32, 52 30 Z" fill="#5b21b6" opacity="0.8" />
            {/* Eye */}
            <circle cx="34" cy="27" r="2" fill="#a855f7" />
            <circle cx="46" cy="27" r="2" fill="#a855f7" />
          </svg>
        </div>

        {/* Ground fog */}
        <div className="absolute bottom-0 left-0 right-0" style={{
          height: "160px",
          background: "linear-gradient(to top, rgba(30,8,80,0.8) 0%, rgba(60,20,120,0.3) 50%, transparent 100%)",
        }} />

        {/* Sparkle particles */}
        {[
          { x: "25%", y: "35%", color: "#a855f7", size: 4 },
          { x: "38%", y: "15%", color: "#38bdf8", size: 3 },
          { x: "55%", y: "28%", color: "#e879f9", size: 4 },
          { x: "68%", y: "18%", color: "#f59e0b", size: 3 },
          { x: "78%", y: "40%", color: "#7c3aed", size: 5 },
          { x: "18%", y: "55%", color: "#06b6d4", size: 3 },
        ].map((p, i) => (
          <div key={i} className="absolute particle" style={{
            left: p.x, top: p.y,
            width: `${p.size * 2}px`, height: `${p.size * 2}px`,
            borderRadius: "50%",
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.size}px ${p.color}88`,
            animationDuration: `${3 + i * 0.7}s`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
      </div>

      {/* ════════════════════════════════════════
          TOP BAR
      ════════════════════════════════════════ */}
      <header className="relative flex items-center gap-2 px-4 pt-3 pb-2 flex-wrap" style={{ zIndex: 10 }}>
        <LogoutButton />

        {/* Mana */}
        <div className="flex items-center gap-1.5 shrink-0"
          style={{
            background: "linear-gradient(160deg, #0a2030, #050e1c)",
            border: "1.5px solid rgba(34,211,238,0.5)",
            borderBottom: "3px solid rgba(14,116,144,0.8)",
            borderRadius: "14px", padding: "6px 12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}>
          <span className="text-violet-300 text-xs font-black">מנה</span>
          <div className="flex gap-1 mx-1">
            {Array.from({ length: energyMax }).map((_, i) => (
              <div key={i} className={`w-3.5 h-3.5 rotate-45 border ${
                i < profile.energy
                  ? "border-cyan-300"
                  : "border-white/20"
              }`} style={{
                background: i < profile.energy
                  ? "linear-gradient(135deg, #67e8f9, #22d3ee)"
                  : "rgba(255,255,255,0.08)",
                boxShadow: i < profile.energy ? "0 0 6px rgba(34,211,238,0.9)" : "none",
              }} />
            ))}
          </div>
          <span className="text-cyan-300 text-sm">⚡</span>
        </div>

        {/* XP */}
        <div className="flex items-center gap-1.5 shrink-0"
          style={{
            background: "linear-gradient(160deg, #1a0845, #0e0528)",
            border: "1.5px solid rgba(139,92,246,0.5)",
            borderBottom: "3px solid rgba(76,29,149,0.8)",
            borderRadius: "14px", padding: "6px 12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}>
          <span className="text-violet-100 font-black text-sm">XP {profile.total_xp.toLocaleString("he-IL")}</span>
          <span className="text-yellow-400 text-sm ml-1">⭐</span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1.5 shrink-0"
          style={{
            background: "linear-gradient(160deg, #2a1800, #150c00)",
            border: "1.5px solid rgba(202,138,4,0.5)",
            borderBottom: "3px solid rgba(120,80,0,0.8)",
            borderRadius: "14px", padding: "6px 12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}>
          <span className="text-yellow-100 font-black text-sm">{profile.total_stars.toLocaleString("he-IL")}</span>
          <span className="text-yellow-400 text-sm ml-1">⭐</span>
        </div>

        {/* Coins */}
        <div className="flex items-center gap-1.5 shrink-0"
          style={{
            background: "linear-gradient(160deg, #1c1000, #0e0800)",
            border: "1.5px solid rgba(180,120,0,0.5)",
            borderBottom: "3px solid rgba(100,60,0,0.8)",
            borderRadius: "14px", padding: "6px 12px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          }}>
          <span className="text-amber-100 font-black text-sm">{profile.total_coins.toLocaleString("he-IL")}</span>
          <span className="text-amber-400 text-sm ml-1">🪙</span>
        </div>

        <div className="flex-1" />

        {/* User */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-white font-bold text-sm leading-none">{profile.display_name_he}</p>
            {gradeLabel && <p className="text-violet-300 text-xs leading-none mt-0.5">{gradeLabel}</p>}
          </div>
          <div className="relative w-11 h-11 rounded-full flex items-center justify-center text-lg font-black text-white"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
              border: "2.5px solid #a78bfa",
              boxShadow: "0 0 16px rgba(124,58,237,0.7)",
            }}>
            {profile.display_name_he.charAt(0)}
            <span className="absolute -top-2.5 -right-1 text-lg">👑</span>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════
          MAIN CONTENT — 3 COLUMNS
      ════════════════════════════════════════ */}
      <div className="relative flex flex-1 gap-3 px-3 sm:px-4 pb-2 items-start" style={{ zIndex: 10 }}>

        {/* ── LEFT PANEL: Parchment ── */}
        <aside className="hidden md:flex flex-col shrink-0" style={{ width: "220px", paddingTop: "4px" }}>
          <div className="rounded-3xl p-5 flex flex-col gap-3"
            style={{
              background: "linear-gradient(170deg, #fef3c7 0%, #fde68a 30%, #fbbf24 65%, #d97706 100%)",
              border: "2.5px solid #b45309",
              borderBottom: "6px solid #78350f",
              boxShadow: "0 12px 32px rgba(0,0,0,0.7), inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(0,0,0,0.1)",
            }}>

            {/* Icon circle */}
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                  border: "2px solid #a78bfa",
                  borderBottom: "4px solid #3b0764",
                  boxShadow: "0 6px 20px rgba(124,58,237,0.65)",
                }}>
                💜
              </div>
            </div>

            {/* Title */}
            <h3 className="font-black text-center leading-snug" style={{ color: "#3a1e00", fontSize: "15px" }}>
              כל יום – עוד – ניצחון
            </h3>

            {/* Body */}
            <p className="text-sm text-center leading-snug font-semibold" style={{ color: "#78350f" }}>
              ענה נכון, התקדם,<br />אסוף אלופי הקריסטלים!
            </p>

            {/* Divider */}
            <div style={{
              height: "1.5px",
              background: "linear-gradient(to right, transparent, rgba(180,120,20,0.8), transparent)",
            }} />

            {/* 3 icons */}
            <div className="flex justify-around">
              {[["📚","לומדים"], ["💎","מתאמנים"], ["🏆","מצטיינים"]].map(([icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                    style={{
                      background: "rgba(255,255,255,0.6)",
                      border: "2px solid rgba(180,120,20,0.6)",
                      borderBottom: "3px solid rgba(120,70,0,0.6)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}>
                    {icon}
                  </div>
                  <span className="text-xs font-bold" style={{ color: "#3a1e00" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── CENTER: Hero + CTA ── */}
        <div className="flex-1 flex flex-col items-center min-w-0" style={{ gap: "8px" }}>

          {/* Speech bubble */}
          <div className="w-full" style={{ maxWidth: "400px" }}>
            <div className="speech-bubble mx-2">
              <p className="font-black text-lg leading-snug mb-1" style={{ color: "#2e1065" }}>
                הגבורה שלך מוכנה לכבוש!
              </p>
              <p className="text-sm leading-snug" style={{ color: "#4c1d95" }}>
                {speechText.length > 80 ? speechText.slice(0, 80) + "…" : speechText}
              </p>
            </div>
          </div>

          {/* Hero stage */}
          <div className="relative flex flex-col items-center w-full">

            {/* Large radial glow behind hero */}
            <div className="absolute pointer-events-none" style={{
              bottom: "40px", left: "50%", transform: "translateX(-50%)",
              width: "500px", height: "320px",
              background: "radial-gradient(ellipse, rgba(56,189,248,0.5) 0%, rgba(99,102,241,0.35) 35%, rgba(139,92,246,0.2) 55%, transparent 75%)",
              filter: "blur(24px)",
            }} />

            {/* Hero crystals */}
            {[
              { x: "8%",  y: "20%", w: 16, h: 28, color: "#a855f7", dur: "4.5s" },
              { x: "82%", y: "10%", w: 20, h: 34, color: "#38bdf8", dur: "5.5s", delay: "0.6s" },
              { x: "5%",  y: "60%", w: 12, h: 20, color: "#f59e0b", dur: "6s",   delay: "1.2s" },
              { x: "85%", y: "55%", w: 18, h: 30, color: "#7c3aed", dur: "5s",   delay: "0.9s" },
              { x: "20%", y: "5%",  w: 10, h: 18, color: "#e879f9", dur: "4s",   delay: "1.8s" },
              { x: "72%", y: "65%", w: 14, h: 24, color: "#06b6d4", dur: "6.5s", delay: "0.3s" },
            ].map((c, i) => (
              <div key={i} className="absolute particle pointer-events-none" style={{
                left: c.x, top: c.y,
                width: `${c.w}px`, height: `${c.h}px`,
                background: `linear-gradient(170deg, rgba(255,255,255,0.95) 0%, ${c.color} 45%, ${c.color}aa 100%)`,
                clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
                filter: `drop-shadow(0 0 8px ${c.color}) drop-shadow(0 0 16px ${c.color}66)`,
                animationDuration: c.dur,
                animationDelay: (c as { delay?: string }).delay ?? "0s",
              }} />
            ))}

            {/* Hero image — large */}
            <Link href="/child/heroes" className="relative z-10 block" style={{ marginBottom: "8px" }}>
              <div style={{
                transform: "scale(1.55)",
                transformOrigin: "bottom center",
                display: "inline-block",
                marginBottom: "36px",
              }}>
                <HeroDisplay
                  heroName={heroName}
                  heroType={heroType}
                  gender={heroGender}
                  rarity={heroRarity}
                  isActive={hasAdventure}
                  size="xl"
                  showName={false}
                />
              </div>
            </Link>

            {/* Glowing platform disc */}
            <div className="pointer-events-none" style={{
              width: "280px", height: "34px", marginTop: "-14px",
              background: "radial-gradient(ellipse, rgba(56,189,248,1) 0%, rgba(99,102,241,0.85) 45%, rgba(124,58,237,0.4) 70%, transparent 100%)",
              borderRadius: "50%",
              boxShadow: "0 0 70px 30px rgba(56,189,248,0.65), 0 0 140px 60px rgba(99,102,241,0.3)",
            }} />

            {/* Hero name + progress */}
            <p className="font-black text-xl text-white mt-5 drop-shadow-lg">{heroName}</p>
            <p className="text-violet-300 text-sm font-semibold mt-0.5">התקדמות שלך</p>
            <div className="flex gap-2 mt-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-3 h-3 rounded-full" style={{
                  background: i === 0 ? "#38bdf8" : "rgba(56,189,248,0.18)",
                  boxShadow: i === 0 ? "0 0 10px 3px rgba(56,189,248,0.7)" : "none",
                }} />
              ))}
            </div>
          </div>

          {/* ── CTA BUTTON ── */}
          <div className="w-full px-2 mt-4" style={{ maxWidth: "520px" }}>
            <ArenaButton
              href={`/child/arena?adventure=${activeAdventure?.id ?? adventureType}`}
              disabled={!hasAdventure}
              label={CHILD_ARENA_BUTTON}
            />
            {arenaThreat && (
              <p className="text-amber-400/80 text-sm text-center mt-2 font-semibold">⚔️ {arenaThreat}</p>
            )}
            {!hasAdventure && (
              <p className="text-slate-400 text-sm text-center mt-2">{CHILD_HERO_RESTING_TEXT}</p>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Leaderboard ── */}
        <aside className="hidden md:flex flex-col shrink-0" style={{ width: "220px", paddingTop: "4px" }}>
          <div className="rounded-3xl p-5 flex flex-col gap-4"
            style={{
              background: "linear-gradient(170deg, #0a1e38, #050e1c)",
              border: "2.5px solid #c49a3a",
              borderBottom: "6px solid #7a5800",
              boxShadow: "0 12px 32px rgba(0,0,0,0.75), inset 0 1px 0 rgba(196,154,58,0.3)",
            }}>

            {/* Trophy icon */}
            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  border: "2px solid #fbbf24",
                  borderBottom: "4px solid #92400e",
                  boxShadow: "0 6px 20px rgba(245,158,11,0.65)",
                }}>
                🏆
              </div>
            </div>

            <h3 className="font-black text-center" style={{ color: "#fbbf24", fontSize: "15px" }}>
              אלופת הקריסטלים
            </h3>
            <p className="text-slate-400 text-sm text-center" style={{ marginTop: "-8px" }}>התקדמות כוללת</p>

            {/* Progress bar */}
            <div>
              <div style={{
                height: "16px",
                background: "rgba(0,0,0,0.5)",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${overallProgress}%`,
                  background: "linear-gradient(to left, #4ade80, #16a34a)",
                  borderRadius: "999px",
                  boxShadow: "0 0 12px rgba(74,222,128,0.7)",
                  transition: "width 0.6s ease",
                }} />
              </div>
              <p className="font-black text-3xl text-center mt-2" style={{ color: "#4ade80" }}>
                {overallProgress}%
              </p>
            </div>

            {/* CTA button */}
            <Link href="/child/heroes"
              className="text-sm py-3 px-4 text-center block font-black transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
                borderRadius: "14px",
                border: "2px solid #fbbf24",
                borderBottom: "5px solid #92400e",
                boxShadow: "0 6px 18px rgba(245,158,11,0.5)",
                color: "#1c1917",
              }}>
              👑 הגש הישגים
            </Link>
          </div>
        </aside>
      </div>

      {/* ════════════════════════════════════════
          WORLD CARDS
      ════════════════════════════════════════ */}
      <div className="relative px-3 sm:px-4 pb-4" style={{ zIndex: 10 }}>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to left, transparent, rgba(196,154,58,0.85), transparent)" }} />
          <p className="font-black text-sm whitespace-nowrap px-4 py-1.5 rounded-full"
            style={{
              color: "#fbbf24",
              background: "rgba(160,110,20,0.2)",
              border: "1px solid rgba(196,154,58,0.45)",
              boxShadow: "0 0 14px rgba(196,154,58,0.2)",
            }}>
            ← הדרך שלך להצלחה →
          </p>
          <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to right, transparent, rgba(196,154,58,0.85), transparent)" }} />
        </div>

        {worlds.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {worlds.slice(0, 4).map((w, idx) => {
              const cs      = WORLD_CARD_STYLES[idx] ?? WORLD_CARD_STYLES[0];
              const locked  = !w.is_unlocked;
              const done    = Math.round(w.progress_percent * 20 / 100);
              return (
                <div key={w.world_id}
                  className={`relative rounded-3xl flex flex-col gap-3 ${locked ? "opacity-50" : "hover:scale-[1.02] cursor-pointer"}`}
                  style={{
                    padding: "16px",
                    background: `linear-gradient(160deg, ${cs.gradFrom} 0%, ${cs.gradTo} 100%)`,
                    border: `2px solid ${cs.border}`,
                    borderBottom: `5px solid ${cs.bdrShadow}`,
                    boxShadow: locked
                      ? "0 4px 14px rgba(0,0,0,0.55)"
                      : `0 10px 28px ${cs.glowColor}, 0 4px 0 ${cs.bdrShadow}`,
                    minHeight: "180px",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}>

                  {/* Card header row */}
                  <div className="flex items-start justify-between">
                    <span className="text-6xl leading-none" style={{
                      filter: locked ? "grayscale(1)" : `drop-shadow(0 3px 10px rgba(0,0,0,0.6))`,
                    }}>
                      {locked ? "🔒" : cs.cardIcon}
                    </span>
                    <span style={{ color: "#facc15", fontSize: "20px" }}>⭐</span>
                  </div>

                  {/* Title */}
                  <p className="font-black text-base leading-tight" style={{
                    color: locked ? "#64748b" : "#fff",
                    textShadow: locked ? "none" : "0 1px 8px rgba(0,0,0,0.8)",
                  }}>
                    {w.name_he}
                  </p>

                  {/* Description */}
                  {!locked && w.description_he && (
                    <p style={{ color: "rgba(226,232,240,0.8)", fontSize: "12px", lineHeight: 1.4 }}>
                      {w.description_he}
                    </p>
                  )}

                  {/* Progress */}
                  {!locked && !w.is_completed && (
                    <div className="mt-auto flex flex-col gap-1.5">
                      <div style={{
                        height: "10px",
                        background: "rgba(0,0,0,0.45)",
                        borderRadius: "999px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${w.progress_percent}%`,
                          background: "linear-gradient(to left, #4ade80, #16a34a)",
                          borderRadius: "999px",
                          boxShadow: "0 0 8px rgba(74,222,128,0.6)",
                        }} />
                      </div>
                      <p style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 700 }}>
                        🔵 {done} / 20
                      </p>
                    </div>
                  )}
                  {locked && (
                    <p className="mt-auto" style={{ color: "#64748b", fontSize: "13px" }}>
                      ⭐ {w.required_stars} לפתיחה
                    </p>
                  )}
                  {w.is_completed && (
                    <p className="mt-auto font-black" style={{ color: "#4ade80", fontSize: "13px" }}>
                      ✅ הושלם!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-8">טוען עולמות...</p>
        )}
      </div>

      {/* ════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════ */}
      <footer className="relative flex items-center justify-between px-4 pb-5 pt-1" style={{ zIndex: 10 }}>
        {/* Dragon + motivational */}
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "48px", lineHeight: 1 }}>🐉</span>
          <p className="font-semibold hidden sm:block" style={{
            color: "rgba(249,168,212,0.9)", fontSize: "13px",
            maxWidth: "220px", lineHeight: 1.4,
          }}>
            ♥ התרגול היומי עוד לך לזכור יותר ולנצח כל אתגר!
          </p>
        </div>

        {/* Nav buttons */}
        <nav className="flex gap-3">
          {([
            ["🏪", "חנות"],
            ["📊", "דירוג"],
            ["🏆", "הישגים"],
            ["⚙️", "הגדרות"],
          ] as [string, string][]).map(([icon, label]) => (
            <button key={label} className="flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95">
              <div style={{
                width: "48px", height: "48px",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px",
                background: "linear-gradient(160deg, #1e1246, #100830)",
                border: "2px solid rgba(124,58,237,0.45)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)",
              }}>
                {icon}
              </div>
              <span style={{ color: "#94a3b8", fontSize: "11px", fontWeight: 600 }}>{label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </main>
  );
}

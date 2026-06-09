// ══════════════════════════════════════════════════════════
// Child dashboard — full fantasy hub screen.
// Visual target: illustrated game hub with castle, crystals,
// hero standing freely on glowing platform, world cards.
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
import Image from "next/image";
import LogoutButton from "@/components/auth/LogoutButton";

// ── Hero image resolution (server-safe, no "use client" import) ───────────────
const BOY_IMAGES = [
  "/heroes/boy-0.png", "/heroes/boy-1.png", "/heroes/boy-2.png",
  "/heroes/boy-3.png", "/heroes/boy-4.png", "/heroes/boy-5.png",
  "/heroes/boy-6.png", "/heroes/boy-7.png", "/heroes/boy-8.png",
  "/heroes/boy-9.png", "/heroes/boy-10.png",
];
const GIRL_IMAGES = [
  "/heroes/girl-0.png", "/heroes/girl-1.png", "/heroes/girl-2.png",
  "/heroes/girl-3.png", "/heroes/girl-4.png", "/heroes/girl-5.png",
  "/heroes/girl-6.png", "/heroes/girl-7.png", "/heroes/girl-8.png",
  "/heroes/girl-9.png",
];
const GILAD_IMAGES = Array.from({ length: 16 }, (_, i) =>
  `/heroes/gilad/gilad_v2_${String(i + 1).padStart(2, "0")}.png`
);
const BOY_THEME_INDEX: Record<string, number> = {
  default: 0, storm: 0, gold: 1, nature: 2, teal: 2,
  fire: 3, dragon: 3, lava: 3, thunder: 4, yellow: 4,
  ice: 5, crystal: 6, shadow: 6, pink: 6, stone: 6,
  ocean: 8, star: 9, galaxy: 9, cosmic: 9,
};
const GIRL_THEME_INDEX: Record<string, number> = {
  default: 0, storm: 0, ice: 1, crystal: 2, nature: 3, teal: 3,
  fire: 4, dragon: 4, pink: 4, thunder: 5, yellow: 5,
  gold: 6, sun: 6, star: 7, cosmic: 7, shadow: 9, ocean: 9,
};
function resolveHeroImage(gender: "M" | "F", colorTheme: string): string {
  if (colorTheme === "stone" || colorTheme === "gilad") return GILAD_IMAGES[0];
  const images = gender === "M" ? BOY_IMAGES : GIRL_IMAGES;
  const map    = gender === "M" ? BOY_THEME_INDEX : GIRL_THEME_INDEX;
  return images[map[colorTheme] ?? 0];
}

// ── World card visual theme per slot ─────────────────────────────────────────
const WORLD_CARD_STYLES = [
  {
    icon: "📦",
    label: "חוק הקריסטל מכוחו",
    desc: "שאלות חיימום לקליטה",
    gradFrom: "#3d1e00", gradTo: "#7a4000",
    border: "#c97f00", shadow: "#3a2000",
    glow: "rgba(201,127,0,0.5)",
  },
  {
    icon: "🗺️",
    label: "מדרגה הידע",
    desc: "אתגרי חיבור – שלב ההתעלות!",
    gradFrom: "#420a0a", gradTo: "#661212",
    border: "#b91c1c", shadow: "#3d0a0a",
    glow: "rgba(185,28,28,0.45)",
  },
  {
    icon: "🌳",
    label: "יער הקסמים",
    desc: "שלבים מתקדמים לחקירה",
    gradFrom: "#052218", gradTo: "#044228",
    border: "#059669", shadow: "#032a1a",
    glow: "rgba(5,150,105,0.45)",
  },
  {
    icon: "🏰",
    label: "מגדל הזכויות",
    desc: "שלב אלופי הקריסטלים",
    gradFrom: "#06122a", gradTo: "#0e2244",
    border: "#2563eb", shadow: "#050e20",
    glow: "rgba(37,99,235,0.45)",
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
    : "כל שאלה נכונה – עוד צעד אל הניצחון!";

  const overallProgress = worlds.length > 0
    ? Math.round(
        worlds.reduce((s, w) => s + (w.is_unlocked ? w.progress_percent : 0), 0) /
        Math.max(1, worlds.filter(w => w.is_unlocked).length)
      )
    : 0;

  // Build hero image path (frameless transparent PNG)
  const heroImgSrc = resolveHeroImage(heroGender, heroType);

  return (
    <main
      dir="rtl"
      className="relative min-h-screen flex flex-col overflow-hidden select-none"
      style={{ background: "#080220", fontFamily: "var(--font-sans)" }}
    >

      {/* ══════════════════════════════════════════
          FANTASY BACKGROUND SCENE
      ══════════════════════════════════════════ */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>

        {/* Deep sky gradient */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(180deg, #04010f 0%, #0e0430 18%, #1a0750 32%, #280c70 48%, #1e0858 65%, #120438 82%, #08021a 100%)",
        }} />

        {/* Central nebula bloom */}
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse 90% 55% at 50% 5%, rgba(90,30,180,0.65) 0%, transparent 65%),
            radial-gradient(ellipse 55% 40% at 15% 30%, rgba(60,15,150,0.45) 0%, transparent 60%),
            radial-gradient(ellipse 50% 35% at 85% 25%, rgba(40,10,140,0.4) 0%, transparent 55%),
            radial-gradient(ellipse 70% 30% at 50% 90%, rgba(20,5,80,0.7) 0%, transparent 70%)
          `,
        }} />

        {/* Stars */}
        {Array.from({ length: 80 }).map((_, i) => {
          const size = 1 + (i % 3);
          const x    = ((i * 137 + 17) % 96) + 2;
          const y    = ((i * 79  + 31) % 52) + 1;
          const op   = 0.3 + (i % 6) * 0.1;
          return (
            <div key={i} className="absolute rounded-full bg-white" style={{
              width: size, height: size,
              left: `${x}%`, top: `${y}%`,
              opacity: op,
              boxShadow: size > 1 ? `0 0 ${size * 2}px rgba(200,200,255,0.5)` : "none",
            }} />
          );
        })}

        {/* Bright star clusters */}
        {[
          { x: 12, y: 6,  r: 3 },  { x: 42, y: 4, r: 2.5 }, { x: 68, y: 9, r: 3 },
          { x: 85, y: 5,  r: 2.5 }, { x: 27, y: 14, r: 2 }, { x: 57, y: 2, r: 2.5 },
          { x: 78, y: 18, r: 2 },   { x: 6,  y: 20, r: 2 },
        ].map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white" style={{
            width: s.r * 2, height: s.r * 2,
            left: `${s.x}%`, top: `${s.y}%`,
            opacity: 0.95,
            boxShadow: `0 0 ${s.r * 5}px ${s.r * 2.5}px rgba(210,190,255,0.5), 0 0 ${s.r * 10}px rgba(160,120,255,0.3)`,
          }} />
        ))}

        {/* ── FLOATING ISLANDS ── */}
        {/* Island 1 – upper left */}
        <div className="absolute" style={{ left: "3%", top: "6%", width: "130px", height: "60px" }}>
          <div style={{
            width: "100%", height: "38px",
            background: "linear-gradient(160deg, #4a2e80 0%, #1e1040 100%)",
            borderRadius: "50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow: "0 6px 24px rgba(100,50,220,0.55), 0 10px 36px rgba(0,0,0,0.65)",
          }} />
          <div style={{
            width: "76%", marginLeft: "12%", height: "22px", marginTop: "-5px",
            background: "linear-gradient(160deg, #2a6840 0%, #143020 100%)",
            borderRadius: "0 0 50% 50%",
            boxShadow: "0 8px 20px rgba(0,0,0,0.7)",
          }} />
          {[{ x: 18, c: "#a855f7" }, { x: 48, c: "#38bdf8" }, { x: 74, c: "#e879f9" }].map((cr, j) => (
            <div key={j} className="absolute particle" style={{
              left: `${cr.x}%`, top: "-20px",
              width: "10px", height: "20px",
              background: `linear-gradient(160deg, white 0%, ${cr.c} 55%)`,
              clipPath: "polygon(50% 0%, 100% 35%, 75% 100%, 25% 100%, 0% 35%)",
              filter: `drop-shadow(0 0 7px ${cr.c}) drop-shadow(0 0 14px ${cr.c}88)`,
              animationDuration: `${4.5 + j * 1.3}s`,
            }} />
          ))}
        </div>

        {/* Island 2 – upper center-left */}
        <div className="absolute" style={{ left: "20%", top: "2%", width: "95px", height: "48px" }}>
          <div style={{
            width: "100%", height: "30px",
            background: "linear-gradient(160deg, #4a1e82 0%, #22104a 100%)",
            borderRadius: "50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow: "0 5px 18px rgba(130,60,240,0.45)",
          }} />
          <div style={{
            width: "68%", marginLeft: "16%", height: "17px", marginTop: "-4px",
            background: "linear-gradient(160deg, #1c5030 0%, #0c2818 100%)",
            borderRadius: "0 0 50% 50%",
          }} />
          <div className="absolute particle" style={{
            left: "38%", top: "-16px",
            width: "9px", height: "16px",
            background: "linear-gradient(160deg, white 0%, #7c3aed 55%)",
            clipPath: "polygon(50% 0%, 100% 35%, 75% 100%, 25% 100%, 0% 35%)",
            filter: "drop-shadow(0 0 7px #7c3aed)",
            animationDuration: "5.5s",
          }} />
        </div>

        {/* Island 3 – upper right-center */}
        <div className="absolute" style={{ right: "26%", top: "4%", width: "75px", height: "42px" }}>
          <div style={{
            width: "100%", height: "27px",
            background: "linear-gradient(160deg, #3c1a72 0%, #1c0c3c 100%)",
            borderRadius: "50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow: "0 5px 18px rgba(100,40,200,0.4)",
          }} />
          <div style={{
            width: "60%", marginLeft: "20%", height: "14px", marginTop: "-3px",
            background: "linear-gradient(160deg, #225040 0%, #0e2820 100%)",
            borderRadius: "0 0 50% 50%",
          }} />
          {[{ x: 30, c: "#f59e0b" }, { x: 60, c: "#a855f7" }].map((cr, j) => (
            <div key={j} className="absolute particle" style={{
              left: `${cr.x}%`, top: "-14px",
              width: "8px", height: "14px",
              background: `linear-gradient(160deg, white 0%, ${cr.c} 55%)`,
              clipPath: "polygon(50% 0%, 100% 35%, 75% 100%, 25% 100%, 0% 35%)",
              filter: `drop-shadow(0 0 6px ${cr.c})`,
              animationDuration: `${4 + j}s`,
            }} />
          ))}
        </div>

        {/* ── LARGE CASTLE – right side ── */}
        <div className="absolute" style={{ right: "0%", bottom: "8%", width: "320px", height: "420px" }}>
          {/* Ambient glow behind castle */}
          <div className="absolute" style={{
            bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "320px", height: "220px",
            background: "radial-gradient(ellipse, rgba(120,50,230,0.4) 0%, rgba(60,20,160,0.2) 55%, transparent 80%)",
            filter: "blur(24px)",
          }} />

          <svg viewBox="0 0 320 420" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cw" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#42287a" />
                <stop offset="100%" stopColor="#1a0c40" />
              </linearGradient>
              <linearGradient id="ct" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4e3290" />
                <stop offset="100%" stopColor="#20104c" />
              </linearGradient>
              <linearGradient id="cr" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6040b8" />
                <stop offset="100%" stopColor="#301870" />
              </linearGradient>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,140,20,0.85)" />
                <stop offset="100%" stopColor="rgba(255,80,0,0)" />
              </radialGradient>
            </defs>

            {/* Main wall */}
            <rect x="50" y="230" width="220" height="190" fill="url(#cw)" />

            {/* Gate */}
            <rect x="130" y="295" width="60" height="125" fill="#080210" />
            <ellipse cx="160" cy="295" rx="30" ry="22" fill="#080210" />
            {/* Gate warm glow */}
            <ellipse cx="160" cy="318" rx="26" ry="30" fill="url(#glow)" opacity="0.18" />

            {/* Wall battlements */}
            {[56, 76, 96, 116, 152, 182, 212, 234, 256].map((x, i) => (
              <rect key={i} x={x} y={218} width={14} height={22} fill="url(#cw)" rx={2} />
            ))}

            {/* Left tower */}
            <rect x="28" y="160" width="62" height="260" fill="url(#ct)" />
            {[28, 44, 58, 72].map((x, i) => (
              <rect key={i} x={x} y={147} width={13} height={22} fill="url(#ct)" rx={2} />
            ))}
            <polygon points="59,70 28,160 90,160" fill="url(#cr)" />
            <line x1="59" y1="70" x2="59" y2="24" stroke="#c084fc" strokeWidth="2.5" />
            <polygon points="59,24 80,36 59,50" fill="#a855f7" />

            {/* Right tower */}
            <rect x="230" y="148" width="66" height="272" fill="url(#ct)" />
            {[230, 247, 262, 278].map((x, i) => (
              <rect key={i} x={x} y={134} width={13} height={22} fill="url(#ct)" rx={2} />
            ))}
            <polygon points="263,56 230,148 296,148" fill="url(#cr)" />
            <line x1="263" y1="56" x2="263" y2="10" stroke="#c084fc" strokeWidth="2.5" />
            <polygon points="263,10 286,24 263,38" fill="#7c3aed" />

            {/* Center tower */}
            <rect x="128" y="112" width="64" height="308" fill="url(#ct)" />
            {[128, 143, 158, 173].map((x, i) => (
              <rect key={i} x={x} y={96} width={13} height={24} fill="url(#ct)" rx={2} />
            ))}
            <polygon points="160,18 128,112 192,112" fill="url(#cr)" />
            <line x1="160" y1="18" x2="160" y2="-18" stroke="#e879f9" strokeWidth="3" />
            <polygon points="160,-18 185,-4 160,12" fill="#d946ef" />

            {/* Windows — glowing */}
            <ellipse cx="59" cy="195" rx="9" ry="11" fill="#ff8c00" opacity="0.9" />
            <ellipse cx="59" cy="220" rx="6" ry="7" fill="#ffa020" opacity="0.6" />
            <ellipse cx="160" cy="158" rx="10" ry="12" fill="#ff8c00" opacity="0.95" />
            <ellipse cx="160" cy="186" rx="7" ry="8" fill="#ffb040" opacity="0.7" />
            <ellipse cx="160" cy="240" rx="9" ry="11" fill="#ff7c00" opacity="0.75" />
            <ellipse cx="263" cy="184" rx="9" ry="11" fill="#ff8c00" opacity="0.9" />
            <ellipse cx="263" cy="212" rx="6" ry="7" fill="#ffa020" opacity="0.6" />
            <ellipse cx="100" cy="270" rx="8" ry="10" fill="#ff8c00" opacity="0.7" />
            <ellipse cx="220" cy="270" rx="8" ry="10" fill="#ff8c00" opacity="0.7" />

            {/* Stone texture */}
            {[240, 262, 284, 306, 328, 350, 370, 390].map((y, i) => (
              <line key={i} x1="50" y1={y} x2="270" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            ))}

            {/* Ground glow */}
            <ellipse cx="160" cy="420" rx="120" ry="20" fill="rgba(80,40,180,0.35)" />
          </svg>

          {/* Castle base glow */}
          <div className="absolute" style={{
            bottom: "8px", left: "50%", transform: "translateX(-50%)",
            width: "240px", height: "90px",
            background: "radial-gradient(ellipse, rgba(130,65,250,0.65) 0%, transparent 75%)",
            filter: "blur(18px)",
          }} />
        </div>

        {/* Glowing path to castle */}
        <div className="absolute" style={{
          bottom: "10%", right: "8%",
          width: "220px", height: "90px",
          background: "linear-gradient(to right, transparent 0%, rgba(110,55,200,0.25) 40%, rgba(140,80,230,0.4) 70%, transparent 100%)",
          borderRadius: "50%",
          filter: "blur(10px)",
          transform: "perspective(200px) rotateX(58deg)",
        }} />

        {/* Lanterns */}
        {[
          { right: "22%", bottom: "14%", c: "#f59e0b" },
          { right: "17%", bottom: "12%", c: "#f59e0b" },
          { right: "13%", bottom: "11%", c: "#f59e0b" },
        ].map((l, i) => (
          <div key={i} className="absolute" style={{
            right: l.right, bottom: l.bottom,
            width: "7px", height: "7px",
            borderRadius: "50%",
            background: l.c,
            boxShadow: `0 0 10px 5px ${l.c}aa, 0 0 20px 10px ${l.c}44`,
          }} />
        ))}

        {/* ── LEFT CRYSTAL FORMATIONS ── */}
        <div className="absolute" style={{ left: "0.5%", top: "28%", display: "flex", gap: "5px", alignItems: "flex-end" }}>
          {[
            { h: 65, w: 18, c: "#a855f7", dur: "4.8s" },
            { h: 100, w: 22, c: "#7c3aed", dur: "5.8s", del: "0.5s" },
            { h: 55, w: 15, c: "#c084fc", dur: "6.2s", del: "1.1s" },
            { h: 40, w: 12, c: "#e879f9", dur: "5.1s", del: "0.8s" },
          ].map((c, i) => (
            <div key={i} className="particle" style={{
              width: `${c.w}px`, height: `${c.h}px`,
              background: `linear-gradient(180deg, rgba(255,255,255,0.95) 0%, ${c.c} 38%, ${c.c}cc 100%)`,
              clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
              filter: `drop-shadow(0 0 9px ${c.c}) drop-shadow(0 0 18px ${c.c}88)`,
              animationDuration: c.dur,
              animationDelay: (c as { del?: string }).del ?? "0s",
            }} />
          ))}
        </div>

        {/* Left blue crystal */}
        <div className="absolute particle" style={{
          left: "7%", top: "18%",
          width: "24px", height: "42px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, #38bdf8 38%, #0891b2cc 100%)",
          clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
          filter: "drop-shadow(0 0 11px #38bdf8) drop-shadow(0 0 22px #38bdf866)",
          animationDuration: "6.2s",
        }} />

        {/* Right amber crystal */}
        <div className="absolute particle" style={{
          right: "4.5%", top: "16%",
          width: "28px", height: "50px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, #f59e0b 38%, #d97706cc 100%)",
          clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
          filter: "drop-shadow(0 0 11px #f59e0b) drop-shadow(0 0 22px #f59e0b66)",
          animationDuration: "5.6s",
          animationDelay: "0.9s",
        }} />

        {/* Right crystal cluster */}
        <div className="absolute" style={{ right: "2.5%", top: "30%", display: "flex", gap: "4px", alignItems: "flex-end" }}>
          {[
            { h: 50, w: 15, c: "#a855f7", dur: "4.8s", del: "0.3s" },
            { h: 75, w: 20, c: "#7c3aed", dur: "5.5s", del: "1.2s" },
            { h: 42, w: 13, c: "#e879f9", dur: "4.2s", del: "0.7s" },
          ].map((c, i) => (
            <div key={i} className="particle" style={{
              width: `${c.w}px`, height: `${c.h}px`,
              background: `linear-gradient(180deg, rgba(255,255,255,0.95) 0%, ${c.c} 38%, ${c.c}cc 100%)`,
              clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
              filter: `drop-shadow(0 0 8px ${c.c}) drop-shadow(0 0 16px ${c.c}66)`,
              animationDuration: c.dur,
              animationDelay: c.del,
            }} />
          ))}
        </div>

        {/* Purple dragon silhouette – upper left */}
        <div className="absolute" style={{ left: "2.5%", top: "46%", opacity: 0.9 }}>
          <svg viewBox="0 0 100 75" width="100" height="75" style={{ filter: "drop-shadow(0 0 10px #7c3aed)" }}>
            <path d="M50 38 C44 25, 25 18, 12 24 C6 27, 2 34, 10 40 C18 46, 28 41, 36 45 C44 49, 46 58, 50 61 C54 58, 56 49, 64 45 C72 41, 82 46, 90 40 C98 34, 94 27, 88 24 C75 18, 56 25, 50 38 Z" fill="#3d1880" />
            <path d="M36 38 C26 22, 6 12, 2 22 C-2 32, 12 42, 36 38 Z" fill="#4c1d96" opacity="0.85" />
            <path d="M64 38 C74 22, 94 12, 98 22 C102 32, 88 42, 64 38 Z" fill="#4c1d96" opacity="0.85" />
            <circle cx="42" cy="33" r="2.5" fill="#a855f7" />
            <circle cx="58" cy="33" r="2.5" fill="#a855f7" />
          </svg>
        </div>

        {/* Ground mist */}
        <div className="absolute bottom-0 left-0 right-0" style={{
          height: "180px",
          background: "linear-gradient(to top, rgba(24,6,70,0.85) 0%, rgba(50,16,110,0.35) 50%, transparent 100%)",
        }} />

        {/* Sparkle particles */}
        {[
          { x: "26%", y: "32%", c: "#a855f7", s: 5 },
          { x: "40%", y: "12%", c: "#38bdf8", s: 4 },
          { x: "54%", y: "25%", c: "#e879f9", s: 5 },
          { x: "66%", y: "16%", c: "#f59e0b", s: 4 },
          { x: "80%", y: "38%", c: "#7c3aed", s: 6 },
          { x: "17%", y: "52%", c: "#06b6d4", s: 4 },
        ].map((p, i) => (
          <div key={i} className="absolute particle" style={{
            left: p.x, top: p.y,
            width: `${p.s * 2}px`, height: `${p.s * 2}px`,
            borderRadius: "50%",
            background: p.c,
            boxShadow: `0 0 ${p.s * 3}px ${p.s}px ${p.c}88`,
            animationDuration: `${3 + i * 0.7}s`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
      </div>

      {/* ════════════════════════════════════════
          TOP BAR
      ════════════════════════════════════════ */}
      <header className="relative flex items-center gap-2 px-4 pt-3 pb-2 flex-wrap" style={{ zIndex: 20 }}>
        <LogoutButton />

        {/* Mana */}
        <div className="flex items-center gap-1.5 shrink-0" style={{
          background: "linear-gradient(160deg, #0a2030, #050e1c)",
          border: "1.5px solid rgba(34,211,238,0.55)",
          borderBottom: "3px solid rgba(14,116,144,0.8)",
          borderRadius: "14px", padding: "5px 11px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.55)",
        }}>
          <span className="text-violet-300 text-xs font-black">מנה</span>
          <div className="flex gap-1 mx-1">
            {Array.from({ length: energyMax }).map((_, i) => (
              <div key={i} className="w-3.5 h-3.5 rotate-45 border" style={{
                borderColor: i < profile.energy ? "#67e8f9" : "rgba(255,255,255,0.18)",
                background: i < profile.energy
                  ? "linear-gradient(135deg, #67e8f9, #22d3ee)"
                  : "rgba(255,255,255,0.06)",
                boxShadow: i < profile.energy ? "0 0 7px rgba(34,211,238,0.9)" : "none",
              }} />
            ))}
          </div>
          <span className="text-cyan-300 text-sm">⚡</span>
        </div>

        {/* XP */}
        <div className="flex items-center gap-1.5 shrink-0" style={{
          background: "linear-gradient(160deg, #1a0845, #0e0528)",
          border: "1.5px solid rgba(139,92,246,0.55)",
          borderBottom: "3px solid rgba(76,29,149,0.8)",
          borderRadius: "14px", padding: "5px 11px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.55)",
        }}>
          <span className="text-violet-100 font-black text-sm">XP {profile.total_xp.toLocaleString("he-IL")}</span>
          <span className="text-yellow-400 text-sm mr-1">⭐</span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-1.5 shrink-0" style={{
          background: "linear-gradient(160deg, #2a1800, #150c00)",
          border: "1.5px solid rgba(202,138,4,0.55)",
          borderBottom: "3px solid rgba(120,80,0,0.8)",
          borderRadius: "14px", padding: "5px 11px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.55)",
        }}>
          <span className="text-yellow-100 font-black text-sm">{profile.total_stars.toLocaleString("he-IL")}</span>
          <span className="text-yellow-400 text-sm mr-1">⭐</span>
        </div>

        {/* Coins */}
        <div className="flex items-center gap-1.5 shrink-0" style={{
          background: "linear-gradient(160deg, #1c1000, #0e0800)",
          border: "1.5px solid rgba(180,120,0,0.55)",
          borderBottom: "3px solid rgba(100,60,0,0.8)",
          borderRadius: "14px", padding: "5px 11px",
          boxShadow: "0 4px 14px rgba(0,0,0,0.55)",
        }}>
          <span className="text-amber-100 font-black text-sm">{profile.total_coins.toLocaleString("he-IL")}</span>
          <span className="text-amber-400 text-sm mr-1">🪙</span>
        </div>

        <div className="flex-1" />

        {/* User chip */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-white font-bold text-sm leading-none">{profile.display_name_he}</p>
            {gradeLabel && <p className="text-violet-300 text-xs leading-none mt-0.5">{gradeLabel}</p>}
          </div>
          <div className="relative w-11 h-11 rounded-full flex items-center justify-center text-lg font-black text-white" style={{
            background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
            border: "2.5px solid #a78bfa",
            boxShadow: "0 0 18px rgba(124,58,237,0.75)",
          }}>
            {profile.display_name_he.charAt(0)}
            <span className="absolute -top-2.5 -right-1 text-lg">👑</span>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════════════
          MAIN CONTENT – 3 COLUMNS
      ════════════════════════════════════════ */}
      <div className="relative flex flex-1 gap-4 px-3 sm:px-5 pb-2 items-stretch" style={{ zIndex: 20, minHeight: 0 }}>

        {/* ── LEFT PANEL: Parchment ── */}
        <aside className="hidden md:flex flex-col shrink-0 pt-1" style={{ width: "210px" }}>
          <div className="rounded-3xl p-5 flex flex-col gap-3 h-full" style={{
            background: "linear-gradient(170deg, #fef3c7 0%, #fde68a 30%, #fbbf24 65%, #d97706 100%)",
            border: "2.5px solid #b45309",
            borderBottom: "6px solid #78350f",
            boxShadow: "0 14px 36px rgba(0,0,0,0.75), inset 0 2px 0 rgba(255,255,255,0.65), inset 0 -2px 0 rgba(0,0,0,0.12)",
          }}>

            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl" style={{
                background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                border: "2.5px solid #a78bfa",
                borderBottom: "4px solid #3b0764",
                boxShadow: "0 6px 22px rgba(124,58,237,0.7)",
              }}>💜</div>
            </div>

            <h3 className="font-black text-center leading-snug" style={{ color: "#3a1e00", fontSize: "15px" }}>
              כל יום – עוד – ניצחון
            </h3>
            <p className="text-sm text-center leading-snug font-semibold" style={{ color: "#78350f" }}>
              ענה נכון, התקדם,<br />אסוף אלופי הקריסטלים!
            </p>

            <div style={{ height: "1.5px", background: "linear-gradient(to right, transparent, rgba(180,120,20,0.8), transparent)" }} />

            <div className="flex justify-around">
              {[["📚","לומדים"],["💎","מתאמנים"],["🏆","מצטיינים"]].map(([icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-1.5">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{
                    background: "rgba(255,255,255,0.65)",
                    border: "2px solid rgba(180,120,20,0.65)",
                    borderBottom: "3px solid rgba(120,70,0,0.65)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.8)",
                  }}>{icon}</div>
                  <span className="text-xs font-bold" style={{ color: "#3a1e00" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── CENTER: Hero + CTA ── */}
        <div className="flex-1 flex flex-col items-center min-w-0" style={{ gap: "6px", paddingTop: "4px" }}>

          {/* Speech bubble – above hero */}
          <div style={{ maxWidth: "400px", width: "100%", position: "relative" }}>
            <div style={{
              background: "rgba(255,255,255,0.97)",
              borderRadius: "20px",
              padding: "14px 20px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.55), 0 2px 8px rgba(124,58,237,0.3)",
              border: "2px solid rgba(255,255,255,0.9)",
              position: "relative",
            }}>
              {/* Bubble tail */}
              <div style={{
                position: "absolute",
                bottom: "-18px",
                right: "40%",
                width: 0, height: 0,
                borderLeft: "14px solid transparent",
                borderRight: "14px solid transparent",
                borderTop: "20px solid rgba(255,255,255,0.97)",
                filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))",
              }} />
              <p className="font-black text-lg leading-snug" style={{ color: "#2e1065" }}>
                הגבורה שלך מוכנה לכבוש!
              </p>
              <p className="text-sm leading-snug mt-1" style={{ color: "#4c1d95" }}>
                {speechText.length > 85 ? speechText.slice(0, 85) + "…" : speechText}
              </p>
            </div>
          </div>

          {/* Hero stage */}
          <div className="relative flex flex-col items-center w-full" style={{ flex: "1 1 auto", minHeight: "280px" }}>

            {/* Radial hero glow */}
            <div className="absolute pointer-events-none" style={{
              bottom: "60px", left: "50%", transform: "translateX(-50%)",
              width: "480px", height: "280px",
              background: "radial-gradient(ellipse, rgba(56,189,248,0.55) 0%, rgba(99,102,241,0.38) 35%, rgba(139,92,246,0.18) 58%, transparent 78%)",
              filter: "blur(22px)",
            }} />

            {/* Floating crystal decorations around hero */}
            {[
              { x: "8%",  y: "16%", w: 14, h: 26, c: "#a855f7", dur: "4.8s" },
              { x: "80%", y: "8%",  w: 18, h: 32, c: "#38bdf8", dur: "5.6s", del: "0.6s" },
              { x: "4%",  y: "58%", w: 11, h: 19, c: "#f59e0b", dur: "6.1s", del: "1.2s" },
              { x: "84%", y: "52%", w: 16, h: 28, c: "#7c3aed", dur: "5.2s", del: "0.9s" },
              { x: "18%", y: "4%",  w: 9,  h: 16, c: "#e879f9", dur: "4.3s", del: "1.8s" },
              { x: "70%", y: "62%", w: 13, h: 22, c: "#06b6d4", dur: "6.6s", del: "0.3s" },
            ].map((c, i) => (
              <div key={i} className="absolute particle pointer-events-none" style={{
                left: c.x, top: c.y,
                width: `${c.w}px`, height: `${c.h}px`,
                background: `linear-gradient(170deg, rgba(255,255,255,0.95) 0%, ${c.c} 45%, ${c.c}aa 100%)`,
                clipPath: "polygon(50% 0%, 100% 30%, 80% 100%, 20% 100%, 0% 30%)",
                filter: `drop-shadow(0 0 8px ${c.c}) drop-shadow(0 0 16px ${c.c}66)`,
                animationDuration: c.dur,
                animationDelay: (c as { del?: string }).del ?? "0s",
              }} />
            ))}

            {/* ── HERO IMAGE – no card frame, transparent PNG ── */}
            <Link href="/child/heroes" className="relative z-10 block hero-float" style={{
              marginBottom: "0px",
              filter: hasAdventure
                ? "drop-shadow(0 0 20px rgba(56,189,248,0.7)) drop-shadow(0 0 40px rgba(56,189,248,0.35))"
                : "drop-shadow(0 0 14px rgba(124,58,237,0.6)) drop-shadow(0 0 28px rgba(124,58,237,0.3))",
            }}>
              <Image
                src={heroImgSrc}
                alt={heroName}
                width={260}
                height={340}
                style={{
                  width: "220px",
                  height: "290px",
                  objectFit: "contain",
                  objectPosition: "center bottom",
                  display: "block",
                }}
                unoptimized
                priority
              />
            </Link>

            {/* Glowing platform disc */}
            <div className="pointer-events-none" style={{
              width: "300px", height: "36px",
              marginTop: "-8px",
              background: "radial-gradient(ellipse, rgba(56,189,248,1) 0%, rgba(99,102,241,0.9) 42%, rgba(124,58,237,0.45) 68%, transparent 100%)",
              borderRadius: "50%",
              boxShadow: "0 0 80px 35px rgba(56,189,248,0.7), 0 0 160px 70px rgba(99,102,241,0.35)",
            }} />

            {/* Hero name */}
            <p className="font-black text-xl text-white mt-4 drop-shadow-lg">{heroName}</p>
            <p className="text-violet-300 text-sm font-semibold mt-0.5">התקדמות שלך</p>
            <div className="flex gap-2 mt-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-3 h-3 rounded-full" style={{
                  background: i === 0 ? "#38bdf8" : "rgba(56,189,248,0.15)",
                  boxShadow: i === 0 ? "0 0 10px 3px rgba(56,189,248,0.7)" : "none",
                }} />
              ))}
            </div>
          </div>

          {/* ── CTA BUTTON ── */}
          <div className="w-full px-2 mt-3" style={{ maxWidth: "540px" }}>
            {hasAdventure ? (
              <Link
                href={`/child/arena?adventure=${activeAdventure.id}`}
                className="block w-full text-center font-black text-2xl py-5 transition-all hover:brightness-110 active:scale-95"
                style={{
                  background: "linear-gradient(180deg, #fde68a 0%, #f59e0b 28%, #d97706 65%, #b45309 100%)",
                  borderRadius: "18px",
                  border: "3px solid #fbbf24",
                  borderBottom: "7px solid #78350f",
                  boxShadow: "0 0 40px rgba(245,158,11,0.65), 0 8px 24px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.4)",
                  color: "#1c0a00",
                  textShadow: "0 1px 3px rgba(0,0,0,0.3)",
                  letterSpacing: "0.02em",
                }}>
                ⚔️ {CHILD_ARENA_BUTTON}
              </Link>
            ) : (
              <button
                disabled
                className="block w-full text-center font-black text-2xl py-5"
                style={{
                  background: "linear-gradient(180deg, #4a3000 0%, #2a1a00 100%)",
                  borderRadius: "18px",
                  border: "3px solid #5a3800",
                  borderBottom: "7px solid #1a0e00",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                  color: "#7a5a20",
                  cursor: "not-allowed",
                  letterSpacing: "0.02em",
                }}>
                ⚔️ {CHILD_ARENA_BUTTON}
              </button>
            )}
            {arenaThreat && (
              <p className="text-amber-400/85 text-sm text-center mt-2 font-semibold">⚔️ {arenaThreat}</p>
            )}
            {!hasAdventure && (
              <p className="text-slate-400 text-sm text-center mt-2">✕ {CHILD_HERO_RESTING_TEXT}</p>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Trophy / Progress ── */}
        <aside className="hidden md:flex flex-col shrink-0 pt-1" style={{ width: "210px" }}>
          <div className="rounded-3xl p-5 flex flex-col gap-4 h-full" style={{
            background: "linear-gradient(170deg, #0c2240, #060e20)",
            border: "2.5px solid #c49a3a",
            borderBottom: "6px solid #7a5800",
            boxShadow: "0 14px 36px rgba(0,0,0,0.8), inset 0 1px 0 rgba(196,154,58,0.3)",
          }}>

            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-3xl" style={{
                background: "linear-gradient(135deg, #f59e0b, #d97706)",
                border: "2.5px solid #fbbf24",
                borderBottom: "4px solid #92400e",
                boxShadow: "0 6px 22px rgba(245,158,11,0.7)",
              }}>🏆</div>
            </div>

            <h3 className="font-black text-center" style={{ color: "#fbbf24", fontSize: "15px" }}>
              אלופת הקריסטלים
            </h3>
            <p className="text-slate-400 text-sm text-center" style={{ marginTop: "-10px" }}>
              התקדמות כוללת
            </p>

            <div>
              <div style={{
                height: "18px",
                background: "rgba(0,0,0,0.55)",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${overallProgress}%`,
                  background: "linear-gradient(to left, #4ade80, #16a34a)",
                  borderRadius: "999px",
                  boxShadow: "0 0 14px rgba(74,222,128,0.75)",
                  transition: "width 0.6s ease",
                }} />
              </div>
              <p className="font-black text-3xl text-center mt-2" style={{ color: "#4ade80" }}>
                {overallProgress}%
              </p>
            </div>

            <Link href="/child/heroes"
              className="text-sm py-3 px-4 text-center block font-black transition-all hover:brightness-110 active:scale-95 mt-auto"
              style={{
                background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
                borderRadius: "14px",
                border: "2px solid #fbbf24",
                borderBottom: "5px solid #92400e",
                boxShadow: "0 6px 18px rgba(245,158,11,0.55)",
                color: "#1c1917",
              }}>
              👑 הגש הישגים
            </Link>
          </div>
        </aside>
      </div>

      {/* ════════════════════════════════════════
          WORLD CARDS SECTION
      ════════════════════════════════════════ */}
      <div className="relative px-3 sm:px-5 pb-4 mt-1" style={{ zIndex: 20 }}>

        {/* Section divider */}
        <div className="flex items-center gap-3 mb-4">
          <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to left, transparent, rgba(196,154,58,0.9), transparent)" }} />
          <p className="font-black text-sm whitespace-nowrap px-4 py-1.5 rounded-full" style={{
            color: "#fbbf24",
            background: "rgba(160,110,20,0.22)",
            border: "1px solid rgba(196,154,58,0.5)",
            boxShadow: "0 0 16px rgba(196,154,58,0.22)",
          }}>← הדרך שלך להצלחה →</p>
          <div style={{ flex: 1, height: "1.5px", background: "linear-gradient(to right, transparent, rgba(196,154,58,0.9), transparent)" }} />
        </div>

        {worlds.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {worlds.slice(0, 4).map((w, idx) => {
              const cs     = WORLD_CARD_STYLES[idx] ?? WORLD_CARD_STYLES[0];
              const locked = !w.is_unlocked;
              const done   = Math.round(w.progress_percent * 20 / 100);
              return (
                <div key={w.world_id}
                  className={`relative rounded-3xl flex flex-col gap-3 transition-all ${locked ? "opacity-50" : "hover:scale-[1.025] cursor-pointer"}`}
                  style={{
                    padding: "18px",
                    background: `linear-gradient(155deg, ${cs.gradFrom} 0%, ${cs.gradTo} 100%)`,
                    border: `2.5px solid ${cs.border}`,
                    borderBottom: `5px solid ${cs.shadow}`,
                    boxShadow: locked
                      ? "0 4px 16px rgba(0,0,0,0.6)"
                      : `0 12px 30px ${cs.glow}, 0 4px 0 ${cs.shadow}`,
                    minHeight: "185px",
                  }}>

                  <div className="flex items-start justify-between">
                    <span className="text-5xl leading-none" style={{
                      filter: locked ? "grayscale(1)" : `drop-shadow(0 3px 10px rgba(0,0,0,0.65))`,
                    }}>
                      {locked ? "🔒" : cs.icon}
                    </span>
                    <span style={{ color: "#facc15", fontSize: "18px" }}>⭐</span>
                  </div>

                  <p className="font-black text-base leading-tight" style={{
                    color: locked ? "#4a5568" : "#fff",
                    textShadow: locked ? "none" : "0 1px 8px rgba(0,0,0,0.8)",
                  }}>
                    {w.name_he || cs.label}
                  </p>

                  {!locked && (w.description_he || cs.desc) && (
                    <p style={{ color: "rgba(226,232,240,0.85)", fontSize: "12px", lineHeight: 1.4 }}>
                      {w.description_he || cs.desc}
                    </p>
                  )}

                  {!locked && !w.is_completed && (
                    <div className="mt-auto flex flex-col gap-1.5">
                      <div style={{
                        height: "10px",
                        background: "rgba(0,0,0,0.45)",
                        borderRadius: "999px",
                        border: "1px solid rgba(255,255,255,0.08)",
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${w.progress_percent}%`,
                          background: "linear-gradient(to left, #4ade80, #16a34a)",
                          borderRadius: "999px",
                          boxShadow: "0 0 8px rgba(74,222,128,0.65)",
                        }} />
                      </div>
                      <p style={{ color: "#e2e8f0", fontSize: "13px", fontWeight: 700 }}>
                        🔵 {done} / 20
                      </p>
                    </div>
                  )}
                  {locked && (
                    <p className="mt-auto" style={{ color: "#4a5568", fontSize: "13px" }}>
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
          FOOTER NAV
      ════════════════════════════════════════ */}
      <footer className="relative flex items-center justify-between px-4 pb-5 pt-1" style={{ zIndex: 20 }}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "44px", lineHeight: 1 }}>🐉</span>
          <p className="font-semibold hidden sm:block" style={{
            color: "rgba(249,168,212,0.95)", fontSize: "13px",
            maxWidth: "220px", lineHeight: 1.4,
          }}>
            ♥ התרגול היומי עוד לך לזכור יותר ולנצח כל אתגר!
          </p>
        </div>

        <nav className="flex gap-3">
          {([
            ["🏪","חנות"],
            ["📊","דירוג"],
            ["🏆","הישגים"],
            ["⚙️","הגדרות"],
          ] as [string, string][]).map(([icon, label]) => (
            <button key={label} className="flex flex-col items-center gap-1 transition-all hover:scale-110 active:scale-95">
              <div style={{
                width: "50px", height: "50px",
                borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "22px",
                background: "linear-gradient(160deg, #1e1248, #100832)",
                border: "2px solid rgba(124,58,237,0.5)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
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

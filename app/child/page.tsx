// ══════════════════════════════════════════════════════════
// Child dashboard — adventure-only view.
// RULE: No educational words. The child experiences a game.
// All data is real DB data. No fake/derived values.
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

const WORLD_THEMES: Record<string, {
  icon: string; gradFrom: string; gradTo: string;
  border: string; bdrShadow: string; cardIcon: string;
}> = {
  forest:  { icon: "🌲", cardIcon: "🌲", gradFrom: "#052e16", gradTo: "#14532d", border: "#16a34a", bdrShadow: "#052e16" },
  volcano: { icon: "🌋", cardIcon: "🌋", gradFrom: "#450a0a", gradTo: "#7f1d1d", border: "#dc2626", bdrShadow: "#450a0a" },
  ocean:   { icon: "🌊", cardIcon: "🌊", gradFrom: "#082f49", gradTo: "#0c4a6e", border: "#0891b2", bdrShadow: "#082f49" },
  sky:     { icon: "⭐", cardIcon: "⭐", gradFrom: "#1e1b4b", gradTo: "#312e81", border: "#6366f1", bdrShadow: "#1e1b4b" },
  desert:  { icon: "🏜️", cardIcon: "🏜️", gradFrom: "#451a03", gradTo: "#78350f", border: "#d97706", bdrShadow: "#451a03" },
  crystal: { icon: "💎", cardIcon: "📦", gradFrom: "#2e1065", gradTo: "#4c1d95", border: "#7c3aed", bdrShadow: "#2e1065" },
  shadow:  { icon: "🌑", cardIcon: "🌑", gradFrom: "#020617", gradTo: "#0f172a", border: "#475569", bdrShadow: "#020617" },
  space:   { icon: "🌌", cardIcon: "🌌", gradFrom: "#1e1b4b", gradTo: "#2e1065", border: "#818cf8", bdrShadow: "#1e1b4b" },
};
const DEFAULT_WORLD_THEME = {
  icon: "🌍", cardIcon: "🏰",
  gradFrom: "#0f172a", gradTo: "#1e293b", border: "#475569", bdrShadow: "#020617",
};

const WORLD_CARD_STYLES = [
  { cardIcon: "📦", gradFrom: "#5c3800", gradTo: "#8a5000", border: "#c97f00", bdrShadow: "#3a2200" },
  { cardIcon: "🗺️", gradFrom: "#5c0a0a", gradTo: "#7f1d1d", border: "#b91c1c", bdrShadow: "#3d0a0a" },
  { cardIcon: "🌳", gradFrom: "#0a3d2e", gradTo: "#065f46", border: "#059669", bdrShadow: "#052e20" },
  { cardIcon: "🏰", gradFrom: "#0c2244", gradTo: "#1e3a5f", border: "#2563eb", bdrShadow: "#071528" },
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
    ? Math.round(worlds.reduce((s, w) => s + (w.is_unlocked ? w.progress_percent : 0), 0) / Math.max(1, worlds.filter(w => w.is_unlocked).length))
    : 0;

  const isFull = profile.energy >= energyMax;

  return (
    <main
      className="min-h-screen flex flex-col relative overflow-x-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #3d1278 0%, #1e0a4a 25%, #120630 55%, #080416 100%)",
        minHeight: "100vh",
      }}
      dir="rtl"
    >
      {/* ── Fantasy atmosphere layers ── */}
      {/* Sky glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Stars scattered */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: `${1 + (i % 3)}px`, height: `${1 + (i % 3)}px`,
              top: `${3 + (i * 17) % 40}%`, left: `${(i * 13 + 5) % 90}%`,
              opacity: 0.4 + (i % 4) * 0.15,
            }}
          />
        ))}

        {/* Floating crystals — left side */}
        {["#a855f7","#38bdf8","#e879f9","#7c3aed","#06b6d4"].map((color, i) => (
          <div key={i} className="absolute particle"
            style={{
              left: `${4 + i * 7}%`, top: `${10 + i * 8}%`,
              width: "8px", height: "14px",
              background: color,
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              opacity: 0.7,
              animationDuration: `${6 + i * 1.5}s`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}

        {/* Floating crystals — right side */}
        {["#f59e0b","#a855f7","#38bdf8","#7c3aed"].map((color, i) => (
          <div key={i} className="absolute particle"
            style={{
              right: `${5 + i * 6}%`, top: `${8 + i * 10}%`,
              width: "6px", height: "11px",
              background: color,
              clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
              opacity: 0.6,
              animationDuration: `${7 + i * 2}s`,
              animationDelay: `${i * 1.2}s`,
            }}
          />
        ))}

        {/* Castle silhouette right */}
        <div className="absolute bottom-[28%] right-0 w-64 h-64 pointer-events-none opacity-20"
          style={{
            background: `
              linear-gradient(to top,
                #2d0f6e 0%, #1a0b3d 40%, transparent 100%
              )
            `,
            clipPath: "polygon(10% 100%, 10% 60%, 20% 60%, 20% 40%, 28% 40%, 28% 20%, 32% 20%, 32% 0%, 38% 0%, 38% 20%, 42% 20%, 42% 40%, 50% 40%, 50% 60%, 60% 60%, 60% 80%, 70% 80%, 70% 60%, 80% 60%, 80% 100%)",
          }}
        />

        {/* Ground glow */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{
            background: "linear-gradient(to top, rgba(99,102,241,0.12) 0%, transparent 100%)",
          }}
        />
      </div>

      {/* ════════════════════════════════
          TOP BAR
          ════════════════════════════════ */}
      <header className="flex items-center gap-2 px-3 sm:px-4 pt-3 pb-2 relative z-10 flex-wrap">
        <LogoutButton />

        {/* Energy / Mana bar */}
        <div
          className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 border-b-[3px] border border-cyan-500/60 bg-cyan-950/80 shrink-0"
          style={{ boxShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
        >
          <span className="text-violet-300 text-xs font-black ml-0.5">מנה</span>
          <div className="flex gap-1">
            {Array.from({ length: energyMax }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rotate-45 border transition-all duration-300 ${
                  i < profile.energy
                    ? "bg-cyan-400 border-cyan-200 shadow-[0_0_6px_rgba(34,211,238,0.9)]"
                    : "bg-white/10 border-white/20"
                }`}
              />
            ))}
          </div>
          <span className="text-cyan-300 text-sm leading-none ml-0.5">⚡</span>
        </div>

        {/* XP */}
        <div
          className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 border-b-[3px] border border-violet-500/60 bg-violet-950/80 shrink-0"
          style={{ boxShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
        >
          <span className="text-violet-200 font-black text-sm">XP {profile.total_xp.toLocaleString("he-IL")}</span>
          <span className="text-yellow-400 text-sm">⭐</span>
        </div>

        {/* Stars */}
        <div
          className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 border-b-[3px] border border-yellow-600/60 bg-yellow-950/80 shrink-0"
          style={{ boxShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
        >
          <span className="text-yellow-200 font-black text-sm">{profile.total_stars.toLocaleString("he-IL")}</span>
          <span className="text-yellow-400 text-sm">⭐</span>
        </div>

        {/* Coins */}
        <div
          className="flex items-center gap-1.5 rounded-2xl px-3 py-1.5 border-b-[3px] border border-amber-600/60 bg-amber-950/80 shrink-0"
          style={{ boxShadow: "0 3px 0 rgba(0,0,0,0.35)" }}
        >
          <span className="text-amber-200 font-black text-sm">{profile.total_coins.toLocaleString("he-IL")}</span>
          <span className="text-amber-400 text-sm">🪙</span>
        </div>

        <div className="flex-1" />

        {/* Player name + grade + crown avatar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-white font-bold text-sm leading-none">{profile.display_name_he}</p>
            {gradeLabel && <p className="text-violet-300 text-xs">{gradeLabel}</p>}
          </div>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-black text-white shrink-0 relative"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
              border: "2px solid #a78bfa",
              boxShadow: "0 0 12px rgba(124,58,237,0.6)",
            }}
          >
            {profile.display_name_he.charAt(0)}
            <span className="absolute -top-2 -right-1 text-base">👑</span>
          </div>
        </div>
      </header>

      {/* ════════════════════════════════
          MAIN THREE-COLUMN AREA
          ════════════════════════════════ */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-3 sm:px-5 pb-2 relative z-10 items-stretch">

        {/* ── LEFT PANEL: daily challenge parchment ── */}
        <aside className="hidden lg:flex flex-col gap-3 w-60 shrink-0 pt-2">
          <div
            className="rounded-3xl p-5 flex flex-col gap-4 border-2 border-b-[5px] flex-1"
            style={{
              background: "linear-gradient(160deg, #f7e9c8 0%, #edd9a3 40%, #e2c87a 70%, #d4b055 100%)",
              borderColor: "#b8892a",
              borderBottomColor: "#7a5800",
              boxShadow: "0 8px 28px rgba(0,0,0,0.55), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.1)",
            }}
          >
            {/* Scroll top decoration */}
            <div className="flex justify-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-b-4"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)",
                  borderColor: "#a78bfa",
                  borderBottomColor: "#3b0764",
                  boxShadow: "0 4px 12px rgba(124,58,237,0.5)",
                }}
              >
                💜
              </div>
            </div>

            <h3
              className="font-black text-center text-base leading-tight"
              style={{ color: "#4a2800", textShadow: "0 1px 0 rgba(255,200,80,0.6)" }}
            >
              כל יום – עוד – ניצחון
            </h3>
            <p className="text-sm text-center leading-snug font-medium" style={{ color: "#6b3d10" }}>
              ענה נכון, התקדם,<br />אסוף אלופי הקריסטלים!
            </p>

            {/* Divider */}
            <div className="h-px" style={{ background: "linear-gradient(to right, transparent, #c49a3a, transparent)" }} />

            <div className="flex justify-around">
              {[["📚","לומדים"], ["💎","מתאמנים"], ["🏆","מצטיינים"]].map(([icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-2">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border border-b-2"
                    style={{
                      background: "rgba(255,255,255,0.35)",
                      borderColor: "#c49a3a",
                      borderBottomColor: "#8a6520",
                    }}
                  >
                    {icon}
                  </div>
                  <span className="text-xs font-bold" style={{ color: "#5a3200" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {isFull && (
            <div
              className="rounded-2xl p-4 flex items-center gap-3 border-2 border-b-4"
              style={{
                background: "linear-gradient(160deg, #2e1065 0%, #1e0b3d 100%)",
                borderColor: "#7c3aed",
                borderBottomColor: "#4c1d95",
                boxShadow: "0 6px 20px rgba(124,58,237,0.4)",
              }}
            >
              <span className="text-4xl">📦</span>
              <div>
                <p className="text-violet-200 font-black text-sm">תיבת קריסטל מוכנה!</p>
                <p className="text-violet-400/70 text-xs mt-0.5">סיים הרפתקה לפתיחה</p>
              </div>
            </div>
          )}
        </aside>

        {/* ── CENTER: hero stage ── */}
        <section className="flex-1 flex flex-col items-center justify-start gap-3 pt-2">

          {/* Speech bubble */}
          <div className="w-full max-w-md">
            <div className="speech-bubble text-sm mx-2">
              <p className="font-black text-violet-900 text-lg leading-snug mb-1">
                הגבורה שלך מוכנה לכבוש!
              </p>
              <p className="text-slate-600 text-sm font-normal">
                {speechText.length > 80 ? speechText.slice(0, 80) + "…" : speechText}
              </p>
            </div>
          </div>

          {/* Hero on glowing platform — large stage */}
          <div className="relative flex flex-col items-center w-full">

            {/* Big atmospheric glow behind hero */}
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 pointer-events-none"
              style={{
                width: "380px", height: "200px",
                background: "radial-gradient(ellipse, rgba(56,189,248,0.5) 0%, rgba(99,102,241,0.35) 45%, transparent 70%)",
                filter: "blur(18px)",
              }}
            />

            {/* Floating crystal lights above hero */}
            {["#a855f7","#38bdf8","#f59e0b"].map((c, i) => (
              <div key={i}
                className="absolute pointer-events-none"
                style={{
                  width: "10px", height: "18px",
                  background: c,
                  clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                  opacity: 0.8,
                  top: `${10 + i * 25}%`,
                  left: `${20 + i * 20}%`,
                  filter: `drop-shadow(0 0 6px ${c})`,
                }}
              />
            ))}

            <Link href="/child/heroes" className="relative z-10">
              <div style={{ transform: "scale(1.35)", transformOrigin: "bottom center", display: "inline-block" }}>
                <HeroDisplay
                  heroName={heroName}
                  heroType={heroType}
                  gender={heroGender}
                  rarity={heroRarity}
                  isActive={hasAdventure}
                  size="xl"
                />
              </div>
            </Link>

            {/* Large glowing platform disc */}
            <div
              className="relative -mt-2 pointer-events-none"
              style={{
                width: "240px", height: "28px",
                background: "radial-gradient(ellipse, rgba(56,189,248,1) 0%, rgba(99,102,241,0.7) 55%, transparent 100%)",
                boxShadow: "0 0 50px 20px rgba(56,189,248,0.65), 0 0 100px 40px rgba(99,102,241,0.3)",
                borderRadius: "50%",
              }}
            />

            {/* Hero name + progress dots */}
            <p className="text-white font-black text-lg mt-3 text-center drop-shadow-lg">{heroName}</p>
            <p className="text-violet-300 text-sm font-semibold">התקדמות שלך</p>
            <div className="flex gap-2 mt-1">
              {[0,1,2].map(i => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full transition-all"
                  style={{ backgroundColor: i === 0 ? "#38bdf8" : "rgba(56,189,248,0.25)", boxShadow: i === 0 ? "0 0 8px #38bdf8" : "none" }}
                />
              ))}
            </div>
          </div>

          {/* Main CTA — large, golden, dominant */}
          <div className="w-full max-w-lg mt-2 px-2">
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

          {/* Mobile: crystal box */}
          {isFull && (
            <div
              className="lg:hidden rounded-2xl p-4 flex items-center gap-3 w-full max-w-sm border-2 border-b-4"
              style={{
                background: "linear-gradient(160deg, #2e1065 0%, #1e0b3d 100%)",
                borderColor: "#7c3aed",
                borderBottomColor: "#4c1d95",
              }}
            >
              <span className="text-4xl">📦</span>
              <div className="flex-1">
                <p className="text-violet-200 font-black text-sm">תיבת קריסטל מוכנה!</p>
                <p className="text-violet-400/70 text-xs">סיים הרפתקה כדי לפתוח</p>
              </div>
            </div>
          )}
        </section>

        {/* ── RIGHT PANEL: leaderboard / progress ── */}
        <aside className="hidden lg:flex flex-col gap-3 w-60 shrink-0 pt-2">
          <div
            className="rounded-3xl p-5 flex flex-col gap-4 border-2 border-b-[5px] flex-1"
            style={{
              background: "linear-gradient(160deg, #0d1f35 0%, #091525 60%, #050d18 100%)",
              borderColor: "#c49a3a",
              borderBottomColor: "#7a5800",
              boxShadow: "0 8px 28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(196,154,58,0.2)",
            }}
          >
            {/* Trophy icon */}
            <div className="flex justify-center">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 border-b-4"
                style={{
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  borderColor: "#fbbf24",
                  borderBottomColor: "#92400e",
                  boxShadow: "0 4px 12px rgba(245,158,11,0.5)",
                }}
              >
                🏆
              </div>
            </div>

            <h3 className="text-amber-300 font-black text-center text-base">
              אלופות הקריסטלים
            </h3>
            <p className="text-slate-400 text-sm text-center">התקדמות כוללת</p>

            {/* Progress bar */}
            <div>
              <div className="h-4 bg-black/50 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-4 rounded-full transition-all"
                  style={{
                    width: `${overallProgress}%`,
                    background: "linear-gradient(to left, #4ade80, #22c55e)",
                    boxShadow: "0 0 8px rgba(74,222,128,0.6)",
                  }}
                />
              </div>
              <p className="text-emerald-400 font-black text-3xl text-center mt-2">{overallProgress}%</p>
            </div>

            <Link
              href="/child/heroes"
              className="text-sm py-3 px-4 text-center rounded-2xl block font-black text-amber-900 transition-all hover:brightness-110 active:scale-95"
              style={{
                background: "linear-gradient(180deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
                boxShadow: "0 5px 0 #92400e, 0 8px 16px rgba(0,0,0,0.4)",
                textShadow: "0 1px 0 rgba(255,220,100,0.5)",
              }}
            >
              👑 הגש הישגים
            </Link>
          </div>
        </aside>
      </div>

      {/* ════════════════════════════════
          ADVENTURE PATH — bottom cards
          ════════════════════════════════ */}
      <div className="px-3 sm:px-5 pb-3 relative z-10">
        {/* Section divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, rgba(196,154,58,0.8), transparent)" }} />
          <p
            className="text-amber-300 text-sm font-black whitespace-nowrap px-3 py-1 rounded-full"
            style={{ background: "rgba(196,154,58,0.12)", border: "1px solid rgba(196,154,58,0.3)" }}
          >
            ← הדרך שלך להצלחה →
          </p>
          <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, rgba(196,154,58,0.8), transparent)" }} />
        </div>

        {worlds.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {worlds.slice(0, 4).map((w, idx) => {
              const t = WORLD_THEMES[w.theme] ?? DEFAULT_WORLD_THEME;
              const cardStyle = WORLD_CARD_STYLES[idx] ?? {
                cardIcon: t.cardIcon, gradFrom: t.gradFrom,
                gradTo: t.gradTo, border: t.border, bdrShadow: t.bdrShadow,
              };
              const locked = !w.is_unlocked;
              const completedCount = Math.round(w.progress_percent * 20 / 100);
              return (
                <div
                  key={w.world_id}
                  className={`relative rounded-3xl border-2 border-b-[5px] p-4 flex flex-col gap-3 transition-all ${locked ? "opacity-50" : "hover:scale-[1.02] hover:brightness-110"}`}
                  style={{
                    background: `linear-gradient(160deg, ${cardStyle.gradFrom} 0%, ${cardStyle.gradTo} 100%)`,
                    borderColor: cardStyle.border,
                    borderBottomColor: cardStyle.bdrShadow,
                    boxShadow: locked ? "0 4px 12px rgba(0,0,0,0.4)" : `0 8px 24px ${cardStyle.border}66`,
                    minHeight: "160px",
                  }}
                >
                  {/* Card icon — large */}
                  <div className="flex items-start justify-between">
                    <span className="text-5xl leading-none filter drop-shadow-lg">
                      {locked ? "🔒" : cardStyle.cardIcon}
                    </span>
                    <span className="text-yellow-400 text-xl">⭐</span>
                  </div>

                  {/* World name */}
                  <p className={`font-black text-base leading-tight ${locked ? "text-slate-500" : "text-white"}`}
                    style={{ textShadow: locked ? "none" : "0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    {w.name_he}
                  </p>

                  {!locked && w.description_he && (
                    <p className="text-slate-300/80 text-xs leading-snug">{w.description_he}</p>
                  )}

                  {/* Progress */}
                  {!locked && !w.is_completed && (
                    <div className="mt-auto flex flex-col gap-1.5">
                      <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-2.5 rounded-full"
                          style={{
                            width: `${w.progress_percent}%`,
                            background: "linear-gradient(to left, #4ade80, #22c55e)",
                            boxShadow: "0 0 6px rgba(74,222,128,0.5)",
                          }}
                        />
                      </div>
                      <p className="text-slate-300 text-xs font-semibold">🔵 {completedCount} / 20</p>
                    </div>
                  )}

                  {locked && (
                    <p className="text-slate-500 text-xs mt-auto">⭐ {w.required_stars} לפתיחה</p>
                  )}

                  {w.is_completed && (
                    <p className="text-emerald-400 text-sm font-black mt-auto">✓ הושלם!</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-sm text-center py-6">טוען עולמות...</p>
        )}
      </div>

      {/* ════════════════════════════════
          FOOTER — mascot + nav
          ════════════════════════════════ */}
      <footer className="px-3 sm:px-5 pb-5 pt-2 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🐉</span>
          <p className="text-pink-400/90 text-sm max-w-[220px] leading-tight hidden sm:block font-medium">
            ♥ התרגול היומי עוד לך לזכור יותר ולנצח כל אתגר!
          </p>
        </div>

        <nav className="flex gap-4 sm:gap-6">
          {([["🏪","חנות"], ["📊","דירוג"], ["🏆","הישגים"], ["⚙️","הגדרות"]] as [string, string][]).map(([icon, label]) => (
            <button
              key={label}
              className="flex flex-col items-center gap-1 text-slate-400 hover:text-violet-300 transition-colors"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </main>
  );
}

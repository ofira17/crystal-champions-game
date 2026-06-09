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
import { CurrencyBar } from "@/components/child/CurrencyBar";
import LogoutButton from "@/components/auth/LogoutButton";

const WORLD_THEMES: Record<string, { icon: string; gradFrom: string; gradTo: string; border: string; bdrShadow: string }> = {
  forest:  { icon: "🌲", gradFrom: "#052e16", gradTo: "#14532d", border: "#16a34a", bdrShadow: "#052e16" },
  volcano: { icon: "🌋", gradFrom: "#450a0a", gradTo: "#7f1d1d", border: "#dc2626", bdrShadow: "#450a0a" },
  ocean:   { icon: "🌊", gradFrom: "#082f49", gradTo: "#0c4a6e", border: "#0891b2", bdrShadow: "#082f49" },
  sky:     { icon: "⭐", gradFrom: "#1e1b4b", gradTo: "#312e81", border: "#6366f1", bdrShadow: "#1e1b4b" },
  desert:  { icon: "🏜️", gradFrom: "#451a03", gradTo: "#78350f", border: "#d97706", bdrShadow: "#451a03" },
  crystal: { icon: "💎", gradFrom: "#2e1065", gradTo: "#4c1d95", border: "#7c3aed", bdrShadow: "#2e1065" },
  shadow:  { icon: "🌑", gradFrom: "#020617", gradTo: "#0f172a", border: "#475569", bdrShadow: "#020617" },
  space:   { icon: "🌌", gradFrom: "#1e1b4b", gradTo: "#2e1065", border: "#818cf8", bdrShadow: "#1e1b4b" },
};
const DEFAULT_WORLD_THEME = { icon: "🌍", gradFrom: "#0f172a", gradTo: "#1e293b", border: "#475569", bdrShadow: "#020617" };

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

  return (
    <main
      className="min-h-screen flex flex-col relative overflow-x-hidden"
      style={{
        background: "radial-gradient(ellipse at 50% -5%, #2d0f6e 0%, #1a0b3d 30%, #0e0926 60%, #080718 100%)",
      }}
      dir="rtl"
    >
      {/* ── CSS-only background particles ── */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <div key={i} className="particle" style={{
          left: `${5 + i * 12}%`,
          animationDuration: `${8 + i * 2.2}s`,
          animationDelay: `${i * 1.1}s`,
          backgroundColor: i % 3 === 0 ? "#7c3aed" : i % 3 === 1 ? "#f59e0b" : "#06b6d4",
          width: `${3 + (i % 3) * 2}px`,
          height: `${3 + (i % 3) * 2}px`,
        }} />
      ))}

      {/* ── Top bar ── */}
      <header className="flex items-center gap-2 px-3 sm:px-5 pt-3 pb-2 relative z-10">
        {/* Logout (right-to-left: appears on the left visually) */}
        <LogoutButton />

        {/* Currency bar — flex-1 fills middle */}
        <div className="flex-1 min-w-0">
          <CurrencyBar
            coins={profile.total_coins}
            stars={profile.total_stars}
            xp={profile.total_xp}
            energy={profile.energy}
            energyMax={energyMax}
          />
        </div>

        {/* Player avatar + name (rightmost in RTL) */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-white font-bold text-sm leading-none">{profile.display_name_he}</p>
            {gradeLabel && <p className="text-violet-300 text-xs">{gradeLabel}</p>}
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-800 border-2 border-violet-400 flex items-center justify-center text-lg font-black text-white shrink-0">
            {profile.display_name_he.charAt(0)}
          </div>
        </div>
      </header>

      {/* ── Main three-column area ── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 px-3 sm:px-5 pb-1 relative z-10">

        {/* ── Left panel: daily challenge (desktop) ── */}
        <aside className="hidden lg:flex flex-col gap-3 w-52 shrink-0 pt-1">
          <div
            className="card-brawl card-brawl-gold p-4 flex flex-col gap-3"
            style={{ background: "linear-gradient(160deg, rgba(120,53,15,0.85) 0%, rgba(69,26,3,0.95) 100%)" }}
          >
            <div className="flex justify-center mb-1">
              <span className="text-2xl">💜</span>
            </div>
            <h3 className="text-amber-200 font-black text-center text-sm leading-tight">
              כל יום – עוד – ניצחון
            </h3>
            <p className="text-amber-400/80 text-xs text-center leading-snug">
              ענה נכון, התקדם,<br />אסוף אלופי הקריסטלים!
            </p>
            <div className="flex justify-around mt-1">
              {[["📚","לומדים"], ["💎","מתאמנים"], ["🏆","מצטיינים"]].map(([icon, label]) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-amber-300/70 text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {profile.energy >= energyMax && (
            <div className="card-brawl card-brawl-violet p-3 flex items-center gap-2"
              style={{ background: "linear-gradient(160deg, rgba(76,29,149,0.85) 0%, rgba(46,16,101,0.95) 100%)" }}>
              <span className="text-3xl">📦</span>
              <div>
                <p className="text-violet-200 font-black text-xs">תיבת קריסטל מוכנה!</p>
                <p className="text-violet-400/70 text-xs">סיים הרפתקה לפתיחה</p>
              </div>
            </div>
          )}
        </aside>

        {/* ── Center: hero stage ── */}
        <section className="flex-1 flex flex-col items-center justify-center gap-2 py-2">

          {/* Speech bubble */}
          <div className="w-full max-w-sm">
            <div className="speech-bubble text-sm mx-4">
              <p className="font-black text-violet-900 text-base leading-snug mb-0.5">
                הגבורה שלך מוכנה לכבוש!
              </p>
              <p className="text-slate-600 text-xs font-normal">
                {speechText.length > 70 ? speechText.slice(0, 70) + "…" : speechText}
              </p>
            </div>
          </div>

          {/* Hero on glowing platform */}
          <div className="relative flex flex-col items-center">
            {/* Radial glow behind hero */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-52 h-20 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, rgba(124,58,237,0.3) 40%, transparent 70%)" }} />

            <Link href="/child/heroes">
              <HeroDisplay
                heroName={heroName}
                heroType={heroType}
                gender={heroGender}
                rarity={heroRarity}
                isActive={hasAdventure}
                size="lg"
              />
            </Link>

            {/* Glowing platform disc */}
            <div className="w-40 h-5 rounded-full -mt-1 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse, rgba(124,58,237,0.95) 0%, rgba(99,102,241,0.5) 55%, transparent 100%)",
                boxShadow: "0 0 32px 10px rgba(124,58,237,0.6), 0 0 60px 20px rgba(99,102,241,0.25)",
              }} />

            {/* Hero name + progress dots */}
            <p className="text-white font-bold text-sm mt-2 text-center">{heroName}</p>
            <div className="flex gap-1.5 mt-0.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full transition-all"
                  style={{ backgroundColor: i === 0 ? "#7c3aed" : "rgba(124,58,237,0.3)" }} />
              ))}
            </div>
          </div>

          {/* Main CTA */}
          <div className="w-full max-w-xs mt-1">
            <ArenaButton
              href={`/child/arena?adventure=${activeAdventure?.id ?? adventureType}`}
              disabled={!hasAdventure}
              label={CHILD_ARENA_BUTTON}
            />
            {arenaThreat && (
              <p className="text-amber-400/80 text-xs text-center mt-1 font-semibold">⚔️ {arenaThreat}</p>
            )}
            {!hasAdventure && (
              <p className="text-slate-500 text-xs text-center mt-1">{CHILD_HERO_RESTING_TEXT}</p>
            )}
          </div>

          {/* Hero collection link */}
          <Link
            href="/child/heroes"
            className="flex items-center justify-center gap-2 py-2 px-4 rounded-2xl border border-violet-500/40 bg-violet-900/20 text-violet-300 text-sm font-semibold hover:bg-violet-900/40 transition-colors w-full max-w-xs"
          >
            🦸 אוסף הגיבורים
          </Link>

          {/* Mobile: crystal box teaser */}
          {profile.energy >= energyMax && (
            <div className="lg:hidden card-brawl card-brawl-gold p-3 flex items-center gap-3 w-full max-w-xs">
              <span className="text-3xl">📦</span>
              <div className="flex-1">
                <p className="text-amber-300 font-black text-sm">תיבת קריסטל מוכנה!</p>
                <p className="text-amber-400/70 text-xs">סיים הרפתקה כדי לפתוח</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Right panel: leaderboard (desktop) ── */}
        <aside className="hidden lg:flex flex-col gap-3 w-52 shrink-0 pt-1">
          <div
            className="card-brawl card-brawl-gold p-4 flex flex-col gap-3"
            style={{ background: "linear-gradient(160deg, rgba(120,53,15,0.85) 0%, rgba(69,26,3,0.95) 100%)" }}
          >
            <h3 className="text-amber-200 font-black text-center text-sm flex items-center justify-center gap-1">
              🏆 אלופות הקריסטלים
            </h3>
            <p className="text-slate-400 text-xs text-center">התקדמות כוללת</p>
            <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <p className="text-emerald-400 font-black text-2xl text-center">{overallProgress}%</p>
            <Link
              href="/child/heroes"
              className="btn-3d btn-3d-gold text-xs py-2 px-3 text-center rounded-xl block"
            >
              👑 הגש הישגים
            </Link>
          </div>
        </aside>
      </div>

      {/* ── Adventure path (bottom grid) ── */}
      <div className="px-3 sm:px-5 pb-2 relative z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px flex-1" style={{ background: "linear-gradient(to left, transparent, rgba(124,58,237,0.6), transparent)" }} />
          <p className="text-violet-300 text-sm font-bold whitespace-nowrap">← הדרך שלך להצלחה →</p>
          <div className="h-px flex-1" style={{ background: "linear-gradient(to right, transparent, rgba(124,58,237,0.6), transparent)" }} />
        </div>

        {worlds.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {worlds.slice(0, 4).map(w => {
              const t = WORLD_THEMES[w.theme] ?? DEFAULT_WORLD_THEME;
              const locked = !w.is_unlocked;
              return (
                <div
                  key={w.world_id}
                  className={`relative rounded-2xl border-2 border-b-4 p-3 flex flex-col gap-2 transition-all ${locked ? "opacity-60" : ""}`}
                  style={{
                    background: `linear-gradient(160deg, ${t.gradFrom} 0%, ${t.gradTo} 100%)`,
                    borderColor: t.border,
                    borderBottomColor: t.bdrShadow,
                    boxShadow: locked ? "none" : `0 4px 16px ${t.border}44`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{locked ? "🔒" : t.icon}</span>
                    <span className="text-yellow-400 text-base">⭐</span>
                  </div>

                  <p className={`font-black text-sm leading-tight ${locked ? "text-slate-500" : "text-white"}`}>
                    {w.name_he}
                  </p>
                  {w.description_he && !locked && (
                    <p className="text-slate-300/70 text-xs leading-snug">{w.description_he}</p>
                  )}

                  {!locked && !w.is_completed && (
                    <>
                      <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                          style={{ width: `${w.progress_percent}%` }}
                        />
                      </div>
                      <p className="text-slate-400 text-xs">🔵 {Math.round(w.progress_percent * 20 / 100)} / 20</p>
                    </>
                  )}

                  {locked && (
                    <p className="text-slate-600 text-xs">⭐ {w.required_stars} לפתיחה</p>
                  )}

                  {w.is_completed && (
                    <p className="text-emerald-400 text-xs font-bold badge-completed">✓ הושלם!</p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-500 text-xs text-center py-4">טוען עולמות...</p>
        )}
      </div>

      {/* ── Bottom footer: mascot + nav ── */}
      <footer className="px-3 sm:px-5 pb-4 pt-1 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🐉</span>
          <p className="text-pink-400/90 text-xs max-w-[180px] leading-tight hidden sm:block">
            ♥ התרגול היומי עוד לך לזכור יותר ולנצח כל אתגר!
          </p>
        </div>

        <nav className="flex gap-3 sm:gap-5">
          {([["🏪","חנות"], ["📊","דירוג"], ["🏆","הישגים"], ["⚙️","הגדרות"]] as [string, string][]).map(([icon, label]) => (
            <button
              key={label}
              className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-violet-300 transition-colors"
            >
              <span className="text-xl">{icon}</span>
              <span className="text-xs">{label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </main>
  );
}

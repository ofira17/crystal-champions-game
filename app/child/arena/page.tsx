"use client";

import { Suspense, useEffect, useRef, useState, useTransition, useCallback } from "react";
import type React from "react";
import { useRouter, useSearchParams }                            from "next/navigation";
import Image                                           from "next/image";
import {
  startArenaSession,
  submitAnswer,
  useMegaHit,
  claimReward,
  type ArenaStartData,
  type ArenaQuestion,
  type AnswerResult,
  type LootItem,
} from "@/app/actions/arena";
import { ENERGY_MAX }      from "@/lib/constants";
import { TreasureBox }     from "@/components/child/TreasureBox";
import { CrystalEnemy, getEnemyName, getEnemyVariant, getEnemyMeta, type EnemyVariant } from "@/components/child/CrystalEnemy";
import { getHeroImage }    from "@/components/child/HeroDisplay";

// ── Phase type ────────────────────────────────────────────────────────────────
type Phase =
  | "loading"
  | "battle"         // arena — hero vs enemy, ירי קריסטל button
  | "challenge"      // bottom sheet with question slides up
  | "shooting"       // crystal projectile animation
  | "feedback"       // פגיעה / כמעט overlay
  | "megahit"        // mega crystal blast animation
  | "victory-anim"   // enemy disappears, hero centers (70%+ correct)
  | "victory"        // boss defeated victory screen
  | "end"            // all questions answered (boss not defeated)
  | "reward-reveal"  // confirmed loot cards shown before opening box
  | "reward"         // crystal box
  | "error";

type AnswerKey = "A" | "B" | "C" | "D";
const ANSWER_KEYS: AnswerKey[] = ["A", "B", "C", "D"];

function optionText(q: ArenaQuestion, key: AnswerKey): string {
  switch (key) {
    case "A": return q.option_a_he;
    case "B": return q.option_b_he;
    case "C": return q.option_c_he;
    case "D": return q.option_d_he;
  }
}

// ── Enemy HP bar ──────────────────────────────────────────────────────────────
function EnemyHpBar({ hp, enemyName }: { hp: number; enemyName: string }) {
  const pct = Math.max(0, Math.min(100, hp));
  const fill =
    pct > 60 ? "from-red-500 to-rose-600"
    : pct > 30 ? "from-orange-400 to-amber-500"
    : "from-yellow-400 to-red-500";

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex justify-between items-center">
        <span className="text-red-400 font-black text-xs truncate max-w-[55%]">
          ⚔️ {enemyName}
        </span>
        <span className={`font-black text-xs ${pct <= 30 ? "text-yellow-400 animate-pulse" : "text-red-400"}`}>
          {hp}% כוח
        </span>
      </div>
      <div className="boss-hp-bar-container w-full">
        <div
          className={`boss-hp-fill bg-gradient-to-r ${fill}`}
          style={{ width: `${pct}%`, transition: "width 0.4s ease-out" }}
        />
      </div>
    </div>
  );
}

// ── Crystal energy bar ─────────────────────────────────────────────────────────
function CrystalEnergyBar({ energy, max = ENERGY_MAX }: { energy: number; max?: number }) {
  const isFull = energy >= max;
  return (
    <div className={`flex items-center gap-1.5 ${isFull ? "energy-full-glow rounded-full px-1" : ""}`}>
      <span className="text-violet-300 text-xs font-bold">כוח קריסטל</span>
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rotate-45 border-2 transition-all duration-300 ${
              i < energy
                ? "bg-violet-400 border-violet-200 crystal-charged"
                : "bg-white/5 border-white/20"
            }`}
            style={i < energy ? { animationDelay: `${i * 0.15}s` } : {}}
          />
        ))}
      </div>
    </div>
  );
}

// ── Answer button ─────────────────────────────────────────────────────────────
const ANSWER_CLASS: Record<AnswerKey, string> = {
  A: "answer-btn-a",
  B: "answer-btn-b",
  C: "answer-btn-c",
  D: "answer-btn-d",
};
const ANSWER_ICONS: Record<AnswerKey, string> = {
  A: "⚡", B: "🔥", C: "💎", D: "🌊",
};

function AnswerButton({
  answerKey, text, onClick, disabled, state,
}: {
  answerKey: AnswerKey;
  text:      string;
  onClick:   () => void;
  disabled:  boolean;
  state:     "idle" | "correct" | "wrong";
}) {
  const cls =
    state === "correct" ? "answer-btn-correct" :
    state === "wrong"   ? "answer-btn-wrong"   :
    ANSWER_CLASS[answerKey];
  return (
    <button onClick={onClick} disabled={disabled} className={`answer-btn ${cls} w-full`}>
      <span className="text-lg shrink-0 opacity-80">{ANSWER_ICONS[answerKey]}</span>
      <span className="text-sm font-bold leading-tight text-right flex-1">{text}</span>
    </button>
  );
}

// ── Hero portrait (left side of arena) ───────────────────────────────────────
function HeroArenaPortrait({
  name, gender, colorTheme, isActive,
}: {
  name: string; gender: "M" | "F"; colorTheme: string; isActive: boolean;
}) {
  const imgSrc = getHeroImage(gender, colorTheme, 0);
  return (
    <div className="flex flex-col items-center gap-0.5 hero-arena-idle select-none">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imgSrc}
        alt={name}
        style={{
          height: 170,
          width: "auto",
          display: "block",
          background: "transparent",
          filter: isActive
            ? "drop-shadow(0 0 18px rgba(140,80,255,0.95)) drop-shadow(0 0 6px white)"
            : "drop-shadow(0 0 10px rgba(140,80,255,0.55))",
          transition: "filter 0.3s ease",
        }}
      />
      <span className="text-violet-300 text-xs font-bold text-center leading-tight max-w-[110px] truncate">
        {name}
      </span>
    </div>
  );
}

// ── Battle HUD ────────────────────────────────────────────────────────────────
function BattleHUD({
  heroName, heroGender, heroColorTheme,
  energy, energyMax,
  bossHp, enemyName,
  answered, total, correctCount,
  megaReady,
}: {
  heroName: string; heroGender: "M" | "F"; heroColorTheme: string;
  energy: number; energyMax: number;
  bossHp: number; enemyName: string;
  answered: number; total: number; correctCount: number;
  megaReady: boolean;
}) {
  const heroImg = getHeroImage(heroGender, heroColorTheme, 0);
  const hpColor = bossHp > 60 ? "#f87171" : bossHp > 30 ? "#fb923c" : "#facc15";
  const hpGlow  = bossHp > 60 ? "rgba(248,113,113,0.6)" : bossHp > 30 ? "rgba(251,146,60,0.6)" : "rgba(250,204,21,0.7)";

  const [megaPopActive, setMegaPopActive] = useState(false);
  const prevEnergyRef = useRef(energy);
  useEffect(() => {
    if (prevEnergyRef.current < energyMax && energy >= energyMax) {
      setMegaPopActive(true);
      const t = setTimeout(() => setMegaPopActive(false), 700);
      return () => clearTimeout(t);
    }
    prevEnergyRef.current = energy;
  }, [energy, energyMax]);

  return (
    <div
      dir="rtl"
      style={{
        display: "flex",
        gap: 8,
        padding: "6px 10px 4px",
        alignItems: "stretch",
      }}
    >
      {/* ── Hero card ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        background: "linear-gradient(135deg, rgba(109,40,217,0.55) 0%, rgba(30,10,60,0.7) 100%)",
        border: "2px solid rgba(192,132,252,0.55)",
        borderRadius: 14,
        padding: "5px 10px 5px 8px",
        boxShadow: "0 0 12px rgba(192,132,252,0.25), inset 0 1px 0 rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImg}
          alt={heroName}
          style={{
            height: 38, width: "auto",
            filter: "drop-shadow(0 0 8px rgba(192,132,252,0.85))",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ color: "#e9d5ff", fontSize: 11, fontWeight: 800, lineHeight: 1, maxWidth: 72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {heroName}
          </span>
          {/* Crystal energy pips */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: energyMax }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 16, height: 16,
                    transform: "rotate(45deg)",
                    borderRadius: 3,
                    border: "2px solid",
                    borderColor: i < energy ? "#e9d5ff" : "rgba(255,255,255,0.2)",
                    background: i < energy
                      ? "linear-gradient(135deg, #c084fc, #818cf8)"
                      : "rgba(255,255,255,0.04)",
                    boxShadow: i < energy ? "0 0 8px rgba(192,132,252,0.9), 0 0 3px #c084fc" : "none",
                    transition: "all 0.25s ease",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: 11, fontWeight: 900, lineHeight: 1,
                color: megaReady ? "#fde68a" : "#c4b5fd",
                textShadow: megaReady ? "0 0 8px rgba(253,230,138,0.9)" : "none",
                animation: megaPopActive ? "mega-ready-pop 0.7s ease-out forwards" : "none",
              }}
            >
              {megaReady ? "⚡ מוכן!" : `⚡ ${energy} / ${energyMax}`}
            </span>
          </div>
        </div>
      </div>

      {/* ── Enemy HP card ── */}
      <div style={{
        flex: 1,
        background: "linear-gradient(135deg, rgba(127,29,29,0.45) 0%, rgba(30,10,60,0.7) 100%)",
        border: `2px solid ${hpColor}55`,
        borderRadius: 14,
        padding: "5px 10px",
        boxShadow: `0 0 10px ${hpGlow}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
        display: "flex", flexDirection: "column", justifyContent: "center", gap: 4,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: hpColor, fontSize: 10, fontWeight: 900, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            ⚔️ {enemyName}
          </span>
          <span style={{
            color: hpColor, fontSize: 11, fontWeight: 900,
            textShadow: `0 0 8px ${hpGlow}`,
            animation: bossHp <= 30 ? "hud-pulse 0.9s ease-in-out infinite" : "none",
          }}>
            {bossHp}%
          </span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, height: 7, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${bossHp}%`,
            borderRadius: 4,
            background: `linear-gradient(90deg, ${hpColor}, ${hpColor}bb)`,
            boxShadow: `0 0 6px ${hpGlow}`,
            transition: "width 0.4s ease-out",
          }} />
        </div>
      </div>

      {/* ── Progress + Mega card ── */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 4, justifyContent: "center", alignItems: "center",
        background: megaReady
          ? "linear-gradient(135deg, rgba(161,97,0,0.55) 0%, rgba(30,10,60,0.7) 100%)"
          : "linear-gradient(135deg, rgba(6,78,59,0.45) 0%, rgba(30,10,60,0.7) 100%)",
        border: megaReady
          ? "2px solid rgba(251,191,36,0.7)"
          : "2px solid rgba(34,211,238,0.4)",
        borderRadius: 14,
        padding: "5px 9px",
        boxShadow: megaReady
          ? "0 0 14px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.07)"
          : "0 0 8px rgba(34,211,238,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
        flexShrink: 0,
        minWidth: 68,
      }}>
        {megaReady ? (
          <span style={{
            color: "#fbbf24", fontSize: 10, fontWeight: 900, textAlign: "center", lineHeight: 1.2,
            textShadow: "0 0 10px rgba(251,191,36,0.9)",
            animation: "hud-pulse 0.8s ease-in-out infinite",
          }}>
            ⚡ מוכן!
          </span>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ color: "#22d3ee", fontSize: 16, fontWeight: 900, lineHeight: 1, textShadow: "0 0 8px rgba(34,211,238,0.7)" }}>
                {correctCount}
              </span>
              <span style={{ color: "rgba(34,211,238,0.7)", fontSize: 8, fontWeight: 700 }}>פגיעות</span>
            </div>
            <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.1)", borderRadius: 1 }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ color: "#c4b5fd", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>
                {answered}/{total}
              </span>
              <span style={{ color: "rgba(196,181,253,0.6)", fontSize: 8, fontWeight: 700 }}>יריות</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Crystal projectile ────────────────────────────────────────────────────────
function CrystalProjectile({ result }: { result: "hit" | "miss" }) {
  return (
    <div
      className={result === "hit" ? "crystal-shoot-hit" : "crystal-shoot-miss"}
      style={{
        position: "absolute",
        top: "50%",
        width: 26,
        height: 26,
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 26,
          height: 26,
          background: "linear-gradient(135deg, #c084fc, #818cf8)",
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          boxShadow: "0 0 14px rgba(167,139,250,0.9), 0 0 4px white",
        }}
      />
    </div>
  );
}

// ── Feedback bar (below arena, compact — does NOT cover battle) ───────────────
function FeedbackOverlay({ result, energyBefore }: { result: AnswerResult; energyBefore: number }) {
  return (
    <div
      className="feedback-pop shrink-0"
      dir="rtl"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        flexWrap: "wrap",
        padding: "7px 16px",
        background: result.isCorrect
          ? "linear-gradient(135deg, rgba(6,78,59,0.97) 0%, rgba(4,50,40,0.97) 100%)"
          : "linear-gradient(135deg, rgba(30,10,60,0.97) 0%, rgba(15,10,40,0.97) 100%)",
        borderTop: `2px solid ${result.isCorrect ? "rgba(52,211,153,0.7)" : "rgba(75,85,99,0.6)"}`,
        minHeight: 52,
        pointerEvents: "none",
      }}
    >
      {result.isCorrect ? (
        <>
          <span style={{ color: "#6ee7b7", fontWeight: 900, fontSize: 16 }}>💥 פגיעה!</span>
          {result.bossDamageDealt > 0 && (
            <span style={{ color: "#34d399", fontSize: 13, fontWeight: 800 }}>האויב נחלש −{result.bossDamageDealt}%</span>
          )}
          {result.megaHitAvailable ? (
            <span style={{ color: "#c4b5fd", fontSize: 12, fontWeight: 900 }}>⚡ מכת קריסטל מוכנה!</span>
          ) : energyBefore < ENERGY_MAX ? (
            <span style={{ color: "#a78bfa", fontSize: 12 }}>⚡ כוח נטען</span>
          ) : null}
        </>
      ) : (
        <>
          <span style={{ color: "#fcd34d", fontWeight: 900, fontSize: 15 }}>🛡️ נסה שוב!</span>
          <span style={{ color: "#9ca3af", fontSize: 12, fontWeight: 700 }}>
            התשובה: {result.correctAnswer}. {result.correctText}
          </span>
        </>
      )}
    </div>
  );
}

// ── Victory title (shared between victory-anim overlay and VictoryScreen) ────
function VictoryTitle() {
  return (
    <div className="victory-title-wrap" aria-label="ניצחון">
      <span className="victory-title-text">ניצחון!</span>
      {/* Crystal shimmer shards */}
      {(["#22d3ee","#c084fc","#f472b6","#fbbf24","#a78bfa","#34d399"] as const).map((color, i) => (
        <div
          key={i}
          className="victory-shard"
          style={{
            "--shard-color": color,
            "--shard-angle": `${i * 60}deg`,
            "--shard-dist": `${52 + (i % 3) * 18}px`,
            animationDelay: `${i * 0.07}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ── Victory screen ─────────────────────────────────────────────────────────────
function VictoryScreen({ enemyName, onContinue, isPending, heroImgSrc, heroName }: {
  enemyName: string; onContinue: () => void; isPending: boolean;
  heroImgSrc: string; heroName: string;
}) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-5 py-10 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 20%, #150a30 0%, #0a0f2a 50%, #0a0a1a 100%)" }}
      dir="rtl"
    >
      {/* Floating sparkles */}
      {[...Array(10)].map((_, i) => (
        <div
          key={i}
          className="absolute victory-sparkle pointer-events-none select-none"
          style={{
            top:  `${8  + (i * 9)  % 82}%`,
            left: `${4  + (i * 13) % 92}%`,
            fontSize: `${14 + (i % 3) * 6}px`,
            animationDelay: `${i * 0.14}s`,
          }}
        >
          {["✦","💎","⚡","✦","🌟","💫","✦","💎","✦","⚡"][i]}
        </div>
      ))}

      <div className="victory-entrance flex flex-col items-center gap-4">
        <div className="victory-trophy-pop text-8xl" style={{ filter: "drop-shadow(0 0 18px #fbbf24)" }}>🏆</div>
        <VictoryTitle />
        <p className="text-cyan-300 font-black text-xl text-center" style={{
          textShadow: "0 0 12px rgba(34,211,238,0.8)",
        }}>
          {enemyName} הובס!
        </p>

        {/* Hero image with floating animation */}
        {heroImgSrc && (
          <div className="flex flex-col items-center gap-2">
            <div className="hero-victory-float" style={{
              filter: "drop-shadow(0 0 20px rgba(192,132,252,0.85))",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImgSrc}
                alt={heroName}
                style={{ height: 200, width: "auto", display: "block", background: "transparent" }}
              />
            </div>
            <p className="text-violet-200 font-black text-lg" style={{
              textShadow: "0 0 10px rgba(192,132,252,0.9)",
            }}>
              {heroName}
            </p>
          </div>
        )}

        <p className="text-violet-300 text-sm text-center font-bold">הגיבור שלך ניצח בקרב הקריסטלים ✦</p>
      </div>

      <button
        onClick={onContinue}
        disabled={isPending}
        className="btn-3d btn-3d-gold py-4 px-8 text-xl font-black w-full max-w-xs disabled:opacity-50 btn-arena-pulse"
      >
        {isPending ? "פותח..." : "💎 פתח תיבת קריסטל!"}
      </button>
    </main>
  );
}

// ── End screen (all answered, boss not defeated) ───────────────────────────────
function EndScreen({ answered, total, bossHp, energy, onClaim, onHome, isPending }: {
  answered: number; total: number; bossHp: number; energy: number;
  onClaim: () => void; onHome: () => void; isPending: boolean;
}) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-5 py-10"
      style={{ background: "radial-gradient(ellipse at 30% 0%, #1e0a3c 0%, #0f0a2a 50%, #0a0a1a 100%)" }}
      dir="rtl"
    >
      <div className="victory-pop flex flex-col items-center gap-2">
        <div className="text-7xl">⚔️</div>
        <h1 className="text-3xl font-black text-white text-center">הקרב הסתיים!</h1>
        <p className="text-slate-400 text-sm text-center">עוד קצת ותוכל להביס את האויב</p>
      </div>

      <div className="card-brawl card-brawl-violet p-5 w-full max-w-xs flex flex-col gap-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">⚔️ נזק לאויב</span>
          <span className="font-bold text-red-400">{100 - bossHp}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">💎 ירי קריסטל</span>
          <span className="font-bold text-white">{answered}/{total}</span>
        </div>
        <div className="flex justify-between text-sm items-center">
          <span className="text-slate-400">⚡ כוח קריסטל</span>
          <div className="flex gap-1">
            {Array.from({ length: ENERGY_MAX }).map((_, i) => (
              <div key={i} className={`w-3 h-3 rotate-45 ${i < energy ? "bg-violet-400" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onClaim}
          disabled={isPending}
          className="btn-3d btn-3d-violet py-3 text-base font-bold w-full disabled:opacity-50"
        >
          {isPending ? "פותח..." : "📦 פתח תיבת קריסטל"}
        </button>
        <button
          onClick={onHome}
          className="py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-colors"
        >
          חזרה לבסיס
        </button>
      </div>
    </main>
  );
}

// ── Reward reveal display config ──────────────────────────────────────────────
const LOOT_DISPLAY: Record<string, { color: string; glow: string; bg: string; label: string }> = {
  coins: { color: "#fbbf24", glow: "rgba(251,191,36,0.75)",   bg: "rgba(251,191,36,0.10)",   label: "מטבעות"   },
  stars: { color: "#22d3ee", glow: "rgba(34,211,238,0.75)",   bg: "rgba(34,211,238,0.10)",   label: "כוכבים"   },
  hero:  { color: "#c084fc", glow: "rgba(192,132,252,0.75)",  bg: "rgba(192,132,252,0.10)",  label: "גיבור חדש" },
  skin:  { color: "#f472b6", glow: "rgba(244,114,182,0.75)",  bg: "rgba(244,114,182,0.10)",  label: "סקין חדש"  },
};

const RARITY_DISPLAY: Record<string, { label: string; color: string }> = {
  Common:    { label: "רגיל", color: "#94a3b8" },
  Rare:      { label: "נדיר", color: "#22d3ee" },
  Epic:      { label: "אפי",  color: "#c084fc" },
  Legendary: { label: "אגדי", color: "#fbbf24" },
};

const REWARD_SPARKLE_COLORS = ["#22d3ee","#c084fc","#f472b6","#fbbf24","#a78bfa","#34d399","#22d3ee","#fbbf24"] as const;

// ── Reward reveal screen ──────────────────────────────────────────────────────
function RewardRevealScreen({ loot, onOpenBox }: { loot: LootItem; onOpenBox: () => void }) {
  const d  = LOOT_DISPLAY[loot.type]  ?? { color: "#c084fc", glow: "rgba(192,132,252,0.7)", bg: "rgba(192,132,252,0.1)", label: loot.type };
  const rd = RARITY_DISPLAY[loot.rarity] ?? { label: loot.rarity, color: "#94a3b8" };

  return (
    <main
      className="min-h-screen flex flex-col items-center px-5 py-8 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 10%, #1a0540 0%, #0a0f2a 55%, #0a0a1a 100%)" }}
      dir="rtl"
    >
      <style>{`
        @keyframes rr-card-pop {
          0%   { transform: scale(0.08) translateY(-50px) rotate(-10deg); opacity: 0; }
          52%  { transform: scale(1.16) translateY(7px)   rotate(2deg);   opacity: 1; }
          70%  { transform: scale(0.93) translateY(-3px)  rotate(-1deg);  opacity: 1; }
          84%  { transform: scale(1.04) translateY(2px)   rotate(0deg);   opacity: 1; }
          100% { transform: scale(1)   translateY(0px)   rotate(0deg);   opacity: 1; }
        }
        @keyframes rr-card-glow {
          0%,100% { box-shadow: 0 0 16px var(--rr-glow), 0 0 5px var(--rr-glow),  inset 0 1px 0 rgba(255,255,255,0.08); }
          50%     { box-shadow: 0 0 42px var(--rr-glow), 0 0 22px var(--rr-glow), 0 0 60px var(--rr-glow), inset 0 1px 0 rgba(255,255,255,0.08); }
        }
        @keyframes rr-sparkle {
          0%   { transform: rotate(var(--rr-ang)) translateY(0px)                       scale(1.3); opacity: 1; }
          60%  { transform: rotate(var(--rr-ang)) translateY(calc(-1   * var(--rr-d)))  scale(0.9); opacity: 1; }
          100% { transform: rotate(var(--rr-ang)) translateY(calc(-1.7 * var(--rr-d)))  scale(0);   opacity: 0; }
        }
        @keyframes rr-icon-pop {
          0%   { transform: scale(0);    opacity: 0; }
          65%  { transform: scale(1.32); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes rr-label-up {
          0%   { transform: translateY(14px); opacity: 0; }
          100% { transform: translateY(0px);  opacity: 1; }
        }
        @keyframes rr-badge-pop {
          0%   { transform: scale(0.3); opacity: 0; }
          68%  { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes rr-header-in {
          0%   { opacity: 0; transform: translateY(-14px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes rr-btn-in {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .rr-card-pop   { animation: rr-card-pop  0.68s cubic-bezier(0.34,1.56,0.64,1) 0.10s both; }
        .rr-card-glow  { animation: rr-card-glow 1.5s  ease-in-out infinite; animation-delay: 0.78s; }
        .rr-icon-pop   { animation: rr-icon-pop  0.42s cubic-bezier(0.34,1.56,0.64,1) 0.58s both; }
        .rr-label-up   { animation: rr-label-up  0.34s ease-out 0.78s both; }
        .rr-badge-pop  { animation: rr-badge-pop 0.32s cubic-bezier(0.34,1.56,0.64,1) 0.96s both; }
        .rr-header-in  { animation: rr-header-in 0.38s ease-out 0.05s both; }
        .rr-btn-in     { animation: rr-btn-in    0.38s ease-out 1.18s both; }
      `}</style>

      {/* Floating ambient sparkles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute pointer-events-none select-none victory-sparkle"
          style={{
            top:  `${10 + (i * 11) % 78}%`,
            left: `${5  + (i * 17) % 90}%`,
            fontSize: `${12 + (i % 3) * 5}px`,
            animationDelay: `${i * 0.18}s`,
            opacity: 0.55,
          }}
        >
          {["✦","💎","✦","⚡","✦","💫","✦","💎"][i]}
        </div>
      ))}

      {/* Header */}
      <div className="rr-header-in flex flex-col items-center gap-1 mt-6 mb-8">
        <p
          className="font-black text-2xl tracking-wide text-center"
          style={{ color: "#22d3ee", textShadow: "0 0 16px rgba(34,211,238,0.85), 0 0 6px rgba(34,211,238,0.5)" }}
        >
          ✦ הפרס שלך ✦
        </p>
        <p className="text-violet-300 text-sm font-bold">ניצחת! הגיע הזמן לגלות מה קיבלת</p>
      </div>

      {/* Card + sparkles container */}
      <div className="relative flex justify-center items-center" style={{ minHeight: 240 }}>

        {/* Burst sparkle particles — fire once after card lands */}
        {REWARD_SPARKLE_COLORS.map((color, i) => {
          const angle = i * 45;
          const dist  = 72 + (i % 3) * 24;
          const size  = 8  + (i % 3) * 5;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: "50%", left: "50%",
                marginTop: -size / 2, marginLeft: -size / 2,
                width: size, height: size,
                background: color,
                clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)",
                boxShadow: `0 0 9px ${color}, 0 0 3px white`,
                "--rr-ang": `${angle}deg`,
                "--rr-d":   `${dist}px`,
                animation: "rr-sparkle 0.75s cubic-bezier(0.15,0,0.3,1) forwards",
                animationDelay: `${0.56 + i * 0.045}s`,
                opacity: 0,
                zIndex: 5,
                pointerEvents: "none",
              } as React.CSSProperties}
            />
          );
        })}

        {/* The reward card */}
        <div
          className="rr-card-pop rr-card-glow"
          style={{
            "--rr-glow": d.glow,
            width: 210,
            borderRadius: 22,
            border: `3.5px solid ${d.color}`,
            background: `linear-gradient(148deg, ${d.bg} 0%, rgba(8,4,28,0.92) 100%)`,
            padding: "28px 22px 22px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            position: "relative",
            zIndex: 10,
          } as React.CSSProperties}
        >
          {/* Corner crystal accents */}
          {(["#22d3ee","#f472b6","#c084fc","#fbbf24"] as const).map((cc, ci) => (
            <div
              key={ci}
              style={{
                position: "absolute",
                width: 7, height: 7,
                background: cc,
                clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)",
                boxShadow: `0 0 6px ${cc}`,
                top:    ci < 2 ? 8  : undefined,
                bottom: ci >= 2 ? 8 : undefined,
                left:   ci % 2 === 0 ? 8  : undefined,
                right:  ci % 2 === 1 ? 8  : undefined,
                opacity: 0.9,
              }}
            />
          ))}

          {/* Icon */}
          <div
            className="rr-icon-pop"
            style={{ fontSize: 60, lineHeight: 1, filter: `drop-shadow(0 0 18px ${d.color}) drop-shadow(0 0 6px white)` }}
          >
            {loot.icon}
          </div>

          {/* Type + label */}
          <div className="rr-label-up flex flex-col items-center gap-1.5">
            <span style={{ color: d.color, fontSize: 20, fontWeight: 900, textShadow: `0 0 12px ${d.glow}` }}>
              {d.label}
            </span>
            <span style={{ color: "#e2e8f0", fontSize: 15, fontWeight: 700, textAlign: "center" }}>
              {loot.label}
            </span>
          </div>

          {/* Rarity badge */}
          <div
            className="rr-badge-pop"
            style={{
              background: "rgba(0,0,0,0.55)",
              border: `1.5px solid ${rd.color}`,
              borderRadius: 20,
              padding: "3px 14px",
              color: rd.color,
              fontSize: 12,
              fontWeight: 800,
              textShadow: `0 0 8px ${rd.color}`,
            }}
          >
            ✦ {rd.label} ✦
          </div>
        </div>
      </div>

      {/* Open box button */}
      <div className="rr-btn-in mt-auto pt-10 w-full max-w-xs">
        <button
          onClick={onOpenBox}
          className="btn-3d btn-3d-gold py-4 px-8 text-xl font-black w-full btn-arena-pulse"
        >
          💎 פתח את תיבת הקריסטל!
        </button>
      </div>
    </main>
  );
}

// ── Main arena page ────────────────────────────────────────────────────────────
function ArenaPageContent() {
  const router    = useRouter();
  const params    = useSearchParams();
  const missionId = params.get("adventure") ?? "";

  const [phase,         setPhase]        = useState<Phase>("loading");
  const [arenaData,     setArenaData]    = useState<ArenaStartData | null>(null);
  const [questions,     setQuestions]    = useState<ArenaQuestion[]>([]);
  const [current,       setCurrent]      = useState(0);
  const [answered,      setAnswered]     = useState(0);
  const [correctCount,  setCorrectCount] = useState(0);
  const [bossHp,        setBossHp]       = useState(100);
  const [energy,        setEnergy]       = useState(0);
  const [feedback,      setFeedback]     = useState<AnswerResult | null>(null);
  const [feedbackEnergyBefore, setFeedbackEnergyBefore] = useState(0);
  const [shootResult,   setShootResult]  = useState<"hit" | "miss" | null>(null);
  const [loot,          setLoot]         = useState<LootItem | null>(null);
  const [bossDefeated,  setBossDefeated] = useState(false);
  const [errMsg,        setErrMsg]       = useState("");
  const [lastAnswer,    setLastAnswer]   = useState<AnswerKey | null>(null);
  const [muted,         setMuted]         = useState(false);
  const [enemyHit,      setEnemyHit]      = useState<"flash" | "tint" | false>(false);
  const [enemyVisible,   setEnemyVisible]   = useState(false);
  const [enemyDissolving, setEnemyDissolving] = useState(false);
  const [megaBlasting,  setMegaBlasting]  = useState(false);
  const [heroAnim,      setHeroAnim]      = useState<"idle" | "dash" | "recoil">("idle");
  const [showAimLine,   setShowAimLine]   = useState(false);
  const [showProjectile,setShowProjectile]= useState(false);
  const [projectileHit, setProjectileHit] = useState(false);
  const [impactBurst,   setImpactBurst]   = useState(false);
  const [enemyShake,    setEnemyShake]    = useState(false);
  const [shieldBlock,   setShieldBlock]   = useState(false);
  const [arenaShake,    setArenaShake]    = useState(false);
  const [projectileTravelPx, setProjectileTravelPx] = useState(210);
  const [projectileOriginX,  setProjectileOriginX]  = useState(50);   // % across arena
  const [projectileOriginY,  setProjectileOriginY]  = useState(35);   // % from bottom (origin = hero center)
  const [projectileDriftPx,  setProjectileDriftPx]  = useState(0);    // px to drift toward enemy center
  // 3-in-a-row streak — when current streak ≥ 3 the diamond shot turns gold/strong.
  const [correctStreak,      setCorrectStreak]      = useState(0);
  const [strongShot,         setStrongShot]         = useState(false);
  const [enemyAnchor, setEnemyAnchor] = useState<{ top: number; left: number } | null>(null);
  const [arenaH,       setArenaH]         = useState(400);
  const [isPending,     startTransition]  = useTransition();

  // ── Portrait guard (mobile only) ──────────────────────────────────────────
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobilePortrait(h > w && w < 768);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  // ── Hero movement ──────────────────────────────────────────────────────────
  // Enemy idle drift — curved sin/cos motion, with per-question randomized phase/style
  const [enemyOffset, setEnemyOffset] = useState({ x: 0, y: 0 });
  const enemyAiRef = useRef({
    style: 0,            // 0=circle, 1=figure-8, 2=lazy weave
    phaseX: Math.random() * Math.PI * 2,
    phaseY: Math.random() * Math.PI * 2,
    freqX:  0.6 + Math.random() * 0.5,
    freqY:  0.5 + Math.random() * 0.5,
    ampX:   28 + Math.random() * 18,
    ampY:   10 + Math.random() * 8,
    start:  performance.now(),
  });
  const enemyRafRef = useRef<number | null>(null);

  // Re-randomize enemy AI pattern when the question changes (so each enemy moves differently)
  useEffect(() => {
    enemyAiRef.current = {
      style:  Math.floor(Math.random() * 3),
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      freqX:  0.5 + Math.random() * 0.6,
      freqY:  0.4 + Math.random() * 0.6,
      ampX:   24 + Math.random() * 22,
      ampY:   8  + Math.random() * 10,
      start:  performance.now(),
    };
  }, [current]);

  // Enemy idle-drift loop — REPLACED by the active-enemy AI further below; kept disabled.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _legacyEnemyDriftDisabled = () => {
    const tick = () => {
      const ai = enemyAiRef.current;
      const t  = (performance.now() - ai.start) / 1000;
      let ox = 0, oy = 0;
      if (ai.style === 0) {
        // circle-strafe
        ox = Math.cos(t * ai.freqX + ai.phaseX) * ai.ampX;
        oy = Math.sin(t * ai.freqY + ai.phaseY) * ai.ampY;
      } else if (ai.style === 1) {
        // figure-8 (lemniscate)
        ox = Math.sin(t * ai.freqX + ai.phaseX) * ai.ampX;
        oy = Math.sin(2 * (t * ai.freqY + ai.phaseY)) * ai.ampY;
      } else {
        // lazy weave + bob
        ox = Math.sin(t * ai.freqX + ai.phaseX) * ai.ampX
           + Math.sin(t * 0.31 + ai.phaseY) * (ai.ampX * 0.25);
        oy = Math.sin(t * ai.freqY * 1.4 + ai.phaseY) * ai.ampY;
      }
      setEnemyOffset({ x: ox, y: oy });
      enemyRafRef.current = requestAnimationFrame(tick);
    };
    enemyRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (enemyRafRef.current !== null) cancelAnimationFrame(enemyRafRef.current);
      enemyRafRef.current = null;
    };
  };
  void _legacyEnemyDriftDisabled;

  // ── Roaming minion system (Brawl-Stars-style live arena) ──────────────────
  type MinionKind = "chaser" | "circler" | "dodger" | "jumper" | "flyer";
  interface Minion {
    id: number;
    kind: MinionKind;
    x: number; y: number;          // % position in arena
    vx: number; vy: number;        // current velocity %/s
    bobPhase: number;              // for jump/flyer
    hitUntil: number;              // ms timestamp; knockback / red flash while > now
    knockX: number; knockY: number;// knockback velocity
    born: number;
    color: string;
    size: number;
    facingLeft: boolean;
  }
  const [minions, setMinions] = useState<Minion[]>([]);
  const minionsRef = useRef<Minion[]>([]);
  const minionIdRef = useRef(1);
  const heroPosForAiRef = useRef({ x: 22, y: 60 });

  // Spawn a minion from outside the arena, heading inward
  // NOTE: Disabled — replaced by the active enemy archetype system below.
  const spawnMinion = useCallback(() => {
    return; // disabled
    // eslint-disable-next-line no-unreachable
    const kinds: MinionKind[] = ["chaser","circler","dodger","jumper","flyer"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const edge = Math.floor(Math.random() * 4); // 0=top 1=right 2=bottom 3=left
    let x = 50, y = 50, vx = 0, vy = 0;
    if (edge === 0)      { x = 10 + Math.random() * 80; y = -8; vy = 6 + Math.random()*4; }
    else if (edge === 1) { x = 108; y = 20 + Math.random()*60; vx = -(6 + Math.random()*4); }
    else if (edge === 2) { x = 10 + Math.random() * 80; y = 108; vy = -(6 + Math.random()*4); }
    else                 { x = -8; y = 20 + Math.random()*60; vx = 6 + Math.random()*4; }
    const colors = ["#22d3ee","#a78bfa","#f472b6","#fbbf24","#34d399","#f97316","#60a5fa"];
    const m: Minion = {
      id: minionIdRef.current++,
      kind,
      x, y, vx, vy,
      bobPhase: Math.random() * Math.PI * 2,
      hitUntil: 0,
      knockX: 0, knockY: 0,
      born: performance.now(),
      color: colors[Math.floor(Math.random()*colors.length)],
      size: kind === "flyer" ? 38 : kind === "jumper" ? 44 : 48,
      facingLeft: vx < 0,
    };
    minionsRef.current = [...minionsRef.current, m];
    setMinions(minionsRef.current);
  }, []);

  // Initialize / clear minions per battle phase
  useEffect(() => {
    if (phase !== "battle" && phase !== "challenge" && phase !== "shooting") {
      minionsRef.current = [];
      setMinions([]);
      return;
    }
    // Seed three minions on entering battle (only if empty)
    if (minionsRef.current.length === 0) {
      spawnMinion(); spawnMinion(); spawnMinion();
    }
  }, [phase, spawnMinion]);

  // Periodic spawner so arena stays alive (cap at 5)
  useEffect(() => {
    if (phase !== "battle" && phase !== "challenge") return;
    const id = setInterval(() => {
      if (minionsRef.current.length < 5) spawnMinion();
    }, 2600);
    return () => clearInterval(id);
  }, [phase, spawnMinion]);

  // Minion AI tick (RAF) — chase / circle / dodge / jump / fly with curved paths
  const minionRafRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== "battle" && phase !== "challenge") {
      if (minionRafRef.current !== null) cancelAnimationFrame(minionRafRef.current);
      minionRafRef.current = null;
      return;
    }
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt  = Math.min(0.05, (now - last) / 1000);
      last = now;
      const hx = heroPosForAiRef.current.x;
      const hy = heroPosForAiRef.current.y;
      let changed = false;
      const next: Minion[] = [];
      for (const m of minionsRef.current) {
        const age = (now - m.born) / 1000;
        const dxh = hx - m.x;
        const dyh = hy - m.y;
        const dist = Math.hypot(dxh, dyh) || 0.0001;
        const ux = dxh / dist, uy = dyh / dist;

        // Per-kind desired velocity (%/sec)
        let dvx = m.vx, dvy = m.vy;
        const SPEED = 14;
        if (m.kind === "chaser") {
          const wobble = Math.sin(age * 2.3 + m.bobPhase) * 6;
          dvx = ux * SPEED + (-uy) * wobble;
          dvy = uy * SPEED + ( ux) * wobble;
        } else if (m.kind === "circler") {
          // orbit hero at target radius ~22
          const targetR = 22;
          const radial = (dist - targetR);
          const tangX = -uy, tangY = ux;
          dvx = ux * radial * 2.0 + tangX * SPEED * 1.1;
          dvy = uy * radial * 2.0 + tangY * SPEED * 1.1;
        } else if (m.kind === "dodger") {
          // sidesteps perpendicular to hero with sinusoidal lateral motion
          const lateral = Math.sin(age * 3.1 + m.bobPhase) * SPEED * 1.4;
          const approach = dist > 28 ? SPEED * 0.9 : -SPEED * 0.4;
          dvx = ux * approach + (-uy) * lateral;
          dvy = uy * approach + ( ux) * lateral;
        } else if (m.kind === "jumper") {
          // hops along curved arcs toward hero
          const hop = Math.abs(Math.sin(age * 4.2 + m.bobPhase));
          const arc = Math.cos(age * 2.0 + m.bobPhase) * 8;
          dvx = ux * SPEED * (0.6 + hop * 0.9) + arc;
          dvy = uy * SPEED * (0.6 + hop * 0.9) - hop * 6;
        } else { // flyer — wide curved swoops, ignores hero gravity, weaves
          const sw = Math.sin(age * 1.5 + m.bobPhase);
          const cw = Math.cos(age * 1.2 + m.bobPhase * 0.7);
          dvx = sw * SPEED * 1.2 + ux * 4;
          dvy = cw * SPEED * 0.9 + uy * 3 - 2; // tend upward
        }

        // Smooth toward desired velocity
        let vx = m.vx + (dvx - m.vx) * Math.min(1, dt * 4);
        let vy = m.vy + (dvy - m.vy) * Math.min(1, dt * 4);

        // Knockback while hit
        if (now < m.hitUntil) {
          vx += m.knockX;
          vy += m.knockY;
          m.knockX *= 0.85;
          m.knockY *= 0.85;
        }

        let nx = m.x + vx * dt;
        let ny = m.y + vy * dt;

        // Bounce softly off arena edges (except first 1.2s where they enter)
        if (age > 1.2) {
          if (nx < 3)  { nx = 3;  vx = Math.abs(vx) * 0.8; }
          if (nx > 97) { nx = 97; vx = -Math.abs(vx) * 0.8; }
          if (ny < 4)  { ny = 4;  vy = Math.abs(vy) * 0.8; }
          if (ny > 92) { ny = 92; vy = -Math.abs(vy) * 0.8; }
        }

        // Reflect across hero so they don't sit on top — minimum stand-off
        if (dist < 10 && m.kind !== "jumper") {
          nx -= ux * (10 - dist);
          ny -= uy * (10 - dist);
        }

        const facingLeft = vx < -0.2 ? true : vx > 0.2 ? false : m.facingLeft;
        if (
          nx !== m.x || ny !== m.y ||
          vx !== m.vx || vy !== m.vy ||
          facingLeft !== m.facingLeft
        ) changed = true;
        next.push({ ...m, x: nx, y: ny, vx, vy, facingLeft });
      }
      if (changed) {
        minionsRef.current = next;
        setMinions(next);
      }
      minionRafRef.current = requestAnimationFrame(tick);
    };
    minionRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (minionRafRef.current !== null) cancelAnimationFrame(minionRafRef.current);
      minionRafRef.current = null;
    };
  }, [phase]);

  // React to a hero shot — knockback nearest minion, replace it after a beat
  function reactMinionsToShot(isCorrect: boolean) {
    const hx = heroPosRef.current.x, hy = heroPosRef.current.y;
    let best: Minion | null = null;
    let bestD = Infinity;
    for (const m of minionsRef.current) {
      const d = Math.hypot(m.x - hx, m.y - hy);
      if (d < bestD) { bestD = d; best = m; }
    }
    if (!best) return;
    const target = best;
    const ux = (target.x - hx) / (bestD || 1);
    const uy = (target.y - hy) / (bestD || 1);
    minionsRef.current = minionsRef.current.map(m =>
      m.id === target.id
        ? { ...m, hitUntil: performance.now() + 280, knockX: ux * 60, knockY: uy * 60 }
        : m
    );
    setMinions(minionsRef.current);
    if (isCorrect) {
      // Despawn the hit minion shortly after, then spawn a fresh one entering from outside
      const idToRemove = target.id;
      setTimeout(() => {
        minionsRef.current = minionsRef.current.filter(m => m.id !== idToRemove);
        setMinions(minionsRef.current);
        spawnMinion();
      }, 320);
    }
  }

  // ── Active enemy archetype (moves, faces hero, opens question on contact) ──
  const enemyVariant: EnemyVariant = arenaData
    ? getEnemyVariant(arenaData.worldId)
    : "goblin";
  const enemyVariantRef = useRef<EnemyVariant>(enemyVariant);
  useEffect(() => { enemyVariantRef.current = enemyVariant; }, [enemyVariant]);

  // Live enemy state, written every frame by the AI loop. Refs avoid re-renders.
  const enemyStateRef = useRef({
    x: 50,
    y: 18,
    vx: 0,
    vy: 0,
    facingDeg: 180, // face down toward hero by default
    animPhase: 0,
    teleportCooldown: 0,
    spawnedAt: performance.now(),
  });
  // Mirror to React state at low rate for the SVG (animPhase / variant change)
  const [enemyTick, setEnemyTick] = useState(0);

  // Contact-throttle so contact doesn't re-trigger during shooting/feedback
  const lastContactRef = useRef(0);

  const [heroPos,         setHeroPos]         = useState({ x: 11, y: 60 });
  const [isHeroMoving,    setIsHeroMoving]    = useState(false);
  const [heroFacingLeft,  setHeroFacingLeft]  = useState(false);
  const [isAttacking,     setIsAttacking]     = useState(false);
  const [runFrame,        setRunFrame]        = useState(0); // 0 = run-right.png, 1 = run-right2.png
  const attackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heroPosRef        = useRef({ x: 11, y: 60 });
  // Staging: first ~1s of each battle — hero auto-walks to position, contact blocked
  const stagingRef        = useRef(true);
  const [isStagingActive, setIsStagingActive] = useState(true);
  // Tracks whether the hero has already walked into the arena this session.
  // First battle → full entry walk. Q2+ → hero stays, only enemy respawns.
  const hasEnteredArenaRef = useRef(false);
  const HERO_BATTLE_X     = 35;
  const HERO_BATTLE_Y     = 60;
  const isHeroMovingRef   = useRef(false);
  const heroFacingLeftRef = useRef(false);
  const keysRef     = useRef(new Set<string>());
  const dpadRef     = useRef(new Set<string>());
  const enterShootRef = useRef<(() => void) | null>(null);
  const rafRef      = useRef<number | null>(null);
  const MOVE_SPEED  = 0.55;
  // Full-arena movement — hero can roam edge to edge, top to bottom.
  const HERO_BOUNDS = { xMin: 4, xMax: 96, yMin: 8, yMax: 92 };
  // ──────────────────────────────────────────────────────────────────────────
  const sessionRef  = useRef<string>("");
  const heroRef     = useRef<HTMLDivElement>(null);
  const enemyRef    = useRef<HTMLDivElement>(null);
  const arenaRef    = useRef<HTMLElement>(null);
  const bgMusicRef  = useRef<HTMLAudioElement | null>(null);

  // ── Measure arena height for responsive enemy sizing ─────────────────────
  // Must run after the arena section is in the DOM (phase === "battle").
  useEffect(() => {
    if (phase !== "battle") return;
    const measure = () => {
      const h = arenaRef.current?.offsetHeight ?? 0;
      if (h > 0) setArenaH(h);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [phase]);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!missionId) { setErrMsg("הרפתקה לא נמצאה"); setPhase("error"); return; }
    startTransition(async () => {
      const res = await startArenaSession(missionId);
      if (!res.success) { setErrMsg(res.error); setPhase("error"); return; }
      sessionRef.current = res.sessionId;
      setArenaData(res);
      setQuestions(res.questions);
      setBossHp(res.currentBossHp);
      setEnergy(res.currentEnergy);
      setPhase("battle");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId]);

  // ── Background music: try autoplay when battle starts ────────────────────
  useEffect(() => {
    if (phase !== "battle" || bgMusicRef.current || muted) return;
    const bg = new Audio("/sounds/battle-theme.mp3");
    bg.loop   = true;
    bg.volume = 0.15;
    bgMusicRef.current = bg;
    bg.play().catch(() => {
      // Browser blocked autoplay — music will start on first tap/Enter instead
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Background music: stop on unmount/navigation ──────────────────────────
  useEffect(() => {
    return () => { bgMusicRef.current?.pause(); };
  }, []);

  // ── Background music: respond to mute toggle ───────────────────────────────
  useEffect(() => {
    if (!bgMusicRef.current) return;
    if (muted) {
      bgMusicRef.current.pause();
    } else {
      bgMusicRef.current.play().catch(() => {});
    }
  }, [muted]);

  // Keep enterShootRef current every render so the stale-closure keydown handler can call it
  enterShootRef.current = () => {
    if (phase === "battle" && !isPending && !bossDefeated) handleFireCrystal();
  };

  // ── Keyboard input (always registered, movement only runs in battle phase) ──
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) e.preventDefault();
      if (e.key === "Enter") {
        const tag = (e.target as HTMLElement).tagName;
        if (tag !== "BUTTON" && tag !== "INPUT" && tag !== "TEXTAREA") {
          enterShootRef.current?.();
        }
        return;
      }
      keysRef.current.add(e.key);
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup",   onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup",   onUp);
      keysRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Active enemy AI loop (writes transform via ref each frame) ─────────────
  const enemyAiRafRef = useRef<number | null>(null);
  // Reset enemy entry point when a new battle/question starts
  useEffect(() => {
    if (phase === "battle") {
      lastContactRef.current = 0;
      setEnemyDissolving(false);

      // Enemy ALWAYS enters from the RIGHT side — fixed position, no random jitter.
      const v = enemyVariantRef.current;
      let ex: number, ey: number;
      if (v === "bat") {
        ex = 90; ey = 16;
      } else if (v === "giant") {
        ex = 90; ey = 50;
      } else if (v === "wizard") {
        ex = 90; ey = 37;
      } else {
        // goblin — ground level, right side
        ex = 90; ey = 67;
      }
      enemyStateRef.current.x = ex;
      enemyStateRef.current.y = ey;
      enemyStateRef.current.vx = 0;
      enemyStateRef.current.vy = 0;
      enemyStateRef.current.spawnedAt = performance.now();
      enemyStateRef.current.teleportCooldown = 1.5;
      const _hdx = heroPosRef.current.x - ex;
      const _hdy = heroPosRef.current.y - ey;
      enemyStateRef.current.facingDeg = (Math.atan2(_hdx, -_hdy) * 180) / Math.PI;
      enemyStateRef.current.animPhase = 1;

      if (!hasEnteredArenaRef.current) {
        // First entry: hero walks in dramatically from the left edge.
        hasEnteredArenaRef.current = true;
        stagingRef.current = true;
        setEnemyVisible(false);
        setIsStagingActive(true);
        heroPosRef.current = { x: 3, y: HERO_BATTLE_Y };
        heroPosForAiRef.current = { x: 3, y: HERO_BATTLE_Y };
        setHeroPos({ x: 3, y: HERO_BATTLE_Y });
        setHeroFacingLeft(false);
        heroFacingLeftRef.current = false;
        const stagingTimer = setTimeout(() => {
          stagingRef.current = false;
          setIsStagingActive(false);
          setEnemyVisible(true); // enemy pops in dramatically after hero walks into position
          // Grace: block contact for 700ms so child sees the face-off before question opens
          lastContactRef.current = performance.now() + 300;
        }, 1050);
        return () => clearTimeout(stagingTimer);
      } else {
        // Q2+: hero stays in battle position, enemy re-enters from right quickly.
        // stagingRef blocks contact while enemy travels in; hero keeps battle stance.
        stagingRef.current = true;
        setIsStagingActive(false);
        setEnemyVisible(false);
        const timer = setTimeout(() => {
          stagingRef.current = false;
          setEnemyVisible(true); // enemy pops in with appear animation
          // Grace: block contact for 700ms so child sees the face-off before question opens
          lastContactRef.current = performance.now() + 300;
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [phase, current]);

  useEffect(() => {
    if (phase !== "battle" && phase !== "shooting" && phase !== "feedback" && phase !== "challenge") {
      if (enemyAiRafRef.current !== null) cancelAnimationFrame(enemyAiRafRef.current);
      enemyAiRafRef.current = null;
      return;
    }
    let last = performance.now();
    const tick = () => {
      const now  = performance.now();
      const dt   = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = enemyStateRef.current;
      const hx = heroPosRef.current.x;
      const hy = heroPosRef.current.y;
      const dx = hx - s.x;
      const dy = hy - s.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const ux = dx / dist;
      const uy = dy / dist;
      const v = enemyVariantRef.current;
      const age = (now - s.spawnedAt) / 1000;

      // Per-archetype velocity (in arena %/sec).
      // KEEP_DIST = personal space — enemies orbit/approach but never land on the hero's body.
      const KEEP_DIST =
        v === "giant"  ? 18 :
        v === "bat"    ? 16 :
        v === "wizard" ? 20 : 15;
      let dvx = 0, dvy = 0;
      if (v === "goblin") {
        // Runs along the GROUND with a hopping wobble. Y is pulled toward a ground band.
        const GROUND_Y = Math.max(62, Math.min(82, hy + 6));
        const SPEED = 20;
        // run horizontally toward hero; vertical only nudges toward ground band
        const dirX = Math.sign(dx) || 1;
        const approach = dist > KEEP_DIST ? 1 : -0.35;
        dvx = dirX * SPEED * approach;
        // hop: small periodic vertical impulse, otherwise settle on ground band
        const hop = Math.sin(age * 7) * 6;
        dvy = (GROUND_Y - s.y) * 4 - Math.max(0, Math.sin(age * 7)) * hop;
        s.animPhase = Math.hypot(s.vx, s.vy) > 2 ? 1 : 0;
      } else if (v === "bat") {
        // Curved flying path — figure-8 style swoop that orbits the hero.
        const SPEED = 24;
        const tangX = -uy, tangY = ux;
        const approach = dist > KEEP_DIST ? 1 : -0.4;
        const swoop = Math.sin(age * 2.6);
        const curl  = Math.cos(age * 1.7);
        dvx = ux * SPEED * approach + tangX * SPEED * 0.9 * swoop + curl * 3;
        dvy = uy * SPEED * approach + tangY * SPEED * 0.9 * swoop - Math.cos(age * 3.2) * 5;
        s.animPhase = Math.hypot(s.vx, s.vy) > 2 ? 1 : 0;
      } else if (v === "giant") {
        // Slow stomp from the side. Approach mostly horizontally, never overlap.
        const SPEED = 7;
        const stomping = Math.abs(Math.sin(age * 1.8)) > 0.6;
        const kick = stomping ? 1.5 : 0.4;
        const approach = dist > KEEP_DIST ? 1 : -0.25;
        // Bias horizontal motion so it stomps from the side
        dvx = Math.sign(dx || 1) * SPEED * kick * approach;
        dvy = uy * SPEED * 0.5 * kick * approach;
        s.animPhase = Math.hypot(s.vx, s.vy) > 1.5 ? 1 : 0;
      } else { // wizard
        // Teleport / dash / dodge. Always reappears at a safe distance.
        s.teleportCooldown -= dt;
        const projectileInFlight = showProjectileRef.current;
        const safeRadius = () => KEEP_DIST + 4 + Math.random() * 8;
        if (projectileInFlight && s.teleportCooldown < 0.3) {
          // dash sideways to dodge an incoming shot
          const side = Math.random() < 0.5 ? -1 : 1;
          s.x += -uy * 16 * side;
          s.y +=  ux * 10 * side;
          // ensure we didn't dash onto the hero
          const ndx = hx - s.x, ndy = hy - s.y;
          const nd  = Math.hypot(ndx, ndy) || 1;
          if (nd < KEEP_DIST) {
            s.x = hx - (ndx / nd) * safeRadius();
            s.y = hy - (ndy / nd) * safeRadius();
          }
          s.teleportCooldown = 1.2;
          s.animPhase = 1;
        } else if (s.teleportCooldown <= 0) {
          // teleport to a fresh angle around hero, always outside KEEP_DIST
          const ang = Math.random() * Math.PI * 2;
          const r = safeRadius();
          s.x = hx + Math.cos(ang) * r;
          s.y = hy + Math.sin(ang) * r;
          s.teleportCooldown = 1.6 + Math.random() * 1.2;
          s.animPhase = 1;
        } else {
          // small orbital drift between teleports
          const SPEED = 9;
          const tangX = -uy, tangY = ux;
          const approach = dist > KEEP_DIST + 4 ? 3 : -3;
          dvx = tangX * SPEED + ux * approach;
          dvy = tangY * SPEED + uy * approach;
          s.animPhase = Math.max(0, s.animPhase - dt * 2.5);
        }
      }

      // During staging (first ~1s): enemy rushes in at 2.5× speed so it visibly charges into arena
      const stagingBoost = stagingRef.current ? 2.5 : 1;

      // Pause/freeze the enemy ONLY while the question is on screen. After the
      // child answers (shooting/feedback), the enemy resumes moving — important
      // so that a wrong answer feels like the enemy "continues" the attack.
      if (phase !== "challenge") {
        s.vx = s.vx + (dvx * stagingBoost - s.vx) * Math.min(1, dt * 5);
        s.vy = s.vy + (dvy * stagingBoost - s.vy) * Math.min(1, dt * 5);
        s.x += s.vx * dt;
        s.y += s.vy * dt;
      } else {
        // smooth halt
        s.vx *= 0.85;
        s.vy *= 0.85;
      }

      // Hard personal-space clamp — never let the enemy stand on the hero's body.
      // Uses the same KEEP_DIST so each archetype keeps its own comfortable distance.
      const KEEP_DIST_CLAMP =
        v === "giant"  ? 17 :
        v === "bat"    ? 15 :
        v === "wizard" ? 18 : 14;
      if (age > 0.6) {
        const ddx = s.x - hx;
        const ddy = s.y - hy;
        const dd  = Math.hypot(ddx, ddy);
        if (dd < KEEP_DIST_CLAMP) {
          const nd = dd || 0.0001;
          s.x = hx + (ddx / nd) * KEEP_DIST_CLAMP;
          s.y = hy + (ddy / nd) * KEEP_DIST_CLAMP;
          // bleed velocity that was pushing into the hero
          const into = (s.vx * (-ddx / nd) + s.vy * (-ddy / nd));
          if (into > 0) {
            s.vx -= into * (-ddx / nd);
            s.vy -= into * (-ddy / nd);
          }
        }
      }

      // Soft bounds — keep enemy inside arena at all times including during staging
      if (age > 0.2) {
        const aw2 = arenaRef.current?.offsetWidth  ?? 700;
        const ah2 = arenaRef.current?.offsetHeight ?? 400;
        // Scale sprite size to arena height so enemy fills ~62% of visible arena.
        // Capped at each variant's designed max so it never looks disproportionate on large screens.
        const VAR_MAX = v === "giant" ? 400 : v === "wizard" ? 360 : v === "bat" ? 340 : 320;
        const eSz = Math.max(150, Math.min(VAR_MAX, Math.round(ah2 * 0.72)));
        // The enemy wrapper is flex-col: HP bar (~30px) + 4px gap + sprite (eSz px).
        // translate(-50%,-50%) centers the WHOLE column, so the sprite centre is
        // (30+4)/2 = 17px BELOW the anchor.  halfH accounts for the full column height
        // so clamp keeps the sprite (including HP bar) fully inside the arena.
        const HP_BAR_HALF = 17;
        const halfH = eSz / 2 + HP_BAR_HALF;
        const exMin = Math.round((eSz / 2 / aw2) * 100) + 2;
        const exMax = 100 - exMin;
        const eyMinCalc = Math.round((halfH / ah2) * 100) + 2;
        const eyMaxCalc = 100 - Math.round((halfH / ah2) * 100) - 2;
        // Guard: if sprite is taller than arena, clamp to centre
        const eyMin = Math.min(eyMinCalc, 50);
        const eyMax = Math.max(eyMaxCalc, eyMin + 5);
        if (s.x < exMin) { s.x = exMin; s.vx =  Math.abs(s.vx) * 0.6; }
        if (s.x > exMax) { s.x = exMax; s.vx = -Math.abs(s.vx) * 0.6; }
        if (s.y < eyMin) { s.y = eyMin; s.vy =  Math.abs(s.vy) * 0.6; }
        if (s.y > eyMax) { s.y = eyMax; s.vy = -Math.abs(s.vy) * 0.6; }
      }

      // Facing — point toward hero (SVG drawn facing UP → 0°)
      // angle of vector (hx-s.x, hy-s.y) from "up"
      s.facingDeg = (Math.atan2(dx, -dy) * 180) / Math.PI;

      // Write transform directly to DOM
      const el = enemyRef.current;
      if (el && arenaRef.current) {
        const aw = arenaRef.current.offsetWidth;
        const ah = arenaRef.current.offsetHeight;
        const px = (s.x / 100) * aw;
        const py = (s.y / 100) * ah;
        el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
        // child rotates via React (we re-render at low rate via enemyTick)
      }

      // Auto-open question on FIRST contact with the enemy's personal-space ring.
      // No Enter, no click, no wait — the moment the enemy reaches the hero, the
      // question opens. handleFireCrystal early-returns if phase !== "battle", so
      // re-entries during challenge/shooting/feedback are naturally suppressed.
      // Wizard teleports to safeRadius (KEEP_DIST+4..KEEP_DIST+12), so its contact
      // radius must include that band — otherwise it would never trigger.
      // Lock trigger — fires as soon as the enemy enters detection range (beam lock).
      // No body collision required: range is 40 arena-% units so the question opens
      // the moment the enemy approaches, well before physical contact.
      const LOCK_DIST = 22;
      if (phase === "battle" && !stagingRef.current && age > 0.5) {
        if (dist <= LOCK_DIST && now - lastContactRef.current > 400) {
          lastContactRef.current = now;
          handleFireCrystalRef.current?.();
        }
      }

      enemyAiRafRef.current = requestAnimationFrame(tick);
    };
    enemyAiRafRef.current = requestAnimationFrame(tick);
    // bump react state ~10/sec for SVG anim phase
    const phaseTickInt = setInterval(() => setEnemyTick(t => (t + 1) % 1000), 100);
    return () => {
      if (enemyAiRafRef.current !== null) cancelAnimationFrame(enemyAiRafRef.current);
      enemyAiRafRef.current = null;
      clearInterval(phaseTickInt);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // refs used by enemy AI
  const showProjectileRef = useRef(false);
  useEffect(() => { showProjectileRef.current = showProjectile; }, [showProjectile]);
  const handleFireCrystalRef = useRef<(() => void) | null>(null);

  // ── Movement RAF loop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "battle" && phase !== "challenge" && phase !== "shooting" && phase !== "feedback") {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    const tick = () => {
      const k = keysRef.current;
      const d = dpadRef.current;
      let { x, y } = heroPosRef.current;
      let moved = false;
      let goingLeft = heroFacingLeftRef.current;

      // Compute arena-aware hero bounds every tick so staging + free movement both respect them.
      // Hero top = heroPos.y%, sprite = 190px + 22px name = 212px total, half-width = 63px.
      const aw = arenaRef.current?.offsetWidth  ?? 700;
      const ah = arenaRef.current?.offsetHeight ?? 400;
      const heroHalfW = 63;
      const heroH     = 212;
      const xMinPct = (heroHalfW / aw) * 100 + 0.5;
      const xMaxPct = 100 - xMinPct;
      const yMinPct = (6 / ah) * 100;
      const yMaxPct = Math.max(yMinPct + 10, ((ah - heroH - 6) / ah) * 100);

      // During staging: auto-walk right; player can take over immediately with D-pad/keys
      const playerMoving = k.size > 0 || d.size > 0;
      if (stagingRef.current) {
        if (playerMoving) {
          // Player takes control — end staging immediately so enemy appears and contact fires
          stagingRef.current = false;
          setIsStagingActive(false);
          setEnemyVisible(true);
        } else {
          if (x < HERO_BATTLE_X - 0.3) {
            x = Math.min(x + MOVE_SPEED * 0.90, HERO_BATTLE_X);
            y = Math.min(HERO_BATTLE_Y, yMaxPct);
            moved = true;
            goingLeft = false;
            heroPosRef.current = { x, y };
            heroPosForAiRef.current = { x, y };
            setHeroPos({ x, y });
          }
          if (moved !== isHeroMovingRef.current) { isHeroMovingRef.current = moved; setIsHeroMoving(moved); }
          if (goingLeft !== heroFacingLeftRef.current) { heroFacingLeftRef.current = goingLeft; setHeroFacingLeft(goingLeft); }
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
      }

      let dx = 0, dy = 0;
      if (k.has("ArrowLeft")  || k.has("a") || k.has("A") || d.has("left"))  { dx -= 1; }
      if (k.has("ArrowRight") || k.has("d") || k.has("D") || d.has("right")) { dx += 1; }
      if (k.has("ArrowUp")    || k.has("w") || k.has("W") || d.has("up"))    { dy -= 1; }
      if (k.has("ArrowDown")  || k.has("s") || k.has("S") || d.has("down"))  { dy += 1; }
      if (dx !== 0 || dy !== 0) {
        // Normalize so diagonal isn't faster than axial
        const mag = Math.hypot(dx, dy) || 1;
        x += (dx / mag) * MOVE_SPEED;
        y += (dy / mag) * MOVE_SPEED;
        moved = true;
      }
      // Always clamp to arena bounds — prevents clipping at initial spawn and during idle
      const cx = Math.max(xMinPct, Math.min(xMaxPct, x));
      const cy = Math.max(yMinPct, Math.min(yMaxPct, y));
      if (moved || cx !== heroPosRef.current.x || cy !== heroPosRef.current.y) {
        heroPosRef.current = { x: cx, y: cy };
        heroPosForAiRef.current = { x: cx, y: cy };
        setHeroPos({ x: cx, y: cy });
      }
      // Hero always faces toward the enemy during movement and at rest
      const ex = enemyStateRef.current.x;
      goingLeft = ex < x;
      // Only call setState when moving/facing state actually changes
      if (moved !== isHeroMovingRef.current) {
        isHeroMovingRef.current = moved;
        setIsHeroMoving(moved);
      }
      if (goingLeft !== heroFacingLeftRef.current) {
        heroFacingLeftRef.current = goingLeft;
        setHeroFacingLeft(goingLeft);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── Run frame animation: alternate between run-right.png and run-right2.png ──
  useEffect(() => {
    if (!isHeroMoving) { setRunFrame(0); return; }
    const id = setInterval(() => setRunFrame(f => (f + 1) % 2), 140);
    return () => clearInterval(id);
  }, [isHeroMoving]);

  // ── Sound ─────────────────────────────────────────────────────────────────
  function playSound(name: string) {
    if (muted) return;
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  }

  // Keep latest fire fn in a ref so the enemy-AI raf can call it without re-binding
  handleFireCrystalRef.current = () => {
    if (phase === "battle" && !isPending && !bossDefeated) handleFireCrystal();
  };

  // ── Open challenge card ────────────────────────────────────────────────────
  function handleFireCrystal() {
    if (phase !== "battle" || isPending) return;
    // Trigger attack visual for 600ms before opening challenge
    if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
    if (!muted) {
      if (!bgMusicRef.current) {
        const bg = new Audio("/sounds/battle-theme.mp3");
        bg.loop   = true;
        bg.volume = 0.15;
        bgMusicRef.current = bg;
      }
      if (bgMusicRef.current.paused) {
        bgMusicRef.current.play().catch(() => {});
      }
    }
    playSound("shoot");
    // Snap hero facing toward enemy at moment of contact
    const _contactFacingLeft = enemyStateRef.current.x < heroPosRef.current.x;
    heroFacingLeftRef.current = _contactFacingLeft;
    setHeroFacingLeft(_contactFacingLeft);
    // Open the question immediately on contact — no waiting.
    setIsAttacking(true);
    setPhase("challenge");
    attackTimerRef.current = setTimeout(() => {
      setIsAttacking(false);
    }, 600);
  }

  // ── Answer submitted ───────────────────────────────────────────────────────
  function handleAnswer(key: AnswerKey) {
    if (phase !== "challenge" || isPending) return;
    const q = questions[current];
    if (!q) return;

    setLastAnswer(key);
    setPhase("shooting");

    startTransition(async () => {
      const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

      // Fire server call immediately — do NOT block the visual on the response.
      // submitPromise resolves during the projectile travel window (~470 ms budget).
      const submitPromise = submitAnswer(sessionRef.current, q.id, key);

      // ── Arcade attack animation — starts immediately on click ─────────────

      // Optimistic streak for projectile colour (gold at 3+).
      // Corrected to 0 below if the server says wrong.
      const optimisticStreak = correctStreak + 1;
      setStrongShot(optimisticStreak >= 3);

      // 1. Aim line flashes briefly
      setShowAimLine(true);
      await wait(80);
      setShowAimLine(false);

      // 2. Hero dashes toward enemy
      setHeroAnim("dash");
      await wait(130);

      // 3. Hero recoils — projectile launches simultaneously.
      // Hero faces the enemy: mirror sprite based on enemy-x vs hero-x.
      setHeroAnim("recoil");
      if (arenaRef.current) {
        const aw = arenaRef.current.offsetWidth;
        const ah = arenaRef.current.offsetHeight;
        const facingRight = enemyStateRef.current.x >= heroPosRef.current.x;
        // Origin: Miti's attack hand — right side when facing right, left side when facing left
        const handOffsetX = facingRight ? 52 : -52;
        const hxPx = (heroPosRef.current.x / 100) * aw + handOffsetX;
        const hyPx = (heroPosRef.current.y / 100) * ah + 68; // chest/shoulder height
        // Target: locked enemy center
        const exPx = (enemyStateRef.current.x / 100) * aw;
        const eyPx = (enemyStateRef.current.y / 100) * ah;
        const dxAbs = exPx - hxPx;
        const dyAbs = eyPx - hyPx;
        heroFacingLeftRef.current = !facingRight;
        setHeroFacingLeft(!facingRight);
        // bottom-% origin so projectile is placed at Miti's attack hand
        setProjectileOriginX((hxPx / aw) * 100);
        setProjectileOriginY(((ah - hyPx) / ah) * 100);
        // drift (X) and travel (Y) follow the beam vector exactly
        setProjectileDriftPx(Math.round(dxAbs));
        setProjectileTravelPx(Math.round(-dyAbs));
      }
      setShowProjectile(true);
      setProjectileHit(true);
      await wait(160);
      setHeroAnim("idle");

      // 4. Projectile travels — await server response during this window.
      // Promise.all ensures we wait at least 310 ms AND for the server result.
      const [res] = await Promise.all([submitPromise, wait(310)]);

      if (!res.success) {
        setShowProjectile(false);
        setShowAimLine(false);
        setStrongShot(false);
        setErrMsg(res.error);
        setPhase("error");
        return;
      }

      const didHit = res.isCorrect;
      setShootResult(didHit ? "hit" : "miss");
      reactMinionsToShot(didHit);

      // Pre-compute enemy anchor (used by both hit and miss branches)
      if (enemyRef.current && arenaRef.current) {
        const er = enemyRef.current.getBoundingClientRect();
        const ar = arenaRef.current.getBoundingClientRect();
        setEnemyAnchor({
          top:  er.top  + er.height / 2 - ar.top,
          left: er.left + er.width  / 2 - ar.left,
        });
      }

      if (didHit) {
        // Confirm streak bookkeeping now that server validated the answer.
        setCorrectStreak(optimisticStreak);
        // strongShot was already set optimistically above — no change needed.

        // 5. Impact: burst particles, enemy flash, enemy shake, optional arena shake
        setShowProjectile(false);
        setImpactBurst(true);
        playSound("correct");
        playSound("impact");
        setEnemyHit("flash");
        setEnemyShake(true);
        if (res.bossDamageDealt >= 25) {
          setArenaShake(true);
          await wait(150);
          setArenaShake(false);
        } else {
          await wait(150);
        }
        setEnemyHit("tint");
        await wait(200);
        setEnemyHit(false);
        await wait(170);
        setImpactBurst(false);
        setEnemyShake(false);

      } else {
        // Wrong answer — projectile vanishes, enemy blocks with shield.
        setCorrectStreak(0);
        setStrongShot(false);
        setShowProjectile(false);
        setHeroAnim("recoil");
        playSound("wrong");
        setShieldBlock(true);
        await wait(200);
        setHeroAnim("idle");
        setShieldBlock(false);
        await wait(150);
      }

      // Safety cleanup
      setShowAimLine(false);
      setShowProjectile(false);
      // ─────────────────────────────────────────────────────────────────────

      setFeedbackEnergyBefore(energy);
      setFeedback(res);
      setBossHp(res.newBossHp);
      setEnergy(res.newEnergy);
      setAnswered(prev => prev + 1);
      const newCorrect = res.isCorrect ? correctCount + 1 : correctCount;
      if (res.isCorrect) setCorrectCount(prev => prev + 1);
      if (res.bossDefeated) setBossDefeated(true);

      setPhase("feedback");

      // Auto-advance after feedback display
      await new Promise(r => setTimeout(r, 1300));

      setShootResult(null);
      setFeedback(null);
      setLastAnswer(null);

      if (res.bossDefeated && res.allAnswered) {
        bgMusicRef.current?.pause();
        playSound("victory");
        // Enemy dissolves in-arena with smooth white fade before victory screen
        setEnemyDissolving(true);
        await new Promise(r => setTimeout(r, 950));
        setEnemyDissolving(false);
        setPhase("victory");
      } else if (res.allAnswered) {
        setPhase("end");
      } else {
        setCurrent(prev => prev + 1);
        setPhase("battle");
      }
    });
  }

  // ── Mega Hit ───────────────────────────────────────────────────────────────
  function handleMegaHit() {
    if (phase !== "battle" || energy < ENERGY_MAX || isPending) return;
    playSound("mega");
    setMegaBlasting(true);
    setPhase("megahit");

    startTransition(async () => {
      await new Promise(r => setTimeout(r, 300));
      const res = await useMegaHit(sessionRef.current);
      if (!res.success) { setPhase("battle"); setMegaBlasting(false); return; }

      setBossHp(res.newBossHp);
      setEnergy(res.newEnergy);
      if (res.bossDefeated) setBossDefeated(true);
      setEnemyHit("flash");
      setEnemyShake(true);
      setArenaShake(true);
      await new Promise(r => setTimeout(r, 150));
      setArenaShake(false);
      setEnemyHit("tint");
      await new Promise(r => setTimeout(r, 200));
      setEnemyHit(false);

      await new Promise(r => setTimeout(r, 300));
      setEnemyShake(false);
      setMegaBlasting(false);

      if (res.bossDefeated) {
        const totalAnswered = answered;
        const pct = totalAnswered > 0 ? correctCount / totalAnswered : 0;
        if (pct >= 0.9) {
          bgMusicRef.current?.pause();
          playSound("victory");
          setEnemyDissolving(true);
          await new Promise(r => setTimeout(r, 950));
          setEnemyDissolving(false);
        }
        setPhase("victory");
      } else {
        setPhase("battle");
      }
    });
  }

  // ── Claim reward ───────────────────────────────────────────────────────────
  function handleClaimReward(source: "arena_completion" | "boss_defeat") {
    startTransition(async () => {
      const res = await claimReward(sessionRef.current, source);
      if (!res.success) { setErrMsg(res.error); return; }
      setLoot(res.loot);
      setPhase("reward-reveal");
    });
  }

  function handleOpenBox() {
    setPhase("reward");
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const q         = questions[current];
  const enemyName = getEnemyName(arenaData?.worldId ?? null);

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-5"
        style={{ background: "radial-gradient(ellipse at 30% 0%, #1e0a3c 0%, #0f0a2a 50%, #0a0a1a 100%)" }}
        dir="rtl"
      >
        <div className="text-8xl boss-idle">💎</div>
        <p className="text-violet-300 text-xl font-black animate-pulse text-glow-violet">
          הזירה נפתחת...
        </p>
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="w-3 h-3 rotate-45 bg-violet-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </main>
    );
  }

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: "radial-gradient(ellipse at 30% 0%, #1e0a3c 0%, #0f0a2a 50%, #0a0a1a 100%)" }}
        dir="rtl"
      >
        <div className="text-7xl">💔</div>
        <p className="text-red-400 text-center font-bold text-lg">{errMsg || "שגיאה בטעינת הזירה"}</p>
        <button onClick={() => router.push("/child")} className="btn-3d btn-3d-violet px-8 py-3 text-base">
          חזרה לבסיס
        </button>
      </main>
    );
  }

  // ── REWARD REVEAL ──────────────────────────────────────────────────────────
  if (phase === "reward-reveal" && loot) {
    return <RewardRevealScreen loot={loot} onOpenBox={handleOpenBox} />;
  }

  // ── REWARD ─────────────────────────────────────────────────────────────────
  if (phase === "reward" && loot) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at 30% 0%, #1e0a3c 0%, #0f0a2a 50%, #0a0a1a 100%)" }}
        dir="rtl"
      >
        <TreasureBox
          reward={{
            type: loot.type as "coins" | "stars" | "hero" | "skin",
            label: loot.label,
            rarity: loot.rarity,
            icon: loot.icon,
            heroGender: loot.heroGender,
            heroTheme: loot.heroTheme,
          }}
          onCollect={() => router.push("/child")}
        />
      </main>
    );
  }

  // ── VICTORY ANIMATION ────────────────────────────────────────────────────────
  if (phase === "victory-anim") {
    const imgSrc = arenaData ? getHeroImage(arenaData.heroGender, arenaData.heroColorTheme, 0) : "";
    const SHARD_COLORS = ["#22d3ee","#c084fc","#f472b6","#fbbf24","#a78bfa","#34d399","#22d3ee","#fbbf24","#f472b6","#c084fc","#34d399","#a78bfa"];
    return (
      <main
        className="min-h-screen flex flex-col items-center relative overflow-hidden arena-victory-shake"
        style={{ background: "radial-gradient(ellipse at 50% 18%, #2a0a4a 0%, #0f0a2a 55%, #0a0a1a 100%)" }}
        dir="rtl"
      >
        {/* ── Enemy shatter (top center) ── */}
        <div style={{ position: "absolute", top: "12%", left: "50%", zIndex: 5 }}>
          {/* Sprite with defeat animation */}
          <div className="enemy-defeat-seq" style={{ transform: "translateX(-50%)" }}>
            <CrystalEnemy worldId={arenaData?.worldId ?? null} size={150} hp={0} showName={false} />
          </div>

          {/* Soft radial glow burst at enemy center — not full screen */}
          <div className="enemy-burst-glow" style={{ top: "50%", left: "50%" }} />

          {/* Crystal shards radiating outward */}
          {SHARD_COLORS.map((color, i) => {
            const angle = i * 30;
            const dist  = 55 + (i % 4) * 22;
            const size  = 8  + (i % 3) * 5;
            return (
              <div
                key={i}
                className="defeat-shard"
                style={{
                  top: "50%", left: "50%",
                  marginTop: -size / 2, marginLeft: -size / 2,
                  width: size, height: size,
                  "--shard-color": color,
                  "--angle": `${angle}deg`,
                  "--dist":  `${dist}px`,
                  animationDelay: `${0.30 + i * 0.04}s`,
                } as React.CSSProperties}
              />
            );
          })}
        </div>

        {/* ── Hero celebration (bottom center) ── */}
        {arenaData && (
          <div style={{
            position: "absolute", bottom: "16%", left: "50%",
            transform: "translateX(-50%)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
            zIndex: 10,
          }}>
            {/* Outer div: glow filter — Inner div: jump transform — keeps them independent */}
            <div className="hero-victory-glow">
              <div className="hero-victory-jump">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgSrc}
                  alt={arenaData.heroName}
                  style={{ height: 210, width: "auto", display: "block", background: "transparent" }}
                />
              </div>
            </div>
            <p className="text-violet-200 font-black text-xl" style={{
              textShadow: "0 0 12px rgba(192,132,252,0.9)",
            }}>
              {arenaData.heroName}
            </p>
          </div>
        )}

        {/* ── Screen flash burst on shatter ── */}
        <div className="victory-flash-burst pointer-events-none" style={{ zIndex: 30 }} />

        {/* ── Confetti stars raining down ── */}
        {(["⭐","💫","✦","⭐","💫","✦","⭐","💫"] as const).map((star, i) => (
          <div
            key={i}
            className="victory-confetti pointer-events-none select-none"
            style={{
              left: `${8 + i * 12}%`,
              fontSize: `${16 + (i % 3) * 8}px`,
              animationDelay: `${0.35 + i * 0.08}s`,
            } as React.CSSProperties}
          >
            {star}
          </div>
        ))}

        {/* ── VictoryTitle overlay (unchanged) ── */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20"
          style={{ paddingBottom: "15%" }}
        >
          <VictoryTitle />
        </div>
      </main>
    );
  }

  // ── VICTORY ────────────────────────────────────────────────────────────────
  if (phase === "victory") {
    const victoryHeroSrc = arenaData ? getHeroImage(arenaData.heroGender, arenaData.heroColorTheme, 0) : "";
    return (
      <VictoryScreen
        enemyName={enemyName}
        onContinue={() => handleClaimReward("boss_defeat")}
        isPending={isPending}
        heroImgSrc={victoryHeroSrc}
        heroName={arenaData?.heroName ?? ""}
      />
    );
  }

  // ── END ────────────────────────────────────────────────────────────────────
  if (phase === "end") {
    return (
      <EndScreen
        answered={answered}
        total={questions.length}
        bossHp={bossHp}
        energy={energy}
        onClaim={() => handleClaimReward("arena_completion")}
        onHome={() => router.push("/child")}
        isPending={isPending}
      />
    );
  }

  // ── BATTLE / CHALLENGE / SHOOTING / FEEDBACK / MEGAHIT ────────────────────
  if (isMobilePortrait) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "linear-gradient(160deg, #1e0a3c 0%, #0f0a2a 100%)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
          padding: 32,
        }}
      >
        <div style={{ fontSize: 72, lineHeight: 1, animation: "portrait-spin 2s ease-in-out infinite" }}>📱</div>
        <style>{`
          @keyframes portrait-spin {
            0%,100% { transform: rotate(0deg);   }
            40%     { transform: rotate(90deg);  }
            60%     { transform: rotate(90deg);  }
          }
        `}</style>
        <p style={{
          color: "#c4b5fd", fontSize: 22, fontWeight: 900,
          textAlign: "center", lineHeight: 1.5, direction: "rtl",
        }}>
          סובבו את הטלפון לרוחב<br />כדי לשחק! 🎮
        </p>
        <p style={{ color: "rgba(167,139,250,0.5)", fontSize: 14, textAlign: "center", direction: "rtl" }}>
          המשחק מיועד למצב אופקי
        </p>
      </div>
    );
  }

  // Responsive enemy size: 62% of the measured arena height, capped at each variant's designed max.
  // Uses arenaH state (updated once arena mounts). Minimum 150px so tiny screens still show something.
  const variantMaxSize = getEnemyMeta(enemyVariant).size;
  const dynEnemySize = Math.max(150, Math.min(variantMaxSize, Math.round(arenaH * 0.72)));

  return (
    <main
      className="h-screen flex flex-col relative overflow-hidden"
      style={{ background: "linear-gradient(180deg, #2e1065 0%, #1e1b4b 50%, #0c1a4a 100%)" }}
      dir="rtl"
    >
      {/* All arena animation keyframes and classes */}
      <style>{`
        /* ── Enemy sudden appearance ── */
        @keyframes enemy-appear {
          0%   { transform: scale(0.05); opacity: 0; filter: brightness(6) saturate(0); }
          45%  { transform: scale(1.18); opacity: 1; filter: brightness(2.5); }
          70%  { transform: scale(0.92); filter: brightness(1.4); }
          100% { transform: scale(1);   filter: brightness(1); }
        }
        .enemy-appear-anim { animation: enemy-appear 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards; }

        /* ── Enemy dissolve (white fade-out) ── */
        @keyframes enemy-dissolve {
          0%   { opacity: 1; filter: brightness(1) saturate(1) blur(0px); }
          25%  { opacity: 0.92; filter: brightness(5) saturate(0.1) blur(0.5px); }
          55%  { opacity: 0.6;  filter: brightness(10) saturate(0) blur(3px); }
          80%  { opacity: 0.2;  filter: brightness(14) saturate(0) blur(7px); }
          100% { opacity: 0;    filter: brightness(18) saturate(0) blur(12px); }
        }
        .enemy-dissolve-anim { animation: enemy-dissolve 0.95s ease-out forwards; }

        /* ── Roaming minion wing flap ── */
        @keyframes minion-flap {
          0%   { transform: rotate(-18deg) scaleY(0.85); }
          100% { transform: rotate(22deg)  scaleY(1.05); }
        }
        /* ── Hero motion ── */
        .hero-anim-idle   { transform: translateY(0px); transition: transform 50ms ease-out; }
        /* Staging entry walk — plays while hero auto-walks to battle position */
        .hero-staging-walk { animation: hero-running-bob 0.24s ease-in-out infinite; }
        /* Subtle idle bob/sway when standing still — never overrides dash/recoil */
        .hero-idle-bob    { animation: hero-idle-bob 2.6s ease-in-out infinite; }
        /* Battle-ready stance during challenge/shooting/feedback — steady charge pulse */
        .hero-battle-ready { animation: hero-battle-ready-pulse 0.7s ease-in-out infinite alternate; }
        @keyframes hero-battle-ready-pulse {
          0%   { transform: translateY(-4px) scale(1.04); }
          100% { transform: translateY(0px)  scale(1.00); }
        }
        @keyframes hero-idle-bob {
          0%,100% { transform: translateY(0px)   rotate(0deg);   }
          25%     { transform: translateY(-3px)  rotate(-0.6deg); }
          50%     { transform: translateY(0px)   rotate(0deg);   }
          75%     { transform: translateY(-2px)  rotate(0.6deg);  }
        }
        .hero-running-bob { animation: hero-running-bob 0.24s ease-in-out infinite; }
        @keyframes hero-running-bob {
          0%,100% { transform: translateY(0px);  }
          50%     { transform: translateY(-6px); }
        }
        .hero-anim-dash   { animation: hero-dash-up 130ms ease-out forwards; }
        .hero-anim-recoil { animation: hero-recoil 170ms cubic-bezier(0.34,1.56,0.64,1) forwards; }
        @keyframes hero-dash-up {
          0%   { transform: translateY(0px);   }
          100% { transform: translateY(-32px); }
        }
        @keyframes hero-recoil {
          0%   { transform: translateY(-32px); }
          55%  { transform: translateY(6px);   }
          100% { transform: translateY(0px);   }
        }

        /* ── Aim line ── */
        @keyframes aim-line-pulse {
          0%   { opacity: 0; transform: scaleY(0.1); }
          40%  { opacity: 1; transform: scaleY(1);   }
          100% { opacity: 0; transform: scaleY(1);   }
        }

        /* ── Projectile ── */
        @keyframes proj-up-hit {
          0%   { transform: translate(0px, 0px);    opacity: 1; }
          90%  { transform: translate(${Math.round(projectileDriftPx * 0.9)}px, ${-(projectileTravelPx - 15)}px); opacity: 1; }
          100% { transform: translate(${projectileDriftPx}px, ${-projectileTravelPx}px); opacity: 0; }
        }
        @keyframes proj-up-miss {
          0%   { transform: translate(0px, 0px);    opacity: 1; }
          60%  { transform: translate(${Math.round(projectileDriftPx * 0.5)}px, ${-Math.round(projectileTravelPx * 0.43)}px); opacity: 1; }
          100% { transform: translate(${Math.round(projectileDriftPx * 0.5) + 34}px, ${-Math.round(projectileTravelPx * 0.36)}px); opacity: 0; }
        }

        /* ── Impact burst ── */
        @keyframes crystal-burst-particle {
          0%   { transform: rotate(var(--angle)) translateY(0px)   scale(1);   opacity: 1; }
          100% { transform: rotate(var(--angle)) translateY(-30px) scale(0.2); opacity: 0; }
        }

        /* ── Shield block ── */
        @keyframes shield-pop {
          0%   { transform: scale(0.2); opacity: 0; }
          35%  { transform: scale(1.4); opacity: 1; }
          65%  { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.2); opacity: 0; }
        }

        /* ── Enemy shake — centering now done via left:calc(50%-105px) on outer div, no translateX base needed ── */
        .enemy-hit-shake { animation: enemy-hit-shake 260ms ease-out; }
        @keyframes enemy-hit-shake {
          0%,100% { transform: translateX(0);     }
          20%     { transform: translateX(-7px);  }
          40%     { transform: translateX(7px);   }
          60%     { transform: translateX(-4px);  }
          80%     { transform: translateX(3px);   }
        }

        /* ── Arena shake ── */
        .arena-strong-shake { animation: arena-strong-shake 230ms ease-out; }
        @keyframes arena-strong-shake {
          0%,100% { transform: translate(0,    0);    }
          15%     { transform: translate(-5px, -2px); }
          30%     { transform: translate(5px,   2px); }
          50%     { transform: translate(-4px,  1px); }
          65%     { transform: translate(4px,  -1px); }
          80%     { transform: translate(-2px,  2px); }
        }

        /* ── Enemy defeat sequence ── */
        .enemy-defeat-seq {
          animation: enemy-defeat-seq 1.6s ease-out forwards;
          transform-origin: center bottom;
        }
        @keyframes enemy-defeat-seq {
          0%   { transform: translateX(-50%) scale(1);    filter: brightness(1);                                  opacity: 1; }
          6%   { transform: translateX(-50%) scale(1.12); filter: brightness(5) saturate(0.3);                   opacity: 1; }
          13%  { transform: translateX(calc(-50% - 9px)) scale(0.95); filter: brightness(2.5);                  opacity: 1; }
          20%  { transform: translateX(calc(-50% + 9px)) scale(1.05); filter: brightness(3);                    opacity: 1; }
          27%  { transform: translateX(calc(-50% - 7px)); filter: brightness(2);                                opacity: 1; }
          34%  { transform: translateX(calc(-50% + 6px)) scale(1.08); filter: brightness(3.5) hue-rotate(40deg); opacity: 1; }
          48%  { transform: translateX(-50%) scale(1.2);  filter: brightness(6) hue-rotate(90deg) saturate(2);  opacity: 0.9; }
          65%  { transform: translateX(-50%) scale(1.35); filter: brightness(8) blur(3px);                      opacity: 0.55; }
          82%  { transform: translateX(-50%) scale(0.7);  filter: brightness(10) blur(8px);                     opacity: 0.2; }
          100% { transform: translateX(-50%) scale(0);    filter: brightness(12) blur(14px);                    opacity: 0; }
        }

        /* ── Defeat crystal shards ── */
        .defeat-shard {
          position: absolute;
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          box-shadow: 0 0 10px var(--shard-color), 0 0 4px white;
          background: var(--shard-color);
          animation: defeat-shard-explode 0.9s cubic-bezier(0.15, 0, 0.3, 1) forwards;
          opacity: 0;
        }
        @keyframes defeat-shard-explode {
          0%   { transform: rotate(var(--angle)) translateY(0px)                      scale(1.5); opacity: 1; }
          55%  { transform: rotate(var(--angle)) translateY(calc(-1 * var(--dist)))   scale(0.9); opacity: 1; }
          100% { transform: rotate(var(--angle)) translateY(calc(-1.6 * var(--dist))) scale(0);   opacity: 0; }
        }

        /* ── Radial glow burst at enemy position ── */
        .enemy-burst-glow {
          position: absolute;
          border-radius: 50%;
          width: 220px; height: 220px;
          background: radial-gradient(circle,
            rgba(255,255,255,0.65) 0%,
            rgba(192,132,252,0.45) 28%,
            rgba(34,211,238,0.25) 55%,
            transparent 72%
          );
          animation: enemy-burst-glow 0.65s ease-out forwards;
          animation-delay: 0.32s;
          opacity: 0;
          pointer-events: none;
        }
        @keyframes enemy-burst-glow {
          0%   { transform: translate(-50%, -50%) scale(0.1); opacity: 1; }
          45%  { transform: translate(-50%, -50%) scale(1.3); opacity: 0.85; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }

        /* ── HUD pulse (low HP, mega ready) ── */
        @keyframes hud-pulse {
          0%,100% { opacity: 1; }
          50%     { opacity: 0.55; }
        }

        /* ── Arena victory shake (one-shot) ── */
        .arena-victory-shake {
          animation: arena-victory-shake 0.45s ease-out;
        }
        @keyframes arena-victory-shake {
          0%,100% { transform: translate(0,    0); }
          10%     { transform: translate(-6px, -3px); }
          22%     { transform: translate(6px,   3px); }
          35%     { transform: translate(-5px,  2px); }
          50%     { transform: translate(5px,  -2px); }
          65%     { transform: translate(-3px,  1px); }
          80%     { transform: translate(2px,  -1px); }
        }

        /* ── Hero victory jump ── */
        .hero-victory-jump {
          animation: hero-victory-jump 0.78s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          animation-delay: 0.22s;
        }
        @keyframes hero-victory-jump {
          0%   { transform: translateY(0px)   scale(1)    rotate(0deg);  }
          38%  { transform: translateY(-58px) scale(1.1)  rotate(-5deg); }
          62%  { transform: translateY(-38px) scale(1.06) rotate(4deg);  }
          82%  { transform: translateY(10px)  scale(0.96) rotate(-1deg); }
          100% { transform: translateY(0px)   scale(1)    rotate(0deg);  }
        }

        /* ── Hero victory glow pulse (loops) ── */
        .hero-victory-glow {
          animation: hero-victory-glow-pulse 0.85s ease-in-out infinite alternate;
          animation-delay: 0.75s;
        }
        @keyframes hero-victory-glow-pulse {
          0%   { filter: drop-shadow(0 0 18px rgba(192,132,252,0.9)) drop-shadow(0 0 6px rgba(34,211,238,0.5));  }
          50%  { filter: drop-shadow(0 0 30px rgba(251,191,36,0.95)) drop-shadow(0 0 14px rgba(244,114,182,0.7)); }
          100% { filter: drop-shadow(0 0 38px rgba(34,211,238,1))    drop-shadow(0 0 18px white);                 }
        }

        /* ── Victory title ── */
        .victory-title-wrap {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .victory-title-text {
          font-size: clamp(64px, 18vw, 96px);
          font-weight: 900;
          letter-spacing: -1px;
          background: linear-gradient(135deg, #fbbf24 0%, #f472b6 30%, #c084fc 55%, #22d3ee 80%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: victory-pop-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          filter: drop-shadow(0 0 24px rgba(192,132,252,0.9)) drop-shadow(0 2px 6px rgba(0,0,0,0.6));
          text-align: center;
          white-space: nowrap;
        }
        @keyframes victory-pop-in {
          0%   { transform: scale(0.2) rotate(-6deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(2deg); opacity: 1; }
          80%  { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg);    opacity: 1; }
        }

        /* ── Victory-anim: full-screen flash burst on shatter ── */
        .victory-flash-burst {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.85) 0%, rgba(251,191,36,0.55) 40%, transparent 70%);
          animation: victory-flash 0.55s ease-out forwards;
          pointer-events: none;
        }
        @keyframes victory-flash {
          0%   { opacity: 1; }
          35%  { opacity: 0.6; }
          100% { opacity: 0; }
        }

        /* ── Victory-anim: confetti stars raining down ── */
        .victory-confetti {
          position: absolute;
          top: -40px;
          animation: victory-confetti-fall 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          opacity: 0;
        }
        @keyframes victory-confetti-fall {
          0%   { top: -40px; opacity: 0; transform: rotate(0deg) scale(0.6); }
          15%  { opacity: 1; }
          80%  { opacity: 1; transform: rotate(180deg) scale(1.1); }
          100% { top: 110%; opacity: 0; transform: rotate(240deg) scale(0.8); }
        }

        /* ── Victory screen: trophy bouncy pop-in ── */
        .victory-trophy-pop {
          animation: victory-trophy-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        @keyframes victory-trophy-pop {
          0%   { transform: scale(0.1) rotate(-10deg); opacity: 0; }
          60%  { transform: scale(1.2) rotate(5deg);  opacity: 1; }
          80%  { transform: scale(0.92) rotate(-2deg); }
          100% { transform: scale(1) rotate(0deg);    opacity: 1; }
        }

        /* ── Victory screen: hero gentle float ── */
        .hero-victory-float {
          animation: hero-victory-float 2.8s ease-in-out infinite;
        }
        @keyframes hero-victory-float {
          0%,100% { transform: translateY(0px);   }
          50%     { transform: translateY(-14px);  }
        }

        /* Crystal shimmer shards that fly out from the title */
        .victory-shard {
          position: absolute;
          width: 10px;
          height: 10px;
          background: var(--shard-color);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          box-shadow: 0 0 8px var(--shard-color), 0 0 3px white;
          animation: victory-shard-fly 0.55s cubic-bezier(0.2, 0, 0.4, 1) forwards;
          opacity: 0;
        }
        @keyframes victory-shard-fly {
          0%   { transform: rotate(var(--shard-angle)) translateY(0px)                    scale(0.4); opacity: 1; }
          70%  { transform: rotate(var(--shard-angle)) translateY(calc(-1 * var(--shard-dist))) scale(1.2); opacity: 1; }
          100% { transform: rotate(var(--shard-angle)) translateY(calc(-1.3 * var(--shard-dist))) scale(0.2); opacity: 0; }
        }
      `}</style>

      {/* Mega blast flash */}
      {megaBlasting && <div className="screen-flash" />}

      {/* ── Minimal header ── */}
      <header className="px-4 pt-3 pb-2 flex items-center justify-between relative z-10 shrink-0">
        <button
          onClick={() => router.push("/child")}
          className="text-violet-300 text-xs hover:text-white transition-colors px-2 py-1 rounded-lg border border-violet-500/30 bg-violet-900/40"
        >
          ← יציאה
        </button>
        <span className="text-violet-200 text-xs font-bold tracking-wide">
          ⚔️ קרב קריסטלים · {current + 1}/{questions.length}
        </span>
        <button
          onClick={e => { e.stopPropagation(); setMuted(m => !m); }}
          aria-label={muted ? "הפעל צליל" : "השתק"}
          style={{
            fontSize: 22,
            lineHeight: 1,
            padding: "6px 10px",
            borderRadius: 12,
            border: muted ? "2px solid rgba(248,113,113,0.55)" : "2px solid rgba(192,132,252,0.55)",
            background: muted ? "rgba(127,29,29,0.55)" : "rgba(109,40,217,0.45)",
            color: muted ? "#fca5a5" : "#e9d5ff",
            boxShadow: muted ? "0 0 8px rgba(248,113,113,0.3)" : "0 0 8px rgba(192,132,252,0.3)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            minWidth: 48,
            textAlign: "center",
          }}
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </header>

      {/* ── Battle HUD ── */}
      {arenaData && (
        <BattleHUD
          heroName={arenaData.heroName}
          heroGender={arenaData.heroGender}
          heroColorTheme={arenaData.heroColorTheme}
          energy={energy}
          energyMax={ENERGY_MAX}
          bossHp={bossHp}
          enemyName={enemyName}
          answered={answered}
          total={questions.length}
          correctCount={correctCount}
          megaReady={energy >= ENERGY_MAX}
        />
      )}

      {/* ── Top-down arcade arena map ── */}
      <section
        ref={arenaRef}
        className={`flex-1 relative mx-3 mb-3 rounded-3xl${arenaShake ? " arena-strong-shake" : ""}`}
        style={{
          backgroundImage: "url('/arena_blue.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          border:    "3px solid rgba(120,60,220,0.70)",
          boxShadow: "0 0 50px rgba(80,30,200,0.35), inset 0 0 60px rgba(40,10,120,0.22)",
          overflow: "hidden",
        }}
        onClick={() => {
          if (phase === "battle" && !isPending && !bossDefeated) handleFireCrystal();
        }}
      >
        {/* Arena map is the background image — no CSS decorations */}

        {/* ── Roaming minions: enter from outside, chase/circle/dodge/jump/fly ── */}
        {minions.map(m => {
          const now = performance.now();
          const isHit = now < m.hitUntil;
          const age  = (now - m.born) / 1000;
          const hopY = m.kind === "jumper" ? -Math.abs(Math.sin(age * 4.2 + m.bobPhase)) * 18 : 0;
          const flyY = m.kind === "flyer"  ? Math.sin(age * 1.6 + m.bobPhase) * 10 : 0;
          const rot  = m.kind === "flyer"  ? Math.sin(age * 2.0 + m.bobPhase) * 14
                     : m.kind === "circler" ? (age * 90) % 360
                     : Math.sin(age * 3 + m.bobPhase) * 6;
          const shadow = m.kind === "jumper"
            ? `0 ${Math.max(2, 10 + hopY * 0.6)}px ${Math.max(4, 18 + hopY * 0.4)}px rgba(0,0,0,0.5)`
            : `0 6px 14px rgba(0,0,0,0.45)`;
          return (
            <div
              key={m.id}
              style={{
                position: "absolute",
                left: `${m.x}%`,
                top:  `${m.y}%`,
                transform: `translate(-50%, -50%) translateY(${hopY + flyY}px) rotate(${rot}deg) ${m.facingLeft ? "scaleX(-1)" : ""}`,
                width:  m.size,
                height: m.size,
                pointerEvents: "none",
                zIndex: 4,
                transition: isHit ? "filter 0.1s ease" : "none",
                filter: isHit
                  ? "brightness(2.2) saturate(0.2) drop-shadow(0 0 12px white)"
                  : `drop-shadow(0 0 10px ${m.color})`,
              }}
            >
              <div
                style={{
                  width: "100%", height: "100%",
                  borderRadius: m.kind === "flyer" ? "50% 50% 40% 40%" : "30% 70% 30% 70%",
                  background: `radial-gradient(circle at 35% 30%, white 0%, ${m.color} 35%, rgba(0,0,0,0.55) 100%)`,
                  boxShadow: shadow + `, inset 0 0 12px rgba(255,255,255,0.4)`,
                  position: "relative",
                  border: "2px solid rgba(255,255,255,0.35)",
                }}
              >
                {/* Eyes */}
                <div style={{
                  position: "absolute", top: "32%", left: "26%",
                  width: 7, height: 7, borderRadius: "50%",
                  background: "white", boxShadow: "0 0 4px rgba(0,0,0,0.7)",
                }} />
                <div style={{
                  position: "absolute", top: "32%", right: "26%",
                  width: 7, height: 7, borderRadius: "50%",
                  background: "white", boxShadow: "0 0 4px rgba(0,0,0,0.7)",
                }} />
                <div style={{
                  position: "absolute", top: "34%", left: "30%",
                  width: 3, height: 3, borderRadius: "50%", background: "#1e1b4b",
                }} />
                <div style={{
                  position: "absolute", top: "34%", right: "30%",
                  width: 3, height: 3, borderRadius: "50%", background: "#1e1b4b",
                }} />
                {/* Wings for flyer */}
                {m.kind === "flyer" && (
                  <>
                    <div style={{
                      position: "absolute", top: "10%", left: "-40%",
                      width: "55%", height: "70%",
                      background: `linear-gradient(135deg, ${m.color}cc, transparent)`,
                      borderRadius: "60% 30% 60% 30%",
                      animation: "minion-flap 0.22s ease-in-out infinite alternate",
                      transformOrigin: "right center",
                    }} />
                    <div style={{
                      position: "absolute", top: "10%", right: "-40%",
                      width: "55%", height: "70%",
                      background: `linear-gradient(225deg, ${m.color}cc, transparent)`,
                      borderRadius: "30% 60% 30% 60%",
                      animation: "minion-flap 0.22s ease-in-out infinite alternate-reverse",
                      transformOrigin: "left center",
                    }} />
                  </>
                )}
              </div>
              {/* Drop shadow on floor for jumper to sell the height */}
              {m.kind === "jumper" && (
                <div style={{
                  position: "absolute",
                  bottom: hopY - 6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: m.size * (1 + hopY * 0.01),
                  height: 6,
                  background: "radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)",
                  borderRadius: "50%",
                }} />
              )}
            </div>
          );
        })}

        {/* ── Active enemy archetype — moves with AI, faces hero, contact opens challenge ── */}
        {/* outer ref div: position is controlled directly via .style.transform by the AI raf loop */}
        <div
          ref={enemyRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transform: "translate(0px, 0px) translate(-50%, -50%)",
            willChange: "transform",
            zIndex: 5,
            pointerEvents: "none",
            opacity: enemyVisible ? 1 : 0,
          }}
        >
          {/* Appear/dissolve wrapper — remounts (via key) to replay appear animation each new enemy */}
          <div
            key={enemyVisible ? "shown" : "hidden"}
            style={{
              animation: enemyDissolving
                ? "enemy-dissolve 0.95s ease-out forwards"
                : enemyVisible
                ? "enemy-appear 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards"
                : "none",
            }}
          >
          <div
            className={enemyShake && !enemyDissolving ? "enemy-hit-shake" : ""}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              filter: enemyDissolving
                ? undefined
                : enemyHit === "flash"
                ? "brightness(2.6) saturate(0.2) drop-shadow(0 0 14px white)"
                : enemyHit === "tint"
                ? "brightness(1.35) saturate(2) hue-rotate(200deg)"
                : "none",
              transition: enemyDissolving ? "none" : "filter 0.15s ease",
            }}
          >
            {/* HP bar above the enemy (never rotates) */}
            <div style={{
              width: Math.min(240, Math.round(120 + (dynEnemySize - 120) * (bossHp / 100)) + 30),
              transition: "width 0.35s ease-out",
              background: "rgba(0,0,0,0.45)",
              borderRadius: 8,
              padding: "3px 7px",
              border: `1px solid ${bossHp <= 30 ? "rgba(192,132,252,0.55)" : "rgba(248,113,113,0.35)"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ color: "rgba(251,113,133,0.85)", fontSize: 8, fontWeight: 700 }}>
                  {getEnemyMeta(enemyVariant).nameHe}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 800,
                  color: bossHp <= 30 ? "#c084fc" : "rgba(251,113,133,0.95)",
                }}>
                  {bossHp}%
                </span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${bossHp}%`, borderRadius: 4,
                  background: bossHp > 60
                    ? "linear-gradient(90deg,#ef4444,#f87171)"
                    : bossHp > 30
                    ? "linear-gradient(90deg,#a855f7,#c084fc)"
                    : "linear-gradient(90deg,#7c3aed,#ef4444)",
                  transition: "width 0.4s ease-out",
                }} />
              </div>
            </div>

            {/* Inline-SVG enemy — rotates to face hero, animates per archetype */}
            <CrystalEnemy
              variant={enemyVariant}
              size={dynEnemySize}
              hp={bossHp}
              damaged={enemyHit === "flash"}
              showName={false}
              enemyX={enemyStateRef.current.x}
              heroX={heroPosRef.current.x}
              animPhase={enemyStateRef.current.animPhase}
              locked={phase === "battle" || phase === "challenge"}
            />
          </div>
          </div>
        </div>

        {/* ── Aim line (brief flash before shot, correct only) ── */}
        {showAimLine && (
          <div style={{
            position: "absolute",
            top: "28%", bottom: "22%",
            left: "50%", width: 2,
            transform: "translateX(-50%)",
            transformOrigin: "bottom center",
            background: "linear-gradient(to bottom, rgba(6,182,212,0) 0%, rgba(6,182,212,0.75) 30%, rgba(167,139,250,0.75) 70%, rgba(167,139,250,0) 100%)",
            animation: "aim-line-pulse 80ms ease-in-out forwards",
            zIndex: 6, pointerEvents: "none",
          }} />
        )}

        {/* ── Diamond projectile — only on a correct hit. ── */}
        {showProjectile && projectileHit && (
          <div style={{
            position: "absolute",
            bottom: `${projectileOriginY}%`, left: `${projectileOriginX}%`,
            transform: "translate(-50%, 50%)",
            zIndex: 30, pointerEvents: "none",
          }}>
            <div style={{
              animation: `proj-up-hit 380ms cubic-bezier(0.1,0,0.4,1) forwards`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {/* Diamond — gold + larger on a 3+ streak, electric cyan/blue-white otherwise. */}
              <div style={{
                width:  strongShot ? 52 : 40,
                height: strongShot ? 52 : 40,
                background: strongShot
                  ? "linear-gradient(160deg, #fff7c2 0%, #fde047 35%, #f59e0b 70%, #b45309 100%)"
                  : "linear-gradient(160deg, #ffffff 0%, #bfefff 25%, #22d3ee 60%, #0891b2 100%)",
                clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
                boxShadow: strongShot
                  ? "0 0 28px rgba(253,224,71,1), 0 0 56px rgba(245,158,11,0.9), 0 0 12px white"
                  : "0 0 20px rgba(34,211,238,1), 0 0 40px rgba(6,182,212,0.9), 0 0 60px rgba(34,211,238,0.5), 0 0 10px white",
                filter: "brightness(1.3)",
              }} />
            </div>
          </div>
        )}

        {/* ── Mega blast ── */}
        {phase === "megahit" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="text-8xl mega-crystal-blast">💎</div>
          </div>
        )}

        {/* ── Impact burst particles (correct hit only) ── */}
        {impactBurst && (["#22d3ee","#a78bfa","#f472b6","#fbbf24","#22d3ee","#a78bfa","#c084fc","white"] as const).map((color, i) => (
          <div key={i} style={{
            position: "absolute",
            top:  enemyAnchor ? enemyAnchor.top  - 4 : "30%",
            left: enemyAnchor ? enemyAnchor.left - 4 : "50%",
            width: 8, height: 8,
            background: color,
            clipPath: "polygon(50% 0%,100% 50%,50% 100%,0% 50%)",
            animation: "crystal-burst-particle 420ms ease-out forwards",
            "--angle": `${i * 45}deg`,
            zIndex: 25, pointerEvents: "none",
          } as React.CSSProperties} />
        ))}

        {/* ── Shield block effect (wrong answer) ── */}
        {shieldBlock && (
          <div style={{
            position: "absolute",
            top:  enemyAnchor ? enemyAnchor.top  - 22 : "26%",
            left: enemyAnchor ? enemyAnchor.left - 22 : "50%",
            zIndex: 25, pointerEvents: "none",
            fontSize: 44,
            filter: "drop-shadow(0 0 16px rgba(100,200,255,0.85))",
            animation: "shield-pop 380ms ease-out forwards",
          }}>
            🛡️
          </div>
        )}

        {/* ── Targeting beam: Miti center → locked enemy center ── */}
        {(phase === "battle" || phase === "challenge") && arenaData && (() => {
          const aw = arenaRef.current?.offsetWidth  ?? 700;
          const ah = arenaRef.current?.offsetHeight ?? 400;
          // Hero attack hand: offset right (+52) when facing right, left (-52) when facing left
          const facingRight = enemyStateRef.current.x >= heroPos.x;
          const handOffsetX = facingRight ? 52 : -52;
          const hx = (heroPos.x / 100) * aw + handOffsetX;
          const hy = (heroPos.y / 100) * ah + 68; // chest/shoulder height
          // Enemy center: AI drives x/y in arena % coords
          const ex = (enemyStateRef.current.x / 100) * aw;
          const ey = (enemyStateRef.current.y / 100) * ah;
          const gradId = "aim-beam-grad";
          return (
            <svg
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 6, overflow: "visible" }}
            >
              <defs>
                <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={hx} y1={hy} x2={ex} y2={ey}>
                  <stop offset="0%"   stopColor="#22d3ee" stopOpacity="0.55" />
                  <stop offset="40%"  stopColor="#67e8f9" stopOpacity="1.00" />
                  <stop offset="100%" stopColor="#f0f9ff" stopOpacity="1.00" />
                </linearGradient>
                <filter id="beam-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              {/* Outer soft glow halo */}
              <line x1={hx} y1={hy} x2={ex} y2={ey} stroke="rgba(34,211,238,0.28)" strokeWidth="32" strokeLinecap="round" />
              {/* Mid electric-cyan glow */}
              <line x1={hx} y1={hy} x2={ex} y2={ey} stroke="rgba(103,232,249,0.65)" strokeWidth="14" strokeLinecap="round" />
              {/* Main beam — solid, bright */}
              <line x1={hx} y1={hy} x2={ex} y2={ey} stroke={`url(#${gradId})`} strokeWidth="7" strokeLinecap="round" />
              {/* Bright white-blue core */}
              <line x1={hx} y1={hy} x2={ex} y2={ey} stroke="rgba(240,249,255,0.95)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          );
        })()}

        {/* ── Hero (bottom of arena) — position driven by heroPos state for movement ── */}
        {arenaData && (
          <div ref={heroRef} style={{
            position: "absolute",
            top:  `${heroPos.y}%`,
            left: `calc(${heroPos.x}% - 61px)`,
          }}>
            <div
              className={
                heroAnim !== "idle"
                  ? `hero-anim-${heroAnim}`
                  : isStagingActive
                  ? "hero-staging-walk"
                  : (isHeroMoving && phase === "battle")
                  ? "hero-running-bob"
                  : (phase === "challenge" || phase === "shooting" || phase === "feedback")
                  ? "hero-battle-ready"
                  : "hero-idle-bob"
              }
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}
            >
              {/* Hero sprite — selected hero portrait, direction-aware via 3D rotateY (same technique as CrystalEnemy).
                  rotateY(35deg) = face right (toward enemy on right); rotateY(-35deg) = face left. Never faces screen. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getHeroImage(arenaData.heroGender ?? "M", arenaData.heroColorTheme ?? "default", 0)}
                alt={arenaData.heroName}
                style={{
                  height: 190, width: "auto", display: "block",
                  transform: (isAttacking || phase === "challenge" || phase === "shooting" || phase === "feedback")
                    ? heroFacingLeft
                      ? "perspective(600px) scale(1.28) translateY(-12px) rotateY(-40deg)"
                      : "perspective(600px) scale(1.28) translateY(-12px) rotateY(40deg)"
                    : (isStagingActive || (isHeroMoving && phase === "battle"))
                    ? heroFacingLeft
                      ? "perspective(600px) scale(1.35) rotateY(-35deg)"
                      : "perspective(600px) scale(1.35) rotateY(35deg)"
                    : heroFacingLeft
                    ? "perspective(600px) rotateY(-35deg)"
                    : "perspective(600px) rotateY(35deg)",
                  transformOrigin: (isStagingActive || (isHeroMoving && phase === "battle"))
                    ? "bottom center"
                    : "center center",
                  filter: (phase === "challenge" || phase === "shooting" || phase === "feedback")
                    ? isAttacking
                      ? "drop-shadow(0 0 28px rgba(34,211,238,1)) drop-shadow(0 0 14px white) brightness(1.5)"
                      : phase === "feedback" && feedback?.isCorrect
                        ? "drop-shadow(0 0 22px rgba(34,211,238,0.95)) drop-shadow(0 0 10px white) brightness(1.35)"
                        : "drop-shadow(0 0 18px rgba(34,211,238,0.85)) drop-shadow(0 0 8px rgba(167,139,250,0.7)) brightness(1.2)"
                    : "drop-shadow(0 0 12px rgba(139,92,246,0.7))",
                  transition: isAttacking ? "transform 0.1s ease-out, filter 0.1s ease-out" : "transform 0.15s ease-out, filter 0.3s ease",
                  imageRendering: "auto",
                }}
              />
              <span style={{ color: "#c4b5fd", fontSize: 11, fontWeight: 800 }}>
                {arenaData.heroName}
              </span>
            </div>
          </div>
        )}

{/* D-pad moved to fixed overlay below */}

        {/* ── Mega button — beside hero feet (right side, or left if near right edge) ── */}
        {(phase === "battle" || phase === "megahit") && (() => {
          const megaReady = energy >= ENERGY_MAX && phase === "battle" && !isPending;
          const buttonSize = 52;
          const gap        = 10;
          const inset      = 8;
          const arenaW     = arenaRef.current?.offsetWidth  ?? 400;
          const arenaH     = arenaRef.current?.offsetHeight ?? 400;
          const heroCenterPx  = arenaW * heroPos.x / 100;
          const heroRightEdge = heroCenterPx + 61;
          const heroLeftEdge  = heroCenterPx - 61;
          const heroPx        = arenaH * heroPos.y / 100;
          const rightFits     = heroRightEdge + gap + buttonSize <= arenaW - inset;
          const rawLeft  = rightFits ? heroRightEdge + gap : heroLeftEdge - gap - buttonSize;
          const finalLeft = rightFits
            ? Math.min(rawLeft, arenaW - inset - buttonSize)
            : Math.max(rawLeft, inset);
          const finalTop = Math.min(heroPx + 145, arenaH - inset - buttonSize);
          return (
            <button
              onClick={e => { e.stopPropagation(); handleMegaHit(); }}
              disabled={!megaReady}
              style={{
                position: "absolute",
                left: finalLeft,
                top:  finalTop,
                width: buttonSize, height: buttonSize,
                borderRadius: "50%",
                fontSize: 11,
                fontWeight: 900,
                lineHeight: 1.15,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                opacity: megaReady ? 1 : 0.5,
                cursor: megaReady ? "pointer" : "default",
                zIndex: 20,
                userSelect: "none",
                pointerEvents: "auto",
              }}
              className={megaReady ? "btn-3d btn-3d-gold btn-arena-pulse" : "btn-3d btn-3d-violet"}
            >
              {megaReady ? (
                <>
                  <span style={{ fontSize: 18 }}>⚡</span>
                  <span style={{ fontSize: 10 }}>מגה!</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: 15 }}>🔒</span>
                  <span style={{ fontSize: 9 }}>מגה</span>
                </>
              )}
            </button>
          );
        })()}
        {/* arenaThreat hidden from bottom UI — preserved in state only */}
        {false && arenaData?.arenaThreat && (
          <p>{arenaData?.arenaThreat}</p>
        )}
        {/* ירי button hidden — arena tap-to-shoot replaces it; handleFireCrystal logic unchanged */}

      </section>

      {/* ── Challenge panel — BELOW arena, never covers battle ── */}
      {phase === "challenge" && q && (
        <div
          dir="rtl"
          style={{
            flexShrink: 0,
            padding: "6px 10px 8px",
            background: "linear-gradient(160deg, #1e0a3c 0%, #0f0a2a 100%)",
            borderTop: "2px solid rgba(139,92,246,0.55)",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.55)",
          }}
        >
          <style>{`
            @keyframes challenge-pop {
              0%   { transform: scale(0.92) translateY(10px); opacity: 0; }
              60%  { transform: scale(1.03) translateY(-2px); opacity: 1; }
              100% { transform: scale(1)   translateY(0px);  opacity: 1; }
            }
            .challenge-pop { animation: challenge-pop 0.30s cubic-bezier(0.34,1.56,0.64,1) both; }
          `}</style>
          <div className="challenge-pop" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Header + Question */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(255,255,255,0.05)", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.09)", padding: "6px 10px",
            }}>
              <span style={{ fontSize: 16 }}>💎</span>
              <p style={{ color: "white", fontSize: 14, fontWeight: 700, lineHeight: 1.35, margin: 0, flex: 1, textAlign: "center" }}>
                {q.text_he}
              </p>
              <span style={{ fontSize: 16 }}>💎</span>
            </div>
            {/* Answer grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {ANSWER_KEYS.map(key => (
                <AnswerButton
                  key={key}
                  answerKey={key}
                  text={optionText(q, key)}
                  onClick={() => handleAnswer(key)}
                  disabled={isPending}
                  state={
                    lastAnswer === key
                      ? (feedback?.isCorrect ? "correct" : "wrong")
                      : "idle"
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Feedback bar — BELOW arena, compact, never covers battle ── */}
      {phase === "feedback" && feedback && (
        <FeedbackOverlay result={feedback} energyBefore={feedbackEnergyBefore} />
      )}

      {/* ── D-pad — fixed overlay so it's never clipped by the arena's overflow:hidden ── */}
      {(phase === "battle" || phase === "challenge" || phase === "shooting" || phase === "feedback") && (
        <div style={{ position: "fixed", bottom: 24, left: 16, zIndex: 50, userSelect: "none", touchAction: "none", width: 128, height: 128 }}>
          {([
            { dir: "up",    label: "▲", top:  0, left: 44 },
            { dir: "left",  label: "◀", top: 44, left:  0 },
            { dir: "right", label: "▶", top: 44, left: 88 },
            { dir: "down",  label: "▼", top: 88, left: 44 },
          ] as const).map(({ dir, label, top, left }) => (
            <div
              key={dir}
              style={{
                position: "absolute", top, left,
                width: 40, height: 40,
                background: "rgba(120,60,220,0.55)",
                border: "1.5px solid rgba(192,132,252,0.6)",
                borderRadius: 10,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, color: "rgba(255,255,255,0.9)",
                cursor: "pointer", touchAction: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
              }}
              onPointerDown={e => { e.preventDefault(); dpadRef.current.add(dir); }}
              onPointerUp={() => dpadRef.current.delete(dir)}
              onPointerLeave={() => dpadRef.current.delete(dir)}
              onPointerCancel={() => dpadRef.current.delete(dir)}
            >
              {label}
            </div>
          ))}
        </div>
      )}

    </main>
  );
}

export default function ArenaPage() {
  return (
    <Suspense>
      <ArenaPageContent />
    </Suspense>
  );
}

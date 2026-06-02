"use client";

import { useState, useEffect } from "react";
import { getHeroImage }        from "@/components/child/HeroDisplay";

export type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

interface Reward {
  type:        "skin" | "xp" | "crystal" | "hero" | "coins" | "stars";
  label:       string;
  rarity:      Rarity;
  icon:        string;
  heroGender?: "M" | "F";
  heroTheme?:  string;
}

interface Props {
  reward:    Reward;
  onCollect: () => void;
}

const RARITY_STYLES: Record<Rarity, {
  box:    string;
  glow:   string;
  badge:  string;
  label:  string;
  border: string;
  rays:   number;
  // CSS custom property values for box-rarity-pulse
  glowColor:    string;
  glowColorDim: string;
}> = {
  Common:    { box: "from-slate-500 to-slate-700",      glow: "shadow-slate-400/40",   badge: "bg-slate-600",   label: "text-slate-200",   border: "border-slate-400",  rays: 0,  glowColor: "rgba(148,163,184,0.55)",  glowColorDim: "rgba(148,163,184,0.18)" },
  Rare:      { box: "from-blue-500 to-blue-800",         glow: "shadow-blue-400/60",    badge: "bg-blue-600",    label: "text-blue-200",    border: "border-blue-400",   rays: 4,  glowColor: "rgba(96,165,250,0.70)",   glowColorDim: "rgba(96,165,250,0.25)"  },
  Epic:      { box: "from-violet-500 to-purple-900",     glow: "shadow-violet-400/70",  badge: "bg-violet-700",  label: "text-violet-200",  border: "border-violet-400", rays: 6,  glowColor: "rgba(167,139,250,0.80)",  glowColorDim: "rgba(167,139,250,0.28)" },
  Legendary: { box: "from-amber-400 via-orange-500 to-red-600", glow: "shadow-amber-400/90",   badge: "bg-amber-600",   label: "text-shimmer",     border: "border-amber-400",  rays: 10, glowColor: "rgba(251,191,36,0.90)",   glowColorDim: "rgba(245,158,11,0.32)"  },
};

const RARITY_LABELS: Record<Rarity, string> = {
  Common:    "רגיל",
  Rare:      "נדיר",
  Epic:      "אפי",
  Legendary: "אגדי ✦",
};

// Rarity-appropriate confetti counts
const CONFETTI_COUNT: Record<Rarity, number> = {
  Common:    0,
  Rare:      10,
  Epic:      20,
  Legendary: 30,
};

const TAPS_NEEDED = 3;

// ── Confetti ──────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = [
  "#f59e0b", "#fbbf24", "#a78bfa", "#60a5fa",
  "#34d399", "#f472b6", "#fb923c", "#ffffff",
];

function ConfettiPiece({ color, left, delay, duration, shape }: {
  color: string; left: number; delay: number; duration: number; shape: "square" | "ribbon";
}) {
  return (
    <div
      className={shape === "ribbon" ? "confetti-ribbon" : "confetti-piece"}
      style={{
        backgroundColor: color,
        left:            `${left}%`,
        top:             `-20px`,
        animationDelay:  `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

function Confetti({ count }: { count: number }) {
  // Stable pieces derived from count — no Math.random during render to avoid hydration issues
  const pieces = Array.from({ length: count }).map((_, i) => ({
    id:       i,
    color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    left:     (i * 37 + 5) % 95,
    delay:    (i * 0.11) % 0.85,
    duration: 2.2 + (i % 5) * 0.3,
    shape:    (i % 3 === 0 ? "ribbon" : "square") as "square" | "ribbon",
  }));

  return (
    <>
      {pieces.map(p => (
        <ConfettiPiece key={p.id} {...p} />
      ))}
    </>
  );
}

// ── Reward reveal ──────────────────────────────────────────────────────────────

function RewardReveal({ reward, onCollect, styles }: {
  reward:    Reward;
  onCollect: () => void;
  styles:    typeof RARITY_STYLES[Rarity];
}) {
  const isLegendary = reward.rarity === "Legendary";
  const isEpic      = reward.rarity === "Epic";
  const confettiCount = CONFETTI_COUNT[reward.rarity];

  // Rarity-based entrance class for the icon card
  const entranceClass =
    isLegendary || isEpic ? "burst" :
    reward.rarity === "Rare" ? "rare-slide-up" :
    "common-fade-in";

  return (
    <div
      className={`flex flex-col items-center gap-5 py-6 ${entranceClass} ${
        isLegendary ? "min-h-screen justify-center" : ""
      } relative`}
    >
      {/* Confetti for Rare, Epic, Legendary */}
      {confettiCount > 0 && <Confetti count={confettiCount} />}

      {/* Legendary: full-screen celebration bg */}
      {isLegendary && (
        <>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(circle at 50% 40%, rgba(245,158,11,0.3) 0%, transparent 65%)",
            }}
          />
          <p className="text-shimmer text-2xl font-black animate-pulse z-10">
            ✦ גיבור אגדי! ✦
          </p>
        </>
      )}

      {/* Epic: purple glow bg */}
      {isEpic && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(139,92,246,0.22) 0%, transparent 60%)",
          }}
        />
      )}

      {/* Icon */}
      <div className={`
        relative w-36 h-36 rounded-3xl flex items-center justify-center text-7xl
        bg-gradient-to-br ${styles.box}
        shadow-2xl ${styles.glow}
        border-4 ${styles.border}
        z-10
        ${isLegendary ? "legendary-glow" : ""}
        overflow-hidden
      `}>
        {reward.type === "hero" && reward.heroGender ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={getHeroImage(reward.heroGender, reward.heroTheme ?? "default", 0)}
            alt={reward.label}
            style={{ height: "100%", width: "auto", objectFit: "contain" }}
          />
        ) : reward.icon}
        {/* Ray lines for rare+ */}
        {styles.rays > 0 && Array.from({ length: styles.rays }).map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 bg-white/20 origin-bottom"
            style={{
              height: "70px",
              bottom: "50%",
              left:   "calc(50% - 1px)",
              transform: `rotate(${(360 / styles.rays) * i}deg) translateY(-80%)`,
            }}
          />
        ))}
      </div>

      {/* Rarity badge */}
      <div className={`
        px-5 py-1.5 rounded-full text-sm font-black uppercase tracking-wider
        ${styles.badge} text-white border border-white/20 z-10
        ${isLegendary ? "text-shimmer" : ""}
      `}>
        {RARITY_LABELS[reward.rarity]}
      </div>

      {/* Label */}
      <p className={`text-2xl font-black text-center z-10 ${styles.label}`}>
        {reward.label}
      </p>
      <p className="text-slate-400 text-sm z-10">נוסף לאוסף שלך!</p>

      <button
        onClick={onCollect}
        className="btn-3d btn-3d-violet px-10 py-3.5 text-lg z-10"
      >
        🎉 מגניב!
      </button>
    </div>
  );
}

// ── Box tap view ───────────────────────────────────────────────────────────────

function BoxTapView({
  taps,
  shaking,
  bursting,
  onTap,
  reward,
  styles,
}: {
  taps:     number;
  shaking:  boolean;
  bursting: boolean;
  onTap:    () => void;
  reward:   Reward;
  styles:   typeof RARITY_STYLES[Rarity];
}) {
  const tapMessages = [
    "✨ הקש כדי לפתוח!",
    "💥 עוד שתיים!",
    "⚡ עוד אחת!",
  ];

  // Crystal icon inside the box varies by rarity
  const boxIcon =
    reward.rarity === "Legendary" ? "🌟" :
    reward.rarity === "Epic"      ? "🔮" :
    reward.rarity === "Rare"      ? "💎" :
    "📦";

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* Crystal box */}
      <button
        onClick={onTap}
        className={`
          relative w-40 h-40 rounded-3xl cursor-pointer
          bg-gradient-to-br ${styles.box}
          shadow-2xl ${styles.glow}
          border-4 ${styles.border}
          flex items-center justify-center
          select-none active:scale-90 transition-transform duration-100
          box-rarity-glow
          ${shaking  ? "treasure-shake" : ""}
          ${bursting ? "box-open-burst" : ""}
          ${reward.rarity === "Legendary" ? "legendary-glow" : ""}
        `}
        style={{
          "--box-glow-color":     styles.glowColor,
          "--box-glow-color-dim": styles.glowColorDim,
        } as React.CSSProperties}
        aria-label="פתח ארגז קריסטל"
      >
        {/* Box lid */}
        <div className="absolute top-0 inset-x-0 h-14 rounded-t-3xl bg-white/10 flex items-center justify-center border-b-4 border-black/30">
          <div className="w-10 h-5 rounded-full bg-amber-400/80 flex items-center justify-center shadow-inner">
            <div className="w-3 h-3 rounded-full bg-amber-700 shadow" />
          </div>
        </div>

        <span className="text-6xl mt-5">{boxIcon}</span>

        {/* Tap impact particles */}
        {shaking && (
          <>
            <span className="absolute -top-3 -right-2 text-2xl animate-bounce">✨</span>
            <span className="absolute -top-3 -left-2 text-2xl animate-bounce" style={{ animationDelay: "0.12s" }}>⭐</span>
            <span className="absolute -bottom-2 right-1 text-xl animate-bounce" style={{ animationDelay: "0.06s" }}>💫</span>
          </>
        )}
      </button>

      {/* Tap feedback */}
      <div className="flex flex-col items-center gap-3">
        <p
          key={taps}
          className={`text-white font-black text-xl tap-hint-bounce`}
        >
          {tapMessages[taps] ?? "עוד פעם!"}
        </p>

        {/* Progress dots */}
        <div className="flex gap-4">
          {Array.from({ length: TAPS_NEEDED }).map((_, i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all duration-200 ${
                i < taps
                  ? `bg-amber-400 border-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.8)] scale-125`
                  : "bg-white/10 border-white/20 scale-100"
              }`}
            />
          ))}
        </div>

        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
          RARITY_STYLES[reward.rarity].badge
        } text-white`}>
          {RARITY_LABELS[reward.rarity]}
        </div>
      </div>
    </div>
  );
}

// ── Main TreasureBox ───────────────────────────────────────────────────────────

export function TreasureBox({ reward, onCollect }: Props) {
  const [taps,     setTaps]     = useState(0);
  const [shaking,  setShaking]  = useState(false);
  const [bursting, setBursting] = useState(false);
  const [opened,   setOpened]   = useState(false);

  const styles = RARITY_STYLES[reward.rarity];

  function handleTap() {
    if (opened || bursting) return;
    const next = taps + 1;

    setShaking(true);
    setTimeout(() => setShaking(false), 430);

    setTaps(next);
    if (next >= TAPS_NEEDED) {
      // Brief burst animation, then reveal
      setTimeout(() => setBursting(true),  280);
      setTimeout(() => setOpened(true),    600);
    }
  }

  if (opened) {
    return <RewardReveal reward={reward} onCollect={onCollect} styles={styles} />;
  }

  return (
    <BoxTapView
      taps={taps}
      shaking={shaking}
      bursting={bursting}
      onTap={handleTap}
      reward={reward}
      styles={styles}
    />
  );
}

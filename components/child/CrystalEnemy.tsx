"use client";

import React from "react";

// ── Enemy archetypes ──────────────────────────────────────────────────────────
// Four distinct enemies with movement AI handled by the arena.
// Each SVG is drawn with the "front" pointing UP (negative Y); the arena
// rotates the wrapper so the enemy faces the hero.
export type EnemyVariant = "goblin" | "bat" | "giant" | "wizard";

export const ENEMY_VARIANTS: EnemyVariant[] = ["goblin", "bat", "giant", "wizard"];

const VARIANT_META: Record<EnemyVariant, { nameHe: string; glow: string; size: number }> = {
  goblin: { nameHe: "גובלין השאלות",  glow: "rgba(74, 222, 128, 0.75)",  size: 86  },
  bat:    { nameHe: "עטלף הטעויות",   glow: "rgba(167, 139, 250, 0.75)", size: 92  },
  giant:  { nameHe: "ענק הזיכרון",     glow: "rgba(251, 113,  30, 0.85)", size: 150 },
  wizard: { nameHe: "קוסם הבלבול",     glow: "rgba(56, 189, 248, 0.75)",  size: 90  },
};

// Cycle worldId hash → archetype (4 distinct enemies).
function worldToVariant(worldId: string | null): EnemyVariant {
  if (!worldId) return "goblin";
  const hash = worldId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return ENEMY_VARIANTS[hash % ENEMY_VARIANTS.length];
}

export function getEnemyVariant(worldId: string | null): EnemyVariant {
  return worldToVariant(worldId);
}

export function getEnemyName(worldId: string | null): string {
  return VARIANT_META[worldToVariant(worldId)].nameHe;
}

export function getEnemyMeta(variant: EnemyVariant) {
  return VARIANT_META[variant];
}

// ── Inline SVG art per variant ────────────────────────────────────────────────
// 3/4 top-down silhouettes. Each is drawn in a 100×100 viewBox.

function GoblinSVG() {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      {/* shadow */}
      <ellipse cx="50" cy="92" rx="22" ry="4" fill="rgba(0,0,0,0.45)" />
      {/* body */}
      <path d="M30 70 Q28 55 36 48 Q34 38 42 32 Q40 22 50 18 Q60 22 58 32 Q66 38 64 48 Q72 55 70 70 Q60 78 50 78 Q40 78 30 70 Z"
        fill="url(#goblinBody)" stroke="#14532d" strokeWidth="1.5" />
      {/* horns / tufts (top of head, 3/4 view) */}
      <path d="M40 22 L36 14 L44 20 Z" fill="#1f2937" />
      <path d="M60 22 L64 14 L56 20 Z" fill="#1f2937" />
      {/* eyes — glowing yellow */}
      <circle cx="44" cy="34" r="3.4" fill="#fde047" />
      <circle cx="56" cy="34" r="3.4" fill="#fde047" />
      <circle cx="44" cy="34" r="1.4" fill="#000" />
      <circle cx="56" cy="34" r="1.4" fill="#000" />
      {/* fanged mouth */}
      <path d="M44 42 Q50 47 56 42 L54 46 L50 44 L46 46 Z" fill="#1f2937" />
      <path d="M46 44 L46 47 M54 44 L54 47" stroke="white" strokeWidth="1" />
      {/* arms holding tiny club, hunched forward */}
      <circle cx="28" cy="58" r="6" fill="#4d7c0f" />
      <circle cx="72" cy="58" r="6" fill="#4d7c0f" />
      <rect x="68" y="46" width="3" height="14" fill="#78350f" transform="rotate(20 70 53)" />
      <defs>
        <radialGradient id="goblinBody" cx="0.4" cy="0.3" r="0.8">
          <stop offset="0%"  stopColor="#84cc16" />
          <stop offset="60%" stopColor="#4d7c0f" />
          <stop offset="100%" stopColor="#1a2e05" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function BatSVG({ flapPhase = 0 }: { flapPhase?: number }) {
  // wings flap via flapPhase (-1..1)
  const w = 28 + flapPhase * 8;
  const h = 16 - flapPhase * 4;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      {/* wing left */}
      <path
        d={`M50 50 Q ${50 - w} ${50 - h} ${50 - w - 4} ${52 + h * 0.3} Q ${50 - w * 0.6} ${56} 50 56 Z`}
        fill="url(#batWing)" stroke="#1e1b4b" strokeWidth="1.2"
      />
      {/* wing right */}
      <path
        d={`M50 50 Q ${50 + w} ${50 - h} ${50 + w + 4} ${52 + h * 0.3} Q ${50 + w * 0.6} ${56} 50 56 Z`}
        fill="url(#batWing)" stroke="#1e1b4b" strokeWidth="1.2"
      />
      {/* body */}
      <ellipse cx="50" cy="52" rx="9" ry="13" fill="#1e1b4b" stroke="#0f172a" strokeWidth="1" />
      {/* ears */}
      <path d="M44 40 L42 32 L48 38 Z" fill="#1e1b4b" />
      <path d="M56 40 L58 32 L52 38 Z" fill="#1e1b4b" />
      {/* eyes — red glow */}
      <circle cx="46" cy="46" r="2.2" fill="#f43f5e" />
      <circle cx="54" cy="46" r="2.2" fill="#f43f5e" />
      <circle cx="46" cy="46" r="0.9" fill="white" />
      <circle cx="54" cy="46" r="0.9" fill="white" />
      {/* fangs */}
      <path d="M48 53 L48 57 M52 53 L52 57" stroke="white" strokeWidth="1.1" />
      <defs>
        <linearGradient id="batWing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GiantSVG({ stompPhase = 0 }: { stompPhase?: number }) {
  // stompPhase 0..1: legs alternate
  const legL = stompPhase < 0.5 ? -3 : 0;
  const legR = stompPhase >= 0.5 ? -3 : 0;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      {/* shadow */}
      <ellipse cx="50" cy="94" rx="34" ry="5" fill="rgba(0,0,0,0.55)" />
      {/* legs */}
      <rect x="34" y={70 + legL} width="12" height="22" rx="3" fill="#7c2d12" stroke="#1a1208" strokeWidth="1.5" />
      <rect x="54" y={70 + legR} width="12" height="22" rx="3" fill="#7c2d12" stroke="#1a1208" strokeWidth="1.5" />
      {/* body / torso (huge) */}
      <path d="M22 50 Q20 36 32 30 Q40 22 50 22 Q60 22 68 30 Q80 36 78 50 Q80 70 70 76 Q60 80 50 80 Q40 80 30 76 Q20 70 22 50 Z"
        fill="url(#giantBody)" stroke="#1a1208" strokeWidth="1.8" />
      {/* shoulder spikes (3/4) */}
      <path d="M20 42 L14 36 L22 38 Z" fill="#4b5563" />
      <path d="M80 42 L86 36 L78 38 Z" fill="#4b5563" />
      <path d="M30 30 L26 22 L34 28 Z" fill="#4b5563" />
      <path d="M70 30 L74 22 L66 28 Z" fill="#4b5563" />
      {/* face */}
      <circle cx="42" cy="42" r="3.8" fill="#fef08a" />
      <circle cx="58" cy="42" r="3.8" fill="#fef08a" />
      <circle cx="42" cy="42" r="1.6" fill="#000" />
      <circle cx="58" cy="42" r="1.6" fill="#000" />
      {/* mouth */}
      <path d="M40 54 Q50 62 60 54 L58 58 L50 56 L42 58 Z" fill="#1a1208" />
      <path d="M44 56 L44 60 M50 57 L50 61 M56 56 L56 60" stroke="white" strokeWidth="1.2" />
      {/* fists */}
      <circle cx="20" cy="62" r="9" fill="#7c2d12" stroke="#1a1208" strokeWidth="1.5" />
      <circle cx="80" cy="62" r="9" fill="#7c2d12" stroke="#1a1208" strokeWidth="1.5" />
      <defs>
        <radialGradient id="giantBody" cx="0.4" cy="0.3" r="0.85">
          <stop offset="0%"  stopColor="#fb923c" />
          <stop offset="50%" stopColor="#9a3412" />
          <stop offset="100%" stopColor="#3a1a08" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function WizardSVG({ phasing = 0 }: { phasing?: number }) {
  // phasing 0..1 fade for teleport flicker
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible", opacity: 1 - phasing * 0.6 }}>
      {/* trailing wisps */}
      <ellipse cx="50" cy="88" rx="18" ry="4" fill="rgba(56,189,248,0.35)" />
      {/* cloak body — pointed hood up */}
      <path d="M50 14 L72 80 Q60 88 50 86 Q40 88 28 80 Z"
        fill="url(#wizardCloak)" stroke="#0c4a6e" strokeWidth="1.5" />
      {/* hood opening — dark void */}
      <ellipse cx="50" cy="40" rx="10" ry="13" fill="#020617" />
      {/* glowing eyes */}
      <circle cx="46" cy="40" r="2.2" fill="#67e8f9" />
      <circle cx="54" cy="40" r="2.2" fill="#67e8f9" />
      <circle cx="46" cy="40" r="0.9" fill="white" />
      <circle cx="54" cy="40" r="0.9" fill="white" />
      {/* tip of hood */}
      <circle cx="50" cy="14" r="3" fill="#0c4a6e" />
      {/* hands holding magic orb */}
      <circle cx="32" cy="66" r="5" fill="#075985" stroke="#0c4a6e" strokeWidth="1" />
      <circle cx="68" cy="66" r="5" fill="#075985" stroke="#0c4a6e" strokeWidth="1" />
      <circle cx="50" cy="68" r="6" fill="#67e8f9" opacity="0.9">
        <animate attributeName="r" values="5;7;5" dur="1.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="68" r="3" fill="white" opacity="0.9" />
      <defs>
        <linearGradient id="wizardCloak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#0ea5e9" />
          <stop offset="60%" stopColor="#0c4a6e" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Main export — single SVG enemy oriented toward hero ───────────────────────
export interface CrystalEnemyProps {
  worldId?:    string | null;
  variant?:    EnemyVariant;
  size?:       number;
  damaged?:    boolean;
  hp?:         number;
  showName?:   boolean;
  facingDeg?:  number; // rotation in degrees so enemy faces hero (0 = facing up)
  animPhase?:  number; // 0..1 for wing-flap / stomp / teleport
}

export function CrystalEnemy({
  worldId   = null,
  variant,
  size,
  damaged   = false,
  hp        = 100,
  showName  = true,
  facingDeg = 0,
  animPhase = 0,
}: CrystalEnemyProps) {
  const v    = variant ?? worldToVariant(worldId);
  const meta = VARIANT_META[v];
  const px   = size ?? meta.size;

  const lowHp = hp <= 30;
  const dropShadow = damaged
    ? "drop-shadow(0 0 22px rgba(255,60,60,0.95)) drop-shadow(0 0 8px white)"
    : lowHp
    ? `drop-shadow(0 0 14px rgba(255,80,80,0.7)) drop-shadow(0 0 20px ${meta.glow})`
    : `drop-shadow(0 0 18px ${meta.glow}) drop-shadow(0 2px 6px rgba(0,0,0,0.5))`;

  // flap phase as a sin wave between -1..1
  const flap = Math.sin(animPhase * Math.PI * 2);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        className={damaged ? "enemy-crystal-hit" : ""}
        style={{
          width: px,
          height: px,
          position: "relative",
          filter: dropShadow,
          opacity: Math.max(0.15, hp / 100),
          transition: "filter 0.2s ease, opacity 0.4s ease",
          transform: `rotate(${facingDeg}deg)`,
          transformOrigin: "center center",
          willChange: "transform, filter",
        }}
      >
        {v === "goblin" && <GoblinSVG />}
        {v === "bat"    && <BatSVG    flapPhase={flap} />}
        {v === "giant"  && <GiantSVG  stompPhase={animPhase} />}
        {v === "wizard" && <WizardSVG phasing={animPhase} />}
      </div>

      {showName && (
        <span
          className="text-xs font-bold text-center leading-tight"
          style={{
            color: "rgba(255,200,200,0.9)",
            textShadow: "0 0 8px rgba(255,0,0,0.4)",
            transform: `rotate(${-facingDeg}deg)`,
          }}
        >
          {meta.nameHe}
        </span>
      )}
    </div>
  );
}

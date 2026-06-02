"use client";

import React from "react";

// ── Enemy archetypes ──────────────────────────────────────────────────────────
// Four visually distinct enemies. Each SVG has a unique silhouette so the player
// can tell them apart at a glance — not just recolors of the same blob.
//
// Each SVG is drawn with the "front" pointing UP (negative Y); the arena
// rotates the wrapper so the enemy faces the hero.
export type EnemyVariant = "goblin" | "bat" | "giant" | "wizard";

export const ENEMY_VARIANTS: EnemyVariant[] = ["goblin", "bat", "giant", "wizard"];

const VARIANT_META: Record<EnemyVariant, { nameHe: string; glow: string; size: number }> = {
  goblin: { nameHe: "גובלין השאלות",  glow: "rgba(74, 222, 128, 0.75)",  size: 110 },
  bat:    { nameHe: "עטלף הטעויות",   glow: "rgba(167, 139, 250, 0.80)", size: 130 },
  giant:  { nameHe: "ענק הזיכרון",     glow: "rgba(251, 113,  30, 0.90)", size: 180 },
  wizard: { nameHe: "קוסם הבלבול",     glow: "rgba(56, 189, 248, 0.80)",  size: 120 },
};

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
// Each enemy is drawn in a 100×100 viewBox, facing UP.

// 1) GOBLIN — small hunched humanoid, green skin, big pointed ears, club.
function GoblinSVG({ hopPhase = 0 }: { hopPhase?: number }) {
  // hop offset for legs/body
  const hop = Math.sin(hopPhase * Math.PI * 2) * 2;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="goblinSkin" cx="0.4" cy="0.3" r="0.85">
          <stop offset="0%"  stopColor="#a3e635" />
          <stop offset="55%" stopColor="#4d7c0f" />
          <stop offset="100%" stopColor="#1a2e05" />
        </radialGradient>
        <linearGradient id="goblinCloth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#92400e" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="50" cy="94" rx="20" ry="3.5" fill="rgba(0,0,0,0.55)" />

      {/* legs (bent, ready to hop) */}
      <path d={`M40 ${78 - hop} Q36 86 38 94 L46 94 L46 ${82 - hop} Z`} fill="#4d7c0f" stroke="#1a2e05" strokeWidth="1.4" />
      <path d={`M60 ${78 - hop} Q64 86 62 94 L54 94 L54 ${82 - hop} Z`} fill="#4d7c0f" stroke="#1a2e05" strokeWidth="1.4" />
      {/* feet */}
      <ellipse cx="40" cy="94" rx="6" ry="2.5" fill="#1a2e05" />
      <ellipse cx="60" cy="94" rx="6" ry="2.5" fill="#1a2e05" />

      {/* loincloth */}
      <path d={`M34 ${64 - hop} L66 ${64 - hop} L62 ${80 - hop} L38 ${80 - hop} Z`} fill="url(#goblinCloth)" stroke="#1a1208" strokeWidth="1" />

      {/* torso — hunched, narrow shoulders, pot belly */}
      <path d={`M34 ${48 - hop} Q30 60 36 70 Q50 76 64 70 Q70 60 66 ${48 - hop} Q58 42 50 42 Q42 42 34 ${48 - hop} Z`}
        fill="url(#goblinSkin)" stroke="#14532d" strokeWidth="1.6" />

      {/* head — wide, sloped forehead */}
      <path d={`M36 ${36 - hop} Q34 24 44 20 Q50 16 56 20 Q66 24 64 ${36 - hop} Q60 44 50 44 Q40 44 36 ${36 - hop} Z`}
        fill="url(#goblinSkin)" stroke="#14532d" strokeWidth="1.6" />

      {/* huge pointed ears (goblin signature) */}
      <path d={`M32 ${30 - hop} L18 ${24 - hop} L24 ${34 - hop} Z`} fill="#4d7c0f" stroke="#14532d" strokeWidth="1.4" />
      <path d={`M68 ${30 - hop} L82 ${24 - hop} L76 ${34 - hop} Z`} fill="#4d7c0f" stroke="#14532d" strokeWidth="1.4" />
      {/* ear inner */}
      <path d={`M32 ${30 - hop} L24 ${27 - hop} L26 ${32 - hop} Z`} fill="#1a2e05" />
      <path d={`M68 ${30 - hop} L76 ${27 - hop} L74 ${32 - hop} Z`} fill="#1a2e05" />

      {/* glowing yellow eyes */}
      <ellipse cx="44" cy={30 - hop} rx="3" ry="2.4" fill="#fde047" />
      <ellipse cx="56" cy={30 - hop} rx="3" ry="2.4" fill="#fde047" />
      <circle  cx="44" cy={30 - hop} r="1.2" fill="#000" />
      <circle  cx="56" cy={30 - hop} r="1.2" fill="#000" />

      {/* fanged grin */}
      <path d={`M42 ${38 - hop} Q50 44 58 ${38 - hop} L56 ${40 - hop} L54 ${42 - hop} L50 ${40 - hop} L46 ${42 - hop} L44 ${40 - hop} Z`} fill="#1a1208" />
      <path d={`M46 ${39 - hop} L46 ${43 - hop} M54 ${39 - hop} L54 ${43 - hop}`} stroke="white" strokeWidth="1.2" />

      {/* spiky wooden club in right hand */}
      <rect x="72" y={50 - hop} width="3.5" height="18" fill="#78350f" stroke="#3a1a08" strokeWidth="0.8" transform={`rotate(25 73.5 ${59 - hop})`} />
      <circle cx="80" cy={48 - hop} r="5" fill="#78350f" stroke="#3a1a08" strokeWidth="1" />
      <circle cx="82" cy={45 - hop} r="1.2" fill="#3a1a08" />
      <circle cx="78" cy={50 - hop} r="1.2" fill="#3a1a08" />
      <circle cx="83" cy={50 - hop} r="1.2" fill="#3a1a08" />

      {/* left hand */}
      <circle cx="28" cy={62 - hop} r="4.5" fill="#4d7c0f" stroke="#14532d" strokeWidth="1.2" />
    </svg>
  );
}

// 2) BAT — wide membrane wings with visible finger bones, tiny body.
function BatSVG({ flapPhase = 0 }: { flapPhase?: number }) {
  // wings flap via flapPhase (-1..1): wider/flatter alternation
  const spread = 0.85 + flapPhase * 0.15;
  const lift   = flapPhase * 6;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="batWing" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#7c3aed" />
          <stop offset="55%" stopColor="#4c1d95" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>
        <radialGradient id="batBody" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor="#312e81" />
          <stop offset="100%" stopColor="#0f0a1f" />
        </radialGradient>
      </defs>

      {/* faint shadow on ground (below) */}
      <ellipse cx="50" cy="92" rx="22" ry="3" fill="rgba(0,0,0,0.35)" />

      {/* LEFT WING — scalloped membrane with finger bones */}
      <path
        d={`M50 50
            Q${50 - 40 * spread} ${44 - lift} ${8} ${56 + lift}
            Q${22} ${66} ${34} ${62}
            Q${42} ${66} ${50} ${58}
            Z`}
        fill="url(#batWing)" stroke="#0f0a1f" strokeWidth="1.4"
      />
      {/* finger bones left */}
      <path d={`M50 50 L${10} ${56 + lift}`} stroke="#0f0a1f" strokeWidth="1" fill="none" />
      <path d={`M50 50 L${22} ${66}`}        stroke="#0f0a1f" strokeWidth="1" fill="none" />
      <path d={`M50 50 L${34} ${62}`}        stroke="#0f0a1f" strokeWidth="1" fill="none" />

      {/* RIGHT WING */}
      <path
        d={`M50 50
            Q${50 + 40 * spread} ${44 - lift} ${92} ${56 + lift}
            Q${78} ${66} ${66} ${62}
            Q${58} ${66} ${50} ${58}
            Z`}
        fill="url(#batWing)" stroke="#0f0a1f" strokeWidth="1.4"
      />
      <path d={`M50 50 L${90} ${56 + lift}`} stroke="#0f0a1f" strokeWidth="1" fill="none" />
      <path d={`M50 50 L${78} ${66}`}        stroke="#0f0a1f" strokeWidth="1" fill="none" />
      <path d={`M50 50 L${66} ${62}`}        stroke="#0f0a1f" strokeWidth="1" fill="none" />

      {/* body — small furry torso */}
      <ellipse cx="50" cy="52" rx="8" ry="12" fill="url(#batBody)" stroke="#0f0a1f" strokeWidth="1.2" />
      {/* fur tufts */}
      <path d="M44 44 Q46 41 48 43 M52 43 Q54 41 56 44" stroke="#4c1d95" strokeWidth="1" fill="none" />

      {/* head — slight bump at top with two pointed ears */}
      <circle cx="50" cy="42" r="7" fill="url(#batBody)" stroke="#0f0a1f" strokeWidth="1.1" />
      <path d="M44 36 L41 28 L48 34 Z" fill="#1e1b4b" stroke="#0f0a1f" strokeWidth="1" />
      <path d="M56 36 L59 28 L52 34 Z" fill="#1e1b4b" stroke="#0f0a1f" strokeWidth="1" />

      {/* glowing red eyes */}
      <circle cx="47" cy="41" r="1.8" fill="#fb7185" />
      <circle cx="53" cy="41" r="1.8" fill="#fb7185" />
      <circle cx="47" cy="41" r="0.7" fill="white" />
      <circle cx="53" cy="41" r="0.7" fill="white" />

      {/* twin fangs */}
      <path d="M48 46 L48 50 M52 46 L52 50" stroke="white" strokeWidth="1.2" />

      {/* feet/claws at bottom */}
      <path d="M46 62 L45 66 M50 63 L50 67 M54 62 L55 66" stroke="#0f0a1f" strokeWidth="1.2" />
    </svg>
  );
}

// 3) MEMORY GIANT — massive armored boss with horns, glowing rune, stone fists.
function GiantSVG({ stompPhase = 0 }: { stompPhase?: number }) {
  // stompPhase 0..1: legs alternate, whole body bobs
  const legL = stompPhase < 0.5 ? -2 : 1;
  const legR = stompPhase >= 0.5 ? -2 : 1;
  const bob  = Math.sin(stompPhase * Math.PI * 2) * 1.2;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="giantSkin" cx="0.4" cy="0.3" r="0.9">
          <stop offset="0%"  stopColor="#fb923c" />
          <stop offset="45%" stopColor="#9a3412" />
          <stop offset="100%" stopColor="#1c0a04" />
        </radialGradient>
        <linearGradient id="giantArmor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#1f2937" />
        </linearGradient>
        <radialGradient id="rune" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%"  stopColor="#fef08a" />
          <stop offset="60%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#7c2d12" />
        </radialGradient>
      </defs>

      {/* huge ground shadow */}
      <ellipse cx="50" cy="96" rx="38" ry="5" fill="rgba(0,0,0,0.65)" />

      {/* legs — thick tree-trunks */}
      <rect x="30" y={68 + legL + bob} width="14" height="24" rx="3" fill="#7c2d12" stroke="#1c0a04" strokeWidth="1.8" />
      <rect x="56" y={68 + legR + bob} width="14" height="24" rx="3" fill="#7c2d12" stroke="#1c0a04" strokeWidth="1.8" />
      {/* feet plates */}
      <ellipse cx="37" cy={94 + bob} rx="10" ry="3" fill="#1c0a04" />
      <ellipse cx="63" cy={94 + bob} rx="10" ry="3" fill="#1c0a04" />

      {/* torso — barrel chest, broader than head */}
      <path d={`M18 ${54 + bob} Q14 38 30 32 Q40 24 50 24 Q60 24 70 32 Q86 38 82 ${54 + bob} Q86 72 70 76 Q60 80 50 80 Q40 80 30 76 Q14 72 18 ${54 + bob} Z`}
        fill="url(#giantSkin)" stroke="#1c0a04" strokeWidth="2" />

      {/* chest armor plate */}
      <path d={`M34 ${50 + bob} Q34 64 ${42 + bob * 0.1} 70 L58 70 Q66 64 66 ${50 + bob} Q50 44 34 ${50 + bob} Z`}
        fill="url(#giantArmor)" stroke="#1c0a04" strokeWidth="1.5" />
      {/* glowing memory rune on chest */}
      <circle cx="50" cy={60 + bob} r="6" fill="url(#rune)" stroke="#7c2d12" strokeWidth="1.2" />
      <path d={`M47 ${60 + bob} L50 ${56 + bob} L53 ${60 + bob} L50 ${64 + bob} Z`} fill="#fef08a" />

      {/* shoulder pauldrons with spikes */}
      <path d={`M14 ${44 + bob} Q14 32 28 32 L30 44 Z`} fill="url(#giantArmor)" stroke="#1c0a04" strokeWidth="1.4" />
      <path d={`M86 ${44 + bob} Q86 32 72 32 L70 44 Z`} fill="url(#giantArmor)" stroke="#1c0a04" strokeWidth="1.4" />
      <path d="M16 38 L12 30 L22 34 Z" fill="#4b5563" stroke="#1c0a04" strokeWidth="1" />
      <path d="M84 38 L88 30 L78 34 Z" fill="#4b5563" stroke="#1c0a04" strokeWidth="1" />

      {/* head — small relative to body */}
      <circle cx="50" cy={24 + bob} r="10" fill="url(#giantSkin)" stroke="#1c0a04" strokeWidth="1.6" />
      {/* big curved horns */}
      <path d={`M42 ${18 + bob} Q34 10 28 14 Q34 14 40 22 Z`} fill="#e7e5e4" stroke="#1c0a04" strokeWidth="1.2" />
      <path d={`M58 ${18 + bob} Q66 10 72 14 Q66 14 60 22 Z`} fill="#e7e5e4" stroke="#1c0a04" strokeWidth="1.2" />

      {/* face — single glowing eye + tusks */}
      <ellipse cx="46" cy={24 + bob} rx="2.4" ry="2" fill="#fef08a" />
      <ellipse cx="54" cy={24 + bob} rx="2.4" ry="2" fill="#fef08a" />
      <circle  cx="46" cy={24 + bob} r="1" fill="#000" />
      <circle  cx="54" cy={24 + bob} r="1" fill="#000" />
      {/* tusks from lower jaw */}
      <path d={`M46 ${30 + bob} L44 ${36 + bob} L47 ${33 + bob} Z`} fill="white" stroke="#1c0a04" strokeWidth="0.8" />
      <path d={`M54 ${30 + bob} L56 ${36 + bob} L53 ${33 + bob} Z`} fill="white" stroke="#1c0a04" strokeWidth="0.8" />

      {/* massive stone fists at sides */}
      <circle cx="14" cy={64 + bob} r="11" fill="#7c2d12" stroke="#1c0a04" strokeWidth="1.8" />
      <circle cx="86" cy={64 + bob} r="11" fill="#7c2d12" stroke="#1c0a04" strokeWidth="1.8" />
      <path d="M10 60 L12 62 M16 60 L18 62 M12 66 L14 68 M84 60 L86 62 M88 60 L90 62 M86 66 L88 68" stroke="#1c0a04" strokeWidth="1" />
    </svg>
  );
}

// 4) CONFUSION WIZARD — tall robed figure, tall pointed hat, glowing staff.
function WizardSVG({ phasing = 0 }: { phasing?: number }) {
  // phasing 0..1: fade + swirl when teleporting
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ overflow: "visible", opacity: 1 - phasing * 0.55 }}>
      <defs>
        <linearGradient id="wizRobe" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#38bdf8" />
          <stop offset="55%" stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0c0a2a" />
        </linearGradient>
        <linearGradient id="wizHat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1e3a8a" />
          <stop offset="100%" stopColor="#0c0a2a" />
        </linearGradient>
        <radialGradient id="orb" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%"  stopColor="#ffffff" />
          <stop offset="35%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </radialGradient>
      </defs>

      {/* swirling teleport residue beneath */}
      <ellipse cx="50" cy="92" rx={16 + phasing * 8} ry={3 + phasing * 2} fill="rgba(56,189,248,0.35)" />
      {phasing > 0.1 && (
        <>
          <circle cx="32" cy="88" r="1.6" fill="#67e8f9" opacity={phasing} />
          <circle cx="68" cy="86" r="1.6" fill="#67e8f9" opacity={phasing} />
          <circle cx="40" cy="94" r="1.2" fill="#67e8f9" opacity={phasing} />
          <circle cx="60" cy="94" r="1.2" fill="#67e8f9" opacity={phasing} />
        </>
      )}

      {/* long flowing robe — wider at bottom */}
      <path d="M50 36 L66 56 L74 92 Q60 96 50 92 Q40 96 26 92 L34 56 Z"
        fill="url(#wizRobe)" stroke="#0c0a2a" strokeWidth="1.6" />
      {/* robe trim runes */}
      <path d="M30 80 L70 80" stroke="#67e8f9" strokeWidth="0.8" opacity="0.6" />
      <circle cx="38" cy="80" r="1" fill="#67e8f9" />
      <circle cx="50" cy="80" r="1" fill="#67e8f9" />
      <circle cx="62" cy="80" r="1" fill="#67e8f9" />

      {/* shoulders */}
      <ellipse cx="50" cy="40" rx="14" ry="5" fill="#1e3a8a" stroke="#0c0a2a" strokeWidth="1.2" />

      {/* tall pointed hat — wizard signature */}
      <path d="M50 4 L66 38 Q50 42 34 38 Z" fill="url(#wizHat)" stroke="#0c0a2a" strokeWidth="1.6" />
      {/* hat brim */}
      <ellipse cx="50" cy="38" rx="18" ry="3" fill="#0c0a2a" />
      {/* star on hat */}
      <path d="M50 18 L52 22 L57 22 L53 25 L55 30 L50 27 L45 30 L47 25 L43 22 L48 22 Z" fill="#fde047" stroke="#92400e" strokeWidth="0.6" />
      {/* tip droop */}
      <path d="M50 4 Q54 6 52 12 Z" fill="#0c0a2a" />

      {/* face — dark void under brim, glowing eyes, long white beard */}
      <ellipse cx="50" cy="42" rx="6" ry="5" fill="#020617" />
      <circle cx="47" cy="42" r="1.4" fill="#67e8f9" />
      <circle cx="53" cy="42" r="1.4" fill="#67e8f9" />
      <circle cx="47" cy="42" r="0.6" fill="white" />
      <circle cx="53" cy="42" r="0.6" fill="white" />
      {/* long beard */}
      <path d="M44 46 Q50 64 56 46 Q54 58 50 60 Q46 58 44 46 Z" fill="#e5e7eb" stroke="#94a3b8" strokeWidth="0.8" />

      {/* arms holding staff */}
      <path d="M34 50 Q22 56 18 72" stroke="#1e3a8a" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M66 50 Q78 56 82 72" stroke="#1e3a8a" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* hand right */}
      <circle cx="82" cy="72" r="4" fill="#fde68a" stroke="#0c0a2a" strokeWidth="1" />
      <circle cx="18" cy="72" r="4" fill="#fde68a" stroke="#0c0a2a" strokeWidth="1" />

      {/* staff (right side) */}
      <rect x="80" y="20" width="3" height="70" fill="#78350f" stroke="#3a1a08" strokeWidth="0.8" />
      {/* staff orb */}
      <circle cx="81.5" cy="18" r="7" fill="url(#orb)" stroke="#0c4a6e" strokeWidth="1">
        <animate attributeName="r" values="6;8;6" dur="1.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="81.5" cy="18" r="2.5" fill="white" opacity="0.9" />
      {/* sparkles around orb */}
      <circle cx="74" cy="14" r="0.9" fill="#67e8f9" />
      <circle cx="90" cy="22" r="0.9" fill="#67e8f9" />
      <circle cx="84" cy="8"  r="0.9" fill="#67e8f9" />
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
    : `drop-shadow(0 0 18px ${meta.glow}) drop-shadow(0 2px 6px rgba(0,0,0,0.55))`;

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
        {v === "goblin" && <GoblinSVG hopPhase={animPhase} />}
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

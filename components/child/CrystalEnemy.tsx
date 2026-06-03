"use client";

import React from "react";

export type EnemyVariant = "goblin" | "bat" | "giant" | "wizard";

export const ENEMY_VARIANTS: EnemyVariant[] = ["goblin", "bat", "giant", "wizard"];

type DirKey = 1 | 2 | 3 | 4 | 5;

const VARIANT_META: Record<EnemyVariant, { nameHe: string; glow: string; size: number; slug: string }> = {
  goblin: { nameHe: "גובלין השאלות",  glow: "rgba(74, 222, 128, 0.75)",  size: 110, slug: "question-goblin" },
  bat:    { nameHe: "עטלף הטעויות",   glow: "rgba(167, 139, 250, 0.80)", size: 120, slug: "mistake-bat" },
  giant:  { nameHe: "ענק הזיכרון",     glow: "rgba(251, 113,  30, 0.90)", size: 150, slug: "memory-giant" },
  wizard: { nameHe: "קוסם הבלבול",     glow: "rgba(168, 85, 247, 0.85)",  size: 130, slug: "confusion-wizard" },
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
  const m = VARIANT_META[variant];
  return { ...m, src: `/enemies/${m.slug}-1.png` };
}

// facingDeg: clockwise bearing from "up" toward the hero (0=up/back, 180=down/front).
// Sprite convention verified from actual PNGs:
//   -1.png = front (facing viewer)   -4.png = back (facing away)
//   -2.png = left-profile            -3.png = right-profile
// Bearing 90° (hero to enemy's right)  → enemy faces right → -3.png
// Bearing 270° (hero to enemy's left)  → enemy faces left  → -2.png
function dirFromFacing(facingDeg: number): DirKey {
  const a = ((facingDeg % 360) + 360) % 360;
  if (a >= 315 || a < 45)  return 4; // up   → back
  if (a >= 45  && a < 135) return 3; // right → -3.png (right-profile)
  if (a >= 135 && a < 225) return 1; // down  → front
  return 2;                          // left  → -2.png (left-profile)
}

export interface CrystalEnemyProps {
  worldId?:    string | null;
  variant?:    EnemyVariant;
  size?:       number;
  damaged?:    boolean;
  hp?:         number;
  showName?:   boolean;
  facingDeg?:  number;
  animPhase?:  number;
  attacking?:  boolean;
  locked?:     boolean;
}

export function CrystalEnemy({
  worldId   = null,
  variant,
  size,
  damaged   = false,
  hp        = 100,
  showName  = true,
  facingDeg = 180,
  animPhase = 0,
  attacking = false,
  locked    = false,
}: CrystalEnemyProps) {
  const v    = variant ?? worldToVariant(worldId);
  const meta = VARIANT_META[v];
  const px   = size ?? meta.size;

  // Always use directional sprite so the enemy faces toward the hero correctly.
  // idle.png is always front-facing and ignores direction — never use it during battle.
  const dir: DirKey = attacking ? 5 : dirFromFacing(facingDeg);
  const src = `/enemies/${meta.slug}-${dir}.png`;

  const lowHp = hp <= 30;
  const dropShadow = damaged
    ? "drop-shadow(0 0 22px rgba(255,60,60,0.95)) drop-shadow(0 0 8px white)"
    : lowHp
    ? `drop-shadow(0 0 14px rgba(255,80,80,0.7)) drop-shadow(0 0 20px ${meta.glow})`
    : `drop-shadow(0 0 18px ${meta.glow}) drop-shadow(0 2px 6px rgba(0,0,0,0.55))`;

  const bob = Math.sin(animPhase * Math.PI * 2) * 4;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      {locked && (
        <style>{`
          @keyframes target-lock-ring {
            0%,100% { opacity: 0.75; transform: scale(1);    }
            50%      { opacity: 1;    transform: scale(1.08); }
          }
          @keyframes target-lock-spin {
            from { transform: rotate(0deg);   }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      )}
      <div
        className={damaged ? "enemy-crystal-hit" : ""}
        style={{
          width: px,
          height: px,
          position: "relative",
          filter: dropShadow,
          opacity: Math.max(0.15, hp / 100),
          transition: "filter 0.2s ease, opacity 0.4s ease",
          transformOrigin: "center center",
          willChange: "filter",
        }}
      >
        {locked && (
          <>
            {/* Pulsing lock ring */}
            <div style={{
              position: "absolute",
              inset: -16,
              borderRadius: "50%",
              border: "2.5px solid rgba(34,211,238,0.85)",
              boxShadow: "0 0 14px rgba(34,211,238,0.6), inset 0 0 8px rgba(34,211,238,0.15)",
              animation: "target-lock-ring 1.1s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            {/* Outer rotating dashes */}
            <div style={{
              position: "absolute",
              inset: -28,
              borderRadius: "50%",
              border: "1.5px dashed rgba(244,114,182,0.6)",
              animation: "target-lock-spin 3s linear infinite",
              pointerEvents: "none",
            }} />
          </>
        )}
        <img
          src={src}
          alt={meta.nameHe}
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `translateY(${bob}px)`,
            willChange: "transform",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {showName && (
        <span
          className="text-xs font-bold text-center leading-tight"
          style={{
            color: "rgba(255,200,200,0.9)",
            textShadow: "0 0 8px rgba(255,0,0,0.4)",
          }}
        >
          {meta.nameHe}
        </span>
      )}
    </div>
  );
}

"use client";

import React from "react";

export type EnemyVariant = "goblin" | "bat" | "giant" | "wizard";

export const ENEMY_VARIANTS: EnemyVariant[] = ["goblin", "bat", "giant", "wizard"];

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

// facingDeg: clockwise bearing from "up" toward the hero (0=up, 90=right, 180=down, 270=left).
// We always render the front-facing sprite (-1.png) and mirror it horizontally when the
// hero is to the LEFT of the enemy, so the enemy always faces the hero regardless of which
// side it spawned on. This is more reliable than per-direction PNG files.
function heroIsToLeft(facingDeg: number): boolean {
  const a = ((facingDeg % 360) + 360) % 360;
  // a > 180 means the bearing passes through the west arc → hero is to the LEFT
  return a > 180;
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

  // Always use the front-facing sprite and mirror it with scaleX so the enemy
  // reliably faces toward the hero regardless of which side it entered from.
  const src = attacking
    ? `/enemies/${meta.slug}-5.png`
    : `/enemies/${meta.slug}-1.png`;
  const facingLeft = heroIsToLeft(facingDeg);

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
            transform: `translateY(${bob}px) scaleX(${facingLeft ? -1 : 1})`,
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

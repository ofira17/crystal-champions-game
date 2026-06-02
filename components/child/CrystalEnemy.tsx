"use client";

import React from "react";

export type EnemyVariant = "goblin" | "bat" | "giant" | "wizard";

export const ENEMY_VARIANTS: EnemyVariant[] = ["goblin", "bat", "giant", "wizard"];

type DirKey = 1 | 2 | 3 | 4 | 5;

const VARIANT_META: Record<EnemyVariant, { nameHe: string; glow: string; size: number; slug: string }> = {
  goblin: { nameHe: "גובלין השאלות",  glow: "rgba(74, 222, 128, 0.75)",  size: 160, slug: "question-goblin" },
  bat:    { nameHe: "עטלף הטעויות",   glow: "rgba(167, 139, 250, 0.80)", size: 170, slug: "mistake-bat" },
  giant:  { nameHe: "ענק הזיכרון",     glow: "rgba(251, 113,  30, 0.90)", size: 220, slug: "memory-giant" },
  wizard: { nameHe: "קוסם הבלבול",     glow: "rgba(168, 85, 247, 0.85)",  size: 180, slug: "confusion-wizard" },
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

// facingDeg convention from arena: angle measured from "up" (0 = up, 180 = down,
// 90 = right, -90/270 = left). Map to (1) front, (2) right, (3) left, (4) back.
function dirFromFacing(facingDeg: number): DirKey {
  const a = ((facingDeg % 360) + 360) % 360; // 0..360
  if (a >= 315 || a < 45) return 4;        // up   → back
  if (a >= 45  && a < 135) return 2;       // right
  if (a >= 135 && a < 225) return 1;       // down → front (facing viewer/hero)
  return 3;                                // left
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
}: CrystalEnemyProps) {
  const v    = variant ?? worldToVariant(worldId);
  const meta = VARIANT_META[v];
  const px   = size ?? meta.size;

  const dir: DirKey = attacking || animPhase > 0.85 ? 5 : dirFromFacing(facingDeg);
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

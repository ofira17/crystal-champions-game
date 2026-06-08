"use client";

import React from "react";

export type EnemyVariant =
  | "prisma" | "orion" | "luma" | "gembo" | "bubli"
  | "goblin" | "bat" | "giant" | "wizard";

// Mixed roster: old 4 enemies interleaved with new 5 crystal enemies.
// Advances on correct answers only; wrong answers keep same enemy.
export const ENEMY_VARIANTS: EnemyVariant[] = [
  "goblin", "prisma", "bat", "orion", "giant", "luma", "wizard", "gembo", "bubli",
];
export const ENEMY_COUNT = ENEMY_VARIANTS.length;

/** Returns the enemy variant for a given 0-based index, cycling through all 9. */
export function getEnemyVariantByIndex(index: number): EnemyVariant {
  return ENEMY_VARIANTS[((index % ENEMY_COUNT) + ENEMY_COUNT) % ENEMY_COUNT];
}

/** @deprecated Use getEnemyVariantByIndex. Kept for legacy callers. */
export function getEnemyVariant(_worldId: string | null): EnemyVariant {
  return "prisma";
}

// spawnY: default y% position when entering from the right side of the arena.
// isLegacy: old enemies use a single front-facing sprite with perspective flip,
//           not the 3-directional crystal sprite system.
const VARIANT_META: Record<
  EnemyVariant,
  { nameHe: string; nameEn: string; glow: string; size: number; spawnY: number; slug?: string; isLegacy?: boolean }
> = {
  // ── New crystal enemies ──────────────────────────────────────────────────
  prisma: { nameHe: "פריזמה", nameEn: "Crystal Butterfly", glow: "rgba(103,232,249,0.85)", size: 300, spawnY: 67 },
  orion:  { nameHe: "אוריון",  nameEn: "Crystal Owl",       glow: "rgba(251,191,36,0.85)",  size: 340, spawnY: 18 },
  luma:   { nameHe: "לומה",   nameEn: "Crystal Bird",      glow: "rgba(147,197,253,0.85)", size: 360, spawnY: 28 },
  gembo:  { nameHe: "גמבו",   nameEn: "Crystal Turtle",    glow: "rgba(74,222,128,0.85)",  size: 380, spawnY: 60 },
  bubli:  { nameHe: "בובלי",  nameEn: "Crystal Slime",     glow: "rgba(232,121,249,0.85)", size: 320, spawnY: 72 },
  // ── Classic enemies ──────────────────────────────────────────────────────
  goblin: { nameHe: "גובלין השאלות", nameEn: "Question Goblin", glow: "rgba(74,222,128,0.80)",  size: 320, spawnY: 60, slug: "question-goblin",  isLegacy: true },
  bat:    { nameHe: "עטלף הטעויות",  nameEn: "Mistake Bat",     glow: "rgba(167,139,250,0.80)", size: 300, spawnY: 30, slug: "mistake-bat",      isLegacy: true },
  giant:  { nameHe: "ענק הזיכרון",   nameEn: "Memory Giant",    glow: "rgba(220,220,255,0.85)", size: 380, spawnY: 55, slug: "memory-giant",     isLegacy: true },
  wizard: { nameHe: "קוסם הבלבול",   nameEn: "Confusion Wizard", glow: "rgba(168,85,247,0.85)", size: 340, spawnY: 50, slug: "confusion-wizard", isLegacy: true },
};

export function getEnemyName(_worldId: string | null): string {
  return VARIANT_META["prisma"].nameHe;
}

export function getEnemyNameByVariant(variant: EnemyVariant): string {
  return VARIANT_META[variant].nameHe;
}

export function getEnemyMeta(variant: EnemyVariant) {
  const m = VARIANT_META[variant];
  const slug = m.slug ?? variant;
  return { ...m, src: `/enemies/${slug}-1.png` };
}

/** Returns the default spawn Y% for this variant. */
export function getEnemySpawnY(variant: EnemyVariant): number {
  return VARIANT_META[variant].spawnY;
}

export interface CrystalEnemyProps {
  worldId?:    string | null;
  variant?:    EnemyVariant;
  size?:       number;
  damaged?:    boolean;
  hp?:         number;
  showName?:   boolean;
  enemyX?:     number;
  heroX?:      number;
  /** @deprecated */
  facingDeg?:  number;
  animPhase?:  number;
  attacking?:  boolean;
  locked?:     boolean;
  enemyAngle?: "front" | "right" | "left";
}

export function CrystalEnemy({
  variant,
  size,
  damaged   = false,
  hp        = 100,
  showName  = true,
  enemyX,
  heroX,
  facingDeg = 180,
  animPhase = 0,
  attacking = false,
  locked    = false,
  enemyAngle,
}: CrystalEnemyProps) {
  const v    = variant ?? "prisma";
  const meta = VARIANT_META[v];
  const px   = size ?? meta.size;
  const slug = meta.slug ?? v;

  const shouldFaceLeft: boolean =
    enemyX !== undefined && heroX !== undefined
      ? enemyX > heroX
      : (((facingDeg % 360) + 360) % 360 > 180);

  let src: string;
  let useScaleFlip: boolean;
  let rotateY: number;

  if (meta.isLegacy) {
    // Old enemies: single front-facing sprite, flipped via scaleX(-1) for direction.
    src = attacking ? `/enemies/${slug}-5.png` : `/enemies/${slug}-1.png`;
    useScaleFlip = shouldFaceLeft;
    rotateY = shouldFaceLeft ? -18 : 18;
  } else {
    // New crystal enemies: 3-directional sprites.
    const derivedAngle: "front" | "right" | "left" =
      enemyAngle ??
      (enemyX !== undefined
        ? enemyX > 55 ? "right" : "left"
        : (((facingDeg % 360) + 360) % 360 <= 180 ? "right" : "left"));

    src =
      derivedAngle === "right"
        ? `/enemies/${v}-2.png`
        : derivedAngle === "left"
        ? `/enemies/${v}-3.png`
        : `/enemies/${v}-1.png`;

    useScaleFlip = derivedAngle === "right" && shouldFaceLeft;
    rotateY = shouldFaceLeft ? -20 : 20;
  }

  const lowHp = hp <= 30;
  const dropShadow = damaged
    ? "drop-shadow(0 0 22px rgba(255,60,60,0.95)) drop-shadow(0 0 8px white)"
    : lowHp
    ? `drop-shadow(0 0 14px rgba(255,80,80,0.7)) drop-shadow(0 0 20px ${meta.glow})`
    : `drop-shadow(0 0 18px ${meta.glow}) drop-shadow(0 2px 6px rgba(0,0,0,0.55))`;

  const crystalGlow =
    "drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 0 18px rgba(220,220,255,0.75)) drop-shadow(0 0 30px rgba(200,200,255,0.50))";

  const bob = Math.sin(animPhase * Math.PI * 2) * 4;

  const clampedHp = Math.max(0, Math.min(100, hp));
  const minPx     = Math.round(px * 0.5);
  const visualPx  = Math.round(minPx + (px - minPx) * (clampedHp / 100));

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
          width: visualPx,
          height: visualPx,
          position: "relative",
          filter: dropShadow,
          opacity: 1,
          transition: "filter 0.2s ease, width 0.35s ease-out, height 0.35s ease-out",
          willChange: "filter, width, height",
        }}
      >
        {locked && (
          <>
            <div style={{
              position: "absolute", inset: -14, borderRadius: "50%",
              border: "2px solid rgba(220,235,255,0.75)",
              boxShadow: "0 0 14px rgba(200,220,255,0.55), inset 0 0 18px rgba(220,235,255,0.18)",
              background: "rgba(220,235,255,0.04)",
              animation: "target-lock-ring 1.1s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: -26, borderRadius: "50%",
              border: "1px dashed rgba(200,220,255,0.35)",
              animation: "target-lock-spin 4s linear infinite",
              pointerEvents: "none",
            }} />
          </>
        )}
        <img
          src={src}
          alt={meta.nameHe}
          draggable={false}
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            transform: `perspective(300px) ${useScaleFlip ? "scaleX(-1) " : ""}rotateY(${rotateY}deg) translateY(${bob}px)`,
            filter: crystalGlow,
            willChange: "transform, filter",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </div>

      {showName && (
        <span
          className="text-xs font-bold text-center leading-tight"
          style={{ color: "rgba(255,200,200,0.9)", textShadow: "0 0 8px rgba(255,0,0,0.4)" }}
        >
          {meta.nameHe}
        </span>
      )}
    </div>
  );
}

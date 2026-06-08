"use client";

import React from "react";

export type EnemyVariant = "prisma" | "orion" | "luma" | "gembo" | "bubli";

export const ENEMY_VARIANTS: EnemyVariant[] = ["prisma", "orion", "luma", "gembo", "bubli"];
export const ENEMY_COUNT = ENEMY_VARIANTS.length;

/** Returns the enemy variant for a given 0-based index, cycling through all 5. */
export function getEnemyVariantByIndex(index: number): EnemyVariant {
  return ENEMY_VARIANTS[((index % ENEMY_COUNT) + ENEMY_COUNT) % ENEMY_COUNT];
}

/** @deprecated Use getEnemyVariantByIndex. Kept for any callers that pass worldId. */
export function getEnemyVariant(_worldId: string | null): EnemyVariant {
  return "prisma";
}

// Each enemy maps to an existing asset slug until dedicated crystal art is delivered.
// spawnY: default y% position when entering from the right side of the arena.
const VARIANT_META: Record<
  EnemyVariant,
  { nameHe: string; nameEn: string; glow: string; size: number; slug: string; spawnY: number }
> = {
  prisma: { nameHe: "פריזמה", nameEn: "Crystal Butterfly", glow: "rgba(103,232,249,0.85)", size: 300, slug: "question-goblin",   spawnY: 67 },
  orion:  { nameHe: "אוריון",  nameEn: "Crystal Owl",       glow: "rgba(251,191,36,0.85)",  size: 340, slug: "mistake-bat",       spawnY: 18 },
  luma:   { nameHe: "לומה",   nameEn: "Crystal Bird",      glow: "rgba(147,197,253,0.85)", size: 360, slug: "memory-giant",     spawnY: 28 },
  gembo:  { nameHe: "גמבו",   nameEn: "Crystal Turtle",    glow: "rgba(74,222,128,0.85)",  size: 380, slug: "confusion-wizard", spawnY: 60 },
  bubli:  { nameHe: "בובלי",  nameEn: "Crystal Slime",     glow: "rgba(232,121,249,0.85)", size: 320, slug: "question-goblin",  spawnY: 72 },
};

export function getEnemyName(_worldId: string | null): string {
  return VARIANT_META["prisma"].nameHe;
}

export function getEnemyNameByVariant(variant: EnemyVariant): string {
  return VARIANT_META[variant].nameHe;
}

export function getEnemyMeta(variant: EnemyVariant) {
  const m = VARIANT_META[variant];
  return { ...m, src: `/enemies/${m.slug}-1.png` };
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
  /** Arena-% X position of the enemy. Used to select directional sprite and facing. */
  enemyX?:     number;
  /** Arena-% X position of the hero. When enemyX > heroX the enemy faces LEFT (toward hero). */
  heroX?:      number;
  /** @deprecated — pass enemyX + heroX instead */
  facingDeg?:  number;
  animPhase?:  number;
  attacking?:  boolean;
  locked?:     boolean;
  /**
   * Which of the 3 directional sprites to show:
   *  "right"  — enemy is moving left (entering from right side of arena)
   *  "left"   — enemy is at battle position, facing the hero on the left
   *  "front"  — face-on (reserved for special states)
   * Derived automatically from enemyX when not provided.
   */
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

  // Derive angle from position if not explicitly passed.
  // Enemy always enters from x≈90% and approaches hero at x≈35%.
  // While x > 55, it's still in "entry approach" → show right-facing sprite.
  const derivedAngle: "front" | "right" | "left" =
    enemyAngle ??
    (enemyX !== undefined
      ? enemyX > 55 ? "right" : "left"
      : (((facingDeg % 360) + 360) % 360 <= 180 ? "right" : "left"));

  // Select sprite based on angle and action:
  //   attacking       → -5.png  (attack pose)
  //   right approach  → -2.png  (entry/movement frame — side view approaching)
  //   left / at rest  → -1.png  (idle combat frame — facing hero)
  //   front (special) → -1.png  (fallback)
  const src = attacking
    ? `/enemies/${meta.slug}-5.png`
    : derivedAngle === "right"
    ? `/enemies/${meta.slug}-2.png`
    : `/enemies/${meta.slug}-1.png`;

  // Apply 3D perspective rotation to simulate a side profile view.
  // rotateY(-40deg) → faces left (toward hero when enemy is on the right).
  // rotateY(+40deg) → faces right (entry approach from right edge).
  const shouldFaceLeft: boolean =
    enemyX !== undefined && heroX !== undefined
      ? enemyX > heroX
      : derivedAngle !== "right";

  const rotateY = shouldFaceLeft ? -40 : 40;

  const lowHp = hp <= 30;
  const dropShadow = damaged
    ? "drop-shadow(0 0 22px rgba(255,60,60,0.95)) drop-shadow(0 0 8px white)"
    : lowHp
    ? `drop-shadow(0 0 14px rgba(255,80,80,0.7)) drop-shadow(0 0 20px ${meta.glow})`
    : `drop-shadow(0 0 18px ${meta.glow}) drop-shadow(0 2px 6px rgba(0,0,0,0.55))`;

  // Crystal aura: white outline glow hugging the sprite silhouette
  const crystalGlow =
    "drop-shadow(0 0 8px rgba(255,255,255,0.95)) drop-shadow(0 0 18px rgba(220,220,255,0.75)) drop-shadow(0 0 30px rgba(200,200,255,0.50))";

  const bob = Math.sin(animPhase * Math.PI * 2) * 4;

  // Size shrinks with HP: 100% HP → full size; 0% HP → 50% floor.
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
            transform: `perspective(300px) rotateY(${rotateY}deg) translateY(${bob}px)`,
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

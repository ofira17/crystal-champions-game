"use client";

import React from "react";

export type EnemyVariant = "goblin" | "bat" | "giant" | "wizard";

export const ENEMY_VARIANTS: EnemyVariant[] = ["goblin", "bat", "giant", "wizard"];

const VARIANT_META: Record<EnemyVariant, { nameHe: string; glow: string; size: number; slug: string }> = {
  goblin: { nameHe: "גובלין השאלות",  glow: "rgba(74, 222, 128, 0.75)",  size: 260, slug: "question-goblin" },
  bat:    { nameHe: "עטלף הטעויות",   glow: "rgba(167, 139, 250, 0.80)", size: 280, slug: "mistake-bat" },
  giant:  { nameHe: "ענק הזיכרון",     glow: "rgba(251, 113,  30, 0.90)", size: 340, slug: "memory-giant" },
  wizard: { nameHe: "קוסם הבלבול",     glow: "rgba(168, 85, 247, 0.85)",  size: 300, slug: "confusion-wizard" },
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

export interface CrystalEnemyProps {
  worldId?:    string | null;
  variant?:    EnemyVariant;
  size?:       number;
  damaged?:    boolean;
  hp?:         number;
  showName?:   boolean;
  /** Arena-% X position of the enemy. Used with heroX for position-based flip. */
  enemyX?:     number;
  /** Arena-% X position of the hero. When enemyX > heroX the enemy faces LEFT (toward hero). */
  heroX?:      number;
  /** @deprecated — pass enemyX + heroX instead */
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
  enemyX,
  heroX,
  facingDeg = 180,
  animPhase = 0,
  attacking = false,
  locked    = false,
}: CrystalEnemyProps) {
  const v    = variant ?? worldToVariant(worldId);
  const meta = VARIANT_META[v];
  const px   = size ?? meta.size;

  // Sprites are front-facing PNGs. We use a 3D perspective rotation to simulate
  // a side-profile view so the enemy always appears to face toward the hero.
  // Rule: enemy is always positioned RIGHT of the hero → must face LEFT.
  const src = attacking
    ? `/enemies/${meta.slug}-5.png`
    : `/enemies/${meta.slug}-1.png`;

  // Derive facing from actual arena positions when available; fall back to angle.
  const shouldFaceLeft: boolean =
    enemyX !== undefined && heroX !== undefined
      ? enemyX > heroX          // enemy is RIGHT of hero → face LEFT toward hero
      : ((facingDeg % 360) + 360) % 360 > 180; // legacy fallback

  // Apply a 3D perspective rotation to simulate a side/profile view from the
  // front-facing sprite. rotateY(-40deg) makes the sprite appear to face left;
  // rotateY(40deg) makes it appear to face right.
  const rotateY = shouldFaceLeft ? -40 : 40;
  // flipX not needed — rotateY already implies the correct facing direction.
  const flipX = 1;

  const lowHp = hp <= 30;
  const dropShadow = damaged
    ? "drop-shadow(0 0 22px rgba(255,60,60,0.95)) drop-shadow(0 0 8px white)"
    : lowHp
    ? `drop-shadow(0 0 14px rgba(255,80,80,0.7)) drop-shadow(0 0 20px ${meta.glow})`
    : `drop-shadow(0 0 18px ${meta.glow}) drop-shadow(0 2px 6px rgba(0,0,0,0.55))`;

  const bob = Math.sin(animPhase * Math.PI * 2) * 4;

  // Size shrinks with HP: at 100 HP → base px (large); at 0 HP → SMALL_PX (old tiny size).
  // Direct width/height (no CSS scale) so overflow:hidden on the arena never clips the sprite.
  const SMALL_PX = 120;
  const clampedHp = Math.max(0, Math.min(100, hp));
  const visualPx = Math.round(SMALL_PX + (px - SMALL_PX) * (clampedHp / 100));

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
            {/* Pulsing lock ring */}
            <div style={{
              position: "absolute",
              inset: -14,
              borderRadius: "50%",
              border: "2px solid rgba(255,220,80,0.75)",
              boxShadow: "0 0 14px rgba(255,220,80,0.55), inset 0 0 18px rgba(255,220,80,0.18)",
              background: "rgba(255,220,80,0.04)",
              animation: "target-lock-ring 1.1s ease-in-out infinite",
              pointerEvents: "none",
            }} />
            {/* Outer rotating dashes */}
            <div style={{
              position: "absolute",
              inset: -26,
              borderRadius: "50%",
              border: "1px dashed rgba(255,220,80,0.35)",
              animation: "target-lock-spin 4s linear infinite",
              pointerEvents: "none",
            }} />
          </>
        )}
        {/* Yellow aura behind sprite */}
        <div style={{
          position: "absolute",
          inset: "-18%",
          borderRadius: "50%",
          background: "radial-gradient(ellipse at center, rgba(255,230,80,0.28) 0%, rgba(255,200,40,0.14) 45%, transparent 75%)",
          boxShadow: "0 0 32px 8px rgba(255,220,60,0.35), 0 0 12px 4px rgba(255,200,40,0.25)",
          pointerEvents: "none",
          zIndex: 0,
        }} />
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
            transform: `perspective(300px) rotateY(${rotateY}deg) translateY(${bob}px) scaleX(${flipX})`,
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

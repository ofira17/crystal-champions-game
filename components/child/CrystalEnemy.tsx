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

const VARIANT_META: Record<EnemyVariant, { nameHe: string; glow: string; size: number; src: string }> = {
  goblin: { nameHe: "גובלין השאלות",  glow: "rgba(74, 222, 128, 0.75)",  size: 160, src: "/enemies/question-goblin-idle.png" },
  bat:    { nameHe: "עטלף הטעויות",   glow: "rgba(167, 139, 250, 0.80)", size: 170, src: "/enemies/mistake-bat-idle.png" },
  giant:  { nameHe: "ענק הזיכרון",     glow: "rgba(251, 113,  30, 0.90)", size: 220, src: "/enemies/memory-giant-idle.png" },
  wizard: { nameHe: "קוסם הבלבול",     glow: "rgba(168, 85, 247, 0.85)",  size: 180, src: "/enemies/confusion-wizard-idle.png" },
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
  const bob = Math.sin(animPhase * Math.PI * 2) * 4;
  void flap;

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
        <img
          src={meta.src}
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
            transform: `rotate(${-facingDeg}deg)`,
          }}
        >
          {meta.nameHe}
        </span>
      )}
    </div>
  );
}

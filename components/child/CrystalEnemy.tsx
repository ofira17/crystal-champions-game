"use client";

import React from "react";

// ── Explicit world-to-enemy overrides (add real worldIds here) ────────────────
// Example:  "uuid-of-world-1": 0,  "uuid-of-world-2": 1, ...
const WORLD_ENEMY_MAP: Record<string, number> = {};

export const ENEMY_COUNT = 6;

function worldToIndex(worldId: string | null): number {
  if (!worldId) return 0;
  if (worldId in WORLD_ENEMY_MAP) return WORLD_ENEMY_MAP[worldId];
  const hash = worldId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return hash % ENEMY_COUNT;
}

// ── Enemy definitions ─────────────────────────────────────────────────────────
const ENEMIES: { nameHe: string; image: string; glowColor: string }[] = [
  {
    nameHe:    "שומר הקריסטל",
    image:     "/enemies/enemy-0.png",
    glowColor: "rgba(56, 189, 248, 0.6)",
  },
  {
    nameHe:    "ענק הקרח",
    image:     "/enemies/enemy-1.png",
    glowColor: "rgba(147, 223, 255, 0.6)",
  },
  {
    nameHe:    "שומר הסערה",
    image:     "/enemies/enemy-2.png",
    glowColor: "rgba(167, 139, 250, 0.6)",
  },
  {
    nameHe:    "מגן היער",
    image:     "/enemies/enemy-3.png",
    glowColor: "rgba(74, 222, 128, 0.6)",
  },
  {
    nameHe:    "שומר הלבה",
    image:     "/enemies/enemy-4.png",
    glowColor: "rgba(251, 113, 30, 0.7)",
  },
  {
    nameHe:    "מגן הג׳ונגל",
    image:     "/enemies/enemy-5.png",
    glowColor: "rgba(52, 211, 153, 0.6)",
  },
];

// ── Main export ───────────────────────────────────────────────────────────────
export interface CrystalEnemyProps {
  worldId:   string | null;
  size?:     number;
  damaged?:  boolean;
  hp?:       number;
  showName?: boolean;
}

export function CrystalEnemy({
  worldId,
  size     = 120,
  damaged  = false,
  hp       = 100,
  showName = true,
}: CrystalEnemyProps) {
  const idx   = worldToIndex(worldId);
  const enemy = ENEMIES[idx];

  const lowHp = hp <= 30;

  const dropShadow = damaged
    ? "drop-shadow(0 0 22px rgba(255,60,60,0.95)) drop-shadow(0 0 8px white)"
    : lowHp
    ? `drop-shadow(0 0 14px rgba(255,80,80,0.7)) drop-shadow(0 0 20px ${enemy.glowColor})`
    : `drop-shadow(0 0 20px ${enemy.glowColor}) drop-shadow(0 2px 8px rgba(0,0,0,0.5))`;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div
        className={damaged ? "enemy-crystal-hit" : ""}
        style={{ position: "relative", display: "inline-flex", alignItems: "flex-end" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={enemy.image}
          alt={enemy.nameHe}
          style={{
            height: size,
            width:  "auto",
            display: "block",
            background: "transparent",
            filter:     dropShadow,
            opacity:    Math.max(0.15, hp / 100),
            transition: "filter 0.2s ease, opacity 0.5s ease",
          }}
        />
        {lowHp && (
          <div
            className="absolute inset-0 pointer-events-none animate-pulse"
            style={{ background: "radial-gradient(circle at 50% 60%, rgba(255,0,0,0.15) 0%, transparent 65%)" }}
          />
        )}
      </div>

      {showName && (
        <span
          className="text-xs font-bold text-center leading-tight"
          style={{ color: "rgba(255,120,120,0.85)", textShadow: "0 0 8px rgba(255,0,0,0.4)" }}
        >
          {enemy.nameHe}
        </span>
      )}
    </div>
  );
}

/** Returns only the enemy name for a given worldId */
export function getEnemyName(worldId: string | null): string {
  return ENEMIES[worldToIndex(worldId)].nameHe;
}

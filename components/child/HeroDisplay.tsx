"use client";

import Image from "next/image";

// ── Real hero images ──────────────────────────────────────────────────────────
// boy-0..10 and girl-0..9 live in /public/heroes/
// gilad_01..16 live in /public/heroes/gilad/

const GILAD_IMAGES = Array.from({ length: 16 }, (_, i) => `/heroes/gilad/gilad_v2_${String(i + 1).padStart(2, "0")}.png`);

const BOY_IMAGES = [
  "/heroes/boy-0.png",   // storm / default  — dark blue
  "/heroes/boy-1.png",   // gold             — blue + gold
  "/heroes/boy-2.png",   // nature           — green
  "/heroes/boy-3.png",   // fire             — red/orange
  "/heroes/boy-4.png",   // thunder          — lightning blue
  "/heroes/boy-5.png",   // ice              — white/crystal
  "/heroes/boy-6.png",   // crystal/shadow   — purple
  "/heroes/boy-7.png",   // ocean simple     — plain blue
  "/heroes/boy-8.png",   // ocean wave       — wave blue
  "/heroes/boy-9.png",   // galaxy/star      — purple/cosmic
  "/heroes/boy-10.png",  // legendary        — blue/gold crown
];

const GIRL_IMAGES = [
  "/heroes/girl-0.png",  // storm / default  — purple
  "/heroes/girl-1.png",  // ice              — blue/white
  "/heroes/girl-2.png",  // crystal          — purple darker
  "/heroes/girl-3.png",  // nature           — purple/green
  "/heroes/girl-4.png",  // fire             — pink/gold
  "/heroes/girl-5.png",  // thunder          — blue electric
  "/heroes/girl-6.png",  // gold/sun         — gold/purple
  "/heroes/girl-7.png",  // cosmic/star      — cosmic
  "/heroes/girl-8.png",  // legendary        — purple/gold
  "/heroes/girl-9.png",  // ocean/shadow     — purple simple
];

const BOY_THEME_INDEX: Record<string, number> = {
  default: 0, storm: 0,
  gold: 1,
  nature: 2, teal: 2,
  fire: 3, dragon: 3, lava: 3,
  thunder: 4, yellow: 4,
  ice: 5,
  crystal: 6, shadow: 6, pink: 6, stone: 6,
  ocean: 8,
  star: 9, galaxy: 9, cosmic: 9,
};

const GIRL_THEME_INDEX: Record<string, number> = {
  default: 0, storm: 0,
  ice: 1,
  crystal: 2,
  nature: 3, teal: 3,
  fire: 4, dragon: 4, pink: 4,
  thunder: 5, yellow: 5,
  gold: 6, sun: 6,
  star: 7, cosmic: 7,
  shadow: 9, ocean: 9,
};

/** Returns the image path for a hero based on gender, theme and which skin slot is active */
function getHeroImage(gender: "M" | "F", colorTheme: string, skinIndex: number): string {
  if (colorTheme === "stone" || colorTheme === "gilad") {
    return GILAD_IMAGES[skinIndex % GILAD_IMAGES.length];
  }
  const images = gender === "M" ? BOY_IMAGES : GIRL_IMAGES;
  if (skinIndex > 0) {
    return images[skinIndex % images.length];
  }
  const themeMap = gender === "M" ? BOY_THEME_INDEX : GIRL_THEME_INDEX;
  const idx = themeMap[colorTheme] ?? 0;
  return images[idx];
}

// ── Glow ring colours per rarity ──────────────────────────────────────────────
const RARITY_GLOW: Record<string, string> = {
  Common:    "ring-2 ring-slate-400/60",
  Rare:      "ring-2 ring-blue-400/70",
  Epic:      "ring-[3px] ring-violet-400/80",
  Legendary: "ring-[3px] ring-amber-400 legendary-glow",
};

const RARITY_BADGE: Record<string, { symbol: string; className: string }> = {
  Rare:      { symbol: "●", className: "text-blue-400" },
  Epic:      { symbol: "◆", className: "text-violet-400" },
  Legendary: { symbol: "★", className: "text-shimmer" },
};

// ── Size map — width controls grid; xl gets a taller portrait ─────────────────
const SIZE_MAP = {
  sm: { w: 80,  h: 104, containerW: "w-20",  containerH: "h-[104px]", name: "text-xs",   shadow: "w-14 h-2.5" },
  md: { w: 112, h: 146, containerW: "w-28",  containerH: "h-[146px]", name: "text-xs",   shadow: "w-20 h-3"   },
  lg: { w: 144, h: 187, containerW: "w-36",  containerH: "h-[187px]", name: "text-sm",   shadow: "w-28 h-3.5" },
  xl: { w: 200, h: 260, containerW: "w-[200px]", containerH: "h-[260px]", name: "text-base", shadow: "w-36 h-4" },
};

interface Props {
  heroName:   string;
  heroType?:  string;
  imageUrl?:  string | null;
  gender?:    "M" | "F";
  heroIndex?: number;
  skinIndex?: number;
  rarity?:    string;
  isActive:   boolean;
  size?:      "sm" | "md" | "lg" | "xl";
  showName?:  boolean;
}

export function HeroDisplay({
  heroName,
  heroType  = "default",
  gender    = "M",
  heroIndex = 0,
  skinIndex = 0,
  rarity    = "Common",
  isActive,
  size      = "lg",
  showName  = true,
}: Props) {
  const sz      = SIZE_MAP[size];
  const imgSrc  = getHeroImage(gender, heroType, skinIndex);
  const ring    = RARITY_GLOW[rarity] ?? RARITY_GLOW.Common;
  const badge   = RARITY_BADGE[rarity];
  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <div className="relative">
        {/* Portrait frame */}
        <div className={`
          relative ${sz.containerW} ${sz.containerH}
          rounded-2xl overflow-hidden
          ${ring}
          shadow-2xl
          ${isActive ? "ring-offset-2 ring-offset-black" : ""}
        `}>
          <Image
            src={imgSrc}
            alt={heroName}
            width={sz.w}
            height={sz.h}
            className="w-full h-full object-cover object-top"
            unoptimized
            priority
          />

          {/* Active shimmer overlay */}
          {isActive && (
            <div className="absolute inset-0 bg-white/8 animate-pulse pointer-events-none rounded-2xl" />
          )}

          {/* Legendary sparkle overlay */}
          {rarity === "Legendary" && (
            <div className="absolute inset-0 pointer-events-none">
              <span className="absolute top-2 right-2 text-xs text-amber-300 animate-bounce">✦</span>
              <span className="absolute top-2 left-2 text-xs text-amber-300 animate-bounce" style={{ animationDelay: "0.4s" }}>✦</span>
              <span className="absolute bottom-8 right-3 text-xs text-amber-300 animate-bounce" style={{ animationDelay: "0.2s" }}>✦</span>
            </div>
          )}
        </div>

        {/* Rarity badge */}
        {badge && (
          <div className="absolute -top-1 -left-1 bg-black/80 backdrop-blur-sm rounded-full px-1.5 py-0.5 text-xs font-bold border border-white/20">
            <span className={badge.className}>{badge.symbol}</span>
          </div>
        )}
      </div>

      {/* Ground shadow */}
      <div
        className={`${sz.shadow} rounded-full bg-black/40 blur-md -mt-1`}
        style={{ opacity: isActive ? 0.7 : 0.3 }}
      />

      {showName && (
        <p className={`text-white/80 ${sz.name} font-semibold tracking-wide text-center leading-tight`}>
          {heroName}
        </p>
      )}
    </div>
  );
}

// ── Exported helper so HeroCollection can build skin thumbnails ───────────────
export { getHeroImage, BOY_IMAGES, GIRL_IMAGES, GILAD_IMAGES };

export type DiamondType = "blue" | "red" | "gold" | "rainbow";

/** Infer diamond type from Grade 1 math question text when difficulty field is absent. */
function inferFromText(text: string): DiamondType {
  const nums = text.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return "blue";
  const max = Math.max(...nums);
  // Whole tens (20, 30, … 100) or numbers up to 20 → red
  const hasWholeTen = nums.some(n => n > 10 && n % 10 === 0 && n <= 100);
  if (hasWholeTen || (max > 10 && max <= 20)) return "red";
  if (max <= 10) return "blue";
  return "blue";
}

/**
 * Returns the diamond/beam visual type for a crystal shot.
 * Used ONLY for beam/projectile/effect visuals.
 * Does NOT affect questions, correctness, Grade 1 validation, rewards, enemies, or auth.
 *
 * Priority:
 * 1. isBossQuestion / difficulty=challenge / castle-door mode → rainbow
 * 2. streak ≥ 3 → gold
 * 3. difficulty: easy→blue, medium→red, hard→rainbow
 * 4. Grade 1 text inference
 * 5. unknown → blue
 */
export function getDiamondType(
  questionText: string,
  difficulty: string,
  streak: number,
  isBossQuestion = false,   // pass true for boss / challenge / castle-door context
): DiamondType {
  const d = (difficulty ?? "").toLowerCase();
  // 1. Boss / challenge / castle-door → rainbow
  if (isBossQuestion || d === "challenge") return "rainbow";
  // 2. 3+ correct streak → gold
  if (streak >= 3) return "gold";
  // 3. Known difficulty field
  if (d === "easy")   return "blue";
  if (d === "medium") return "red";
  if (d === "hard")   return "rainbow";
  // 4. Infer from Grade 1 math question text
  return inferFromText(questionText);
}

/** Diamond projectile CSS per type. */
export const DIAMOND_STYLES: Record<DiamondType, {
  size: number;
  background: string;
  boxShadow: string;
}> = {
  blue: {
    size: 40,
    background: "linear-gradient(160deg, #ffffff 0%, #bfefff 25%, #22d3ee 60%, #0891b2 100%)",
    boxShadow: "0 0 20px rgba(34,211,238,1), 0 0 40px rgba(6,182,212,0.9), 0 0 60px rgba(34,211,238,0.5), 0 0 10px white",
  },
  red: {
    size: 44,
    background: "linear-gradient(160deg, #ffffff 0%, #fecaca 25%, #ef4444 60%, #b91c1c 100%)",
    boxShadow: "0 0 22px rgba(239,68,68,1), 0 0 44px rgba(185,28,28,0.9), 0 0 10px white",
  },
  gold: {
    size: 52,
    background: "linear-gradient(160deg, #fff7c2 0%, #fde047 35%, #f59e0b 70%, #b45309 100%)",
    boxShadow: "0 0 28px rgba(253,224,71,1), 0 0 56px rgba(245,158,11,0.9), 0 0 12px white",
  },
  rainbow: {
    size: 52,
    background: "linear-gradient(160deg, #ff0080 0%, #ff8c00 20%, #ffd700 35%, #00e676 50%, #00bfff 70%, #bf00ff 100%)",
    boxShadow: "0 0 28px rgba(255,0,128,0.85), 0 0 28px rgba(0,191,255,0.75), 0 0 56px rgba(255,215,0,0.7), 0 0 14px white",
  },
};

/** SVG beam color config per diamond type. */
export const BEAM_COLORS: Record<DiamondType, {
  c0: string; c1: string; c2: string;
  halo: string; mid: string; dot: string;
}> = {
  blue: {
    c0: "#22d3ee", c1: "#67e8f9", c2: "#f0f9ff",
    halo: "34,211,238", mid: "103,232,249", dot: "34,211,238",
  },
  red: {
    c0: "#ef4444", c1: "#f87171", c2: "#fff5f5",
    halo: "239,68,68", mid: "248,113,113", dot: "239,68,68",
  },
  gold: {
    c0: "#fde047", c1: "#fbbf24", c2: "#fff7c2",
    halo: "253,224,71", mid: "251,191,36", dot: "253,224,71",
  },
  rainbow: {
    c0: "#ff0080", c1: "#00bfff", c2: "#ffd700",
    halo: "255,0,128", mid: "0,191,255", dot: "255,215,0",
  },
};

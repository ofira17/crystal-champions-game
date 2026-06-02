// ══════════════════════════════════════════════════════════
// Dual-language terminology system
//
// RULE: Adults manage learning. The child experiences adventure.
//
// Parent sees: clear educational management terms
// Child sees:  pure gaming language
//   FORBIDDEN in child UI: משימה, תרגול, סט תרגול, שאלות,
//   מבחן, שיעורי בית, מספר שאלות, אסטרטגיית תרגול, בנק שאלות
// ══════════════════════════════════════════════════════════

export type MissionType = "treasure_map" | "hero_training" | "world_mysteries";

// ── Parent (management) language ─────────────────────────

export const PARENT_MISSION_LABELS: Record<MissionType, string> = {
  treasure_map:    "מפת אוצר סודית",
  hero_training:   "אימון גיבור יומי",
  world_mysteries: "תעלומות העולם",
};

export const PARENT_MISSION_DESCRIPTIONS: Record<MissionType, string> = {
  treasure_map:    "הכנה לבחינה ספציפית / העלאת קובץ מותאם אישית",
  hero_training:   "תרגול תכנית לימודים שגרתית לפי כיתה",
  world_mysteries: "ידע כללי ושאלות מרתקות לגיל",
};

export const PARENT_MISSION_ICONS: Record<MissionType, string> = {
  treasure_map:    "🗺️",
  hero_training:   "⚔️",
  world_mysteries: "🌍",
};

// Subjects as the adult sees them in management screens
export const PARENT_SUBJECTS = [
  "חשבון",
  "עברית",
  "אנגלית",
  "מדעים",
  "היסטוריה",
  'תנ"ך',
  "גיאוגרפיה",
  "אמנות",
  // Legacy names kept for backwards compat with existing DB data
  "מתמטיקה",
  "שפה",
] as const;

export type ParentSubject = typeof PARENT_SUBJECTS[number];

// ── Child (gaming) language ───────────────────────────────
// !! Do NOT add educational words here !!

export const CHILD_ADVENTURE_TITLE = "ההרפתקה הנוכחית";
export const CHILD_ARENA_BUTTON    = "🎮 כניסה לזירה!";

export const CHILD_HERO_RESTING_TEXT = "הגיבור שלך נח ואוגר כוח להרפתקה הבאה";
export const CHILD_HERO_ACTIVE_TEXT  = "הגיבור שלך מוכן להיכנס לזירה!";

export const CHILD_ADVENTURE_LABELS: Record<MissionType, string> = {
  treasure_map:    "קרב מול הבוס",
  hero_training:   "אזור כוח קריסטל",
  world_mysteries: "תעלומות העולם",
};

export const CHILD_ADVENTURE_SUBTITLES: Record<MissionType, string> = {
  treasure_map:    "שער הקריסטל פתוח — הבוס מחכה!",
  hero_training:   "שלב חדש נפתח — טען את כוחות הגיבור",
  world_mysteries: "תעלומות חדשות התגלו ברחבי העולם",
};

// Alias used in parent dashboard to show what the child sees
export const CHILD_MISSION_LABELS = CHILD_ADVENTURE_LABELS;

export const CHILD_ADVENTURE_ICONS: Record<MissionType, string> = {
  treasure_map:    "💎",
  hero_training:   "⚡",
  world_mysteries: "🌌",
};

// ── Strategy → child-facing arena threat ─────────────────
// The adult selection_strategy is NEVER shown to the child.
// Instead the child sees what kind of "combat event" is happening.

export type SelectionStrategyKey =
  | "random"
  | "weakest_topics"
  | "unattempted"
  | "previously_wrong"
  | "mixed";

export const STRATEGY_TO_ARENA_THREAT: Record<SelectionStrategyKey, string> = {
  previously_wrong: "התקפות שחוזרות לזירה",
  weakest_topics:   "מחסומי אנרגיה חזקים",
  unattempted:      "שערים חדשים שלא נפתחו",
  random:           "התקפות פתע",
  mixed:            "קרב משולב",
};

export function mapStrategyToArenaThreat(strategy: string): string {
  return STRATEGY_TO_ARENA_THREAT[strategy as SelectionStrategyKey]
    ?? "התקפות פתע";
}

// ── Subject → child-facing Power Zone ────────────────────
// Adults see "חשבון". The child sees "אזור כוח ההיגיון".
// mapSubjectToPowerZone is the single source of truth.

const SUBJECT_POWER_ZONE_MAP: Record<string, string> = {
  // Current subject names
  "חשבון":      "אזור כוח ההיגיון",
  "עברית":      "אזור כוח המילים",
  "אנגלית":     "אזור התקשורת העולמית",
  "מדעים":      "מעבדת האנרגיה",
  "היסטוריה":   "מנהרת הזמן",
  'תנ"ך':       "שער הקריסטל העתיק",
  "גיאוגרפיה":  "מפת העולמות",
  "אמנות":      "מגדל היצירה",
  // Legacy names for backwards compat
  "מתמטיקה":    "אזור כוח ההיגיון",
  "שפה":        "אזור כוח המילים",
};

const SUBJECT_POWER_ZONE_ICON: Record<string, string> = {
  "חשבון":      "🔢",
  "עברית":      "📖",
  "אנגלית":     "🌐",
  "מדעים":      "⚗️",
  "היסטוריה":   "⏳",
  'תנ"ך':       "📜",
  "גיאוגרפיה":  "🗺️",
  "אמנות":      "🎨",
  "מתמטיקה":    "🔢",
  "שפה":        "📖",
};

export function mapSubjectToPowerZone(subject: string): string {
  return SUBJECT_POWER_ZONE_MAP[subject] ?? subject;
}

export function mapSubjectToPowerZoneIcon(subject: string): string {
  return SUBJECT_POWER_ZONE_ICON[subject] ?? "⚡";
}

// Kept for backwards compat with components that import these directly
export const SUBJECT_TO_POWER      = SUBJECT_POWER_ZONE_MAP      as Record<ParentSubject, string>;
export const SUBJECT_TO_POWER_ICON = SUBJECT_POWER_ZONE_ICON     as Record<ParentSubject, string>;

// ── Currency / stats labels (child-facing) ────────────────
export const CURRENCY_LABELS = {
  coins:  "מטבעות",
  stars:  "כוכבים",
  xp:     "XP",
  energy: "אנרגיה",
} as const;

export const CURRENCY_ICONS = {
  coins:  "🪙",
  stars:  "⭐",
  xp:     "✨",
  energy: "⚡",
} as const;

// ── World / battle feedback ────────────────────────────────
// Questions are combat events. Never say "שאלה" or "תשובה".

export const QUESTION_BATTLE_FRAMES = [
  "מכשול אנרגיה חוסם את דרכך!",
  "מפלצת הצל מטיחה מתקפה!",
  "חומת בוס — שבור אותה!",
  "כוח שדה מיסטי מופיע!",
  "האויב מטיל קסם — הגן על עצמך!",
] as const;

export const ANSWER_CORRECT_FRAMES = [
  "💥 נכון מאוד!",
  "⚡ כוח הקריסטל גדל!",
  "🔥 המחסום נשבר!",
  "🌟 מכה מושלמת!",
  "🎯 דיוק מרבי!",
  "💎 קריסטל נטען!",
  "🚀 קומבו ×2!",
] as const;

export const ANSWER_WRONG_FRAMES = [
  "🛡️ כמעט! נסה שוב בהמשך",
  "💨 הגיבור שלך לומד מזה",
  "⚠️ ננסה שוב בהמשך",
  "🔄 הגיבור מתחזק — קדימה!",
] as const;

// ── Rewards ───────────────────────────────────────────────

export interface BattleReward {
  xpGained:   number;
  crystals:   number;
  lootRarity: "Common" | "Rare" | "Epic" | "Legendary";
  lootType:   "skin" | "xp" | "crystal" | "hero";
  lootLabel:  string;
  lootIcon:   string;
}

export function rollRewardRarity(score: number, total: number): BattleReward["lootRarity"] {
  const pct = score / total;
  if (pct === 1)   return Math.random() < 0.15 ? "Legendary" : Math.random() < 0.4  ? "Epic" : "Rare";
  if (pct >= 0.8)  return Math.random() < 0.05 ? "Legendary" : Math.random() < 0.25 ? "Epic" : "Rare";
  if (pct >= 0.6)  return Math.random() < 0.15 ? "Rare" : "Common";
  return "Common";
}

// ── Grade labels ──────────────────────────────────────────

export const GRADE_LABELS: Record<string, string> = {
  "1": "כיתה א׳",
  "2": "כיתה ב׳",
  "3": "כיתה ג׳",
  "4": "כיתה ד׳",
  "5": "כיתה ה׳",
  "6": "כיתה ו׳",
};

// ── Priority resolver ─────────────────────────────────────

export function resolveActiveMission(
  hasActiveTreasureMap: boolean,
  configMissionType: MissionType
): MissionType {
  if (hasActiveTreasureMap) return "treasure_map";
  return configMissionType;
}

export function randomFrom<T extends readonly unknown[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)];
}

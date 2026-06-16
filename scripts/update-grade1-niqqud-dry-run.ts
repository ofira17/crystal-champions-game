/**
 * Grade 1 Niqqud Update Script — DRY RUN by default.
 *
 * What this script does:
 *   1. Loads the original Grade 1 question bank and the niqqud version.
 *   2. Compares them entry-by-entry.
 *   3. Prints a full report of what would change.
 *   4. Queries Supabase game_sessions for live rows that contain stored
 *      Grade 1 auto_questions without niqqud, and shows which sessions
 *      would be updated.
 *   5. NEVER writes to Supabase unless --apply is explicitly passed AND
 *      the env var CONFIRM_GRADE1_NIQQUD_UPDATE=true is set.
 *
 * Usage:
 *   DRY RUN (safe, default):
 *     npx tsx --env-file=.env.local scripts/update-grade1-niqqud-dry-run.ts
 *
 *   APPLY  ⚠️  DO NOT RUN WITHOUT USER APPROVAL:
 *     CONFIRM_GRADE1_NIQQUD_UPDATE=true \
 *       npx tsx --env-file=.env.local scripts/update-grade1-niqqud-dry-run.ts --apply
 *
 * Safety guarantees:
 *   - NEVER updates: id, correct_answer, difficulty, subject_he, grade_level,
 *     category, metadata, or schema.
 *   - ONLY updates: text_he, option_a_he, option_b_he, option_c_he,
 *     option_d_he, explanation_he  — and only where niqqud differs.
 *   - No data is written unless BOTH --apply AND CONFIRM_GRADE1_NIQQUD_UPDATE=true.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ─── ENV ────────────────────────────────────────────────────────────────────
// Attempt to load .env.local manually if env vars are not already set
// (fallback for environments where --env-file is not supported).
function loadEnvLocal() {
  const envPath = join(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local not present — rely on environment variables already set
  }
}
loadEnvLocal();

// ─── ARGS ───────────────────────────────────────────────────────────────────
const APPLY_MODE = process.argv.includes("--apply");
const CONFIRM_ENV = process.env["CONFIRM_GRADE1_NIQQUD_UPDATE"] === "true";

if (APPLY_MODE && !CONFIRM_ENV) {
  console.error("\n❌  STOPPED — apply mode requires:");
  console.error("    CONFIRM_GRADE1_NIQQUD_UPDATE=true  (env var)");
  console.error("    AND  --apply  (CLI flag)\n");
  console.error("    Set both explicitly to confirm you have reviewed the dry-run output.");
  process.exit(1);
}

// ─── INLINE GRADE 1 QUESTION DATA ───────────────────────────────────────────
// These are inlined here so this script has no dependency on server-only
// Next.js imports. They mirror lib/fallback-questions.ts and
// lib/fallback-questions_with_niqqud.ts exactly.

interface Q {
  text_he: string;
  option_a_he: string;
  option_b_he: string;
  option_c_he: string;
  option_d_he: string;
  correct_answer: string;
  explanation_he: string;
}

function makeQ(
  text_he: string, a: string, b: string, c: string, d: string,
  correct: "A" | "B" | "C" | "D",
): Q {
  const answer = correct === "A" ? a : correct === "B" ? b : correct === "C" ? c : d;
  return {
    text_he, option_a_he: a, option_b_he: b, option_c_he: c, option_d_he: d,
    correct_answer: correct,
    explanation_he: `התשובה הנכונה היא ${answer}`,
  };
}

// Original Grade 1 questions (no niqqud) — source: lib/fallback-questions.ts
const ORIGINAL_GRADE1: Q[] = [
  makeQ("כמה זה 2 ועוד 3?", "4", "5", "6", "7", "B"),
  makeQ("כמה זה 4 ועוד 4?", "6", "7", "8", "9", "C"),
  makeQ("כמה זה 6 פחות 2?", "3", "4", "5", "6", "B"),
  makeQ("כמה זה 8 פחות 3?", "4", "5", "6", "7", "B"),
  makeQ("כמה זה 1 ועוד 7?", "6", "7", "8", "9", "C"),
  makeQ("כמה זה 9 פחות 1?", "7", "8", "9", "10", "B"),
  makeQ("כמה זה 5 ועוד 2?", "6", "7", "8", "9", "B"),
  makeQ("כמה זה 10 פחות 4?", "5", "6", "7", "8", "B"),
  makeQ("כמה זה 3 ועוד 6?", "8", "9", "10", "7", "B"),
  makeQ("כמה זה 7 פחות 5?", "1", "2", "3", "4", "B"),
  makeQ("כמה זה 10 ועוד 5?", "12", "13", "15", "16", "C"),
  makeQ("כמה זה 12 פחות 2?", "8", "9", "10", "11", "C"),
  makeQ("כמה זה 6 ועוד 6?", "10", "11", "12", "13", "C"),
  makeQ("כמה זה 15 פחות 5?", "8", "9", "10", "11", "C"),
  makeQ("כמה זה 8 ועוד 2?", "9", "10", "11", "12", "B"),
  makeQ("כמה זה 14 פחות 4?", "8", "9", "10", "12", "C"),
  makeQ("כמה זה 9 ועוד 1?", "8", "9", "10", "11", "C"),
  makeQ("כמה זה 18 פחות 8?", "8", "9", "10", "11", "C"),
  makeQ("כמה זה 4 ועוד 5?", "8", "9", "10", "7", "B"),
  makeQ("כמה זה 11 פחות 1?", "9", "10", "11", "12", "B"),
  makeQ("כמה זה 20 פחות 5?", "10", "12", "15", "18", "C"),
  makeQ("כמה זה 13 ועוד 2?", "14", "15", "16", "17", "B"),
  makeQ("כמה זה 16 פחות 6?", "8", "9", "10", "11", "C"),
  makeQ("כמה זה 7 ועוד 7?", "12", "13", "14", "15", "C"),
  makeQ("כמה זה 19 פחות 9?", "8", "9", "10", "11", "C"),
  makeQ("כמה זה 10 ועוד 10?", "15", "18", "20", "30", "C"),
  makeQ("כמה זה 20 פחות 0?", "0", "10", "20", "12", "C"),
  makeQ("כמה זה 0 ועוד 6?", "0", "5", "6", "7", "C"),
  makeQ("כמה זה 6 פחות 0?", "0", "5", "6", "7", "C"),
  makeQ("כמה זה 2 ועוד 8?", "9", "10", "11", "12", "B"),
  makeQ("כמה זה 40 ועוד 20?", "50", "60", "70", "80", "B"),
  makeQ("כמה זה 80 פחות 30?", "40", "50", "60", "70", "B"),
  makeQ("כמה זה 30 ועוד 30?", "50", "60", "70", "80", "B"),
  makeQ("כמה זה 90 פחות 40?", "40", "50", "60", "70", "B"),
  makeQ("כמה זה 20 ועוד 70?", "80", "90", "100", "70", "B"),
  makeQ('באיזו אות מתחילה המילה "בית"?', "ב", "י", "ת", "א", "A"),
  makeQ('באיזו אות מתחילה המילה "אמא"?', "מ", "א", "ה", "י", "B"),
  makeQ('באיזו אות מתחילה המילה "דג"?', "ג", "ד", "ב", "ש", "B"),
  makeQ('באיזו אות מתחילה המילה "חתול"?', "ת", "ל", "ח", "כ", "C"),
  makeQ('באיזו אות מתחילה המילה "ילד"?', "י", "ל", "ד", "א", "A"),
  makeQ('באיזו אות מתחילה המילה "פרח"?', "ח", "ר", "פ", "ב", "C"),
  makeQ('באיזו אות מתחילה המילה "רכבת"?', "ר", "כ", "ב", "ת", "A"),
  makeQ('באיזו אות מתחילה המילה "כדור"?', "ד", "ו", "כ", "ר", "C"),
  makeQ("איזו מילה מתחילה באות ש?", "שמש", "בית", "כלב", "דג", "A"),
  makeQ("איזו מילה מתחילה באות מ?", "סוס", "מים", "עץ", "דלת", "B"),
  makeQ('איזו מילה מתחרזת עם "ים"?', "חם", "סים", "בית", "כלב", "B"),
  makeQ('איזו מילה מתחרזת עם "חתול"?', "סלול", "שולחן", "ילד", "ירח", "A"),
  makeQ('מה ההפך מ"גדול"?', "גבוה", "קטן", "רחוק", "חם", "B"),
  makeQ('מה ההפך מ"חם"?', "קר", "גדול", "יפה", "מהר", "A"),
  makeQ('מה ההפך מ"למעלה"?', "רחוק", "למטה", "ליד", "מהר", "B"),
  makeQ('מה ההפך מ"יום"?', "שמש", "לילה", "בוקר", "אור", "B"),
  makeQ("איזו מילה היא שם של בעל חיים?", "כיסא", "שולחן", "כלב", "עיפרון", "C"),
  makeQ("איזו מילה היא שם של צבע?", "ירוק", "רץ", "אוכל", "יושב", "A"),
  makeQ("איזו מילה היא שם של פרי?", "בננה", "מחברת", "כיסא", "דלת", "A"),
  makeQ("איזו מילה מתאימה לתמונה של עץ?", "עץ", "דג", "נעל", "כדור", "A"),
  makeQ("מה צבע השמיים ביום בהיר?", "ירוק", "כחול", "אדום", "שחור", "B"),
  makeQ("מה צבע הדשא בדרך כלל?", "כחול", "אדום", "ירוק", "סגול", "C"),
  makeQ("איזה בעל חיים נובח?", "חתול", "כלב", "דג", "ציפור", "B"),
  makeQ("איזה בעל חיים מיילל?", "חתול", "סוס", "דג", "פרה", "A"),
  makeQ("איזה בעל חיים חי במים?", "דג", "כלב", "חתול", "תרנגולת", "A"),
  makeQ("איזה בעל חיים עף?", "דג", "ציפור", "כלב", "פרה", "B"),
  makeQ("מה צריך צמח כדי לגדול?", "מים", "נעליים", "ספר", "כדור", "A"),
  makeQ("מה אנחנו שותים כשצמאים?", "חול", "מים", "אבן", "נייר", "B"),
  makeQ("באיזה איבר אנחנו רואים?", "אוזניים", "עיניים", "ידיים", "רגליים", "B"),
  makeQ("באיזה איבר אנחנו שומעים?", "עיניים", "אוזניים", "ברכיים", "שיניים", "B"),
  makeQ("באיזה איבר אנחנו מריחים?", "אף", "יד", "רגל", "גב", "A"),
  makeQ("באיזה איבר אנחנו טועמים?", "אוזן", "לשון", "ברך", "שיער", "B"),
  makeQ("מה מאיר ביום?", "ירח", "שמש", "כיסא", "ספר", "B"),
  makeQ("מה יורד מהשמיים בחורף?", "גשם", "חול", "שולחן", "עיפרון", "A"),
  makeQ("מה לובשים כשקר?", "מעיל", "בגד ים", "סנדלים", "כובע שמש בלבד", "A"),
  makeQ("כמה רגליים יש לחתול?", "2", "3", "4", "6", "C"),
  makeQ("כמה כנפיים יש לציפור בדרך כלל?", "1", "2", "3", "4", "B"),
  makeQ("מה אוכלים בעזרת כף?", "מרק", "נעל", "ספר", "עיפרון", "A"),
  makeQ("עם מה מציירים?", "מזלג", "עיפרון", "כרית", "נעל", "B"),
  makeQ("עם מה כותבים במחברת?", "עיפרון", "כף", "כוס", "כדור", "A"),
  makeQ("איפה שמים אוכל כדי לשמור עליו קר?", "בתיק", "במקרר", "בכיסא", "במחברת", "B"),
  makeQ("מה נועלים על הרגליים?", "כפפות", "נעליים", "כובע", "חולצה", "B"),
  makeQ("מה חובשים על הראש?", "כובע", "גרביים", "נעליים", "מכנסיים", "A"),
  makeQ("מה עושים לפני שחוצים כביש?", "רצים מהר", "עוצרים ומסתכלים", "עוצמים עיניים", "משחקים", "B"),
  makeQ("מה עושים לפני שאוכלים?", "שוטפים ידיים", "צובעים קיר", "קופצים על שולחן", "הולכים לישון", "A"),
  makeQ("איזה צבע יש לתות בדרך כלל?", "כחול", "ירוק", "אדום", "סגול", "C"),
  makeQ("איזה פרי אדום בדרך כלל?", "תפוח", "מלפפון", "חסה", "לחם", "A"),
  makeQ("איזה ירק ירוק?", "מלפפון", "תות", "בננה", "תפוז", "A"),
  makeQ("מה שותים בכוס?", "מים", "כיסא", "עיפרון", "חול", "A"),
  makeQ("על מה יושבים?", "כיסא", "צלחת", "מחברת", "נעל", "A"),
  makeQ("איפה ישנים?", "מיטה", "כיור", "שולחן", "תיק", "A"),
  makeQ("מה פותחים כדי להיכנס לחדר?", "דלת", "כפית", "נעל", "עיפרון", "A"),
  makeQ("מה מדליקים כשחשוך?", "אור", "מים", "חול", "ספר", "A"),
  makeQ("איזה יום מגיע אחרי שבת?", "ראשון", "שלישי", "חמישי", "שישי", "A"),
  makeQ("כמה ימים יש בשבוע?", "5", "6", "7", "8", "C"),
  makeQ("איזה מספר בא אחרי 6?", "5", "7", "8", "9", "B"),
  makeQ("איזה מספר בא אחרי 9?", "8", "10", "11", "12", "B"),
  makeQ("איזה מספר בא לפני 5?", "3", "4", "6", "7", "B"),
  makeQ("איזה מספר בא לפני 10?", "8", "9", "11", "12", "B"),
  makeQ("מה גדול יותר: 6 או 9?", "6", "9", "שניהם שווים", "0", "B"),
  makeQ("מה קטן יותר: 3 או 8?", "3", "8", "שניהם שווים", "10", "A"),
  makeQ("איזה מספר הוא זוגי?", "3", "5", "8", "9", "C"),
  makeQ("איזה מספר הוא אי־זוגי?", "2", "4", "6", "7", "D"),
  makeQ("כמה אצבעות יש ביד אחת?", "4", "5", "6", "10", "B"),
  makeQ("מה עושים עם האוזניים?", "שומעים", "רואים", "טועמים", "כותבים", "A"),
];

// Niqqud Grade 1 questions — source: lib/fallback-questions_with_niqqud.ts
const NIQQUD_GRADE1: Q[] = [
  makeQ("כַּמָּה זֶה 2 וְעוֹד 3?", "4", "5", "6", "7", "B"),
  makeQ("כַּמָּה זֶה 4 וְעוֹד 4?", "6", "7", "8", "9", "C"),
  makeQ("כַּמָּה זֶה 6 פָּחוֹת 2?", "3", "4", "5", "6", "B"),
  makeQ("כַּמָּה זֶה 8 פָּחוֹת 3?", "4", "5", "6", "7", "B"),
  makeQ("כַּמָּה זֶה 1 וְעוֹד 7?", "6", "7", "8", "9", "C"),
  makeQ("כַּמָּה זֶה 9 פָּחוֹת 1?", "7", "8", "9", "10", "B"),
  makeQ("כַּמָּה זֶה 5 וְעוֹד 2?", "6", "7", "8", "9", "B"),
  makeQ("כַּמָּה זֶה 10 פָּחוֹת 4?", "5", "6", "7", "8", "B"),
  makeQ("כַּמָּה זֶה 3 וְעוֹד 6?", "8", "9", "10", "7", "B"),
  makeQ("כַּמָּה זֶה 7 פָּחוֹת 5?", "1", "2", "3", "4", "B"),
  makeQ("כַּמָּה זֶה 10 וְעוֹד 5?", "12", "13", "15", "16", "C"),
  makeQ("כַּמָּה זֶה 12 פָּחוֹת 2?", "8", "9", "10", "11", "C"),
  makeQ("כַּמָּה זֶה 6 וְעוֹד 6?", "10", "11", "12", "13", "C"),
  makeQ("כַּמָּה זֶה 15 פָּחוֹת 5?", "8", "9", "10", "11", "C"),
  makeQ("כַּמָּה זֶה 8 וְעוֹד 2?", "9", "10", "11", "12", "B"),
  makeQ("כַּמָּה זֶה 14 פָּחוֹת 4?", "8", "9", "10", "12", "C"),
  makeQ("כַּמָּה זֶה 9 וְעוֹד 1?", "8", "9", "10", "11", "C"),
  makeQ("כַּמָּה זֶה 18 פָּחוֹת 8?", "8", "9", "10", "11", "C"),
  makeQ("כַּמָּה זֶה 4 וְעוֹד 5?", "8", "9", "10", "7", "B"),
  makeQ("כַּמָּה זֶה 11 פָּחוֹת 1?", "9", "10", "11", "12", "B"),
  makeQ("כַּמָּה זֶה 20 פָּחוֹת 5?", "10", "12", "15", "18", "C"),
  makeQ("כַּמָּה זֶה 13 וְעוֹד 2?", "14", "15", "16", "17", "B"),
  makeQ("כַּמָּה זֶה 16 פָּחוֹת 6?", "8", "9", "10", "11", "C"),
  makeQ("כַּמָּה זֶה 7 וְעוֹד 7?", "12", "13", "14", "15", "C"),
  makeQ("כַּמָּה זֶה 19 פָּחוֹת 9?", "8", "9", "10", "11", "C"),
  makeQ("כַּמָּה זֶה 10 וְעוֹד 10?", "15", "18", "20", "30", "C"),
  makeQ("כַּמָּה זֶה 20 פָּחוֹת 0?", "0", "10", "20", "12", "C"),
  makeQ("כַּמָּה זֶה 0 וְעוֹד 6?", "0", "5", "6", "7", "C"),
  makeQ("כַּמָּה זֶה 6 פָּחוֹת 0?", "0", "5", "6", "7", "C"),
  makeQ("כַּמָּה זֶה 2 וְעוֹד 8?", "9", "10", "11", "12", "B"),
  makeQ("כַּמָּה זֶה 40 וְעוֹד 20?", "50", "60", "70", "80", "B"),
  makeQ("כַּמָּה זֶה 80 פָּחוֹת 30?", "40", "50", "60", "70", "B"),
  makeQ("כַּמָּה זֶה 30 וְעוֹד 30?", "50", "60", "70", "80", "B"),
  makeQ("כַּמָּה זֶה 90 פָּחוֹת 40?", "40", "50", "60", "70", "B"),
  makeQ("כַּמָּה זֶה 20 וְעוֹד 70?", "80", "90", "100", "70", "B"),
  makeQ('בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "בַּיִת"?', "ב", "י", "ת", "א", "A"),
  makeQ('בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "אִמָּא"?', "מ", "א", "ה", "י", "B"),
  makeQ('בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "דָּג"?', "ג", "ד", "ב", "ש", "B"),
  makeQ('בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "חָתוּל"?', "ת", "ל", "ח", "כ", "C"),
  makeQ('בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "יֶלֶד"?', "י", "ל", "ד", "א", "A"),
  makeQ('בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "פֶּרַח"?', "ח", "ר", "פ", "ב", "C"),
  makeQ('בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "רַכֶּבֶת"?', "ר", "כ", "ב", "ת", "A"),
  makeQ('בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "כַּדּוּר"?', "ד", "ו", "כ", "ר", "C"),
  makeQ("אֵיזוֹ מִלָּה מַתְחִילָה בְּאוֹת שׁ?", "שֶׁמֶשׁ", "בַּיִת", "כֶּלֶב", "דָּג", "A"),
  makeQ("אֵיזוֹ מִלָּה מַתְחִילָה בְּאוֹת מ?", "סוּס", "מַיִם", "עֵץ", "דֶּלֶת", "B"),
  makeQ('אֵיזוֹ מִלָּה מִתְחָרֶזֶת עִם "יָם"?', "חַם", "סִים", "בַּיִת", "כֶּלֶב", "B"),
  makeQ('אֵיזוֹ מִלָּה מִתְחָרֶזֶת עִם "חָתוּל"?', "סָלוּל", "שֻׁלְחָן", "יֶלֶד", "יָרֵחַ", "A"),
  makeQ('מָה הַהֵפֶךְ מ"גָּדוֹל"?', "גָּבוֹהַּ", "קָטָן", "רָחוֹק", "חַם", "B"),
  makeQ('מָה הַהֵפֶךְ מ"חַם"?', "קַר", "גָּדוֹל", "יָפֶה", "מַהֵר", "A"),
  makeQ('מָה הַהֵפֶךְ מ"לְמַעְלָה"?', "רָחוֹק", "לְמַטָּה", "לְיַד", "מַהֵר", "B"),
  makeQ('מָה הַהֵפֶךְ מ"יוֹם"?', "שֶׁמֶשׁ", "לַיְלָה", "בֹּקֶר", "אוֹר", "B"),
  makeQ("אֵיזוֹ מִלָּה הִיא שֵׁם שֶׁל בַּעַל חַיִּים?", "כִּסֵּא", "שֻׁלְחָן", "כֶּלֶב", "עִפָּרוֹן", "C"),
  makeQ("אֵיזוֹ מִלָּה הִיא שֵׁם שֶׁל צֶבַע?", "יָרֹק", "רָץ", "אוֹכֵל", "יוֹשֵׁב", "A"),
  makeQ("אֵיזוֹ מִלָּה הִיא שֵׁם שֶׁל פְּרִי?", "בַּנָּנָה", "מַחְבֶּרֶת", "כִּסֵּא", "דֶּלֶת", "A"),
  makeQ("אֵיזוֹ מִלָּה מַתְאִימָה לְתַמּוּנָה שֶׁל עֵץ?", "עֵץ", "דָּג", "נַעַל", "כַּדּוּר", "A"),
  makeQ("מָה צֶבַע הַשָּׁמַיִם בְּיוֹם בָּהִיר?", "יָרֹק", "כָּחֹל", "אָדֹם", "שָׁחוֹר", "B"),
  makeQ("מָה צֶבַע הַדֶּשֶׁא בְּדֶרֶךְ כְּלָל?", "כָּחֹל", "אָדֹם", "יָרֹק", "סָגֹל", "C"),
  makeQ("אֵיזֶה בַּעַל חַיִּים נוֹבֵחַ?", "חָתוּל", "כֶּלֶב", "דָּג", "צִפּוֹר", "B"),
  makeQ("אֵיזֶה בַּעַל חַיִּים מְיַלֵּל?", "חָתוּל", "סוּס", "דָּג", "פָּרָה", "A"),
  makeQ("אֵיזֶה בַּעַל חַיִּים חַי בַּמַּיִם?", "דָּג", "כֶּלֶב", "חָתוּל", "תַּרְנְגֹלֶת", "A"),
  makeQ("אֵיזֶה בַּעַל חַיִּים עָף?", "דָּג", "צִפּוֹר", "כֶּלֶב", "פָּרָה", "B"),
  makeQ("מָה צָרִיךְ צֶמַח כְּדֵי לִגְדֹּל?", "מַיִם", "נְעָלַיִם", "סֵפֶר", "כַּדּוּר", "A"),
  makeQ("מָה אֲנַחְנוּ שׁוֹתִים כְּשֶׁצְּמֵאִים?", "חוֹל", "מַיִם", "אֶבֶן", "נְיָר", "B"),
  makeQ("בְּאֵיזֶה אֵיבָר אֲנַחְנוּ רוֹאִים?", "אָזְנַיִם", "עֵינַיִם", "יָדַיִם", "רַגְלַיִם", "B"),
  makeQ("בְּאֵיזֶה אֵיבָר אֲנַחְנוּ שׁוֹמְעִים?", "עֵינַיִם", "אָזְנַיִם", "בִּרְכַּיִם", "שִׁנַּיִם", "B"),
  makeQ("בְּאֵיזֶה אֵיבָר אֲנַחְנוּ מְרִיחִים?", "אַף", "יָד", "רֶגֶל", "גַּב", "A"),
  makeQ("בְּאֵיזֶה אֵיבָר אֲנַחְנוּ טוֹעֲמִים?", "אֹזֶן", "לָשׁוֹן", "בֶּרֶךְ", "שֵׂעָר", "B"),
  makeQ("מָה מֵאִיר בַּיּוֹם?", "יָרֵחַ", "שֶׁמֶשׁ", "כִּסֵּא", "סֵפֶר", "B"),
  makeQ("מָה יוֹרֵד מֵהַשָּׁמַיִם בַּחֹרֶף?", "גֶּשֶׁם", "חוֹל", "שֻׁלְחָן", "עִפָּרוֹן", "A"),
  makeQ("מָה לוֹבְשִׁים כְּשֶׁקַּר?", "מְעִיל", "בֶּגֶד יָם", "סַנְדָּלִים", "כּוֹבַע שֶׁמֶשׁ בִּלְבַד", "A"),
  makeQ("כַּמָּה רַגְלַיִם יֵשׁ לְחָתוּל?", "2", "3", "4", "6", "C"),
  makeQ("כַּמָּה כְּנָפַיִם יֵשׁ לְצִפּוֹר בְּדֶרֶךְ כְּלָל?", "1", "2", "3", "4", "B"),
  makeQ("מָה אוֹכְלִים בְּעֶזְרַת כַּף?", "מָרָק", "נַעַל", "סֵפֶר", "עִפָּרוֹן", "A"),
  makeQ("עִם מָה מְצַיְּרִים?", "מַזְלֵג", "עִפָּרוֹן", "כָּרִית", "נַעַל", "B"),
  makeQ("עִם מָה כּוֹתְבִים בַּמַּחְבֶּרֶת?", "עִפָּרוֹן", "כַּף", "כּוֹס", "כַּדּוּר", "A"),
  makeQ("אֵיפֹה שָׂמִים אֹכֶל כְּדֵי לִשְׁמֹר עָלָיו קַר?", "בַּתִּיק", "בַּמְּקָרֵר", "בַּכִּסֵּא", "בַּמַּחְבֶּרֶת", "B"),
  makeQ("מָה נוֹעֲלִים עַל הָרַגְלַיִם?", "כְּפָפוֹת", "נְעָלַיִם", "כּוֹבַע", "חֻלְצָה", "B"),
  makeQ("מָה חוֹבְשִׁים עַל הָרֹאשׁ?", "כּוֹבַע", "גַּרְבַּיִם", "נְעָלַיִם", "מִכְנָסַיִם", "A"),
  makeQ("מָה עוֹשִׂים לִפְנֵי שֶׁחוֹצִים כְּבִישׁ?", "רָצִים מַהֵר", "עוֹצְרִים וּמִסְתַּכְּלִים", "עוֹצְמִים עֵינַיִם", "מְשַׂחֲקִים", "B"),
  makeQ("מָה עוֹשִׂים לִפְנֵי שֶׁאוֹכְלִים?", "שׁוֹטְפִים יָדַיִם", "צוֹבְעִים קִיר", "קוֹפְצִים עַל שֻׁלְחָן", "הוֹלְכִים לִישׁוֹן", "A"),
  makeQ("אֵיזֶה צֶבַע יֵשׁ לְתוּת בְּדֶרֶךְ כְּלָל?", "כָּחֹל", "יָרֹק", "אָדֹם", "סָגֹל", "C"),
  makeQ("אֵיזֶה פְּרִי אָדֹם בְּדֶרֶךְ כְּלָל?", "תַּפּוּחַ", "מְלָפְפוֹן", "חַסָּה", "לֶחֶם", "A"),
  makeQ("אֵיזֶה יָרָק יָרֹק?", "מְלָפְפוֹן", "תּוּת", "בַּנָּנָה", "תַּפּוּז", "A"),
  makeQ("מָה שׁוֹתִים בְּכוֹס?", "מַיִם", "כִּסֵּא", "עִפָּרוֹן", "חוֹל", "A"),
  makeQ("עַל מָה יוֹשְׁבִים?", "כִּסֵּא", "צַלַּחַת", "מַחְבֶּרֶת", "נַעַל", "A"),
  makeQ("אֵיפֹה יְשֵׁנִים?", "מִטָּה", "כִּיּוֹר", "שֻׁלְחָן", "תִּיק", "A"),
  makeQ("מָה פּוֹתְחִים כְּדֵי לְהִיכָּנֵס לַחֶדֶר?", "דֶּלֶת", "כַּפִּית", "נַעַל", "עִפָּרוֹן", "A"),
  makeQ("מָה מַדְלִיקִים כְּשֶׁחָשׁוּךְ?", "אוֹר", "מַיִם", "חוֹל", "סֵפֶר", "A"),
  makeQ("אֵיזֶה יוֹם מַגִּיעַ אַחֲרֵי שַׁבָּת?", "רִאשׁוֹן", "שְׁלִישִׁי", "חֲמִישִׁי", "שִׁישִּׁי", "A"),
  makeQ("כַּמָּה יָמִים יֵשׁ בְּשָׁבוּעַ?", "5", "6", "7", "8", "C"),
  makeQ("אֵיזֶה מִסְפָּר בָּא אַחֲרֵי 6?", "5", "7", "8", "9", "B"),
  makeQ("אֵיזֶה מִסְפָּר בָּא אַחֲרֵי 9?", "8", "10", "11", "12", "B"),
  makeQ("אֵיזֶה מִסְפָּר בָּא לִפְנֵי 5?", "3", "4", "6", "7", "B"),
  makeQ("אֵיזֶה מִסְפָּר בָּא לִפְנֵי 10?", "8", "9", "11", "12", "B"),
  makeQ("מָה גָּדוֹל יוֹתֵר: 6 אוֹ 9?", "6", "9", "שְׁנֵיהֶם שָׁוִים", "0", "B"),
  makeQ("מָה קָטָן יוֹתֵר: 3 אוֹ 8?", "3", "8", "שְׁנֵיהֶם שָׁוִים", "10", "A"),
  makeQ("אֵיזֶה מִסְפָּר הוּא זוּגִי?", "3", "5", "8", "9", "C"),
  makeQ("אֵיזֶה מִסְפָּר הוּא אִי־זוּגִי?", "2", "4", "6", "7", "D"),
  makeQ("כַּמָּה אֶצְבָּעוֹת יֵשׁ בְּיָד אַחַת?", "4", "5", "6", "10", "B"),
  makeQ("מָה עוֹשִׂים עִם הָאָזְנַיִם?", "שׁוֹמְעִים", "רוֹאִים", "טוֹעֲמִים", "כּוֹתְבִים", "A"),
];

// ─── COMPARE ARRAYS ─────────────────────────────────────────────────────────
const DISPLAY_FIELDS: (keyof Q)[] = [
  "text_he", "option_a_he", "option_b_he", "option_c_he", "option_d_he", "explanation_he",
];
const IMMUTABLE_FIELDS: (keyof Q)[] = ["correct_answer"];

type Diff = { field: keyof Q; original: string; niqqud: string };

interface CompareResult {
  index: number;
  diffs: Diff[];
  immutableViolations: string[];
}

function compareArrays(): { results: CompareResult[]; errors: string[] } {
  const errors: string[] = [];
  const results: CompareResult[] = [];

  if (ORIGINAL_GRADE1.length !== NIQQUD_GRADE1.length) {
    errors.push(
      `Question count mismatch: original=${ORIGINAL_GRADE1.length}, niqqud=${NIQQUD_GRADE1.length}`,
    );
    return { results, errors };
  }

  for (let i = 0; i < ORIGINAL_GRADE1.length; i++) {
    const orig = ORIGINAL_GRADE1[i]!;
    const niq = NIQQUD_GRADE1[i]!;
    const diffs: Diff[] = [];
    const immutableViolations: string[] = [];

    for (const field of DISPLAY_FIELDS) {
      if (orig[field] !== niq[field]) {
        diffs.push({ field, original: orig[field] as string, niqqud: niq[field] as string });
      }
    }

    for (const field of IMMUTABLE_FIELDS) {
      if (orig[field] !== niq[field]) {
        immutableViolations.push(
          `  ⛔ ${field}: "${orig[field]}" → "${niq[field]}" (FORBIDDEN change)`,
        );
      }
    }

    results.push({ index: i, diffs, immutableViolations });
  }

  return { results, errors };
}

// ─── SUPABASE QUERY ──────────────────────────────────────────────────────────
interface AutoQRow {
  id: string;
  text_he?: string;
  option_a_he?: string;
  option_b_he?: string;
  option_c_he?: string;
  option_d_he?: string;
  correct_answer?: string;
  explanation_he?: string;
}

interface SessionRow {
  id: string;
  auto_questions: AutoQRow[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queryLiveSessions(supabase: any) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("id, auto_questions")
    .neq("auto_questions", "[]");

  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return (data ?? []) as SessionRow[];
}

// Build a lookup: original text_he → niqqud Q
const niqqudByOrigText = new Map<string, Q>();
for (let i = 0; i < ORIGINAL_GRADE1.length; i++) {
  niqqudByOrigText.set(ORIGINAL_GRADE1[i]!.text_he, NIQQUD_GRADE1[i]!);
}

function buildSessionPatch(session: SessionRow): {
  sessionId: string;
  patchedQuestions: AutoQRow[];
  changedCount: number;
} {
  let changedCount = 0;
  const patchedQuestions = session.auto_questions.map((aq) => {
    const niqqudQ = aq.text_he ? niqqudByOrigText.get(aq.text_he) : undefined;
    if (!niqqudQ) return aq; // not a Grade 1 fallback question — leave untouched

    const patched: AutoQRow = { ...aq };
    let changed = false;
    for (const field of DISPLAY_FIELDS) {
      const orig = aq[field as keyof AutoQRow] as string | undefined;
      const niq = niqqudQ[field] as string;
      if (orig !== undefined && orig !== niq) {
        (patched as unknown as Record<string, unknown>)[field] = niq;
        changed = true;
      }
    }
    if (changed) changedCount++;
    return patched;
  });

  return { sessionId: session.id, patchedQuestions, changedCount };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" Crystal Champions — Grade 1 Niqqud Update");
  console.log(` Mode: ${APPLY_MODE ? "⚠️  APPLY (LIVE WRITE)" : "🔍 DRY RUN (read-only)"}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  // ── Step 1: Compare arrays ───────────────────────────────────────────────
  console.log("── Step 1: Comparing original vs niqqud arrays ─────────────");
  const { results, errors } = compareArrays();

  if (errors.length > 0) {
    console.error("❌  Fatal comparison errors:");
    errors.forEach((e) => console.error("  ", e));
    process.exit(1);
  }

  let changedQuestions = 0;
  let unchangedQuestions = 0;
  let immutableViolations = 0;

  for (const r of results) {
    if (r.immutableViolations.length > 0) {
      immutableViolations++;
      console.error(`❌  Question #${r.index + 1} has FORBIDDEN immutable field changes:`);
      r.immutableViolations.forEach((v) => console.error(v));
    }
    if (r.diffs.length > 0) {
      changedQuestions++;
    } else {
      unchangedQuestions++;
    }
  }

  if (immutableViolations > 0) {
    console.error(`\n❌  STOPPED — ${immutableViolations} immutable field violation(s) detected.`);
    process.exit(1);
  }

  console.log(`  Total questions (original): ${ORIGINAL_GRADE1.length}`);
  console.log(`  Total questions (niqqud):   ${NIQQUD_GRADE1.length}`);
  console.log(`  Questions with changes:     ${changedQuestions}`);
  console.log(`  Questions unchanged:        ${unchangedQuestions}`);
  console.log(`  Immutable violations:       ${immutableViolations} ✅`);
  console.log("");

  // ── Step 2: Print diffs ─────────────────────────────────────────────────
  console.log("── Step 2: Diff preview (first 10 changed) ──────────────────");
  let shown = 0;
  for (const r of results) {
    if (r.diffs.length === 0) continue;
    if (shown >= 10) { console.log(`  ... (${changedQuestions - 10} more changed questions not shown)`); break; }
    console.log(`\n  Q#${r.index + 1}:`);
    for (const d of r.diffs) {
      console.log(`    ${d.field}:`);
      console.log(`      original: ${d.original}`);
      console.log(`      niqqud:   ${d.niqqud}`);
    }
    shown++;
  }
  console.log("");

  // ── Step 3: Query Supabase live sessions ────────────────────────────────
  console.log("── Step 3: Querying Supabase game_sessions ──────────────────");
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    console.warn("  ⚠️  Supabase env vars not found. Skipping live session check.");
    console.warn("      Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable.\n");
  } else {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let sessions: SessionRow[];
    try {
      sessions = await queryLiveSessions(supabase);
    } catch (err) {
      console.error("  ❌  Supabase query error:", err);
      process.exit(1);
    }

    console.log(`  game_sessions with auto_questions: ${sessions.length}`);

    let sessionsWithGrade1 = 0;
    let totalQuestionsToUpdate = 0;
    const patches: { sessionId: string; patchedQuestions: AutoQRow[] }[] = [];

    for (const session of sessions) {
      const patch = buildSessionPatch(session);
      if (patch.changedCount > 0) {
        sessionsWithGrade1++;
        totalQuestionsToUpdate += patch.changedCount;
        patches.push({ sessionId: patch.sessionId, patchedQuestions: patch.patchedQuestions });
        if (APPLY_MODE || sessionsWithGrade1 <= 3) {
          console.log(`  Session ${patch.sessionId}: ${patch.changedCount} question(s) would be updated`);
        }
      }
    }

    if (sessionsWithGrade1 > 3 && !APPLY_MODE) {
      console.log(`  ... and ${sessionsWithGrade1 - 3} more sessions`);
    }

    console.log(`\n  Sessions containing Grade 1 fallback questions: ${sessionsWithGrade1}`);
    console.log(`  Total question rows to update:                  ${totalQuestionsToUpdate}`);
    console.log("");

    // ── Step 4: Apply if requested ──────────────────────────────────────
    if (APPLY_MODE) {
      console.log("── Step 4: APPLYING UPDATES ─────────────────────────────────");
      let updatedSessions = 0;
      let failedSessions = 0;

      for (const patch of patches) {
        const { error } = await supabase
          .from("game_sessions")
          .update({ auto_questions: patch.patchedQuestions })
          .eq("id", patch.sessionId);

        if (error) {
          console.error(`  ❌  Failed to update session ${patch.sessionId}:`, error.message);
          failedSessions++;
        } else {
          updatedSessions++;
        }
      }

      console.log(`  Updated sessions: ${updatedSessions}`);
      console.log(`  Failed sessions:  ${failedSessions}`);
      if (failedSessions > 0) {
        console.error("\n  ⚠️  Some sessions failed to update. Check errors above.");
        process.exit(1);
      }
    } else {
      console.log("── Step 4: DRY RUN — no writes performed ───────────────────");
      console.log("  No data was written to Supabase.");
      console.log("  To apply: set CONFIRM_GRADE1_NIQQUD_UPDATE=true and pass --apply");
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log(" SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Original question count:  ${ORIGINAL_GRADE1.length}`);
  console.log(`  Niqqud question count:    ${NIQQUD_GRADE1.length}`);
  console.log(`  Questions with niqqud:    ${changedQuestions}`);
  console.log(`  correct_answer unchanged: ✅ (validated)`);
  console.log(`  IDs unchanged:            ✅ (not in source arrays)`);
  console.log(`  Immutable violations:     ✅ none`);
  console.log(`  Writes to Supabase:       ${APPLY_MODE ? "YES (applied)" : "NO (dry run)"}`);
  console.log("");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

// Server-only generator for arena fallback questions.
// Used when the parent has not uploaded any practice questions.
// Returns FULL question objects (with correct_answer + explanation)
// — never expose this directly to the client; the arena strips
// correct_answer before sending to the browser.

import "server-only";
import { randomUUID } from "node:crypto";
import { buildMathGradeInstruction, validateMathQuestion } from "@/lib/math-grade-rules";

export interface AutoQuestion {
  id:             string;   // synthetic — prefixed with "auto-"
  text_he:        string;
  option_a_he:    string;
  option_b_he:    string;
  option_c_he:    string;
  option_d_he:    string;
  correct_answer: "A" | "B" | "C" | "D";
  difficulty:     "Easy" | "Medium" | "Hard";
  subject_he:     string;
  explanation_he: string;
}

// Non-math subject topics per grade — math topics come from MATH_GRADE_RULES
const AUTO_NON_MATH_SUBJECTS_BY_GRADE: Record<number, string> = {
  1: "צבעים, חיות, אותיות וצלילים, חיי יום-יום, גוף האדם",
  2: "אוצר מילים, חיות וצמחים, מזג אוויר, גוף האדם, ימי שבוע וחודשים",
  3: "הבנת הנקרא, חלל ראשוני, יבשות ואוקיינוסים, חידות לוגיות, טבע ישראל",
  4: "דקדוק, מדעי הטבע, מערכת השמש, מפות ומדינות, אירועים היסטוריים",
  5: "ניתוח טקסט, ביולוגיה ופיזיקה ראשונית, גיאוגרפיה עולמית, היסטוריה כללית",
  6: "ניתוח ספרותי, כימיה ופיזיקה, גיאוגרפיה מתקדמת, היסטוריה עולמית, לוגיקה",
};

function isAnswerLetter(x: unknown): x is "A" | "B" | "C" | "D" {
  return x === "A" || x === "B" || x === "C" || x === "D";
}

function isDifficulty(x: unknown): x is "Easy" | "Medium" | "Hard" {
  return x === "Easy" || x === "Medium" || x === "Hard";
}

/**
 * Generate up to `count` age/grade-appropriate questions covering a
 * broad subject mix (math, language, science, animals, space,
 * geography, history, logic, memory, reading comprehension).
 *
 * Safe-by-default: any failure (missing API key, model error, malformed
 * JSON, missing correct_answer, empty array) returns []. The caller is
 * responsible for treating an empty result as "no questions available".
 */
export async function generateAutoArenaQuestions(
  gradeLevel: number,
  count:      number,
): Promise<AutoQuestion[]> {
  const n = Math.max(1, Math.min(50, Math.floor(count)));
  if (!process.env.OPENAI_API_KEY) return [];

  const grade       = Math.max(1, Math.min(6, Math.floor(gradeLevel || 3)));
  const ageMin      = grade + 5;
  const ageMax      = grade + 6;
  const nonMath     = AUTO_NON_MATH_SUBJECTS_BY_GRADE[grade];
  const mathRules   = buildMathGradeInstruction(grade);

  const prompt = `צור ${n} שאלות חינוכיות לילד בגיל ${ageMin}-${ageMax} (כיתה ${grade}) למשחק קרב מבוסס שאלות.

הנחיות כלליות:
- שפה: עברית בלבד, ברורה ומתאימה לגיל
- גוון בין מתמטיקה, שפה והבנת הנקרא, מדע, חיות, חלל, גיאוגרפיה, היסטוריה, לוגיקה, זיכרון, ידע כללי
- נושאים שאינם מתמטיקה לכיתה ${grade}: ${nonMath}
- ${n} השאלות יחד יכסו לפחות 4 נושאים שונים
- ניסוח חיובי וקצר. בלי שאלות מבלבלות בכוונה. אורך שאלה עד 25 מילים, אורך תשובה עד 12 מילים
- בכל שאלה 4 תשובות (A/B/C/D) — אחת בלבד נכונה, ההסחות סבירות אך שגויות בבירור
- difficulty אחד מתוך: Easy, Medium, Hard (התאם לכיתה)
- explanation_he: עד 25 מילים שמסבירות למה התשובה נכונה
- subject_he: שם הנושא בעברית (למשל: מתמטיקה, מדע, גיאוגרפיה...)

${mathRules}

החזר JSON בדיוק בפורמט הזה:
{
  "questions": [
    {
      "text_he": "...",
      "option_a_he": "...",
      "option_b_he": "...",
      "option_c_he": "...",
      "option_d_he": "...",
      "correct_answer": "A",
      "difficulty": "Easy",
      "subject_he": "...",
      "explanation_he": "..."
    }
  ]
}`;

  try {
    const openai = await import("openai");
    const client = new openai.default({ apiKey: process.env.OPENAI_API_KEY });

    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });

    const raw  = JSON.parse(resp.choices[0]?.message?.content ?? "{}");
    const arr  = Array.isArray(raw?.questions) ? raw.questions : [];

    const out: AutoQuestion[] = [];
    for (const q of arr) {
      if (
        typeof q?.text_he        !== "string" ||
        typeof q?.option_a_he    !== "string" ||
        typeof q?.option_b_he    !== "string" ||
        typeof q?.option_c_he    !== "string" ||
        typeof q?.option_d_he    !== "string" ||
        typeof q?.explanation_he !== "string" ||
        typeof q?.subject_he     !== "string" ||
        !isAnswerLetter(q?.correct_answer)
      ) continue;

      // Reject math questions that violate grade-level rules
      const isMath = typeof q.subject_he === "string" &&
        (q.subject_he.includes("מתמטיקה") || q.subject_he.includes("חשבון") || q.subject_he.includes("מספרים"));
      if (isMath && !validateMathQuestion(q.text_he, grade)) continue;

      out.push({
        id:             `auto-${randomUUID()}`,
        text_he:        q.text_he,
        option_a_he:    q.option_a_he,
        option_b_he:    q.option_b_he,
        option_c_he:    q.option_c_he,
        option_d_he:    q.option_d_he,
        correct_answer: q.correct_answer,
        difficulty:     isDifficulty(q.difficulty) ? q.difficulty : "Medium",
        subject_he:     q.subject_he,
        explanation_he: q.explanation_he,
      });
    }

    return out.slice(0, n);
  } catch {
    return [];
  }
}

export function isAutoQuestionId(id: string): boolean {
  return typeof id === "string" && id.startsWith("auto-");
}

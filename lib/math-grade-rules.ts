// Israeli Ministry of Education elementary math curriculum — grades 1–6.
// Source of truth for all math question generation and validation.

export interface MathGradeRule {
  grade:             number;
  allowedOps:        string[];   // human-readable list for prompts
  numberRange:       string;     // human-readable for prompts
  forbidden:         string[];   // topics that must never appear
  wordProblemLevel:  string;     // description for prompt
  exampleTopics:     string[];   // concrete topics AI can use
}

export const MATH_GRADE_RULES: Record<number, MathGradeRule> = {
  1: {
    grade:        1,
    allowedOps:   ["חיבור", "חיסור"],
    numberRange:  "מספרים 1–20 לחישובים רגילים; עשרות שלמות עד 100 (10, 20, ... 100) בלבד",
    forbidden:    ["כפל", "חילוק", "שברים", "אחוזים", "עשרוניות", "משוואות", "שטח", "היקף", "שלישיות", "נוסחאות"],
    wordProblemLevel: "משפט אחד פשוט מאוד, עם פרטים מחיי יום-יום לילד בן 6-7 (כלים, חיות, פירות, ילדים)",
    exampleTopics: [
      "חיבור עד 10",
      "חיסור עד 10",
      "חיבור עד 20",
      "חיסור עד 20",
      "עשרות שלמות: 20+30=?",
      "עשרות שלמות: 80-40=?",
      "כמה נוסיף/נחסיר כדי להגיע ל-10",
    ],
  },

  2: {
    grade:        2,
    allowedOps:   ["חיבור", "חיסור עד 100", "כפל בלוח 2, 5, 10"],
    numberRange:  "מספרים 1–100 לחישובים; הכרת מספרים עד 1000 לקריאה/כתיבה בלבד",
    forbidden:    ["חילוק", "שברים", "אחוזים", "עשרוניות", "משוואות עם אות", "שטח", "היקף"],
    wordProblemLevel: "משפט אחד-שניים עם מצב פשוט, מספרים עד 100, ללא שלבים מרובים",
    exampleTopics: [
      "חיבור דו-ספרתי",
      "חיסור דו-ספרתי",
      "לוח הכפל של 2",
      "לוח הכפל של 5",
      "לוח הכפל של 10",
      "השלמה למספר עגול (עד 100)",
      "בעיות מילוליות פשוטות עד 100",
    ],
  },

  3: {
    grade:        3,
    allowedOps:   ["חיבור", "חיסור עד 10,000", "כפל לוח שלם 2-10", "חילוק עם שארית פשוטה", "שברים פשוטים: 1/2, 1/4, 1/3"],
    numberRange:  "מספרים עד 10,000; שברים פשוטים עם מכנה עד 10",
    forbidden:    ["אחוזים", "עשרוניות", "אלגברה", "משוואות עם אות", "כפל של מספרים מעל 100 בהם", "שטח עיגול"],
    wordProblemLevel: "שניים-שלושה משפטים, מצב מציאותי, לא יותר משני שלבי חישוב",
    exampleTopics: [
      "כפל וחילוק בלוח",
      "חיבור וחיסור עד 1000",
      "חצי ורבע של כמות",
      "בעיות מילוליות עם כפל",
      "מספר זוגי/אי-זוגי",
      "הכרת מספרים עד 10,000",
    ],
  },

  4: {
    grade:        4,
    allowedOps:   ["ארבע פעולות חשבון על מספרים עד מיליון", "שברים פשוטים (חיבור/חיסור עם מכנה שווה)", "שטח ריבוע ומלבן", "היקף"],
    numberRange:  "מספרים עד 1,000,000; שברים עם מכנה עד 12",
    forbidden:    ["אחוזים", "עשרוניות", "שברים עם מכנים שונים", "אלגברה", "נפח", "עיגול"],
    wordProblemLevel: "שניים-שלושה משפטים, שני שלבי פתרון לכל היותר, הקשר מציאותי",
    exampleTopics: [
      "כפל ברבי ספרות",
      "חילוק עם שארית",
      "שברים שווי ערך",
      "חיבור וחיסור שברים עם מכנה שווה",
      "שטח מלבן",
      "בעיות מילוליות ארבע פעולות",
    ],
  },

  5: {
    grade:        5,
    allowedOps:   ["ארבע פעולות על שברים (כולל מכנים שונים)", "עשרוניות", "אחוזים פשוטים (10%, 25%, 50%)", "שטח ריבוע ומשולש", "היקף"],
    numberRange:  "מספרים שלמים ועשרוניים; שברים כלליים; אחוזים עד 100%",
    forbidden:    ["אלגברה עם משוואות", "נפח", "מספרים שליליים", "יחס וחלק ישר מעבר לאחוזים פשוטים"],
    wordProblemLevel: "עד שלושה-ארבעה משפטים, שלבים מרובים, הקשר מציאותי (כלכלה, מדידות, אחוזי הנחה)",
    exampleTopics: [
      "חיבור וחיסור שברים עם מכנים שונים",
      "כפל שבר בשלם",
      "עשרוניות — ארבע פעולות",
      "אחוזים פשוטים",
      "שטח משולש",
      "בעיות אחוזים מחיי יום-יום",
    ],
  },

  6: {
    grade:        6,
    allowedOps:   ["ארבע פעולות על שברים ועשרוניות", "אחוזים מורכבים", "יחס ושיעור", "אלגברה ראשונית — משוואה עם נעלם אחד", "נפח תיבה", "מספרים שליליים — היכרות"],
    numberRange:  "מספרים שלמים, עשרוניים, שברים; מספרים שליליים (-20 עד 0) לחיסור בלבד; אחוזים כלליים",
    forbidden:    ["משוואות ממעלה שניה", "גיאומטריה אנליטית", "לוגריתמים", "טריגונומטריה"],
    wordProblemLevel: "עד ארבעה-חמישה משפטים, בעיות מרובות שלבים, הקשרים מציאותיים (מסחר, גיאומטריה, נסיעות)",
    exampleTopics: [
      "כפל וחילוק שברים",
      "אחוזים — מציאת החלק, השלם, האחוז",
      "יחס פשוט",
      "משוואה פשוטה עם X",
      "נפח תיבה",
      "מספרים שליליים פשוטים",
    ],
  },
};

/**
 * Build a strict Hebrew instruction block for the AI prompt.
 * Injected into generateAutoArenaQuestions when subject is math.
 */
export function buildMathGradeInstruction(grade: number): string {
  const rule = MATH_GRADE_RULES[grade];
  if (!rule) return "";

  return `
--- כללי מתמטיקה מחייבים לכיתה ${grade} ---
פעולות מותרות בלבד: ${rule.allowedOps.join(", ")}
טווח מספרים: ${rule.numberRange}
נושאים/פעולות אסורים לחלוטין: ${rule.forbidden.join(", ")}
רמת בעיה מילולית: ${rule.wordProblemLevel}
דוגמאות לנושאים מתאימים: ${rule.exampleTopics.join(", ")}
חשוב: אם שאלת מתמטיקה כוללת פעולה אסורה, אל תכלול אותה — צור שאלה בנושא אחר.
---`.trim();
}

/**
 * Validate that a math question text does not contain forbidden operations for the grade.
 * Returns true if the question passes (allowed), false if it should be rejected.
 * Uses heuristic keyword matching — not 100% perfect but catches common violations.
 */
export function validateMathQuestion(questionText: string, grade: number): boolean {
  const rule = MATH_GRADE_RULES[grade];
  if (!rule) return true;

  const text = questionText.toLowerCase();

  // Keyword map for forbidden topics
  const forbiddenKeywords: Record<string, string[]> = {
    כפל:       ["כפל", "מכפלה", "לכפול", "×", "⋅"],
    חילוק:     ["חילוק", "לחלק", "מחולק", "÷"],
    שברים:     ["שבר", "מכנה", "מונה", "/", "½", "¼", "⅓"],
    אחוזים:    ["אחוז", "%"],
    עשרוניות:  ["עשרוני", "נקודה עשרונית"],
    משוואות:   ["x=", "y=", "נעלם", "משוואה"],
    שטח:       ["שטח"],
    היקף:      ["היקף"],
    "מספרים שליליים": ["מינוס", "שלילי", "-"],
    אלגברה:    ["אלגברה", "x +", "x -", "x ×"],
    נפח:       ["נפח", "קוביה"],
    עיגול:     ["עיגול", "רדיוס", "קוטר", "π"],
  };

  for (const forbidden of rule.forbidden) {
    const keywords = forbiddenKeywords[forbidden];
    if (!keywords) continue;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) return false;
    }
  }

  return true;
}

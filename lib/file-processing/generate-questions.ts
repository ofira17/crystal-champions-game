import OpenAI from "openai";

export interface GeneratedQuestion {
  text_he: string;
  option_a_he: string;
  option_b_he: string;
  option_c_he: string;
  option_d_he: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation_he: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

const CHUNK_CHARS = 2500;
const QUESTIONS_PER_CHUNK = 8;
const MAX_CHUNKS = 25; // safety cap → up to 200 questions per document
const MAX_QUESTIONS = 200;

const SYSTEM_PROMPT = `אתה מומחה בחינוך יהודי ויצירת שאלות לילדים בגיל בית ספר.
צור שאלות בחירה (Multiple Choice) בעברית על סמך הטקסט שניתן לך.

כללים קפדניים:
1. כתוב הכל בעברית — שאלות, אפשרויות, הסברים
2. כל שאלה חייבת בדיוק 4 אפשרויות תשובה
3. בדיוק תשובה נכונה אחת (A, B, C, או D)
4. הסבר קצר, בהיר וידידותי לילד (2-3 משפטים)
5. שפה מותאמת לגיל בית ספר — פשוטה וברורה
6. השאלות חייבות להתבסס אך ורק על הטקסט שניתן
7. אל תיצור שאלות כפולות
8. החזר ONLY JSON תקין, ללא טקסט נוסף לפני או אחרי

פורמט תגובה חובה:
{"questions":[{"text_he":"...","option_a_he":"...","option_b_he":"...","option_c_he":"...","option_d_he":"...","correct_answer":"A","explanation_he":"...","difficulty":"Easy"}]}`;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const cleaned = text.replace(/\s+/g, " ").trim();
  for (let i = 0; i < cleaned.length; i += CHUNK_CHARS) {
    chunks.push(cleaned.slice(i, i + CHUNK_CHARS));
  }
  return chunks.slice(0, MAX_CHUNKS);
}

function isValidQuestion(q: unknown): q is GeneratedQuestion {
  if (!q || typeof q !== "object") return false;
  const obj = q as Record<string, unknown>;
  return (
    typeof obj.text_he === "string" &&
    typeof obj.option_a_he === "string" &&
    typeof obj.option_b_he === "string" &&
    typeof obj.option_c_he === "string" &&
    typeof obj.option_d_he === "string" &&
    ["A", "B", "C", "D"].includes(obj.correct_answer as string) &&
    typeof obj.explanation_he === "string" &&
    ["Easy", "Medium", "Hard"].includes(obj.difficulty as string)
  );
}

export async function generateQuestionsFromText(
  text: string,
  subject: string,
  topic: string
): Promise<{ questions: GeneratedQuestion[]; chunkErrors: string[] }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const chunks = chunkText(text);
  const allQuestions: GeneratedQuestion[] = [];
  const chunkErrors: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `מקצוע: ${subject}\nנושא: ${topic}\n\nטקסט:\n${chunks[i]}\n\nצור ${QUESTIONS_PER_CHUNK} שאלות.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 3000,
      });

      const content = response.choices[0].message.content ?? "";
      const parsed = JSON.parse(content);
      const raw: unknown[] = Array.isArray(parsed) ? parsed : (parsed.questions ?? []);
      const valid = raw.filter(isValidQuestion);
      allQuestions.push(...valid);
      if (allQuestions.length >= MAX_QUESTIONS) break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      chunkErrors.push(`חלק ${i + 1}/${chunks.length}: ${msg}`);
    }
  }

  // De-duplicate by question text
  const seen = new Set<string>();
  const unique = allQuestions.filter((q) => {
    if (seen.has(q.text_he)) return false;
    seen.add(q.text_he);
    return true;
  });

  return { questions: unique.slice(0, MAX_QUESTIONS), chunkErrors };
}

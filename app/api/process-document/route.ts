import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractPdf, extractDocx } from "@/lib/file-processing/extract-text";
import { generateQuestionsFromText } from "@/lib/file-processing/generate-questions";
import {
  extractQAPairsFromDocx,
  extractQAPairsFromPdf,
} from "@/lib/file-processing/extract-qa-pairs";
import { generateDistractors } from "@/lib/file-processing/generate-distractors";

const MAX_QA_PAIRS = 200;
const QA_AUTODETECT_THRESHOLD = 5;

export const runtime = "nodejs";
// Allow up to 5 minutes for large documents
export const maxDuration = 300;

const ADULT_ROLES = new Set(["parent", "teacher", "admin"]);
const BATCH_INSERT_SIZE = 100;

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return json({ error: "לא מחובר למערכת" }, 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_blocked")
    .eq("id", user.id)
    .single();

  if (!profile || profile.is_blocked || !ADULT_ROLES.has(profile.role))
    return json({ error: "אין הרשאה" }, 403);

  // ── Body ──────────────────────────────────────────────
  const body = await request.json() as {
    fileId: string;
    practiceSetId: string;
    subject: string;
    topic: string;
  };

  const { fileId, practiceSetId, subject, topic } = body;
  if (!fileId || !practiceSetId)
    return json({ error: "חסרים פרטי קובץ או סט תרגול" }, 400);

  // ── Verify file ownership ──────────────────────────────
  const { data: fileRecord } = await supabase
    .from("uploaded_files")
    .select("id, file_url, file_type, uploaded_by, processing_status")
    .eq("id", fileId)
    .single();

  if (!fileRecord) return json({ error: "קובץ לא נמצא" }, 404);
  if (fileRecord.uploaded_by !== user.id && profile.role !== "admin")
    return json({ error: "אין הרשאה לקובץ זה" }, 403);
  if (fileRecord.file_type === "xlsx")
    return json({ error: "קבצי Excel מעובדים ב-endpoint נפרד" }, 400);

  // ── Verify practice set ownership ─────────────────────
  const { data: practiceSet } = await supabase
    .from("practice_sets")
    .select("id, created_by, subject_he, topic_he")
    .eq("id", practiceSetId)
    .single();

  if (!practiceSet) return json({ error: "סט תרגול לא נמצא" }, 404);
  if (practiceSet.created_by !== user.id && profile.role !== "admin")
    return json({ error: "אין הרשאה לסט זה" }, 403);

  // ── Mark as processing ─────────────────────────────────
  const admin = createAdminClient();
  await admin
    .from("uploaded_files")
    .update({ processing_status: "pending" })
    .eq("id", fileId);

  // ── Download file from Storage ────────────────────────
  const { data: blob, error: dlError } = await admin.storage
    .from("uploads")
    .download(fileRecord.file_url);

  if (dlError || !blob)
    return json({ error: "שגיאה בהורדת הקובץ לעיבוד" }, 500);

  const buffer = Buffer.from(await blob.arrayBuffer());

  // ── Extract text ──────────────────────────────────────
  let text: string;
  try {
    if (fileRecord.file_type === "pdf") {
      text = await extractPdf(buffer);
    } else {
      text = await extractDocx(buffer);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
    await admin
      .from("uploaded_files")
      .update({ processing_status: "failed", error_message: msg })
      .eq("id", fileId);
    return json({ error: `שגיאה בחילוץ טקסט מהקובץ: ${msg}` }, 500);
  }

  if (!text || text.length < 50) {
    await admin
      .from("uploaded_files")
      .update({
        processing_status: "failed",
        error_message: "הטקסט בקובץ קצר מדי לעיבוד",
      })
      .eq("id", fileId);
    return json({ error: "הקובץ אינו מכיל מספיק טקסט לעיבוד (מינימום 50 תווים)" }, 422);
  }

  // ── Generate questions via OpenAI ─────────────────────
  const subjectStr = subject || practiceSet.subject_he || "כללי";
  const topicStr   = topic   || practiceSet.topic_he   || "כללי";

  let questions: Awaited<ReturnType<typeof generateQuestionsFromText>>["questions"];
  let chunkErrors: string[];

  // Auto-detect: if the file is actually a Q&A list (table or alternating
  // lines), preserve it verbatim via the distractor path instead of letting
  // the AI re-author a small sample.
  let qaPairs: Awaited<ReturnType<typeof extractQAPairsFromPdf>> = [];
  try {
    qaPairs = fileRecord.file_type === "pdf"
      ? await extractQAPairsFromPdf(buffer)
      : await extractQAPairsFromDocx(buffer);
  } catch {
    qaPairs = [];
  }

  try {
    if (qaPairs.length >= QA_AUTODETECT_THRESHOLD) {
      const limited = qaPairs.slice(0, MAX_QA_PAIRS);
      const { questions: qs, errors } = await generateDistractors(limited);
      questions = qs;
      chunkErrors = errors;
    } else {
      ({ questions, chunkErrors } = await generateQuestionsFromText(
        text,
        subjectStr,
        topicStr
      ));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
    await admin
      .from("uploaded_files")
      .update({ processing_status: "failed", error_message: msg })
      .eq("id", fileId);
    return json({ error: `שגיאה ביצירת שאלות: ${msg}` }, 500);
  }

  if (questions.length === 0) {
    await admin
      .from("uploaded_files")
      .update({
        processing_status: "failed",
        error_message: "לא נוצרו שאלות",
      })
      .eq("id", fileId);
    return json({
      error: "לא הצלחנו לייצר שאלות מהקובץ. נסה קובץ עם טקסט ברור יותר.",
      chunkErrors,
    }, 422);
  }

  // ── Bulk-insert questions as draft (in batches) ────────
  let insertedCount = 0;
  for (let i = 0; i < questions.length; i += BATCH_INSERT_SIZE) {
    const batch = questions.slice(i, i + BATCH_INSERT_SIZE).map((q) => ({
      practice_set_id: practiceSetId,
      text_he:         q.text_he,
      option_a_he:     q.option_a_he,
      option_b_he:     q.option_b_he,
      option_c_he:     q.option_c_he,
      option_d_he:     q.option_d_he,
      correct_answer:  q.correct_answer,
      explanation_he:  q.explanation_he,
      difficulty:      q.difficulty,
      subject_he:      subjectStr,
      topic_he:        topicStr,
      status:          "draft",
      source_file_id:  fileId,
      created_by:      user.id,
    }));

    const { error: insertError } = await supabase
      .from("questions")
      .insert(batch);

    if (!insertError) insertedCount += batch.length;
  }

  // ── Update practice_set total_questions ───────────────
  const { count: qCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("practice_set_id", practiceSetId)
    .neq("status", "archived");

  await supabase
    .from("practice_sets")
    .update({ total_questions: qCount ?? 0 })
    .eq("id", practiceSetId);

  // ── Mark file processed ────────────────────────────────
  await admin
    .from("uploaded_files")
    .update({ processing_status: "processed" })
    .eq("id", fileId);

  const qaUsed = qaPairs.length >= QA_AUTODETECT_THRESHOLD;
  return json({
    success: true,
    questionsCreated: insertedCount,
    pairsFound: qaUsed ? qaPairs.length : undefined,
    chunkErrors,
    message: qaUsed
      ? `נוצרו ${insertedCount} שאלות מתוך ${qaPairs.length} זוגות שזוהו בקובץ. יש לאשר אותן לפני שהילד יוכל לשחק.`
      : `נוצרו ${insertedCount} שאלות טיוטה. יש לאשר אותן לפני שהילד יוכל לשחק.`,
  });
}

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

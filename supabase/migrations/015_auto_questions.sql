-- ═══════════════════════════════════════════════════════════
-- 015 — Ephemeral auto-generated questions on game_sessions
-- ═══════════════════════════════════════════════════════════
-- When the parent has not uploaded any practice questions, the
-- arena falls back to age/grade-based questions generated at
-- session start. Those questions live ONLY on the session row —
-- they are never inserted into public.questions and never
-- referenced by public.question_attempts (which has a FK to
-- questions.id). All per-attempt state for auto questions is
-- stored in auto_attempts JSONB on the same session.
--
-- Shape of auto_questions:
--   [{ id, text_he, option_a_he, option_b_he, option_c_he,
--      option_d_he, correct_answer, difficulty, subject_he,
--      explanation_he }]
-- Shape of auto_attempts:
--   [{ question_id, selected_answer, is_correct, answered_at }]

ALTER TABLE public.game_sessions
  ADD COLUMN IF NOT EXISTS auto_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS auto_attempts  JSONB NOT NULL DEFAULT '[]'::jsonb;

# Grade 1 Niqqud Update Plan

## File Locations

| Role | Path |
|------|------|
| Original Grade 1 question bank | `lib/fallback-questions.ts` |
| Niqqud copy (candidate replacement) | `lib/fallback-questions_with_niqqud.ts` |
| Update / validation script | `scripts/update-grade1-niqqud-dry-run.ts` |
| This document | `GRADE1_NIQQUD_UPDATE_PLAN.md` |

---

## What Was Changed (niqqud file only)

### Fields that WILL be updated (child-facing Hebrew display text)

| Field | Example |
|-------|---------|
| `text_he` | `"כמה זה 2 ועוד 3?"` → `"כַּמָּה זֶה 2 וְעוֹד 3?"` |
| `option_a_he` | `"שמש"` → `"שֶׁמֶשׁ"` |
| `option_b_he` | `"בית"` → `"בַּיִת"` |
| `option_c_he` | `"ירוק"` → `"יָרֹק"` |
| `option_d_he` | `"כלב"` → `"כֶּלֶב"` |
| `explanation_he` | auto-generated from the correct-answer option — gets niqqud by virtue of the option having niqqud |

**Note:** Numeric answer options (e.g. `"4"`, `"10"`, `"100"`) are left unchanged — niqqud is not applicable to digits.

### Fields that will NEVER be updated

| Field | Reason |
|-------|--------|
| `id` | Stable UUID — identity of each question |
| `correct_answer` | `A/B/C/D` — logic, never display text |
| `difficulty` | Metadata |
| `subject_he` | Category metadata (not primary child-facing reading text) |
| `grade_level` | Metadata |
| `category_he` | Metadata |
| Any DB schema column | This plan touches only text display fields |

---

## Grade 1 Question Bank Stats

- **Total questions:** 101
- **Questions with niqqud added:** all 101 (every Hebrew word in `text_he` and Hebrew answer options received niqqud)
- **Numeric-only answers:** unchanged (e.g. `"4"`, `"50"`, `"100"`)
- **Single Hebrew letters as answers** (letter-recognition questions): left as bare letters (niqqud on isolated letters without context is not standard practice)

---

## Where Grade 1 Questions Live in the System

The Grade 1 fallback questions in `lib/fallback-questions.ts` are **ephemeral** — they are stored as JSONB in `game_sessions.auto_questions` when a session starts (migration `015_auto_questions.sql`). They are **never inserted into `public.questions`**.

The update script targets `game_sessions.auto_questions` rows. Any new sessions created after `lib/fallback-questions.ts` is replaced with the niqqud version will automatically use niqqud.

---

## Commands

### Dry Run (safe — run this first)

```bash
npx tsx --env-file=.env.local scripts/update-grade1-niqqud-dry-run.ts
```

This will:
- Compare the 101 original questions vs 101 niqqud questions
- Validate all immutable fields are unchanged
- Query Supabase for live sessions with Grade 1 auto_questions
- Print exactly what would change
- Write NOTHING to Supabase

---

### Apply Command — ⚠️ DO NOT RUN WITHOUT USER APPROVAL

```bash
CONFIRM_GRADE1_NIQQUD_UPDATE=true \
  npx tsx --env-file=.env.local scripts/update-grade1-niqqud-dry-run.ts --apply
```

**This command will write to Supabase.** Only run after:
1. Reviewing the dry-run output and confirming it looks correct
2. Explicit user approval
3. Having a rollback plan in place (see below)

The script requires BOTH the `--apply` flag AND `CONFIRM_GRADE1_NIQQUD_UPDATE=true`. If either is missing, it exits without writing.

---

## To Replace the Production Source File

After approving the niqqud version, the production code change is:

1. Review `lib/fallback-questions_with_niqqud.ts` vs `lib/fallback-questions.ts`
2. Rename / replace:
   ```
   lib/fallback-questions.ts  ← replace with niqqud version contents
   ```
3. Delete `lib/fallback-questions_with_niqqud.ts` (no longer needed)
4. Run `npx tsc --noEmit` to verify TypeScript
5. Test the arena with a Grade 1 child profile
6. Commit, deploy

---

## Rollback Plan

- The original file `lib/fallback-questions.ts` is **never touched** by the update script.
- New game sessions are always generated from `lib/fallback-questions.ts` (or its replacement).
- For existing sessions: the `auto_questions` JSONB can be reverted by running the same script with a reverse mapping (niqqud → original) using a mirrored script, or by restoring from a Supabase backup.
- The safest rollback is always keeping `lib/fallback-questions.ts` (original, no niqqud) committed in git.

---

## Uncertainty / Notes

1. **Single-letter answers** — Questions like `'בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "בַּיִת"?'` have answer options `"ב", "י", "ת", "א"` (individual letters). These were left without niqqud. Adding niqqud to isolated letters without syllabic context is non-standard and could confuse readers. **Review with a Hebrew language expert if needed.**

2. **Niqqud accuracy** — The niqqud was added by applying standard Israeli Hebrew vowel rules. A native Hebrew-language educator should review before going live in a Grade 1 classroom product.

3. **subject_he fields** — `"חשבון"`, `"עברית"`, `"מדעים"`, `"ידע כללי"` were left without niqqud. If the UI displays these labels to children (as category names), consider adding niqqud separately.

4. **`explanation_he`** — Generated dynamically from the correct-answer option text. In the source file it is a template string. In the script comparison, it is computed at array build time, so it correctly reflects niqqud when the answer option has niqqud.

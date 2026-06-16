# Grade 1 Niqqud Update — Pre-Apply Review

**Date:** 2026-06-11  
**Reviewer:** Claude Code (investigation only — no writes performed)  
**Status:** DO NOT APPLY until this review is approved

---

## 1. Actual Source of Truth for Grade 1 Questions

**Primary source of truth: `lib/fallback-questions.ts`**

This file defines `GRADE_1_BANK` — 101 pre-built questions used as fallback when:
- OpenAI times out or fails during session generation
- More than 50% of OpenAI-generated questions are rejected by safety filters

The candidate replacement is `lib/fallback-questions_with_niqqud.ts` — identical structure, Grade 1 only, with Hebrew diacritical marks (niqqud) added to child-facing text fields.

There is **no separate Supabase `questions` table for auto-generated questions**. Auto-questions are never inserted into `public.questions`. They live entirely inside `game_sessions.auto_questions` (JSONB) for the duration of the session. The `public.questions` table is only used for parent-uploaded practice sets.

---

## 2. Where New Battles Source Grade 1 Questions

New battles go through this pipeline in `app/actions/arena.ts`:

1. **Child starts arena** → `startArenaSession()`
2. No parent mission → calls `generateAutoArenaQuestions(grade=1, count=10)` in `lib/auto-questions.ts`
3. OpenAI `gpt-4o-mini` called with Grade 1 constraints (8-second timeout)
4. **On timeout/failure** → `getFallbackQuestions(1, 10)` from **`lib/fallback-questions.ts`** (current source)
5. Grade 1 safety filters applied (keyword block + numeric range 0–20)
6. Session created: `INSERT INTO game_sessions (auto_questions: [...])` — full question objects stored as JSONB
7. `auto_questions` JSONB contains `correct_answer` (server-side only; stripped before sending to client)

**New sessions from this point forward will use whichever file `getFallbackQuestions()` imports.**  
Currently that is `lib/fallback-questions.ts` (no niqqud).  
To make all *future* sessions use niqqud, the correct action is to **replace `lib/fallback-questions.ts`** (or swap its Grade 1 bank) — not to patch historical `game_sessions` rows.

---

## 3. What `game_sessions.auto_questions` Is

`game_sessions.auto_questions` is **historical/session data** — a JSONB snapshot of the questions that were shown in a specific past battle. It is:

- Written once at session creation
- Read by `submitAnswer()` to validate the child's answer against `correct_answer`
- Never used to generate new sessions (new sessions call `getFallbackQuestions()` fresh)

It is **NOT** an active question bank. Updating it changes what text a child would see *if they replay a historical session*, but has no effect on future new sessions.

---

## 4. Recommendation

| Target | Action | Justification |
|--------|--------|---------------|
| `lib/fallback-questions.ts` — Grade 1 bank | **YES — replace with niqqud version** | This is the source of truth; all future sessions will use niqqud |
| `game_sessions.auto_questions` (historical rows) | **OPTIONAL / LOW PRIORITY** | Historical sessions already completed; updating only changes display text if a child somehow re-views a past session |

**Recommended approach:**  
1. Swap `lib/fallback-questions.ts` Grade 1 bank to use the niqqud text from `lib/fallback-questions_with_niqqud.ts`.  
2. Skip the Supabase `game_sessions` patch entirely, or run it as a cosmetic cleanup with low urgency.  
3. Do NOT treat `game_sessions.auto_questions` as the primary target.

---

## 5. Exact Fields the Script Would Update

The script updates only these fields per question inside `game_sessions.auto_questions`:

| Field | Change |
|-------|--------|
| `text_he` | Adds niqqud to question text |
| `option_a_he` | Adds niqqud to Hebrew word options (numeric options unchanged) |
| `option_b_he` | Same |
| `option_c_he` | Same |
| `option_d_he` | Same |
| `explanation_he` | Adds niqqud to explanation text |

**Fields explicitly NOT touched:**
`id`, `correct_answer`, `difficulty`, `subject_he`, `grade_level`, any other metadata

---

## 6. Matching Method — How the Script Identifies Which Questions to Update

**Matching is by `text_he` (question text string) — positional index is used only between the two local arrays.**

From the script (`scripts/update-grade1-niqqud-dry-run.ts`, lines 383–386):
```typescript
const niqqudByOrigText = new Map<string, Q>();
for (let i = 0; i < ORIGINAL_GRADE1.length; i++) {
  niqqudByOrigText.set(ORIGINAL_GRADE1[i]!.text_he, NIQQUD_GRADE1[i]!);
}
```

Then for each question inside a stored session:
```typescript
const niqqudQ = aq.text_he ? niqqudByOrigText.get(aq.text_he) : undefined;
if (!niqqudQ) return aq; // not a Grade 1 fallback question — leave untouched
```

- Match key: `aq.text_he` (the stored Hebrew question text, without niqqud)
- Lookup: `niqqudByOrigText` Map — original text → niqqud version
- Miss: any question not in the map is left completely untouched

---

## 7. Risks of Matching Without Stable IDs

**Risk level: LOW for the source-file swap; MEDIUM for the Supabase historical patch.**

### Risks for the Supabase historical session patch

| Risk | Detail | Severity |
|------|--------|----------|
| **No stable ID in sessions** | Auto-question IDs are synthetic UUIDs (`auto-<uuid>`) generated fresh at each session creation — they are not tied to the source bank by index or a stable identifier | LOW — the script avoids this by matching on `text_he` |
| **Text match could fail silently** | If a historical session contains an OpenAI-generated question that happens to share `text_he` with a fallback question, it would be "upgraded" with niqqud even though it wasn't from the fallback bank | UNLIKELY — OpenAI output almost never exactly matches the bank string |
| **No match = silent skip** | Questions without a match in the map are left unchanged, producing mixed niqqud/non-niqqud sessions | LOW IMPACT — historical data only |
| **No rollback mechanism** | There is no undo path in the script if the update produces wrong results | MEDIUM — Supabase doesn't auto-snapshot JSONB fields |
| **`correct_answer` cannot change** | The script explicitly does not modify `correct_answer`; validated by immutable-field check at lines 340–347 | SAFE — already protected |

### Risks for the source-file swap (recommended action)

The source-file swap has **LOW risk**: only `text_he` and option text change; `correct_answer`, `difficulty`, and `subject_he` are hardcoded in the `q()` call signature and never touched by the niqqud files.

---

## 8. Before/After Examples from `fallback-questions_with_niqqud.ts`

### Math Examples (10 of 101)

| # | Field | Original (`fallback-questions.ts`) | With Niqqud (`fallback-questions_with_niqqud.ts`) |
|---|-------|------------------------------------|---------------------------------------------------|
| 1 | text_he | `כמה זה 2 ועוד 3?` | `כַּמָּה זֶה 2 וְעוֹד 3?` |
| 1 | option_a_he | `4` | `4` (unchanged — numeric) |
| 2 | text_he | `כמה זה 6 פחות 2?` | `כַּמָּה זֶה 6 פָּחוֹת 2?` |
| 3 | text_he | `כמה זה 10 ועוד 5?` | `כַּמָּה זֶה 10 וְעוֹד 5?` |
| 4 | text_he | `כמה זה 15 פחות 5?` | `כַּמָּה זֶה 15 פָּחוֹת 5?` |
| 5 | text_he | `כמה זה 20 פחות 5?` | `כַּמָּה זֶה 20 פָּחוֹת 5?` |
| 6 | text_he | `כמה זה 40 ועוד 20?` | `כַּמָּה זֶה 40 וְעוֹד 20?` |
| 7 | text_he | `כמה זה 80 פחות 30?` | `כַּמָּה זֶה 80 פָּחוֹת 30?` |
| 8 | text_he | `מה גדול יותר: 6 או 9?` | `מָה גָּדוֹל יוֹתֵר: 6 אוֹ 9?` |
| 8 | option_c_he | `שניהם שווים` | `שְׁנֵיהֶם שָׁוִים` |
| 9 | text_he | `מה קטן יותר: 3 או 8?` | `מָה קָטָן יוֹתֵר: 3 אוֹ 8?` |
| 10 | text_he | `איזה מספר הוא זוגי?` | `אֵיזֶה מִסְפָּר הוּא זוּגִי?` |
| 10 | correct_answer | `C` | `C` (unchanged — immutable) |

### Hebrew/Letter Examples (5)

| # | Field | Original | With Niqqud |
|---|-------|----------|-------------|
| 11 | text_he | `באיזו אות מתחילה המילה "בית"?` | `בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "בַּיִת"?` |
| 12 | text_he | `באיזו אות מתחילה המילה "חתול"?` | `בְּאֵיזוֹ אוֹת מַתְחִילָה הַמִּלָּה "חָתוּל"?` |
| 13 | text_he | `מה ההפך מ"גדול"?` | `מָה הַהֵפֶךְ מ"גָּדוֹל"?` |
| 13 | option_a_he | `גבוה` | `גָּבוֹהַּ` |
| 13 | option_b_he | `קטן` | `קָטָן` |
| 14 | text_he | `איזו מילה מתחרזת עם "ים"?` | `אֵיזוֹ מִלָּה מִתְחָרֶזֶת עִם "יָם"?` |
| 14 | option_a_he | `חם` | `חַם` |
| 14 | option_b_he | `סים` | `סִים` |
| 15 | text_he | `איזו מילה מתחילה באות ש?` | `אֵיזוֹ מִלָּה מַתְחִילָה בְּאוֹת שׁ?` |
| 15 | option_a_he | `שמש` | `שֶׁמֶשׁ` |
| 15 | option_b_he | `בית` | `בַּיִת` |

### Examples with Full Answer Option Changes (5)

| # | text_he | option_a | option_b | option_c | option_d | correct |
|---|---------|----------|----------|----------|----------|---------|
| 16 | `מה ההפך מ"יום"?` | `שמש` → `שֶׁמֶשׁ` | `לילה` → `לַיְלָה` | `בוקר` → `בֹּקֶר` | `אור` → `אוֹר` | B (unchanged) |
| 17 | `איזו מילה היא שם של בעל חיים?` | `כיסא` → `כִּסֵּא` | `שולחן` → `שֻׁלְחָן` | `כלב` → `כֶּלֶב` | `עיפרון` → `עִפָּרוֹן` | C (unchanged) |
| 18 | `מה לובשים כשקר?` | `מעיל` → `מְעִיל` | `בגד ים` → `בֶּגֶד יָם` | `סנדלים` → `סַנְדָּלִים` | `כובע שמש בלבד` → `כּוֹבַע שֶׁמֶשׁ בִּלְבַד` | A (unchanged) |
| 19 | `מה עושים לפני שחוצים כביש?` | `רצים מהר` → `רָצִים מַהֵר` | `עוצרים ומסתכלים` → `עוֹצְרִים וּמִסְתַּכְּלִים` | `עוצמים עיניים` → `עוֹצְמִים עֵינַיִם` | `משחקים` → `מְשַׂחֲקִים` | B (unchanged) |
| 20 | `באיזה איבר אנחנו שומעים?` | `עיניים` → `עֵינַיִם` | `אוזניים` → `אָזְנַיִם` | `ברכיים` → `בִּרְכַּיִם` | `שיניים` → `שִׁנַּיִם` | B (unchanged) |

---

## 9. Uncertain Niqqud Cases

The following cases warrant careful review:

| Question | Concern |
|----------|---------|
| `אי־זוגי` → `אִי־זוּגִי` | Hyphenated compound word — niqqud placement across hyphen is unusual |
| `גָּבוֹהַּ` (option for "opposite of big") | Double dagesh at end (`הַּ`) — less common form; standard modern Hebrew often writes `גָּבוֹהַ` with single dagesh |
| `שֶׁמֶשׁ` in option_a_he for "starts with ש" | The word appears both as an option and embedded in question text in different questions — both instances updated consistently |
| `כּוֹבַע שֶׁמֶשׁ בִּלְבַד` (option D for wearing in cold) | Multi-word option — all words niqqud'd; verify this reads naturally |
| Single-letter answer options (`ב`, `י`, `ת`, `א` etc.) | The niqqud file leaves single-letter options **WITHOUT niqqud** — intentional per line 31 comment in the file. This is correct: adding niqqud to isolated letter options (e.g. the answer to "which letter does בית start with?") would change the pedagogical meaning |

---

## 10. TypeScript Typecheck Result

```
npx tsc --noEmit
```

**Result: PASSED — no errors, no output.**

---

## 11. Final Recommendation

### Should you run `--apply` on `game_sessions.auto_questions`?

**NOT recommended as the primary action.** It is not the source of truth.

**The correct and sufficient action is:**

1. **Swap the source file** — replace the Grade 1 bank in `lib/fallback-questions.ts` with the niqqud version (copy from `lib/fallback-questions_with_niqqud.ts`). All future sessions automatically use niqqud. No Supabase write needed.

2. **The `game_sessions` patch is cosmetic** — it only affects historical completed sessions. Since answers are already submitted and stored, updating the display text has no gameplay effect. If you want visual consistency in session history, run the patch after the source-file swap. If you don't care about historical display, skip it entirely.

### Risk Summary

| Action | Risk | Verdict |
|--------|------|---------|
| Source-file swap (`fallback-questions.ts`) | **LOW** — only display text changes, no logic/answer changes, TS passes clean | **SAFE — do this** |
| Supabase `game_sessions` patch (historical) | **MEDIUM** — no rollback, text-match only, affects historical data | **OPTIONAL — low urgency** |
| Running `--apply` without source-file swap | Pointless — future sessions still generate without niqqud | **DO NOT DO** |

### Overall Risk Level: **LOW** (for source-file swap) / **MEDIUM** (for Supabase patch)

---

*No files were modified, no Supabase writes were performed, no build was run. TypeScript check only.*

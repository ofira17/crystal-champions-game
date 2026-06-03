@AGENTS.md

## Enemy Damage Visual Rule

Enemy damage feedback should shrink from full size to 50% while HP > 0, and only disappear/dissolve on the final hit.
- `opacity` must stay at 1 throughout battle — never fade the enemy based on HP
- Scale formula: `scale = 0.5 + (hp / 100) * 0.5` (100% HP = scale 1.0, 0% HP = scale 0.5)
- Final defeat: `enemy-defeat-seq` CSS class plays crystal-dissolve animation in `victory-anim` phase only
- Hit reaction (flash + shake): keep `enemy-crystal-hit` class, applies to inner div only

## Battle Movement Rule

All battle movement happens inside the arena only. Before each question, Miti and the enemy move quickly for ~1 second into battle positions, then the question appears. During this staging period (~1050ms), the contact trigger is blocked so the question cannot open early. Miti walks in from the left edge (x≈11→35), enemy charges in from the right edge at 2.5× normal speed. After staging ends, normal AI and player control resume.

**Arena staging rules (DO NOT break these):**
- Miti and enemy must ALWAYS stay FULLY inside the arena — never start outside or clipped
- x=11 is the leftmost valid start position (sprite half-width 63px keeps it inside at all screen sizes)
- At battle start, both move quickly inside the arena for ~1 second (staging window = 1050ms)
- Miti starts at x=11 (left edge, inside) and walks to x=35 at MOVE_SPEED×1.3 (~0.54s of visible movement)
- Enemy starts at x=82–94 (right edge, inside) and charges in at 2.5× normal speed
- Question panel appears ONLY after staging ends (both characters in position)
- Miti should visibly walk in — not barely slide

Arena: `app/child/arena/page.tsx`

**Character positioning:**
- Hero (Miti) starts at x=35 (battle position, left side of arena), y=60; enters from x=11
- Goblin enemy spawns at x=82–94 (right side)
- Hero always uses left/right profile sprites — never `attack-front.png` or `attack-back.png`
- Hero idle and attack sprites are chosen based on enemy.x vs hero.x (left = `idle-left` / `attack-left`, right = `idle-right` / `attack-right`)
- Enemy facing: `enemyX > heroX` → face left (toward hero). Sprites are FRONT-FACING PNGs — a CSS `perspective(300px) rotateY(-40deg)` 3D transform is applied in `CrystalEnemy.tsx` to simulate a side/profile view. Never remove this transform or the enemy will appear front-facing.

**Crystal beam:**
- SVG beam connects Miti's attack hand → enemy center
- Attack hand origin: x = heroCenter ± 52px (right when facing right, left when facing left), y = heroTop + 68px (chest height)
- Stroke widths: outer halo 32px, mid glow 14px, main 7px, core 3px
- Direction is always position-based (actual hero/enemy coords), never a fixed angle

**Projectile:**
- Same origin as beam (attack hand, not sprite center)
- `projectileDriftPx` and `projectileTravelPx` follow exact beam vector to enemy center

## Deployment Rule

Production deploys **only** from the `canonical` remote (`ofira17/crystal-champions-game`).
Pushing only to `origin` (`ofira17/crystal-champions`) will **NOT** update Vercel.
Always run `git push canonical main` (in addition to `git push origin main`) to deploy.

**A commit is not considered live until production bundles contain the changed class/function — not only because GitHub HEAD changed.**
Vercel may cache a prior build or be mid-deploy. To confirm a change is live, fetch the production bundle and grep for the new symbol. If it's an inline `<style>` in a route component (not a global CSS file), it lives in the route's lazy-loaded JS chunk, not in the global CSS bundle — verify the JS chunk, not the CSS file.

# Crystal Champions — Source-of-Truth Rules

## Project Identity

- **App folder:** `C:\Users\97253\Desktop\קלוד\crystal-champions`
- **Framework:** Next.js (NOT Vite, NOT React standalone)
- **Vercel project:** `crystal-champions-game`
- **Production URL:** https://crystal-champions-game.vercel.app
- **Real arena route:** `/child/arena`

## Deployment Rules

- Vercel framework must stay set to **nextjs**.
- `vercel.json` containing `{"framework":"nextjs"}` must always remain in the repo root.
- **Deploy ONLY from:** `C:\Users\97253\Desktop\קלוד\crystal-champions` — never from a default scaffold, `miti-heroquest`, or any other folder.
- Deploy command: `vercel --prod --yes` run from inside that folder.
- **Do NOT use or deploy `miti-heroquest`.**
- **Do NOT use Lovable** — Lovable is preview-only and not the source of truth.
- The root URL (`/`) redirects to `/child/arena`, which then redirects to `/auth/login` for unauthenticated users. This is correct behavior — "Create Next App" in the title is a metadata issue, NOT a broken deployment.

## Deployment Status (as of 2026-06-03)

- **Correct production deployment is live** from `C:\Users\97253\Desktop\קלוד\crystal-champions`
- **Production URL:** https://crystal-champions-game.vercel.app
- **Live commit:** 498a094
- **Title issue:** was metadata only (`"Create Next App"`), fixed to `"Crystal Champions"` — not a wrong-app deployment

## QA Rules

- Visual issues must be verified in the **real production arena** at https://crystal-champions-game.vercel.app/child/arena, not only by reading code.
- **All child profiles must be tested, not only child 1.** Arena entry must work for child 2+ when they have an available challenge. The arena button must be enabled for any child in `hero_training` or `world_mysteries` mode, even if no `child_missions` row exists for them.

## Grade-Level Question Rules (Israeli MoE Curriculum — Source of Truth)

**Central rules file:** `lib/grade-subject-rules.ts` (all subjects, all grades 1-6)
**Math rules file:** `lib/math-grade-rules.ts` (detailed math-specific validation)

### Style/Level References (do NOT copy text — use only as level guide)
- **Math:** שבילים, שבילים פלוס, ה.ש.ב.ח.ה
- **Hebrew:** מפתח הקסם (gr 1-2), בסוד העניינים (gr 3-4), מילה טובה (gr 5-6)
- **Science:** במבט חדש
- **English:** ECB / UPB beginner books
- **Bible:** grade-level Tanach curriculum
- **Geography/History:** grades 1-3 = מולדת/סביבה קרובה only; real geography/history only from grade 4

### Math Grade Rules

| כיתה | פעולות מותרות | טווח מספרים | אסור |
|------|--------------|-------------|------|
| 1 | חיבור, חיסור | עד 20; עשרות עד 100 | כפל, חילוק, שברים, אחוזים, עשרוניות |
| 2 | חיבור/חיסור עד 100, כפל ב-2/5/10 | עד 1000 (קריאה/כתיבה), חישוב עד 100 | חילוק, שברים, אחוזים |
| 3 | ארבע פעולות, שברים פשוטים ½ ¼ ⅓ | עד 10,000 | אחוזים, עשרוניות, אלגברה |
| 4 | ארבע פעולות, שברים (מכנה שווה), שטח/היקף מלבן | עד מיליון | אחוזים, עשרוניות, שברים מכנה שונה |
| 5 | שברים מכנים שונים, עשרוניות, אחוזים פשוטים, שטח משולש | מספרים עשרוניים | אלגברה, נפח, מספרים שליליים |
| 6 | כל פעולות השברים, אחוזים, יחס, אלגברה ראשונית, נפח תיבה | כולל מספרים שליליים (-20 עד 0) | משוואות ממעלה שניה, טריגונומטריה |

### Per-Subject Grade Rules (selected critical constraints)

| מקצוע | כיתה 1 אסור | כיתה 1-2 אסור | כיתה 4+ מותר |
|-------|------------|--------------|--------------|
| מדעים | פוטוסינתזה, מערכות גוף, אטומים, כוכבים | מחזור מים מורכב, כוחות | מערכת השמש, אקולוגיה |
| גיאוגרפיה | יבשות, מדינות, מפות | כל גיאוגרפיה מחוץ לישראל | יבשות, מדינות, מפות |
| היסטוריה | מלחמות, מהפכות | היסטוריה עולמית | מלחמות עולם, ציונות |
| עברית | דקדוק, שורשים | בניינים | כל הבניינים |
| אנגלית | past tense, reading texts | irregular verbs | all tenses |

### Enforcement
- `buildAllSubjectsInstruction(grade)` — injects per-subject rules into AI prompt
- `buildMathGradeInstruction(grade)` — injects math rules into AI prompt
- `validateMathQuestion(text, grade)` — post-generation math validation; rejects violations
- `validateSubjectQuestion(text, subject, grade)` — post-generation non-math validation; rejects violations
- All validation is in `lib/auto-questions.ts` → `generateAutoArenaQuestions()`

## Battle Visual Requirements

- Miti and the enemy must **face each other** like a real battle (Miti on the left facing right, enemy on the right facing left).
- Crystal shots must travel **from Miti's real on-screen position** to the **enemy's current body/center position**.
- **No hardcoded wrong-direction shots.** Shot direction must be calculated from actual element positions at fire time.

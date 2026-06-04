@AGENTS.md

## Permission / Confirmation Rule

For normal safe development tasks, do not ask the user for confirmation after every small code edit. Proceed independently through safe file edits, formatting fixes, UI/CSS tweaks, local build checks, commits, pushes to canonical/main, and production verification.

Only ask the user before:
- Deleting files
- Changing secrets/env variables
- Changing Supabase/auth/security/RLS/database schema
- Changing Vercel/project config
- Installing new packages
- Making broad unrelated refactors
- Changing app logic outside the requested fix

For each task: understand the request → make the smallest safe fix → run checks → commit → push to canonical/main → deploy/verify production when required → report only at the end.

Report only: files changed, commit.

## Enemy Damage Visual Rule (CANONICAL — DO NOT revert)

Enemy starts LARGE and shrinks with each HP loss. At final hit, reaches small baseline, then dissolves.
- `opacity` must stay at 1 throughout battle — never fade the enemy based on HP
- **NEVER use CSS `transform: scale()` for HP-based sizing** — `overflow: hidden` clips scaled content. Drive size via `width`/`height` directly on the inner div.
- Size formula in `CrystalEnemy.tsx`: `visualPx = SMALL_PX + (px - SMALL_PX) * (hp / 100)`
  - At 100% HP → `px` (the dynamic base size from `dynEnemySize` in arena page)
  - At 0% HP → `SMALL_PX` (120px baseline), then defeat animation
- Transition: `width 0.35s ease-out, height 0.35s ease-out` — each hit visibly shrinks

## Enemy Size — Responsive Sizing Rule (CANONICAL — DO NOT revert)

**Root cause (2026-06-04):** The battle `<main>` used `min-h-screen` and the arena had `minHeight: 400`. On mobile landscape (375px viewport), the layout extended ~520px but the viewport clipped at 375px. The AI loop used `arenaRef.current.offsetHeight = 400px` (DOM height) for bounds, placing the enemy at y=65% × 400 = 260px from arena top. Only 255px of the arena was visible. The enemy center was 5px below the viewport. Only the top 108px (42%) of the 260px sprite was visible — making it look tiny. Additionally, HP-based shrinking caused the sprite to grow MORE visible (less clipped) as it took damage — backwards from intended.

**Second cause:** The enemy wrapper is a flex column: HP bar (≈30px) + 4px gap + sprite (`eSz` px). `translate(-50%, -50%)` centers the whole column, so the sprite centre is 17px BELOW the anchor. The old bounds used only `eSz/2` as half-height, causing the sprite bottom to consistently overflow the arena by ~17px (clipped by `overflow: hidden`).

**Fix applied:**
1. Battle `<main>` changed from `min-h-screen` to `h-screen` — layout is constrained to viewport.
2. `minHeight: 400` removed from arena section — arena fills remaining viewport space via `flex-1`.
3. `arenaH` state + resize-aware `useEffect` measures the actual rendered arena height.
4. `dynEnemySize = max(150, min(variantMax, round(arenaH * 0.62)))` — enemy always fills ~62% of the visible arena height, capped at variant design max (260-340px).
5. Bounds clamping in AI loop uses `halfH = eSz/2 + 17` (accounts for HP bar offset) and responsive `eSz` from arena height — eyMin/eyMax are always valid (eyMin < eyMax).

**Required base sizes in `VARIANT_META` (components/child/CrystalEnemy.tsx):**
- goblin: 260px (design max — actual size will be ≤ this, scaled to arena height)
- bat: 280px
- giant: 340px
- wizard: 300px

**AI bounds rule:** In the arena page AI loop, `eSz` MUST be computed as `max(150, min(VAR_MAX, round(ah2 * 0.62)))` and halfH MUST include the HP bar offset (`eSz/2 + 17`). eyMin/eyMax must be guarded so eyMin < eyMax always.

## Enemy Yellow Aura (CANONICAL — DO NOT remove)

A soft yellow radial glow is rendered behind every enemy sprite via an absolute-positioned `div` inside the size container in `CrystalEnemy.tsx`. It uses `inset: "-18%"` so the aura scales proportionally with the sprite at all HP sizes. The aura sits at `zIndex: 0`; the `<img>` sits at `zIndex: 1`. Do not remove or suppress this aura.

## Miti Size Rule

Miti must keep normal full size during arena staging and battle walking. Only the enemy uses HP-based shrinking.
- Run sprites (`run-right.png`, `run-right2.png`) have ~30% extra transparent canvas; apply `scale(1.35)` with `transformOrigin: "bottom center"` during staging and running to compensate.
- `scale(1.35)` during staging/walking, `scale(1.18) translateY(-8px)` during attack — never reduce Miti below 1.0 scale.
- Do NOT apply enemy HP scaling or any staging shrink to Miti's sprite.

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

## Deployment Status (as of 2026-06-05)

- **Correct production deployment is live** from `C:\Users\97253\Desktop\קלוד\crystal-champions`
- **Production URL:** https://crystal-champions-game.vercel.app
- **Live commit:** 463c697
- **Last deploy:** manual redeploy via `vercel redeploy` — GitHub push did not auto-trigger Vercel

## Recovery: GitHub push did not trigger Vercel

If `git push canonical main` does not trigger a Vercel build, manually redeploy the latest production deployment:
```
vercel redeploy <latest-production-deployment-url> --target production
```
Then verify production chunks changed: fetch https://crystal-champions-game.vercel.app and confirm `/_next/static/chunks/` URLs changed from the previous build. If chunks are identical, the new build is not live — redeploy again.

## QA Rules

- Visual issues must be verified in the **real production arena** at https://crystal-champions-game.vercel.app/child/arena, not only by reading code.
- **All child profiles must be tested, not only child 1.** Arena entry must work for child 2+ when they have an available challenge. The arena button must be enabled for any child in `hero_training` or `world_mysteries` mode, even if no `child_missions` row exists for them.
- **Visual arena QA requires a real authenticated parent+child session or user-provided video. Do not create live test users unless cleanup is included.**

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

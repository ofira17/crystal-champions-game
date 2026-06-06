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

## Local Permissions File — Exact Path Rule

The Claude Code local permissions file for this project **must** be located at:

```
C:\Users\97253\Desktop\קלוד\crystal-champions\.claude\settings.local.json
```

- The `.claude` folder must be **inside** the `crystal-champions` project folder.
- Do **NOT** create `settings.local.json` anywhere outside that path (e.g., not in `crystal-champions.claude\` as a sibling folder).

## Local Permission Policy (crystal-champions.claude/settings.local.json)

`defaultMode: acceptEdits` — file edits auto-approved; Bash commands require explicit allow entry.

**Auto-allowed (no prompt):**
- `git status`, `git diff`, `git log`, `git add *`, `git commit *`
- `git push canonical main`
- `npm run build`, `npm run lint`, `npm test`, `npx tsc --noEmit`
- `vercel inspect *`, `vercel list`, `vercel ls`, `vercel redeploy *`
- All Read / Edit / Write / Glob / Grep file operations

**Always denied (hard block):**
- Reading `.env` or `.env.*` files
- `rm`, `rmdir`, `del`, `Remove-Item` (any file/folder deletion)
- `npm install`, `npm i`, `npm ci` (package installs)
- Supabase schema/migration/function-deploy commands
- Editing `vercel.json` or `.vercelignore`

**Never set:** `bypassPermissions` or `dangerously-skip-permissions`.

## Battle Enemy Flow (CANONICAL — DO NOT revert)

### Entry sequence
1. Miti auto-walks into arena first (staging ~1050ms, x=11→35). Enemy is hidden (`opacity:0` on enemyRef div).
2. When staging ends, enemy SUDDENLY appears inside the arena with a pop animation (`enemy-appear 0.55s`). The enemy AI runs during staging at 2.5× speed so it is already well inside the arena when it becomes visible.
3. Enemy starts at 100% size (full `dynEnemySize` px).

### Size shrink on correct answers
- **NEVER use CSS `transform: scale()` for HP-based sizing** — `overflow: hidden` clips scaled content. Drive size via `width`/`height` directly on the inner div.
- Size formula in `CrystalEnemy.tsx`: `minPx = px*0.5; visualPx = minPx + (px - minPx) * (hp / 100)`
  - At 100% HP → `px` (full size)
  - At 0% HP → `px * 0.5` (50% of starting size — the floor enforced DURING the round)
- Transition: `width 0.35s ease-out, height 0.35s ease-out` — each correct hit visibly shrinks
- Enemy never shrinks below 50% of its starting size while the round is active.

### Victory dissolve
- When the child reaches ≥90% correct answers AND the boss is defeated: enemy dissolves with a smooth white fade-out animation (`enemy-dissolve 0.95s`) directly in the arena, then the victory screen appears. No separate shatter animation.
- If <90% correct + boss defeated: victory screen appears immediately.
- The `victory-anim` phase is no longer triggered from the answer/megahit handlers.

## Enemy Size — Responsive Sizing Rule (CANONICAL — DO NOT revert)

**Root cause (2026-06-04):** The battle `<main>` used `min-h-screen` and the arena had `minHeight: 400`. On mobile landscape (375px viewport), the layout extended ~520px but the viewport clipped at 375px. The AI loop used `arenaRef.current.offsetHeight = 400px` (DOM height) for bounds, placing the enemy at y=65% × 400 = 260px from arena top. Only 255px of the arena was visible. The enemy center was 5px below the viewport. Only the top 108px (42%) of the 260px sprite was visible — making it look tiny. Additionally, HP-based shrinking caused the sprite to grow MORE visible (less clipped) as it took damage — backwards from intended.

**Second cause:** The enemy wrapper is a flex column: HP bar (≈30px) + 4px gap + sprite (`eSz` px). `translate(-50%, -50%)` centers the whole column, so the sprite centre is 17px BELOW the anchor. The old bounds used only `eSz/2` as half-height, causing the sprite bottom to consistently overflow the arena by ~17px (clipped by `overflow: hidden`).

**Fix applied:**
1. Battle `<main>` changed from `min-h-screen` to `h-screen` — layout is constrained to viewport.
2. `minHeight: 400` removed from arena section — arena fills remaining viewport space via `flex-1`.
3. `arenaH` state + resize-aware `useEffect` measures the actual rendered arena height.
4. `dynEnemySize = max(150, min(variantMax, round(arenaH * 0.72)))` — enemy always fills ~72% of the visible arena height, capped at variant design max (320-400px).
5. Bounds clamping in AI loop uses `halfH = eSz/2 + 17` (accounts for HP bar offset) and responsive `eSz` from arena height — eyMin/eyMax are always valid (eyMin < eyMax).

**Required base sizes in `VARIANT_META` (components/child/CrystalEnemy.tsx):**
- goblin: 320px (design max — actual size will be ≤ this, scaled to arena height)
- bat: 340px
- giant: 400px
- wizard: 360px

**AI bounds rule:** In the arena page AI loop, `eSz` MUST be computed as `max(150, min(VAR_MAX, round(ah2 * 0.72)))` and halfH MUST include the HP bar offset (`eSz/2 + 17`). eyMin/eyMax must be guarded so eyMin < eyMax always.

## Enemy White Aura (CANONICAL — DO NOT remove)

The white aura is applied as CSS `filter: drop-shadow(...)` directly on the `<img>` element in `CrystalEnemy.tsx`. Three stacked drop-shadows (8px/18px/30px) at white/cool-white RGBA values create a semi-transparent glow that follows the PNG alpha channel — hugging the sprite's body silhouette. Do NOT use a radial-gradient circle div; that creates a circular halo unrelated to the sprite shape. Do not remove or suppress the yellowGlow filter on the img. (Variable is still named `yellowGlow` in code — color is white.)

**VARIANT_META glow values MUST all be white/cool-white** — no orange, amber, gold, or warm colors. All four variants use rgba values in the 200-255 white/purple range:
- goblin: `rgba(74,222,128,0.75)` (green — acceptable, not warm)
- bat: `rgba(167,139,250,0.80)` (purple)
- giant: `rgba(220,220,255,0.85)` (cool-white — was orange rgba(251,113,30) FIXED 2026-06-06)
- wizard: `rgba(168,85,247,0.85)` (purple)

The `meta.glow` value is also used in the `dropShadow` (idle and lowHp states) — any warm color there will appear as an orange aura around the enemy body.

**Target lock ring** (shown during battle/challenge phases, `locked=true`): uses CSS `border` + `box-shadow` on absolute-positioned divs. MUST use cool-white `rgba(220,235,255,...)` / `rgba(200,220,255,...)` — never `rgba(255,220,80,...)` or any warm yellow/gold (was FIXED 2026-06-06, was the root cause of persistent orange aura in production).

**enemyHit "tint" filter** (arena/page.tsx, applied for 200ms after correct answer): MUST use `"brightness(1.35) saturate(2) hue-rotate(200deg)"` — no `sepia()` which creates warm orange/yellow. Previous `sepia(1) saturate(3) hue-rotate(300deg)` caused orange/yellow flash visible in production (FIXED 2026-06-07).

**Enemy HP bar colors** (arena/page.tsx, above enemy sprite): HP 30-60% fill MUST be purple (`#a855f7,#c084fc`) — never orange (#f97316) or yellow (#fbbf24). HP <30% fill MUST be purple-red (`#7c3aed,#ef4444`). HP <30% border/text MUST be violet (`rgba(192,132,252,0.55)` / `#c084fc`) — not yellow (#facc15) (FIXED 2026-06-07).

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
- Hero (Miti) starts at x=35 (battle position, left side of arena), y=min(60, yMaxPct); enters from x=11. HERO_BATTLE_Y=60 is a soft target — it is clamped to yMaxPct=(ah-212-6)/ah×100 so Miti never clips below the arena on small screens.
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

## Answer Visual Feedback Rule (CANONICAL — DO NOT revert)

**Correct-answer visual feedback must start immediately and must not wait for server round-trip.**

In `handleAnswer()` (`app/child/arena/page.tsx`): fire `submitAnswer()` without awaiting, then immediately begin the aim-line → dash → recoil → projectile-launch sequence. Await the server result using `Promise.all([submitPromise, wait(310)])` during the projectile travel window, then branch on hit/miss for the impact phase. This ensures Miti's attack animation starts on the frame the user taps, with zero server-latency delay.

If `submitAnswer()` fails, abort with `setPhase("error")` and clean up visual state. Wrong-answer branch is unchanged in outcome — projectile disappears, shield block shows.

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

## Question/Feedback UI Rule (CANONICAL — DO NOT move back into arena)

The question panel and feedback bar are rendered **BELOW** the arena `<section>`, as siblings in the main flex column — NOT inside the arena section as absolutely-positioned overlays.

- **Challenge panel** (`phase === "challenge"`): renders below `</section>` — shows question text + 2×2 answer grid. Never uses `position: absolute`.
- **FeedbackOverlay** (`phase === "feedback"`): renders below `</section>` — compact bar with hit/miss + damage info. Never uses `position: absolute`.

**Root cause fixed (2026-06-05):** Both were `position: absolute` inside the arena, covering Miti, the enemy, and the crystal beam during battle.

## Deployment Status (as of 2026-06-07)

- **Correct production deployment is live** from `C:\Users\97253\Desktop\קלוד\crystal-champions`
- **Production URL:** https://crystal-champions-game.vercel.app
- **Live commit:** 84a1102
- **Live deployment:** dpl_2SH4iXw7FdKFqsdyL6a2oSGV5due (crystal-champions-game-hi8ihnr3n)
- **Last deploy:** `vercel --prod` — GitHub push did not auto-trigger Vercel (use `vercel --prod` manually)

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

### Grade Detection in startArenaSession() (app/actions/arena.ts)
Grade is resolved in this priority order:
1. `child_mission_config.grade_level` (smallint, config table)
2. `child_profiles.grade_level` (TEXT, now fetched in the initial `getChildProfile()` select — no extra query needed)
3. Default 3 if neither is set

`getChildProfile()` MUST include `grade_level` in its select list. Do not add a separate DB round-trip for grade_level.

### Arena load performance — parallel query pattern (FIXED 2026-06-07)
`startArenaSession()` runs queries in three parallel rounds after `getChildProfile()`:
- Round 1: mission row + world_id fallback + child_mission_config grade — all in `Promise.all`
- Round 2: boss HP + hero_id — in `Promise.all`, depends only on worldId from round 1
- Round 3: OpenAI question generation + hero details — start OpenAI immediately when grade is known, run hero details fetch in parallel. This cuts auto-mode load time by ~200ms vs sequential.

## Battle Visual Requirements

- Miti and the enemy must **face each other** like a real battle (Miti on the left facing right, enemy on the right facing left).
- Crystal shots must travel **from Miti's real on-screen position** to the **enemy's current body/center position**.
- **No hardcoded wrong-direction shots.** Shot direction must be calculated from actual element positions at fire time.


## Deployment Mismatch Rule

**Two remotes, one source of truth:**
- `origin` = `ofira17/crystal-champions` — development mirror only
- `canonical` = `ofira17/crystal-champions-game` — Vercel watches this; all deployments come from here

**If production is behind:**
1. Verify the fix commit exists locally: `git log --oneline | grep <sha>`
2. Push to canonical/main: `git push canonical main`
3. Vercel auto-deploys; confirm with `npx vercel ls` — latest entry should be `● Ready` and aliased to `crystal-champions-game.vercel.app`
4. If auto-deploy did not trigger, run `npx vercel --prod` from local source (never redeploy an old production slug)
5. Verify live build: fetch the production URL and confirm new chunk hashes in the HTML

**Never push only to origin and expect production to update.**

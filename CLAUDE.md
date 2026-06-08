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

## Battle Completion Rules (CANONICAL — DO NOT revert)

- Default battle = 20 questions. All questions MUST be answered before any reward or victory.
- Victory (reward/next stage) only when **allAnswered AND score ≥ 90%** (18+/20 correct).
- Below 90%: EndScreen (fail/retry flow) — no reward box.
- No early boss defeat from HP damage or megahit. `bossDefeated` is set only in `submitAnswer` when `allAnswered && correctCount/totalAnswered >= 0.9`.
- Megahit: deals damage only, never sets `bossDefeated = true`, never triggers victory.
- Client guard: victory phase requires BOTH `res.bossDefeated && res.allAnswered`.

## Battle Enemy Flow (CANONICAL — DO NOT revert)

### Entry sequence
1. Miti auto-walks into arena first (staging ~1050ms, x=11→35). Enemy is hidden (`opacity:0` on enemyRef div).
2. When staging ends, enemy slides in from the right with a bounce-settle animation (`enemy-appear 0.60s`, translateX 70px→0 + scale). The enemy AI runs during staging at 2.5× speed so it is already positioned on the right side when it becomes visible.
3. Enemy starts at 100% size (full `dynEnemySize` px).
4. For Q2+ transitions: `setEnemyVisible(false)` is called before `setPhase("battle")` to prevent the old enemy from flashing briefly before the new one enters.

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

## Hero Battle Sprite Rule (UPDATED 2026-06-08)

The arena battle character sprite MUST display the currently selected/equipped hero, not a hardcoded Miti sprite.

- **Source**: `getHeroImage(arenaData.heroGender ?? "M", arenaData.heroColorTheme ?? "default", 0)` — the hero portrait image from `/heroes/`
- **Direction (duel facing rule — CANONICAL f013c31)**: Use CSS `rotateY` with `perspective(600px)`. Hero portrait images are front-facing; `rotateY(35deg)` makes them appear to face RIGHT (toward enemy when hero is on left), `rotateY(-35deg)` makes them face LEFT. NEVER use `scaleX(-1)` alone — it only mirrors a front-facing portrait and still faces the screen.
  - Idle facing right: `"perspective(600px) rotateY(35deg)"`
  - Idle facing left: `"perspective(600px) rotateY(-35deg)"`
  - Running/staging facing right: `"perspective(600px) scale(1.35) rotateY(35deg)"`
  - Running/staging facing left: `"perspective(600px) scale(1.35) rotateY(-35deg)"`
  - Battle-ready duel stance right: `"perspective(600px) scale(1.28) translateY(-10px) rotateY(40deg) rotateZ(-2deg)"`
  - Battle-ready duel stance left: `"perspective(600px) scale(1.28) translateY(-10px) rotateY(-40deg) rotateZ(2deg)"`
  - **Attack lunge right** (isAttacking && !heroFacingLeft): `"perspective(600px) scale(1.35) translateY(-18px) translateX(22px) rotateY(45deg) rotateZ(-6deg)"` — forward-punch lunge toward enemy
  - **Attack lunge left** (isAttacking && heroFacingLeft): `"perspective(600px) scale(1.35) translateY(-18px) translateX(-22px) rotateY(-45deg) rotateZ(6deg)"` — forward-punch lunge toward enemy
- **No separate sprite files per state**: A single portrait image is used for all states (idle, attack, run) with CSS transforms for direction
- Only Miti (`/sprites/miti/`) had directional sprite sheets; all heroes (default AND equipped) use the hero portrait image system with rotateY
- Hero name/card and battle sprite must always show the same hero (consistency enforced by both reading `arenaData.heroGender`/`heroColorTheme`)
- **DO NOT hardcode `/sprites/miti/` ever again** — all heroes go through `getHeroImage()`

Hero must keep normal full size during arena staging and battle walking. Only the enemy uses HP-based shrinking.
- `scale(1.35)` during staging/walking and attack lunge, `scale(1.28)` in battle-ready duel stance — never reduce hero below 1.0 scale.
- Do NOT apply enemy HP scaling or any staging shrink to the hero sprite.

## Enemy Facing Rule (CANONICAL — 2026-06-08)

Enemy always enters from the RIGHT side of the arena (x≈90%) and approaches the hero at x≈35% (LEFT side).

**Sprite selection in `CrystalEnemy.tsx`:**
- Entry/approach (x > 55%): `-2.png` (side-view movement frame)
- Battle stance (x ≤ 55%): `-1.png` (idle combat frame, facing hero)
- Attacking: `-5.png`

**Facing direction — CANONICAL:**
- `shouldFaceLeft = (enemyX > heroX)` — enemy must face LEFT when it is to the RIGHT of the hero.
- For **entry sprite** (`-2.png`, `useScaleFlip = derivedAngle === "right" && shouldFaceLeft`): apply `scaleX(-1)` to mirror the sprite so it faces LEFT (toward hero). Do NOT use rotateY(±40) alone — the `-2.png` sprite faces right in the asset, so without the mirror it shows the enemy's back or wrong side.
- Add `rotateY(-20deg)` as a subtle perspective depth tilt (in mirrored space, this creates a slight right-tilt illusion without showing the back).
- For **battle sprite** (`-1.png`): `shouldFaceLeft` → `rotateY(-20deg)`; otherwise `rotateY(20deg)` — no scaleX flip needed.
- **NEVER use `rotateY(±40deg)` alone on a side-profile sprite** — at 40deg the far edge bends around and can show the back of the character.

## Targeting Beam Rule (CANONICAL — 2026-06-08)

The crystal targeting beam in `arena/page.tsx` connects the hero's attack hand to just before the enemy body edge.

**Rules:**
- **Origin**: hero attack hand — `heroPos.x ± 40px` (right when facing right, left when facing left) + `heroPos.y + 55px` (chest height)
- **Endpoint**: stop `38px` short of enemy center — `STOP = min(38, beamLen * 0.25)`, endpoint at `ratio = (beamLen - STOP) / beamLen` along the vector. This prevents the beam from visually entering the enemy body.
- **Widths**: outer glow 16px at 0.12 opacity, mid glow 6px at 0.30 opacity, main beam 2.5px, bright core 1px at 0.70 opacity — thin and atmospheric, not a solid rod.
- **Tip decoration**: a small `circle r=5` (cyan 0.55) + `circle r=2.5` (white 0.85) at the endpoint creates a soft lock-on dot at the enemy's edge.
- **NEVER** draw beam all the way to enemy center — it visually passes through the enemy body.
- **NEVER** use strokeWidth > 8px on any beam layer — it becomes a solid opaque bar that dominates the scene.

## Battle Movement Rule

**Two-phase staging system (CANONICAL — DO NOT revert, fixed 2026-06-08):**

### First question only (hasEnteredArenaRef.current === false):
Full cinematic entry — hero walks in from x=3 to x=35 (entering from far left edge), enemy is hidden. After 1050ms both are in position, enemy pops in with `enemy-appear` animation. `hasEnteredArenaRef` is set true permanently for the session.

### Q2+ (hasEnteredArenaRef.current === true):
Hero STAYS in battle position (no walk reset). Only the enemy re-enters: hidden for 350ms, then pops in from the right with `enemy-appear`. `stagingRef=true` blocks contact during the 350ms. `isStagingActive=false` so hero does NOT play the walk animation.

**Key rules:**
- `hasEnteredArenaRef` is a `useRef(false)` inside `ArenaPageContent` — resets on component unmount (new session)
- First staging window: 1050ms. Q2+ blocking window: 350ms.
- Hero starts at x=3 on first entry only (far left, dramatic entry). `heroPosRef` is NOT reset on Q2+.
- **After enemy becomes visible, contact is blocked for 700ms (lastContactRef.current = performance.now() + 300, plus 400ms debounce = 700ms total).** This ensures child sees the face-off before the question opens.
- **LOCK_DIST = 22** (arena-% units) — question fires only when enemy is within 22% of hero, not at 40% (was too far away, causing instant question).
- Enemy ALWAYS spawns from the RIGHT side at FIXED positions — no random jitter:
  - goblin: x=90, y=67
  - bat: x=90, y=16
  - giant: x=90, y=50
  - wizard: x=90, y=37
- Enemy charges toward hero at 2.5× speed during staging (`stagingBoost = 2.5` when `stagingRef.current`)
- Question panel appears ONLY after staging ends AND grace period expires

Arena: `app/child/arena/page.tsx`

**Character positioning:**
- Hero starts at x=3 (far left, partially off-screen) and walks to x=35 (battle position) at MOVE_SPEED*0.90/frame. Enters from first question only. HERO_BATTLE_Y=60 is a soft target — clamped to yMaxPct=(ah-212-6)/ah×100 so hero never clips below the arena on small screens.
- Goblin enemy spawns at x=90 (fixed right side)
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

### Production Fix Verification Protocol (PERMANENT — applies to every future production fix)

After every production fix, ALL of the following steps are mandatory before reporting success:

1. **Do not rely on git push alone.** A push to canonical/main does not guarantee Vercel deployed.
2. **Verify Vercel status is READY.** Run `npx vercel ls` — the latest entry must show `● Ready` and be aliased to `crystal-champions-game.vercel.app`.
3. **Verify the production URL is up.** Fetch https://crystal-champions-game.vercel.app and confirm it loads without error.
4. **Verify live commit matches the fix commit.** The deployment shown in `vercel ls` must correspond to the fix commit SHA — confirm via `vercel inspect <deployment-url>` or by grepping the production bundle for the changed symbol.
5. **Verify fresh production bundle/chunks when relevant.** When JS/CSS changed, fetch the production HTML and confirm `/_next/static/chunks/` URLs differ from the previous build. Identical chunk hashes mean the new build is NOT live.
6. **If GitHub auto-deploy did not trigger**, run a manual production deploy from local source: `vercel --prod --yes` from `C:\Users\97253\Desktop\קלוד\crystal-champions`. Never redeploy an old production slug.
7. **Never report production success before live commit verification.** "Pushed to canonical" is not success. Only a verified READY deployment with matching commit is success.

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

## Hero Assets

### Gilad the Crystal Guardian (גלעד הסלעי)
- **Hero ID:** `hero-0014-0000-0000-000000000014`
- **DB:** Registered in migration 011; gender=M, rarity=Rare, color_theme="stone"
- **Images:** `public/heroes/gilad/gilad_01.png` … `gilad_16.png` (16 frames)
- **Code:** `HeroDisplay.tsx` — `getHeroImage()` branches on `colorTheme === "stone"` → `GILAD_IMAGES[]`
- **Skins:** skinIndex 0-15 cycle through all 16 Gilad frames

## Default questions_per_run

Default is **20** (changed from 10 on 2026-06-07). Applies to:
- New mission creation (`MissionForm.tsx` initial state)
- Auto-created child_missions on treasure_map activation (`app/actions/mission.ts`)
- Arena fallback when `session.questions_per_run` is null (`app/actions/arena.ts`)

The auto-patch that forced all missions with <25 questions up to 25 has been removed.
Existing custom mission values are preserved as-is.

## Deployment Status (as of 2026-06-07)

- **Correct production deployment is live** from `C:\Users\97253\Desktop\קלוד\crystal-champions`
- **Production URL:** https://crystal-champions-game.vercel.app
- **Live commit:** b851c0f (feat: add Gilad the Crystal Guardian hero assets)
- **Live deployment:** dpl_9WSHa5gMeXnun2hPL4V8SbyqM1ra (crystal-champions-game-2r7qky773)
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

**Guardrails source of truth:** `crystal_champions_curriculum_guardrails_he.md` (version 2026-06-07)
**Central rules file:** `lib/grade-subject-rules.ts` (all subjects, all grades 1-6)
**Math rules file:** `lib/math-grade-rules.ts` (detailed math-specific validation + `validateGrade1MathNumeric`)

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
- `validateMathQuestion(text, grade)` — post-generation math keyword validation; rejects violations
- `validateGrade1MathNumeric(text)` — Grade 1 only: extracts integers, rejects any >100 or any >20 that is not a whole ten
- `validateSubjectQuestion(text, subject, grade)` — post-generation non-math validation; rejects violations
- `GRADE_1_HARD_BLOCK` — keyword hard-block for grade 1 (includes geography/civics terms per guardrails)
- All validation is in `lib/auto-questions.ts` → `generateAutoArenaQuestions()`
- Every rejected question is logged with reason; fallback replaces it immediately — no invalid question ever reaches the child

### Grade Detection in startArenaSession() (app/actions/arena.ts)
Grade is resolved in this priority order:
1. `child_mission_config.grade_level` (smallint, config table)
2. `child_profiles.grade_level` (TEXT, now fetched in the initial `getChildProfile()` select — no extra query needed)
3. Default 3 if neither is set

`getChildProfile()` MUST include `grade_level` in its select list. Do not add a separate DB round-trip for grade_level.

### Arena load performance — parallel query pattern + OpenAI timeout (FIXED 2026-06-07)
`startArenaSession()` runs queries in three parallel rounds after `getChildProfile()`:
- Round 1: mission row + world_id fallback + child_mission_config grade — all in `Promise.all`
- Round 2: boss HP + hero_id — in `Promise.all`, depends only on worldId from round 1
- Round 3: OpenAI question generation + hero details — start OpenAI immediately when grade is known, run hero details fetch in parallel. This cuts auto-mode load time by ~200ms vs sequential.

**OpenAI timeout rule (CRITICAL — DO NOT REMOVE):**
`generateAutoArenaQuestions()` in `lib/auto-questions.ts` races the OpenAI call against an 8-second timeout using `Promise.race()`. If OpenAI does not respond within 8 seconds, the function immediately returns pre-built grade-appropriate fallback questions from `lib/fallback-questions.ts`. This ensures the arena NEVER takes >~10 seconds to load, regardless of OpenAI latency.

**Grade 1 hard-block rule (CRITICAL — DO NOT REMOVE):**
After receiving AI questions, `generateAutoArenaQuestions()` applies an additional hard-block list for grade 1 (`GRADE_1_HARD_BLOCK` array) that rejects any question containing forbidden keywords. The full list covers ALL surface forms of multiplication and division:
- Multiplication: כפל, **כפול**, **כפלי**, מכפלה, לכפול, **פעמים**, ×, *
- Division: חילוק, **חלקי**, מחולק, לחלק, ÷, /
- Fractions/percentages: שבר, מכנה, מונה, ½, ¼, ⅓, אחוז, %
- Science/geography/history: פוטוסינתזה, כלורופיל, יבשת, יבשות, מהפכה, מלחמה
- Grammar: דקדוק, שורש, בניין

Questions that fail this hard block are replaced by fallback questions from `lib/fallback-questions.ts`. Grade 1 must NEVER receive multiplication, division, fractions, percentages, photosynthesis, continents, abstract science/geography, or advanced vocabulary.

**Grade 1 defense-in-depth (arena.ts):** After `generateAutoArenaQuestions()` returns, `startArenaSession()` runs a second `isGrade1Safe()` check on every auto-question and replaces any that fail with grade-1 fallback questions. This catches cached/stale session questions and future model drift.

**Final mandatory Grade 1 validator (arena.ts — CRITICAL — DO NOT REMOVE):** Immediately before the `return { success: true, ... }` in `startArenaSession()`, a final validator runs on ALL questions regardless of source (auto, DB, fallback, cache, old session). For grade 1 it applies: (1) `isGrade1Safe(text)` — keyword block, (2) `validateGrade1MathNumeric(text)` — numeric range check if question contains digits. Each rejected question is logged as `[arena] final grade=1 rejected question="..." reason="keyword-block|numeric-range"` and replaced with a safe fallback. This is the last gate before questions reach the arena UI and catches DB questions that bypass all earlier validation.

**Root cause (2026-06-07 fix):** `GRADE_1_HARD_BLOCK` originally contained `כפל` but not `כפול`, and `חילוק`/`מחולק` but not `חלקי`. Questions like "כמה זה 6 כפול 7" and "כמה זה 48 חלקי 6" (from grade-3 fallback bank) passed the filter. Fix: added all surface-form variants and exported `isGrade1Safe()` for reuse in arena.ts.

**Fallback question bank:** `lib/fallback-questions.ts` — pre-built safe questions for grades 1-6. Grade 1 questions are addition/subtraction up to 20, basic Hebrew, animals, and everyday knowledge. Never modify grade 1 fallback to include forbidden topics.

**Grade logging:** `startArenaSession()` logs `[arena] grade=N source=child_mission_config|child_profiles|default` to Vercel logs. Check these logs if grade 1 children receive wrong questions.

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

## Gilad PNG CDN Cache Bust Rule (FIXED 2026-06-07)

Local Gilad PNGs were always RGBA (correct). Production CDN served stale RGB (white-background) versions because Vercel/CDN cached the old `gilad_01-16.png` filenames even after the RGBA files were committed (commit 344105d).

**Fix:** Create versioned filenames `gilad_v2_01.png ... gilad_v2_16.png` (copies of RGBA originals) and update `GILAD_IMAGES` in `components/child/HeroDisplay.tsx` to reference the new names. Old files kept but not referenced.

**Rule:** If production serves stale assets after a PNG replacement, do NOT reuse the old filename — create versioned copies (e.g., `_v2_`) and update all references. CDN cache is busted automatically because new URLs have no cache entry.

## Enemy Rotation Rule (FIXED 2026-06-08)

### The 5 Crystal Enemies (in order)
| # | Name   | English        | Hebrew  |
|---|--------|----------------|---------|
| 0 | Prisma | Crystal Butterfly | פריזמה |
| 1 | Orion  | Crystal Owl    | אוריון  |
| 2 | Luma   | Crystal Bird   | לומה   |
| 3 | Gembo  | Crystal Turtle | גמבו   |
| 4 | Bubli  | Crystal Slime  | בובלי  |

### Rotation Logic
- `enemyIndex` state (starts at 0) drives which enemy appears.
- `enemyVariant = getEnemyVariantByIndex(enemyIndex)` → cycles Prisma → Orion → Luma → Gembo → Bubli → loop.
- `enemyIndex` increments by 1 **only** when `res.isCorrect === true` (inside `handleAnswer`).
- **Wrong answers keep the same enemy** — `enemyIndex` does NOT change.
- The enemy's appear animation replays on each change via `key={shown-${enemyIndex}}`.

### Asset Convention
Each enemy has 3 directional sprites per slug:
- `{slug}-1.png` — idle / facing hero (left-facing combat position)
- `{slug}-2.png` — side-approach sprite (enemy entering from right side)
- `{slug}-5.png` — attack pose

Slug-to-variant mapping lives in `VARIANT_META` in `components/child/CrystalEnemy.tsx`. Update it when real crystal art is delivered.

### Side-Angle Rule
Enemies always enter from `x=90%` and face left toward the hero. CSS `perspective(300px) rotateY(-40deg)` is applied when `enemyX > heroX`. `enemyAngle` is auto-derived from position: `x > 55%` → "right" (approach sprite), else "left" (idle sprite). Never use front-facing sprites as the primary battle view.

### Do NOT change
- Question count (20), grade rules, rewards, Supabase, auth, or Vercel config.
- The worldId hash is no longer used for enemy selection — do not restore it.

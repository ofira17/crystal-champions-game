@AGENTS.md

## Battle Staging Rule

Arena: `app/child/arena/page.tsx`

**Character positioning:**
- Hero (Miti) starts at x=22 (left side of arena), y=60
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

## Math Grade-Level Rules (Israeli MoE Curriculum — Source of Truth)

Canonical definition lives in `lib/math-grade-rules.ts`. Summary:

| כיתה | פעולות מותרות | טווח מספרים | אסור |
|------|--------------|-------------|------|
| 1 | חיבור, חיסור | עד 20; עשרות עד 100 | כפל, חילוק, שברים, אחוזים, עשרוניות |
| 2 | חיבור/חיסור עד 100, כפל ב-2/5/10 | עד 1000 (קריאה/כתיבה), חישוב עד 100 | חילוק, שברים, אחוזים |
| 3 | ארבע פעולות, שברים פשוטים ½ ¼ ⅓ | עד 10,000 | אחוזים, עשרוניות, אלגברה |
| 4 | ארבע פעולות, שברים (מכנה שווה), שטח/היקף מלבן | עד מיליון | אחוזים, עשרוניות, שברים מכנה שונה |
| 5 | שברים מכנים שונים, עשרוניות, אחוזים פשוטים, שטח משולש | מספרים עשרוניים | אלגברה, נפח, מספרים שליליים |
| 6 | כל פעולות השברים, אחוזים, יחס, אלגברה ראשונית, נפח תיבה | כולל מספרים שליליים (-20 עד 0) | משוואות ממעלה שניה, טריגונומטריה |

- AI prompt מחיל את הכללים באמצעות `buildMathGradeInstruction(grade)`
- Validation לאחר קבלת תשובה מה-AI דרך `validateMathQuestion(text, grade)` — שאלה שנכשלת נדחית

## Battle Visual Requirements

- Miti and the enemy must **face each other** like a real battle (Miti on the left facing right, enemy on the right facing left).
- Crystal shots must travel **from Miti's real on-screen position** to the **enemy's current body/center position**.
- **No hardcoded wrong-direction shots.** Shot direction must be calculated from actual element positions at fire time.

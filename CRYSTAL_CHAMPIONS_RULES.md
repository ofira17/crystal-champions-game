# Crystal Champions — Permanent Project Rules

These rules are binding for all work on Crystal Champions. They override defaults and prior habits.

## 1. Canonical repository
- URL: https://github.com/ofira17/crystal-champions-game.git
- Remote name: `canonical`
- Branch: `main`

## 2. Forbidden repository
- Never use the old `origin` remote.
- Never use the old repo `ofira17/crystal-champions`.

## 3. Production URL
- https://crystal-champions-game.vercel.app

## 4. Vercel project
- `crystal-champions-game`

## 5. Deploy verification
Every deploy MUST verify and report:
- Canonical URL
- Deployed commit SHA
- Vercel project name
- Deployment ID
- READY status

## 6. No preview-only reports
Never report success using only a Vercel preview URL. Only the canonical production URL counts.

## 7. User-provided file paths
For any uploaded video, screenshot, or file, always use the **exact full path** provided by the user. Never guess, shorten, or substitute.

## 8. Visual / gameplay bugs
The user's video or screenshot is the **source of truth**. Reproduce against it before changing code.

## 9. No cosmetic patches
If the issue is in actually-rendered gameplay, do not apply cosmetic CSS/markup patches that don't fix the rendered behavior.

## 10. Small focused steps
Work in small, focused steps only. Allowed scopes:
- Enemy art
- Movement
- Question trigger
- Combat feedback
- Boss mode

## 11. Preserve real PNG assets
If real PNG assets exist, never replace them with placeholders, SVGs, or generic drawings.

## 12. Enemy assets
- Never render full character sheets in-game.
- Use only cropped individual sprites from `/public/enemies/`.

## 13. Do-not-touch list
Do not modify any of the following unless explicitly requested:
- Auth
- PIN
- Upload parser
- DB schema
- Vercel config

## 14. READY definition
Never report READY unless the **canonical production URL** actually serves the intended change.

## 15. Verify canonical repo before any work
Before any asset or code work, verify:
1. Current folder is `crystal-champions` (canonical repo, not `miti-heroquest` or any other).
2. `git remote -v` shows `canonical https://github.com/ofira17/crystal-champions-game.git`.
3. Active branch is `main`.
4. `git pull canonical main` is up to date.
Never work from the old repo/folder (`miti-heroquest`) or a stale branch.

## 16. Correct project path and arena file — PERMANENT
- **NEVER** work in `miti-heroquest` or any alternate/old repo.
- **ALWAYS** verify project path is `C:\Users\97253\Desktop\קלוד\crystal-champions` before changing any code.
- **ALWAYS** verify the arena file is `app/child/arena/page.tsx` before changing arena code.
- **NEVER** touch `src/pages/Play.tsx` — that belongs to the old `miti-heroquest` project.
- Violation of this rule is grounds to stop and re-verify before proceeding.

## 17. Wrong-repo safeguard — PERMANENT
- **NEVER** use `src/pages/Play.tsx`, `src/components/HeroAvatar.tsx`, or `origin/main` for the real arena.
- The real arena lives **only** in `app/child/arena/page.tsx` on **`canonical/main`**.
- The real enemy component is `components/child/CrystalEnemy.tsx`.
- Pushing to `origin` is forbidden. Always push to `canonical`.
- If you find yourself editing anything under `src/` in the context of arena work, stop immediately and re-verify the project path.

## 18. HARD STOP rule — enforced before every keystroke
**If you are about to edit `src/pages/Play.tsx` or push to `origin/main` — STOP IMMEDIATELY.**
Do not write a single line of code. Close the file. Re-verify:
1. Working directory = `C:\Users\97253\Desktop\קלוד\crystal-champions`
2. `git remote -v` shows `canonical` pointing to `crystal-champions-game.git`
3. File to edit = `app/child/arena/page.tsx`
Violations of this rule have occurred before and waste significant time. There is no scenario where `src/pages/Play.tsx` is correct for Crystal Champions arena work.

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

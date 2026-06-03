@AGENTS.md

## Battle Staging Rule

Arena: `app/child/arena/page.tsx`

**Character positioning:**
- Hero (Miti) starts at x=22 (left side of arena), y=60
- Goblin enemy spawns at x=82–94 (right side)
- Hero always uses left/right profile sprites — never `attack-front.png` or `attack-back.png`
- Hero idle and attack sprites are chosen based on enemy.x vs hero.x (left = `idle-left` / `attack-left`, right = `idle-right` / `attack-right`)
- Enemy facing: `enemyX > heroX` → face left (toward hero); sprites face LEFT natively

**Crystal beam:**
- SVG beam connects Miti's attack hand → enemy center
- Attack hand origin: x = heroCenter ± 52px (right when facing right, left when facing left), y = heroTop + 68px (chest height)
- Stroke widths: outer halo 32px, mid glow 14px, main 7px, core 3px
- Direction is always position-based (actual hero/enemy coords), never a fixed angle

**Projectile:**
- Same origin as beam (attack hand, not sprite center)
- `projectileDriftPx` and `projectileTravelPx` follow exact beam vector to enemy center

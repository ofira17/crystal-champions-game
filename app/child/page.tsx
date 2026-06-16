import { requireRole } from "@/lib/auth/helpers";
import { getChildDashboardData } from "@/app/actions/child-dashboard";
import Image from "next/image";
import Link from "next/link";

// Server-safe hero avatar resolver (mirrors HeroDisplay logic without "use client")
const GILAD_IMAGES = Array.from(
  { length: 16 },
  (_, i) => `/heroes/gilad/gilad_v2_${String(i + 1).padStart(2, "0")}.png`
);
const BOY_IMAGES = [
  "/heroes/boy-0.png", "/heroes/boy-1.png", "/heroes/boy-2.png",
  "/heroes/boy-3.png", "/heroes/boy-4.png", "/heroes/boy-5.png",
  "/heroes/boy-6.png", "/heroes/boy-7.png", "/heroes/boy-8.png",
  "/heroes/boy-9.png", "/heroes/boy-10.png",
];
const GIRL_IMAGES = [
  "/heroes/girl-0.png", "/heroes/girl-1.png", "/heroes/girl-2.png",
  "/heroes/girl-3.png", "/heroes/girl-4.png", "/heroes/girl-5.png",
  "/heroes/girl-6.png", "/heroes/girl-7.png", "/heroes/girl-8.png",
  "/heroes/girl-9.png",
];
const BOY_THEME: Record<string, number> = {
  default: 0, storm: 0, gold: 1, nature: 2, teal: 2, fire: 3, dragon: 3,
  lava: 3, thunder: 4, yellow: 4, ice: 5, crystal: 6, shadow: 6, pink: 6,
  stone: 6, ocean: 8, star: 9, galaxy: 9, cosmic: 9,
};
const GIRL_THEME: Record<string, number> = {
  default: 0, storm: 0, ice: 1, crystal: 2, nature: 3, teal: 3, fire: 4,
  dragon: 4, pink: 4, thunder: 5, yellow: 5, gold: 6, sun: 6, star: 7,
  cosmic: 7, shadow: 9, ocean: 9,
};

function resolveHeroAvatar(gender?: "M" | "F" | null, colorTheme?: string | null): string {
  if (!gender || !colorTheme) return "/heroes/boy-0.png";
  if (colorTheme === "stone" || colorTheme === "gilad") return GILAD_IMAGES[0];
  if (gender === "M") return BOY_IMAGES[BOY_THEME[colorTheme] ?? 0];
  return GIRL_IMAGES[GIRL_THEME[colorTheme] ?? 0];
}

export default async function ChildHomePage() {
  await requireRole("child");

  const { profile, hero, activeAdventure, energyMax } = await getChildDashboardData();

  const arenaHref = activeAdventure
    ? `/child/arena?adventure=${activeAdventure.id}`
    : null;

  const avatarSrc = hero
    ? resolveHeroAvatar(hero.gender, hero.color_theme)
    : "/heroes/boy-0.png";

  const energy  = profile?.energy      ?? 0;
  const xp      = profile?.total_xp    ?? 0;
  const stars   = profile?.total_stars ?? 0;
  const coins   = profile?.total_coins ?? 0;
  const name    = profile?.display_name_he ?? "גיבור";
  const level   = Math.floor(xp / 200) + 1;

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; overflow: hidden; }

        /* -- Stat chip -- */
        .stat-chip {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(0,0,0,0.45);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: clamp(11px, 1.4vw, 14px);
          font-weight: 700;
          color: #fff;
          white-space: nowrap;
        }

        /* -- Hero wrapper - centered, above CTA -- */
        .hero-bubble-wrapper {
          position: absolute;
          bottom: clamp(255px, 31vh, 340px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 15;
          pointer-events: none;
        }

        /* -- Speech bubble - absolutely left of hero -- */
        .speech-bubble-placeholder {
          position: absolute;
          left: calc(50% - 470px);
          top: clamp(190px, 30vh, 310px);
          width: clamp(240px, 20vw, 340px);
          background: rgba(14, 28, 72, 0.82);
          border: 2px solid rgba(140, 190, 255, 0.75);
          border-radius: 16px;
          box-shadow: 0 0 20px rgba(100, 160, 255, 0.45), inset 0 0 12px rgba(60, 100, 200, 0.15);
          padding: clamp(12px, 1.5vh, 20px) clamp(14px, 1.6vw, 24px);
          display: flex;
          flex-direction: column;
          gap: 5px;
          direction: rtl;
          z-index: 16;
        }
        /* Arrow points right - toward the hero */
        .speech-bubble-placeholder::after {
          content: '';
          position: absolute;
          right: -15px;
          top: 50%;
          transform: translateY(-50%);
          border: 8px solid transparent;
          border-left-color: rgba(140, 190, 255, 0.75);
        }
        .speech-bubble-placeholder p {
          margin: 0;
          color: #daeeff;
          font-size: clamp(11px, 1.3vw, 15px);
          font-weight: 700;
          text-shadow: 0 1px 4px rgba(0,0,0,0.7);
          line-height: 1.45;
        }

        /* -- Hero image -- */
        .home-hero-img {
          width: clamp(180px, 18vw, 310px);
          height: auto;
          object-fit: contain;
          filter: drop-shadow(0 8px 32px rgba(100,160,255,0.65));
        }

        /* -- Hero floating animation -- */
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .hero-float-inner {
          animation: heroFloat 3s ease-in-out infinite;
        }

        /* -- Arena CTA - centered, below hero+bubble, above dashboard -- */
        .arena-cta-zone {
          position: absolute;
          bottom: clamp(215px, 25vh, 300px);
          left: 50%;
          transform: translateX(-50%);
          z-index: 25;
        }
        .arena-img-btn {
          display: block;
          background: none;
          border: none;
          padding: 0;
          margin: 0;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.15s, filter 0.15s;
          line-height: 0;
        }
        .arena-img-btn img {
          width: clamp(320px, 30vw, 520px);
          height: auto;
          display: block;
          background: none;
        }
        .arena-img-btn:hover {
          transform: scale(1.05);
          filter: brightness(1.1) drop-shadow(0 0 18px rgba(250,204,21,0.7));
        }
        .arena-img-btn.disabled {
          opacity: 0.45;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* -- Dashboard skeleton -- */
        .home-dashboard {
          position: absolute;
          left: 2vw;
          right: 2vw;
          bottom: 8px;
          z-index: 22;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .dashboard-row-main {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(10px, 1.4vw, 18px);
          direction: ltr;
        }

        .dashboard-row-worlds {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: clamp(8px, 1.1vw, 14px);
          direction: ltr;
        }

        /* Placeholder card base */
        .ph-card {
          background: rgba(8, 18, 52, 0.75);
          border: 1.5px solid rgba(100, 160, 255, 0.45);
          border-radius: 14px;
          box-shadow: 0 0 12px rgba(80, 140, 255, 0.2), inset 0 0 12px rgba(40, 80, 180, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          color: #c8dfff;
          font-weight: 800;
          font-size: clamp(11px, 1.3vw, 16px);
          text-align: center;
          direction: rtl;
          transition: transform 0.15s, box-shadow 0.15s;
          cursor: pointer;
          padding: 8px;
        }
        .ph-card:hover {
          transform: translateY(-3px) scale(1.03);
          box-shadow: 0 0 20px rgba(100, 160, 255, 0.45), inset 0 0 14px rgba(60, 100, 200, 0.25);
          border-color: rgba(140, 190, 255, 0.7);
        }

        .ph-card-main {
          height: clamp(90px, 11vh, 120px);
        }

        .ph-card-world {
          height: clamp(74px, 9vh, 98px);
          font-size: clamp(10px, 1.1vw, 14px);
        }

        /* -- Missions mini button under logo -- */
        .missions-mini-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          width: clamp(150px, 12vw, 220px);
          height: clamp(38px, 4.5vh, 56px);
          padding: 0 16px;
          background: linear-gradient(135deg, #1a1aff 0%, #6b21a8 60%, #3b0764 100%);
          border: 2px solid rgba(160, 120, 255, 0.8);
          border-radius: 18px;
          box-shadow: 0 0 18px rgba(120, 80, 255, 0.6), 0 0 8px rgba(80, 40, 200, 0.4), inset 0 1px 0 rgba(255,255,255,0.15);
          color: #fff;
          font-size: clamp(14px, 1.15vw, 18px);
          font-weight: 800;
          text-decoration: none;
          direction: rtl;
          white-space: nowrap;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          margin-top: 6px;
        }
        .missions-mini-btn:hover {
          transform: scale(1.06);
          box-shadow: 0 0 28px rgba(140, 80, 255, 0.85), 0 0 12px rgba(80, 40, 200, 0.6), inset 0 1px 0 rgba(255,255,255,0.2);
          border-color: rgba(200, 160, 255, 0.95);
        }

        /* -- Tablet -- */
        @media (max-width: 1024px) and (min-width: 641px) {
          .dashboard-row-worlds {
            grid-template-columns: repeat(5, 1fr);
          }
          .hero-bubble-wrapper {
            bottom: clamp(240px, 31vh, 320px);
          }
          .arena-cta-zone {
            bottom: clamp(110px, 14vh, 160px);
          }
        }

        /* -- Mobile -- */
        @media (max-width: 640px) {
          .speech-bubble-placeholder {
            display: none;
          }
          .hero-bubble-wrapper {
            bottom: clamp(220px, 30vh, 290px);
          }
          .arena-cta-zone {
            bottom: clamp(100px, 13vh, 155px);
          }
          .dashboard-row-worlds {
            overflow-x: auto;
            overflow-y: hidden;
            grid-template-columns: repeat(5, clamp(88px, 24vw, 120px));
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          .dashboard-row-worlds::-webkit-scrollbar { display: none; }
          .dashboard-row-main {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @media (max-width: 480px) {
          .dashboard-row-main {
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
          }
          .stat-bar-row {
            gap: 5px !important;
          }
        }
      `}</style>

      <main
        dir="rtl"
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: "url('/bg-clean-crystal-kingdom.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 48%",
          backgroundRepeat: "no-repeat",
          overflow: "hidden",
          fontFamily: "sans-serif",
        }}
      >

        {/* -- TOP-LEFT: Crystal Champions Logo + משימות שלי -- */}
        <div style={{
          position: "absolute",
          top: "clamp(8px, 1.5vh, 18px)",
          left: "clamp(8px, 1.5vw, 20px)",
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          pointerEvents: "auto",
        }}>
          <Image
            src="/logo-transparent.png"
            alt="Crystal Champions"
            width={160}
            height={80}
            style={{ width: "clamp(110px, 12vw, 175px)", height: "auto", objectFit: "contain", pointerEvents: "none" }}
            priority
            unoptimized
          />
          <Link href="/child/missions" className="missions-mini-btn" aria-label="משימות שלי">
            📋 משימות שלי
          </Link>
        </div>

        {/* -- TOP CENTER: Stat Bar -- */}
        <div className="stat-bar-row" style={{
          position: "absolute",
          top: "clamp(10px, 2vh, 22px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
          display: "flex",
          flexDirection: "row",
          gap: "clamp(5px, 0.9vw, 12px)",
          alignItems: "center",
          direction: "rtl",
        }}>
          {/* Coins */}
          <div className="stat-chip" style={{
            background: "linear-gradient(135deg, #92400e, #78350f)",
            border: "2px solid #fbbf24",
            borderRadius: 24,
            padding: "5px 14px",
            gap: 6,
            boxShadow: "0 2px 10px rgba(251,191,36,0.3)",
          }}>
            <span style={{ fontSize: 16 }}>🪙</span>
            <span style={{ color: "#fde68a", fontWeight: 900, fontSize: "clamp(13px,1.5vw,17px)" }}>{coins}</span>
          </div>
          {/* Stars */}
          <div className="stat-chip" style={{
            background: "linear-gradient(135deg, #92400e, #78350f)",
            border: "2px solid #fbbf24",
            borderRadius: 24,
            padding: "5px 14px",
            gap: 6,
            boxShadow: "0 2px 10px rgba(251,191,36,0.3)",
          }}>
            <span style={{ color: "#fbbf24", fontSize: 16, fontWeight: 900 }}>★</span>
            <span style={{ color: "#fde68a", fontWeight: 900, fontSize: "clamp(13px,1.5vw,17px)" }}>{stars}</span>
          </div>
          {/* XP */}
          <div className="stat-chip" style={{
            background: "linear-gradient(135deg, #4c1d95, #3b0764)",
            border: "2px solid #a78bfa",
            borderRadius: 24,
            padding: "5px 14px",
            gap: 6,
            boxShadow: "0 2px 10px rgba(167,139,250,0.3)",
          }}>
            <span style={{ color: "#c4b5fd", fontWeight: 900, fontSize: "clamp(13px,1.5vw,17px)" }}>XP {xp}</span>
            <span style={{ color: "#a78bfa", fontSize: 16 }}>✦</span>
          </div>
          {/* Energy pips */}
          <div className="stat-chip" style={{
            background: "linear-gradient(135deg, #1e1b4b, #0f0a2a)",
            border: "2px solid rgba(192,132,252,0.6)",
            borderRadius: 24,
            padding: "5px 14px",
            gap: 6,
            boxShadow: "0 2px 10px rgba(139,92,246,0.3)",
          }}>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {Array.from({ length: energyMax }).map((_, i) => (
                <div key={i} style={{
                  width: 12, height: 12,
                  transform: "rotate(45deg)",
                  borderRadius: 2,
                  border: "2px solid",
                  borderColor: i < energy ? "#c084fc" : "rgba(255,255,255,0.2)",
                  background: i < energy ? "linear-gradient(135deg,#c084fc,#818cf8)" : "#1e1b4b",
                  boxShadow: i < energy ? "0 0 6px rgba(192,132,252,0.8)" : "none",
                }} />
              ))}
            </div>
            <span style={{ color: "#7dd3fc", fontSize: 14 }}>⚡</span>
            <span style={{ color: "#c4b5fd", fontSize: "clamp(9px,1vw,12px)", fontWeight: 800 }}>כוח קריסטל</span>
          </div>
        </div>

        {/* -- TOP-RIGHT: Profile (far right) + icon buttons to its left -- */}
        <div style={{
          position: "absolute",
          top: "clamp(8px, 1.5vh, 18px)",
          right: "clamp(8px, 1.5vw, 20px)",
          zIndex: 30,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "clamp(10px, 1vw, 18px)",
          direction: "rtl",
        }}>
          {/* Profile avatar + name - first in RTL = far right */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{
                width: "clamp(64px, 5vw, 88px)",
                height: "clamp(64px, 5vw, 88px)",
                borderRadius: "50%",
                overflow: "hidden",
                border: "2px solid rgba(192,132,252,0.8)",
                boxShadow: "0 0 12px rgba(139,92,246,0.6)",
              }}>
                <Image
                  src={avatarSrc}
                  alt={name}
                  width={88} height={88}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                  priority
                  unoptimized
                />
              </div>
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                width: 22, height: 22,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed, #4c1d95)",
                border: "2px solid #c4b5fd",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 900, color: "#fff",
                boxShadow: "0 0 6px rgba(139,92,246,0.8)",
              }}>{level}</div>
            </div>
            <span style={{
              color: "#fff",
              fontSize: "clamp(16px, 1.2vw, 22px)",
              fontWeight: 700,
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              maxWidth: "90px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}>{name}</span>
            <span style={{
              color: "#c4b5fd",
              fontSize: "clamp(13px, 1vw, 18px)",
              fontWeight: 700,
              textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              textAlign: "center",
            }}>רמה {level}</span>
          </div>

          {/* News icon */}
          <Link href="/child/news" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none", cursor: "pointer", transition: "transform 0.15s" }} aria-label="חדשות">
            <div style={{
              width: "clamp(54px,4.8vw,78px)", height: "clamp(54px,4.8vw,78px)",
              borderRadius: "50%",
              background: "rgba(30,15,60,0.75)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Image src="/news_icon-transparent.png" alt="חדשות" width={54} height={54}
                style={{ width: "70%", height: "auto" }} unoptimized />
            </div>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "clamp(13px,1vw,17px)", fontWeight: 600 }}>חדשות</span>
          </Link>

          {/* Gifts icon */}
          <Link href="/child/gifts" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none", cursor: "pointer", transition: "transform 0.15s", position: "relative" }} aria-label="מתנות">
            <div style={{
              width: "clamp(54px,4.8vw,78px)", height: "clamp(54px,4.8vw,78px)",
              borderRadius: "50%",
              background: "rgba(30,15,60,0.75)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}>
              <Image src="/gift_icon-transparent.png" alt="מתנות" width={54} height={54}
                style={{ width: "70%", height: "auto" }} unoptimized />
              <span style={{
                position: "absolute", top: -4, left: -4,
                background: "#ef4444", color: "#fff",
                borderRadius: "50%", width: 16, height: 16,
                fontSize: 10, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>1</span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "clamp(13px,1vw,17px)", fontWeight: 600 }}>מתנות</span>
          </Link>

          {/* Settings icon */}
          <Link href="/child/settings" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, textDecoration: "none", cursor: "pointer", transition: "transform 0.15s" }} aria-label="הגדרות">
            <div style={{
              width: "clamp(54px,4.8vw,78px)", height: "clamp(54px,4.8vw,78px)",
              borderRadius: "50%",
              background: "rgba(30,15,60,0.75)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Image src="/settings_icon-transparent.png" alt="הגדרות" width={54} height={54}
                style={{ width: "70%", height: "auto" }} unoptimized />
            </div>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: "clamp(13px,1vw,17px)", fontWeight: 600 }}>הגדרות</span>
          </Link>
        </div>

        {/* -- MASCOTS HIDDEN - pending clean asset approval -- */}

        {/* -- SPEECH BUBBLE - absolutely left of hero -- */}
        <div className="speech-bubble-placeholder">
          <p>הגיבור שלך מוכן לנצח</p>
          <p>לך/י לזירה</p>
          <p>צבר/י ניצחונות – ככה את/ה צומח/ת</p>
        </div>

        {/* -- HERO - centered above CTA -- */}
        <div className="hero-bubble-wrapper">
          <div className="hero-float-inner">
            <Image
              src={avatarSrc}
              alt="הגיבור שלך"
              width={310}
              height={460}
              className="home-hero-img"
              priority
              unoptimized
            />
          </div>
        </div>

        {/* -- ARENA CTA - centered, below hero, above dashboard -- */}
        <div className="arena-cta-zone">
          {arenaHref ? (
            <Link href={arenaHref} className="arena-img-btn" aria-label="כניסה לזירה">
              <Image
                src="/btn-arena-clean.png"
                alt="כניסה לזירה"
                width={520}
                height={140}
                style={{ width: "clamp(320px, 30vw, 520px)", height: "auto", display: "block" }}
                priority
                unoptimized
              />
            </Link>
          ) : (
            <div className="arena-img-btn disabled" aria-label="כניסה לזירה">
              <Image
                src="/btn-arena-clean.png"
                alt="כניסה לזירה"
                width={520}
                height={140}
                style={{ width: "clamp(320px, 30vw, 520px)", height: "auto", display: "block" }}
                unoptimized
              />
            </div>
          )}
        </div>

        {/* -- LOWER DASHBOARD SKELETON -- */}
        <div className="home-dashboard">

          {/* Row 1 - 3 large placeholder cards */}
          <div className="dashboard-row-main">
            <Link href="/child/lucky-friend" className="ph-card ph-card-main" aria-label="חבר מזל">
              🤝 חבר מזל
            </Link>
            <Link href="/child/shop" className="ph-card ph-card-main" aria-label="חנות הקריסטלים">
              💎 חנות הקריסטלים
            </Link>
            <Link href="/child/leaderboard" className="ph-card ph-card-main" aria-label="דירוגים">
              🏆 דירוגים
            </Link>
          </div>

          {/* Row 2 - 5 smaller placeholder cards */}
          <div className="dashboard-row-worlds">
            <Link href="/child/daily-goals" className="ph-card ph-card-world" aria-label="יעדים יומיים">
              🎯 יעדים יומיים
            </Link>
            <Link href="/child/worlds/crystal-forest" className="ph-card ph-card-world" aria-label="יער הקריסטלים">
              🌲 יער הקריסטלים
            </Link>
            <Link href="/child/worlds/fire-trail" className="ph-card ph-card-world" aria-label="שביל האש">
              🔥 שביל האש
            </Link>
            <Link href="/child/worlds/lightning-fortress" className="ph-card ph-card-world" aria-label="מצודת הברק">
              ⚡ מצודת הברק
            </Link>
            <Link href="/child/worlds/champions-hall" className="ph-card ph-card-world" aria-label="היכל האלופים">
              👑 היכל האלופים
            </Link>
          </div>

        </div>

      </main>
    </>
  );
}

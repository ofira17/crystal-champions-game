// ══════════════════════════════════════════════════════════
// Child dashboard — full fantasy hub screen.
// ══════════════════════════════════════════════════════════

import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { getChildDashboardData } from "@/app/actions/child-dashboard";
import {
  CHILD_ARENA_BUTTON,
  CHILD_HERO_RESTING_TEXT,
  mapStrategyToArenaThreat,
  GRADE_LABELS,
  type MissionType,
} from "@/lib/terminology";
import Link from "next/link";
import Image from "next/image";
import LogoutButton from "@/components/auth/LogoutButton";

// ── Hero image resolution (server-safe) ───────────────────────────────────────
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
const GILAD_IMAGES = Array.from({ length: 16 }, (_, i) =>
  `/heroes/gilad/gilad_v2_${String(i + 1).padStart(2, "0")}.png`
);
const BOY_THEME: Record<string, number> = {
  default:0,storm:0,gold:1,nature:2,teal:2,fire:3,dragon:3,lava:3,
  thunder:4,yellow:4,ice:5,crystal:6,shadow:6,pink:6,stone:6,ocean:8,star:9,galaxy:9,cosmic:9,
};
const GIRL_THEME: Record<string, number> = {
  default:0,storm:0,ice:1,crystal:2,nature:3,teal:3,fire:4,dragon:4,pink:4,
  thunder:5,yellow:5,gold:6,sun:6,star:7,cosmic:7,shadow:9,ocean:9,
};
function heroImg(gender: "M"|"F", theme: string): string {
  if (theme === "stone" || theme === "gilad") return GILAD_IMAGES[0];
  const imgs = gender === "M" ? BOY_IMAGES : GIRL_IMAGES;
  const map  = gender === "M" ? BOY_THEME : GIRL_THEME;
  return imgs[map[theme] ?? 0];
}

// ── World card config ─────────────────────────────────────────────────────────
const WCFG = [
  { icon:"📦", fallbackName:"חוק הקריסטל מכוחו", fallbackDesc:"שאלות חיימום לקליטה",
    gFrom:"#3d1e00",gTo:"#7a4000",bdr:"#c97f00",bot:"#3a2000",glow:"rgba(201,127,0,0.55)" },
  { icon:"🗺️", fallbackName:"מדרגה הידע",        fallbackDesc:"אתגרי חיבור – שלב ההתעלות!",
    gFrom:"#420a0a",gTo:"#661212",bdr:"#b91c1c",bot:"#3d0a0a",glow:"rgba(185,28,28,0.5)" },
  { icon:"🌳", fallbackName:"יער הקסמים",         fallbackDesc:"שלבים מתקדמים לחקירה",
    gFrom:"#052218",gTo:"#044228",bdr:"#059669",bot:"#032a1a",glow:"rgba(5,150,105,0.5)" },
  { icon:"🏰", fallbackName:"מגדל הזכויות",       fallbackDesc:"שלב אלופי הקריסטלים",
    gFrom:"#06122a",gTo:"#0e2244",bdr:"#2563eb",bot:"#050e20",glow:"rgba(37,99,235,0.5)" },
];

export default async function ChildPage() {
  await requireRole("child");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { profile, hero, activeAdventure, worlds, energyMax } = await getChildDashboardData();

  if (!profile) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">מגדיר את הפרופיל שלך...</p>
      </main>
    );
  }

  const hasAdventure  = !!activeAdventure;
  const adventureType = (activeAdventure?.mission_type ?? "hero_training") as MissionType;
  const heroType      = hero?.color_theme ?? "default";
  const heroRarity    = (hero?.rarity ?? "Common") as "Common"|"Rare"|"Epic"|"Legendary";
  const heroName      = hero?.name_he ?? "הגיבור שלך";
  const heroGender    = (hero?.gender ?? "M") as "M"|"F";
  const gradeLabel    = profile.grade_level ? (GRADE_LABELS[profile.grade_level] ?? "") : "";
  const arenaThreat   = activeAdventure ? mapStrategyToArenaThreat(activeAdventure.selection_strategy) : null;
  const speechText    = hasAdventure && activeAdventure.story_text_he
    ? activeAdventure.story_text_he
    : "כל שאלה נכונה – עוד צעד אל הניצחון!";
  const overallProgress = worlds.length > 0
    ? Math.round(worlds.reduce((s,w)=>s+(w.is_unlocked?w.progress_percent:0),0)/Math.max(1,worlds.filter(w=>w.is_unlocked).length))
    : 0;
  const imgSrc = heroImg(heroGender, heroType);

  return (
    <main dir="rtl" style={{
      position:"relative", minHeight:"100vh", display:"flex", flexDirection:"column",
      overflow:"hidden", background:"#060118", fontFamily:"var(--font-sans)",
    }}>

      {/* ══════════════ BACKGROUND ══════════════ */}
      <div style={{ position:"absolute", inset:0, zIndex:0, pointerEvents:"none" }}>

        {/* Sky */}
        <div style={{ position:"absolute", inset:0, background:
          "linear-gradient(180deg,#03010e 0%,#0c0330 18%,#190660 32%,#2c0e78 46%,#1e0862 62%,#110440 80%,#07021a 100%)" }} />

        {/* Nebula */}
        <div style={{ position:"absolute", inset:0, background:`
          radial-gradient(ellipse 100% 60% at 50% 0%,rgba(90,25,190,0.7) 0%,transparent 60%),
          radial-gradient(ellipse 60% 45% at 10% 35%,rgba(55,12,160,0.55) 0%,transparent 60%),
          radial-gradient(ellipse 55% 40% at 90% 28%,rgba(40,8,150,0.5) 0%,transparent 55%),
          radial-gradient(ellipse 75% 35% at 50% 95%,rgba(18,4,70,0.8) 0%,transparent 68%)
        `}} />

        {/* Stars */}
        {Array.from({length:90}).map((_,i)=>{
          const sz=1+(i%3); const x=((i*137+17)%96)+2; const y=((i*79+31)%50)+1;
          return <div key={i} style={{
            position:"absolute", borderRadius:"50%", background:"white",
            width:sz, height:sz, left:`${x}%`, top:`${y}%`,
            opacity:0.2+(i%7)*0.1,
            boxShadow:sz>1?`0 0 ${sz*2}px rgba(200,200,255,0.5)`:undefined,
          }} />;
        })}
        {/* Bright stars */}
        {[{x:10,y:5,r:3.5},{x:38,y:3,r:3},{x:62,y:6,r:3.5},{x:84,y:4,r:3},
          {x:24,y:13,r:2.5},{x:52,y:2,r:2.5},{x:75,y:15,r:2.5},{x:5,y:18,r:2}].map((s,i)=>(
          <div key={i} style={{
            position:"absolute", borderRadius:"50%", background:"white",
            width:s.r*2, height:s.r*2, left:`${s.x}%`, top:`${s.y}%`, opacity:1,
            boxShadow:`0 0 ${s.r*6}px ${s.r*3}px rgba(220,200,255,0.55),0 0 ${s.r*12}px rgba(160,120,255,0.3)`,
          }} />
        ))}

        {/* ─── FLOATING ISLANDS ─── */}
        {/* Island L1 */}
        <div style={{position:"absolute",left:"2%",top:"5%",width:"150px",height:"70px"}}>
          <div style={{width:"100%",height:"44px",background:"linear-gradient(160deg,#5a3898 0%,#231248 100%)",
            borderRadius:"50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow:"0 8px 30px rgba(110,55,230,0.65),0 12px 40px rgba(0,0,0,0.7)"}} />
          <div style={{width:"74%",marginLeft:"13%",height:"26px",marginTop:"-6px",
            background:"linear-gradient(160deg,#306848 0%,#163624 100%)",borderRadius:"0 0 50% 50%",
            boxShadow:"0 10px 22px rgba(0,0,0,0.75)"}} />
          {[{x:14,c:"#a855f7"},{x:44,c:"#38bdf8"},{x:72,c:"#e879f9"},{x:88,c:"#f59e0b"}].map((cr,j)=>(
            <div key={j} className="particle" style={{
              position:"absolute",left:`${cr.x}%`,top:"-26px",width:"12px",height:"24px",
              background:`linear-gradient(160deg,white 0%,${cr.c} 55%)`,
              clipPath:"polygon(50% 0%,100% 35%,75% 100%,25% 100%,0% 35%)",
              filter:`drop-shadow(0 0 8px ${cr.c}) drop-shadow(0 0 16px ${cr.c}88)`,
              animationDuration:`${4.2+j*1.2}s`,
            }} />
          ))}
        </div>
        {/* Island L2 */}
        <div style={{position:"absolute",left:"18%",top:"1%",width:"110px",height:"54px"}}>
          <div style={{width:"100%",height:"33px",background:"linear-gradient(160deg,#521e98 0%,#26104e 100%)",
            borderRadius:"50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow:"0 6px 20px rgba(140,65,250,0.5)"}} />
          <div style={{width:"66%",marginLeft:"17%",height:"20px",marginTop:"-5px",
            background:"linear-gradient(160deg,#205838 0%,#0e2c1c 100%)",borderRadius:"0 0 50% 50%"}} />
          {[{x:30,c:"#7c3aed"},{x:62,c:"#06b6d4"}].map((cr,j)=>(
            <div key={j} className="particle" style={{
              position:"absolute",left:`${cr.x}%`,top:"-20px",width:"10px",height:"18px",
              background:`linear-gradient(160deg,white 0%,${cr.c} 55%)`,
              clipPath:"polygon(50% 0%,100% 35%,75% 100%,25% 100%,0% 35%)",
              filter:`drop-shadow(0 0 7px ${cr.c})`,animationDuration:`${5+j}s`,
            }} />
          ))}
        </div>
        {/* Island R1 */}
        <div style={{position:"absolute",right:"24%",top:"3%",width:"90px",height:"46px"}}>
          <div style={{width:"100%",height:"28px",background:"linear-gradient(160deg,#421e82 0%,#1e0e42 100%)",
            borderRadius:"50% 50% 38% 38% / 58% 58% 42% 42%",boxShadow:"0 5px 18px rgba(100,40,200,0.5)"}} />
          <div style={{width:"62%",marginLeft:"19%",height:"16px",marginTop:"-4px",
            background:"linear-gradient(160deg,#265248 0%,#0e2c24 100%)",borderRadius:"0 0 50% 50%"}} />
          {[{x:25,c:"#f59e0b"},{x:58,c:"#a855f7"}].map((cr,j)=>(
            <div key={j} className="particle" style={{
              position:"absolute",left:`${cr.x}%`,top:"-16px",width:"9px",height:"16px",
              background:`linear-gradient(160deg,white 0%,${cr.c} 55%)`,
              clipPath:"polygon(50% 0%,100% 35%,75% 100%,25% 100%,0% 35%)",
              filter:`drop-shadow(0 0 7px ${cr.c})`,animationDuration:`${4.5+j}s`,
            }} />
          ))}
        </div>

        {/* ─── LARGE CASTLE – right side dominates ─── */}
        <div style={{position:"absolute",right:"-2%",bottom:"5%",width:"420px",height:"520px"}}>
          {/* Ambient glow */}
          <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
            width:"440px",height:"280px",
            background:"radial-gradient(ellipse,rgba(130,55,250,0.45) 0%,rgba(70,25,180,0.22) 55%,transparent 80%)",
            filter:"blur(28px)"}} />
          <svg viewBox="0 0 420 520" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cw2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4a308a"/><stop offset="100%" stopColor="#1e1048"/>
              </linearGradient>
              <linearGradient id="ct2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5838a0"/><stop offset="100%" stopColor="#241258"/>
              </linearGradient>
              <linearGradient id="cr2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6848c8"/><stop offset="100%" stopColor="#341878"/>
              </linearGradient>
              <linearGradient id="path2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3a2060" stopOpacity="0.6"/>
                <stop offset="50%" stopColor="#5c3898" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#3a2060" stopOpacity="0.3"/>
              </linearGradient>
            </defs>
            {/* Ground path */}
            <ellipse cx="210" cy="520" rx="200" ry="28" fill="url(#path2)"/>
            {/* Lantern posts on path */}
            {[100,150,200,250,300].map((x,i)=>(
              <g key={i}>
                <rect x={x-1} y={470-(i%2)*20} width={2} height={30+(i%2)*20} fill="#5a3878" opacity="0.8"/>
                <ellipse cx={x} cy={470-(i%2)*20} rx={4} ry={4} fill="#f59e0b" opacity="0.9"/>
                <ellipse cx={x} cy={470-(i%2)*20} rx={12} ry={8} fill="rgba(245,158,11,0.18)"/>
              </g>
            ))}
            {/* Main wall */}
            <rect x="55" y="295" width="310" height="225" fill="url(#cw2)"/>
            {/* Gate */}
            <rect x="160" y="370" width="100" height="150" fill="#060112"/>
            <ellipse cx="210" cy="370" rx="50" ry="35" fill="#060112"/>
            <ellipse cx="210" cy="405" rx="42" ry="46" fill="rgba(255,140,20,0.14)"/>
            {/* Wall battlements */}
            {[62,84,106,128,172,208,244,280,316,340,362].map((x,i)=>(
              <rect key={i} x={x} y={280} width={16} height={26} fill="url(#cw2)" rx={2}/>
            ))}
            {/* Left tower */}
            <rect x="30" y="196" width="78" height="329" fill="url(#ct2)"/>
            {[30,50,68,84].map((x,i)=><rect key={i} x={x} y={180} width={16} height={26} fill="url(#ct2)" rx={2}/>)}
            <polygon points="69,86 30,196 108,196" fill="url(#cr2)"/>
            <line x1="69" y1="86" x2="69" y2="28" stroke="#c084fc" strokeWidth="3"/>
            <polygon points="69,28 96,44 69,60" fill="#a855f7"/>
            {/* Right tower */}
            <rect x="312" y="178" width="82" height="342" fill="url(#ct2)"/>
            {[312,334,354,374].map((x,i)=><rect key={i} x={x} y={160} width={16} height={26} fill="url(#ct2)" rx={2}/>)}
            <polygon points="353,68 312,178 394,178" fill="url(#cr2)"/>
            <line x1="353" y1="68" x2="353" y2="8" stroke="#c084fc" strokeWidth="3"/>
            <polygon points="353,8 382,26 353,44" fill="#7c3aed"/>
            {/* Center tower */}
            <rect x="162" y="148" width="96" height="372" fill="url(#ct2)"/>
            {[162,182,202,222,238].map((x,i)=><rect key={i} x={x} y={128} width={16} height={28} fill="url(#ct2)" rx={2}/>)}
            <polygon points="210,24 162,148 258,148" fill="url(#cr2)"/>
            <line x1="210" y1="24" x2="210" y2="-20" stroke="#e879f9" strokeWidth="3.5"/>
            <polygon points="210,-20 242,-4 210,16" fill="#d946ef"/>
            {/* Windows */}
            <ellipse cx="69" cy="248" rx="11" ry="14" fill="#ff9010" opacity="0.92"/>
            <ellipse cx="69" cy="278" rx="8" ry="9" fill="#ffb030" opacity="0.65"/>
            <ellipse cx="210" cy="200" rx="13" ry="16" fill="#ff9010" opacity="0.95"/>
            <ellipse cx="210" cy="238" rx="9" ry="11" fill="#ffb030" opacity="0.72"/>
            <ellipse cx="210" cy="300" rx="11" ry="14" fill="#ff8000" opacity="0.78"/>
            <ellipse cx="353" cy="228" rx="11" ry="14" fill="#ff9010" opacity="0.92"/>
            <ellipse cx="353" cy="260" rx="8" ry="9" fill="#ffb030" opacity="0.65"/>
            <ellipse cx="122" cy="336" rx="10" ry="12" fill="#ff9010" opacity="0.72"/>
            <ellipse cx="298" cy="336" rx="10" ry="12" fill="#ff9010" opacity="0.72"/>
            {/* Stone lines */}
            {[310,336,362,390,416,442,466,490].map((y,i)=>(
              <line key={i} x1="55" y1={y} x2="365" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            ))}
          </svg>
          {/* Castle base glow */}
          <div style={{position:"absolute",bottom:"6px",left:"50%",transform:"translateX(-50%)",
            width:"320px",height:"100px",
            background:"radial-gradient(ellipse,rgba(140,70,255,0.7) 0%,transparent 75%)",
            filter:"blur(20px)"}} />
        </div>

        {/* ─── LEFT CRYSTAL CLUSTER – large ─── */}
        <div style={{position:"absolute",left:"0%",top:"25%",display:"flex",gap:"6px",alignItems:"flex-end"}}>
          {[
            {h:80,w:22,c:"#a855f7",dur:"4.8s"},
            {h:120,w:28,c:"#7c3aed",dur:"5.8s",del:"0.5s"},
            {h:68,w:18,c:"#c084fc",dur:"6.2s",del:"1.1s"},
            {h:50,w:15,c:"#e879f9",dur:"5.1s",del:"0.8s"},
            {h:95,w:24,c:"#a855f7",dur:"4.5s",del:"0.3s"},
          ].map((c,i)=>(
            <div key={i} className="particle" style={{
              width:`${c.w}px`,height:`${c.h}px`,
              background:`linear-gradient(180deg,rgba(255,255,255,0.95) 0%,${c.c} 38%,${c.c}cc 100%)`,
              clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
              filter:`drop-shadow(0 0 10px ${c.c}) drop-shadow(0 0 20px ${c.c}88)`,
              animationDuration:c.dur,animationDelay:(c as {del?:string}).del??"0s",
            }}/>
          ))}
        </div>
        {/* Left mid crystal */}
        <div className="particle" style={{
          position:"absolute",left:"8%",top:"16%",width:"28px",height:"50px",
          background:"linear-gradient(180deg,rgba(255,255,255,0.95) 0%,#38bdf8 38%,#0891b2cc 100%)",
          clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
          filter:"drop-shadow(0 0 12px #38bdf8) drop-shadow(0 0 24px #38bdf866)",
          animationDuration:"6.2s",
        }}/>
        {/* Left lower crystal */}
        <div className="particle" style={{
          position:"absolute",left:"5%",top:"48%",width:"20px",height:"36px",
          background:"linear-gradient(180deg,rgba(255,255,255,0.95) 0%,#e879f9 38%,#c026d3cc 100%)",
          clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
          filter:"drop-shadow(0 0 10px #e879f9)",animationDuration:"5.4s",animationDelay:"1.4s",
        }}/>

        {/* ─── RIGHT CRYSTAL CLUSTER ─── */}
        <div style={{position:"absolute",right:"0%",top:"22%",display:"flex",gap:"5px",alignItems:"flex-end"}}>
          {[
            {h:60,w:18,c:"#a855f7",dur:"4.8s",del:"0.3s"},
            {h:90,w:24,c:"#7c3aed",dur:"5.5s",del:"1.2s"},
            {h:50,w:16,c:"#e879f9",dur:"4.2s",del:"0.7s"},
            {h:70,w:20,c:"#a855f7",dur:"5.9s",del:"0.1s"},
          ].map((c,i)=>(
            <div key={i} className="particle" style={{
              width:`${c.w}px`,height:`${c.h}px`,
              background:`linear-gradient(180deg,rgba(255,255,255,0.95) 0%,${c.c} 38%,${c.c}cc 100%)`,
              clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
              filter:`drop-shadow(0 0 9px ${c.c}) drop-shadow(0 0 18px ${c.c}66)`,
              animationDuration:c.dur,animationDelay:c.del,
            }}/>
          ))}
        </div>
        {/* Right amber crystal */}
        <div className="particle" style={{
          position:"absolute",right:"5%",top:"14%",width:"32px",height:"58px",
          background:"linear-gradient(180deg,rgba(255,255,255,0.95) 0%,#f59e0b 38%,#d97706cc 100%)",
          clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
          filter:"drop-shadow(0 0 13px #f59e0b) drop-shadow(0 0 26px #f59e0b66)",
          animationDuration:"5.6s",animationDelay:"0.9s",
        }}/>

        {/* ─── DRAGON – upper left, LARGE ─── */}
        <div style={{position:"absolute",left:"1%",top:"38%",opacity:0.92}}>
          <svg viewBox="0 0 160 120" width="160" height="120"
            style={{filter:"drop-shadow(0 0 14px #7c3aed) drop-shadow(0 0 28px #4c1d9688)"}}>
            {/* Body */}
            <ellipse cx="80" cy="68" rx="38" ry="24" fill="#2e0d70"/>
            {/* Left wing */}
            <path d="M55 58 C40 30,10 14,2 28 C-6 42,18 58,42 58 Z" fill="#3b1882" opacity="0.92"/>
            <path d="M55 58 C44 40,22 28,10 34 C4 38,12 50,30 54 Z" fill="#512498" opacity="0.6"/>
            {/* Right wing */}
            <path d="M105 58 C120 30,150 14,158 28 C166 42,142 58,118 58 Z" fill="#3b1882" opacity="0.92"/>
            <path d="M105 58 C116 40,138 28,150 34 C156 38,148 50,130 54 Z" fill="#512498" opacity="0.6"/>
            {/* Neck */}
            <ellipse cx="80" cy="50" rx="18" ry="14" fill="#341578"/>
            {/* Head */}
            <ellipse cx="80" cy="36" rx="22" ry="18" fill="#3a1880"/>
            {/* Horns */}
            <polygon points="68,22 62,4 72,20" fill="#a855f7"/>
            <polygon points="92,22 98,4 88,20" fill="#a855f7"/>
            {/* Eyes */}
            <ellipse cx="70" cy="34" rx="5" ry="5" fill="#a855f7"/>
            <ellipse cx="90" cy="34" rx="5" ry="5" fill="#a855f7"/>
            <ellipse cx="71" cy="34" rx="2.5" ry="2.5" fill="#ff00ff"/>
            <ellipse cx="91" cy="34" rx="2.5" ry="2.5" fill="#ff00ff"/>
            {/* Tail */}
            <path d="M42 78 Q20 90 10 108 Q16 112 22 106 Q28 94 50 84 Z" fill="#3b1882"/>
            {/* Legs */}
            <path d="M60 84 Q52 98 46 106" stroke="#3b1882" strokeWidth="8" strokeLinecap="round" fill="none"/>
            <path d="M100 84 Q108 98 114 106" stroke="#3b1882" strokeWidth="8" strokeLinecap="round" fill="none"/>
          </svg>
        </div>

        {/* Glowing path to castle */}
        <div style={{
          position:"absolute",bottom:"9%",right:"6%",width:"260px",height:"100px",
          background:"linear-gradient(to right,transparent 0%,rgba(110,55,200,0.3) 40%,rgba(140,80,230,0.45) 70%,transparent 100%)",
          borderRadius:"50%",filter:"blur(12px)",transform:"perspective(200px) rotateX(56deg)",
        }}/>

        {/* Ground mist */}
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,height:"200px",
          background:"linear-gradient(to top,rgba(20,4,60,0.9) 0%,rgba(45,12,100,0.4) 50%,transparent 100%)",
        }}/>

        {/* Sparkles */}
        {[
          {x:"28%",y:"30%",c:"#a855f7",s:6},{x:"42%",y:"10%",c:"#38bdf8",s:5},
          {x:"55%",y:"22%",c:"#e879f9",s:6},{x:"67%",y:"14%",c:"#f59e0b",s:5},
          {x:"82%",y:"35%",c:"#7c3aed",s:7},{x:"16%",y:"50%",c:"#06b6d4",s:5},
          {x:"35%",y:"42%",c:"#a855f7",s:4},{x:"73%",y:"48%",c:"#e879f9",s:5},
        ].map((p,i)=>(
          <div key={i} className="particle" style={{
            position:"absolute",left:p.x,top:p.y,
            width:`${p.s*2}px`,height:`${p.s*2}px`,borderRadius:"50%",background:p.c,
            boxShadow:`0 0 ${p.s*3}px ${p.s}px ${p.c}88`,
            animationDuration:`${3+i*0.6}s`,animationDelay:`${i*0.35}s`,
          }}/>
        ))}
      </div>

      {/* ══════════════ TOP BAR ══════════════ */}
      <header style={{
        position:"relative",zIndex:20,display:"flex",alignItems:"center",
        gap:"8px",padding:"12px 16px 8px",flexWrap:"wrap",
      }}>
        <LogoutButton />

        {/* Mana */}
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0,
          background:"linear-gradient(160deg,#0a2030,#050e1c)",
          border:"1.5px solid rgba(34,211,238,0.6)",borderBottom:"3px solid rgba(14,116,144,0.85)",
          borderRadius:"14px",padding:"5px 12px",boxShadow:"0 4px 14px rgba(0,0,0,0.6)"}}>
          <span style={{color:"#c4b5fd",fontSize:"12px",fontWeight:900}}>מנה</span>
          <div style={{display:"flex",gap:"4px",margin:"0 4px"}}>
            {Array.from({length:energyMax}).map((_,i)=>(
              <div key={i} style={{width:"14px",height:"14px",transform:"rotate(45deg)",
                border:`1.5px solid ${i<profile.energy?"#67e8f9":"rgba(255,255,255,0.2)"}`,
                background:i<profile.energy?"linear-gradient(135deg,#67e8f9,#22d3ee)":"rgba(255,255,255,0.06)",
                boxShadow:i<profile.energy?"0 0 7px rgba(34,211,238,0.95)":"none"}}/>
            ))}
          </div>
          <span style={{color:"#22d3ee",fontSize:"14px"}}>⚡</span>
        </div>

        {/* XP */}
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0,
          background:"linear-gradient(160deg,#1a0845,#0e0528)",
          border:"1.5px solid rgba(139,92,246,0.6)",borderBottom:"3px solid rgba(76,29,149,0.85)",
          borderRadius:"14px",padding:"5px 12px",boxShadow:"0 4px 14px rgba(0,0,0,0.6)"}}>
          <span style={{color:"#ede9fe",fontWeight:900,fontSize:"14px"}}>XP {profile.total_xp.toLocaleString("he-IL")}</span>
          <span style={{color:"#fbbf24",fontSize:"14px"}}>⭐</span>
        </div>

        {/* Stars */}
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0,
          background:"linear-gradient(160deg,#2a1800,#150c00)",
          border:"1.5px solid rgba(202,138,4,0.6)",borderBottom:"3px solid rgba(120,80,0,0.85)",
          borderRadius:"14px",padding:"5px 12px",boxShadow:"0 4px 14px rgba(0,0,0,0.6)"}}>
          <span style={{color:"#fef3c7",fontWeight:900,fontSize:"14px"}}>{profile.total_stars.toLocaleString("he-IL")}</span>
          <span style={{color:"#fbbf24",fontSize:"14px"}}>⭐</span>
        </div>

        {/* Coins */}
        <div style={{display:"flex",alignItems:"center",gap:"6px",flexShrink:0,
          background:"linear-gradient(160deg,#1c1000,#0e0800)",
          border:"1.5px solid rgba(180,120,0,0.6)",borderBottom:"3px solid rgba(100,60,0,0.85)",
          borderRadius:"14px",padding:"5px 12px",boxShadow:"0 4px 14px rgba(0,0,0,0.6)"}}>
          <span style={{color:"#fef3c7",fontWeight:900,fontSize:"14px"}}>{profile.total_coins.toLocaleString("he-IL")}</span>
          <span style={{color:"#f59e0b",fontSize:"14px"}}>🪙</span>
        </div>

        <div style={{flex:1}}/>

        {/* User */}
        <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0}}>
          <div style={{textAlign:"right"}}>
            <p style={{color:"white",fontWeight:700,fontSize:"14px",lineHeight:1}}>{profile.display_name_he}</p>
            {gradeLabel && <p style={{color:"#c4b5fd",fontSize:"12px",lineHeight:1,marginTop:"2px"}}>{gradeLabel}</p>}
          </div>
          <div style={{position:"relative",width:"44px",height:"44px",borderRadius:"50%",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"18px",fontWeight:900,color:"white",
            background:"linear-gradient(135deg,#7c3aed,#4c1d95)",
            border:"2.5px solid #a78bfa",boxShadow:"0 0 20px rgba(124,58,237,0.8)"}}>
            {profile.display_name_he.charAt(0)}
            <span style={{position:"absolute",top:"-10px",right:"-4px",fontSize:"18px"}}>👑</span>
          </div>
        </div>
      </header>

      {/* ══════════════ MAIN 3-COLUMN LAYOUT ══════════════ */}
      <div style={{
        position:"relative",zIndex:20,display:"flex",flex:1,
        gap:"16px",padding:"0 16px 8px",alignItems:"stretch",minHeight:0,
      }}>

        {/* ── LEFT PANEL – Parchment ── */}
        <aside style={{width:"230px",flexShrink:0,paddingTop:"4px",display:"flex",flexDirection:"column"}}>
          <div style={{
            borderRadius:"24px",padding:"20px",display:"flex",flexDirection:"column",gap:"12px",flex:1,
            background:"linear-gradient(170deg,#fef3c7 0%,#fde68a 25%,#fbbf24 60%,#d97706 100%)",
            border:"3px solid #b45309",borderBottom:"7px solid #78350f",
            boxShadow:"0 16px 40px rgba(0,0,0,0.8),inset 0 2px 0 rgba(255,255,255,0.7),inset 0 -2px 0 rgba(0,0,0,0.12)",
          }}>
            <div style={{display:"flex",justifyContent:"center"}}>
              <div style={{width:"56px",height:"56px",borderRadius:"50%",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",
                background:"linear-gradient(135deg,#7c3aed,#4c1d95)",
                border:"2.5px solid #a78bfa",borderBottom:"4px solid #3b0764",
                boxShadow:"0 6px 24px rgba(124,58,237,0.75)"}}>💜</div>
            </div>
            <h3 style={{fontWeight:900,textAlign:"center",lineHeight:1.3,color:"#3a1e00",fontSize:"15px"}}>
              כל יום – עוד – ניצחון
            </h3>
            <p style={{fontSize:"13px",textAlign:"center",lineHeight:1.5,fontWeight:600,color:"#78350f"}}>
              ענה נכון, התקדם,<br/>אסוף אלופי הקריסטלים!
            </p>
            <div style={{height:"1.5px",background:"linear-gradient(to right,transparent,rgba(180,120,20,0.85),transparent)"}}/>
            <div style={{display:"flex",justifyContent:"space-around"}}>
              {[["📚","לומדים"],["💎","מתאמנים"],["🏆","מצטיינים"]].map(([icon,label])=>(
                <div key={label} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"}}>
                  <div style={{width:"44px",height:"44px",borderRadius:"12px",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",
                    background:"rgba(255,255,255,0.7)",border:"2px solid rgba(180,120,20,0.7)",
                    borderBottom:"3px solid rgba(120,70,0,0.7)",
                    boxShadow:"0 2px 8px rgba(0,0,0,0.22),inset 0 1px 0 rgba(255,255,255,0.85)"}}>
                    {icon}
                  </div>
                  <span style={{fontSize:"11px",fontWeight:700,color:"#3a1e00"}}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ── CENTER – Hero + CTA ── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",minWidth:0,paddingTop:"4px"}}>

          {/* Speech bubble */}
          <div style={{maxWidth:"420px",width:"100%",position:"relative"}}>
            <div style={{
              background:"rgba(255,255,255,0.97)",borderRadius:"22px",padding:"14px 22px",
              boxShadow:"0 10px 36px rgba(0,0,0,0.6),0 2px 8px rgba(124,58,237,0.35)",
              border:"2px solid rgba(255,255,255,0.95)",position:"relative",
            }}>
              <div style={{
                position:"absolute",bottom:"-20px",right:"38%",width:0,height:0,
                borderLeft:"15px solid transparent",borderRight:"15px solid transparent",
                borderTop:"22px solid rgba(255,255,255,0.97)",
              }}/>
              <p style={{fontWeight:900,fontSize:"18px",lineHeight:1.3,color:"#2e1065",margin:0}}>
                הגבורה שלך מוכנה לכבוש!
              </p>
              <p style={{fontSize:"13px",lineHeight:1.5,color:"#4c1d95",marginTop:"4px"}}>
                {speechText.length>90 ? speechText.slice(0,90)+"…" : speechText}
              </p>
            </div>
          </div>

          {/* Hero stage */}
          <div style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",width:"100%",flex:"1 1 auto",minHeight:"300px"}}>

            {/* Wide radial glow behind hero */}
            <div style={{
              position:"absolute",bottom:"70px",left:"50%",transform:"translateX(-50%)",
              width:"560px",height:"320px",pointerEvents:"none",
              background:"radial-gradient(ellipse,rgba(56,189,248,0.6) 0%,rgba(99,102,241,0.42) 32%,rgba(139,92,246,0.2) 56%,transparent 76%)",
              filter:"blur(26px)",
            }}/>

            {/* Hero crystals */}
            {[
              {x:"6%",y:"18%",w:16,h:28,c:"#a855f7",dur:"4.8s"},
              {x:"80%",y:"9%",w:20,h:36,c:"#38bdf8",dur:"5.6s",del:"0.6s"},
              {x:"3%",y:"58%",w:12,h:22,c:"#f59e0b",dur:"6.1s",del:"1.2s"},
              {x:"83%",y:"54%",w:18,h:32,c:"#7c3aed",dur:"5.2s",del:"0.9s"},
              {x:"16%",y:"4%",w:10,h:18,c:"#e879f9",dur:"4.3s",del:"1.8s"},
              {x:"72%",y:"64%",w:14,h:24,c:"#06b6d4",dur:"6.6s",del:"0.3s"},
            ].map((c,i)=>(
              <div key={i} className="particle" style={{
                position:"absolute",left:c.x,top:c.y,pointerEvents:"none",
                width:`${c.w}px`,height:`${c.h}px`,
                background:`linear-gradient(170deg,rgba(255,255,255,0.95) 0%,${c.c} 45%,${c.c}aa 100%)`,
                clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                filter:`drop-shadow(0 0 8px ${c.c}) drop-shadow(0 0 16px ${c.c}66)`,
                animationDuration:c.dur,animationDelay:(c as {del?:string}).del??"0s",
              }}/>
            ))}

            {/* ── HERO IMAGE – frameless ── */}
            <Link href="/child/heroes" style={{
              display:"block",position:"relative",zIndex:10,
              filter:hasAdventure
                ?"drop-shadow(0 0 22px rgba(56,189,248,0.75)) drop-shadow(0 0 44px rgba(56,189,248,0.38))"
                :"drop-shadow(0 0 18px rgba(124,58,237,0.7)) drop-shadow(0 0 36px rgba(124,58,237,0.34))",
            }} className="hero-float">
              <Image
                src={imgSrc}
                alt={heroName}
                width={280}
                height={380}
                style={{width:"240px",height:"330px",objectFit:"contain",objectPosition:"center bottom",display:"block"}}
                unoptimized
                priority
              />
            </Link>

            {/* Glowing platform */}
            <div style={{
              width:"340px",height:"40px",marginTop:"-10px",pointerEvents:"none",
              background:"radial-gradient(ellipse,rgba(56,189,248,1) 0%,rgba(99,102,241,0.92) 40%,rgba(124,58,237,0.48) 66%,transparent 100%)",
              borderRadius:"50%",
              boxShadow:"0 0 90px 40px rgba(56,189,248,0.75),0 0 180px 80px rgba(99,102,241,0.38)",
            }}/>

            {/* Hero name */}
            <p style={{fontWeight:900,fontSize:"20px",color:"white",marginTop:"18px",
              textShadow:"0 2px 12px rgba(0,0,0,0.8)"}}>
              {heroName}
            </p>
            <p style={{color:"#c4b5fd",fontSize:"13px",fontWeight:600,marginTop:"2px"}}>התקדמות שלך</p>
            <div style={{display:"flex",gap:"8px",marginTop:"6px"}}>
              {[0,1,2].map(i=>(
                <div key={i} style={{width:"12px",height:"12px",borderRadius:"50%",
                  background:i===0?"#38bdf8":"rgba(56,189,248,0.15)",
                  boxShadow:i===0?"0 0 10px 4px rgba(56,189,248,0.75)":"none"}}/>
              ))}
            </div>
          </div>

          {/* ── CTA BUTTON ── */}
          <div style={{width:"100%",maxWidth:"560px",padding:"0 8px",marginTop:"10px"}}>
            {hasAdventure ? (
              <Link href={`/child/arena?adventure=${activeAdventure.id}`} style={{
                display:"block",width:"100%",textAlign:"center",fontWeight:900,
                fontSize:"26px",padding:"20px 0",textDecoration:"none",
                background:"linear-gradient(180deg,#fde68a 0%,#f59e0b 26%,#d97706 62%,#b45309 100%)",
                borderRadius:"20px",border:"3px solid #fbbf24",borderBottom:"8px solid #78350f",
                boxShadow:"0 0 50px rgba(245,158,11,0.7),0 10px 28px rgba(0,0,0,0.55),inset 0 2px 0 rgba(255,255,255,0.45)",
                color:"#1c0a00",textShadow:"0 1px 3px rgba(0,0,0,0.25)",letterSpacing:"0.02em",
                transition:"all 0.15s ease",
              }}>
                ⚔️ {CHILD_ARENA_BUTTON}
              </Link>
            ) : (
              <button disabled style={{
                display:"block",width:"100%",textAlign:"center",fontWeight:900,
                fontSize:"26px",padding:"20px 0",cursor:"not-allowed",
                background:"linear-gradient(180deg,#4a3000 0%,#2a1a00 100%)",
                borderRadius:"20px",border:"3px solid #5a3800",borderBottom:"8px solid #1a0e00",
                boxShadow:"0 10px 28px rgba(0,0,0,0.55)",color:"#7a5a20",letterSpacing:"0.02em",
              }}>
                ⚔️ {CHILD_ARENA_BUTTON}
              </button>
            )}
            {arenaThreat && (
              <p style={{color:"rgba(251,191,36,0.9)",fontSize:"14px",textAlign:"center",marginTop:"8px",fontWeight:700}}>
                ⚔️ {arenaThreat}
              </p>
            )}
            {!hasAdventure && (
              <p style={{color:"#64748b",fontSize:"13px",textAlign:"center",marginTop:"8px"}}>
                ✕ {CHILD_HERO_RESTING_TEXT}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL – Trophy ── */}
        <aside style={{width:"230px",flexShrink:0,paddingTop:"4px",display:"flex",flexDirection:"column"}}>
          <div style={{
            borderRadius:"24px",padding:"20px",display:"flex",flexDirection:"column",gap:"14px",flex:1,
            background:"linear-gradient(170deg,#0c2444,#060e22)",
            border:"2.5px solid #c49a3a",borderBottom:"7px solid #7a5800",
            boxShadow:"0 16px 40px rgba(0,0,0,0.85),inset 0 1px 0 rgba(196,154,58,0.35)",
          }}>
            <div style={{display:"flex",justifyContent:"center"}}>
              <div style={{width:"56px",height:"56px",borderRadius:"50%",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:"28px",
                background:"linear-gradient(135deg,#f59e0b,#d97706)",
                border:"2.5px solid #fbbf24",borderBottom:"4px solid #92400e",
                boxShadow:"0 6px 24px rgba(245,158,11,0.75)"}}>🏆</div>
            </div>
            <h3 style={{fontWeight:900,textAlign:"center",color:"#fbbf24",fontSize:"15px",margin:0}}>
              אלופת הקריסטלים
            </h3>
            <p style={{color:"#64748b",fontSize:"13px",textAlign:"center",marginTop:"-8px"}}>
              התקדמות כוללת
            </p>
            <div>
              <div style={{height:"18px",background:"rgba(0,0,0,0.6)",borderRadius:"999px",
                border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden"}}>
                <div style={{height:"100%",width:`${overallProgress}%`,
                  background:"linear-gradient(to left,#4ade80,#16a34a)",borderRadius:"999px",
                  boxShadow:"0 0 14px rgba(74,222,128,0.8)",transition:"width 0.6s ease"}}/>
              </div>
              <p style={{fontWeight:900,fontSize:"32px",textAlign:"center",marginTop:"8px",color:"#4ade80"}}>
                {overallProgress}%
              </p>
            </div>
            <Link href="/child/heroes" style={{
              fontSize:"14px",padding:"12px 16px",textAlign:"center",display:"block",
              fontWeight:900,textDecoration:"none",marginTop:"auto",
              background:"linear-gradient(180deg,#fbbf24 0%,#f59e0b 50%,#d97706 100%)",
              borderRadius:"14px",border:"2px solid #fbbf24",borderBottom:"5px solid #92400e",
              boxShadow:"0 6px 20px rgba(245,158,11,0.6)",color:"#1c1917",
              transition:"all 0.15s ease",
            }}>
              👑 הגש הישגים
            </Link>
          </div>
        </aside>
      </div>

      {/* ══════════════ WORLD CARDS ══════════════ */}
      <div style={{position:"relative",zIndex:20,padding:"4px 16px 16px"}}>

        {/* Divider */}
        <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"14px"}}>
          <div style={{flex:1,height:"1.5px",background:"linear-gradient(to left,transparent,rgba(196,154,58,0.9),transparent)"}}/>
          <p style={{fontWeight:900,fontSize:"13px",whiteSpace:"nowrap",
            padding:"6px 18px",borderRadius:"999px",color:"#fbbf24",
            background:"rgba(160,110,20,0.22)",border:"1px solid rgba(196,154,58,0.55)",
            boxShadow:"0 0 18px rgba(196,154,58,0.25)"}}>
            ← הדרך שלך להצלחה →
          </p>
          <div style={{flex:1,height:"1.5px",background:"linear-gradient(to right,transparent,rgba(196,154,58,0.9),transparent)"}}/>
        </div>

        {worlds.length > 0 ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px"}}>
            {worlds.slice(0,4).map((w,idx)=>{
              const cs   = WCFG[idx] ?? WCFG[0];
              const lock = !w.is_unlocked;
              const done = Math.round(w.progress_percent*20/100);
              return (
                <div key={w.world_id} style={{
                  position:"relative",borderRadius:"24px",padding:"18px",
                  display:"flex",flexDirection:"column",gap:"10px",
                  background:`linear-gradient(155deg,${cs.gFrom} 0%,${cs.gTo} 100%)`,
                  border:`2.5px solid ${cs.bdr}`,borderBottom:`5px solid ${cs.bot}`,
                  boxShadow:lock?"0 4px 16px rgba(0,0,0,0.65)":`0 14px 34px ${cs.glow},0 4px 0 ${cs.bot}`,
                  minHeight:"180px",opacity:lock?0.52:1,
                  transition:"transform 0.15s ease",cursor:lock?"default":"pointer",
                }}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                    <span style={{fontSize:"48px",lineHeight:1,
                      filter:lock?"grayscale(1)":"drop-shadow(0 3px 12px rgba(0,0,0,0.7))"}}>
                      {lock ? "🔒" : cs.icon}
                    </span>
                    <span style={{color:"#facc15",fontSize:"18px"}}>⭐</span>
                  </div>
                  <p style={{fontWeight:900,fontSize:"15px",lineHeight:1.3,margin:0,
                    color:lock?"#4a5568":"#fff",textShadow:lock?"none":"0 1px 8px rgba(0,0,0,0.85)"}}>
                    {w.name_he || cs.fallbackName}
                  </p>
                  {!lock && (
                    <p style={{color:"rgba(226,232,240,0.85)",fontSize:"12px",lineHeight:1.4,margin:0}}>
                      {w.description_he || cs.fallbackDesc}
                    </p>
                  )}
                  {!lock && !w.is_completed && (
                    <div style={{marginTop:"auto",display:"flex",flexDirection:"column",gap:"6px"}}>
                      <div style={{height:"10px",background:"rgba(0,0,0,0.5)",borderRadius:"999px",
                        border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${w.progress_percent}%`,
                          background:"linear-gradient(to left,#4ade80,#16a34a)",borderRadius:"999px",
                          boxShadow:"0 0 8px rgba(74,222,128,0.7)"}}/>
                      </div>
                      <p style={{color:"#e2e8f0",fontSize:"13px",fontWeight:700,margin:0}}>
                        🔵 {done} / 20
                      </p>
                    </div>
                  )}
                  {lock && (
                    <p style={{marginTop:"auto",color:"#4a5568",fontSize:"13px",margin:"auto 0 0"}}>
                      ⭐ {w.required_stars} לפתיחה
                    </p>
                  )}
                  {w.is_completed && (
                    <p style={{marginTop:"auto",fontWeight:900,color:"#4ade80",fontSize:"13px",margin:"auto 0 0"}}>
                      ✅ הושלם!
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{color:"#475569",fontSize:"14px",textAlign:"center",padding:"32px 0"}}>טוען עולמות...</p>
        )}
      </div>

      {/* ══════════════ FOOTER ══════════════ */}
      <footer style={{
        position:"relative",zIndex:20,display:"flex",alignItems:"center",
        justifyContent:"space-between",padding:"4px 16px 20px",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <span style={{fontSize:"48px",lineHeight:1}}>🐉</span>
          <p style={{fontWeight:600,color:"rgba(249,168,212,0.95)",fontSize:"13px",maxWidth:"220px",lineHeight:1.4}}>
            ♥ התרגול היומי עוד לך לזכור יותר ולנצח כל אתגר!
          </p>
        </div>
        <nav style={{display:"flex",gap:"12px"}}>
          {([["🏪","חנות"],["📊","דירוג"],["🏆","הישגים"],["⚙️","הגדרות"]] as [string,string][]).map(([icon,label])=>(
            <button key={label} style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",
              background:"none",border:"none",cursor:"pointer",transition:"transform 0.15s ease",
            }}>
              <div style={{width:"52px",height:"52px",borderRadius:"50%",
                display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",
                background:"linear-gradient(160deg,#1e1248,#100832)",
                border:"2px solid rgba(124,58,237,0.55)",
                boxShadow:"0 4px 18px rgba(0,0,0,0.65),inset 0 1px 0 rgba(255,255,255,0.08)"}}>
                {icon}
              </div>
              <span style={{color:"#94a3b8",fontSize:"11px",fontWeight:600}}>{label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </main>
  );
}

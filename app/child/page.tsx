// ══════════════════════════════════════════════════════════
// Child dashboard — Crystal Champions Hub Screen
// Target: full illustrated fantasy hub, exact design match
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

// ── Hero image resolution (server-safe) ──────────────────
const BOY_IMGS = [
  "/heroes/boy-0.png","/heroes/boy-1.png","/heroes/boy-2.png",
  "/heroes/boy-3.png","/heroes/boy-4.png","/heroes/boy-5.png",
  "/heroes/boy-6.png","/heroes/boy-7.png","/heroes/boy-8.png",
  "/heroes/boy-9.png","/heroes/boy-10.png",
];
const GIRL_IMGS = [
  "/heroes/girl-0.png","/heroes/girl-1.png","/heroes/girl-2.png",
  "/heroes/girl-3.png","/heroes/girl-4.png","/heroes/girl-5.png",
  "/heroes/girl-6.png","/heroes/girl-7.png","/heroes/girl-8.png",
  "/heroes/girl-9.png",
];
const GILAD_IMGS = Array.from({length:16},(_,i)=>
  `/heroes/gilad/gilad_v2_${String(i+1).padStart(2,"0")}.png`);
const BOY_T:Record<string,number>={default:0,storm:0,gold:1,nature:2,teal:2,fire:3,dragon:3,lava:3,thunder:4,yellow:4,ice:5,crystal:6,shadow:6,pink:6,stone:6,ocean:8,star:9,galaxy:9,cosmic:9};
const GIRL_T:Record<string,number>={default:0,storm:0,ice:1,crystal:2,nature:3,teal:3,fire:4,dragon:4,pink:4,thunder:5,yellow:5,gold:6,sun:6,star:7,cosmic:7,shadow:9,ocean:9};
function heroSrc(g:"M"|"F",t:string){
  if(t==="stone"||t==="gilad")return GILAD_IMGS[0];
  const imgs=g==="M"?BOY_IMGS:GIRL_IMGS;
  return imgs[(g==="M"?BOY_T:GIRL_T)[t]??0];
}

// ── World card config (5 worlds) ──────────────────────────
const WORLDS_CFG=[
  {name:"מבוא למסע",    desc:"הצעד הראשון של כל אלוף",  creature:"💗", creatureBg:"#ff6eb4", cardBg:"linear-gradient(135deg,#5a1060 0%,#8a2090 100%)",bdr:"#c060e0",glow:"rgba(190,80,220,0.5)"},
  {name:"שביל האש",     desc:"כבוש את להבות האומץ",      creature:"🔥", creatureBg:"#ff4400", cardBg:"linear-gradient(135deg,#5a1500 0%,#8a2800 100%)",bdr:"#e06020",glow:"rgba(220,100,30,0.5)"},
  {name:"יער הקריסטלים",desc:"גלת את סודות הטבע",        creature:"🌲", creatureBg:"#00aa44", cardBg:"linear-gradient(135deg,#053020 0%,#0a5030 100%)",bdr:"#20c060",glow:"rgba(30,180,80,0.5)"},
  {name:"מצודת הברק",   desc:"עבור את מבחן החוכמה",      creature:"⚡", creatureBg:"#2244aa", cardBg:"linear-gradient(135deg,#0a1540 0%,#142268 100%)",bdr:"#4080e0",glow:"rgba(60,120,220,0.5)"},
  {name:"היכל האלופים", desc:"מקום לאגדות בלבד",          creature:"🏆", creatureBg:"#886600", cardBg:"linear-gradient(135deg,#2a1a00 0%,#483200 100%)",bdr:"#d4a020",glow:"rgba(200,150,20,0.5)"},
];

export default async function ChildPage() {
  await requireRole("child");
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if(!user) return null;

  const {profile,hero,activeAdventure,worlds,energyMax} = await getChildDashboardData();

  if(!profile){
    return(
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">מגדיר את הפרופיל שלך...</p>
      </main>
    );
  }

  const hasAdventure = !!activeAdventure;
  const adventureType= (activeAdventure?.mission_type??"hero_training") as MissionType;
  const heroType     = hero?.color_theme??"default";
  const heroName     = hero?.name_he??"הגיבור שלך";
  const heroGender   = (hero?.gender??"M") as "M"|"F";
  const gradeLabel   = profile.grade_level?(GRADE_LABELS[profile.grade_level]??""):"";
  const arenaThreat  = activeAdventure?mapStrategyToArenaThreat(activeAdventure.selection_strategy):null;
  const missionName  = activeAdventure?.story_text_he
    ? (activeAdventure.story_text_he.length>30 ? activeAdventure.story_text_he.slice(0,30)+"…" : activeAdventure.story_text_he)
    : "אימון גיבורים";
  const speechText   = hasAdventure && activeAdventure.story_text_he
    ? activeAdventure.story_text_he
    : "הגיבור שלך מוכן לנצח, לך לזירה, צבר ניצחונות – ככה אתה צומח";
  const imgSrc = heroSrc(heroGender, heroType);

  // Merge DB worlds with config (up to 5)
  const displayWorlds = WORLDS_CFG.map((cfg,i)=>{
    const dbW = worlds[i];
    return {
      cfg,
      name:     dbW?.name_he     || cfg.name,
      desc:     dbW?.description_he || cfg.desc,
      locked:   dbW ? !dbW.is_unlocked : i>2,
      done:     dbW ? Math.round(dbW.progress_percent*10/100) : 0,
      total:    10,
      progress: dbW?.progress_percent ?? 0,
      completed:dbW?.is_completed ?? false,
      reqStars: dbW?.required_stars ?? (i*20+20),
    };
  });

  return (
    <main dir="rtl" style={{
      position:"relative",minHeight:"100vh",display:"flex",flexDirection:"column",
      overflow:"hidden",fontFamily:"var(--font-sans)",background:"#0c0128",
    }}>

      {/* ══════════════════════════════════════════
          ILLUSTRATED FANTASY BACKGROUND
      ══════════════════════════════════════════ */}
      <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}>

        {/* Base sky */}
        <div style={{position:"absolute",inset:0,background:
          "linear-gradient(135deg,#1a0438 0%,#280868 20%,#1e0655 45%,#0e0230 70%,#080118 100%)"}}/>

        {/* Warm orange-pink sunrise glow — left side */}
        <div style={{position:"absolute",inset:0,background:`
          radial-gradient(ellipse 65% 85% at 12% 68%,rgba(255,100,20,0.75) 0%,rgba(220,60,140,0.55) 30%,transparent 65%),
          radial-gradient(ellipse 50% 60% at 22% 50%,rgba(200,60,160,0.5) 0%,rgba(120,20,180,0.35) 40%,transparent 65%),
          radial-gradient(ellipse 40% 50% at 5% 40%,rgba(255,120,40,0.4) 0%,transparent 55%)
        `}}/>

        {/* Deep purple center + dark right */}
        <div style={{position:"absolute",inset:0,background:`
          radial-gradient(ellipse 60% 70% at 55% 40%,rgba(80,20,200,0.45) 0%,transparent 65%),
          radial-gradient(ellipse 45% 60% at 88% 35%,rgba(10,5,60,0.7) 0%,transparent 65%)
        `}}/>

        {/* Stars */}
        {Array.from({length:100}).map((_,i)=>{
          const sz=1+(i%3); const x=((i*137+17)%96)+2; const y=((i*79+31)%55)+1;
          return <div key={i} style={{
            position:"absolute",borderRadius:"50%",background:"white",
            width:sz,height:sz,left:`${x}%`,top:`${y}%`,
            opacity:0.15+(i%8)*0.1,
            boxShadow:sz>1?`0 0 ${sz*2}px rgba(220,210,255,0.5)`:undefined,
          }}/>;
        })}
        {/* Bright stars */}
        {[{x:62,y:4,r:3.5},{x:75,y:8,r:3},{x:88,y:3,r:4},{x:50,y:6,r:2.5},
          {x:40,y:2,r:2},{x:92,y:12,r:2.5},{x:68,y:14,r:2}].map((s,i)=>(
          <div key={i} style={{position:"absolute",borderRadius:"50%",background:"white",
            width:s.r*2,height:s.r*2,left:`${s.x}%`,top:`${s.y}%`,opacity:1,
            boxShadow:`0 0 ${s.r*5}px ${s.r*2.5}px rgba(220,200,255,0.6),0 0 ${s.r*10}px rgba(180,140,255,0.35)`}}/>
        ))}

        {/* MOON — upper right */}
        <div style={{position:"absolute",right:"8%",top:"4%",width:"120px",height:"120px",
          borderRadius:"50%",
          background:"radial-gradient(circle at 40% 35%,rgba(255,255,255,0.95) 0%,rgba(220,230,255,0.85) 40%,rgba(180,190,240,0.6) 70%,rgba(140,150,220,0.3) 100%)",
          boxShadow:"0 0 40px 20px rgba(200,210,255,0.3),0 0 80px rgba(180,190,255,0.15)",
        }}/>
        {/* Moon craters */}
        <div style={{position:"absolute",right:"12%",top:"7%",width:"22px",height:"22px",
          borderRadius:"50%",background:"rgba(160,170,220,0.4)"}}/>
        <div style={{position:"absolute",right:"9%",top:"10%",width:"14px",height:"14px",
          borderRadius:"50%",background:"rgba(160,170,220,0.35)"}}/>

        {/* ── FLOATING ISLANDS – left area ── */}
        {/* Island 1 */}
        <div style={{position:"absolute",left:"8%",top:"6%",width:"180px",height:"80px"}}>
          <div style={{width:"100%",height:"50px",
            background:"linear-gradient(160deg,#6040a0 0%,#2a1860 100%)",
            borderRadius:"50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow:"0 8px 30px rgba(100,50,220,0.6),0 14px 40px rgba(0,0,0,0.7)"}}/>
          <div style={{width:"72%",marginLeft:"14%",height:"30px",marginTop:"-7px",
            background:"linear-gradient(160deg,#2a6030 0%,#143018 100%)",
            borderRadius:"0 0 50% 50%",boxShadow:"0 10px 22px rgba(0,0,0,0.7)"}}/>
          {/* Tiny castle on island */}
          <div style={{position:"absolute",top:"-30px",left:"55%",width:"40px",height:"40px"}}>
            <svg viewBox="0 0 40 40" width="40" height="40">
              <rect x="8" y="20" width="24" height="20" fill="#4a2e80"/>
              <rect x="4" y="12" width="10" height="28" fill="#3a2060"/>
              <rect x="26" y="12" width="10" height="28" fill="#3a2060"/>
              <polygon points="9,12 4,12 4,6 9,12" fill="#2a1850"/>
              <polygon points="31,12 36,12 36,6 31,12" fill="#2a1850"/>
              <polygon points="20,12 14,12 14,4 20,12" fill="#2a1850"/>
              <rect x="16" y="26" width="8" height="14" fill="#0a0418"/>
              <ellipse cx="9" cy="12" rx="4" ry="4" fill="#6040a0"/>
              <ellipse cx="31" cy="12" rx="4" ry="4" fill="#5030a0"/>
            </svg>
          </div>
          {/* Crystals on island */}
          {[{x:10,c:"#a855f7"},{x:28,c:"#e879f9"},{x:70,c:"#38bdf8"}].map((cr,j)=>(
            <div key={j} className="particle" style={{
              position:"absolute",left:`${cr.x}%`,top:"-22px",width:"10px",height:"20px",
              background:`linear-gradient(160deg,white 0%,${cr.c} 55%)`,
              clipPath:"polygon(50% 0%,100% 35%,75% 100%,25% 100%,0% 35%)",
              filter:`drop-shadow(0 0 7px ${cr.c})`,animationDuration:`${4+j}s`,
            }}/>
          ))}
        </div>
        {/* Island 2 – smaller, higher */}
        <div style={{position:"absolute",left:"28%",top:"2%",width:"120px",height:"60px"}}>
          <div style={{width:"100%",height:"36px",
            background:"linear-gradient(160deg,#5030a0 0%,#281458 100%)",
            borderRadius:"50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow:"0 6px 20px rgba(80,40,200,0.55)"}}/>
          <div style={{width:"70%",marginLeft:"15%",height:"22px",marginTop:"-5px",
            background:"linear-gradient(160deg,#225028 0%,#0e2814 100%)",borderRadius:"0 0 50% 50%"}}/>
          {[{x:35,c:"#c084fc"},{x:65,c:"#f59e0b"}].map((cr,j)=>(
            <div key={j} className="particle" style={{
              position:"absolute",left:`${cr.x}%`,top:"-16px",width:"8px",height:"16px",
              background:`linear-gradient(160deg,white 0%,${cr.c} 55%)`,
              clipPath:"polygon(50% 0%,100% 35%,75% 100%,25% 100%,0% 35%)",
              filter:`drop-shadow(0 0 6px ${cr.c})`,animationDuration:`${5+j}s`,
            }}/>
          ))}
        </div>

        {/* ── LARGE CRYSTAL FORMATIONS – left side ── */}
        {/* Main left cluster */}
        <div style={{position:"absolute",left:"-1%",top:"18%",display:"flex",gap:"4px",alignItems:"flex-end"}}>
          {[
            {h:140,w:32,c:"#c084fc",dur:"5.2s"},
            {h:200,w:44,c:"#a855f7",dur:"6.1s",del:"0.5s"},
            {h:110,w:26,c:"#e879f9",dur:"4.8s",del:"1.1s"},
            {h:160,w:36,c:"#7c3aed",dur:"5.8s",del:"0.3s"},
            {h:90, w:22,c:"#d946ef",dur:"5.4s",del:"0.8s"},
          ].map((c,i)=>(
            <div key={i} className="particle" style={{
              width:`${c.w}px`,height:`${c.h}px`,
              background:`linear-gradient(180deg,rgba(255,255,255,0.95) 0%,${c.c} 35%,${c.c}bb 100%)`,
              clipPath:"polygon(50% 0%,100% 28%,82% 100%,18% 100%,0% 28%)",
              filter:`drop-shadow(0 0 12px ${c.c}) drop-shadow(0 0 24px ${c.c}88)`,
              animationDuration:c.dur,animationDelay:(c as {del?:string}).del??"0s",
            }}/>
          ))}
        </div>
        {/* Second crystal cluster left-center */}
        <div style={{position:"absolute",left:"10%",top:"32%",display:"flex",gap:"3px",alignItems:"flex-end"}}>
          {[
            {h:80,w:20,c:"#a855f7",dur:"4.9s",del:"0.6s"},
            {h:120,w:28,c:"#38bdf8",dur:"5.7s"},
            {h:65,w:18,c:"#c084fc",dur:"4.5s",del:"1.4s"},
          ].map((c,i)=>(
            <div key={i} className="particle" style={{
              width:`${c.w}px`,height:`${c.h}px`,
              background:`linear-gradient(180deg,rgba(255,255,255,0.95) 0%,${c.c} 35%,${c.c}bb 100%)`,
              clipPath:"polygon(50% 0%,100% 28%,82% 100%,18% 100%,0% 28%)",
              filter:`drop-shadow(0 0 10px ${c.c}) drop-shadow(0 0 20px ${c.c}66)`,
              animationDuration:c.dur,animationDelay:(c as {del?:string}).del??"0s",
            }}/>
          ))}
        </div>

        {/* ── LARGE CASTLE – right side ── */}
        <div style={{position:"absolute",right:"-2%",top:"5%",width:"380px",height:"540px"}}>
          <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
            width:"400px",height:"300px",
            background:"radial-gradient(ellipse,rgba(80,140,255,0.3) 0%,rgba(40,60,200,0.15) 55%,transparent 80%)",
            filter:"blur(30px)"}}/>
          <svg viewBox="0 0 380 540" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cwall" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4a5898"/><stop offset="100%" stopColor="#1e2448"/>
              </linearGradient>
              <linearGradient id="ctow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#5868b0"/><stop offset="100%" stopColor="#242c60"/>
              </linearGradient>
              <linearGradient id="croof" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6878c8"/><stop offset="100%" stopColor="#303878"/>
              </linearGradient>
              <linearGradient id="waterfall" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(100,180,255,0.8)"/>
                <stop offset="100%" stopColor="rgba(60,140,220,0.3)"/>
              </linearGradient>
            </defs>
            {/* Wall */}
            <rect x="50" y="300" width="280" height="240" fill="url(#cwall)"/>
            {/* Battlements */}
            {[56,76,96,116,148,178,208,238,268,288,308].map((x,i)=>(
              <rect key={i} x={x} y={285} width={14} height={22} fill="url(#cwall)" rx={2}/>
            ))}
            {/* Gate */}
            <rect x="145" y="378" width="90" height="162" fill="#040110"/>
            <ellipse cx="190" cy="378" rx="45" ry="30" fill="#040110"/>
            {/* Gate glow */}
            <ellipse cx="190" cy="408" rx="36" ry="42" fill="rgba(255,160,30,0.15)"/>
            {/* Left tower */}
            <rect x="25" y="200" width="75" height="340" fill="url(#ctow)"/>
            {[25,44,60,74].map((x,i)=><rect key={i} x={x} y={184} width={14} height={22} fill="url(#ctow)" rx={2}/>)}
            <polygon points="62,90 25,200 100,200" fill="url(#croof)"/>
            <line x1="62" y1="90" x2="62" y2="30" stroke="#a0b0ff" strokeWidth="2.5"/>
            <polygon points="62,30 88,46 62,62" fill="#6878d0"/>
            {/* Center-left tower */}
            <rect x="108" y="170" width="60" height="370" fill="url(#ctow)"/>
            {[108,124,140,154].map((x,i)=><rect key={i} x={x} y={154} width={13} height={20} fill="url(#ctow)" rx={2}/>)}
            <polygon points="138,68 108,170 168,170" fill="url(#croof)"/>
            <line x1="138" y1="68" x2="138" y2="12" stroke="#c0d0ff" strokeWidth="2"/>
            <polygon points="138,12 160,26 138,42" fill="#7888e0"/>
            {/* Main center tower – tallest */}
            <rect x="162" y="120" width="56" height="420" fill="url(#ctow)"/>
            {[162,178,194,208].map((x,i)=><rect key={i} x={x} y={102} width={13} height={24} fill="url(#ctow)" rx={2}/>)}
            <polygon points="190,10 162,120 218,120" fill="url(#croof)"/>
            <line x1="190" y1="10" x2="190" y2="-24" stroke="#e0d0ff" strokeWidth="3"/>
            <polygon points="190,-24 216,-8 190,10" fill="#c0b0f0"/>
            {/* Right tower */}
            <rect x="260" y="160" width="70" height="380" fill="url(#ctow)"/>
            {[260,278,295,312].map((x,i)=><rect key={i} x={x} y={142} width={14} height={22} fill="url(#ctow)" rx={2}/>)}
            <polygon points="295,54 260,160 330,160" fill="url(#croof)"/>
            <line x1="295" y1="54" x2="295" y2="-4" stroke="#a0b0ff" strokeWidth="2.5"/>
            <polygon points="295,-4 322,12 295,30" fill="#7888d8"/>
            {/* Far right spire */}
            <rect x="330" y="210" width="44" height="330" fill="url(#ctow)"/>
            {[330,344,358].map((x,i)=><rect key={i} x={x} y={194} width={12} height={20} fill="url(#ctow)" rx={2}/>)}
            <polygon points="352,104 330,210 374,210" fill="url(#croof)"/>
            <line x1="352" y1="104" x2="352" y2="54" stroke="#8898e0" strokeWidth="2"/>
            <polygon points="352,54 372,68 352,82" fill="#6878c0"/>
            {/* Windows – glowing amber */}
            <ellipse cx="62" cy="248" rx="9" ry="12" fill="#ff9020" opacity="0.9"/>
            <ellipse cx="62" cy="275" rx="7" ry="9" fill="#ffb040" opacity="0.65"/>
            <ellipse cx="138" cy="222" rx="9" ry="11" fill="#ff9020" opacity="0.9"/>
            <ellipse cx="190" cy="168" rx="10" ry="14" fill="#ff9020" opacity="0.95"/>
            <ellipse cx="190" cy="210" rx="8" ry="10" fill="#ffb040" opacity="0.7"/>
            <ellipse cx="190" cy="270" rx="9" ry="12" fill="#ff8000" opacity="0.8"/>
            <ellipse cx="295" cy="210" rx="9" ry="12" fill="#ff9020" opacity="0.9"/>
            <ellipse cx="295" cy="242" rx="7" ry="9" fill="#ffb040" opacity="0.65"/>
            <ellipse cx="352" cy="258" rx="7" ry="9" fill="#ff9020" opacity="0.8"/>
            <ellipse cx="114" cy="340" rx="8" ry="11" fill="#ff9020" opacity="0.72"/>
            <ellipse cx="270" cy="340" rx="8" ry="11" fill="#ff9020" opacity="0.72"/>
            {/* Stone lines */}
            {[316,342,368,394,420,446,470,494,518].map((y,i)=>(
              <line key={i} x1="50" y1={y} x2="330" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            ))}
            {/* Waterfall */}
            <rect x="330" y="380" width="20" height="160" fill="url(#waterfall)" opacity="0.7"/>
            <ellipse cx="340" cy="540" rx="25" ry="10" fill="rgba(100,180,255,0.4)"/>
            {/* Path stones */}
            {[1,2,3,4].map(i=>(
              <ellipse key={i} cx={190-i*35} cy={530+i*2} rx={18+i*3} ry={6} fill="rgba(80,100,180,0.35)" opacity={0.6}/>
            ))}
            {/* Lanterns */}
            {[130,160,190,220,250].map((x,i)=>(
              <g key={i}>
                <rect x={x-1} y={495-(i%2)*15} width={2} height={25+(i%2)*15} fill="#6070a0" opacity="0.7"/>
                <ellipse cx={x} cy={495-(i%2)*15} rx={4} ry={4} fill="#f59e0b" opacity="0.95"/>
                <ellipse cx={x} cy={495-(i%2)*15} rx={10} ry={7} fill="rgba(245,158,11,0.2)"/>
              </g>
            ))}
            {/* Ground */}
            <ellipse cx="190" cy="540" rx="180" ry="22" fill="rgba(60,80,180,0.3)"/>
          </svg>
          {/* Castle glow */}
          <div style={{position:"absolute",bottom:"4px",left:"50%",transform:"translateX(-50%)",
            width:"360px",height:"120px",
            background:"radial-gradient(ellipse,rgba(80,140,255,0.5) 0%,transparent 75%)",
            filter:"blur(22px)"}}/>
        </div>

        {/* Right side crystals */}
        <div style={{position:"absolute",right:"1%",top:"48%",display:"flex",gap:"4px",alignItems:"flex-end"}}>
          {[{h:70,w:18,c:"#a855f7",dur:"5s"},{h:100,w:24,c:"#7c3aed",dur:"5.8s",del:"0.5s"},
            {h:55,w:15,c:"#e879f9",dur:"4.4s",del:"1s"}].map((c,i)=>(
            <div key={i} className="particle" style={{
              width:`${c.w}px`,height:`${c.h}px`,
              background:`linear-gradient(180deg,rgba(255,255,255,0.95) 0%,${c.c} 38%,${c.c}bb 100%)`,
              clipPath:"polygon(50% 0%,100% 28%,82% 100%,18% 100%,0% 28%)",
              filter:`drop-shadow(0 0 9px ${c.c}) drop-shadow(0 0 18px ${c.c}66)`,
              animationDuration:c.dur,animationDelay:(c as {del?:string}).del??"0s",
            }}/>
          ))}
        </div>

        {/* Ground gradient */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"220px",
          background:"linear-gradient(to top,rgba(8,2,24,0.95) 0%,rgba(20,6,60,0.5) 55%,transparent 100%)"}}/>

        {/* Sparkles */}
        {[{x:"32%",y:"28%",c:"#c084fc",s:5},{x:"44%",y:"9%",c:"#38bdf8",s:4},
          {x:"58%",y:"20%",c:"#f59e0b",s:5},{x:"38%",y:"44%",c:"#e879f9",s:4},
          {x:"72%",y:"32%",c:"#7c3aed",s:6},{x:"18%",y:"52%",c:"#a855f7",s:5},
        ].map((p,i)=>(
          <div key={i} className="particle" style={{
            position:"absolute",left:p.x,top:p.y,
            width:`${p.s*2}px`,height:`${p.s*2}px`,borderRadius:"50%",background:p.c,
            boxShadow:`0 0 ${p.s*3}px ${p.s}px ${p.c}88`,
            animationDuration:`${3+i*0.6}s`,animationDelay:`${i*0.35}s`,
          }}/>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TOP BAR — exact design match
      ══════════════════════════════════════════ */}
      <header style={{
        position:"relative",zIndex:30,display:"flex",alignItems:"center",
        gap:"10px",padding:"10px 16px",flexWrap:"nowrap",
      }}>

        {/* LOGO */}
        <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0,marginLeft:"4px"}}>
          <div style={{width:"44px",height:"44px",position:"relative",flexShrink:0}}>
            <svg viewBox="0 0 44 44" width="44" height="44">
              <polygon points="22,2 30,14 44,14 34,24 38,38 22,30 6,38 10,24 0,14 14,14" fill="#c084fc" opacity="0.3"/>
              <polygon points="22,6 28,16 40,16 32,22 36,34 22,27 8,34 12,22 4,16 16,16" fill="#a855f7"/>
              <polygon points="22,10 26,18 34,18 28,22 30,30 22,25 14,30 16,22 10,18 18,18" fill="#e9d5ff"/>
              <polygon points="22,14 24,19 30,19 26,22 27,28 22,24 17,28 18,22 14,19 20,19" fill="white"/>
              <circle cx="22" cy="4" r="3" fill="#fbbf24"/>
            </svg>
          </div>
          <div>
            <p style={{color:"#fbbf24",fontWeight:900,fontSize:"15px",lineHeight:1,letterSpacing:"-0.02em"}}>קריסטל</p>
            <p style={{color:"#e9d5ff",fontWeight:900,fontSize:"13px",lineHeight:1,letterSpacing:"-0.02em"}}>צ׳אמפיון</p>
          </div>
        </div>

        {/* Rankings button */}
        <button style={{
          display:"flex",alignItems:"center",gap:"6px",flexShrink:0,
          background:"rgba(20,10,50,0.75)",border:"1.5px solid rgba(150,100,220,0.5)",
          borderRadius:"20px",padding:"7px 14px",color:"#e2d9f3",fontWeight:700,
          fontSize:"13px",cursor:"pointer",backdropFilter:"blur(8px)",
          boxShadow:"0 4px 14px rgba(0,0,0,0.5)",
        }}>
          <span>🏆</span> דירוגים
        </button>

        <div style={{flex:1}}/>

        {/* MANA – "כוח קריסטל" */}
        <div style={{display:"flex",alignItems:"center",gap:"7px",flexShrink:0,
          background:"linear-gradient(160deg,#0a1e38,#050e1c)",
          border:"1.5px solid rgba(80,160,255,0.6)",borderBottom:"2.5px solid rgba(30,80,180,0.8)",
          borderRadius:"20px",padding:"6px 14px",
          boxShadow:"0 4px 14px rgba(0,0,0,0.6),0 0 20px rgba(60,120,255,0.15)"}}>
          <span style={{color:"#a5d4ff",fontSize:"12px",fontWeight:900,whiteSpace:"nowrap"}}>כוח קריסטל</span>
          <div style={{display:"flex",gap:"3px",alignItems:"center"}}>
            {Array.from({length:energyMax}).map((_,i)=>(
              <div key={i} style={{
                width:"14px",height:"14px",
                clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                background:i<profile.energy
                  ?"linear-gradient(180deg,rgba(255,255,255,0.95) 0%,#38bdf8 40%,#0891b2 100%)"
                  :"rgba(30,50,100,0.6)",
                filter:i<profile.energy?"drop-shadow(0 0 4px rgba(56,189,248,0.9))":"none",
              }}/>
            ))}
            {/* Last slot – dark diamond */}
            <div style={{width:"14px",height:"14px",transform:"rotate(45deg)",
              background:"rgba(10,20,50,0.9)",border:"1.5px solid rgba(80,120,200,0.4)",marginRight:"2px"}}/>
          </div>
          <span style={{color:"#67e8f9",fontSize:"16px"}}>⚡</span>
        </div>

        {/* XP */}
        <div style={{display:"flex",alignItems:"center",gap:"7px",flexShrink:0,
          background:"linear-gradient(160deg,#1a0845,#0e0528)",
          border:"1.5px solid rgba(139,92,246,0.6)",borderBottom:"2.5px solid rgba(76,29,149,0.8)",
          borderRadius:"20px",padding:"6px 14px",
          boxShadow:"0 4px 14px rgba(0,0,0,0.6)"}}>
          <span style={{color:"#ede9fe",fontWeight:900,fontSize:"14px",whiteSpace:"nowrap"}}>
            XP {profile.total_xp.toLocaleString("he-IL")}
          </span>
          <span style={{color:"#fbbf24",fontSize:"16px"}}>⭐</span>
        </div>

        {/* Stars */}
        <div style={{display:"flex",alignItems:"center",gap:"7px",flexShrink:0,
          background:"linear-gradient(160deg,#2a1800,#150c00)",
          border:"1.5px solid rgba(202,138,4,0.6)",borderBottom:"2.5px solid rgba(120,80,0,0.8)",
          borderRadius:"20px",padding:"6px 14px",boxShadow:"0 4px 14px rgba(0,0,0,0.6)"}}>
          <span style={{color:"#fef3c7",fontWeight:900,fontSize:"14px"}}>{profile.total_stars.toLocaleString("he-IL")}</span>
          <span style={{color:"#fbbf24",fontSize:"16px"}}>⭐</span>
        </div>

        {/* Coins */}
        <div style={{display:"flex",alignItems:"center",gap:"7px",flexShrink:0,
          background:"linear-gradient(160deg,#1c1000,#0e0800)",
          border:"1.5px solid rgba(180,120,0,0.6)",borderBottom:"2.5px solid rgba(100,60,0,0.8)",
          borderRadius:"20px",padding:"6px 14px",boxShadow:"0 4px 14px rgba(0,0,0,0.6)"}}>
          <span style={{color:"#fef3c7",fontWeight:900,fontSize:"14px"}}>{profile.total_coins.toLocaleString("he-IL")}</span>
          <span style={{fontSize:"16px"}}>🪙</span>
        </div>

        <div style={{width:"8px"}}/>

        {/* Icon buttons */}
        {[["📜","חדשות"],["🎁","מתנות"],["⚙️","הגדרות"]].map(([icon,lbl],i)=>(
          <button key={lbl} style={{position:"relative",width:"40px",height:"40px",borderRadius:"50%",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",
            background:"rgba(20,10,50,0.7)",border:"1.5px solid rgba(120,80,200,0.45)",
            cursor:"pointer",boxShadow:"0 4px 12px rgba(0,0,0,0.5)",flexShrink:0}}>
            {icon}
            {i===1 && <div style={{position:"absolute",top:"-2px",right:"-2px",width:"10px",height:"10px",
              borderRadius:"50%",background:"#ef4444",border:"1.5px solid #0e0528"}}/>}
          </button>
        ))}

        {/* User avatar */}
        <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0,marginRight:"4px"}}>
          <div style={{textAlign:"right"}}>
            <p style={{color:"white",fontWeight:700,fontSize:"14px",lineHeight:1}}>{profile.display_name_he}</p>
            {gradeLabel && <p style={{color:"#c4b5fd",fontSize:"11px",lineHeight:1,marginTop:"2px"}}>{gradeLabel}</p>}
          </div>
          <div style={{position:"relative",width:"44px",height:"44px",borderRadius:"50%",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"20px",fontWeight:900,color:"white",overflow:"hidden",
            background:"linear-gradient(135deg,#5c20c0,#3810a0)",
            border:"2.5px solid #a78bfa",boxShadow:"0 0 20px rgba(124,58,237,0.8)"}}>
            {profile.display_name_he.charAt(0)}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          HERO AREA — center, full width
      ══════════════════════════════════════════ */}
      <div style={{
        position:"relative",zIndex:20,display:"flex",flexDirection:"column",
        alignItems:"center",flex:1,padding:"0 0 8px",minHeight:0,
      }}>

        {/* Mission subtitle + name */}
        <div style={{textAlign:"center",marginBottom:"8px"}}>
          <p style={{color:"#c4b5fd",fontSize:"13px",fontWeight:600,margin:0,letterSpacing:"0.02em"}}>
            המרתף המנצחית ⚡
          </p>
          <h1 style={{color:"white",fontSize:"28px",fontWeight:900,margin:"2px 0",
            textShadow:"0 2px 20px rgba(160,100,255,0.6)",letterSpacing:"-0.01em"}}>
            {missionName}
          </h1>
          {hasAdventure ? (
            <p style={{color:"#a78bfa",fontSize:"13px",fontWeight:600,margin:0}}>
              התקדמות מסע ✗
            </p>
          ) : (
            <p style={{color:"#64748b",fontSize:"13px",margin:0}}>⚔️ אין הרפתקה פעילה</p>
          )}
        </div>

        {/* Hero row: speech bubble + hero + companion */}
        <div style={{
          display:"flex",alignItems:"flex-end",justifyContent:"center",
          gap:"0px",position:"relative",width:"100%",maxWidth:"900px",
          flex:"1 1 auto",minHeight:"260px",
        }}>

          {/* SPEECH BUBBLE – left of hero */}
          <div style={{
            position:"absolute",right:"54%",bottom:"120px",
            width:"220px",zIndex:10,
          }}>
            <div style={{
              background:"rgba(255,255,255,0.97)",borderRadius:"20px",
              padding:"16px 18px",
              boxShadow:"0 8px 32px rgba(0,0,0,0.6),0 2px 8px rgba(100,40,200,0.3)",
              border:"2px solid rgba(255,255,255,0.95)",position:"relative",
            }}>
              {/* Gem icon in top-right of bubble */}
              <div style={{position:"absolute",top:"-12px",left:"16px",
                width:"24px",height:"24px",borderRadius:"50%",
                background:"linear-gradient(135deg,#a855f7,#7c3aed)",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 4px 10px rgba(124,58,237,0.6)"}}>
                <span style={{fontSize:"12px"}}>💎</span>
              </div>
              {/* Bubble tail – pointing right toward hero */}
              <div style={{
                position:"absolute",bottom:"30px",left:"-18px",width:0,height:0,
                borderTop:"10px solid transparent",borderBottom:"10px solid transparent",
                borderRight:"20px solid rgba(255,255,255,0.97)",
              }}/>
              <p style={{fontWeight:700,fontSize:"14px",lineHeight:1.5,color:"#2e1065",margin:0}}>
                {speechText.length > 80 ? speechText.slice(0,80)+"…" : speechText}
              </p>
              {/* Sparkles in bubble */}
              <span style={{position:"absolute",top:"8px",right:"10px",fontSize:"12px",opacity:0.6}}>✦</span>
              <span style={{position:"absolute",bottom:"8px",right:"14px",fontSize:"10px",opacity:0.5}}>✦</span>
            </div>
          </div>

          {/* HERO on pedestal */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",zIndex:10}}>

            {/* Wide glow behind hero */}
            <div style={{
              position:"absolute",bottom:"50px",left:"50%",transform:"translateX(-50%)",
              width:"600px",height:"340px",pointerEvents:"none",
              background:"radial-gradient(ellipse,rgba(56,189,248,0.55) 0%,rgba(100,120,255,0.38) 30%,rgba(140,90,255,0.18) 55%,transparent 76%)",
              filter:"blur(30px)",
            }}/>

            {/* Hero image — frameless */}
            <Link href="/child/heroes" style={{
              display:"block",position:"relative",zIndex:10,
              filter:hasAdventure
                ?"drop-shadow(0 0 24px rgba(56,189,248,0.8)) drop-shadow(0 0 48px rgba(56,189,248,0.4))"
                :"drop-shadow(0 0 20px rgba(124,58,237,0.75)) drop-shadow(0 0 40px rgba(124,58,237,0.35))",
            }} className="hero-float">
              <Image
                src={imgSrc}
                alt={heroName}
                width={300}
                height={400}
                style={{width:"260px",height:"360px",objectFit:"contain",objectPosition:"center bottom",display:"block"}}
                unoptimized
                priority
              />
            </Link>

            {/* Dark stone pedestal */}
            <div style={{position:"relative",marginTop:"-20px",zIndex:9}}>
              {/* Pedestal top circle */}
              <div style={{
                width:"280px",height:"28px",
                background:"radial-gradient(ellipse,rgba(56,189,248,0.9) 0%,rgba(30,60,180,0.7) 55%,rgba(10,20,80,0.4) 80%,transparent 100%)",
                borderRadius:"50%",
                boxShadow:"0 0 60px 25px rgba(56,189,248,0.65),0 0 120px rgba(80,120,255,0.3)",
              }}/>
              {/* Platform body */}
              <div style={{
                width:"240px",height:"30px",margin:"-4px auto 0",
                background:"linear-gradient(180deg,#1a2860 0%,#0c1438 100%)",
                borderRadius:"50%",
                boxShadow:"0 8px 24px rgba(0,0,0,0.8),inset 0 2px 0 rgba(80,120,255,0.3)",
              }}/>
              {/* Crystal decorations on pedestal */}
              {[{l:"-30px",c:"#38bdf8",h:28},{l:"-16px",c:"#a855f7",h:20},{r:"-30px",c:"#38bdf8",h:28},{r:"-16px",c:"#c084fc",h:20}].map((cr,i)=>(
                <div key={i} style={{
                  position:"absolute",
                  ...(cr.l?{left:cr.l}:{right:cr.r}),
                  top:"-20px",
                  width:"10px",height:`${cr.h}px`,
                  background:`linear-gradient(180deg,white 0%,${cr.c} 55%)`,
                  clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                  filter:`drop-shadow(0 0 6px ${cr.c})`,
                }}/>
              ))}
            </div>

            {/* Hero name */}
            <p style={{fontWeight:900,fontSize:"18px",color:"white",margin:"10px 0 0",
              textShadow:"0 2px 12px rgba(0,0,0,0.8)"}}>
              {heroName} 🛡️
            </p>
          </div>

          {/* CRYSTAL COMPANION – right of hero */}
          <div style={{
            position:"absolute",left:"54%",bottom:"160px",
            fontSize:"64px",lineHeight:1,zIndex:10,
            filter:"drop-shadow(0 0 16px rgba(56,189,248,0.9)) drop-shadow(0 0 32px rgba(56,189,248,0.5))",
          }} className="particle">
            💎
          </div>

          {/* Pink mascot – lower right of hero */}
          <div style={{
            position:"absolute",left:"58%",bottom:"90px",
            fontSize:"48px",lineHeight:1,zIndex:10,
            filter:"drop-shadow(0 0 12px rgba(240,100,200,0.8))",
          }} className="particle">
            🌸
          </div>
        </div>

        {/* CTA BUTTON */}
        <div style={{width:"100%",maxWidth:"600px",padding:"0 16px",marginTop:"16px"}}>
          {hasAdventure ? (
            <Link href={`/child/arena?adventure=${activeAdventure.id}`} style={{
              display:"flex",alignItems:"center",justifyContent:"center",gap:"12px",
              textDecoration:"none",fontWeight:900,fontSize:"28px",
              padding:"18px 40px",position:"relative",
              background:"linear-gradient(180deg,#fde68a 0%,#f59e0b 28%,#d97706 65%,#b45309 100%)",
              borderRadius:"18px",border:"3px solid #fbbf24",borderBottom:"8px solid #78350f",
              boxShadow:"0 0 60px rgba(245,158,11,0.75),0 12px 30px rgba(0,0,0,0.6),inset 0 2px 0 rgba(255,255,255,0.5)",
              color:"#1c0a00",textShadow:"0 1px 3px rgba(255,200,0,0.3)",letterSpacing:"0.02em",
              transition:"all 0.15s ease",
            }}>
              {/* Left gem */}
              <div style={{width:"28px",height:"28px",flexShrink:0,
                clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                background:"linear-gradient(180deg,rgba(255,255,255,0.95) 0%,#ef4444 55%)",
                filter:"drop-shadow(0 0 6px rgba(255,100,100,0.8))"}}/>
              ⚔️ {CHILD_ARENA_BUTTON} ⚔️
              {/* Right gem */}
              <div style={{width:"28px",height:"28px",flexShrink:0,
                clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                background:"linear-gradient(180deg,rgba(255,255,255,0.95) 0%,#38bdf8 55%)",
                filter:"drop-shadow(0 0 6px rgba(56,189,248,0.8))"}}/>
            </Link>
          ) : (
            <button disabled style={{
              display:"flex",alignItems:"center",justifyContent:"center",
              width:"100%",fontWeight:900,fontSize:"28px",padding:"18px 40px",
              background:"linear-gradient(180deg,#4a3000 0%,#2a1a00 100%)",
              borderRadius:"18px",border:"3px solid #5a3800",borderBottom:"8px solid #1a0e00",
              boxShadow:"0 12px 30px rgba(0,0,0,0.6)",color:"#7a5a20",
              cursor:"not-allowed",letterSpacing:"0.02em",
            }}>
              ⚔️ {CHILD_ARENA_BUTTON} ⚔️
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ADVENTURE CARDS — "מסע ההרפתקאות שלך"
      ══════════════════════════════════════════ */}
      <div style={{position:"relative",zIndex:20,padding:"4px 16px 12px"}}>

        {/* Section header */}
        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
          <span style={{color:"#fbbf24",fontSize:"16px"}}>◇</span>
          <p style={{fontWeight:900,fontSize:"15px",color:"#e2d9f3",margin:0}}>מסע ההרפתקאות שלך</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"10px"}}>
          {displayWorlds.map((w,idx)=>(
            <div key={idx} style={{
              borderRadius:"20px",overflow:"hidden",
              background:w.cfg.cardBg,
              border:`2px solid ${w.cfg.bdr}`,
              boxShadow:w.locked?"0 4px 16px rgba(0,0,0,0.65)":`0 10px 28px ${w.cfg.glow}`,
              opacity:w.locked?0.6:1,
              display:"flex",flexDirection:"column",
              minHeight:"160px",
            }}>
              {/* Card top: title + creature */}
              <div style={{padding:"12px 12px 8px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flex:1}}>
                <div style={{flex:1}}>
                  <p style={{fontWeight:900,fontSize:"14px",color:"#fff",margin:"0 0 4px",
                    textShadow:"0 1px 6px rgba(0,0,0,0.8)"}}>{w.name}</p>
                  <p style={{fontSize:"11px",color:"rgba(226,232,240,0.85)",margin:0,lineHeight:1.4}}>{w.desc}</p>
                </div>
                {/* Creature */}
                <div style={{fontSize:"40px",lineHeight:1,marginRight:"-4px",flexShrink:0,
                  filter:`drop-shadow(0 4px 12px ${w.cfg.creatureBg}88)`}}>
                  {w.locked ? "🔒" : w.cfg.creature}
                </div>
              </div>

              {/* Card bottom: progress */}
              <div style={{padding:"8px 12px 12px",
                borderTop:`1px solid rgba(255,255,255,0.08)`}}>
                {w.locked ? (
                  <p style={{color:"#64748b",fontSize:"12px",margin:0,display:"flex",alignItems:"center",gap:"6px"}}>
                    <span style={{fontSize:"16px"}}>🔒</span> נעלם
                  </p>
                ) : w.completed ? (
                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                    <div style={{flex:1,height:"8px",background:"rgba(0,0,0,0.4)",borderRadius:"999px",overflow:"hidden"}}>
                      <div style={{height:"100%",width:"100%",background:"linear-gradient(to right,#4ade80,#22c55e)",
                        borderRadius:"999px",boxShadow:"0 0 6px rgba(74,222,128,0.7)"}}/>
                    </div>
                    <span style={{color:"#4ade80",fontSize:"14px"}}>✓</span>
                  </div>
                ) : (
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"5px"}}>
                      <span style={{color:"rgba(226,232,240,0.8)",fontSize:"12px",fontWeight:700}}>
                        {w.done}/{w.total}
                      </span>
                      <span style={{fontSize:"16px"}}>📦</span>
                    </div>
                    <div style={{height:"8px",background:"rgba(0,0,0,0.45)",borderRadius:"999px",
                      border:"1px solid rgba(255,255,255,0.08)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${w.progress}%`,
                        background:"linear-gradient(to right,#4ade80,#22c55e)",borderRadius:"999px",
                        boxShadow:"0 0 6px rgba(74,222,128,0.65)"}}/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          FEATURE CARDS ROW
      ══════════════════════════════════════════ */}
      <div style={{position:"relative",zIndex:20,padding:"0 16px 16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>

          {/* Daily Goals */}
          <div style={{borderRadius:"18px",padding:"14px",
            background:"linear-gradient(135deg,#1a1040,#0c0828)",
            border:"1.5px solid rgba(160,120,255,0.45)",
            boxShadow:"0 6px 20px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontWeight:900,fontSize:"13px",color:"#e2d9f3",margin:"0 0 3px"}}>יעדים יומיים</p>
                <p style={{fontSize:"11px",color:"#64748b",margin:0}}>נצח 3 קרבות</p>
              </div>
              <span style={{fontSize:"28px"}}>🌟</span>
            </div>
            <div style={{marginTop:"10px"}}>
              <div style={{height:"8px",background:"rgba(0,0,0,0.45)",borderRadius:"999px",overflow:"hidden",marginBottom:"5px"}}>
                <div style={{height:"100%",width:"33%",background:"linear-gradient(to right,#a855f7,#7c3aed)",
                  borderRadius:"999px",boxShadow:"0 0 6px rgba(168,85,247,0.7)"}}/>
              </div>
              <p style={{fontSize:"12px",color:"#a78bfa",fontWeight:700,margin:0}}>1 / 3</p>
            </div>
          </div>

          {/* Lucky Box */}
          <div style={{borderRadius:"18px",padding:"14px",
            background:"linear-gradient(135deg,#1a0e00,#2a1800)",
            border:"1.5px solid rgba(200,140,0,0.5)",
            boxShadow:"0 6px 20px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <p style={{fontWeight:900,fontSize:"13px",color:"#fde68a",margin:"0 0 3px"}}>חבב מזל</p>
                <p style={{fontSize:"11px",color:"rgba(253,230,138,0.7)",margin:0}}>נסה את מזלך וזכה בפרסים!</p>
              </div>
              <div style={{display:"flex",gap:"3px",flexShrink:0}}>
                <span style={{fontSize:"28px"}}>📦</span>
                <span style={{fontSize:"20px",opacity:0.8}}>🃏</span>
              </div>
            </div>
          </div>

          {/* Crystal Store */}
          <div style={{borderRadius:"18px",padding:"14px",
            background:"linear-gradient(135deg,#0c1a40,#061028)",
            border:"1.5px solid rgba(56,189,248,0.45)",
            boxShadow:"0 6px 20px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <p style={{fontWeight:900,fontSize:"13px",color:"#bae6fd",margin:"0 0 3px"}}>חנות הקריסטלים</p>
                <p style={{fontSize:"11px",color:"rgba(186,230,253,0.7)",margin:0}}>שדרג את הגיבור שלך</p>
              </div>
              <span style={{fontSize:"32px"}}>💎</span>
            </div>
          </div>

          {/* Champions Summit */}
          <div style={{borderRadius:"18px",padding:"14px",
            background:"linear-gradient(135deg,#40100a,#280808)",
            border:"1.5px solid rgba(220,60,40,0.45)",
            boxShadow:"0 6px 20px rgba(0,0,0,0.6)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <p style={{fontWeight:900,fontSize:"13px",color:"#fca5a5",margin:"0 0 3px"}}>פסגת האלופים</p>
                <p style={{fontSize:"11px",color:"rgba(252,165,165,0.7)",margin:0}}>תפס בטבלת הדירוג</p>
              </div>
              <div style={{position:"relative",flexShrink:0}}>
                <span style={{fontSize:"30px"}}>🏆</span>
                {/* Podium */}
                <div style={{display:"flex",alignItems:"flex-end",gap:"2px",marginTop:"2px"}}>
                  <div style={{width:"12px",height:"10px",background:"#c0c0c0",borderRadius:"2px 2px 0 0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:700,color:"#1e293b"}}>2</div>
                  <div style={{width:"12px",height:"14px",background:"#f59e0b",borderRadius:"2px 2px 0 0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:700,color:"#1e293b"}}>1</div>
                  <div style={{width:"12px",height:"8px",background:"#cd7c2f",borderRadius:"2px 2px 0 0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:700,color:"#1e293b"}}>3</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </main>
  );
}

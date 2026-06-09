// ══════════════════════════════════════════════════════════
// Child dashboard — Crystal Champions Hub Screen
// Target: full illustrated fantasy hub, exact design match
// ══════════════════════════════════════════════════════════

import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { getChildDashboardData } from "@/app/actions/child-dashboard";
import {
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
  {name:"מבוא למסע",    desc:"הצעד הראשון של כל אלוף",  creature:"💗", creatureBg:"#ff6eb4", cardBg:"linear-gradient(160deg,#6a1575 0%,#3a0a50 55%,#220840 100%)",bdr:"#c060e0",glow:"rgba(190,80,220,0.6)"},
  {name:"שביל האש",     desc:"כבוש את להבות האומץ",      creature:"🔥", creatureBg:"#ff4400", cardBg:"linear-gradient(160deg,#6a1800 0%,#3a0a00 55%,#200600 100%)",bdr:"#e06020",glow:"rgba(220,100,30,0.6)"},
  {name:"יער הקריסטלים",desc:"גלת את סודות הטבע",        creature:"🌲", creatureBg:"#00aa44", cardBg:"linear-gradient(160deg,#065c2a 0%,#033518 55%,#021a0c 100%)",bdr:"#20c060",glow:"rgba(30,180,80,0.6)"},
  {name:"מצודת הברק",   desc:"עבור את מבחן החוכמה",      creature:"⚡", creatureBg:"#2244aa", cardBg:"linear-gradient(160deg,#1a2870 0%,#0d1545 55%,#060b28 100%)",bdr:"#4080e0",glow:"rgba(60,120,220,0.6)"},
  {name:"היכל האלופים", desc:"מקום לאגדות בלבד",          creature:"🏆", creatureBg:"#886600", cardBg:"linear-gradient(160deg,#4a2c00 0%,#281800 55%,#140c00 100%)",bdr:"#d4a020",glow:"rgba(200,150,20,0.6)"},
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
      overflow:"hidden",fontFamily:"var(--font-sans)",background:"#08011a",
    }}>

      {/* ══════════════════════════════════════════
          RICH ILLUSTRATED FANTASY BACKGROUND
      ══════════════════════════════════════════ */}
      <div style={{position:"absolute",inset:0,zIndex:0,pointerEvents:"none"}}>

        {/* Base deep sky */}
        <div style={{position:"absolute",inset:0,background:
          "linear-gradient(150deg,#160330 0%,#220660 18%,#1a0550 42%,#0c0220 70%,#060115 100%)"}}/>

        {/* Warm orange-pink sunrise glow — far left */}
        <div style={{position:"absolute",inset:0,background:`
          radial-gradient(ellipse 70% 90% at 8% 72%,rgba(255,95,15,0.85) 0%,rgba(230,55,140,0.65) 28%,rgba(160,30,200,0.35) 50%,transparent 68%),
          radial-gradient(ellipse 55% 65% at 20% 55%,rgba(210,55,160,0.6) 0%,rgba(130,20,190,0.4) 38%,transparent 62%),
          radial-gradient(ellipse 45% 55% at 4% 42%,rgba(255,130,30,0.5) 0%,transparent 52%)
        `}}/>

        {/* Deep indigo-blue center */}
        <div style={{position:"absolute",inset:0,background:`
          radial-gradient(ellipse 65% 75% at 52% 38%,rgba(70,18,210,0.5) 0%,rgba(50,12,160,0.3) 45%,transparent 68%),
          radial-gradient(ellipse 50% 65% at 90% 32%,rgba(8,4,55,0.75) 0%,transparent 65%)
        `}}/>

        {/* Stars layer */}
        {Array.from({length:120}).map((_,i)=>{
          const sz=0.8+(i%4)*0.6; const x=((i*137+17)%96)+2; const y=((i*79+31)%55)+1;
          return <div key={i} style={{
            position:"absolute",borderRadius:"50%",background:"white",
            width:sz,height:sz,left:`${x}%`,top:`${y}%`,
            opacity:0.12+(i%8)*0.09,
            boxShadow:sz>1.5?`0 0 ${sz*2}px rgba(220,210,255,0.55)`:undefined,
          }}/>;
        })}
        {/* Hero bright stars */}
        {[{x:62,y:4,r:4},{x:75,y:8,r:3.5},{x:88,y:3,r:4.5},{x:50,y:6,r:3},
          {x:40,y:2,r:2.5},{x:92,y:12,r:3},{x:68,y:14,r:2.5},{x:57,y:15,r:2},
          {x:33,y:5,r:2},{x:82,y:18,r:2.5}].map((s,i)=>(
          <div key={i} style={{position:"absolute",borderRadius:"50%",background:"white",
            width:s.r*2,height:s.r*2,left:`${s.x}%`,top:`${s.y}%`,opacity:1,
            boxShadow:`0 0 ${s.r*5}px ${s.r*3}px rgba(220,200,255,0.65),0 0 ${s.r*12}px rgba(180,140,255,0.4)`}}/>
        ))}

        {/* LARGE MOON — upper right */}
        <div style={{position:"absolute",right:"6%",top:"3%",width:"140px",height:"140px",
          borderRadius:"50%",
          background:"radial-gradient(circle at 38% 32%,rgba(255,255,255,0.98) 0%,rgba(230,238,255,0.90) 38%,rgba(190,200,250,0.70) 68%,rgba(155,165,235,0.40) 100%)",
          boxShadow:"0 0 60px 28px rgba(200,215,255,0.38),0 0 120px rgba(180,195,255,0.2)",
        }}/>
        <div style={{position:"absolute",right:"10.5%",top:"6.5%",width:"26px",height:"26px",
          borderRadius:"50%",background:"rgba(165,178,230,0.38)"}}/>
        <div style={{position:"absolute",right:"7.5%",top:"10%",width:"16px",height:"16px",
          borderRadius:"50%",background:"rgba(165,178,230,0.32)"}}/>
        <div style={{position:"absolute",right:"13%",top:"11%",width:"10px",height:"10px",
          borderRadius:"50%",background:"rgba(165,178,230,0.28)"}}/>

        {/* ── FLOATING ISLANDS – left area ── */}
        {/* Island 1 — large */}
        <div style={{position:"absolute",left:"5%",top:"5%",width:"220px",height:"100px"}}>
          <div style={{width:"100%",height:"62px",
            background:"linear-gradient(160deg,#7045b0 0%,#351a72 100%)",
            borderRadius:"50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow:"0 10px 38px rgba(110,55,240,0.7),0 18px 50px rgba(0,0,0,0.75)"}}/>
          <div style={{width:"72%",marginLeft:"14%",height:"36px",marginTop:"-8px",
            background:"linear-gradient(160deg,#2e6835 0%,#173418 100%)",
            borderRadius:"0 0 50% 50%",boxShadow:"0 12px 28px rgba(0,0,0,0.75)"}}/>
          {/* Castle on island */}
          <div style={{position:"absolute",top:"-42px",left:"52%",width:"54px",height:"54px"}}>
            <svg viewBox="0 0 54 54" width="54" height="54">
              <rect x="10" y="28" width="34" height="26" fill="#5035a0"/>
              <rect x="4" y="16" width="14" height="38" fill="#3c2272"/>
              <rect x="36" y="16" width="14" height="38" fill="#3c2272"/>
              <polygon points="11,16 4,16 4,6 11,16" fill="#2c1860"/>
              <polygon points="43,16 50,16 50,6 43,16" fill="#2c1860"/>
              <polygon points="27,16 19,16 19,4 27,16" fill="#2c1860"/>
              <rect x="20" y="36" width="14" height="18" fill="#090318"/>
              <ellipse cx="11" cy="16" rx="5" ry="5" fill="#7050b8"/>
              <ellipse cx="43" cy="16" rx="5" ry="5" fill="#6040b0"/>
              <rect x="21" y="18" width="12" height="12" rx="2" fill="#090318" opacity="0.8"/>
              <ellipse cx="11" cy="28" rx="3" ry="4" fill="#ffa020" opacity="0.9"/>
              <ellipse cx="43" cy="28" rx="3" ry="4" fill="#ffa020" opacity="0.9"/>
            </svg>
          </div>
          {/* Large crystals on island */}
          {[{x:8,c:"#a855f7",h:28,w:12},{x:22,c:"#e879f9",h:38,w:16},{x:65,c:"#38bdf8",h:32,w:13},{x:78,c:"#c084fc",h:22,w:10}].map((cr,j)=>(
            <div key={j} className="particle" style={{
              position:"absolute",left:`${cr.x}%`,top:`-${cr.h+2}px`,width:`${cr.w}px`,height:`${cr.h}px`,
              background:`linear-gradient(160deg,rgba(255,255,255,0.98) 0%,${cr.c} 50%,${cr.c}99 100%)`,
              clipPath:"polygon(50% 0%,100% 35%,75% 100%,25% 100%,0% 35%)",
              filter:`drop-shadow(0 0 9px ${cr.c}) drop-shadow(0 0 18px ${cr.c}66)`,
              animationDuration:`${4+j*0.8}s`,
            }}/>
          ))}
        </div>
        {/* Island 2 – higher, right of center */}
        <div style={{position:"absolute",left:"26%",top:"1%",width:"150px",height:"70px"}}>
          <div style={{width:"100%",height:"44px",
            background:"linear-gradient(160deg,#5838b0 0%,#2c1660 100%)",
            borderRadius:"50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow:"0 7px 26px rgba(90,45,215,0.6)"}}/>
          <div style={{width:"70%",marginLeft:"15%",height:"26px",marginTop:"-6px",
            background:"linear-gradient(160deg,#256030 0%,#102e18 100%)",borderRadius:"0 0 50% 50%"}}/>
          {[{x:28,c:"#c084fc",h:22,w:10},{x:55,c:"#f59e0b",h:28,w:12},{x:72,c:"#38bdf8",h:18,w:9}].map((cr,j)=>(
            <div key={j} className="particle" style={{
              position:"absolute",left:`${cr.x}%`,top:`-${cr.h+2}px`,width:`${cr.w}px`,height:`${cr.h}px`,
              background:`linear-gradient(160deg,rgba(255,255,255,0.98) 0%,${cr.c} 50%,${cr.c}99 100%)`,
              clipPath:"polygon(50% 0%,100% 35%,75% 100%,25% 100%,0% 35%)",
              filter:`drop-shadow(0 0 8px ${cr.c})`,animationDuration:`${5+j*0.7}s`,
            }}/>
          ))}
        </div>
        {/* Island 3 — tiny top center */}
        <div style={{position:"absolute",left:"47%",top:"0%",width:"90px",height:"48px"}}>
          <div style={{width:"100%",height:"30px",
            background:"linear-gradient(160deg,#4830a0 0%,#241455 100%)",
            borderRadius:"50% 50% 38% 38% / 58% 58% 42% 42%",
            boxShadow:"0 5px 16px rgba(70,35,200,0.5)"}}/>
          <div style={{width:"68%",marginLeft:"16%",height:"18px",marginTop:"-4px",
            background:"linear-gradient(160deg,#1e5428 0%,#0c2814 100%)",borderRadius:"0 0 50% 50%"}}/>
          {[{x:40,c:"#e879f9",h:16,w:8}].map((cr,j)=>(
            <div key={j} className="particle" style={{
              position:"absolute",left:`${cr.x}%`,top:`-${cr.h+2}px`,width:`${cr.w}px`,height:`${cr.h}px`,
              background:`linear-gradient(160deg,rgba(255,255,255,0.98) 0%,${cr.c} 50%)`,
              clipPath:"polygon(50% 0%,100% 35%,75% 100%,25% 100%,0% 35%)",
              filter:`drop-shadow(0 0 7px ${cr.c})`,animationDuration:"4.5s",
            }}/>
          ))}
        </div>

        {/* ── LARGE CRYSTAL FORMATIONS – far left ── */}
        <div style={{position:"absolute",left:"-2%",top:"15%",display:"flex",gap:"5px",alignItems:"flex-end"}}>
          {[
            {h:160,w:36,c:"#c084fc",dur:"5.2s"},
            {h:240,w:52,c:"#a855f7",dur:"6.1s",del:"0.5s"},
            {h:125,w:30,c:"#e879f9",dur:"4.8s",del:"1.1s"},
            {h:195,w:44,c:"#7c3aed",dur:"5.8s",del:"0.3s"},
            {h:105,w:26,c:"#d946ef",dur:"5.4s",del:"0.8s"},
            {h:145,w:34,c:"#c084fc",dur:"6.4s",del:"1.4s"},
          ].map((c,i)=>(
            <div key={i} className="particle" style={{
              width:`${c.w}px`,height:`${c.h}px`,
              background:`linear-gradient(180deg,rgba(255,255,255,0.98) 0%,${c.c} 32%,${c.c}bb 100%)`,
              clipPath:"polygon(50% 0%,100% 28%,82% 100%,18% 100%,0% 28%)",
              filter:`drop-shadow(0 0 14px ${c.c}) drop-shadow(0 0 28px ${c.c}88)`,
              animationDuration:c.dur,animationDelay:(c as {del?:string}).del??"0s",
            }}/>
          ))}
        </div>
        {/* Mid-left crystal cluster */}
        <div style={{position:"absolute",left:"12%",top:"28%",display:"flex",gap:"4px",alignItems:"flex-end"}}>
          {[
            {h:90,w:22,c:"#a855f7",dur:"4.9s",del:"0.6s"},
            {h:140,w:32,c:"#38bdf8",dur:"5.7s"},
            {h:75,w:20,c:"#c084fc",dur:"4.5s",del:"1.4s"},
            {h:110,w:26,c:"#e879f9",dur:"5.2s",del:"0.9s"},
          ].map((c,i)=>(
            <div key={i} className="particle" style={{
              width:`${c.w}px`,height:`${c.h}px`,
              background:`linear-gradient(180deg,rgba(255,255,255,0.98) 0%,${c.c} 32%,${c.c}bb 100%)`,
              clipPath:"polygon(50% 0%,100% 28%,82% 100%,18% 100%,0% 28%)",
              filter:`drop-shadow(0 0 11px ${c.c}) drop-shadow(0 0 22px ${c.c}66)`,
              animationDuration:c.dur,animationDelay:(c as {del?:string}).del??"0s",
            }}/>
          ))}
        </div>

        {/* ── GRAND CASTLE – right side ── */}
        <div style={{position:"absolute",right:"-3%",top:"2%",width:"440px",height:"620px"}}>
          {/* Castle base ambient glow */}
          <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",
            width:"480px",height:"180px",
            background:"radial-gradient(ellipse,rgba(80,140,255,0.4) 0%,rgba(40,60,200,0.2) 55%,transparent 82%)",
            filter:"blur(35px)"}}/>
          <svg viewBox="0 0 440 620" style={{position:"absolute",inset:0,width:"100%",height:"100%",overflow:"visible"}} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cwall" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#525fa8"/><stop offset="100%" stopColor="#202550"/>
              </linearGradient>
              <linearGradient id="ctow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#6070c0"/><stop offset="100%" stopColor="#262e68"/>
              </linearGradient>
              <linearGradient id="croof" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7888d8"/><stop offset="100%" stopColor="#343e84"/>
              </linearGradient>
              <linearGradient id="waterfall" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(120,190,255,0.85)"/>
                <stop offset="100%" stopColor="rgba(60,140,220,0.25)"/>
              </linearGradient>
              <linearGradient id="gateGlow" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,170,40,0.5)"/>
                <stop offset="100%" stopColor="rgba(255,170,40,0)"/>
              </linearGradient>
            </defs>
            {/* Main wall */}
            <rect x="55" y="350" width="330" height="270" fill="url(#cwall)"/>
            {/* Wall battlements */}
            {[62,84,106,128,162,196,230,264,298,320,344,366].map((x,i)=>(
              <rect key={i} x={x} y={332} width={16} height={24} fill="url(#cwall)" rx={2}/>
            ))}
            {/* Gate arch */}
            <rect x="162" y="435" width="116" height="185" fill="#030010"/>
            <ellipse cx="220" cy="435" rx="58" ry="36" fill="#030010"/>
            {/* Gate warm glow */}
            <ellipse cx="220" cy="480" rx="50" ry="60" fill="url(#gateGlow)"/>
            <ellipse cx="220" cy="435" rx="42" ry="26" fill="rgba(255,160,30,0.08)"/>

            {/* Far-left tower */}
            <rect x="22" y="220" width="88" height="400" fill="url(#ctow)"/>
            {[22,42,60,76].map((x,i)=><rect key={i} x={x} y={200} width={16} height={24} fill="url(#ctow)" rx={2}/>)}
            <polygon points="66,88 22,220 110,220" fill="url(#croof)"/>
            <line x1="66" y1="88" x2="66" y2="22" stroke="#b0c0ff" strokeWidth="2.8"/>
            <polygon points="66,22 96,40 66,60" fill="#7888e0"/>

            {/* Center-left tower */}
            <rect x="120" y="185" width="72" height="435" fill="url(#ctow)"/>
            {[120,138,155,170].map((x,i)=><rect key={i} x={x} y={166} width={15} height={22} fill="url(#ctow)" rx={2}/>)}
            <polygon points="156,72 120,185 192,185" fill="url(#croof)"/>
            <line x1="156" y1="72" x2="156" y2="8" stroke="#c8d8ff" strokeWidth="2.2"/>
            <polygon points="156,8 180,24 156,44" fill="#8898e8"/>

            {/* Main center tower — tallest */}
            <rect x="188" y="128" width="64" height="492" fill="url(#ctow)"/>
            {[188,206,224,240].map((x,i)=><rect key={i} x={x} y={108} width={15} height={26} fill="url(#ctow)" rx={2}/>)}
            <polygon points="220,8 188,128 252,128" fill="url(#croof)"/>
            <line x1="220" y1="8" x2="220" y2="-30" stroke="#e8d8ff" strokeWidth="3.2"/>
            <polygon points="220,-30 250,-12 220,8" fill="#c8b8f8"/>
            {/* Center tower windows */}
            <ellipse cx="220" cy="158" rx="11" ry="15" fill="#ff9020" opacity="0.95"/>
            <ellipse cx="220" cy="205" rx="9" ry="12" fill="#ffb040" opacity="0.75"/>
            <ellipse cx="220" cy="270" rx="10" ry="14" fill="#ff8000" opacity="0.85"/>
            <ellipse cx="220" cy="330" rx="9" ry="11" fill="#ffa030" opacity="0.7"/>

            {/* Center-right tower */}
            <rect x="304" y="168" width="80" height="452" fill="url(#ctow)"/>
            {[304,323,342,360].map((x,i)=><rect key={i} x={x} y={148} width={16} height={24} fill="url(#ctow)" rx={2}/>)}
            <polygon points="344,55 304,168 384,168" fill="url(#croof)"/>
            <line x1="344" y1="55" x2="344" y2="-5" stroke="#a8b8ff" strokeWidth="2.8"/>
            <polygon points="344,-5 374,12 344,32" fill="#8090e0"/>

            {/* Far-right spire */}
            <rect x="388" y="218" width="52" height="402" fill="url(#ctow)"/>
            {[388,404,420].map((x,i)=><rect key={i} x={x} y={200} width={13} height={22} fill="url(#ctow)" rx={2}/>)}
            <polygon points="414,105 388,218 440,218" fill="url(#croof)"/>
            <line x1="414" y1="105" x2="414" y2="52" stroke="#9098e8" strokeWidth="2.2"/>
            <polygon points="414,52 436,68 414,88" fill="#6878c8"/>

            {/* Tower windows — amber glow */}
            <ellipse cx="66" cy="268" rx="10" ry="14" fill="#ff9020" opacity="0.92"/>
            <ellipse cx="66" cy="302" rx="8" ry="10" fill="#ffb040" opacity="0.68"/>
            <ellipse cx="156" cy="238" rx="10" ry="13" fill="#ff9020" opacity="0.92"/>
            <ellipse cx="156" cy="278" rx="8" ry="10" fill="#ffb040" opacity="0.65"/>
            <ellipse cx="344" cy="218" rx="10" ry="13" fill="#ff9020" opacity="0.9"/>
            <ellipse cx="344" cy="258" rx="8" ry="10" fill="#ffb040" opacity="0.68"/>
            <ellipse cx="414" cy="268" rx="8" ry="10" fill="#ff9020" opacity="0.82"/>
            <ellipse cx="130" cy="390" rx="9" ry="12" fill="#ff9020" opacity="0.72"/>
            <ellipse cx="310" cy="390" rx="9" ry="12" fill="#ff9020" opacity="0.72"/>

            {/* Stone texture lines */}
            {[368,396,424,452,480,508,536,564,592].map((y,i)=>(
              <line key={i} x1="55" y1={y} x2="385" y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            ))}

            {/* Waterfall right side */}
            <rect x="388" y="435" width="22" height="185" fill="url(#waterfall)" opacity="0.75"/>
            <ellipse cx="399" cy="620" rx="28" ry="12" fill="rgba(100,180,255,0.45)"/>

            {/* Path stones */}
            {[1,2,3,4,5].map(i=>(
              <ellipse key={i} cx={220-i*38} cy={610+i*2} rx={20+i*3} ry={7} fill="rgba(80,100,180,0.3)" opacity={0.55}/>
            ))}

            {/* Lanterns on wall */}
            {[148,178,220,262,292].map((x,i)=>(
              <g key={i}>
                <rect x={x-1} y={555-(i%2)*18} width={2} height={30+(i%2)*18} fill="#6070a8" opacity="0.72"/>
                <ellipse cx={x} cy={555-(i%2)*18} rx={5} ry={5} fill="#f59e0b" opacity="0.95"/>
                <ellipse cx={x} cy={555-(i%2)*18} rx={14} ry={9} fill="rgba(245,158,11,0.22)"/>
              </g>
            ))}

            {/* Ground shadow */}
            <ellipse cx="220" cy="620" rx="200" ry="26" fill="rgba(60,80,180,0.35)"/>
          </svg>
          {/* Castle ambient glow bottom */}
          <div style={{position:"absolute",bottom:"2px",left:"50%",transform:"translateX(-50%)",
            width:"420px",height:"140px",
            background:"radial-gradient(ellipse,rgba(80,140,255,0.55) 0%,rgba(40,80,220,0.2) 55%,transparent 80%)",
            filter:"blur(28px)"}}/>
        </div>

        {/* Right-side crystals (near castle base) */}
        <div style={{position:"absolute",right:"0%",top:"50%",display:"flex",gap:"5px",alignItems:"flex-end"}}>
          {[{h:85,w:22,c:"#a855f7",dur:"5s"},{h:125,w:30,c:"#7c3aed",dur:"5.8s",del:"0.5s"},
            {h:65,w:18,c:"#e879f9",dur:"4.4s",del:"1s"},{h:100,w:24,c:"#38bdf8",dur:"5.3s",del:"1.6s"}].map((c,i)=>(
            <div key={i} className="particle" style={{
              width:`${c.w}px`,height:`${c.h}px`,
              background:`linear-gradient(180deg,rgba(255,255,255,0.98) 0%,${c.c} 36%,${c.c}bb 100%)`,
              clipPath:"polygon(50% 0%,100% 28%,82% 100%,18% 100%,0% 28%)",
              filter:`drop-shadow(0 0 10px ${c.c}) drop-shadow(0 0 20px ${c.c}66)`,
              animationDuration:c.dur,animationDelay:(c as {del?:string}).del??"0s",
            }}/>
          ))}
        </div>

        {/* Ground fade */}
        <div style={{position:"absolute",bottom:0,left:0,right:0,height:"260px",
          background:"linear-gradient(to top,rgba(6,1,20,0.97) 0%,rgba(16,5,52,0.6) 50%,transparent 100%)"}}/>

        {/* Floating sparkles */}
        {[{x:"32%",y:"26%",c:"#c084fc",s:6},{x:"44%",y:"8%",c:"#38bdf8",s:5},
          {x:"58%",y:"18%",c:"#f59e0b",s:6},{x:"36%",y:"42%",c:"#e879f9",s:5},
          {x:"70%",y:"30%",c:"#7c3aed",s:7},{x:"16%",y:"50%",c:"#a855f7",s:6},
          {x:"52%",y:"34%",c:"#c084fc",s:4},{x:"24%",y:"14%",c:"#38bdf8",s:5},
        ].map((p,i)=>(
          <div key={i} className="particle" style={{
            position:"absolute",left:p.x,top:p.y,
            width:`${p.s*2}px`,height:`${p.s*2}px`,borderRadius:"50%",background:p.c,
            boxShadow:`0 0 ${p.s*3}px ${p.s}px ${p.c}88`,
            animationDuration:`${3+i*0.55}s`,animationDelay:`${i*0.32}s`,
          }}/>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          TOP BAR
      ══════════════════════════════════════════ */}
      <header style={{
        position:"relative",zIndex:30,display:"flex",alignItems:"center",
        gap:"8px",padding:"8px 14px",flexWrap:"nowrap",
      }}>

        {/* LOGO */}
        <div style={{display:"flex",alignItems:"center",gap:"7px",flexShrink:0}}>
          <div style={{width:"48px",height:"48px",position:"relative",flexShrink:0}}>
            <svg viewBox="0 0 48 48" width="48" height="48">
              <polygon points="24,2 33,15 48,15 37,26 41,41 24,32 7,41 11,26 0,15 15,15" fill="#c084fc" opacity="0.28"/>
              <polygon points="24,6 31,17 44,17 34,24 38,36 24,28 10,36 14,24 4,17 17,17" fill="#a855f7"/>
              <polygon points="24,10 29,19 38,19 31,24 33,32 24,26 15,32 17,24 10,19 19,19" fill="#e9d5ff"/>
              <polygon points="24,14 26,20 33,20 28,23 29,30 24,26 19,30 20,23 15,20 22,20" fill="white"/>
              <circle cx="24" cy="4" r="3.5" fill="#fbbf24"/>
            </svg>
          </div>
          <div>
            <p style={{color:"#fbbf24",fontWeight:900,fontSize:"16px",lineHeight:1,letterSpacing:"-0.02em"}}>קריסטל</p>
            <p style={{color:"#e9d5ff",fontWeight:900,fontSize:"13px",lineHeight:1,letterSpacing:"-0.02em"}}>צ׳אמפיון</p>
          </div>
        </div>

        {/* Rankings */}
        <button style={{
          display:"flex",alignItems:"center",gap:"6px",flexShrink:0,
          background:"rgba(18,9,48,0.80)",border:"1.5px solid rgba(150,100,220,0.55)",
          borderRadius:"22px",padding:"8px 16px",color:"#e2d9f3",fontWeight:700,
          fontSize:"13px",cursor:"pointer",backdropFilter:"blur(10px)",
          boxShadow:"0 4px 16px rgba(0,0,0,0.55)",
        }}>
          <span>🏆</span> דירוגים
        </button>

        <div style={{flex:1}}/>

        {/* Crystal Power bar */}
        <div style={{display:"flex",alignItems:"center",gap:"8px",flexShrink:0,
          background:"linear-gradient(160deg,#0a1e3a,#050e1e)",
          border:"1.5px solid rgba(80,160,255,0.65)",borderBottom:"2.5px solid rgba(28,80,185,0.85)",
          borderRadius:"22px",padding:"7px 16px",
          boxShadow:"0 4px 16px rgba(0,0,0,0.65),0 0 24px rgba(60,120,255,0.18)"}}>
          <span style={{color:"#a5d4ff",fontSize:"12px",fontWeight:900,whiteSpace:"nowrap"}}>כוח קריסטל</span>
          <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
            {Array.from({length:energyMax}).map((_,i)=>(
              <div key={i} style={{
                width:"15px",height:"15px",
                clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                background:i<profile.energy
                  ?"linear-gradient(180deg,rgba(255,255,255,0.98) 0%,#38bdf8 38%,#0891b2 100%)"
                  :"rgba(28,50,105,0.65)",
                filter:i<profile.energy?"drop-shadow(0 0 5px rgba(56,189,248,0.95))":"none",
              }}/>
            ))}
            <div style={{width:"15px",height:"15px",transform:"rotate(45deg)",
              background:"rgba(8,18,52,0.92)",border:"1.5px solid rgba(80,120,200,0.45)",marginRight:"2px"}}/>
          </div>
          <span style={{color:"#67e8f9",fontSize:"17px"}}>⚡</span>
        </div>

        {/* XP */}
        <div style={{display:"flex",alignItems:"center",gap:"7px",flexShrink:0,
          background:"linear-gradient(160deg,#1c0848,#0e0528)",
          border:"1.5px solid rgba(139,92,246,0.65)",borderBottom:"2.5px solid rgba(76,29,149,0.85)",
          borderRadius:"22px",padding:"7px 16px",
          boxShadow:"0 4px 16px rgba(0,0,0,0.65)"}}>
          <span style={{color:"#ede9fe",fontWeight:900,fontSize:"14px",whiteSpace:"nowrap"}}>
            XP {profile.total_xp.toLocaleString("he-IL")}
          </span>
          <span style={{color:"#fbbf24",fontSize:"17px"}}>⭐</span>
        </div>

        {/* Stars */}
        <div style={{display:"flex",alignItems:"center",gap:"7px",flexShrink:0,
          background:"linear-gradient(160deg,#2c1800,#160c00)",
          border:"1.5px solid rgba(202,138,4,0.65)",borderBottom:"2.5px solid rgba(120,80,0,0.85)",
          borderRadius:"22px",padding:"7px 16px",boxShadow:"0 4px 16px rgba(0,0,0,0.65)"}}>
          <span style={{color:"#fef3c7",fontWeight:900,fontSize:"14px"}}>{profile.total_stars.toLocaleString("he-IL")}</span>
          <span style={{color:"#fbbf24",fontSize:"17px"}}>⭐</span>
        </div>

        {/* Coins */}
        <div style={{display:"flex",alignItems:"center",gap:"7px",flexShrink:0,
          background:"linear-gradient(160deg,#1e1000,#0e0800)",
          border:"1.5px solid rgba(180,120,0,0.65)",borderBottom:"2.5px solid rgba(100,60,0,0.85)",
          borderRadius:"22px",padding:"7px 16px",boxShadow:"0 4px 16px rgba(0,0,0,0.65)"}}>
          <span style={{color:"#fef3c7",fontWeight:900,fontSize:"14px"}}>{profile.total_coins.toLocaleString("he-IL")}</span>
          <span style={{fontSize:"17px"}}>🪙</span>
        </div>

        <div style={{width:"6px"}}/>

        {/* Icon buttons */}
        {[["📜","חדשות"],["🎁","מתנות"],["⚙️","הגדרות"]].map(([icon,lbl],i)=>(
          <button key={lbl} style={{position:"relative",width:"44px",height:"44px",borderRadius:"50%",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"21px",
            background:"rgba(18,9,50,0.75)",border:"1.5px solid rgba(120,80,200,0.5)",
            cursor:"pointer",boxShadow:"0 4px 14px rgba(0,0,0,0.55)",flexShrink:0}}>
            {icon}
            {i===1 && <div style={{position:"absolute",top:"-2px",right:"-2px",width:"11px",height:"11px",
              borderRadius:"50%",background:"#ef4444",border:"2px solid #0e0528"}}/>}
          </button>
        ))}

        {/* User avatar + name */}
        <div style={{display:"flex",alignItems:"center",gap:"9px",flexShrink:0,marginRight:"4px"}}>
          <div style={{textAlign:"right"}}>
            <p style={{color:"white",fontWeight:700,fontSize:"14px",lineHeight:1}}>{profile.display_name_he}</p>
            {gradeLabel && <p style={{color:"#c4b5fd",fontSize:"11px",lineHeight:1,marginTop:"3px"}}>{gradeLabel}</p>}
          </div>
          <div style={{position:"relative",width:"46px",height:"46px",borderRadius:"50%",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:"21px",fontWeight:900,color:"white",overflow:"hidden",
            background:"linear-gradient(135deg,#6022c8,#3c10a8)",
            border:"2.5px solid #a78bfa",boxShadow:"0 0 22px rgba(124,58,237,0.85)"}}>
            {profile.display_name_he.charAt(0)}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          HERO AREA
      ══════════════════════════════════════════ */}
      <div style={{
        position:"relative",zIndex:20,display:"flex",flexDirection:"column",
        alignItems:"center",flex:1,padding:"0 0 4px",minHeight:0,
      }}>

        {/* Mission title row */}
        <div style={{textAlign:"center",marginBottom:"6px"}}>
          <p style={{color:"#c4b5fd",fontSize:"13px",fontWeight:700,margin:0,letterSpacing:"0.04em"}}>
            המרתף המנצחית ⚡
          </p>
          <h1 style={{color:"white",fontSize:"32px",fontWeight:900,margin:"2px 0",
            textShadow:"0 2px 24px rgba(160,100,255,0.7)",letterSpacing:"-0.01em",lineHeight:1}}>
            {missionName}
          </h1>
          {hasAdventure ? (
            <p style={{color:"#a78bfa",fontSize:"13px",fontWeight:700,margin:0}}>
              התקדמות מסע ✗
            </p>
          ) : (
            <p style={{color:"#64748b",fontSize:"13px",margin:0}}>⚔️ אין הרפתקה פעילה</p>
          )}
        </div>

        {/* Hero scene — speech bubble + hero + companions */}
        <div style={{
          display:"flex",alignItems:"flex-end",justifyContent:"center",
          position:"relative",width:"100%",maxWidth:"1000px",
          flex:"1 1 auto",minHeight:"310px",
        }}>

          {/* SPEECH BUBBLE — left of hero (right side in RTL layout, but visually left) */}
          <div style={{
            position:"absolute",right:"52%",bottom:"130px",
            width:"265px",zIndex:10,
          }}>
            <div style={{
              background:"rgba(255,255,255,0.97)",borderRadius:"24px",
              padding:"20px 22px",
              boxShadow:"0 10px 40px rgba(0,0,0,0.7),0 2px 10px rgba(100,40,200,0.35)",
              border:"2.5px solid rgba(255,255,255,0.96)",position:"relative",
            }}>
              {/* Gem icon top-left of bubble */}
              <div style={{position:"absolute",top:"-14px",left:"18px",
                width:"28px",height:"28px",borderRadius:"50%",
                background:"linear-gradient(135deg,#a855f7,#7c3aed)",
                display:"flex",alignItems:"center",justifyContent:"center",
                boxShadow:"0 4px 12px rgba(124,58,237,0.65)"}}>
                <span style={{fontSize:"14px"}}>💎</span>
              </div>
              {/* Bubble tail → right toward hero */}
              <div style={{
                position:"absolute",bottom:"35px",left:"-20px",width:0,height:0,
                borderTop:"12px solid transparent",borderBottom:"12px solid transparent",
                borderRight:"22px solid rgba(255,255,255,0.97)",
              }}/>
              <p style={{fontWeight:700,fontSize:"15px",lineHeight:1.55,color:"#2e1065",margin:0}}>
                {speechText.length > 90 ? speechText.slice(0,90)+"…" : speechText}
              </p>
              <span style={{position:"absolute",top:"10px",right:"12px",fontSize:"13px",opacity:0.55}}>✦</span>
              <span style={{position:"absolute",bottom:"10px",right:"16px",fontSize:"11px",opacity:0.45}}>✦</span>
            </div>
          </div>

          {/* HERO on pedestal */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",zIndex:10}}>

            {/* Wide ambient glow behind hero */}
            <div style={{
              position:"absolute",bottom:"40px",left:"50%",transform:"translateX(-50%)",
              width:"700px",height:"420px",pointerEvents:"none",
              background:"radial-gradient(ellipse,rgba(56,189,248,0.6) 0%,rgba(100,120,255,0.42) 28%,rgba(140,90,255,0.22) 52%,transparent 74%)",
              filter:"blur(36px)",
            }}/>

            {/* Hero image — large */}
            <Link href="/child/heroes" style={{
              display:"block",position:"relative",zIndex:10,
              filter:hasAdventure
                ?"drop-shadow(0 0 28px rgba(56,189,248,0.9)) drop-shadow(0 0 55px rgba(56,189,248,0.45))"
                :"drop-shadow(0 0 24px rgba(124,58,237,0.80)) drop-shadow(0 0 50px rgba(124,58,237,0.40))",
            }} className="hero-float">
              <Image
                src={imgSrc}
                alt={heroName}
                width={360}
                height={480}
                style={{width:"320px",height:"440px",objectFit:"contain",objectPosition:"center bottom",display:"block"}}
                unoptimized
                priority
              />
            </Link>

            {/* Glowing stone pedestal */}
            <div style={{position:"relative",marginTop:"-22px",zIndex:9}}>
              <div style={{
                width:"320px",height:"32px",
                background:"radial-gradient(ellipse,rgba(56,189,248,0.95) 0%,rgba(30,65,190,0.75) 52%,rgba(8,18,80,0.4) 80%,transparent 100%)",
                borderRadius:"50%",
                boxShadow:"0 0 70px 28px rgba(56,189,248,0.7),0 0 140px rgba(80,120,255,0.35)",
              }}/>
              <div style={{
                width:"275px",height:"34px",margin:"-5px auto 0",
                background:"linear-gradient(180deg,#1e2e6a 0%,#0e1640 100%)",
                borderRadius:"50%",
                boxShadow:"0 10px 28px rgba(0,0,0,0.85),inset 0 2px 0 rgba(80,120,255,0.35)",
              }}/>
              {[{l:"-34px",c:"#38bdf8",h:32,w:12},{l:"-18px",c:"#a855f7",h:22,w:10},{r:"-34px",c:"#38bdf8",h:32,w:12},{r:"-18px",c:"#c084fc",h:22,w:10}].map((cr,i)=>(
                <div key={i} style={{
                  position:"absolute",
                  ...(cr.l?{left:cr.l}:{right:cr.r}),
                  top:"-22px",
                  width:`${cr.w}px`,height:`${cr.h}px`,
                  background:`linear-gradient(180deg,white 0%,${cr.c} 52%)`,
                  clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                  filter:`drop-shadow(0 0 7px ${cr.c})`,
                }}/>
              ))}
            </div>

            {/* Hero name */}
            <p style={{fontWeight:900,fontSize:"19px",color:"white",margin:"12px 0 0",
              textShadow:"0 2px 14px rgba(0,0,0,0.85)",letterSpacing:"-0.01em"}}>
              {heroName} 🛡️
            </p>
          </div>

          {/* CRYSTAL COMPANION — right of hero */}
          <div style={{
            position:"absolute",left:"51%",bottom:"175px",
            fontSize:"72px",lineHeight:1,zIndex:10,
            filter:"drop-shadow(0 0 18px rgba(56,189,248,0.95)) drop-shadow(0 0 36px rgba(56,189,248,0.55))",
          }} className="particle">
            💎
          </div>

          {/* Pink mascot — lower right */}
          <div style={{
            position:"absolute",left:"57%",bottom:"95px",
            fontSize:"54px",lineHeight:1,zIndex:10,
            filter:"drop-shadow(0 0 14px rgba(240,100,200,0.85))",
          }} className="particle">
            🌸
          </div>
        </div>

        {/* CTA BUTTON — full width, large */}
        <div style={{width:"100%",maxWidth:"720px",padding:"0 16px",marginTop:"12px"}}>
          {hasAdventure ? (
            <Link href={`/child/arena?adventure=${activeAdventure.id}`} style={{
              display:"flex",alignItems:"center",justifyContent:"center",gap:"14px",
              textDecoration:"none",fontWeight:900,fontSize:"30px",
              padding:"20px 48px",position:"relative",
              background:"linear-gradient(180deg,#fde68a 0%,#f59e0b 26%,#d97706 62%,#b45309 100%)",
              borderRadius:"20px",border:"3px solid #fbbf24",borderBottom:"9px solid #78350f",
              boxShadow:"0 0 70px rgba(245,158,11,0.80),0 14px 36px rgba(0,0,0,0.65),inset 0 2px 0 rgba(255,255,255,0.55)",
              color:"#1c0a00",textShadow:"0 1px 4px rgba(255,200,0,0.35)",letterSpacing:"0.02em",
              width:"100%",
            }}>
              <div style={{width:"32px",height:"32px",flexShrink:0,
                clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                background:"linear-gradient(180deg,rgba(255,255,255,0.98) 0%,#ef4444 52%)",
                filter:"drop-shadow(0 0 7px rgba(255,100,100,0.85))"}}/>
              ⚔️ כניסה לזירה! ⚔️
              <div style={{width:"32px",height:"32px",flexShrink:0,
                clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                background:"linear-gradient(180deg,rgba(255,255,255,0.98) 0%,#38bdf8 52%)",
                filter:"drop-shadow(0 0 7px rgba(56,189,248,0.85))"}}/>
            </Link>
          ) : (
            <button disabled style={{
              display:"flex",alignItems:"center",justifyContent:"center",gap:"14px",
              width:"100%",fontWeight:900,fontSize:"30px",padding:"20px 48px",
              background:"linear-gradient(180deg,#4a3000 0%,#2a1a00 100%)",
              borderRadius:"20px",border:"3px solid #5a3800",borderBottom:"9px solid #1a0e00",
              boxShadow:"0 14px 36px rgba(0,0,0,0.65)",color:"#7a5a20",
              cursor:"not-allowed",letterSpacing:"0.02em",
            }}>
              ⚔️ כניסה לזירה! ⚔️
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ADVENTURE WORLDS CARDS
      ══════════════════════════════════════════ */}
      <div style={{position:"relative",zIndex:20,padding:"6px 16px 10px"}}>

        <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"10px"}}>
          <span style={{color:"#fbbf24",fontSize:"17px"}}>◇</span>
          <p style={{fontWeight:900,fontSize:"15px",color:"#e2d9f3",margin:0}}>מסע ההרפתקאות שלך</p>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"10px"}}>
          {displayWorlds.map((w,idx)=>(
            <div key={idx} style={{
              borderRadius:"22px",overflow:"hidden",
              background:w.cfg.cardBg,
              border:`2px solid ${w.cfg.bdr}`,
              boxShadow:w.locked?"0 4px 18px rgba(0,0,0,0.7)":`0 12px 32px ${w.cfg.glow}`,
              opacity:w.locked?0.62:1,
              display:"flex",flexDirection:"column",
              minHeight:"195px",
            }}>
              {/* Card top */}
              <div style={{padding:"14px 14px 6px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flex:1}}>
                <div style={{flex:1}}>
                  <p style={{fontWeight:900,fontSize:"14px",color:"#fff",margin:"0 0 4px",
                    textShadow:"0 1px 8px rgba(0,0,0,0.85)",lineHeight:1.2}}>{w.name}</p>
                  <p style={{fontSize:"11px",color:"rgba(226,232,240,0.82)",margin:0,lineHeight:1.45}}>{w.desc}</p>
                </div>
                {/* Large creature illustration */}
                <div style={{
                  fontSize:"62px",lineHeight:1,marginRight:"-6px",flexShrink:0,marginTop:"-4px",
                  filter:`drop-shadow(0 6px 16px ${w.cfg.creatureBg}aa) drop-shadow(0 0 24px ${w.cfg.creatureBg}66)`,
                }}>
                  {w.locked ? "🔒" : w.cfg.creature}
                </div>
              </div>

              {/* Card bottom: progress */}
              <div style={{padding:"8px 14px 14px",borderTop:`1px solid rgba(255,255,255,0.09)`}}>
                {w.locked ? (
                  <p style={{color:"#64748b",fontSize:"12px",margin:0,display:"flex",alignItems:"center",gap:"6px"}}>
                    <span style={{fontSize:"17px"}}>🔒</span> נעלם
                  </p>
                ) : w.completed ? (
                  <div style={{display:"flex",alignItems:"center",gap:"7px"}}>
                    <div style={{flex:1,height:"9px",background:"rgba(0,0,0,0.45)",borderRadius:"999px",overflow:"hidden"}}>
                      <div style={{height:"100%",width:"100%",background:"linear-gradient(to right,#4ade80,#22c55e)",
                        borderRadius:"999px",boxShadow:"0 0 7px rgba(74,222,128,0.75)"}}/>
                    </div>
                    <span style={{color:"#4ade80",fontSize:"15px"}}>✓</span>
                  </div>
                ) : (
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                      <span style={{color:"rgba(226,232,240,0.85)",fontSize:"13px",fontWeight:700}}>
                        {w.done}/{w.total}
                      </span>
                      <span style={{fontSize:"17px"}}>📦</span>
                    </div>
                    <div style={{height:"9px",background:"rgba(0,0,0,0.5)",borderRadius:"999px",
                      border:"1px solid rgba(255,255,255,0.09)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${w.progress}%`,
                        background:"linear-gradient(to right,#4ade80,#22c55e)",borderRadius:"999px",
                        boxShadow:"0 0 7px rgba(74,222,128,0.7)"}}/>
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
      <div style={{position:"relative",zIndex:20,padding:"0 16px 18px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>

          {/* Daily Goals */}
          <div style={{borderRadius:"20px",padding:"16px",minHeight:"115px",
            background:"linear-gradient(140deg,#3e0a2a,#220818)",
            border:"1.5px solid rgba(240,80,180,0.50)",
            boxShadow:"0 6px 22px rgba(0,0,0,0.65)",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontWeight:900,fontSize:"14px",color:"#fce4ec",margin:"0 0 4px"}}>יעדים יומיים</p>
                <p style={{fontSize:"11px",color:"rgba(252,228,236,0.65)",margin:0}}>נצח 3 קרבות</p>
              </div>
              <span style={{fontSize:"32px"}}>❤️</span>
            </div>
            <div style={{marginTop:"12px"}}>
              <div style={{height:"9px",background:"rgba(0,0,0,0.5)",borderRadius:"999px",overflow:"hidden",marginBottom:"5px"}}>
                <div style={{height:"100%",width:"33%",background:"linear-gradient(to right,#4ade80,#22c55e)",
                  borderRadius:"999px",boxShadow:"0 0 7px rgba(74,222,128,0.7)"}}/>
              </div>
              <p style={{fontSize:"12px",color:"#86efac",fontWeight:700,margin:0}}>1 / 3</p>
            </div>
          </div>

          {/* Lucky Box */}
          <div style={{borderRadius:"20px",padding:"16px",minHeight:"115px",
            background:"linear-gradient(140deg,#1e1000,#2c1a00)",
            border:"1.5px solid rgba(200,140,0,0.55)",
            boxShadow:"0 6px 22px rgba(0,0,0,0.65)",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <p style={{fontWeight:900,fontSize:"14px",color:"#fde68a",margin:"0 0 4px"}}>חבב מזל</p>
                <p style={{fontSize:"11px",color:"rgba(253,230,138,0.72)",margin:0,lineHeight:1.4}}>נסה את מזלך וזכה בפרסים!</p>
              </div>
              <div style={{display:"flex",gap:"4px",flexShrink:0,alignItems:"center"}}>
                <span style={{fontSize:"32px"}}>📦</span>
                <span style={{fontSize:"22px",opacity:0.82}}>🃏</span>
              </div>
            </div>
          </div>

          {/* Crystal Store */}
          <div style={{borderRadius:"20px",padding:"16px",minHeight:"115px",
            background:"linear-gradient(140deg,#0e1e48,#061030)",
            border:"1.5px solid rgba(56,189,248,0.50)",
            boxShadow:"0 6px 22px rgba(0,0,0,0.65)",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <p style={{fontWeight:900,fontSize:"14px",color:"#bae6fd",margin:"0 0 4px"}}>חנות הקריסטלים</p>
                <p style={{fontSize:"11px",color:"rgba(186,230,253,0.72)",margin:0}}>שדרג את הגיבור שלך</p>
              </div>
              <span style={{fontSize:"36px"}}>💎</span>
            </div>
          </div>

          {/* Champions Summit */}
          <div style={{borderRadius:"20px",padding:"16px",minHeight:"115px",
            background:"linear-gradient(140deg,#420e08,#280808)",
            border:"1.5px solid rgba(220,60,40,0.50)",
            boxShadow:"0 6px 22px rgba(0,0,0,0.65)",display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <p style={{fontWeight:900,fontSize:"14px",color:"#fca5a5",margin:"0 0 4px"}}>פסגת האלופים</p>
                <p style={{fontSize:"11px",color:"rgba(252,165,165,0.72)",margin:0}}>תפס בטבלת הדירוג</p>
              </div>
              <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
                <span style={{fontSize:"32px"}}>🏆</span>
                <div style={{display:"flex",alignItems:"flex-end",gap:"2px"}}>
                  <div style={{width:"14px",height:"11px",background:"#c0c0c0",borderRadius:"3px 3px 0 0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:700,color:"#1e293b"}}>2</div>
                  <div style={{width:"14px",height:"16px",background:"#f59e0b",borderRadius:"3px 3px 0 0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:"8px",fontWeight:700,color:"#1e293b"}}>1</div>
                  <div style={{width:"14px",height:"9px",background:"#cd7c2f",borderRadius:"3px 3px 0 0",
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

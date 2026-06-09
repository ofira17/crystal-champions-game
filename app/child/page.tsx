// ══════════════════════════════════════════════════════════
// Child dashboard — background image template + functional overlays
// Visual design = /child-hub-bg.png (approved target)
// Dynamic elements overlaid at exact image positions
// ══════════════════════════════════════════════════════════

import { requireRole } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { getChildDashboardData } from "@/app/actions/child-dashboard";
import {
  mapStrategyToArenaThreat,
  GRADE_LABELS,
  type MissionType,
} from "@/lib/terminology";
import Link from "next/link";
import Image from "next/image";

// ── Hero image resolution ────────────────────────────────
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

export default async function ChildPage() {
  await requireRole("child");
  const supabase = await createClient();
  const {data:{user}} = await supabase.auth.getUser();
  if(!user) return null;

  const {profile,hero,activeAdventure,worlds,energyMax} = await getChildDashboardData();

  if(!profile){
    return(
      <main className="min-h-screen flex items-center justify-center" style={{background:"#08011a"}}>
        <p style={{color:"#a78bfa"}}>מגדיר את הפרופיל שלך...</p>
      </main>
    );
  }

  const hasAdventure  = !!activeAdventure;
  const heroType      = hero?.color_theme??"default";
  const heroName      = hero?.name_he??"הגיבור שלך";
  const heroGender    = (hero?.gender??"M") as "M"|"F";
  const gradeLabel    = profile.grade_level?(GRADE_LABELS[profile.grade_level]??""):"";
  const missionName   = activeAdventure?.story_text_he
    ? (activeAdventure.story_text_he.length>24 ? activeAdventure.story_text_he.slice(0,24)+"…" : activeAdventure.story_text_he)
    : "אימון גיבורים";
  const speechText    = hasAdventure && activeAdventure.story_text_he
    ? activeAdventure.story_text_he
    : "הגיבור שלך מוכן לנצח, לך לזירה, צבר ניצחונות – ככה אתה צומח";
  const imgSrc        = heroSrc(heroGender, heroType);

  // World progress
  const WORLD_NAMES = ["מבוא למסע","שביל האש","יער הקריסטלים","מצודת הברק","היכל האלופים"];
  const displayWorlds = WORLD_NAMES.map((name,i) => {
    const dbW = worlds[i];
    return {
      name:     dbW?.name_he     || name,
      locked:   dbW ? !dbW.is_unlocked : i>2,
      done:     dbW ? Math.round((dbW.progress_percent/100)*10) : 0,
      total:    10,
      progress: dbW?.progress_percent ?? 0,
      completed:dbW?.is_completed ?? false,
    };
  });

  return (
    <>
      <style>{`
        html,body{margin:0;padding:0;overflow:hidden}
        .arena-btn:hover{filter:brightness(1.12) saturate(1.1);transform:scale(1.015)}
        .arena-btn:active{transform:scale(0.98)}
        .hero-link:hover{filter:drop-shadow(0 0 32px rgba(56,189,248,1)) drop-shadow(0 0 60px rgba(56,189,248,0.6)) brightness(1.08)}
      `}</style>

      {/* ── ROOT: full viewport, bg image fills everything ── */}
      <main dir="rtl" style={{
        position:"fixed",inset:0,
        backgroundImage:"url('/child-hub-bg.png')",
        backgroundSize:"cover",
        backgroundPosition:"center top",
        backgroundRepeat:"no-repeat",
        overflow:"hidden",
        fontFamily:"'Segoe UI',Arial,sans-serif",
      }}>

        {/* ══════════════════════════════════════════
            TOP BAR — dynamic data overlaid
            Image top bar is ~0-8.3% height (72px on 864px)
        ══════════════════════════════════════════ */}
        <div style={{
          position:"absolute",top:0,left:0,right:0,height:"8.3%",
          display:"flex",alignItems:"center",
          padding:"0 1.2% 0 1%",gap:"0.5%",
          zIndex:20,
        }}>
          {/* Logo area — far right in image (RTL) */}
          <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:"6px"}}>
            <div style={{width:44,height:44,borderRadius:"50%",
              background:"rgba(10,4,28,0.0)",flexShrink:0}}/>
          </div>

          {/* Rankings button — transparent hotspot */}
          <button style={{
            flexShrink:0,padding:"8px 18px",borderRadius:22,
            background:"transparent",border:"none",cursor:"pointer",
            color:"transparent",fontSize:13,fontWeight:700,
          }}>דירוגים</button>

          <div style={{flex:1}}/>

          {/* Crystal power — dynamic crystals */}
          <div style={{
            display:"flex",alignItems:"center",gap:5,flexShrink:0,
            background:"rgba(6,14,36,0.55)",
            border:"1.5px solid rgba(70,140,255,0.35)",
            borderRadius:22,padding:"6px 14px",
            backdropFilter:"blur(6px)",
          }}>
            <span style={{color:"#a5d4ff",fontSize:11,fontWeight:900,whiteSpace:"nowrap"}}>כוח קריסטל</span>
            <div style={{display:"flex",gap:3,alignItems:"center"}}>
              {Array.from({length:energyMax}).map((_,i)=>(
                <div key={i} style={{
                  width:13,height:13,
                  clipPath:"polygon(50% 0%,100% 30%,80% 100%,20% 100%,0% 30%)",
                  background:i<profile.energy
                    ?"linear-gradient(180deg,#fff 0%,#38bdf8 40%,#0891b2 100%)"
                    :"rgba(20,45,100,0.7)",
                  filter:i<profile.energy?"drop-shadow(0 0 4px rgba(56,189,248,0.9))":"none",
                }}/>
              ))}
              <div style={{width:13,height:13,transform:"rotate(45deg)",
                background:"rgba(6,14,44,0.85)",border:"1.5px solid rgba(70,110,200,0.4)"}}/>
            </div>
            <span style={{color:"#67e8f9",fontSize:16}}>⚡</span>
          </div>

          {/* XP */}
          <div style={{
            display:"flex",alignItems:"center",gap:6,flexShrink:0,
            background:"rgba(18,6,44,0.55)",
            border:"1.5px solid rgba(120,80,240,0.35)",
            borderRadius:22,padding:"6px 14px",backdropFilter:"blur(6px)",
          }}>
            <span style={{color:"#ede9fe",fontWeight:900,fontSize:13,whiteSpace:"nowrap"}}>
              XP {profile.total_xp.toLocaleString("he-IL")}
            </span>
            <span style={{color:"#fbbf24",fontSize:16}}>⭐</span>
          </div>

          {/* Stars */}
          <div style={{
            display:"flex",alignItems:"center",gap:6,flexShrink:0,
            background:"rgba(28,14,0,0.55)",
            border:"1.5px solid rgba(200,130,0,0.35)",
            borderRadius:22,padding:"6px 14px",backdropFilter:"blur(6px)",
          }}>
            <span style={{color:"#fef3c7",fontWeight:900,fontSize:13}}>{profile.total_stars.toLocaleString("he-IL")}</span>
            <span style={{color:"#fbbf24",fontSize:16}}>⭐</span>
          </div>

          {/* Coins */}
          <div style={{
            display:"flex",alignItems:"center",gap:6,flexShrink:0,
            background:"rgba(18,10,0,0.55)",
            border:"1.5px solid rgba(160,100,0,0.35)",
            borderRadius:22,padding:"6px 14px",backdropFilter:"blur(6px)",
          }}>
            <span style={{color:"#fef3c7",fontWeight:900,fontSize:13}}>{profile.total_coins.toLocaleString("he-IL")}</span>
            <span style={{fontSize:16}}>🪙</span>
          </div>

          <div style={{width:8}}/>

          {/* Icon buttons — hotspots */}
          {[["📜","חדשות"],["🎁","מתנות"],["⚙️","הגדרות"]].map(([icon,lbl],i)=>(
            <button key={lbl} style={{
              position:"relative",width:42,height:42,borderRadius:"50%",
              display:"flex",alignItems:"center",justifyContent:"center",
              background:"rgba(14,7,40,0.55)",border:"1.5px solid rgba(110,70,190,0.4)",
              cursor:"pointer",fontSize:19,flexShrink:0,backdropFilter:"blur(6px)",
            }}>
              {icon}
              {i===1&&<div style={{position:"absolute",top:"-2px",right:"-2px",width:10,height:10,
                borderRadius:"50%",background:"#ef4444",border:"2px solid #0e0528"}}/>}
            </button>
          ))}

          {/* User avatar */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0,marginRight:4}}>
            <div style={{textAlign:"right"}}>
              <p style={{color:"white",fontWeight:700,fontSize:13,lineHeight:1,margin:0}}>{profile.display_name_he}</p>
              {gradeLabel&&<p style={{color:"#c4b5fd",fontSize:10,lineHeight:1,marginTop:2,margin:0}}>{gradeLabel}</p>}
            </div>
            <div style={{
              width:44,height:44,borderRadius:"50%",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:19,fontWeight:900,color:"white",overflow:"hidden",
              background:"linear-gradient(135deg,#6022c8,#3c10a8)",
              border:"2.5px solid #a78bfa",
              boxShadow:"0 0 18px rgba(124,58,237,0.8)",
            }}>
              {profile.display_name_he.charAt(0)}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            MISSION TITLE — center, ~9-20% from top
        ══════════════════════════════════════════ */}
        <div style={{
          position:"absolute",top:"8.5%",left:0,right:0,
          display:"flex",flexDirection:"column",alignItems:"center",
          zIndex:20,pointerEvents:"none",
        }}>
          <p style={{
            color:"#c4b5fd",fontSize:13,fontWeight:700,margin:"0 0 3px",
            letterSpacing:"0.05em",textShadow:"0 1px 6px rgba(0,0,0,0.9)",
          }}>המרתף המנצחית ⚡</p>
          <h1 style={{
            color:"white",fontSize:"clamp(24px,3.2vw,42px)",fontWeight:900,
            margin:"0 0 3px",
            textShadow:"0 2px 20px rgba(160,100,255,0.8),0 0 8px rgba(0,0,0,0.95)",
            letterSpacing:"-0.01em",lineHeight:1,
          }}>{missionName}</h1>
          {hasAdventure ? (
            <p style={{color:"#a78bfa",fontSize:12,fontWeight:700,margin:0,
              textShadow:"0 1px 6px rgba(0,0,0,0.9)"}}>
              התקדמות מסע ✗
            </p>
          ) : (
            <p style={{color:"#64748b",fontSize:12,margin:0,textShadow:"0 1px 6px rgba(0,0,0,0.9)"}}>
              ⚔️ אין הרפתקה פעילה
            </p>
          )}
        </div>

        {/* ══════════════════════════════════════════
            SPEECH BUBBLE — ~24-50% from top, right ~48-66%
        ══════════════════════════════════════════ */}
        <div style={{
          position:"absolute",
          top:"22%",right:"51%",
          width:"min(260px,18vw)",
          zIndex:20,pointerEvents:"none",
        }}>
          <div style={{
            background:"rgba(255,255,255,0.97)",borderRadius:22,
            padding:"16px 18px",
            boxShadow:"0 8px 32px rgba(0,0,0,0.75),0 2px 8px rgba(100,40,200,0.4)",
            border:"2px solid rgba(255,255,255,0.96)",position:"relative",
          }}>
            <div style={{
              position:"absolute",top:-13,left:16,
              width:26,height:26,borderRadius:"50%",
              background:"linear-gradient(135deg,#a855f7,#7c3aed)",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:"0 3px 10px rgba(124,58,237,0.65)",
            }}>
              <span style={{fontSize:12}}>💎</span>
            </div>
            <div style={{
              position:"absolute",bottom:32,left:-18,width:0,height:0,
              borderTop:"10px solid transparent",borderBottom:"10px solid transparent",
              borderRight:"20px solid rgba(255,255,255,0.97)",
            }}/>
            <p style={{fontWeight:700,fontSize:13,lineHeight:1.55,color:"#2e1065",margin:0}}>
              {speechText.length>80 ? speechText.slice(0,80)+"…" : speechText}
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            HERO — center stage, large
        ══════════════════════════════════════════ */}
        <div style={{
          position:"absolute",
          top:"12%",
          left:"50%",transform:"translateX(-50%)",
          display:"flex",flexDirection:"column",alignItems:"center",
          zIndex:20,
        }}>
          {/* Ambient glow */}
          <div style={{
            position:"absolute",top:"10%",left:"50%",transform:"translateX(-50%)",
            width:"min(600px,45vw)",height:"min(380px,38vh)",pointerEvents:"none",
            background:"radial-gradient(ellipse,rgba(56,189,248,0.55) 0%,rgba(100,120,255,0.35) 28%,rgba(140,90,255,0.18) 52%,transparent 72%)",
            filter:"blur(32px)",
          }}/>

          <Link href="/child/heroes" className="hero-link" style={{
            display:"block",position:"relative",zIndex:10,
            filter:hasAdventure
              ?"drop-shadow(0 0 24px rgba(56,189,248,0.85)) drop-shadow(0 0 48px rgba(56,189,248,0.4))"
              :"drop-shadow(0 0 22px rgba(124,58,237,0.75)) drop-shadow(0 0 44px rgba(124,58,237,0.35))",
            transition:"filter 0.2s,transform 0.2s",
          }}>
            <Image
              src={imgSrc}
              alt={heroName}
              width={340}
              height={460}
              style={{
                width:"min(300px,22vw)",
                height:"min(410px,42vh)",
                objectFit:"contain",
                objectPosition:"center bottom",
                display:"block",
              }}
              unoptimized
              priority
            />
          </Link>

          {/* Pedestal glow */}
          <div style={{marginTop:"-16px",zIndex:9,position:"relative"}}>
            <div style={{
              width:"min(280px,20vw)",height:26,
              background:"radial-gradient(ellipse,rgba(56,189,248,0.9) 0%,rgba(30,65,190,0.6) 52%,transparent 100%)",
              borderRadius:"50%",
              boxShadow:"0 0 55px 22px rgba(56,189,248,0.65)",
            }}/>
          </div>

          {/* Hero name */}
          <p style={{
            fontWeight:900,fontSize:17,color:"white",margin:"8px 0 0",
            textShadow:"0 2px 12px rgba(0,0,0,0.9)",letterSpacing:"-0.01em",
            pointerEvents:"none",
          }}>
            {heroName} 🛡️
          </p>
        </div>

        {/* ══════════════════════════════════════════
            ARENA BUTTON — ~76-85% from top, center
        ══════════════════════════════════════════ */}
        <div style={{
          position:"absolute",
          top:"74%",left:"50%",transform:"translateX(-50%)",
          width:"min(640px,44%)",
          zIndex:25,
        }}>
          {hasAdventure ? (
            <Link href={`/child/arena?adventure=${activeAdventure.id}`}
              className="arena-btn"
              style={{
                display:"flex",alignItems:"center",justifyContent:"center",gap:14,
                textDecoration:"none",fontWeight:900,
                fontSize:"clamp(20px,2.4vw,32px)",
                padding:"clamp(14px,1.8vh,22px) 40px",
                background:"linear-gradient(180deg,#fde68a 0%,#f59e0b 25%,#d97706 60%,#b45309 100%)",
                borderRadius:18,border:"3px solid #fbbf24",borderBottom:"8px solid #78350f",
                boxShadow:"0 0 60px rgba(245,158,11,0.75),0 12px 32px rgba(0,0,0,0.65),inset 0 2px 0 rgba(255,255,255,0.5)",
                color:"#1c0a00",letterSpacing:"0.02em",width:"100%",
                transition:"filter 0.15s,transform 0.1s",
              }}>
              ⚔️ כניסה לזירה! ⚔️
            </Link>
          ) : (
            <button disabled style={{
              display:"flex",alignItems:"center",justifyContent:"center",gap:14,
              width:"100%",fontWeight:900,fontSize:"clamp(20px,2.4vw,32px)",
              padding:"clamp(14px,1.8vh,22px) 40px",
              background:"linear-gradient(180deg,#4a3000 0%,#2a1a00 100%)",
              borderRadius:18,border:"3px solid #5a3800",borderBottom:"8px solid #1a0e00",
              boxShadow:"0 12px 32px rgba(0,0,0,0.65)",color:"#7a5a20",cursor:"not-allowed",
            }}>
              ⚔️ כניסה לזירה! ⚔️
            </button>
          )}
        </div>

        {/* ══════════════════════════════════════════
            WORLD CARDS ROW — ~84-94% from top
        ══════════════════════════════════════════ */}
        <div style={{
          position:"absolute",
          top:"84%",left:0,right:0,
          padding:"0 1%",
          zIndex:20,
        }}>
          <div style={{
            display:"flex",alignItems:"center",gap:6,marginBottom:6,padding:"0 0.5%",
          }}>
            <span style={{color:"#fbbf24",fontSize:14}}>◇</span>
            <span style={{fontWeight:900,fontSize:13,color:"#e2d9f3",
              textShadow:"0 1px 6px rgba(0,0,0,0.9)"}}>
              מסע ההרפתקאות שלך
            </span>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:"0.7%"}}>
            {displayWorlds.map((w,idx)=>{
              const CARD_COLORS=[
                {bg:"rgba(80,10,80,0.72)",bdr:"rgba(190,70,210,0.6)"},
                {bg:"rgba(80,24,0,0.72)",bdr:"rgba(210,90,20,0.6)"},
                {bg:"rgba(4,50,22,0.72)",bdr:"rgba(20,175,70,0.6)"},
                {bg:"rgba(10,24,80,0.72)",bdr:"rgba(50,110,220,0.6)"},
                {bg:"rgba(44,26,0,0.72)",bdr:"rgba(195,140,15,0.6)"},
              ];
              const col=CARD_COLORS[idx];
              return(
                <div key={idx} style={{
                  borderRadius:16,overflow:"hidden",
                  background:col.bg,
                  border:`1.5px solid ${col.bdr}`,
                  backdropFilter:"blur(10px)",
                  padding:"10px 11px 10px",
                  opacity:w.locked?0.55:1,
                  minHeight:"clamp(80px,9vh,105px)",
                  display:"flex",flexDirection:"column",justifyContent:"space-between",
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <p style={{fontWeight:900,fontSize:12,color:"white",margin:0,
                      textShadow:"0 1px 6px rgba(0,0,0,0.9)",lineHeight:1.3}}>{w.name}</p>
                    <span style={{fontSize:22,lineHeight:1,flexShrink:0,marginTop:-2}}>
                      {w.locked?"🔒":["💗","🔥","🌲","⚡","🏆"][idx]}
                    </span>
                  </div>
                  <div style={{marginTop:6}}>
                    {w.locked ? (
                      <p style={{color:"#64748b",fontSize:11,margin:0}}>נעלם</p>
                    ) : w.completed ? (
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <div style={{flex:1,height:7,background:"rgba(0,0,0,0.4)",borderRadius:999,overflow:"hidden"}}>
                          <div style={{height:"100%",width:"100%",
                            background:"linear-gradient(to right,#4ade80,#22c55e)",borderRadius:999}}/>
                        </div>
                        <span style={{color:"#4ade80",fontSize:13}}>✓</span>
                      </div>
                    ) : (
                      <>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{color:"rgba(226,232,240,0.9)",fontSize:11,fontWeight:700}}>
                            {w.done}/{w.total}
                          </span>
                          <span style={{fontSize:14}}>📦</span>
                        </div>
                        <div style={{height:7,background:"rgba(0,0,0,0.45)",borderRadius:999,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${w.progress}%`,
                            background:"linear-gradient(to right,#4ade80,#22c55e)",borderRadius:999,
                            boxShadow:"0 0 6px rgba(74,222,128,0.65)"}}/>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            FEATURE CARDS — ~94-100%
        ══════════════════════════════════════════ */}
        <div style={{
          position:"absolute",
          top:"94%",left:0,right:0,
          padding:"0 1%",
          zIndex:20,
        }}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.7%"}}>

            {/* Daily goals */}
            <div style={{borderRadius:14,padding:"10px 12px",
              background:"rgba(48,8,30,0.72)",border:"1.5px solid rgba(235,70,170,0.45)",
              backdropFilter:"blur(10px)",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              minHeight:"clamp(48px,5.5vh,68px)",
            }}>
              <div>
                <p style={{fontWeight:900,fontSize:12,color:"#fce4ec",margin:0}}>יעדים יומיים</p>
                <p style={{fontSize:10,color:"rgba(252,228,236,0.7)",margin:"2px 0 0"}}>נצח 3 קרבות • 1/3</p>
              </div>
              <span style={{fontSize:26}}>❤️</span>
            </div>

            {/* Lucky box */}
            <div style={{borderRadius:14,padding:"10px 12px",
              background:"rgba(26,14,0,0.72)",border:"1.5px solid rgba(195,130,0,0.45)",
              backdropFilter:"blur(10px)",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              minHeight:"clamp(48px,5.5vh,68px)",
            }}>
              <div>
                <p style={{fontWeight:900,fontSize:12,color:"#fde68a",margin:0}}>חבב מזל</p>
                <p style={{fontSize:10,color:"rgba(253,230,138,0.7)",margin:"2px 0 0"}}>נסה את מזלך וזכה בפרסים!</p>
              </div>
              <div style={{display:"flex",gap:3,alignItems:"center"}}>
                <span style={{fontSize:24}}>📦</span>
                <span style={{fontSize:18,opacity:0.85}}>🃏</span>
              </div>
            </div>

            {/* Crystal store */}
            <div style={{borderRadius:14,padding:"10px 12px",
              background:"rgba(8,20,52,0.72)",border:"1.5px solid rgba(50,170,240,0.45)",
              backdropFilter:"blur(10px)",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              minHeight:"clamp(48px,5.5vh,68px)",
            }}>
              <div>
                <p style={{fontWeight:900,fontSize:12,color:"#bae6fd",margin:0}}>חנות הקריסטלים</p>
                <p style={{fontSize:10,color:"rgba(186,230,253,0.7)",margin:"2px 0 0"}}>שדרג את הגיבור שלך</p>
              </div>
              <span style={{fontSize:28}}>💎</span>
            </div>

            {/* Champions summit */}
            <div style={{borderRadius:14,padding:"10px 12px",
              background:"rgba(46,8,8,0.72)",border:"1.5px solid rgba(210,50,30,0.45)",
              backdropFilter:"blur(10px)",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              minHeight:"clamp(48px,5.5vh,68px)",
            }}>
              <div>
                <p style={{fontWeight:900,fontSize:12,color:"#fca5a5",margin:0}}>פסגת האלופים</p>
                <p style={{fontSize:10,color:"rgba(252,165,165,0.7)",margin:"2px 0 0"}}>תפס בטבלת הדירוג</p>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                <span style={{fontSize:22}}>🏆</span>
                <div style={{display:"flex",alignItems:"flex-end",gap:1}}>
                  <div style={{width:12,height:9,background:"#c0c0c0",borderRadius:"2px 2px 0 0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:"#1e293b"}}>2</div>
                  <div style={{width:12,height:14,background:"#f59e0b",borderRadius:"2px 2px 0 0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:"#1e293b"}}>1</div>
                  <div style={{width:12,height:7,background:"#cd7c2f",borderRadius:"2px 2px 0 0",
                    display:"flex",alignItems:"center",justifyContent:"center",fontSize:7,fontWeight:700,color:"#1e293b"}}>3</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </main>
    </>
  );
}

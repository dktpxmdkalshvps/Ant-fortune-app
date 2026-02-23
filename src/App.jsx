import { useState, useEffect, useRef } from "react";
import {
  OH_COLOR, OH_BG, OH_CHAR,
  AMULET_TIPS,
  HOURS_LIST, ZODIACS_LIST, ZODIAC_META, ZODIAC_SECTOR
} from "./data/fortuneData.js";
import {
  analyzeSaju, analyzeZodiac, getTodayStr, getZodiac, pickByDate, isValidDate
} from "./utils/sajuUtils.js";

// ════════════════════════════════════════════════════════════════
//  ④ 디자인 & 컴포넌트
// ════════════════════════════════════════════════════════════════

const C = {
  bg:"#04070D", panel:"#0B1120", panel2:"#101828",
  gold:"#C9A84C", goldL:"#F0D080", goldD:"#8B6820",
  jade:"#3EBFA0", red:"#FF3B3B", blue:"#3B8BFF",
  dim:"#4A5870", mid:"#8A9BBC", bright:"#DCE6F4",
  border:"rgba(201,168,76,0.16)",
};
const F = {
  serif:"'Noto Serif KR',serif",
  mono:"'Share Tech Mono',monospace",
  display:"'Cinzel Decorative',serif",
};

// ── 별 배경 ──
function StarField() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current, ctx = cv.getContext("2d");
    let raf;
    const stars = [];
    const resize = () => {
      cv.width = innerWidth;
      cv.height = innerHeight;
      stars.length = 0;
      for (let i = 0; i < 220; i++)
        stars.push({
          x: Math.random() * cv.width,
          y: Math.random() * cv.height,
          r: Math.random() * 1.4 + 0.2,
          op: Math.random() * 0.6 + 0.1,
          spd: Math.random() * 0.015 + 0.003,
          ph: Math.random() * Math.PI * 2,
        });
    };
    resize();
    const draw = t => {
      ctx.clearRect(0,0,cv.width,cv.height);
      // 은하 흐름 그라디언트
      const grd = ctx.createRadialGradient(cv.width*.4,cv.height*.3,50,cv.width*.4,cv.height*.3,cv.width*.6);
      grd.addColorStop(0,"rgba(201,168,76,.04)");
      grd.addColorStop(1,"transparent");
      ctx.fillStyle=grd; ctx.fillRect(0,0,cv.width,cv.height);
      stars.forEach(s=>{
        ctx.globalAlpha=s.op*(0.45+0.55*Math.sin((t/1000)*s.spd*10+s.ph));
        ctx.fillStyle="#fff"; ctx.beginPath();
        ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      });
      ctx.globalAlpha=1; raf=requestAnimationFrame(draw);
    };
    raf=requestAnimationFrame(draw);
    window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}/>;
}

// ── 공통 UI ──
function Panel({children,ac=C.gold,style={}}) {
  return (
    <div style={{background:C.panel,border:`1px solid ${ac}25`,borderRadius:10,
      padding:24,position:"relative",overflow:"hidden",...style}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,
        background:`linear-gradient(90deg,transparent,${ac}BB,transparent)`}}/>
      {children}
    </div>
  );
}

function STitle({icon,children,color=C.gold}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20,
      fontFamily:F.mono,fontSize:10.5,color,letterSpacing:3.5,textTransform:"uppercase"}}>
      {icon&&<span style={{fontSize:14}}>{icon}</span>}
      {children}
      <span style={{flex:1,height:1,background:`linear-gradient(90deg,${color}50,${color}20,transparent)`}}/>
    </div>
  );
}

function Sel({label,value,onChange,children}) {
  return (
    <div style={{flex:"1 1 110px"}}>
      <div style={{fontFamily:F.mono,fontSize:9.5,color:C.dim,letterSpacing:2.5,marginBottom:7}}>{label}</div>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{
        width:"100%",background:C.panel2,border:`1px solid rgba(201,168,76,.2)`,
        borderRadius:5,color:C.bright,fontFamily:F.mono,fontSize:12.5,padding:"11px 13px",outline:"none"}}>
        {children}
      </select>
    </div>
  );
}
function Inp({label,...props}) {
  return (
    <div style={{flex:"1 1 110px"}}>
      <div style={{fontFamily:F.mono,fontSize:9.5,color:C.dim,letterSpacing:2.5,marginBottom:7}}>{label}</div>
      <input {...props} style={{width:"100%",background:C.panel2,
        border:`1px solid rgba(201,168,76,.2)`,borderRadius:5,
        color:C.bright,fontFamily:F.mono,fontSize:12.5,padding:"11px 13px",outline:"none",...props.style}}/>
    </div>
  );
}

function BigBtn({onClick,disabled,children}) {
  const [h,setH]=useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
      style={{width:"100%",marginTop:12,padding:"16px",
        background:h?"rgba(201,168,76,.22)":"rgba(201,168,76,.1)",
        border:`1px solid ${h?C.gold:C.goldD}`,borderRadius:6,
        color:h?C.goldL:C.gold,fontFamily:F.serif,fontSize:15,
        fontWeight:700,letterSpacing:4,cursor:disabled?"not-allowed":"pointer",
        opacity:disabled?.5:1,transition:"all .3s",
        boxShadow:h?"0 0 24px rgba(201,168,76,.4)":"none"}}>
      {children}
    </button>
  );
}

// ── 시장 시계 ──
function Clock() {
  const [info,setInfo]=useState({kr:"",us:"",krO:false,usO:false});
  useEffect(()=>{
    const tick=()=>{
      const n=new Date(),kr=((n.getUTCHours()+9)%24+24)%24,us=((n.getUTCHours()-5)%24+24)%24;
      const m=String(n.getUTCMinutes()).padStart(2,"0");
      setInfo({kr:`KR ${String(kr).padStart(2,"0")}:${m}`,us:`US ${String(us).padStart(2,"0")}:${m}`,
        krO:kr>=9&&kr<16,usO:us>=9&&us<16});
    };
    tick();const t=setInterval(tick,30000);return()=>clearInterval(t);
  },[]);
  return (
    <div style={{display:"flex",justifyContent:"center",gap:16,marginBottom:28}}>
      {[[info.kr,info.krO,C.gold],[info.us,info.usO,C.jade]].map(([label,open,col],i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:C.panel,
          border:`1px solid ${col}22`,borderRadius:100,padding:"7px 18px",
          fontFamily:F.mono,fontSize:11.5}}>
          <span style={{width:6,height:6,borderRadius:"50%",background:col,
            boxShadow:`0 0 8px ${col}`,animation:"pulse 2s infinite"}}/>
          {label} {open?"🟢 장중":"⚫ 장외"}
        </div>
      ))}
    </div>
  );
}

// ── 일진 배지 ──
function IljinBadge({iljin}) {
  if (!iljin) return null;
  return (
    <div style={{display:"flex",alignItems:"center",background:C.panel2,
      border:`1px solid ${OH_COLOR[iljin.ganOh]}30`,borderRadius:8,padding:"12px 18px",
      marginBottom:14,flexWrap:"wrap",gap:16}}>
      <div style={{fontFamily:F.mono,fontSize:10,color:C.dim,letterSpacing:2}}>오늘 일진</div>
      <div style={{fontFamily:F.serif,fontSize:22,color:OH_COLOR[iljin.ganOh],
        textShadow:`0 0 16px ${OH_COLOR[iljin.ganOh]}88`,letterSpacing:4}}>
        {iljin.ganChr}{iljin.jiChr}
      </div>
      <div style={{fontFamily:F.serif,fontSize:13,color:C.mid}}>
        ({iljin.ganKr}{iljin.jiKr}일) &nbsp;{iljin.ani}의 날
      </div>
      <div style={{marginLeft:"auto",display:"flex",gap:8}}>
        {[{label:"일간",oh:iljin.ganOh},{label:"일지",oh:iljin.jiOh}].map(({label,oh})=>(
          <span key={label} style={{fontFamily:F.mono,fontSize:10,padding:"3px 10px",
            borderRadius:100,background:OH_BG[oh],color:OH_COLOR[oh],
            border:`1px solid ${OH_COLOR[oh]}40`}}>
            {label} {OH_CHAR[oh]}({oh})
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 사주 팔자 표 ──
function PillarTable({pillars}) {
  const cols = [
    { key:"yeon", label:"연주(年柱)", sub:"생년" },
    { key:"wol",  label:"월주(月柱)", sub:"생월" },
    { key:"il",   label:"일주(日柱)", sub:"생일 ★" },
    { key:"si",   label:"시주(時柱)", sub:"생시" },
  ];
  return (
    <div className="grid-pillars">
      {cols.map(({key,label,sub})=>{
        const p = pillars[key];
        if (!p) return (
          <div key={key} style={{background:C.panel2,border:`1px solid ${C.border}`,
            borderRadius:7,padding:"12px 8px",textAlign:"center",opacity:.4}}>
            <div style={{fontFamily:F.mono,fontSize:9,color:C.dim,letterSpacing:2,marginBottom:8}}>{label}</div>
            <div style={{fontSize:26,color:C.dim}}>—</div>
            <div style={{fontFamily:F.mono,fontSize:8,color:C.dim,marginTop:8}}>{sub}</div>
          </div>
        );
        const isMost = key==="il";
        return (
          <div key={key} style={{background:isMost?"rgba(201,168,76,.08)":C.panel2,
            border:`1px solid ${isMost?C.gold+"50":C.border}`,borderRadius:7,
            padding:"12px 8px",textAlign:"center"}}>
            <div style={{fontFamily:F.mono,fontSize:9,color:isMost?C.gold:C.dim,letterSpacing:2,marginBottom:6}}>{label}</div>
            <div style={{fontSize:28,letterSpacing:2,lineHeight:1.1}}>
              <span style={{color:OH_COLOR[p.ganOh],textShadow:`0 0 10px ${OH_COLOR[p.ganOh]}66`}}>{p.ganChr}</span>
              <br/>
              <span style={{color:OH_COLOR[p.jiOh],textShadow:`0 0 10px ${OH_COLOR[p.jiOh]}66`}}>{p.jiChr}</span>
            </div>
            <div style={{fontFamily:F.mono,fontSize:9,color:C.dim,marginTop:6}}>{p.ganKr}{p.jiKr}</div>
            <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:6}}>
              <span style={{fontSize:9,padding:"2px 6px",borderRadius:100,
                background:OH_BG[p.ganOh],color:OH_COLOR[p.ganOh]}}>{OH_CHAR[p.ganOh]}</span>
              <span style={{fontSize:9,padding:"2px 6px",borderRadius:100,
                background:OH_BG[p.jiOh],color:OH_COLOR[p.jiOh]}}>{OH_CHAR[p.jiOh]}</span>
            </div>
            <div style={{fontFamily:F.mono,fontSize:8,color:isMost?C.gold:C.dim,marginTop:6}}>{sub}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── 오행 게이지 ──
function OhaengGauge({score,lacking,dominant}) {
  const items = ["목","화","토","금","수"];
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        {items.map(oh=>{
          const val=score[oh]??20, isLack=oh===lacking, isDom=oh===dominant;
          return (
            <div key={oh} style={{flex:1,background:OH_BG[oh],
              border:`1px solid ${isLack?"#FFD700":isDom?"#FF7055":OH_COLOR[oh]+"40"}`,
              borderRadius:7,padding:"10px 6px",textAlign:"center",position:"relative"}}>
              {isLack&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
                fontSize:9,color:"#FFD700",whiteSpace:"nowrap",fontFamily:F.mono}}>부족</div>}
              {isDom&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
                fontSize:9,color:"#FF8070",whiteSpace:"nowrap",fontFamily:F.mono}}>과다</div>}
              <div style={{fontSize:20,color:OH_COLOR[oh],
                textShadow:`0 0 12px ${OH_COLOR[oh]}88`,marginBottom:3}}>{OH_CHAR[oh]}</div>
              <div style={{fontFamily:F.mono,fontSize:10,color:OH_COLOR[oh]}}>{oh}</div>
              <div style={{fontFamily:F.serif,fontSize:14,fontWeight:700,
                color:OH_COLOR[oh],margin:"4px 0"}}>{val}%</div>
              <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,.06)",marginTop:4}}>
                <div style={{height:"100%",borderRadius:2,background:OH_COLOR[oh],
                  width:`${val}%`,transition:"width 1.2s ease",
                  boxShadow:`0 0 6px ${OH_COLOR[oh]}80`}}/>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{fontFamily:F.mono,fontSize:11,color:C.dim,textAlign:"center",letterSpacing:1}}>
        ⬆ 보충 필요&nbsp;<span style={{color:"#FFD700"}}>{OH_CHAR[lacking]}({lacking})</span>
        &nbsp;&nbsp;⬇ 과다&nbsp;<span style={{color:"#FF8070"}}>{OH_CHAR[dominant]}({dominant})</span>
      </div>
    </div>
  );
}

// ── 스탠스 배너 ──
function StanceBanner({stance}) {
  const cfg = {
    STRONG_BUY:{ color:"#FF3B3B", bg:"rgba(255,59,59,.1)",  bd:"rgba(255,59,59,.32)",  emoji:"🔴" },
    HOLD:      { color:C.goldL,   bg:"rgba(201,168,76,.1)", bd:"rgba(201,168,76,.32)", emoji:"⚖️" },
    SELL:      { color:"#3B8BFF", bg:"rgba(59,139,255,.1)", bd:"rgba(59,139,255,.32)", emoji:"🔵" },
  }[stance.code]||{ color:C.goldL, bg:"rgba(201,168,76,.1)", bd:"rgba(201,168,76,.32)", emoji:"⚖️" };
  return (
    <div style={{borderRadius:10,padding:"26px 20px",textAlign:"center",marginBottom:14,
      background:cfg.bg,border:`1px solid ${cfg.bd}`,animation:"fadeUp .5s ease"}}>
      <div style={{fontFamily:F.mono,fontSize:10,letterSpacing:4,color:C.dim,marginBottom:8}}>
        TODAY'S INVESTMENT STANCE
      </div>
      <div style={{fontFamily:F.display,fontSize:"clamp(20px,4vw,36px)",fontWeight:700,
        color:cfg.color,textShadow:`0 0 30px ${cfg.color}99`,marginBottom:8}}>
        {cfg.emoji} {stance.kr}
      </div>
      <div style={{fontFamily:F.serif,fontSize:13.5,color:C.mid}}>{stance.title}</div>
    </div>
  );
}

// ── 섹터 리스트 ──
function SectorList({sectors}) {
  const sigCfg = s => ({
    BUY:  {bg:"rgba(255,59,59,.13)", color:"#FF5B5B",bd:"rgba(255,59,59,.28)", label:"매수"},
    WATCH:{bg:"rgba(201,168,76,.11)",color:C.gold,   bd:"rgba(201,168,76,.28)",label:"관망"},
    AVOID:{bg:"rgba(59,139,255,.11)",color:"#5B9BFF",bd:"rgba(59,139,255,.28)",label:"회피"},
  }[s]||{bg:"transparent",color:C.dim,bd:C.border,label:s});
  return (
    <div>
      {(sectors||[]).map((sec,i)=>{
        const sc=sigCfg(sec.signal);
        return (
          <div key={i} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0",
            borderBottom:i<sectors.length-1?"1px solid rgba(255,255,255,.04)":"none",fontSize:12.5}}>
            <span style={{fontFamily:F.mono,fontSize:9,color:C.dim,width:18}}>0{i+1}</span>
            <span style={{flex:1,color:C.bright}}>{sec.name}</span>
            <span style={{fontSize:10.5,color:C.dim,flex:1,padding:"0 6px"}}>{sec.reason}</span>
            <span style={{fontFamily:F.mono,fontSize:10,padding:"2px 9px",borderRadius:3,
              background:sc.bg,color:sc.color,border:`1px solid ${sc.bd}`}}>{sc.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── 시장 패널 ──
function MarketPanel({isDay,themes=[],sectors=[]}) {
  const ac=isDay?C.gold:C.jade;
  return (
    <Panel ac={ac} style={{minHeight:0}}>
      <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14,
        paddingBottom:13,borderBottom:`1px solid ${ac}20`}}>
        <span style={{fontSize:20}}>{isDay?"☀️":"🌙"}</span>
        <div>
          <div style={{fontFamily:F.serif,fontWeight:700,fontSize:14}}>{isDay?"낮의 장":"밤의 장"}</div>
          <div style={{fontFamily:F.mono,fontSize:9,color:C.dim,letterSpacing:2}}>
            {isDay?"KOSPI · KOSDAQ":"NYSE · NASDAQ"}
          </div>
        </div>
        <div style={{marginLeft:"auto",fontFamily:F.mono,fontSize:10,color:ac}}>
          {isDay?"KR MARKET":"US MARKET"}
        </div>
      </div>
      <div style={{marginBottom:12}}>
        {themes.map((t,i)=>(
          <span key={i} style={{display:"inline-block",padding:"3px 11px",borderRadius:100,
            fontSize:11,fontFamily:F.mono,margin:"3px 3px 3px 0",letterSpacing:.5,
            background:`${ac}18`,border:`1px solid ${ac}38`,color:ac}}>{t}</span>
        ))}
      </div>
      <SectorList sectors={sectors}/>
    </Panel>
  );
}

// ── 행운 패널 ──
function LuckyPanel({lucky, extra=0}) {
  const [pop,setPop]=useState(false);
  if(!lucky)return null;
  const tip = pickByDate(AMULET_TIPS, extra);
  return (
    <Panel>
      <STitle icon="✦">오늘의 행운 아이템</STitle>
      <div className="grid-lucky">
        {[
          {icon:"🔢",label:"LUCKY NUMBER",val:lucky.number},
          {icon:"🎨",label:"LUCKY COLOR", val:lucky.color},
          {icon:"⏰",label:"BEST TIME",   val:lucky.time},
          {icon:"🔑",label:"KEYWORD",     val:lucky.keyword},
        ].map((item,i)=>(
          <div key={i} style={{background:C.panel2,border:`1px solid ${C.border}`,
            borderRadius:7,padding:"13px 10px",textAlign:"center"}}>
            <div style={{fontSize:24,marginBottom:7}}>{item.icon}</div>
            <div style={{fontFamily:F.mono,fontSize:9,color:C.dim,letterSpacing:2,marginBottom:5}}>{item.label}</div>
            <div style={{fontFamily:F.serif,fontSize:12.5,color:C.goldL,fontWeight:700}}>{item.val}</div>
          </div>
        ))}
        <div onClick={()=>setPop(p=>!p)}
             role="button" tabIndex={0}
             onKeyDown={(e)=>(e.key==="Enter"||e.key===" ")&&setPop(p=>!p)}
             style={{background:C.panel2,
          border:`1px solid ${pop?"#FF3B3B50":C.border}`,borderRadius:7,padding:"13px 10px",
          textAlign:"center",cursor:"pointer",gridColumn:"span 2",transition:"border-color .3s"}}>
          <div style={{width:64,height:64,borderRadius:"50%",margin:"0 auto 8px",
            background:"radial-gradient(circle at 35% 35%,#FF6644,#CC2200)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,
            animation:"amulet 3s ease-in-out infinite",
            transform:pop?"scale(1.2) rotate(10deg)":"scale(1)",transition:"transform .3s",
            boxShadow:pop?"0 0 40px rgba(255,50,50,.7)":"0 0 20px rgba(255,50,50,.35)"}}>
            🔴
          </div>
          <div style={{fontFamily:F.mono,fontSize:9,color:C.dim,letterSpacing:2,marginBottom:5}}>
            상승장 기원 부적 · 클릭!
          </div>
          <div style={{fontFamily:F.serif,fontSize:11,color:pop?"#FF8070":C.goldL}}>
            {pop ? "⚡ 부적 활성화! 수익을 기원합니다 ⚡" : tip}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ── 결과: 사주 ──
function SajuResult({res}) {
  if(!res)return null;
  const {pillars,score,lacking,dominant,todayIljin,fortuneText,stance,sectors,lucky} = res;
  return (
    <div style={{animation:"fadeUp .5s ease"}}>
      <IljinBadge iljin={todayIljin}/>
      <Panel style={{marginBottom:14}}>
        <STitle icon="☯️">사주 팔자 (四柱八字)</STitle>
        <PillarTable pillars={pillars}/>
        <STitle icon="⬡">오행 분석</STitle>
        <OhaengGauge score={score} lacking={lacking} dominant={dominant}/>
      </Panel>
      <Panel style={{marginBottom:14}}>
        <STitle icon="📜">오늘의 기운 읽기</STitle>
        <div style={{fontFamily:F.serif,fontSize:14,lineHeight:2,color:C.mid,
          borderLeft:`2px solid ${C.gold}`,paddingLeft:16}}>{fortuneText}</div>
      </Panel>
      <StanceBanner stance={stance}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <MarketPanel isDay themes={sectors.kr.map(s=>s.name)} sectors={sectors.kr}/>
        <MarketPanel isDay={false} themes={sectors.us.map(s=>s.name)} sectors={sectors.us}/>
      </div>
      <LuckyPanel lucky={lucky} extra={1}/>
    </div>
  );
}

// ── 결과: 별자리 ──
function ZodiacResult({res}) {
  if(!res)return null;
  const {sign,meta,todayIljin,todayOh,fortuneText,stance,krSectors,usSectors,lucky,compat} = res;
  const secData = ZODIAC_SECTOR[sign];
  return (
    <div style={{animation:"fadeUp .5s ease"}}>
      <IljinBadge iljin={todayIljin}/>
      <Panel style={{marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:20,marginBottom:20}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:52,lineHeight:1,marginBottom:4,
              filter:`drop-shadow(0 0 16px ${C.gold}88)`}}>{meta.symbol}</div>
            <div style={{fontFamily:F.display,fontSize:13,color:C.goldL,letterSpacing:2}}>{sign}</div>
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
              {[
                {label:"원소",val:meta.el},{label:"지배성",val:meta.planet},
                {label:"기간",val:meta.dates},
                {label:"일진상성",val:compat,
                 color:{BUY:"#4ECDA0",WATCH:C.gold,AVOID:"#FF5B5B"}[compat]},
              ].map(({label,val,color})=>(
                <div key={label} style={{background:C.panel2,border:`1px solid ${C.border}`,
                  borderRadius:6,padding:"6px 12px",textAlign:"center"}}>
                  <div style={{fontFamily:F.mono,fontSize:9,color:C.dim,letterSpacing:2,marginBottom:3}}>{label}</div>
                  <div style={{fontFamily:F.serif,fontSize:12,color:color||C.goldL,fontWeight:700}}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{fontFamily:F.mono,fontSize:10.5,color:C.mid,lineHeight:1.8}}>
              오늘 일진 <span style={{color:OH_COLOR[todayOh]}}>{OH_CHAR[todayOh]}({todayOh})</span>과(와)
              {" "}<span style={{color:C.goldL}}>{sign}</span>의 상성:&nbsp;
              <span style={{color:{BUY:"#4ECDA0",WATCH:C.gold,AVOID:"#FF8870"}[compat]}}>
                {{BUY:"▲ 호궁합 — 상승력 증폭",WATCH:"◆ 보통 — 신중하게",AVOID:"▼ 상충 — 주의"}[compat]}
              </span>
            </div>
          </div>
        </div>
        <div style={{fontFamily:F.serif,fontSize:14,lineHeight:2,color:C.mid,
          borderLeft:`2px solid ${C.gold}`,paddingLeft:16}}>{fortuneText}</div>
      </Panel>
      <StanceBanner stance={stance}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <MarketPanel isDay themes={secData.kr} sectors={krSectors}/>
        <MarketPanel isDay={false} themes={secData.us} sectors={usSectors}/>
      </div>
      <LuckyPanel lucky={lucky} extra={2}/>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════
//  ⑤ 메인 앱
// ════════════════════════════════════════════════════════════════

export default function AntFortune() {
  const [mode, setMode]       = useState("saju");
  // 사주
  const [sajuForm, setSajuForm] = useState({ year: "", month: "", day: "", hour: -1, gender: "남성" });
  // 별자리
  const [zodiacForm, setZodiacForm] = useState({ month: "", day: "", sign: null });

  // 결과
  const [sajuRes, setSajuRes] = useState(null);
  const [zodiacRes, setZodiacRes] = useState(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const resRef = useRef(null);

  const updateZodiacSign = (m, d) => {
    if (m && d) return getZodiac(Number(m), Number(d));
    return null;
  };

  const runSaju = () => {
    setError("");
    const { year: yr, month: mo, day: dy, hour: hr } = sajuForm;
    if(!yr||!mo||!dy){setError("생년월일을 모두 입력해주세요.");return;}
    const y=Number(yr),m=Number(mo),d=Number(dy);
    if (!isValidDate(y, m, d)) { setError("유효하지 않은 날짜입니다. (예: 2월 30일)"); return; }
    if(y<1900||y>2010){setError("연도를 확인해주세요 (1900~2010).");return;}
    setLoading(true);
    setTimeout(()=>{
      try {
        const res = analyzeSaju(y, m, d, Number(hr));
        setSajuRes(res); setZodiacRes(null);
        setTimeout(()=>resRef.current?.scrollIntoView({behavior:"smooth"}),120);
      } catch(e) { setError("계산 오류: "+e.message); }
      setLoading(false);
    }, 600);
  };

  const runZodiac = () => {
    setError("");
    const { month: bMo, day: bDy, sign: selZodiac } = zodiacForm;
    if (bMo && bDy && !isValidDate(2000, Number(bMo), Number(bDy))) {
      setError("유효하지 않은 날짜입니다. (예: 2월 30일)"); return;
    }
    if(!selZodiac){setError("생일(월/일)을 입력하거나 별자리를 직접 선택해주세요.");return;}
    setLoading(true);
    setTimeout(()=>{
      try {
        const bm=Number(bMo)||1, bd=Number(bDy)||1;
        const res = analyzeZodiac(selZodiac, bm, bd);
        setZodiacRes(res); setSajuRes(null);
        setTimeout(()=>resRef.current?.scrollIntoView({behavior:"smooth"}),120);
      } catch(e) { setError("계산 오류: "+e.message); }
      setLoading(false);
    }, 600);
  };

  const switchMode = (m) => {
    setMode(m); setError(""); setSajuRes(null); setZodiacRes(null);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700;900&family=Cinzel+Decorative:wght@400;700&family=Share+Tech+Mono&family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        body{background:#04070D;color:#DCE6F4;font-family:'Noto Sans KR',sans-serif;overflow-x:hidden}
        .grid-zodiac { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 18px; }
        .grid-pillars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
        .grid-lucky { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

        @media (max-width: 768px) {
          .grid-zodiac { grid-template-columns: repeat(3, 1fr); }
          .grid-pillars { grid-template-columns: repeat(2, 1fr); }
          .grid-lucky { grid-template-columns: repeat(2, 1fr); }
        }
        select,input{appearance:none;-webkit-appearance:none}
        select option{background:#101828;color:#DCE6F4}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:#04070D}
        ::-webkit-scrollbar-thumb{background:rgba(201,168,76,.3);border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{text-shadow:0 0 30px rgba(201,168,76,.5)}50%{text-shadow:0 0 70px rgba(201,168,76,1),0 0 120px rgba(201,168,76,.3)}}
        @keyframes amulet{0%,100%{box-shadow:0 0 24px rgba(255,50,50,.4)}50%{box-shadow:0 0 55px rgba(255,50,50,.85)}}
        @keyframes spinOrb{to{transform:rotate(360deg)}}
      `}</style>

      <StarField/>

      <div style={{position:"relative",zIndex:1,maxWidth:1060,
        margin:"0 auto",padding:"0 20px 80px",minHeight:"100vh"}}>

        {/* 헤더 */}
        <div style={{textAlign:"center",padding:"44px 0 28px"}}>
          <h1 style={{fontFamily:F.display,fontSize:"clamp(20px,3.2vw,36px)",
            color:C.goldL,animation:"glow 4s ease-in-out infinite",
            letterSpacing:2,marginBottom:8}}>개미의 하루</h1>
          <div style={{fontFamily:F.serif,fontSize:12,color:C.dim,letterSpacing:6,marginBottom:6}}>
            별자리 · 사주 투자 운세
          </div>
          <div style={{fontFamily:F.mono,fontSize:11,color:C.gold,opacity:.8}}>
            {getTodayStr()}
          </div>
          <div style={{width:180,height:1,margin:"16px auto 0",
            background:`linear-gradient(90deg,transparent,${C.gold},transparent)`}}/>
        </div>

        <Clock/>

        {/* 모드 토글 */}
        <div style={{display:"flex",justifyContent:"center",gap:12,marginBottom:28}}>
          {[
            {id:"saju",  icon:"☯️", label:"딥 모드 · 사주",    badge:"만세력"},
            {id:"zodiac",icon:"⭐", label:"퀵 모드 · 별자리",  badge:null},
          ].map(({id,icon,label,badge})=>(
            <button key={id} onClick={()=>switchMode(id)} style={{
              position:"relative",padding:"12px 30px",
              border:`1px solid ${mode===id?C.gold:C.border}`,borderRadius:6,
              background:mode===id?"rgba(201,168,76,.12)":C.panel,
              color:mode===id?C.goldL:C.dim,
              fontFamily:F.serif,fontSize:14,cursor:"pointer",letterSpacing:1,
              transition:"all .3s",
              boxShadow:mode===id?"0 0 20px rgba(201,168,76,.28)":"none"}}>
              <span style={{marginRight:7}}>{icon}</span>{label}
              {badge&&<span style={{position:"absolute",top:-8,right:-8,background:C.gold,
                color:"#05080E",fontSize:8,fontFamily:F.mono,padding:"2px 7px",
                borderRadius:10,fontWeight:700,letterSpacing:1}}>{badge}</span>}
            </button>
          ))}
        </div>

        {/* ── 사주 입력 ── */}
        {mode==="saju" && (
          <Panel style={{marginBottom:16}}>
            <STitle icon="☯️">사주 정보 입력 — 만세력 오행 분석</STitle>
            <div style={{fontFamily:F.mono,fontSize:10.5,color:C.dim,marginBottom:18,lineHeight:1.9,
              borderLeft:`2px solid ${C.gold}40`,paddingLeft:14}}>
              생년월일시를 입력하면 <span style={{color:C.gold}}>천간·지지·오행(木火土金水)</span>을 자동 계산합니다.<br/>
              오늘 일진의 기운과 당신의 부족한 오행을 매칭해 최적의 투자 섹터를 추천합니다.
            </div>
            <div style={{display:"flex",gap:13,flexWrap:"wrap",marginBottom:14}}>
              <Inp label="태어난 연도" type="number" placeholder="예: 1990"
                value={sajuForm.year} onChange={e=>setSajuForm({...sajuForm, year: e.target.value})} min="1900" max="2010"/>
              <Sel label="태어난 월" value={sajuForm.month} onChange={v=>setSajuForm({...sajuForm, month: v})}>
                <option value="">월 선택</option>
                {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}월</option>)}
              </Sel>
              <Sel label="태어난 일" value={sajuForm.day} onChange={v=>setSajuForm({...sajuForm, day: v})}>
                <option value="">일 선택</option>
                {Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}일</option>)}
              </Sel>
            </div>
            <div style={{display:"flex",gap:13,flexWrap:"wrap"}}>
              <Sel label="태어난 시간 (시주·時柱)" value={sajuForm.hour} onChange={v=>setSajuForm({...sajuForm, hour: Number(v)})}>
                {HOURS_LIST.map(h=><option key={h.val} value={h.val}>{h.label}</option>)}
              </Sel>
              <Sel label="성별" value={sajuForm.gender} onChange={v=>setSajuForm({...sajuForm, gender: v})}>
                <option value="남성">남성 · 양(陽)</option>
                <option value="여성">여성 · 음(陰)</option>
              </Sel>
            </div>
            {error&&<div style={{background:"rgba(255,59,59,.1)",border:"1px solid rgba(255,59,59,.3)",
              borderRadius:6,padding:"11px 16px",color:"#FF8880",fontFamily:F.serif,fontSize:13,marginTop:12}}>
              ⚠ {error}</div>}
            <BigBtn onClick={runSaju} disabled={loading}>
              {loading?"⏳ 만세력 계산 중...":"☯️ 사주 오행 분석하기"}
            </BigBtn>
          </Panel>
        )}

        {/* ── 별자리 입력 ── */}
        {mode==="zodiac" && (
          <Panel style={{marginBottom:16}}>
            <STitle icon="⭐">별자리 분석 — 생일 or 직접 선택</STitle>
            <div style={{fontFamily:F.mono,fontSize:10.5,color:C.dim,marginBottom:18,lineHeight:1.9,
              borderLeft:`2px solid ${C.gold}40`,paddingLeft:14}}>
              생일(월/일)을 입력하면 별자리가 <span style={{color:C.gold}}>자동 판별</span>됩니다.<br/>
              오늘 일진과 별자리의 <span style={{color:C.jade}}>상성(相性)</span>을 분석해 투자 스탠스를 결정합니다.
            </div>
            {/* 생일 입력 */}
            <div style={{display:"flex",gap:13,marginBottom:20,flexWrap:"wrap"}}>
              <Sel label="태어난 월" value={zodiacForm.month} onChange={v => {
                const s = updateZodiacSign(v, zodiacForm.day);
                setZodiacForm(prev => ({ ...prev, month: v, sign: s || prev.sign }));
              }}>
                <option value="">월 선택</option>
                {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}월</option>)}
              </Sel>
              <Sel label="태어난 일" value={zodiacForm.day} onChange={v => {
                const s = updateZodiacSign(zodiacForm.month, v);
                setZodiacForm(prev => ({ ...prev, day: v, sign: s || prev.sign }));
              }}>
                <option value="">일 선택</option>
                {Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}일</option>)}
              </Sel>
              {zodiacForm.sign && (
                <div style={{flex:"1 1 140px",display:"flex",alignItems:"flex-end"}}>
                  <div style={{background:"rgba(201,168,76,.1)",border:`1px solid ${C.gold}50`,
                    borderRadius:7,padding:"10px 16px",width:"100%",textAlign:"center"}}>
                    <div style={{fontFamily:F.mono,fontSize:9,color:C.dim,letterSpacing:2,marginBottom:4}}>
                      자동 판별 결과
                    </div>
                    <div style={{fontFamily:F.display,fontSize:16,color:C.goldL}}>
                      {ZODIAC_META[zodiacForm.sign]?.symbol} {zodiacForm.sign}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* 직접 선택 */}
            <div style={{fontFamily:F.mono,fontSize:10,color:C.dim,letterSpacing:2,
              marginBottom:12,textAlign:"center"}}>— 또는 별자리 직접 선택 —</div>
            <div className="grid-zodiac">
              {ZODIACS_LIST.map((z)=>{
                const sel=zodiacForm.sign===z.sign;
                return (
                  <div key={z.sign} onClick={()=>setZodiacForm({...zodiacForm, sign: z.sign})}
                       role="button" tabIndex={0}
                       onKeyDown={(e)=>(e.key==="Enter"||e.key===" ")&&setZodiacForm({...zodiacForm, sign: z.sign})}
                       style={{
                    background:sel?"rgba(201,168,76,.13)":C.panel2,
                    border:`1px solid ${sel?C.gold:"rgba(201,168,76,.14)"}`,
                    borderRadius:7,padding:"10px 5px",textAlign:"center",cursor:"pointer",
                    transition:"all .25s",
                    boxShadow:sel?"0 0 16px rgba(201,168,76,.35)":"none"}}>
                    <div style={{fontSize:22,marginBottom:3,
                      filter:sel?`drop-shadow(0 0 8px ${C.gold}88)`:"none"}}>{z.symbol}</div>
                    <div style={{fontSize:10,fontWeight:700,
                      color:sel?C.goldL:C.bright,fontFamily:F.serif}}>{z.sign}</div>
                    <div style={{fontSize:9,color:C.dim,fontFamily:F.mono}}>{z.dates}</div>
                  </div>
                );
              })}
            </div>
            {error&&<div style={{background:"rgba(255,59,59,.1)",border:"1px solid rgba(255,59,59,.3)",
              borderRadius:6,padding:"11px 16px",color:"#FF8880",fontFamily:F.serif,fontSize:13,marginTop:12}}>
              ⚠ {error}</div>}
            <BigBtn onClick={runZodiac} disabled={loading}>
              {loading?"⏳ 일진 상성 계산 중...":"⭐ 오늘의 기운 분석하기"}
            </BigBtn>
          </Panel>
        )}

        {/* 로딩 */}
        {loading && (
          <div style={{textAlign:"center",padding:"50px 24px"}}>
            <div style={{width:76,height:76,borderRadius:"50%",margin:"0 auto 22px",
              background:"radial-gradient(circle at 35% 35%,#F0D080,#C9A84C,#7A5010)",
              boxShadow:"0 0 50px rgba(201,168,76,.75)",animation:"spinOrb 3s linear infinite"}}/>
            <div style={{fontFamily:F.serif,color:C.gold,fontSize:14,letterSpacing:3}}>
              만세력 연산 중...
            </div>
          </div>
        )}

        {/* 결과 */}
        <div ref={resRef}>
          {sajuRes   && <SajuResult res={sajuRes}/>}
          {zodiacRes && <ZodiacResult res={zodiacRes}/>}
        </div>

        {/* 면책조항 */}
        <div style={{textAlign:"center",padding:"20px 16px",fontSize:10.5,color:C.dim,
          fontFamily:F.mono,letterSpacing:.5,lineHeight:1.9,
          borderTop:"1px solid rgba(255,255,255,.04)",marginTop:28}}>
          ⚠ 본 결과는 순수한 재미와 엔터테인먼트 목적의 운세 기반 콘텐츠입니다.<br/>
          본 사주 계산은 오락용 근사치 알고리즘을 사용하므로 실제와 다를 수 있습니다.<br/>
          실제 투자 결정의 근거로 사용하지 마십시오. 모든 투자의 책임은 본인에게 있습니다.<br/>
        </div>
      </div>
    </>
  );
}

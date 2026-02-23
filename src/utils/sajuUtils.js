import {
  GAN, GAN_KR, JI, JI_KR, JI_ANI,
  GAN_OH, JI_OH,
  BASE_DATE, BASE_GAN, BASE_JI,
  WOLGAN_START, SIGAN_START, HOUR_TO_JI,
  ILJIN_STANCE, OHAENG_FORTUNE, ZODIAC_FORTUNE,
  SECTOR_DB, ZODIAC_SECTOR, ZODIAC_META,
  ZODIAC_ILJIN_MODIFY, LUCKY_BY_OH,
  DAYS_KR
} from "../data/fortuneData.js";

export function dateToDays(y, m, d) {
  const t = new Date(y, m - 1, d);
  return Math.round((t - BASE_DATE) / 86400000);
}

export function calcIljin(y, m, d) {
  const days = dateToDays(y, m, d);
  const gan  = ((BASE_GAN + days) % 10 + 10) % 10;
  const ji   = ((BASE_JI  + days) % 12 + 12) % 12;
  return { gan, ji, ganChr: GAN[gan], jiChr: JI[ji],
           ganKr: GAN_KR[gan], jiKr: JI_KR[ji],
           ganOh: GAN_OH[gan], jiOh: JI_OH[ji], ani: JI_ANI[ji] };
}

// 연주
export function calcYeonju(year) {
  const idx = ((year - 1984) % 60 + 60) % 60;
  const gan = idx % 10, ji = idx % 12;
  return { gan, ji, ganChr: GAN[gan], jiChr: JI[ji],
           ganKr: GAN_KR[gan], jiKr: JI_KR[ji],
           ganOh: GAN_OH[gan], jiOh: JI_OH[ji], ani: JI_ANI[ji] };
}

export function calcWolju(yearGan, month) {
  // 1월 = 寅월(지지 index 2), 순서대로 +1
  const jiIdx = ((month + 1) % 12);  // 1월→2(寅), 2월→3(卯)...
  const startGan = WOLGAN_START[yearGan % 5];
  const ganIdx = (startGan + (month - 1) * 1) % 10;
  return { gan: ganIdx, ji: jiIdx, ganChr: GAN[ganIdx], jiChr: JI[jiIdx],
           ganKr: GAN_KR[ganIdx], jiKr: JI_KR[jiIdx],
           ganOh: GAN_OH[ganIdx], jiOh: JI_OH[jiIdx] };
}

export function calcSiju(dayGan, hour) {
  if (hour < 0) return null;
  const jiIdx  = HOUR_TO_JI[hour] ?? 0;
  const startGan = SIGAN_START[dayGan % 5];
  const ganIdx = (startGan + jiIdx) % 10;
  return { gan: ganIdx, ji: jiIdx, ganChr: GAN[ganIdx], jiChr: JI[jiIdx],
           ganKr: GAN_KR[ganIdx], jiKr: JI_KR[jiIdx],
           ganOh: GAN_OH[ganIdx], jiOh: JI_OH[jiIdx] };
}

// 사주 8자 → 오행 점수 계산
export function calcOhaeng(pillars) {
  const score = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const weights = { yeon: 1, wol: 1.5, il: 2, si: 1.2 }; // 일주 가중치 높음
  for (const [key, p] of Object.entries(pillars)) {
    if (!p) continue;
    const w = weights[key] ?? 1;
    score[p.ganOh] = (score[p.ganOh] || 0) + w;
    score[p.jiOh]  = (score[p.jiOh]  || 0) + w * 0.8;
  }
  const total = Object.values(score).reduce((a,b) => a+b, 0);
  return Object.fromEntries(Object.entries(score).map(([k,v]) => [k, Math.round(v/total*100)]));
}

// 별자리 판별
export function getZodiac(month, day) {
  const md = month * 100 + day;
  if (md >= 321 && md <= 419) return "양자리";
  if (md >= 420 && md <= 520) return "황소자리";
  if (md >= 521 && md <= 621) return "쌍둥이자리";
  if (md >= 622 && md <= 722) return "게자리";
  if (md >= 723 && md <= 822) return "사자자리";
  if (md >= 823 && md <= 922) return "처녀자리";
  if (md >= 923 && md <= 1022) return "천칭자리";
  if (md >= 1023 && md <= 1121) return "전갈자리";
  if (md >= 1122 && md <= 1221) return "사수자리";
  if ((md >= 1222) || (md <= 119)) return "염소자리";
  if (md >= 120 && md <= 218) return "물병자리";
  return "물고기자리";
}

// 날짜 시드 (같은 날엔 같은 결과)
export function dateSeed(extra = 0) {
  const t = new Date();
  return t.getFullYear() * 10000 + (t.getMonth()+1) * 100 + t.getDate() + extra;
}
export function pickByDate(arr, extra = 0) {
  return arr[dateSeed(extra) % arr.length];
}

export function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${DAYS_KR[d.getDay()]}요일`;
}

export function isValidDate(y, m, d) {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// ════════════════════════════════════════════════════════════════
//  ③ 계산 엔진 — 사주 분석
// ════════════════════════════════════════════════════════════════

export function analyzeSaju(year, month, day, hour) {
  const yeonju = calcYeonju(year);
  const wolju  = calcWolju(yeonju.gan, month);
  const ilju   = calcIljin(year, month, day);
  const siju   = hour >= 0 ? calcSiju(ilju.gan, hour) : null;

  const pillars = { yeon: yeonju, wol: wolju, il: ilju, si: siju };
  const score   = calcOhaeng(pillars);
  const lacking  = Object.entries(score).sort((a,b) => a[1]-b[1])[0][0];
  const dominant = Object.entries(score).sort((a,b) => b[1]-a[1])[0][0];

  // 오늘 일진
  const today  = new Date();
  const todayIljin = calcIljin(today.getFullYear(), today.getMonth()+1, today.getDate());
  const todayOh    = todayIljin.ganOh; // 오늘 일간 오행

  // 운세 텍스트 (부족 오행 기반)
  const fortuneTexts = OHAENG_FORTUNE[lacking];
  const fortuneText  = pickByDate(fortuneTexts);

  // 스탠스 (오늘 일진 기준)
  const stance = ILJIN_STANCE[todayOh];

  // 섹터
  const sectors = SECTOR_DB[lacking];

  // 행운
  const lucky = LUCKY_BY_OH[lacking];

  return {
    pillars, score, lacking, dominant,
    todayIljin, todayOh,
    fortuneText, stance, sectors, lucky,
  };
}

export function analyzeZodiac(sign) {
  const meta   = ZODIAC_META[sign];
  const today  = new Date();
  const todayIljin = calcIljin(today.getFullYear(), today.getMonth()+1, today.getDate());
  const todayOh    = todayIljin.ganOh;

  // 운세 텍스트
  const fortuneText = pickByDate(ZODIAC_FORTUNE[sign]);

  // 스탠스: 일진 + 별자리 상성으로 결정
  const iljinStance = ILJIN_STANCE[todayOh];
  const compat = (ZODIAC_ILJIN_MODIFY[todayOh]?.[sign]) ?? "WATCH";
  // 상성 반영
  let stanceCode = iljinStance.code;
  if (compat === "AVOID" && stanceCode === "STRONG_BUY") stanceCode = "HOLD";
  if (compat === "BUY"   && stanceCode === "HOLD") stanceCode = "STRONG_BUY";

  const stanceMap = {
    STRONG_BUY:{ kr:"적극 매수", title:`${sign} × ${todayOh}일 — 상승 기운 극대화` },
    HOLD:      { kr:"관망",      title:`${sign} × ${todayOh}일 — 신중한 관망` },
    SELL:      { kr:"매도·현금", title:`${sign} × ${todayOh}일 — 수익 실현의 날` },
  };
  const stance = { code: stanceCode, ...stanceMap[stanceCode] };

  // 섹터
  const secData = ZODIAC_SECTOR[sign];
  const sig = { STRONG_BUY:"BUY", HOLD:"WATCH", SELL:"AVOID" }[stanceCode];
  const krSectors = secData.kr.map((name, i) => ({
    name, signal: i === 2 ? "WATCH" : sig,
    reason: i === 0 ? `${sign} 핵심 섹터` : i === 1 ? "오늘 일진과 공명" : "보조 테마 관찰",
  }));
  const usSectors = secData.us.map((name, i) => ({
    name, signal: i === 2 ? "WATCH" : sig,
    reason: i === 0 ? "글로벌 별자리 섹터" : i === 1 ? "야간장 추천" : "관망",
  }));

  // 행운 (별자리 원소 기반)
  const elToOh = { 火:"화", 土:"토", 風:"목", 水:"수" };
  const oh = elToOh[meta.el] ?? "목";
  const lucky = LUCKY_BY_OH[oh];

  return {
    sign, meta, todayIljin, todayOh,
    fortuneText, stance, krSectors, usSectors, lucky, compat,
  };
}

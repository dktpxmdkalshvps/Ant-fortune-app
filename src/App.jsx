import { useState, useEffect, useRef } from "react";

// ════════════════════════════════════════════════════════════════
//  ① 만세력 엔진 (완전 로컬)
// ════════════════════════════════════════════════════════════════

const GAN  = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const GAN_KR = ["갑","을","병","정","무","기","경","신","임","계"];
const JI   = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const JI_KR  = ["자","축","인","묘","진","사","오","미","신","유","술","해"];
const JI_ANI = ["쥐","소","범","토끼","용","뱀","말","양","원숭이","닭","개","돼지"];

// 천간 오행: 갑을=木, 병정=火, 무기=土, 경신=金, 임계=水
const GAN_OH = ["목","목","화","화","토","토","금","금","수","수"];
// 지지 오행: 자=水, 축=土, 인=木, 묘=木, 진=土, 사=火, 오=火, 미=土, 신=金, 유=金, 술=土, 해=水
const JI_OH  = ["수","토","목","목","토","화","화","토","금","금","토","수"];

const OH_COLOR = { 목:"#4ECDA0", 화:"#FF6432", 토:"#C8A84C", 금:"#D0D8F0", 수:"#4488FF" };
const OH_CHAR  = { 목:"木", 화:"火", 토:"土", 금:"金", 수:"水" };
const OH_BG    = {
  목:"rgba(78,205,160,.13)", 화:"rgba(255,100,50,.13)",
  토:"rgba(200,168,76,.13)", 금:"rgba(208,216,240,.10)", 수:"rgba(68,136,255,.13)",
};

// 기준일: 2000-01-01 = 甲戌日 (간 index=0, 지 index=10)
const BASE_DATE = new Date(2000, 0, 1);
const BASE_GAN  = 0;
const BASE_JI   = 10;

function dateToDays(y, m, d) {
  const t = new Date(y, m - 1, d);
  return Math.round((t - BASE_DATE) / 86400000);
}

function calcIljin(y, m, d) {
  const days = dateToDays(y, m, d);
  const gan  = ((BASE_GAN + days) % 10 + 10) % 10;
  const ji   = ((BASE_JI  + days) % 12 + 12) % 12;
  return { gan, ji, ganChr: GAN[gan], jiChr: JI[ji],
           ganKr: GAN_KR[gan], jiKr: JI_KR[ji],
           ganOh: GAN_OH[gan], jiOh: JI_OH[ji], ani: JI_ANI[ji] };
}

// 연주
function calcYeonju(year) {
  const idx = ((year - 1984) % 60 + 60) % 60;
  const gan = idx % 10, ji = idx % 12;
  return { gan, ji, ganChr: GAN[gan], jiChr: JI[ji],
           ganKr: GAN_KR[gan], jiKr: JI_KR[ji],
           ganOh: GAN_OH[gan], jiOh: JI_OH[ji], ani: JI_ANI[ji] };
}

// 월주 (오호둔년법: 연간 기준 1월 天干 결정)
const WOLGAN_START = [2, 4, 6, 8, 0]; // 갑기/을경/병신/정임/무계년 → 1월 천간 index
function calcWolju(yearGan, month) {
  // 1월 = 寅월(지지 index 2), 순서대로 +1
  const jiIdx = ((month + 1) % 12);  // 1월→2(寅), 2월→3(卯)...
  const startGan = WOLGAN_START[yearGan % 5];
  const ganIdx = (startGan + (month - 1) * 1) % 10;
  return { gan: ganIdx, ji: jiIdx, ganChr: GAN[ganIdx], jiChr: JI[jiIdx],
           ganKr: GAN_KR[ganIdx], jiKr: JI_KR[jiIdx],
           ganOh: GAN_OH[ganIdx], jiOh: JI_OH[jiIdx] };
}

// 시주 (오자둔일법: 일간 기준 子時 天干 결정)
// 자시=子(0), 축시=丑(1) ... 해시=亥(11)
const SIGAN_START = [0, 2, 4, 6, 8]; // 갑기/을경/병신/정임/무계일
const HOUR_TO_JI  = [0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11]; // 0~23시→지지
function calcSiju(dayGan, hour) {
  if (hour < 0) return null;
  const jiIdx  = HOUR_TO_JI[hour] ?? 0;
  const startGan = SIGAN_START[dayGan % 5];
  const ganIdx = (startGan + jiIdx) % 10;
  return { gan: ganIdx, ji: jiIdx, ganChr: GAN[ganIdx], jiChr: JI[jiIdx],
           ganKr: GAN_KR[ganIdx], jiKr: JI_KR[jiIdx],
           ganOh: GAN_OH[ganIdx], jiOh: JI_OH[jiIdx] };
}

// 사주 8자 → 오행 점수 계산
function calcOhaeng(pillars) {
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
function getZodiac(month, day) {
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
function dateSeed(extra = 0) {
  const t = new Date();
  return t.getFullYear() * 10000 + (t.getMonth()+1) * 100 + t.getDate() + extra;
}
function pickByDate(arr, extra = 0) {
  return arr[dateSeed(extra) % arr.length];
}


// ════════════════════════════════════════════════════════════════
//  ② 텍스트 풀 — 오행 조합별 운세 & 투자 메시지
// ════════════════════════════════════════════════════════════════

// 오늘 일진 기반 투자 스탠스
const ILJIN_STANCE = {
  목: { code:"STRONG_BUY", kr:"적극 매수", title:"木의 기운 — 성장과 도약의 날",
        desc:"새싹이 땅을 뚫듯 강한 상승 기운이 흐릅니다. 성장주·바이오·그린 섹터에 주목하세요." },
  화: { code:"STRONG_BUY", kr:"적극 매수", title:"火의 기운 — 열정과 확장의 날",
        desc:"불꽃처럼 타오르는 에너지. 반도체·AI·엔터테인먼트 섹터에 과감한 진입이 유리합니다." },
  토: { code:"HOLD",       kr:"관망",      title:"土의 기운 — 안정과 신중의 날",
        desc:"대지처럼 묵직한 기운. 급격한 베팅보다 우량주 보유와 현금 비중 유지가 현명합니다." },
  금: { code:"SELL",       kr:"매도 후 현금 확보", title:"金의 기운 — 수확과 정리의 날",
        desc:"가을 추수처럼 이익을 실현할 시기. 고점 종목 차익 실현 후 방어적 포지션으로 전환하세요." },
  수: { code:"HOLD",       kr:"관망",      title:"水의 기운 — 지혜와 유연의 날",
        desc:"물처럼 흐르는 장세. 추세를 읽으며 유연하게 대응하되, 성급한 베팅은 자제하세요." },
};

// 오행별 운세 텍스트 풀 (부족한 오행 → 보충 메시지)
const OHAENG_FORTUNE = {
  목: [
    "오늘 당신에게 木의 기운이 부족합니다. 성장과 유연함을 상징하는 목 기운을 채우세요. 바이오·헬스케어·친환경 섹터가 당신의 기운을 보완합니다.",
    "木이 부족한 날. 새로운 시작과 성장의 에너지가 필요합니다. 미래 지향적 기술주와 헬스케어가 기운의 균형을 맞춰줄 것입니다.",
    "木 기운 결핍 — 창의와 팽창의 에너지를 보충해야 합니다. 신재생에너지·농업·바이오 섹터로 기운의 빈자리를 채우세요.",
  ],
  화: [
    "火의 기운이 오늘 약합니다. 열정과 명석함을 상징하는 화 기운을 보충하세요. 반도체·AI·엔터테인먼트가 당신의 기운에 불을 지핍니다.",
    "火 부족 — 태양의 에너지, 창조와 확산의 힘이 필요한 날. AI칩·빅테크·미디어 섹터가 기운의 균형점이 됩니다.",
    "오늘의 火 기운이 미약합니다. 혁신과 가시성의 에너지를 채우세요. 반도체·전력·엔터 섹터가 당신의 빈 기운을 채워줍니다.",
  ],
  토: [
    "土의 기운이 부족합니다. 대지의 안정과 신뢰를 상징하는 토 기운을 보충하세요. 건설·부동산·리츠가 당신의 중심을 잡아줍니다.",
    "土 부족 — 근본과 안정의 에너지가 필요한 날. 건자재·인프라·공공 섹터로 무너진 기운의 중심을 세우세요.",
    "오늘은 土 기운이 허약합니다. 대지처럼 묵직한 에너지가 필요합니다. 건설·부동산·유틸리티가 기운을 보완합니다.",
  ],
  금: [
    "金의 기운이 오늘 부족합니다. 수확과 결실, 결단력을 상징하는 금 기운을 채우세요. 철강·방산·귀금속이 당신의 기운을 보강합니다.",
    "金 부족 — 예리함과 결단의 에너지가 필요한 날. 방산·기계·금속 섹터로 기운의 예봉을 갈아세우세요.",
    "오늘의 金 기운이 약합니다. 정확성과 수확의 에너지를 보충하세요. 원자재·금·산업재 섹터가 당신의 빈 기운을 채웁니다.",
  ],
  수: [
    "水의 기운이 부족합니다. 지혜와 흐름, 축적을 상징하는 수 기운을 보충하세요. 금융·해운·물류가 당신의 기운을 완성합니다.",
    "水 부족 — 유연함과 지혜의 에너지가 필요한 날. 금융·보험·물류 섹터로 기운의 흐름을 회복하세요.",
    "오늘은 水 기운이 고갈되어 있습니다. 축적과 순환의 에너지를 채우세요. 금융·은행·해운이 당신의 기운을 채워줍니다.",
  ],
};

// 별자리별 텍스트 풀
const ZODIAC_FORTUNE = {
  양자리: [
    "불꽃처럼 타오르는 양자리의 기운이 오늘 증시에 이글거립니다. 선제적 매수 전략이 유효한 날. 주저하면 기회를 잃습니다.",
    "화성의 기운을 받은 양자리, 오늘은 먼저 치고 나가는 자가 승자입니다. 바이오·방산에서 빠른 기회를 포착하세요.",
    "돌진하는 양자리의 에너지가 최고조에 달합니다. 과감한 결단이 필요한 날. 단, 진입 후 손절라인은 반드시 설정하세요.",
  ],
  황소자리: [
    "금성의 품 안, 황소자리의 날. 인내와 축적의 기운이 강합니다. 우량주 분할 매수로 천천히 쌓아가는 전략이 길합니다.",
    "황소처럼 묵직하게, 오늘은 검증된 종목에 집중하세요. 배당주·리츠·금융주가 당신의 기질과 맞닿아 있습니다.",
    "황소자리의 감각적 안목이 빛을 발하는 날. 저평가된 가치주를 발굴할 좋은 기회입니다.",
  ],
  쌍둥이자리: [
    "수성의 날렵함을 받은 쌍둥이자리, 정보의 홍수 속에서 핵심을 꿰뚫는 날. IT·플랫폼·미디어에서 빠른 스윙 기회를 노리세요.",
    "두 얼굴의 지혜로 시장을 읽는 날. 오전 포지션과 오후 전략을 달리 가져가는 유연함이 강점입니다.",
    "쌍둥이의 다중 관점이 빛납니다. 국장과 미장을 동시에 스캔하며 최적의 기회를 낚으세요.",
  ],
  게자리: [
    "달의 기운을 받은 게자리, 오늘은 방어와 수비가 최고의 공격입니다. 손실을 줄이는 것이 수익입니다.",
    "예민한 게자리의 촉이 위험 신호를 감지합니다. 비중을 줄이고 안전 자산 비중을 늘리는 날.",
    "게자리의 직관이 속삭입니다: '지금은 껍데기 속으로.' 방어주·채권·현금이 오늘의 친구입니다.",
  ],
  사자자리: [
    "태양의 총아 사자자리, 오늘은 시장의 왕이 되는 날. 주목받는 대형주·엔터·럭셔리 섹터가 당신과 공명합니다.",
    "사자의 포효처럼 강한 상승 기운. 주도주를 선점하고 당당하게 보유하세요. 확신이 곧 수익입니다.",
    "왕의 기운이 충만한 날. 대장주·시총 상위 종목이 당신의 포트폴리오를 완성합니다.",
  ],
  처녀자리: [
    "정교한 처녀자리의 분석력이 절정을 이루는 날. 실적 기반 우량주에서 놓친 저평가를 찾아내세요.",
    "수성의 지성으로 무장한 처녀자리, 오늘은 숫자가 말하는 것을 믿으세요. 데이터 기반 접근이 길합니다.",
    "처녀자리의 완벽주의가 빛을 발합니다. 포트폴리오를 정밀 점검하고 불필요한 포지션을 정리할 적기입니다.",
  ],
  천칭자리: [
    "균형의 천칭자리, 오늘은 매수도 매도도 아닌 재조정의 날. 포트폴리오 균형을 잡는 데 집중하세요.",
    "금성의 미적 감각으로 시장을 바라보는 날. 아름다운 차트를 가진 종목이 당신의 선택을 이끕니다.",
    "천칭의 균형 감각이 날카롭습니다. 과도하게 쏠린 섹터를 줄이고 분산의 미덕을 실천하는 날.",
  ],
  전갈자리: [
    "명왕성의 심층 에너지를 받은 전갈자리, 오늘은 남들이 두려워하는 곳에서 기회를 봅니다. 역발상 전략이 유효합니다.",
    "전갈의 통찰력이 시장 심층부를 꿰뚫는 날. 공매도 과다 종목의 숏커버링에 주목하세요.",
    "변환과 재생의 전갈 에너지. 구조조정·M&A·턴어라운드 종목에서 반전의 기회를 찾으세요.",
  ],
  사수자리: [
    "목성의 팽창 에너지를 받은 사수자리, 오늘은 스케일 크게 봐야 합니다. 글로벌·대형 테마가 당신의 기운과 맞습니다.",
    "화살처럼 멀리 내다보는 날. 단기 차트보다 장기 성장 스토리가 있는 종목에 집중하세요.",
    "사수의 모험 기운이 강합니다. 여행·레저·글로벌 소비 섹터에서 상승 탄력을 기대할 수 있습니다.",
  ],
  염소자리: [
    "토성의 인내를 받은 염소자리, 오늘은 산 정상을 향해 한 발씩 내딛는 날. 장기 우량주 적립이 최선입니다.",
    "염소의 끈기로 버티는 날. 단기 하락에 흔들리지 말고 목표가를 향해 묵묵히 보유하세요.",
    "토성의 규율이 빛나는 날. 원칙 매매, 손절 준수, 분할 매수 — 기본으로 돌아가면 반드시 이깁니다.",
  ],
  물병자리: [
    "천왕성의 혁명 에너지를 받은 물병자리, 오늘은 미래를 먼저 사는 날. AI·로봇·우주항공이 당신의 기운과 공명합니다.",
    "파격의 물병 에너지. 시장의 편견을 깨는 혁신 기업에서 다음 텐배거를 발견할 수 있습니다.",
    "물병자리의 독창성이 절정입니다. 모두가 무시하는 미래 기술주를 지금 담아두세요.",
  ],
  물고기자리: [
    "해왕성의 신비로운 기운을 받은 물고기자리, 오늘은 이성보다 직관이 맞습니다. 마음이 끌리는 섹터를 따르세요.",
    "물처럼 흐르는 물고기의 에너지. 트렌드의 흐름을 타되 집착은 금물. 유연한 진출입이 관건입니다.",
    "물고기의 공감 능력이 시장 심리를 읽습니다. 대중의 공포는 매수 기회, 대중의 탐욕은 매도 신호입니다.",
  ],
};

// 오행별 추천 섹터 DB
const SECTOR_DB = {
  목: {
    kr: [
      { name:"바이오·헬스케어",  signal:"BUY",   reason:"木 기운 보충 최우선 — 생명·성장 섹터" },
      { name:"친환경·ESG",       signal:"BUY",   reason:"木의 자연 에너지와 공명" },
      { name:"농업·식품",        signal:"WATCH", reason:"木 보조 섹터 — 분할 진입" },
    ],
    us: [
      { name:"헬스케어 ETF",     signal:"BUY",   reason:"글로벌 木 기운 최적 섹터" },
      { name:"그린에너지",       signal:"BUY",   reason:"친환경 성장 스토리" },
      { name:"농업·곡물 ETF",    signal:"WATCH", reason:"Wood 원소 글로벌 연계" },
    ],
  },
  화: {
    kr: [
      { name:"반도체·전자",      signal:"BUY",   reason:"火 기운 보충 핵심 — 빛·혁신 섹터" },
      { name:"AI·로봇",          signal:"BUY",   reason:"화려한 火의 창조적 에너지" },
      { name:"엔터·미디어",      signal:"WATCH", reason:"火 연관 — 가시성·광채 섹터" },
    ],
    us: [
      { name:"AI칩·NVIDIA계",   signal:"BUY",   reason:"글로벌 火 기운 최강 섹터" },
      { name:"빅테크 (MAG7)",    signal:"BUY",   reason:"화염처럼 타오르는 성장" },
      { name:"엔터테인먼트",     signal:"WATCH", reason:"火의 광채 — 야간장 주목" },
    ],
  },
  토: {
    kr: [
      { name:"건설·부동산",      signal:"BUY",   reason:"土 기운 보충 — 대지·기반 섹터" },
      { name:"인프라·공공",      signal:"BUY",   reason:"土의 안정적 에너지" },
      { name:"리츠",             signal:"WATCH", reason:"土 연관 부동산 간접투자" },
    ],
    us: [
      { name:"부동산 ETF (VNQ)", signal:"BUY",   reason:"글로벌 土 기운 섹터" },
      { name:"인프라 ETF",       signal:"BUY",   reason:"대지의 안정적 수익" },
      { name:"건자재·시멘트",    signal:"WATCH", reason:"土 원소 글로벌 연계" },
    ],
  },
  금: {
    kr: [
      { name:"철강·금속",        signal:"BUY",   reason:"金 기운 보충 — 수확·결실 섹터" },
      { name:"방산·기계",        signal:"BUY",   reason:"金의 날카로운 결단 에너지" },
      { name:"자동차·부품",      signal:"WATCH", reason:"金 연관 제조업 섹터" },
    ],
    us: [
      { name:"금·귀금속 ETF",    signal:"BUY",   reason:"글로벌 金 기운 직접 섹터" },
      { name:"방산 ETF (XAR)",   signal:"BUY",   reason:"金의 예리함·강인함" },
      { name:"산업재 ETF",       signal:"WATCH", reason:"金 원소 제조업 연계" },
    ],
  },
  수: {
    kr: [
      { name:"금융·은행",        signal:"BUY",   reason:"水 기운 보충 — 흐름·축적 섹터" },
      { name:"해운·물류",        signal:"BUY",   reason:"水의 유연한 순환 에너지" },
      { name:"수처리·환경",      signal:"WATCH", reason:"水 연관 친환경 섹터" },
    ],
    us: [
      { name:"금융 ETF (XLF)",   signal:"BUY",   reason:"글로벌 水 기운 핵심 섹터" },
      { name:"물류·해운 ETF",    signal:"BUY",   reason:"水의 흐름·순환" },
      { name:"워터 ETF (PHO)",   signal:"WATCH", reason:"Water 원소 직접 투자" },
    ],
  },
};

// 별자리별 추천 섹터
const ZODIAC_SECTOR = {
  양자리:     { kr:["방산·항공","바이오·헬스","2차전지"],   us:["빅테크","반도체","우주항공"] },
  황소자리:   { kr:["금융·은행","리츠","유틸리티"],          us:["배당주","금·원자재","금융ETF"] },
  쌍둥이자리: { kr:["IT·플랫폼","미디어·엔터","게임"],       us:["AI소프트","소셜미디어","스트리밍"] },
  게자리:     { kr:["음식료·생활","건설·인프라","조선"],     us:["소비재","헬스케어","부동산"] },
  사자자리:   { kr:["엔터·콘텐츠","화장품·뷰티","패션"],    us:["럭셔리","미디어","빅테크"] },
  처녀자리:   { kr:["제약·바이오","의료기기","환경"],        us:["헬스케어","바이오텍","친환경"] },
  천칭자리:   { kr:["화학·소재","자동차","2차전지"],         us:["EV","소재","산업재"] },
  전갈자리:   { kr:["반도체","AI·로봇","방산"],              us:["반도체","AI데이터","사이버보안"] },
  사수자리:   { kr:["여행·레저","항공","면세·소비"],         us:["여행·항공","카지노","소비재"] },
  염소자리:   { kr:["에너지","인프라","통신"],               us:["에너지","유틸리티","인프라"] },
  물병자리:   { kr:["AI·로봇","메타버스","핀테크"],          us:["혁신기술ETF","핀테크","우주"] },
  물고기자리: { kr:["게임·NFT","콘텐츠·IP","해운"],         us:["스트리밍","게임","디지털자산"] },
};

// 별자리 속성
const ZODIAC_META = {
  양자리:     { symbol:"♈", el:"火", planet:"화성",  dates:"3.21~4.19" },
  황소자리:   { symbol:"♉", el:"土", planet:"금성",  dates:"4.20~5.20" },
  쌍둥이자리: { symbol:"♊", el:"風", planet:"수성",  dates:"5.21~6.21" },
  게자리:     { symbol:"♋", el:"水", planet:"달",    dates:"6.22~7.22" },
  사자자리:   { symbol:"♌", el:"火", planet:"태양",  dates:"7.23~8.22" },
  처녀자리:   { symbol:"♍", el:"土", planet:"수성",  dates:"8.23~9.22" },
  천칭자리:   { symbol:"♎", el:"風", planet:"금성",  dates:"9.23~10.22" },
  전갈자리:   { symbol:"♏", el:"水", planet:"명왕성",dates:"10.23~11.21" },
  사수자리:   { symbol:"♐", el:"火", planet:"목성",  dates:"11.22~12.21" },
  염소자리:   { symbol:"♑", el:"土", planet:"토성",  dates:"12.22~1.19" },
  물병자리:   { symbol:"♒", el:"風", planet:"천왕성",dates:"1.20~2.18" },
  물고기자리: { symbol:"♓", el:"水", planet:"해왕성",dates:"2.19~3.20" },
};

// 별자리 → 일진 기반 종합 스탠스
const ZODIAC_ILJIN_MODIFY = {
  목: { 양자리:"BUY", 황소자리:"WATCH", 쌍둥이자리:"BUY", 게자리:"BUY", 사자자리:"BUY",
        처녀자리:"WATCH", 천칭자리:"BUY", 전갈자리:"WATCH", 사수자리:"BUY",
        염소자리:"WATCH", 물병자리:"BUY", 물고기자리:"BUY" },
  화: { 양자리:"BUY", 황소자리:"WATCH", 쌍둥이자리:"BUY", 게자리:"WATCH", 사자자리:"BUY",
        처녀자리:"WATCH", 천칭자리:"BUY", 전갈자리:"WATCH", 사수자리:"BUY",
        염소자리:"WATCH", 물병자리:"BUY", 물고기자리:"WATCH" },
  토: { 양자리:"WATCH", 황소자리:"BUY", 쌍둥이자리:"WATCH", 게자리:"WATCH", 사자자리:"WATCH",
        처녀자리:"BUY", 천칭자리:"WATCH", 전갈자리:"WATCH", 사수자리:"WATCH",
        염소자리:"BUY", 물병자리:"WATCH", 물고기자리:"WATCH" },
  금: { 양자리:"AVOID", 황소자리:"WATCH", 쌍둥이자리:"AVOID", 게자리:"AVOID", 사자자리:"AVOID",
        처녀자리:"WATCH", 천칭자리:"WATCH", 전갈자리:"AVOID", 사수자리:"AVOID",
        염소자리:"BUY", 물병자리:"AVOID", 물고기자리:"WATCH" },
  수: { 양자리:"WATCH", 황소자리:"BUY", 쌍둥이자리:"BUY", 게자리:"BUY", 사자자리:"WATCH",
        처녀자리:"WATCH", 천칭자리:"BUY", 전갈자리:"BUY", 사수자리:"WATCH",
        염소자리:"WATCH", 물병자리:"BUY", 물고기자리:"BUY" },
};

// 행운 데이터
const LUCKY_BY_OH = {
  목: { number:"3, 8", color:"초록·청록", time:"오전 7~9시", keyword:"성장", talisman:"🌿" },
  화: { number:"2, 7", color:"빨강·주황", time:"오전 9~11시", keyword:"열정", talisman:"🔥" },
  토: { number:"5, 0", color:"황토·노랑", time:"오후 1~3시",  keyword:"안정", talisman:"🪨" },
  금: { number:"4, 9", color:"흰색·은색", time:"오후 3~5시",  keyword:"결단", talisman:"⚡" },
  수: { number:"1, 6", color:"검정·남색", time:"오후 5~7시",  keyword:"지혜", talisman:"💧" },
};
const LUCKY_BY_ZODIAC = {
  양자리:"🔴", 황소자리:"🌿", 쌍둥이자리:"💛", 게자리:"🔵",
  사자자리:"☀️", 처녀자리:"🌾", 천칭자리:"🌸", 전갈자리:"🖤",
  사수자리:"🎯", 염소자리:"⛰️", 물병자리:"⚡", 물고기자리:"🌊",
};

const AMULET_TIPS = [
  "이 부적을 클릭하면 오늘 양봉이 피어오릅니다 (통계적 근거: 0%)",
  "3번 클릭하면 상한가 기운이 깃든다는 설이 있습니다",
  "부적 에너지 충전 완료 — 주가는 여전히 본인 책임입니다",
  "붉은 기운이 차트를 물들입니다 🕯 (연출입니다)",
  "클릭할수록 HTS 수익률 숫자가 빨개지는 기분이 납니다",
];

const DAYS_KR = ["일","월","화","수","목","금","토"];

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${DAYS_KR[d.getDay()]}요일`;
}


// ════════════════════════════════════════════════════════════════
//  ③ 계산 엔진 — 사주 분석
// ════════════════════════════════════════════════════════════════

function analyzeSaju(year, month, day, hour) {
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

function analyzeZodiac(sign, birthMonth, birthDay) {
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
    <div style={{display:"flex",alignItems:"center",gap:12,background:C.panel2,
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
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
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
                fontSize:9,color:"#FFD700",whiteSpace:"nowrap",fontFamily:F.mono}}>부족↑</div>}
              {isDom&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",
                fontSize:9,color:"#FF8070",whiteSpace:"nowrap",fontFamily:F.mono}}>과다↓</div>}
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
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

const HOURS_LIST = [
  {label:"모름 (시주 미포함)", val:-1},
  {label:"자시 (23~01시) · 子", val:0},
  {label:"축시 (01~03시) · 丑", val:2},
  {label:"인시 (03~05시) · 寅", val:4},
  {label:"묘시 (05~07시) · 卯", val:6},
  {label:"진시 (07~09시) · 辰", val:8},
  {label:"사시 (09~11시) · 巳", val:10},
  {label:"오시 (11~13시) · 午", val:12},
  {label:"미시 (13~15시) · 未", val:14},
  {label:"신시 (15~17시) · 申", val:16},
  {label:"유시 (17~19시) · 酉", val:18},
  {label:"술시 (19~21시) · 戌", val:20},
  {label:"해시 (21~23시) · 亥", val:22},
];

const ZODIACS_LIST = [
  {sign:"양자리",symbol:"♈",dates:"3.21~4.19"},
  {sign:"황소자리",symbol:"♉",dates:"4.20~5.20"},
  {sign:"쌍둥이자리",symbol:"♊",dates:"5.21~6.21"},
  {sign:"게자리",symbol:"♋",dates:"6.22~7.22"},
  {sign:"사자자리",symbol:"♌",dates:"7.23~8.22"},
  {sign:"처녀자리",symbol:"♍",dates:"8.23~9.22"},
  {sign:"천칭자리",symbol:"♎",dates:"9.23~10.22"},
  {sign:"전갈자리",symbol:"♏",dates:"10.23~11.21"},
  {sign:"사수자리",symbol:"♐",dates:"11.22~12.21"},
  {sign:"염소자리",symbol:"♑",dates:"12.22~1.19"},
  {sign:"물병자리",symbol:"♒",dates:"1.20~2.18"},
  {sign:"물고기자리",symbol:"♓",dates:"2.19~3.20"},
];

function isValidDate(y, m, d) {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export default function AntFortune() {
  const [mode, setMode]       = useState("saju");
  // 사주
  const [yr, setYr]           = useState("");
  const [mo, setMo]           = useState("");
  const [dy, setDy]           = useState("");
  const [hr, setHr]           = useState(-1);
  const [gd, setGd]           = useState("남성");
  // 별자리
  const [bMo, setBMo]         = useState("");
  const [bDy, setBDy]         = useState("");
  const [selZodiac, setSelZodiac] = useState(null);
  // 결과
  const [sajuRes, setSajuRes] = useState(null);
  const [zodiacRes, setZodiacRes] = useState(null);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const resRef = useRef(null);

  // 별자리 생일 자동 감지
  useEffect(()=>{
    if(bMo && bDy) {
      const sign = getZodiac(Number(bMo), Number(bDy));
      setSelZodiac(sign);
    }
  },[bMo, bDy]);

  const runSaju = () => {
    setError("");
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
        body{background:#04070D;color:#DCE6F4;font-family:'Noto Sans KR',sans-serif}
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
          <div style={{fontFamily:F.mono,fontSize:10,letterSpacing:5,
            color:C.gold,marginBottom:14,opacity:.7}}>
            ✦ 완전 로컬 · 만세력 오행 엔진 · API 없음 ✦
          </div>
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
                value={yr} onChange={e=>setYr(e.target.value)} min="1900" max="2010"/>
              <Sel label="태어난 월" value={mo} onChange={setMo}>
                <option value="">월 선택</option>
                {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}월</option>)}
              </Sel>
              <Sel label="태어난 일" value={dy} onChange={setDy}>
                <option value="">일 선택</option>
                {Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}일</option>)}
              </Sel>
            </div>
            <div style={{display:"flex",gap:13,flexWrap:"wrap"}}>
              <Sel label="태어난 시간 (시주·時柱)" value={hr} onChange={v=>setHr(Number(v))}>
                {HOURS_LIST.map(h=><option key={h.val} value={h.val}>{h.label}</option>)}
              </Sel>
              <Sel label="성별" value={gd} onChange={setGd}>
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
              <Sel label="태어난 월 (자동 판별)" value={bMo} onChange={setBMo}>
                <option value="">월 선택</option>
                {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}월</option>)}
              </Sel>
              <Sel label="태어난 일" value={bDy} onChange={setBDy}>
                <option value="">일 선택</option>
                {Array.from({length:31},(_,i)=><option key={i+1} value={i+1}>{i+1}일</option>)}
              </Sel>
              {selZodiac && (
                <div style={{flex:"1 1 140px",display:"flex",alignItems:"flex-end"}}>
                  <div style={{background:"rgba(201,168,76,.1)",border:`1px solid ${C.gold}50`,
                    borderRadius:7,padding:"10px 16px",width:"100%",textAlign:"center"}}>
                    <div style={{fontFamily:F.mono,fontSize:9,color:C.dim,letterSpacing:2,marginBottom:4}}>
                      자동 판별 결과
                    </div>
                    <div style={{fontFamily:F.display,fontSize:16,color:C.goldL}}>
                      {ZODIAC_META[selZodiac]?.symbol} {selZodiac}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* 직접 선택 */}
            <div style={{fontFamily:F.mono,fontSize:10,color:C.dim,letterSpacing:2,
              marginBottom:12,textAlign:"center"}}>— 또는 별자리 직접 선택 —</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8,marginBottom:18}}>
              {ZODIACS_LIST.map((z)=>{
                const sel=selZodiac===z.sign;
                return (
                  <div key={z.sign} onClick={()=>setSelZodiac(z.sign)}
                       role="button" tabIndex={0}
                       onKeyDown={(e)=>(e.key==="Enter"||e.key===" ")&&setSelZodiac(z.sign)}
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
          This is NOT financial advice · 이 앱은 외부 API를 전혀 사용하지 않습니다.
        </div>
      </div>
    </>
  );
}

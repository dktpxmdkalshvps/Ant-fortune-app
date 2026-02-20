import { useState, useEffect, useRef, useCallback } from 'react';

// ─── 상수 데이터 ───────────────────────────────────────────────
const ZODIACS = [
  {
    sign: '양자리',
    en: 'Aries',
    symbol: '♈',
    dates: '3.21~4.19',
    element: '火',
  },
  {
    sign: '황소자리',
    en: 'Taurus',
    symbol: '♉',
    dates: '4.20~5.20',
    element: '土',
  },
  {
    sign: '쌍둥이자리',
    en: 'Gemini',
    symbol: '♊',
    dates: '5.21~6.21',
    element: '風',
  },
  {
    sign: '게자리',
    en: 'Cancer',
    symbol: '♋',
    dates: '6.22~7.22',
    element: '水',
  },
  {
    sign: '사자자리',
    en: 'Leo',
    symbol: '♌',
    dates: '7.23~8.22',
    element: '火',
  },
  {
    sign: '처녀자리',
    en: 'Virgo',
    symbol: '♍',
    dates: '8.23~9.22',
    element: '土',
  },
  {
    sign: '천칭자리',
    en: 'Libra',
    symbol: '♎',
    dates: '9.23~10.22',
    element: '風',
  },
  {
    sign: '전갈자리',
    en: 'Scorpio',
    symbol: '♏',
    dates: '10.23~11.21',
    element: '水',
  },
  {
    sign: '사수자리',
    en: 'Sagittarius',
    symbol: '♐',
    dates: '11.22~12.21',
    element: '火',
  },
  {
    sign: '염소자리',
    en: 'Capricorn',
    symbol: '♑',
    dates: '12.22~1.19',
    element: '土',
  },
  {
    sign: '물병자리',
    en: 'Aquarius',
    symbol: '♒',
    dates: '1.20~2.18',
    element: '風',
  },
  {
    sign: '물고기자리',
    en: 'Pisces',
    symbol: '♓',
    dates: '2.19~3.20',
    element: '水',
  },
];

const HOURS = [
  '모름',
  '자시(23~01시) · 子',
  '축시(01~03시) · 丑',
  '인시(03~05시) · 寅',
  '묘시(05~07시) · 卯',
  '진시(07~09시) · 辰',
  '사시(09~11시) · 巳',
  '오시(11~13시) · 午',
  '미시(13~15시) · 未',
  '신시(15~17시) · 申',
  '유시(17~19시) · 酉',
  '술시(19~21시) · 戌',
  '해시(21~23시) · 亥',
];

const LOADING_MSGS = [
  '천기를 읽는 중...',
  '오행을 분석하는 중...',
  '증시 기운을 탐색하는 중...',
  '부적에 기운을 담는 중...',
  '행운의 테마를 선별하는 중...',
];

const ELEMENTS = [
  {
    key: 'wood',
    char: '木',
    label: '목',
    color: '#4ECDA0',
    bg: 'rgba(78,205,160,0.12)',
    border: 'rgba(78,205,160,0.3)',
  },
  {
    key: 'fire',
    char: '火',
    label: '화',
    color: '#FF6432',
    bg: 'rgba(255,100,50,0.12)',
    border: 'rgba(255,100,50,0.3)',
  },
  {
    key: 'earth',
    char: '土',
    label: '토',
    color: '#B48C3C',
    bg: 'rgba(180,140,60,0.12)',
    border: 'rgba(180,140,60,0.3)',
  },
  {
    key: 'metal',
    char: '金',
    label: '금',
    color: '#C8C8E6',
    bg: 'rgba(200,200,230,0.12)',
    border: 'rgba(200,200,230,0.3)',
  },
  {
    key: 'water',
    char: '水',
    label: '수',
    color: '#3C78DC',
    bg: 'rgba(60,120,220,0.12)',
    border: 'rgba(60,120,220,0.3)',
  },
];

// ─── 스타일 상수 ───────────────────────────────────────────────
const C = {
  gold: '#C9A84C',
  goldLight: '#F0D080',
  jade: '#4ECDA0',
  navy: '#06090F',
  panel: '#0F1526',
  panel2: '#141B2E',
  red: '#FF3B3B',
  blue: '#3B8BFF',
  textDim: '#6B7A99',
  textMid: '#A0AECF',
  textBright: '#E8EDF8',
  border: 'rgba(201,168,76,0.2)',
};

const s = {
  panel: {
    background: C.panel,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
  },
  mono: { fontFamily: "'Share Tech Mono', monospace" },
  serif: { fontFamily: "'Noto Serif KR', serif" },
  sectionTitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: C.gold,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
};

// ─── 유틸리티 ─────────────────────────────────────────────────
function getTodayStr() {
  const d = new Date();
  const days = [
    '일요일',
    '월요일',
    '화요일',
    '수요일',
    '목요일',
    '금요일',
    '토요일',
  ];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${
    days[d.getDay()]
  }`;
}

function buildPrompt(mode, info) {
  const schema = `{
  "stance": "STRONG_BUY"|"HOLD"|"SELL",
  "stance_kr": "적극 매수"|"관망"|"매도 후 현금 확보",
  "energy_title": "오늘의 기운 제목 15자 이내",
  "today_reading": "오늘의 기운 설명 80자 이내",
  "kr_themes": ["테마1","테마2","테마3"],
  "kr_sectors": [{"name":"섹터","signal":"BUY"|"WATCH"|"AVOID","reason":"이유20자"},...(3개)],
  "us_themes": ["테마1","테마2","테마3"],
  "us_sectors": [{"name":"섹터","signal":"BUY"|"WATCH"|"AVOID","reason":"이유20자"},...(3개)],
  "lucky_number": "숫자",
  "lucky_color": "색상",
  "lucky_time": "시간대",
  "lucky_keyword": "키워드5자이내",
  "five_elements": {"wood":0~100,"fire":0~100,"earth":0~100,"metal":0~100,"water":0~100},
  "dominant_element": "木|火|土|金|水",
  "lacking_element": "木|火|土|金|水",
  "amulet_tip": "유머러스한 한줄20자"
}`;
  const guide =
    mode === 'saju'
      ? '[사주] 만세력 기반 오행 분석. 부족한 오행을 채우는 섹터 추천. 성격분석 금지.'
      : '[별자리] 해당 별자리 속성·오늘 기운 매칭해 투자 스탠스 결정.';
  return `당신은 사주명리·점성술 기반 투자 엔터테인먼트 AI입니다.\n오늘: ${getTodayStr()}\n사용자: ${info}\n${guide}\n\n아래 JSON만 출력(코드블록·설명 없이):\n${schema}`;
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────

function StarCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    let anim;
    const stars = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.4 + 0.3,
        opacity: Math.random() * 0.6 + 0.1,
        speed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2,
      });
    }
    const draw = (t) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        const o =
          s.opacity *
          (0.5 + 0.5 * Math.sin((t / 1000) * s.speed * 10 + s.phase));
        ctx.globalAlpha = o;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      anim = requestAnimationFrame(draw);
    };
    anim = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(anim);
      window.removeEventListener('resize', resize);
    };
  }, []);
  return (
    <canvas
      ref={ref}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
    />
  );
}

function MarketClock() {
  const [times, setTimes] = useState({
    kr: '',
    us: '',
    krOpen: false,
    usOpen: false,
  });
  const tick = () => {
    const now = new Date();
    const krH = (((now.getUTCHours() + 9) % 24) + 24) % 24;
    const usH = (((now.getUTCHours() - 5) % 24) + 24) % 24;
    const m = String(now.getUTCMinutes()).padStart(2, '0');
    setTimes({
      kr: `KR ${String(krH).padStart(2, '0')}:${m}`,
      us: `US ${String(usH).padStart(2, '0')}:${m}`,
      krOpen: krH >= 9 && krH < 16,
      usOpen: usH >= 9 && usH < 16,
    });
  };
  useEffect(() => {
    tick();
    const t = setInterval(tick, 30000);
    return () => clearInterval(t);
  }, []);

  const pill = (label, open, color) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: C.panel,
        border: `1px solid ${C.border}`,
        borderRadius: 100,
        padding: '8px 20px',
        ...s.mono,
        fontSize: 12,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: 'pulse 2s infinite',
        }}
      />
      {label} {open ? '🟢 장중' : '⚫ 장외'}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 32,
      }}
    >
      {pill(times.kr, times.krOpen, C.gold)}
      {pill(times.us, times.usOpen, C.jade)}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={s.sectionTitle}>
      {children}
      <span style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function FormSelect({ label, value, onChange, children }) {
  return (
    <div style={{ flex: 1, minWidth: 120 }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          color: C.textDim,
          letterSpacing: 2,
          marginBottom: 8,
          ...s.mono,
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          background: C.panel2,
          border: `1px solid rgba(201,168,76,0.25)`,
          borderRadius: 4,
          color: C.textBright,
          ...s.mono,
          fontSize: 13,
          padding: '11px 14px',
          outline: 'none',
        }}
      >
        {children}
      </select>
    </div>
  );
}

function ZodiacGrid({ selected, onSelect }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 8,
        marginBottom: 20,
      }}
    >
      {ZODIACS.map((z, i) => (
        <div
          key={i}
          onClick={() => onSelect(z)}
          style={{
            background:
              selected?.sign === z.sign ? 'rgba(201,168,76,0.12)' : C.panel2,
            border: `1px solid ${
              selected?.sign === z.sign ? C.gold : 'rgba(201,168,76,0.15)'
            }`,
            borderRadius: 6,
            padding: '10px 6px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.25s',
            boxShadow:
              selected?.sign === z.sign
                ? '0 0 20px rgba(201,168,76,0.4)'
                : 'none',
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 4 }}>{z.symbol}</div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: selected?.sign === z.sign ? C.goldLight : C.textBright,
            }}
          >
            {z.sign}
          </div>
          <div style={{ fontSize: 10, color: C.textDim, ...s.mono }}>
            {z.dates}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyzeButton({ onClick, disabled, children }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%',
        padding: '17px',
        marginTop: 8,
        background: hover ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.12)',
        border: `1px solid ${C.gold}`,
        borderRadius: 4,
        color: C.goldLight,
        ...s.serif,
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s',
        opacity: disabled ? 0.5 : 1,
        boxShadow: hover ? '0 0 20px rgba(201,168,76,0.4)' : 'none',
      }}
    >
      {children}
    </button>
  );
}

function LoadingOrb({ msg }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 35%, #F0D080, #C9A84C, #8B5E1A)',
          margin: '0 auto 24px',
          boxShadow: '0 0 50px rgba(201,168,76,0.7)',
          animation: 'spin 3s linear infinite',
        }}
      />
      <div
        style={{
          color: C.gold,
          ...s.serif,
          fontSize: 14,
          letterSpacing: 3,
          animation: 'blink 1.5s infinite',
        }}
      >
        {msg}
      </div>
    </div>
  );
}

function StanceBanner({ stance, stanceKr, title }) {
  const configs = {
    STRONG_BUY: {
      cls: 'buy',
      emoji: '🔴',
      color: '#FF3B3B',
      glow: 'rgba(255,59,59,0.6)',
      bg: 'rgba(255,59,59,0.1)',
      border: 'rgba(255,59,59,0.4)',
    },
    HOLD: {
      cls: 'hold',
      emoji: '⚖️',
      color: C.goldLight,
      glow: 'rgba(201,168,76,0.6)',
      bg: 'rgba(201,168,76,0.1)',
      border: 'rgba(201,168,76,0.4)',
    },
    SELL: {
      cls: 'sell',
      emoji: '🔵',
      color: '#3B8BFF',
      glow: 'rgba(59,139,255,0.6)',
      bg: 'rgba(59,139,255,0.1)',
      border: 'rgba(59,139,255,0.4)',
    },
  };
  const cfg = configs[stance] || configs.HOLD;
  return (
    <div
      style={{
        borderRadius: 8,
        padding: '32px 24px',
        textAlign: 'center',
        marginBottom: 16,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        animation: 'fadeUp 0.5s ease',
      }}
    >
      <div
        style={{
          ...s.mono,
          fontSize: 11,
          letterSpacing: 4,
          color: C.textDim,
          marginBottom: 8,
        }}
      >
        TODAY'S INVESTMENT STANCE
      </div>
      <div
        style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: 'clamp(22px,4vw,38px)',
          fontWeight: 700,
          color: cfg.color,
          textShadow: `0 0 30px ${cfg.glow}`,
          marginBottom: 8,
        }}
      >
        {cfg.emoji} {stanceKr}
      </div>
      <div style={{ ...s.serif, fontSize: 14, color: C.textDim }}>{title}</div>
    </div>
  );
}

function ElementsBar({ elements }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
      {ELEMENTS.map((e) => {
        const val = elements?.[e.key] ?? 20;
        return (
          <div
            key={e.key}
            style={{
              flex: 1,
              padding: '8px 4px',
              borderRadius: 4,
              textAlign: 'center',
              background: e.bg,
              border: `1px solid ${e.border}`,
              fontSize: 11,
              ...s.mono,
            }}
          >
            <div style={{ fontSize: 16, color: e.color, marginBottom: 2 }}>
              {e.char}
            </div>
            <div style={{ color: e.color }}>{e.label}</div>
            <div
              style={{
                height: 3,
                borderRadius: 2,
                background: e.border,
                marginTop: 6,
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 2,
                  background: e.color,
                  width: `${val}%`,
                  transition: 'width 1s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SectorList({ sectors, isDay }) {
  const signalStyle = (sig) =>
    ({
      BUY: {
        bg: 'rgba(255,59,59,0.15)',
        color: '#FF3B3B',
        border: 'rgba(255,59,59,0.3)',
        label: '매수',
      },
      WATCH: {
        bg: 'rgba(201,168,76,0.12)',
        color: C.gold,
        border: 'rgba(201,168,76,0.3)',
        label: '관망',
      },
      AVOID: {
        bg: 'rgba(59,139,255,0.12)',
        color: '#3B8BFF',
        border: 'rgba(59,139,255,0.3)',
        label: '회피',
      },
    }[sig] || {
      bg: 'transparent',
      color: C.textDim,
      border: C.border,
      label: sig,
    });

  return (
    <div>
      {(sectors || []).map((sec, i) => {
        const ss = signalStyle(sec.signal);
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 0',
              borderBottom:
                i < sectors.length - 1
                  ? '1px solid rgba(255,255,255,0.04)'
                  : 'none',
              fontSize: 13,
            }}
          >
            <span
              style={{ ...s.mono, fontSize: 10, color: C.textDim, width: 20 }}
            >
              0{i + 1}
            </span>
            <span style={{ flex: 1, color: C.textBright }}>{sec.name}</span>
            <span
              style={{
                fontSize: 11,
                color: C.textDim,
                flex: 1,
                padding: '0 8px',
              }}
            >
              {sec.reason}
            </span>
            <span
              style={{
                ...s.mono,
                fontSize: 11,
                padding: '2px 10px',
                borderRadius: 3,
                background: ss.bg,
                color: ss.color,
                border: `1px solid ${ss.border}`,
              }}
            >
              {ss.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function MarketPanel({ isDay, themes, sectors }) {
  const accent = isDay ? C.gold : C.jade;
  const accentBg = isDay ? 'rgba(201,168,76,0.05)' : 'rgba(78,205,160,0.05)';
  const accentBorder = isDay ? 'rgba(201,168,76,0.3)' : 'rgba(78,205,160,0.3)';
  const themeTag = isDay
    ? {
        bg: 'rgba(201,168,76,0.15)',
        border: 'rgba(201,168,76,0.3)',
        color: C.goldLight,
      }
    : {
        bg: 'rgba(78,205,160,0.12)',
        border: 'rgba(78,205,160,0.3)',
        color: C.jade,
      };

  return (
    <div
      style={{
        ...s.panel,
        padding: 24,
        background: `linear-gradient(135deg, ${accentBg}, ${C.panel})`,
        border: `1px solid ${accentBorder}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          paddingBottom: 14,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <span style={{ fontSize: 22 }}>{isDay ? '☀️' : '🌙'}</span>
        <div>
          <div style={{ ...s.serif, fontWeight: 700, fontSize: 15 }}>
            {isDay ? '낮의 장' : '밤의 장'}
          </div>
          <div
            style={{
              ...s.mono,
              fontSize: 10,
              color: C.textDim,
              letterSpacing: 2,
            }}
          >
            {isDay ? 'KOSPI · KOSDAQ' : 'NYSE · NASDAQ'}
          </div>
        </div>
        <div
          style={{ marginLeft: 'auto', ...s.mono, fontSize: 11, color: accent }}
        >
          {isDay ? 'KR MARKET' : 'US MARKET'}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        {(themes || []).map((t, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              padding: '3px 12px',
              borderRadius: 100,
              fontSize: 12,
              ...s.mono,
              margin: '3px 3px 3px 0',
              letterSpacing: 1,
              background: themeTag.bg,
              border: `1px solid ${themeTag.border}`,
              color: themeTag.color,
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <SectorList sectors={sectors} isDay={isDay} />
    </div>
  );
}

function LuckyItem({ icon, label, value, wide, isAmulet }) {
  const [clicked, setClicked] = useState(false);
  return (
    <div
      onClick={isAmulet ? () => setClicked((c) => !c) : undefined}
      style={{
        background: C.panel2,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: 16,
        textAlign: 'center',
        gridColumn: wide ? 'span 2' : 'span 1',
        cursor: isAmulet ? 'pointer' : 'default',
      }}
    >
      {isAmulet ? (
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #CC2200, #FF4422)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 30,
            margin: '0 auto 8px',
            boxShadow: '0 0 30px rgba(255,59,59,0.5)',
            transform: clicked ? 'scale(1.15)' : 'scale(1)',
            transition: 'transform 0.3s',
            animation: 'amuletPulse 3s ease-in-out infinite',
          }}
        >
          🔴
        </div>
      ) : (
        <div style={{ fontSize: 26, marginBottom: 8 }}>{icon}</div>
      )}
      <div
        style={{
          ...s.mono,
          fontSize: 9,
          color: C.textDim,
          letterSpacing: 2,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...s.serif,
          fontSize: 13,
          color: C.goldLight,
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Results({ data }) {
  if (!data) return null;
  return (
    <div style={{ animation: 'fadeUp 0.5s ease' }}>
      <StanceBanner
        stance={data.stance}
        stanceKr={data.stance_kr}
        title={data.energy_title}
      />

      {/* 오늘의 기운 */}
      <div style={{ ...s.panel, padding: 24, marginBottom: 16 }}>
        <div
          style={{
            ...s.serif,
            fontSize: 14,
            lineHeight: 1.9,
            color: C.textMid,
            borderLeft: `2px solid ${C.gold}`,
            paddingLeft: 16,
          }}
        >
          {data.today_reading}
        </div>
        <ElementsBar elements={data.five_elements} />
        {data.lacking_element && (
          <div
            style={{
              marginTop: 12,
              fontSize: 12,
              color: C.gold,
              ...s.mono,
              letterSpacing: 1,
            }}
          >
            ⬆ 보충 필요: {data.lacking_element} &nbsp;|&nbsp; ⬇ 과다:{' '}
            {data.dominant_element}
          </div>
        )}
      </div>

      {/* KR + US */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <MarketPanel isDay themes={data.kr_themes} sectors={data.kr_sectors} />
        <MarketPanel
          isDay={false}
          themes={data.us_themes}
          sectors={data.us_sectors}
        />
      </div>

      {/* 행운 아이템 */}
      <div style={{ ...s.panel, padding: 24, marginBottom: 16 }}>
        <SectionTitle>✦ 오늘의 행운 아이템</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            gap: 14,
          }}
        >
          <LuckyItem icon="🔢" label="LUCKY NUMBER" value={data.lucky_number} />
          <LuckyItem icon="🎨" label="LUCKY COLOR" value={data.lucky_color} />
          <LuckyItem icon="⏰" label="BEST TIME" value={data.lucky_time} />
          <LuckyItem icon="🔑" label="KEYWORD" value={data.lucky_keyword} />
          <LuckyItem
            isAmulet
            label="상승장 기원 부적 · 클릭!"
            value={data.amulet_tip || '양봉이 피어오르리라'}
            wide
          />
        </div>
      </div>
    </div>
  );
}

// ─── 메인 앱 ──────────────────────────────────────────────────
export default function AntFortune() {
  const [mode, setMode] = useState('zodiac');
  const [selectedZodiac, setSelectedZodiac] = useState(null);
  const [zMarket, setZMarket] = useState('both');
  const [sYear, setSYear] = useState('');
  const [sMonth, setSMonth] = useState('');
  const [sDay, setSDay] = useState('');
  const [sHour, setSHour] = useState('모름');
  const [sGender, setSGender] = useState('남성');
  const [sMarket, setSMarket] = useState('both');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const resultsRef = useRef(null);

  const analyze = useCallback(async () => {
    setError('');
    let userInfo = '';
    if (mode === 'zodiac') {
      if (!selectedZodiac) {
        setError('별자리를 선택해주세요.');
        return;
      }
      userInfo = `별자리: ${selectedZodiac.sign} (${selectedZodiac.en}), 원소: ${selectedZodiac.element}, 시장: ${zMarket}`;
    } else {
      if (!sYear || !sMonth || !sDay) {
        setError('생년월일을 모두 입력해주세요.');
        return;
      }
      userInfo = `생년월일: ${sYear}년 ${sMonth}월 ${sDay}일, 시간: ${sHour}, 성별: ${sGender}, 시장: ${sMarket}`;
    }

    setLoading(true);
    setResult(null);
    let idx = 0;
    const msgTimer = setInterval(() => {
      idx = (idx + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[idx]);
    }, 1500);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: buildPrompt(mode, userInfo) }],
        }),
      });
      const data = await res.json();
      const text = data.content.map((c) => c.text || '').join('');
      const clean = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setTimeout(
        () => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }),
        100
      );
    } catch {
      setError('운세 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      clearInterval(msgTimer);
      setLoading(false);
    }
  }, [
    mode,
    selectedZodiac,
    zMarket,
    sYear,
    sMonth,
    sDay,
    sHour,
    sGender,
    sMarket,
  ]);

  return (
    <>
      {/* 전역 CSS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;700;900&family=Cinzel+Decorative:wght@400;700&family=Share+Tech+Mono&family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #06090F; }
        select, input { appearance: none; -webkit-appearance: none; }
        select option { background: #141B2E; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes amuletPulse { 0%,100%{box-shadow:0 0 30px rgba(255,59,59,0.5)} 50%{box-shadow:0 0 60px rgba(255,59,59,0.9)} }
        @keyframes headerGlow { 0%,100%{text-shadow:0 0 40px rgba(201,168,76,0.6)} 50%{text-shadow:0 0 80px rgba(201,168,76,1)} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #06090F; }
        ::-webkit-scrollbar-thumb { background: #C9A84C44; border-radius: 2px; }
      `}</style>

      <StarCanvas />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Noto Sans KR', sans-serif",
          color: C.textBright,
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 28px 80px',
          minHeight: '100vh',
        }}
      >
        {/* 헤더 */}
        <div style={{ textAlign: 'center', padding: '48px 0 32px' }}>
          <div
            style={{
              ...s.mono,
              fontSize: 11,
              letterSpacing: 4,
              color: C.gold,
              marginBottom: 16,
              opacity: 0.8,
            }}
          >
            ✦ 오늘의 기운으로 읽는 증시 ✦
          </div>
          <h1
            style={{
              fontFamily: "'Cinzel Decorative', serif",
              fontSize: 'clamp(22px,3.5vw,38px)',
              color: C.goldLight,
              animation: 'headerGlow 4s ease-in-out infinite',
              letterSpacing: 2,
              lineHeight: 1.2,
              marginBottom: 8,
            }}
          >
            개미의 하루
          </h1>
          <div
            style={{
              ...s.serif,
              fontSize: 13,
              color: C.textDim,
              letterSpacing: 6,
            }}
          >
            별자리 · 사주 투자 운세
          </div>
          <div
            style={{
              width: 200,
              height: 1,
              background: `linear-gradient(90deg,transparent,${C.gold},transparent)`,
              margin: '20px auto 0',
            }}
          />
        </div>

        <MarketClock />

        {/* 모드 토글 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            marginBottom: 32,
          }}
        >
          {[
            { id: 'zodiac', icon: '⭐', label: '퀵 모드 · 별자리' },
            { id: 'saju', icon: '☯️', label: '딥 모드 · 사주', badge: '심층' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => {
                setMode(btn.id);
                setResult(null);
                setError('');
              }}
              style={{
                position: 'relative',
                padding: '13px 36px',
                border: `1px solid ${mode === btn.id ? C.gold : C.border}`,
                borderRadius: 4,
                background: mode === btn.id ? 'rgba(201,168,76,0.12)' : C.panel,
                color: mode === btn.id ? C.goldLight : C.textDim,
                ...s.serif,
                fontSize: 14,
                cursor: 'pointer',
                letterSpacing: 1,
                transition: 'all 0.3s',
                boxShadow:
                  mode === btn.id ? '0 0 20px rgba(201,168,76,0.3)' : 'none',
              }}
            >
              <span style={{ marginRight: 8 }}>{btn.icon}</span>
              {btn.label}
              {btn.badge && (
                <span
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    background: C.gold,
                    color: '#06090F',
                    fontSize: 9,
                    ...s.mono,
                    padding: '2px 6px',
                    borderRadius: 10,
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  {btn.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 별자리 입력 */}
        {mode === 'zodiac' && (
          <div
            style={{
              ...s.panel,
              padding: 32,
              marginBottom: 20,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg,transparent,${C.gold},transparent)`,
              }}
            />
            <SectionTitle>⭐ 별자리 선택</SectionTitle>
            <ZodiacGrid
              selected={selectedZodiac}
              onSelect={setSelectedZodiac}
            />
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <FormSelect
                label="시장 포커스"
                value={zMarket}
                onChange={setZMarket}
              >
                <option value="both">국장 + 미장 모두</option>
                <option value="kr">국장만 (KOSPI/KOSDAQ)</option>
                <option value="us">미장만 (NYSE/NASDAQ)</option>
              </FormSelect>
            </div>
            <AnalyzeButton onClick={analyze} disabled={loading}>
              ✦ 오늘의 기운 분석하기 ✦
            </AnalyzeButton>
          </div>
        )}

        {/* 사주 입력 */}
        {mode === 'saju' && (
          <div
            style={{
              ...s.panel,
              padding: 32,
              marginBottom: 20,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                background: `linear-gradient(90deg,transparent,${C.gold},transparent)`,
              }}
            />
            <SectionTitle>☯️ 사주 정보 입력</SectionTitle>
            <div
              style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                marginBottom: 16,
              }}
            >
              <div style={{ flex: '1.5 1 120px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 11,
                    color: C.textDim,
                    letterSpacing: 2,
                    marginBottom: 8,
                    ...s.mono,
                  }}
                >
                  태어난 연도
                </label>
                <input
                  type="number"
                  placeholder="예: 1990"
                  value={sYear}
                  onChange={(e) => setSYear(e.target.value)}
                  min="1900"
                  max="2010"
                  style={{
                    width: '100%',
                    background: C.panel2,
                    border: `1px solid rgba(201,168,76,0.25)`,
                    borderRadius: 4,
                    color: C.textBright,
                    ...s.mono,
                    fontSize: 13,
                    padding: '11px 14px',
                    outline: 'none',
                  }}
                />
              </div>
              <FormSelect label="태어난 월" value={sMonth} onChange={setSMonth}>
                <option value="">월</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}월
                  </option>
                ))}
              </FormSelect>
              <FormSelect label="태어난 일" value={sDay} onChange={setSDay}>
                <option value="">일</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}일
                  </option>
                ))}
              </FormSelect>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 14,
                flexWrap: 'wrap',
                marginBottom: 8,
              }}
            >
              <FormSelect
                label="태어난 시간 (시주)"
                value={sHour}
                onChange={setSHour}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </FormSelect>
              <FormSelect label="성별" value={sGender} onChange={setSGender}>
                <option value="남성">남성 · 양(陽)</option>
                <option value="여성">여성 · 음(陰)</option>
              </FormSelect>
              <FormSelect
                label="시장 포커스"
                value={sMarket}
                onChange={setSMarket}
              >
                <option value="both">국장 + 미장 모두</option>
                <option value="kr">국장만</option>
                <option value="us">미장만</option>
              </FormSelect>
            </div>
            <AnalyzeButton onClick={analyze} disabled={loading}>
              ☯️ 사주 오행 분석하기 ☯️
            </AnalyzeButton>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div
            style={{
              background: 'rgba(255,59,59,0.1)',
              border: '1px solid rgba(255,59,59,0.3)',
              borderRadius: 6,
              padding: '14px 18px',
              color: '#FF8080',
              fontSize: 13,
              ...s.serif,
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* 로딩 */}
        {loading && <LoadingOrb msg={loadingMsg} />}

        {/* 결과 */}
        <div ref={resultsRef}>
          <Results data={result} />
        </div>

        {/* 면책 조항 */}
        <div
          style={{
            textAlign: 'center',
            padding: '24px 16px',
            fontSize: 11,
            color: C.textDim,
            ...s.mono,
            letterSpacing: 0.5,
            lineHeight: 1.9,
            borderTop: '1px solid rgba(255,255,255,0.05)',
            marginTop: 32,
          }}
        >
          ⚠ 본 결과는 순수한 재미와 엔터테인먼트 목적의 운세 기반 콘텐츠입니다.
          <br />
          실제 투자 결정의 근거로 사용하지 마십시오. 모든 투자의 책임은 본인에게
          있습니다.
          <br />
          This is NOT financial advice. Past celestial performance does not
          guarantee future returns.
        </div>
      </div>
    </>
  );
}

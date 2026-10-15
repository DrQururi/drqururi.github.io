// 天命診断サイト用 占術ロジック（ブラウザ内で完結・外部送信なし）
// 元ロジック: /Users/hakase/ios-apps/uralog/lib/fortune/*.ts からの移植
// 生年月日のみを扱う範囲（出生時刻・出生地は非収集のため、アセンダント・時柱は扱わない）

// ─── 九星気学 ────────────────────────────────────────────
export const STAR_NAMES = {
  1: '一白水星', 2: '二黒土星', 3: '三碧木星',
  4: '四緑木星', 5: '五黄土星', 6: '六白金星',
  7: '七赤金星', 8: '八白土星', 9: '九紫火星',
};
export const STAR_ELEMENTS = {
  1: '水', 2: '土', 3: '木', 4: '木',
  5: '土（中心）', 6: '金', 7: '金', 8: '土', 9: '火',
};
export const STAR_PERSONALITIES = {
  1: '柔軟で知的。流れに乗る才能があり、人の心を読むのが得意です',
  2: '誠実で勤勉。縁の下の力持ちで、人を支えることに喜びを感じます',
  3: '行動力と直感力の持ち主。明るくエネルギッシュで、新しいことへの挑戦を恐れません',
  4: '協調性と社交性に優れています。物事を丁寧に積み上げていく力があります',
  5: '強い意志とカリスマ性の持ち主。中心的な存在として周囲を引き付けます',
  6: '完璧主義で正義感が強く、高い理想を持っています',
  7: '魅力的で社交的。言葉の才能があり、場の空気を明るくします',
  8: '忍耐強く安定志向。変化の中でも地に足のついた判断ができます',
  9: '直感力と表現力に優れています。輝く存在感で周囲を照らします',
};

const SETSUBUN_DAY = { 1: 6, 2: 4, 3: 6, 4: 5, 5: 6, 6: 6, 7: 7, 8: 8, 9: 8, 10: 8, 11: 7, 12: 7 };

function getSetsuMonth(month, day) {
  let effMonth = month;
  if (day < SETSUBUN_DAY[month]) {
    effMonth = month - 1;
    if (effMonth === 0) effMonth = 12;
  }
  return ((effMonth - 2 + 12) % 12) + 1;
}

function calcHonmeiStar(birthDate) {
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  let year = birthDate.getFullYear();
  if (m === 1 || (m === 2 && d < 4)) year -= 1;

  let sum = year;
  while (sum >= 10) {
    sum = String(sum).split('').reduce((a, c) => a + Number(c), 0);
  }
  const star = 11 - sum;
  return star === 10 ? 1 : star;
}

function calcTsukiStar(honmeiStar, birthDate) {
  const setsuMonth = getSetsuMonth(birthDate.getMonth() + 1, birthDate.getDate());
  let baseForToraMonth;
  if ([1, 4, 7].includes(honmeiStar)) baseForToraMonth = 8;
  else if ([2, 5, 8].includes(honmeiStar)) baseForToraMonth = 5;
  else baseForToraMonth = 2;

  const offset = setsuMonth - 1;
  let star = baseForToraMonth - offset;
  while (star <= 0) star += 9;
  return star;
}

export function calcNineStar(birthDate) {
  const honmeiStar = calcHonmeiStar(birthDate);
  const tsukiStar = calcTsukiStar(honmeiStar, birthDate);
  return {
    honmeiStar,
    honmeiStarName: STAR_NAMES[honmeiStar],
    tsukiStar,
    tsukiStarName: STAR_NAMES[tsukiStar],
    element: STAR_ELEMENTS[honmeiStar],
    personality: STAR_PERSONALITIES[honmeiStar],
  };
}

// ─── 数秘術 ────────────────────────────────────────────
const MASTER_NUMBERS = [11, 22, 33];

function reduceToSingle(n) {
  if (MASTER_NUMBERS.includes(n)) return n;
  while (n > 9) {
    n = String(n).split('').reduce((a, c) => a + Number(c), 0);
    if (MASTER_NUMBERS.includes(n)) return n;
  }
  return n;
}

export function calcLifePath(birthDate) {
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  const y = birthDate.getFullYear();
  const ySum = String(y).split('').reduce((a, c) => a + Number(c), 0);
  const yReduced = reduceToSingle(ySum);
  return reduceToSingle(m + d + yReduced);
}

export const NUMEROLOGY_PERSONALITY = {
  1: '独立心が強く、リーダーシップのある先駆者です。自分の道を切り拓く強さを持っています',
  2: '協調性と共感力に優れた調和の人。人と人をつなぐ橋渡し役として輝きます',
  3: '創造性と表現力の塊。喜びを周囲に広げる、生まれついての表現者です',
  4: '誠実で勤勉な現実主義者。土台を丁寧に積み上げることで大きな成功を掴みます',
  5: '自由を愛する冒険家。変化と多様性の中で最も生き生きとします',
  6: '愛情深く責任感の強い養育者。家庭や仲間への献身が人生の核心です',
  7: '深い洞察力を持つ求道者。真理と知識を求める旅が魂の目的です',
  8: '強い意志と実行力の持ち主。物質的成功と権力の世界で力を発揮します',
  9: '博愛と奉仕の精神を持つ理想主義者。人類全体のために生きる使命があります',
  11: '直感と霊性に優れたマスターナンバー。スピリチュアルな使命を持って生まれてきました',
  22: '夢を現実にする力を持つマスタービルダー。大きなビジョンを形にする能力があります',
  33: '無条件の愛を体現するマスターティーチャー。深い慈悲心で世界を癒します',
};

export function buildNumerologyData(birthDate) {
  const lifePath = calcLifePath(birthDate);
  return {
    lifePath,
    ismaster: MASTER_NUMBERS.includes(lifePath),
    personality: NUMEROLOGY_PERSONALITY[lifePath] ?? '',
  };
}

// ─── 西洋占星術（太陽星座・月星座のみ。アセンダントは出生時刻が必要なため非対応） ──
const ZODIACS = [
  { name: '牡羊座', en: 'aries', symbol: '♈', element: '火', quality: '活動', startMonth: 3, startDay: 21,
    personality: '情熱的で行動力があり、新しいことへの挑戦を愛するパイオニアです' },
  { name: '牡牛座', en: 'taurus', symbol: '♉', element: '土', quality: '不動', startMonth: 4, startDay: 20,
    personality: '安定と美を愛する、感覚的で忍耐強い芸術家肌の星座です' },
  { name: '双子座', en: 'gemini', symbol: '♊', element: '風', quality: '柔軟', startMonth: 5, startDay: 21,
    personality: '知的好奇心が旺盛で、軽やかにあらゆることを吸収するコミュニケーターです' },
  { name: '蟹座', en: 'cancer', symbol: '♋', element: '水', quality: '活動', startMonth: 6, startDay: 22,
    personality: '感受性が豊かで、愛する人を守ることに献身的な情深い星座です' },
  { name: '獅子座', en: 'leo', symbol: '♌', element: '火', quality: '不動', startMonth: 7, startDay: 23,
    personality: '輝くような存在感とリーダーシップを持つ、生まれながらの主役です' },
  { name: '乙女座', en: 'virgo', symbol: '♍', element: '土', quality: '柔軟', startMonth: 8, startDay: 23,
    personality: '緻密な観察力と奉仕の精神を持つ、完璧主義の分析家です' },
  { name: '天秤座', en: 'libra', symbol: '♎', element: '風', quality: '活動', startMonth: 9, startDay: 23,
    personality: 'バランスと美を追い求める、洗練されたハーモナイザーです' },
  { name: '蠍座', en: 'scorpio', symbol: '♏', element: '水', quality: '不動', startMonth: 10, startDay: 23,
    personality: '深い洞察力と情熱を持ち、物事の本質に迫る変容の星座です' },
  { name: '射手座', en: 'sagittarius', symbol: '♐', element: '火', quality: '柔軟', startMonth: 11, startDay: 22,
    personality: '自由と真理を求める、哲学的で楽観的な冒険家です' },
  { name: '山羊座', en: 'capricorn', symbol: '♑', element: '土', quality: '活動', startMonth: 12, startDay: 22,
    personality: '高い目標に向かって着実に登り続ける、粘り強い野心家です' },
  { name: '水瓶座', en: 'aquarius', symbol: '♒', element: '風', quality: '不動', startMonth: 1, startDay: 20,
    personality: '独自の視点と人道主義精神を持つ、時代を先取りする革新者です' },
  { name: '魚座', en: 'pisces', symbol: '♓', element: '水', quality: '柔軟', startMonth: 2, startDay: 19,
    personality: '深い共感力と豊かな想像力を持つ、神秘的な夢想家です' },
];

export function getSunSign(birthDate) {
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  for (const z of ZODIACS) {
    const { startMonth: sm, startDay: sd } = z;
    const nextIdx = (ZODIACS.indexOf(z) + 1) % 12;
    const next = ZODIACS[nextIdx];
    const after = m > sm || (m === sm && d >= sd);
    const before = m < next.startMonth || (m === next.startMonth && d < next.startDay);
    if (z.en === 'capricorn') {
      if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return z;
      continue;
    }
    if (after && before) return z;
  }
  return ZODIACS[11];
}

function calcMoonSign(birthDate) {
  const J2000 = new Date(Date.UTC(2000, 0, 1, 12, 0, 0));
  const msPerDay = 86400000;
  const days = (birthDate.getTime() - J2000.getTime()) / msPerDay;
  const M = (134.963 + 13.064993 * days) * (Math.PI / 180);
  const L = 218.316 + 13.176396 * days + 6.289 * Math.sin(M);
  const longitude = ((L % 360) + 360) % 360;
  const signIndex = Math.floor(longitude / 30) % 12;
  return ZODIACS[signIndex];
}

export function calcAstrology(birthDate) {
  const sun = getSunSign(birthDate);
  const moon = calcMoonSign(birthDate);
  return {
    sunSign: sun.name,
    sunSignEn: sun.en,
    moonSign: moon.name,
    moonSignEn: moon.en,
    symbol: sun.symbol,
    element: sun.element,
    quality: sun.quality,
    personality: sun.personality,
  };
}

// ─── 四柱推命（年柱・月柱・日柱のみ。時柱は出生時刻が必要なため非対応） ──
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function toJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day
    + Math.floor((153 * m + 2) / 5)
    + 365 * y
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    - 32045;
}

function makePillar(stemIdx, branchIdx) {
  const stem = STEMS[((stemIdx % 10) + 10) % 10];
  const branch = BRANCHES[((branchIdx % 12) + 12) % 12];
  return { stem, branch, combined: stem + branch };
}

function calcYearPillar(birthDate) {
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  let year = birthDate.getFullYear();
  if (m === 1 || (m === 2 && d < 4)) year -= 1;
  return makePillar((year - 4) % 10, (year - 4) % 12);
}

function calcMonthPillar(birthDate, yearStemIdx) {
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  const SETSU_DAYS = { 1: 6, 2: 4, 3: 6, 4: 5, 5: 6, 6: 6, 7: 7, 8: 8, 9: 8, 10: 8, 11: 7, 12: 7 };
  let setsuMonth = m;
  if (d < (SETSU_DAYS[m] ?? 6)) setsuMonth = m - 1;
  const monthNum = ((setsuMonth - 2 + 12) % 12) + 1;
  const branchIdx = (monthNum + 1) % 12;
  const BASE_STEMS = { 0: 2, 5: 2, 1: 4, 6: 4, 2: 6, 7: 6, 3: 8, 8: 8, 4: 0, 9: 0 };
  const baseStemIdx = BASE_STEMS[yearStemIdx % 10] ?? 0;
  const stemIdx = (baseStemIdx + monthNum - 1) % 10;
  return makePillar(stemIdx, branchIdx);
}

function calcDayPillar(birthDate) {
  const REF_JDN = toJDN(2000, 1, 1);
  const jdn = toJDN(birthDate.getFullYear(), birthDate.getMonth() + 1, birthDate.getDate());
  const cycleIndex = ((30 + (jdn - REF_JDN)) % 60 + 60) % 60;
  return makePillar(cycleIndex % 10, cycleIndex % 12);
}

export function calcFourPillars(birthDate) {
  const yearPillar = calcYearPillar(birthDate);
  const yearStemIdx = STEMS.indexOf(yearPillar.stem);
  const monthPillar = calcMonthPillar(birthDate, yearStemIdx);
  const dayPillar = calcDayPillar(birthDate);
  return { year: yearPillar, month: monthPillar, day: dayPillar, hour: null };
}

// ─── 統合プロフィール ────────────────────────────────────────
export function buildFortuneProfile(birthDate) {
  return {
    nineStar: calcNineStar(birthDate),
    numerology: buildNumerologyData(birthDate),
    astrology: calcAstrology(birthDate),
    fourPillars: calcFourPillars(birthDate),
  };
}

// ─── 強み・相性・五行バランス（アプリ lib/fortune/index.ts の buildFortuneExtras と同一ロジック） ──
const NINE_STAR_KEYWORDS = {
  '一白水星': ['洞察力', '適応力', '神秘的', '感受性', '粘り強さ'],
  '二黒土星': ['包容力', '勤勉', '縁の下', '几帳面', '忍耐力'],
  '三碧木星': ['行動力', '好奇心', '明るさ', '直感力', '積極性'],
  '四緑木星': ['社交性', 'コミュ力', '信頼感', '誠実さ', '縁結び'],
  '五黄土星': ['カリスマ', '強烈な個性', 'リーダー', '執念', '影響力'],
  '六白金星': ['リーダーシップ', '論理性', '正義感', '完璧主義', '高潔'],
  '七赤金星': ['社交術', '愛嬌', '直感', '楽しむ才能', '表現力'],
  '八白土星': ['継続力', '誠実さ', '努力家', '変化への強さ', '実直'],
  '九紫火星': ['情熱', '直感力', '美的センス', 'カリスマ', '輝き'],
};
const NINE_STAR_COMPAT = {
  '一白水星': { good: ['六白金星', '七赤金星', '二黒土星'], challenge: ['九紫火星'] },
  '二黒土星': { good: ['七赤金星', '六白金星', '一白水星'], challenge: ['三碧木星'] },
  '三碧木星': { good: ['四緑木星', '九紫火星', '八白土星'], challenge: ['二黒土星'] },
  '四緑木星': { good: ['三碧木星', '九紫火星', '六白金星'], challenge: ['七赤金星'] },
  '五黄土星': { good: ['六白金星', '七赤金星', '二黒土星'], challenge: ['一白水星'] },
  '六白金星': { good: ['一白水星', '二黒土星', '四緑木星'], challenge: ['三碧木星'] },
  '七赤金星': { good: ['一白水星', '二黒土星', '五黄土星'], challenge: ['四緑木星'] },
  '八白土星': { good: ['一白水星', '六白金星', '九紫火星'], challenge: ['四緑木星'] },
  '九紫火星': { good: ['三碧木星', '四緑木星', '八白土星'], challenge: ['一白水星'] },
};

const NUMEROLOGY_KEYWORDS = {
  1: ['独立心', '先駆者', 'リーダー', '創造力', '意志の強さ'],
  2: ['協調性', '共感力', '繊細さ', '忍耐', '調和'],
  3: ['表現力', '明るさ', '創造性', '楽天的', '社交的'],
  4: ['誠実さ', '責任感', '継続力', '几帳面', '基盤作り'],
  5: ['自由奔放', '冒険心', '適応力', '直感', '変化への強さ'],
  6: ['愛情深さ', '責任感', '調和', '奉仕', '美的センス'],
  7: ['探求心', '直感力', '神秘性', '深い思慮', '独自の視点'],
  8: ['実行力', '決断力', 'ビジネス感覚', '野心', '財運'],
  9: ['博愛精神', '完成', '智慧', '奉仕', '大局観'],
  11: ['直感の天才', '感受性', '霊感', '使命感', 'インスピレーション'],
  22: ['夢の実現', '大きな構想', '建設力', '信念', 'マスタービルダー'],
  33: ['奉仕の精神', '包容力', '愛', '教師', 'ヒーリング'],
};
const NUMEROLOGY_COMPAT = {
  1: { good: [3, 5, 9], challenge: [4, 8] },
  2: { good: [4, 6, 8], challenge: [1, 5] },
  3: { good: [1, 5, 9], challenge: [4, 8] },
  4: { good: [2, 6, 8], challenge: [3, 5] },
  5: { good: [1, 3, 7], challenge: [2, 4] },
  6: { good: [2, 4, 9], challenge: [1, 5] },
  7: { good: [5, 9, 11], challenge: [1, 2] },
  8: { good: [2, 4, 6], challenge: [3, 5] },
  9: { good: [3, 6, 7], challenge: [4, 8] },
  11: { good: [2, 7, 22], challenge: [1, 8] },
  22: { good: [4, 8, 11], challenge: [3, 5] },
  33: { good: [6, 11, 22], challenge: [1, 8] },
};

const ASTROLOGY_KEYWORDS_MAP = {
  '牡羊座': ['行動力', '情熱', 'パイオニア', '直感的', '正直さ'],
  '牡牛座': ['安定志向', '美的センス', '粘り強さ', '忠実さ', '現実的'],
  '双子座': ['知的好奇心', '多才', 'コミュ力', '柔軟性', '機知'],
  '蟹座': ['感受性', '母性', '直感力', '愛情深さ', '守護本能'],
  '獅子座': ['リーダーシップ', '自己表現', '寛大さ', '情熱', '創造力'],
  '乙女座': ['分析力', '几帳面', '奉仕精神', '実用性', '完璧主義'],
  '天秤座': ['調和', '美的センス', '公正さ', '社交性', 'バランス感覚'],
  '蠍座': ['洞察力', '情熱', '変容力', '神秘性', '粘り強さ'],
  '射手座': ['楽観性', '探求心', '自由奔放', '哲学的', '冒険心'],
  '山羊座': ['忍耐力', '現実主義', '野心', '責任感', '着実さ'],
  '水瓶座': ['独自性', '革新性', '博愛', '知性', '未来志向'],
  '魚座': ['共感力', '創造性', '直感力', '神秘性', '献身的'],
};
const ASTROLOGY_COMPAT_MAP = {
  '牡羊座': { element: '火', good: ['獅子座', '射手座', '双子座', '水瓶座'], challenge: ['蟹座', '山羊座'] },
  '牡牛座': { element: '土', good: ['乙女座', '山羊座', '蟹座', '魚座'], challenge: ['獅子座', '水瓶座'] },
  '双子座': { element: '風', good: ['天秤座', '水瓶座', '牡羊座', '獅子座'], challenge: ['乙女座', '魚座'] },
  '蟹座': { element: '水', good: ['蠍座', '魚座', '牡牛座', '乙女座'], challenge: ['牡羊座', '天秤座'] },
  '獅子座': { element: '火', good: ['牡羊座', '射手座', '双子座', '天秤座'], challenge: ['牡牛座', '蠍座'] },
  '乙女座': { element: '土', good: ['牡牛座', '山羊座', '蟹座', '蠍座'], challenge: ['双子座', '射手座'] },
  '天秤座': { element: '風', good: ['双子座', '水瓶座', '獅子座', '射手座'], challenge: ['蟹座', '山羊座'] },
  '蠍座': { element: '水', good: ['蟹座', '魚座', '乙女座', '山羊座'], challenge: ['牡羊座', '獅子座'] },
  '射手座': { element: '火', good: ['牡羊座', '獅子座', '天秤座', '水瓶座'], challenge: ['乙女座', '魚座'] },
  '山羊座': { element: '土', good: ['牡牛座', '乙女座', '蠍座', '魚座'], challenge: ['牡羊座', '天秤座'] },
  '水瓶座': { element: '風', good: ['双子座', '天秤座', '牡羊座', '射手座'], challenge: ['牡牛座', '蠍座'] },
  '魚座': { element: '水', good: ['蟹座', '蠍座', '牡牛座', '山羊座'], challenge: ['双子座', '射手座'] },
};

const DAY_STEM_KEYWORDS_MAP = {
  '甲': ['先駆者', '正直', '上昇志向', 'リーダー', '一直線'],
  '乙': ['柔軟性', '縁の力', '美的センス', '適応力', '協調性'],
  '丙': ['情熱', '明るさ', '社交性', '輝き', 'オープン'],
  '丁': ['繊細さ', '芸術性', '深い愛情', '内向の強さ', '灯台'],
  '戊': ['安定感', '包容力', '大地の力', '頼もしさ', '忍耐'],
  '己': ['丁寧さ', '育む力', '実用性', '縁の下', '着実'],
  '庚': ['決断力', '鋭さ', '正義感', '改革力', '金属の強さ'],
  '辛': ['美的センス', '繊細', '磨かれる才能', '鑑識眼', '上品'],
  '壬': ['スケールの大きさ', '流動性', '知性', '寛容', '大河'],
  '癸': ['感受性', '養いの力', 'ケア上手', '神秘性', '恵みの雨'],
};
const STEM_ELEMENT_MAP = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
  '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
};
const BRANCH_ELEMENT_MAP = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土', '巳': '火',
  '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水',
};
const ELEMENT_CYCLE = {
  '木': { generates: '火', generatedBy: '水' },
  '火': { generates: '土', generatedBy: '木' },
  '土': { generates: '金', generatedBy: '火' },
  '金': { generates: '水', generatedBy: '土' },
  '水': { generates: '木', generatedBy: '金' },
};
const ELEMENT_COLORS_MAP = {
  '木': '#7ec88a', '火': '#e87c60', '土': '#d4a800', '金': '#a8c8e0', '水': '#6ab0d8',
};

export function buildFortuneExtras(profile, fortuneId) {
  const { nineStar, numerology, astrology, fourPillars } = profile;

  if (fortuneId === 'nine_star') {
    const name = nineStar.honmeiStarName;
    const c = NINE_STAR_COMPAT[name] ?? { good: [], challenge: [] };
    return {
      keywords: NINE_STAR_KEYWORDS[name] ?? [],
      compat: { label: '相性のいい本命星', good: c.good, challenge: c.challenge },
    };
  }

  if (fortuneId === 'numerology') {
    const lp = numerology.lifePath;
    const c = NUMEROLOGY_COMPAT[lp] ?? { good: [], challenge: [] };
    return {
      keywords: NUMEROLOGY_KEYWORDS[lp] ?? [],
      compat: {
        label: '相性のいい数秘術の数',
        good: c.good.map((n) => String(n)),
        challenge: c.challenge.map((n) => String(n)),
      },
    };
  }

  if (fortuneId === 'astrology') {
    const sign = astrology.sunSign;
    const c = ASTROLOGY_COMPAT_MAP[sign] ?? { good: [], challenge: [], element: '' };
    return {
      keywords: ASTROLOGY_KEYWORDS_MAP[sign] ?? [],
      compat: {
        label: `相性のいいサイン（${c.element}グループ）`,
        good: c.good.slice(0, 3),
        challenge: c.challenge,
      },
    };
  }

  if (fortuneId === 'four_pillars') {
    const dayStem = fourPillars.day.stem;
    const myEl = STEM_ELEMENT_MAP[dayStem] ?? '木';
    const cycle = ELEMENT_CYCLE[myEl];
    const goodTags = [`${cycle.generatedBy}の気が強い人`, `${cycle.generates}の気が強い人`];

    const pillars = [fourPillars.year, fourPillars.month, fourPillars.day];
    const cnt = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
    for (const p of pillars) {
      const se = STEM_ELEMENT_MAP[p.stem]; if (se) cnt[se]++;
      const be = BRANCH_ELEMENT_MAP[p.branch]; if (be) cnt[be]++;
    }
    const elementBalance = ['木', '火', '土', '金', '水'].map((el) => ({
      element: el, color: ELEMENT_COLORS_MAP[el], count: cnt[el],
    }));

    return {
      keywords: DAY_STEM_KEYWORDS_MAP[dayStem] ?? [],
      compat: { label: `相性のいい五行タイプ（${myEl}の相生）`, good: goodTags },
      elementBalance,
    };
  }

  return { keywords: [], compat: { label: '相性', good: [] } };
}

// ─── 今年の吉方位（九星気学・年盤） ─────────────────────────────
// 元ロジック: lib/powerspot/fortune/direction.ts の calcBoard(scope='year') を移植。
// 年盤・本命星のみで完結する決定論的な計算（月盤・日盤はアプリ側のみ＝プレミアム機能のため非対応）。

export const DIR_META = {
  N:  { jp: '北',   angle: 0 },
  NE: { jp: '北東', angle: 45 },
  E:  { jp: '東',   angle: 90 },
  SE: { jp: '南東', angle: 135 },
  S:  { jp: '南',   angle: 180 },
  SW: { jp: '南西', angle: 225 },
  W:  { jp: '西',   angle: 270 },
  NW: { jp: '北西', angle: 315 },
};
export const DIR_ORDER = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// 後天定位盤（中宮=5 のときの各宮の九星）＝洛書の並び
const BASE_STAR = { SE: 4, S: 9, SW: 2, E: 3, C: 5, W: 7, NE: 8, N: 1, NW: 6 };
const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E', NE: 'SW', SW: 'NE', SE: 'NW', NW: 'SE' };
const DIR_GOGYO = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
const SOUJOU = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };

function wrap9(n) { return ((((n - 1) % 9) + 9) % 9) + 1; }
function starAt(dir, center) { return wrap9(BASE_STAR[dir] + (center - 5)); }
function dirOfStar(star, center) {
  for (const d of DIR_ORDER) if (starAt(d, center) === star) return d;
  return null;
}

// 気学の年（立春=2/4で年替わり）
function kigakuYear(d) {
  const m = d.getMonth() + 1, day = d.getDate();
  let y = d.getFullYear();
  if (m === 1 || (m === 2 && day < 4)) y -= 1;
  return y;
}
function yearBranch(y) { return (((y - 4) % 12) + 12) % 12; }

// 十二支インデックス → 八方位
const BRANCH_DIR = ['N', 'NE', 'NE', 'E', 'SE', 'SE', 'S', 'SW', 'SW', 'W', 'NW', 'NW'];

// 年盤中宮 = その年の九星（本命星と同じ算出）
function yearCenter(y) {
  let sum = y;
  while (sum >= 10) sum = String(sum).split('').reduce((a, c) => a + Number(c), 0);
  const s = 11 - sum;
  return s === 10 ? 1 : s;
}

function relation(honmei, star) {
  const me = DIR_GOGYO[honmei];
  const s = DIR_GOGYO[star];
  if (SOUJOU[s] === me) return { kind: 'kichi', reason: `${STAR_NAMES[star]}があなたを生じる方位（生気）` };
  if (s === me) return { kind: 'kichi', reason: 'あなたと同じ気が満ちる方位（比和）' };
  if (SOUJOU[me] === s) return { kind: 'shokichi', reason: `あなたが${STAR_NAMES[star]}を育てる方位（退気・小吉）` };
  return { kind: 'neutral', reason: '気が相剋する方位（大きな後押しは弱い）' };
}

// 指定年の年盤を算出（scope='year' 固定）
function buildYearBoard(ky, honmei) {
  const center = yearCenter(ky);
  const breakDir = OPPOSITE[BRANCH_DIR[yearBranch(ky)]];
  const goouDir = dirOfStar(5, center);
  const ankenDir = goouDir ? OPPOSITE[goouDir] : null;
  const honmeiDir = dirOfStar(honmei, center);
  const tekiDir = honmeiDir ? OPPOSITE[honmeiDir] : null;

  const dirs = {};
  const kichiDirs = [];
  const kyouDirs = [];

  for (const d of DIR_ORDER) {
    const star = starAt(d, center);
    const kyouNames = [];
    if (d === goouDir) kyouNames.push('五黄殺');
    if (d === ankenDir) kyouNames.push('暗剣殺');
    if (d === honmeiDir) kyouNames.push('本命殺');
    if (d === tekiDir) kyouNames.push('本命的殺');
    if (d === breakDir) kyouNames.push('歳破');

    let kind, reason;
    if (kyouNames.length > 0) {
      kind = 'kyou';
      reason = `${kyouNames.join('・')}。この方角へ動くのは避ける`;
      kyouDirs.push(d);
    } else {
      const r = relation(honmei, star);
      kind = r.kind;
      reason = r.reason;
      if (kind === 'kichi' || kind === 'shokichi') kichiDirs.push(d);
    }
    dirs[d] = { dir: d, jp: DIR_META[d].jp, angle: DIR_META[d].angle, star, kind, reason, kyouNames };
  }

  return { center, centerName: STAR_NAMES[center], honmeiStar: honmei, honmeiName: STAR_NAMES[honmei], dirs, kichiDirs, kyouDirs };
}

// 今年の吉方位・凶方位（年盤）を算出。target省略時は現在日時。
export function calcYearDirections(birthDate, target = new Date()) {
  const honmei = calcHonmeiStar(birthDate);
  const ky = kigakuYear(target);
  const board = buildYearBoard(ky, honmei);
  return { kigakuYear: ky, ...board };
}

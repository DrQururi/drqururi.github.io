// ②今後の運勢の「無料で読める範囲」の計算と事前に書かれた文章。
// アプリ（lib/powerspot/fortune/monthly.ts / daiun.ts / jushin.ts）の無料部分を端末内計算のまま移植したもの。
// 計算は決定論的（乱数・AI・サーバー呼び出しなし）。文章はアプリに入っている固定文をそのまま使う。
// アプリ本体の出力との一致は test/verify.mjs（future_fixtures.json）で確認する。
// 12か月分の詳しい文章・8期分の大運の文章・神獣の有料4項目の文章は、有料のためここには持たない。
import { dayPillarIndex, calcFourPillars } from './fortune-core.mjs';

// ─── 共通 ────────────────────────────────────────────────
function digitSum(n) {
  return String(Math.abs(n)).split('').reduce((a, c) => a + Number(c), 0);
}
function reduceFull(n) {
  let x = n;
  while (x > 9) x = digitSum(x);
  return x;
}

// ─── 月ごとの運勢（無料は今月＋来月の見出しだけ） ────────────────
const STAR_ELEMENT = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
const PALACE_NAME = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兌', 8: '艮', 9: '離' };
const PALACE_DIRECTION = { 1: '北', 2: '南西', 3: '東', 4: '南東', 5: '中央', 6: '北西', 7: '西', 8: '北東', 9: '南' };
const FLY_SEQUENCE = [5, 6, 7, 8, 9, 1, 2, 3, 4];

function yearStarNumber(year) {
  let sum = year;
  while (sum >= 10) sum = digitSum(sum);
  const star = 11 - sum;
  return star === 10 ? 1 : star;
}
function dominantSetsuMonth(month) {
  return ((month - 2 + 12) % 12) + 1;
}

export function calcMonthCenterStar(year, month) {
  const effYear = month === 1 ? year - 1 : year;
  const yStar = yearStarNumber(effYear);
  let base;
  if ([1, 4, 7].includes(yStar)) base = 8;
  else if ([2, 5, 8].includes(yStar)) base = 2;
  else base = 5;
  const offset = dominantSetsuMonth(month) - 1;
  let star = base - offset;
  while (star <= 0) star += 9;
  while (star > 9) star -= 9;
  return star;
}

export function calcMonthlyNineStarPalace(honmeiStar, year, month) {
  const centerStar = calcMonthCenterStar(year, month);
  const stepIndex = (((honmeiStar - centerStar) % 9) + 9) % 9;
  const palaceNumber = FLY_SEQUENCE[stepIndex];
  return {
    starNumber: honmeiStar,
    palaceName: PALACE_NAME[palaceNumber],
    direction: PALACE_DIRECTION[palaceNumber],
    monthCenterStar: centerStar,
  };
}

export function calcPersonalYear(birthDate, year) {
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  return reduceFull(reduceFull(m) + reduceFull(d) + reduceFull(digitSum(year)));
}
export function calcPersonalMonth(personalYear, month) {
  return reduceFull(personalYear + month);
}

const SOUJOU = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
function judgeStrength(honmeiStar, palaceName) {
  const personElem = STAR_ELEMENT[honmeiStar];
  const palaceNumber = Object.entries(PALACE_NAME).find(([, n]) => n === palaceName)?.[0] ?? '5';
  const pElem = STAR_ELEMENT[Number(palaceNumber)];
  if (SOUJOU[pElem] === personElem) return { strength: 'strong', mark: '◎' };
  if (pElem === personElem) return { strength: 'normal', mark: '○' };
  return { strength: 'caution', mark: '△' };
}

export const STRENGTH_LABEL = { strong: '好調', normal: '普通', caution: '要注意' };

const PALACE_FREE_TEXT = {
  坎: '今月は物事が水面下でゆっくり動く月です\n焦って結果を急がず情報収集や準備に時間を使うと後から実を結びます\n一人の時間を増やし心を落ち着けて過ごすと運気が整います\n無理な予定は入れず静かに力を蓄えましょう',
  坤: '今月はこつこつ積み重ねる地道な努力が実を結ぶ月です\n人との信頼関係を大切にし手伝いや気配りを惜しまないと評価が高まります\n焦らず着実に進めることが何よりの近道です\n小さな約束を守る積み重ねが後の大きな信頼につながります',
  震: '今月は新しいことを始めるのにぴったりの勢いがある月です\n気になっていた計画や挑戦を思い切って動かすと良い反応が返ってきます\n勢い任せにせず周りへの確認を忘れないようにしましょう\n最初の一歩を踏み出す勇気が運気を大きく動かします',
  巽: '今月は人とのご縁やつながりが広がりやすい月です\n連絡を取る 挨拶をする 紹介を受けるなど交流を増やすと良い話が舞い込みます\n約束や返事をこまめに丁寧に行うと信頼がさらに深まります\n自分から動くことで良い縁が次々とつながります',
  中: '今月は物事の節目や切り替わりを感じやすい月です\n無理に新しく動くよりも今の状況を整理し次に備える時間に充てると安定します\n体調や予定に余白を持たせて過ごしましょう\n立ち止まることも前に進むための大切な準備です',
  乾: '今月は責任ある立場や大きな決断が巡ってくる月です\n周囲からの信頼も厚くなるのでリーダーシップを発揮すると良い結果につながります\n独断に偏らず周りの意見にも耳を傾けると安心です\n大きな決断ほど一呼吸置いてから動くと良いでしょう',
  兌: '今月は人付き合いや楽しみごとの運気が上がる月です\n食事会や趣味の集まりに顔を出すと良い出会いや情報が得られます\n金銭面は気が緩みやすいので出費の管理だけ意識しましょう\n楽しむ気持ちが新しいチャンスを連れてきます',
  艮: '今月は変化や方向転換のきっかけが生まれやすい月です\n環境や習慣を見直すと新しい流れがひらけます\n急な変更も多いので予定には余裕を持たせておくと安心です\n変化を恐れず一歩踏み出すと道がひらけます',
  離: '今月は注目を浴びたり物事がはっきり見えてくる月です\n人前に出る機会や評価される場面では積極的に動くと運気が味方します\n感情が高ぶりやすいので冷静さも忘れないようにしましょう\n誠実な姿勢が周囲からの評価をさらに高めます',
};
const PERSONAL_MONTH_FREE_TEXT = {
  1: '数字の面でも新しい一歩を踏み出すのに向いている時期です\n小さなことでもまず動き出してみましょう\n迷ったときは直感を信じて進むと良い流れに乗れます',
  2: '数字の面では協力や調整が鍵になる時期です\n一人で抱え込まず周りと歩調を合わせると物事がスムーズに進みます\n相手の話をよく聞く姿勢が良い結果を呼びます',
  3: '数字の面では表現や楽しみが運気を後押しする時期です\n気持ちを素直に発信すると良い反応が返ってきます\n明るい話題や笑顔が運気をさらに引き寄せます',
  4: '数字の面では基礎固めや地道な作業が実を結ぶ時期です\n目の前のことをコツコツ積み上げましょう\n地味に見える作業ほど後で大きな支えになります',
  5: '数字の面では変化や身軽さが運気を動かす時期です\n予定にとらわれすぎず柔軟に動くと良い流れが生まれます\n新しい場所や人との出会いが刺激になります',
  6: '数字の面では身近な人への気配りが運気を支える時期です\n家族や大切な人との時間を優先しましょう\n小さな思いやりが信頼として返ってきます',
  7: '数字の面では振り返りや学びが力になる時期です\n静かに考える時間を持つと答えが見えてきます\n一人で過ごす時間が力を蓄える助けになります',
  8: '数字の面では成果や収穫を受け取りやすい時期です\nこれまでの頑張りが評価や実りにつながります\n受け取った成果を次の行動にも活かしましょう',
  9: '数字の面では区切りや手放しが運気を整える時期です\n不要なものを片付けると次の流れが良くなります\n感謝の気持ちで一区切りつけると心が軽くなります',
};

export function buildFreeMonthlyReading(c) {
  return `${PALACE_FREE_TEXT[c.nineStar.palaceName] ?? ''}\n${PERSONAL_MONTH_FREE_TEXT[c.numerology.personalMonth] ?? ''}`;
}
export function buildFreeMonthlyFootnote(c) {
  return `本命星は${c.nineStar.palaceName}宮（${c.nineStar.direction}）に回座 パーソナルマンス${c.numerology.personalMonth}`;
}

export function buildMonthlyFortuneCalc(birthDate, honmeiStar, year) {
  const result = [];
  for (let month = 1; month <= 12; month++) {
    const nineStar = calcMonthlyNineStarPalace(honmeiStar, year, month);
    const personalYear = calcPersonalYear(birthDate, year);
    const personalMonth = calcPersonalMonth(personalYear, month);
    const { strength, mark } = judgeStrength(honmeiStar, nineStar.palaceName);
    result.push({ year, month, nineStar, numerology: { personalYear, personalMonth }, strength, strengthMark: mark });
  }
  return result;
}

// ─── 10年ごとの運勢（無料は今の期だけ） ──────────────────────────
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const YANG_STEMS = ['甲', '丙', '戊', '庚', '壬'];
const SETSUBUN_DAY = { 1: 6, 2: 4, 3: 6, 4: 5, 5: 6, 6: 6, 7: 7, 8: 8, 9: 8, 10: 8, 11: 7, 12: 7 };
const DAY_MS = 24 * 60 * 60 * 1000;

function yearPillarStemIndex(birthDate) {
  const m = birthDate.getMonth() + 1;
  const d = birthDate.getDate();
  let year = birthDate.getFullYear();
  if (m === 1 || (m === 2 && d < 4)) year -= 1;
  return (((year - 4) % 10) + 10) % 10;
}
const setsuDate = (year, month) => new Date(year, month - 1, SETSUBUN_DAY[month]);
function nextSetsuDate(birth) {
  const y = birth.getFullYear();
  const m = birth.getMonth() + 1;
  const thisMonth = setsuDate(y, m);
  if (birth.getTime() < thisMonth.getTime()) return thisMonth;
  return setsuDate(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1);
}
function prevSetsuDate(birth) {
  const y = birth.getFullYear();
  const m = birth.getMonth() + 1;
  const thisMonth = setsuDate(y, m);
  if (birth.getTime() >= thisMonth.getTime()) return thisMonth;
  return setsuDate(m === 1 ? y - 1 : y, m === 1 ? 12 : m - 1);
}

export const STEM_FREE_THEME_TEXT = {
  甲: 'この10年は大きく枝を伸ばす成長の10年です\n新しい分野への挑戦や人脈を広げる行動が追い風になります\n広げすぎて手が回らなくなりやすいので優先順位をはっきりさせることが大切です\n一つずつ根を張りながら伸びていくと長く続く成果につながります\n大樹が年輪を重ねるように焦らず育てていく意識を持ちましょう\nこの時期の心がけ次第で実りの大きさが変わります',
  乙: 'この10年はしなやかに適応しながら育つ10年です\n周囲との協調や柔軟な方向転換が追い風になります\n自分の芯を見失わないよう大切にしたいものを定期的に確認しましょう\n無理に逆らわず流れに乗ることで着実に力をつけられます\n草花がしなるように柔らかく粘り強く進むと長く咲き続けます\nこの時期の心がけ次第で実りの大きさが変わります',
  丙: 'この10年は存在感が増し注目を集めやすい10年です\n人前に出る挑戦やリーダー的な役割が追い風になります\n勢いが強すぎて周りを置き去りにしないよう気配りを忘れないことが大切です\n明るさを周囲に分け与える意識を持つとさらに運気が伸びます\n太陽のように周りを照らす存在になれる10年です\nこの時期の心がけ次第で実りの大きさが変わります',
  丁: 'この10年はじっくりと専門性や内面を磨く10年です\n一つのことを深める努力や信頼できる人との関係が追い風になります\nエネルギーを使いすぎて消耗しないよう休む時間も確保しましょう\n静かな積み重ねが後に大きな実力として花開きます\n灯火を絶やさず燃やし続けるように地道な努力を重ねましょう\nこの時期の心がけ次第で実りの大きさが変わります',
  戊: 'この10年は土台を固め信頼を積み上げる10年です\nコツコツとした継続や責任ある立場が追い風になります\n頑固になりすぎず新しい意見も受け入れる柔らかさを持つと安心です\n揺るがない基盤づくりがこの先の人生を支える力になります\n山のようにどっしり構える姿勢が周囲の信頼を集めます\nこの時期の心がけ次第で実りの大きさが変わります',
  己: 'この10年は人を育て支える役割が運気を伸ばす10年です\n周囲のサポートや縁の下の力持ち的な働きが追い風になります\n自分のことを後回しにしすぎないよう気をつけましょう\n支えた分だけ後で大きな信頼として返ってきます\n田畑が作物を育てるように周りを豊かにする働きが実を結びます\nこの時期の心がけ次第で実りの大きさが変わります',
  庚: 'この10年は決断力と行動力で道を切り開く10年です\n思い切った選択や改革への挑戦が追い風になります\n強引になりすぎないよう周囲との対話を大切にすると良い結果につながります\n決めたことをやり抜く力がこの10年の大きな武器になります\n鉄が鍛えられて強くなるように試練が力に変わっていきます\nこの時期の心がけ次第で実りの大きさが変わります',
  辛: 'この10年は感性や専門性を磨き価値を高める10年です\n丁寧な仕事や美意識を活かす機会が追い風になります\n完璧を求めすぎて自分を追い込まないよう気をつけましょう\n磨き上げた力は後に確かな評価として形になります\n宝石が磨かれて輝くように経験を重ねるほど価値が増していきます\nこの時期の心がけ次第で実りの大きさが変わります',
  壬: 'この10年は視野を広げ新しい可能性に乗り出す10年です\n旅や学び遠方との縁が追い風になります\n広がりすぎて足元がおろそかにならないよう計画性を持つと安心です\n大きく動いた経験がこの先の自信につながります\n大海のように広い世界へ漕ぎ出していく10年です\nこの時期の心がけ次第で実りの大きさが変わります',
  癸: 'この10年は感受性を活かし静かに力を蓄える10年です\n直感を信じることや内面を見つめる時間が追い風になります\n一人で抱え込みすぎず信頼できる人に相談することも大切です\n静かに蓄えた力は次の節目で大きく花開きます\n雨露が大地を潤すようにゆっくりと周りを満たしていきます\nこの時期の心がけ次第で実りの大きさが変わります',
};
export const buildFreeDaiunReading = (stem) => STEM_FREE_THEME_TEXT[stem] ?? '';

// gender: 'male' | 'female'
export function calcDaiun(birthDate, gender, asOfDate = new Date()) {
  const yearIsYang = YANG_STEMS.includes(STEMS[yearPillarStemIndex(birthDate)]);
  const forward = (yearIsYang && gender === 'male') || (!yearIsYang && gender === 'female');
  const boundary = forward ? nextSetsuDate(birthDate) : prevSetsuDate(birthDate);
  const risshunDays = Math.abs(boundary.getTime() - birthDate.getTime()) / DAY_MS;
  const risshunAge = risshunDays / 3;
  const risshunAgeRounded = Math.max(0, Math.round(risshunAge));

  const fp = calcFourPillars(birthDate);
  const monthStemIdx = STEMS.indexOf(fp.month.stem);
  const monthBranchIdx = BRANCHES.indexOf(fp.month.branch);
  const dir = forward ? 1 : -1;
  const periods = [];
  for (let i = 0; i < 8; i++) {
    const offset = dir * (i + 1);
    const stemIdx = (((monthStemIdx + offset) % 10) + 10) % 10;
    const branchIdx = (((monthBranchIdx + offset) % 12) + 12) % 12;
    const startAge = risshunAgeRounded + i * 10;
    periods.push({
      index: i, stem: STEMS[stemIdx], branch: BRANCHES[branchIdx],
      ganzhi: STEMS[stemIdx] + BRANCHES[branchIdx], startAge, endAge: startAge + 9,
    });
  }
  let age = asOfDate.getFullYear() - birthDate.getFullYear();
  const notYetBirthday = asOfDate.getMonth() < birthDate.getMonth()
    || (asOfDate.getMonth() === birthDate.getMonth() && asOfDate.getDate() < birthDate.getDate());
  if (notYetBirthday) age -= 1;
  const currentIndex = periods.findIndex((p) => age >= p.startAge && age <= p.endAge);
  return { forward, risshunDays, risshunAge, risshunAgeRounded, periods, currentIndex: currentIndex >= 0 ? currentIndex : null };
}

// ─── 神獣と12年周期（無料は神獣名・今年の季節と何年目・一言） ─────────
export const SEASONS = ['春', '夏', '秋', '冬'];
const BEASTS = [
  [{ name: '黄龍', reading: 'おうりゅう', element: '土', springStart: 2020 }, { name: '応龍', reading: 'おうりゅう', element: '土', springStart: 2021 }],
  [{ name: '白虎', reading: 'びゃっこ', element: '金', springStart: 2018 }, { name: '麒麟', reading: 'きりん', element: '金', springStart: 2019 }],
  [{ name: '朱雀', reading: 'すざく', element: '火', springStart: 2016 }, { name: '鳳凰', reading: 'ほうおう', element: '火', springStart: 2017 }],
  [{ name: '獅子', reading: 'しし', element: '天', springStart: 2014 }, { name: '天馬', reading: 'てんま', element: '天', springStart: 2015 }],
  [{ name: '青龍', reading: 'せいりゅう', element: '木', springStart: 2024 }, { name: '蒼龍', reading: 'そうりゅう', element: '木', springStart: 2025 }],
  [{ name: '玄武', reading: 'げんぶ', element: '水', springStart: 2022 }, { name: '霊亀', reading: 'れいき', element: '水', springStart: 2023 }],
];

export function calcJushin(birthDate) {
  const dayNumber = dayPillarIndex(birthDate) + 1;
  const band = Math.floor((dayNumber - 1) / 10);
  const even = birthDate.getFullYear() % 2 === 0;
  return { beast: BEASTS[band][even ? 0 : 1], dayNumber, band };
}
export function cycleYearOf(date) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const y = date.getFullYear();
  return m === 1 || (m === 2 && d < 4) ? y - 1 : y;
}
export function cyclePositionOfYear(beast, cycleYear) {
  const index = (((cycleYear - beast.springStart) % 12) + 12) % 12;
  return { year: cycleYear, season: SEASONS[Math.floor(index / 3)], yearNo: (index % 3) + 1, index };
}
export const cyclePositionAt = (beast, date) => cyclePositionOfYear(beast, cycleYearOf(date));

export const SEASON_THEME = { 春: '種まき', 夏: '成長', 秋: '収穫', 冬: '休息' };
export const BEAST_ONE_LINER = {
  黄龍: 'どっしり受け止めて、周りを支える力が持ち味のタイプです。',
  応龍: '面倒見がよく、人と人の間をつなぐのが得意なタイプです。',
  白虎: '物事を見極めて、きっぱり決める潔さが持ち味のタイプです。',
  麒麟: '丁寧に、信頼をこつこつ積み上げていくタイプです。',
  朱雀: '明るさと表現力で、周りを引き立てるタイプです。',
  鳳凰: 'ひらめきと情熱で、新しい流れをつくるタイプです。',
  獅子: '堂々と前に立ち、自分の道を切り開くタイプです。',
  天馬: '型にとらわれず、軽やかに動けるタイプです。',
  青龍: '目標に向かって、まっすぐ伸びていくタイプです。',
  蒼龍: 'しなやかに周りと合わせながら、育っていくタイプです。',
  玄武: '慎重に備えて、じっくり力をためるタイプです。',
  霊亀: '穏やかに流れを読み、長く続ける力があるタイプです。',
};
export const SEASON_GIST = {
  春: '新しいことの種をまく時期と言われます。',
  夏: '手応えが薄くても、続けることで育つ時期と言われます。',
  秋: 'これまでの成果を受け取り、縁を広げる時期と言われます。',
  冬: '手放して整え、大きな夢を描く休息の時期と言われます。',
};
export const SEASON_COLOR = { 春: '#a0e8b8', 夏: '#f5d78e', 秋: '#e8a0c0', 冬: '#a0c8f5' };

export function buildCycleMention(pos) {
  return `12年周期では今年は「${pos.season}の${pos.yearNo}年目」（${SEASON_THEME[pos.season]}の時期）にあたります。月ごとの運勢も、この大きな流れの中で読むと、つかみやすいでしょう。`;
}

// 天命診断サイト — 入口〜質問〜計算中〜結果先頭の「アプリと同じオンボーディングの流れ」の純粋関数。
// アプリ lib/onboarding/core.ts（呼び名・いま気になること）の考え方に合わせた移植。DOM には触れない（テスト対象）。
// 呼び名・性別・いま気になることは画面表示にだけ使う。URL・共有テキスト・外部送信には入れない。
import { calcDaiun } from './future-core.mjs';
import { stripCommas, toSentences } from './readable.mjs';

// ─── 呼び名 ──────────────────────────────────────────────────────
export const NICKNAME_MAX = 10;

// 入力値を整える。空・空白だけなら null（＝呼び名なし）。制御文字は除き、前後の空白を落とし、10文字までに切る。
export function normalizeNickname(raw) {
  if (!raw) return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = String(raw).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  const chars = Array.from(cleaned).slice(0, NICKNAME_MAX).join('').trim();
  return chars || null;
}

const HONORIFIC_END = /(さん|ちゃん|くん|君|様|さま|氏)$/;
// 「〇〇さん」。呼び名が無ければ「あなた」。すでに敬称で終わる呼び名には重ねて「さん」を付けない。
export function callName(nickname) {
  const n = normalizeNickname(nickname);
  if (!n) return 'あなた';
  return HONORIFIC_END.test(n) ? n : `${n}さん`;
}

// ─── 質問の文言（「何に使うか」は実際の用途と一致させる） ──────────────────
export const QUESTIONS = [
  { id: 'name', title: '呼び名を教えてください（任意）',
    use: '結果の中で「〇〇さん」とお呼びするために使います。この端末の中だけで使い、送信しません。' },
  { id: 'birth', title: '生年月日を教えてください',
    use: 'あなたがどんな人か、今が運のいい時期かを、生まれた日から計算します。' },
  { id: 'gender', title: '性別を教えてください',
    use: '「10年ごとの運の流れ」は男性と女性で数え方が変わるので、その計算に使います。' },
  { id: 'concern', title: 'いま気になることは何ですか？',
    use: '選んだことの結果を、いちばん上に出すために使います。' },
];

export const GENDER_CHOICES = [
  { id: 'male', label: '男性' },
  { id: 'female', label: '女性' },
  { id: 'none', label: '答えない' },
];

// いま気になること → 結果の先頭に出す無料項目（いずれも無料の総合占い項目）
export const CONCERNS = [
  { id: 'self', label: '自分の性格', short: '性格', title: '総合性格' },
  { id: 'love', label: '恋愛', short: '恋愛', title: '恋愛の癖と傾向' },
  { id: 'work', label: '仕事・天職', short: '仕事・天職', title: '天職' },
  { id: 'timing', label: '人生のタイミング', short: '人生のタイミング', title: '人生の転機' },
];
export const concernById = (id) => CONCERNS.find((c) => c.id === id) ?? null;

// ─── 結果の4タイル（入口の見本と結果で同じ部品を使う） ───────────────────
export function buildTiles(profile) {
  return [
    { label: '本命星', value: profile.nineStar.honmeiStarName },
    { label: '数秘術の数', value: String(profile.numerology.lifePath) },
    { label: '太陽星座', value: profile.astrology.sunSign },
    { label: '命式', value: profile.fourPillars.day.combined },
  ];
}
// ─── Xシェアの文面（本命星だけを入れる。生年月日・呼び名・回答は入れない） ───────────
const SHARE_TEXT_DEFAULT = '天命診断をやってみた';
export function buildShareText(honmeiStarName) {
  if (!honmeiStarName) return SHARE_TEXT_DEFAULT;
  return `天命診断をやってみたら「${honmeiStarName}」タイプでした。生年月日だけで4つの占いをまとめて診断してくれる #天命診断`;
}
export function buildShareIntent(honmeiStarName, url) {
  return `https://x.com/intent/post?text=${encodeURIComponent(buildShareText(honmeiStarName))}&url=${encodeURIComponent(url)}`;
}
// 入口の見本（例示の値。計算結果ではない）
export const SAMPLE_TILES = [
  { label: '本命星', value: '一白水星' },
  { label: '数秘術の数', value: '7' },
  { label: '太陽星座', value: '牡牛座' },
  { label: '命式', value: '甲子' },
];

// ─── 計算中の行（本当に計算した値を1行ずつ出す） ─────────────────────────
// gender が 'male' / 'female' のときだけ「今の10年」の行を足す。
export function buildLoadingRows(profile, birthDate, gender, now = new Date()) {
  const rows = [
    { label: '生まれ年の星（本命星）を出す', value: profile.nineStar.honmeiStarName },
    { label: '誕生日の数字（数秘術）を出す', value: String(profile.numerology.lifePath) },
    { label: '星座を調べる', value: profile.astrology.sunSign },
    { label: '生まれた日の干支を出す', value: profile.fourPillars.day.combined },
  ];
  if (gender === 'male' || gender === 'female') {
    rows.push({ label: '今の10年の区切りを出す', value: decadeRangeText(calcDaiun(birthDate, gender, now), ageAt(birthDate, now)) });
  }
  return rows;
}
// 満年齢
export function ageAt(birthDate, now) {
  let age = now.getFullYear() - birthDate.getFullYear();
  if (now.getMonth() < birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())) age -= 1;
  return age;
}
// 大運の「今の10年」を「〇歳〜〇歳」にする。8期の外のときは区切りの位置を示す（最初の区切り前／最後の区切り後）。
export function decadeRangeText(daiun, age) {
  if (daiun.currentIndex != null) {
    const p = daiun.periods[daiun.currentIndex];
    return `${p.startAge}歳〜${p.endAge}歳`;
  }
  const first = daiun.periods[0];
  const last = daiun.periods[daiun.periods.length - 1];
  return age < first.startAge ? `${first.startAge}歳から` : `${last.endAge}歳まで`;
}

// ─── 結果先頭の注目カード ───────────────────────────────────────────
// 選んだ分野の無料項目の「結論」。引用行（「…」）があれば引用＋最初の1文、無ければ最初の2文。
// freeSecs は readable.mjs の buildFreeSecs の出力 [{ title, quote, body }]。
export function buildAttention(freeSecs, concernId, nickname) {
  const concern = concernById(concernId);
  if (!concern) return null;
  const sec = freeSecs.find((s) => s.title === concern.title);
  if (!sec) return null;
  const quote = stripCommas(sec.quote || '').trim();
  const sentences = toSentences(sec.body).filter((s) => s !== '');
  const lines = sentences.slice(0, quote ? 1 : 2);
  if (!quote && lines.length === 0) return null;
  return {
    heading: `${callName(nickname)}が気になる『${concern.short}』`,
    title: concern.title,
    quote,
    lines,
    jumpKey: `comp:${concern.title}`,
  };
}

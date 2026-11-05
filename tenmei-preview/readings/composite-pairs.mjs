// 統合鑑定「4つを重ね合わせた結果」用のデータアクセス層。
// 実データは src/readings/pairs/ 配下の6ファイル（別担当が作成中）:
//   star-sign-1.mjs (STAR_SIGN_1：一白〜五黄) / star-sign-2.mjs (STAR_SIGN_2：六白〜九紫)
//   num-stem-1.mjs   (NUM_STEM_1：数1〜6)      / num-stem-2.mjs   (NUM_STEM_2：7,8,9,11,22,33)
//   sign-stem-1.mjs  (SIGN_STEM_1：牡羊座〜乙女座) / sign-stem-2.mjs (SIGN_STEM_2：天秤座〜魚座)
//
// pairs/ はまだ存在しない、または一部のファイル・キーが欠けている可能性があるため、
// このファイルは「読めなかったら null」を徹底する。呼び出し側（tenmei.js）は
// null が返ったブロックを単に表示しない（エラーで画面全体を壊さない）。
//
// 注意: このファイル自身は pairs/ の中身を一切書き換えない。読み込むだけ。

const STAR_IN_FILE1 = new Set(['一白水星', '二黒土星', '三碧木星', '四緑木星', '五黄土星']);
const NUM_IN_FILE1 = new Set([1, 2, 3, 4, 5, 6]);
const SIGN_IN_FILE1 = new Set(['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座']);

// ビルド後（dist/readings/pairs/）でも解決できるよう相対importのみを動的に行う。
// ファイルが無い／壊れている場合は例外を握って null を返す。
async function safeImport(relPath) {
  try {
    return await import(relPath);
  } catch {
    return null;
  }
}

// value が文字列ならそのまま、オブジェクトなら最初に見つかった文字列フィールドを使う。
// 想定外の形でも画面を壊さないための防御的な正規化。
function extractText(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim() ? value : null;
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text;
    for (const v of Object.values(value)) {
      if (typeof v === 'string' && v.trim()) return v;
    }
  }
  return null;
}

// table[key1][key2] を安全に辿って文字列を取り出す（純粋関数・テストしやすい形）
export function lookupPairText(table, key1, key2) {
  if (!table || typeof table !== 'object') return null;
  const level1 = table[key1];
  if (!level1 || typeof level1 !== 'object') return null;
  return extractText(level1[key2]);
}

// 本命星名から STAR_SIGN_1 / STAR_SIGN_2 のどちらを見るか選ぶ（純粋関数）
export function pickStarSignTable(mod1, mod2, starName) {
  return STAR_IN_FILE1.has(starName) ? (mod1?.STAR_SIGN_1 ?? null) : (mod2?.STAR_SIGN_2 ?? null);
}

// 数秘術の数から NUM_STEM_1 / NUM_STEM_2 のどちらを見るか選ぶ（純粋関数）
export function pickNumStemTable(mod1, mod2, lifePath) {
  return NUM_IN_FILE1.has(lifePath) ? (mod1?.NUM_STEM_1 ?? null) : (mod2?.NUM_STEM_2 ?? null);
}

// 星座名から SIGN_STEM_1 / SIGN_STEM_2 のどちらを見るか選ぶ（純粋関数）
export function pickSignStemTable(mod1, mod2, sunSign) {
  return SIGN_IN_FILE1.has(sunSign) ? (mod1?.SIGN_STEM_1 ?? null) : (mod2?.SIGN_STEM_2 ?? null);
}

// 「本質の重なり」＝ 九星（本命星）× 星座
export async function getStarSignOverlap(starName, sunSign) {
  const [mod1, mod2] = await Promise.all([
    safeImport('./pairs/star-sign-1.mjs'),
    safeImport('./pairs/star-sign-2.mjs'),
  ]);
  const table = pickStarSignTable(mod1, mod2, starName);
  const text = lookupPairText(table, starName, sunSign);
  if (!text) return null;
  return { label: `${starName} × ${sunSign}`, text };
}

// 「才能と使命」＝ 数秘術 × 日干
export async function getNumStemOverlap(lifePath, dayStem) {
  const [mod1, mod2] = await Promise.all([
    safeImport('./pairs/num-stem-1.mjs'),
    safeImport('./pairs/num-stem-2.mjs'),
  ]);
  const table = pickNumStemTable(mod1, mod2, lifePath);
  const text = lookupPairText(table, lifePath, dayStem);
  if (!text) return null;
  return { label: `数秘術の数${lifePath} × 日干「${dayStem}」`, text };
}

// 「人との関わり方」＝ 星座 × 日干
export async function getSignStemOverlap(sunSign, dayStem) {
  const [mod1, mod2] = await Promise.all([
    safeImport('./pairs/sign-stem-1.mjs'),
    safeImport('./pairs/sign-stem-2.mjs'),
  ]);
  const table = pickSignStemTable(mod1, mod2, sunSign);
  const text = lookupPairText(table, sunSign, dayStem);
  if (!text) return null;
  return { label: `${sunSign} × 日干「${dayStem}」`, text };
}

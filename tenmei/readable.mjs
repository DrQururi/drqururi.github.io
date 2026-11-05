// 鑑定文の「読みやすさ」整形（アプリ lib/tenmei/readable.ts の移植・純粋関数のみ）。
//   1文＝1段落／「、」は消す／先頭の1文＝結論（白の太字）／「」の中だけ金色／
//   約120字を超えると結論＋最初の2文だけ見せて「続きを読む（あと約〇字）」
import { DIVINATIONS, COMPOSITE_CATEGORIES, FUTURE_SUBS, TENMEI_CHAPTERS, FREE_COMPOSITE_ITEM_COUNT } from './structure.mjs';

export const COLLAPSE_THRESHOLD_CHARS = 120;
export const COLLAPSED_SENTENCES = 3;

export const stripCommas = (s) => s.replace(/、/g, '');

export function toSentences(text, opts = {}) {
  const src = opts.stripComma === false ? (text ?? '') : stripCommas(text ?? '');
  const out = [];
  for (const raw of src.split('\n')) {
    const line = raw.replace(/^[\s　]*→[\s　]*/, '').trim();
    if (line === '') {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      continue;
    }
    let buf = '';
    for (const ch of line) {
      buf += ch;
      if (ch === '。') { out.push(buf.trim()); buf = ''; }
    }
    if (buf.trim()) out.push(buf.trim());
  }
  while (out.length > 0 && out[out.length - 1] === '') out.pop();
  return out;
}
export const firstSentence = (sentences) => sentences.find((s) => s !== '') ?? '';
export function bodyConclusion(body) {
  for (const b of parseBlocks(body)) {
    const f = firstSentence(b.items);
    if (f) return f.replace(/。$/, '');
  }
  return '';
}
export const conclusionLine = (text) => firstSentence(toSentences(text)).replace(/。$/, '');

export function splitEmphasis(s) {
  const segs = [];
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf('「', i);
    if (open < 0) break;
    const close = s.indexOf('」', open + 1);
    if (close < 0) break;
    if (open + 1 === close) {
      segs.push({ text: s.slice(i, close + 1), gold: false });
      i = close + 1;
      continue;
    }
    if (open > i) segs.push({ text: s.slice(i, open), gold: false });
    segs.push({ text: '「', gold: false });
    segs.push({ text: s.slice(open + 1, close), gold: true });
    segs.push({ text: '」', gold: false });
    i = close + 1;
  }
  if (i < s.length) segs.push({ text: s.slice(i), gold: false });
  return segs.length ? segs : [{ text: s, gold: false }];
}

export function parseBlocks(body) {
  const blocks = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const items = toSentences(cur.lines.join('\n'));
    if (cur.heading !== undefined) blocks.push({ heading: cur.heading, items });
    else if (items.length > 0) blocks.push({ items });
    cur = null;
  };
  for (const line of stripCommas(body ?? '').split('\n')) {
    if (line.trim().startsWith('■')) {
      flush();
      cur = { heading: line.trim().slice(1).trim(), lines: [] };
    } else {
      if (!cur) cur = { lines: [] };
      cur.lines.push(line);
    }
  }
  flush();
  return blocks.filter((b) => b.heading !== undefined || b.items.length > 0);
}

export const BASE_HEADINGS = { essence: '性格の本質', compat: '相性のいいタイプ', flow: '運気の流れ' };
// extraBlocks: Web だけが持つ追加ブロック（九星気学の象意など）を末尾に足す [{heading, text}]
export function baseBlocks(d, extraBlocks = []) {
  const s = (v) => (typeof v === 'string' ? v : '');
  return [
    { heading: BASE_HEADINGS.essence, items: toSentences(s(d?.essence)) },
    { heading: BASE_HEADINGS.compat, items: toSentences(s(d?.compatibility)) },
    { heading: BASE_HEADINGS.flow, items: toSentences(s(d?.life_flow)) },
    ...extraBlocks.map((b) => ({ heading: b.heading, items: toSentences(s(b.text)) })),
  ].filter((b) => b.items.length > 0);
}

const charLen = (items) => items.reduce((n, s) => n + s.length, 0);
export function collapseView(blocks, open) {
  const flat = [];
  blocks.forEach((b, bi) => {
    if (b.heading !== undefined) flat.push({ h: b.heading, bi });
    b.items.forEach((s) => flat.push({ s, bi }));
  });
  let seen = 0;
  let cut = flat.length;
  for (let i = 0; i < flat.length; i++) {
    if (flat[i].s !== undefined && flat[i].s !== '') seen++;
    if (seen === COLLAPSED_SENTENCES) { cut = i + 1; break; }
  }
  const sentencesOf = (xs) => xs.filter((x) => x.s !== undefined && x.s !== '').map((x) => x.s);
  const totalChars = charLen(sentencesOf(flat));
  const hiddenChars = charLen(sentencesOf(flat.slice(cut)));
  const needsCollapse = totalChars > COLLAPSE_THRESHOLD_CHARS && hiddenChars > 0;
  const hiddenApprox = Math.max(10, Math.round(hiddenChars / 10) * 10);
  if (open || !needsCollapse) {
    return { blocks: blocks.map((b) => ({ ...b, items: [...b.items] })), totalChars, hiddenChars, needsCollapse, hiddenApprox };
  }
  const shown = [];
  let curBi = -1;
  flat.slice(0, cut).forEach((x) => {
    if (x.bi !== curBi) { shown.push(x.h !== undefined ? { heading: x.h, items: [] } : { items: [] }); curBi = x.bi; }
    if (x.s !== undefined && x.s !== '') shown[shown.length - 1].items.push(x.s);
  });
  return { blocks: shown, totalChars, hiddenChars, needsCollapse, hiddenApprox };
}
export const moreLabel = (open, hiddenApprox) => (open ? 'たたむ' : `続きを読む（あと約${hiddenApprox}字）`);

// 「次は 〜 →」の並び
export const READ_SEQUENCE = [
  ...DIVINATIONS.map((d) => ({ key: `div:${d.id}`, label: `${TENMEI_CHAPTERS[0].no} ${d.name}` })),
  ...FUTURE_SUBS.map((s) => ({ key: `sub:${s.key}`, label: `${TENMEI_CHAPTERS[1].no} ${s.label}` })),
  ...COMPOSITE_CATEGORIES.flatMap((c) => c.free.map((t) => ({ key: `comp:${t}`, label: `${TENMEI_CHAPTERS[2].no} ${t}` }))),
];
export function nextStop(key) {
  const i = READ_SEQUENCE.findIndex((s) => s.key === key);
  return i >= 0 && i + 1 < READ_SEQUENCE.length ? READ_SEQUENCE[i + 1] : null;
}
export const nextLabel = (s) => `次は ${s.label} →`;
export const TOC_BACK_LABEL = '↑ 目次に戻る';

// 天命まとめ（結論の1行だけ）
export function buildSummary(baseById, freeSecs) {
  const groups = [];
  const rows1 = [];
  for (const d of DIVINATIONS) {
    const e = baseById?.[d.id]?.essence;
    const text = conclusionLine(typeof e === 'string' ? e : '');
    if (text) rows1.push({ key: `div:${d.id}`, name: d.name, text });
  }
  if (rows1.length) groups.push({ heading: `${TENMEI_CHAPTERS[0].no} ${TENMEI_CHAPTERS[0].title}`, rows: rows1 });
  const rows3 = [];
  for (const c of COMPOSITE_CATEGORIES) {
    for (const title of c.free) {
      const sec = freeSecs.find((s) => s.title === title);
      if (!sec) continue;
      const q = stripCommas(sec.quote || '').replace(/^「/, '').replace(/」$/, '').trim();
      const text = q || bodyConclusion(sec.body);
      if (text) rows3.push({ key: `comp:${title}`, name: title, text });
    }
  }
  if (rows3.length) {
    groups.push({ heading: `${TENMEI_CHAPTERS[2].no} ${TENMEI_CHAPTERS[2].title}（無料${FREE_COMPOSITE_ITEM_COUNT}項目）`, rows: rows3 });
  }
  return groups;
}
export const summaryTitle = () => 'あなたの天命まとめ';

// Webの総合占い無料4項目（readings/composite-free.mjs）→ アプリの { title, quote, body } に揃える
// 先頭行が「…」だけの行ならそれを quote にする（アプリの parseComposite と同じ分け方）
const FREE_FIELD_BY_TITLE = { '総合性格': 'personality', '天職': 'career', '人生の転機': 'turningPoints', '恋愛の癖と傾向': 'loveHabit' };
export function buildFreeSecs(compositeFree) {
  if (!compositeFree) return [];
  return Object.entries(FREE_FIELD_BY_TITLE).map(([title, field]) => {
    const lines = String(compositeFree[field] ?? '').split('\n');
    const first = (lines[0] ?? '').trim();
    const isQuote = /^「[^」]*」$/.test(first);
    return { title, quote: isQuote ? first : '', body: (isQuote ? lines.slice(1) : lines).join('\n').trim() };
  });
}

// 天命診断サイト — 画面制御（生年月日はこの端末内だけで扱い、どこにも送信しない）
// 構成はアプリ「パワースポットマップ」1.3.6 の天命タブと同じ3章：
//   ① 4つの運勢 ／ ② 今後の運勢（月・10年・神獣） ／ ③ 総合占い（4カテゴリ）
// 無料／有料の線引きは structure.mjs（アプリ lib/tenmei/structure.ts の移植）に従う。
import { buildFortuneProfile, buildFortuneExtras, calcYearDirections, DIR_ORDER, DIR_META } from './fortune-core.mjs';
import { getNineStarReading } from './readings/nine-star.mjs';
import { getNineStarExtra, TSUKI_STAR_NOTE, HONMEI_STAR_NOTE } from './readings/nine-star-extra.mjs';
import { getNumerologyReading } from './readings/numerology.mjs';
import { getAstrologyReading } from './readings/astrology.mjs';
import { getFourPillarsReading } from './readings/four-pillars.mjs';
import { getCompositeFreeReading } from './readings/composite-free.mjs';
import { getStarSignOverlap, getNumStemOverlap, getSignStemOverlap } from './readings/composite-pairs.mjs';
import {
  TENMEI_CHAPTERS, COMPOSITE_CATEGORIES, JUSHIN_PAID_ITEMS, PAID_ITEM_HINTS, FUTURE_PAID_NOTES, FREE_ITEM_META,
  FREE_COMPOSITE_ITEM_COUNT, PAID_COMPOSITE_ITEM_COUNT,
  buildDiagram, subStatus, subStatusLabel, paidItemCount, buildFreeRangeSummary, buildPaidLine, pickActiveIndex,
} from './structure.mjs';
import {
  toSentences, parseBlocks, baseBlocks, splitEmphasis, collapseView, moreLabel, nextStop, nextLabel,
  TOC_BACK_LABEL, buildSummary, summaryTitle, buildFreeSecs,
} from './readable.mjs';
import {
  buildMonthlyFortuneCalc, calcMonthlyNineStarPalace, buildFreeMonthlyReading, buildFreeMonthlyFootnote, STRENGTH_LABEL,
  buildFreeDaiunReading, calcDaiun, calcJushin, cyclePositionAt, SEASONS, SEASON_THEME, SEASON_GIST, SEASON_COLOR,
  BEAST_ONE_LINER, buildCycleMention,
} from './future-core.mjs';

const APP_STORE_URL = 'https://apps.apple.com/jp/app/id6791989590';
const SITE_URL = 'https://drqururi.github.io/tenmei/';
// Webだけにある「4つを重ねて読む」3ブロック（九星×星座など）。アプリには無く、本文に「絶対」「確実」など断定の語が13か所あるため既定は非表示。
const SHOW_PAIR_BLOCKS = false;

// 占術ID → その占術の鑑定データを引くための関数（profile全体を受け取る）
const READING_LOOKUP = {
  nine_star:    (profile) => {
    const base = getNineStarReading(profile.nineStar.honmeiStarName);
    if (!base) return null;
    const extra = getNineStarExtra(profile.nineStar.honmeiStarName);
    return { ...base, ...(extra ?? {}), note: HONMEI_STAR_NOTE };
  },
  numerology:   (profile) => getNumerologyReading(profile.numerology.lifePath),
  astrology:    (profile) => getAstrologyReading(profile.astrology.sunSign),
  four_pillars: (profile) => getFourPillarsReading(profile.fourPillars.day.stem),
};

const FORTUNE_DATA = [
  { id: 'nine_star', name: '九星気学', attrLabel: '本命星',
    explain: [
      { h: 'どんな占術？', t: '古代中国から伝わる東洋の命占術です。天地のエネルギーを9つの星に分類し、生まれた年・月・日の星の配置からその人の本質・才能・運命を読み解きます。' },
      { h: '日常でどう取り入れる？', t: '最も実践的なのは「方位」の活用です。吉方位に向かって外出したり、引越しや旅行の方向を吉方位に合わせると運のエネルギーが高まるといわれています。' },
    ] },
  { id: 'numerology', name: '数秘術', attrLabel: '数秘術の数',
    explain: [
      { h: 'どんな占術？', t: '古代ギリシャのピタゴラスが体系化したとされる西洋の占術です。生年月日の数字を一桁になるまで足し合わせて、その人の核となる数を導き出します。' },
      { h: '日常でどう取り入れる？', t: 'パーソナルイヤーナンバーを計算することで今年のテーマがわかります。今が何の年かを把握して、行動の指針にしてみてください。' },
    ] },
  { id: 'astrology', name: '西洋占星術', attrLabel: '太陽星座',
    explain: [
      { h: 'どんな占術？', t: '約2000年以上の歴史を持つ西洋の命占術です。生まれた瞬間の天体の配置をホロスコープに記録し、その配置パターンから性格・才能・人生の流れを読み解きます。' },
      { h: '日常でどう取り入れる？', t: '「月のサイクル」の活用が最もすぐに使えます。新月は始める日、満月は手放す日として意識すると、日常のリズムが整いやすくなります。' },
    ] },
  { id: 'four_pillars', name: '四柱推命', attrLabel: '命式（日柱）',
    explain: [
      { h: 'どんな占術？', t: '中国4000年の歴史を持つ東洋最高峰の命占術です。生まれた年・月・日・時の柱から命式という運命の地図を作ります。' },
      { h: '日常でどう取り入れる？', t: '「命式はそのままの自分を示している」ということを大切にしてください。良い・悪い命式は存在せず、すべての命式に固有の強みがあります。' },
    ] },
];

const $ = (sel, root = document) => root.querySelector(sel);

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

function tagRow(items, variant) {
  const wrap = el('div', { class: 'tagrow' });
  for (const t of items) wrap.appendChild(el('span', { class: `tag tag--${variant}`, text: t }));
  return wrap;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}
function lockIcon() {
  const svg = svgEl('svg', { class: 'lock', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' });
  svg.appendChild(svgEl('rect', { x: 5, y: 11, width: 14, height: 9, rx: 2 }));
  svg.appendChild(svgEl('path', { d: 'M8 11V8a4 4 0 0 1 8 0v3' }));
  return svg;
}
const badge = (kind, text) => el('span', { class: `badge badge--${kind}` }, [kind === 'paid' ? lockIcon() : null, text]);

// ─── 画面の共有状態（結果を作るたびに作り直す） ──────────────────
let ctx = null;
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function barHeight() { const b = $('#tocBar'); return b ? b.offsetHeight : 0; }
function scrollToEl(node, extra = 4) {
  const y = node.getBoundingClientRect().top + window.scrollY - barHeight() - extra;
  window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion() ? 'auto' : 'smooth' });
}
// 区画へ飛ぶ。カードなら自動で開く（アプリ：目次・固定バーから来たら開く）
function jumpKey(key) {
  const t = ctx.targets[key];
  if (!t) return;
  if (t.open) t.open();
  requestAnimationFrame(() => scrollToEl(t.el));
}
const backToToc = () => { const n = $('#diagramHost'); if (n) scrollToEl(n, 8); };

// ─── 読みやすい本文（アプリ ReadableBlocks の移植） ────────────────
function sentenceNode(text, lead) {
  const p = el('p', { class: lead ? 'rb__s rb__s--lead' : 'rb__s' });
  for (const seg of splitEmphasis(text)) {
    p.appendChild(seg.gold ? el('em', { text: seg.text }) : document.createTextNode(seg.text));
  }
  return p;
}
// 「次は 〜 →」と「↑ 目次に戻る」
function navRow(navKey) {
  const nx = nextStop(navKey);
  const nav = el('div', { class: 'rb__nav' });
  nav.appendChild(nx
    ? el('button', { type: 'button', class: 'linkBtn', text: nextLabel(nx), onclick: () => jumpKey(nx.key) })
    : el('span'));
  nav.appendChild(el('button', { type: 'button', class: 'linkBtn linkBtn--dim', text: TOC_BACK_LABEL, onclick: backToToc }));
  return nav;
}
// navKey を渡すと末尾に「次は 〜 →」「↑ 目次に戻る」を付ける。戻り値 { node, open() }
function readableBox(blocks, navKey, headEl, deferNav = false) {
  const root = el('div', { class: 'rb' });
  let isOpen = false;
  function render() {
    root.innerHTML = '';
    const view = collapseView(blocks, isOpen);
    view.blocks.forEach((b) => {
      let leadDone = false;
      if (b.heading !== undefined) root.appendChild(el('div', { class: 'rb__h', role: 'heading', 'aria-level': '4' }, [el('span', { class: 'bar' }), b.heading]));
      for (const s of b.items) {
        if (s === '') { root.appendChild(el('div', { class: 'rb__gap' })); continue; }
        root.appendChild(sentenceNode(s, !leadDone));
        leadDone = true;
      }
    });
    if (view.needsCollapse) {
      root.appendChild(el('button', {
        type: 'button', class: 'moreBtn', 'aria-expanded': isOpen ? 'true' : 'false',
        text: moreLabel(isOpen, view.hiddenApprox),
        onclick: () => { isOpen = !isOpen; render(); if (!isOpen && headEl) scrollToEl(headEl, 8); },
      }));
    }
    if (navKey && !deferNav) root.appendChild(navRow(navKey));
  }
  render();
  return { node: root, open() { if (!isOpen) { isOpen = true; render(); } } };
}

// ─── 有料項目（名前＋有料バッジ＋「この項目でわかること」）／章末の「続きはアプリで」 ──
function paidRow(name, hint) {
  const row = el('div', { class: 'paidRow' });
  row.appendChild(el('div', { class: 'paidRow__top' }, [
    el('span', { class: 'paidRow__name' }, [lockIcon(), name]),
    badge('paid', '有料'),
  ]));
  if (hint) row.appendChild(el('p', { class: 'paidRow__hint', text: hint }));
  return row;
}
function paidList(rows, headText = 'ここまで無料 ／ ここから有料') {
  const wrap = el('div', { class: 'paidList' });
  if (headText) wrap.appendChild(el('div', { class: 'paidList__h', text: headText }));
  for (const [n, h] of rows) wrap.appendChild(paidRow(n, h));
  return wrap;
}
function appButton(label = '続きはアプリで') {
  return el('a', { class: 'btn btn--gold', href: APP_STORE_URL, target: '_blank', rel: 'noopener', text: label });
}
function ctaBox(lead, extraClass = '') {
  return el('div', { class: `cta ${extraClass}`.trim() }, [el('p', { class: 'cta__lead', text: lead }), appButton()]);
}

// ─── ① 4つの運勢 ────────────────────────────────────────────
function buildCard(fortune, userAttr, extras, reading, navKey) {
  const card = el('div', { class: 'card' });
  const head = el('div', { class: 'card__head' }, [
    el('div', { class: 'card__title' }, [el('span', { class: 'card__dot' }), el('span', { class: 'card__name', text: fortune.name })]),
    el('button', { class: 'card__explainBtn', type: 'button', text: `${fortune.name}とは？` }),
  ]);
  card.appendChild(head);
  const inner = el('div', { class: 'card__inner' });
  card.appendChild(inner);

  inner.appendChild(el('div', { class: 'card__attr' }, [
    el('div', { class: 'card__attrLabel', text: userAttr.label }),
    el('div', { class: 'card__attrValue', text: userAttr.value }),
    userAttr.sub ? el('div', { class: 'card__attrSub', text: userAttr.sub }) : null,
    userAttr.subNote ? el('p', { class: 'card__attrNote', text: userAttr.subNote }) : null,
  ]));

  if (extras.keywords.length > 0) {
    inner.appendChild(el('div', { class: 'mini' }, [el('span', { class: 'bar' }), 'あなたの強み']));
    inner.appendChild(tagRow(extras.keywords, 'keyword'));
  }
  if (extras.compat.good.length > 0) {
    inner.appendChild(el('div', { class: 'mini' }, [el('span', { class: 'bar' }), extras.compat.label]));
    inner.appendChild(el('div', { class: 'compatRow' }, [el('span', { class: 'compatMark compatMark--good', text: '◎' }), tagRow(extras.compat.good, 'good')]));
    if (extras.compat.challenge && extras.compat.challenge.length > 0) {
      inner.appendChild(el('div', { class: 'compatRow' }, [el('span', { class: 'compatMark compatMark--challenge', text: '△' }), tagRow(extras.compat.challenge, 'challenge')]));
    }
  }
  if (extras.elementBalance && extras.elementBalance.length > 0) {
    inner.appendChild(el('div', { class: 'mini' }, [el('span', { class: 'bar' }), '命式の五行バランス']));
    const maxC = Math.max(...extras.elementBalance.map((e) => e.count), 1);
    const balanceBox = el('div', { class: 'balance' });
    for (const { element, color, count } of extras.elementBalance) {
      const pct = Math.round((count / maxC) * 100);
      balanceBox.appendChild(el('div', { class: 'balance__row' }, [
        el('span', { class: 'balance__el', style: `color:${color}`, text: element }),
        el('div', { class: 'balance__track' }, [el('div', { class: 'balance__fill', style: `width:${pct}%;background:${color}` })]),
        el('span', { class: 'balance__count', text: count > 0 ? String(count) : '—' }),
      ]));
    }
    inner.appendChild(balanceBox);
  }

  // 性格の本質／相性のいいタイプ／運気の流れ（アプリと同じ見出し・並び）。九星気学だけ Web 独自の補足を末尾に足す
  const extraBlocks = [];
  if (reading) {
    if (reading.symbols) extraBlocks.push({ heading: '象意の広がり', text: reading.symbols });
    if (reading.luckyHint) extraBlocks.push({ heading: '日常で意識しやすいヒント', text: reading.luckyHint });
    if (reading.note) extraBlocks.push({ heading: '本命星の調べ方', text: reading.note });
  }
  const rb = readableBox(baseBlocks(reading, extraBlocks), navKey, card);
  inner.appendChild(rb.node);

  const explainBox = el('div', { class: 'card__explain', hidden: '' });
  for (const sec of fortune.explain) {
    explainBox.appendChild(el('div', { class: 'explainSec' }, [
      el('div', { class: 'explainSec__h' }, [el('span', { class: 'bar' }), sec.h]),
      el('p', { class: 'explainSec__t', text: sec.t }),
    ]));
  }
  inner.appendChild(explainBox);
  head.querySelector('.card__explainBtn').addEventListener('click', () => { explainBox.hidden = !explainBox.hidden; });
  return { el: card, open: rb.open };
}

// ─── ② 今後の運勢 ────────────────────────────────────────────
function futureCard(title, free = true) {
  const card = el('div', { class: 'card' });
  card.appendChild(el('div', { class: 'card__head' }, [
    el('div', { class: 'card__title' }, [el('span', { class: 'card__dot' }), el('span', { class: 'card__name', text: title })]),
    badge(free ? 'free' : 'paid', free ? '無料' : '有料'),
  ]));
  const inner = el('div', { class: 'card__inner' });
  card.appendChild(inner);
  return { card, inner };
}

function buildMonthly(profile, birthDate, now) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const honmei = profile.nineStar.honmeiStar;
  const calc = buildMonthlyFortuneCalc(birthDate, honmei, year)[month - 1];
  const { card, inner } = futureCard('今月の運勢');
  inner.appendChild(el('div', { class: 'monthMark' }, [
    el('span', { class: 'monthMark__m', text: calc.strengthMark }),
    el('span', { class: 'monthMark__t', text: `${month}月の運勢（今月・無料）　${STRENGTH_LABEL[calc.strength]}` }),
  ]));
  const rb = readableBox([{ items: toSentences(buildFreeMonthlyReading(calc)) }], 'sub:monthly', card, true);
  inner.appendChild(rb.node);
  inner.appendChild(el('p', { class: 'foot', text: buildFreeMonthlyFootnote(calc) }));
  const pos = cyclePositionAt(calcJushin(birthDate).beast, now);
  inner.appendChild(el('p', { class: 'foot', text: buildCycleMention(pos) }));
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const next = calcMonthlyNineStarPalace(honmei, ny, nm);
  inner.appendChild(el('p', { class: 'nextLine', text: `来月（${nm}月）は${next.palaceName}宮の月です（無料）` }));
  inner.appendChild(navRow('sub:monthly'));
  inner.appendChild(paidList([['ほかの月の運勢（12か月分）', FUTURE_PAID_NOTES.monthly]], '詳しい続きは有料'));
  return { el: card, open: rb.open };
}

function ageAt(birthDate, now) {
  let age = now.getFullYear() - birthDate.getFullYear();
  if (now.getMonth() < birthDate.getMonth() || (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())) age -= 1;
  return age;
}
function buildDecade(birthDate, now) {
  const { card, inner } = futureCard('今の10年の運勢');
  inner.appendChild(el('p', { class: 'foot', style: 'margin-top:0', text: '大運の計算に使います。選んだ内容はこの端末の外へ送らず、保存もしません。' }));
  const picker = el('div', { class: 'picker', role: 'group', 'aria-label': '性別を選ぶ' });
  const resultHost = el('div');
  let current = null;
  let rbOpen = null;
  const btns = {};
  function show(g) {
    current = g;
    for (const k of Object.keys(btns)) { btns[k].classList.toggle('chip--on', k === g); btns[k].setAttribute('aria-pressed', k === g ? 'true' : 'false'); }
    resultHost.innerHTML = '';
    const d = calcDaiun(birthDate, g, now);
    const age = ageAt(birthDate, now);
    if (d.currentIndex == null) {
      const first = d.periods[0];
      const last = d.periods[d.periods.length - 1];
      const msg = age < first.startAge
        ? `最初の10年の区切りは${first.startAge}歳からです（いまは${age}歳）。`
        : `8つの区切りは${last.endAge}歳までです（いまは${age}歳）。`;
      resultHost.appendChild(el('p', { class: 'decadeTitle', text: msg }));
      rbOpen = null;
    } else {
      const p = d.periods[d.currentIndex];
      resultHost.appendChild(el('p', { class: 'decadeTitle', text: `今のあなたは「${p.ganzhi}」の10年（${p.startAge}歳〜${p.endAge}歳・無料）` }));
      const rb = readableBox([{ items: toSentences(buildFreeDaiunReading(p.stem)) }], 'sub:decade', card, true);
      rbOpen = rb.open;
      resultHost.appendChild(rb.node);
    }
  }
  for (const [g, label] of [['male', '男性'], ['female', '女性']]) {
    btns[g] = el('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', text: label, onclick: () => show(g) });
    picker.appendChild(btns[g]);
  }
  inner.appendChild(picker);
  inner.appendChild(resultHost);
  resultHost.appendChild(el('p', { class: 'foot', text: '性別を選ぶと、いまの10年の読み物が表示されます。' }));
  inner.appendChild(navRow('sub:decade'));
  inner.appendChild(paidList([['ほかの時期の運勢（8期分）', FUTURE_PAID_NOTES.decade]], '詳しい続きは有料'));
  return { el: card, open: () => { if (rbOpen) rbOpen(); } };
}

function buildJushin(birthDate, now) {
  const { beast } = calcJushin(birthDate);
  const pos = cyclePositionAt(beast, now);
  const { card, inner } = futureCard('今年の神獣');
  inner.appendChild(el('div', { class: 'card__attr' }, [
    el('div', { class: 'card__attrLabel', text: 'あなたの神獣' }),
    el('div', {}, [el('span', { class: 'beastName', text: beast.name }), el('span', { class: 'beastRead', text: `（${beast.reading}）　属性：${beast.element}` })]),
    el('p', { class: 'foot', text: BEAST_ONE_LINER[beast.name] ?? '' }),
  ]));
  inner.appendChild(el('p', { class: 'decadeTitle', text: `${pos.year}年は${pos.season}の${pos.yearNo}年目` }));
  inner.appendChild(el('span', { class: 'seasonBadge', style: `background:${SEASON_COLOR[pos.season]}`, text: `周期では${SEASON_THEME[pos.season]}の時期` }));
  inner.appendChild(el('p', { class: 'rb__s', text: SEASON_GIST[pos.season] }));
  const bar = el('div', { class: 'cycleBar', role: 'img', 'aria-label': `12年周期のうち、今年は${pos.season}の${pos.yearNo}年目` });
  for (let i = 0; i < 12; i++) {
    bar.appendChild(el('i', { class: i === pos.index ? 'on' : '', style: `background:${SEASON_COLOR[SEASONS[Math.floor(i / 3)]]}` }));
  }
  inner.appendChild(bar);
  const labels = el('div', { class: 'cycleLabels' });
  SEASONS.forEach((s) => labels.appendChild(el('span', { text: s })));
  inner.appendChild(labels);
  inner.appendChild(el('p', { class: 'foot', text: '12年周期の考え方にもとづく読み物です。毎年の過ごし方を考えるきっかけとして、気軽にお読みください。' }));
  inner.appendChild(navRow('sub:jushin'));
  inner.appendChild(paidList(JUSHIN_PAID_ITEMS.map((n) => [n, PAID_ITEM_HINTS[n]]), '有料で読める内容'));
  return { el: card, open: null };
}

// ─── ③ 総合占い ────────────────────────────────────────────
function buildCategory(cat, secs, ctxRef) {
  const wrap = el('div', { class: 'cat' });
  wrap.appendChild(el('h4', { class: 'sub__h' }, [
    el('span', { class: 'bar', style: `background:${cat.color}` }), cat.label,
    el('span', { class: 'cat__count', text: `無料${cat.free.length}・有料${cat.paid.length}` }),
  ]));
  const opens = [];
  for (const title of cat.free) {
    const sec = secs.find((s) => s.title === title);
    const color = (FREE_ITEM_META[title] ?? {}).color ?? cat.color;
    const card = el('div', { class: 'compCard', style: `background:${color}0D;border-color:${color}50` });
    card.appendChild(el('div', { class: 'compCard__head', style: `background:${color}28` }, [
      el('div', { class: 'card__title' }, [el('span', { class: 'card__dot', style: `background:${color}` }), el('span', { class: 'card__name', text: title })]),
      badge('free', '無料'),
    ]));
    const inner = el('div', { class: 'compCard__inner' });
    card.appendChild(inner);
    if (sec) {
      if (sec.quote) inner.appendChild(el('p', { class: 'compCard__quote', style: `color:${color}`, text: sec.quote }));
      const rb = readableBox(parseBlocks(sec.body), `comp:${title}`, card);
      inner.appendChild(rb.node);
      opens.push(rb.open);
      ctxRef.targets[`comp:${title}`] = { el: card, open: rb.open };
    } else {
      inner.appendChild(el('p', { class: 'foot', text: 'この項目はWeb版では準備中です。アプリで読めます。' }));
      ctxRef.targets[`comp:${title}`] = { el: card, open: null };
    }
    wrap.appendChild(card);
  }
  wrap.appendChild(paidList(cat.paid.map((n) => [n, PAID_ITEM_HINTS[n]])));
  return { el: wrap, open: () => opens.forEach((f) => f()) };
}

// ─── おまけ：今年の吉方位（九星気学・年盤）＋ 4つを重ねて読む ─────────────
function buildCompassSvg(dirsByKind, size = 220) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const svg = svgEl('svg', { width: size, height: size, viewBox: `0 0 ${size} ${size}`, role: 'img', 'aria-label': '方位図' });

  DIR_ORDER.forEach((dir, i) => {
    const startA = ((i * 45) - 90 - 22.5) * Math.PI / 180;
    const endA = ((i * 45) - 90 + 22.5) * Math.PI / 180;
    const midA = ((i * 45) - 90) * Math.PI / 180;
    const kind = dirsByKind[dir];
    const isLucky = kind === 'kichi' || kind === 'shokichi';
    const isAvoid = kind === 'kyou';
    const x1 = cx + r * Math.cos(startA), y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA), y2 = cy + r * Math.sin(endA);
    const tx = cx + r * 0.64 * Math.cos(midA), ty = cy + r * 0.64 * Math.sin(midA);

    const fill = isLucky ? 'rgba(46,180,120,0.22)' : isAvoid ? 'rgba(232,124,96,0.14)' : 'rgba(255,255,255,0.03)';
    const stroke = isLucky ? 'rgba(100,220,150,0.75)' : isAvoid ? 'rgba(232,124,96,0.4)' : 'rgba(180,140,255,0.2)';

    svg.appendChild(svgEl('path', {
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`,
      fill, stroke, 'stroke-width': 1,
    }));
    const label = svgEl('text', {
      x: tx, y: ty, 'text-anchor': 'middle', 'dominant-baseline': 'middle',
      'font-size': DIR_META[dir].jp.length > 1 ? 13 : 15,
      fill: isLucky ? 'rgba(130,230,170,0.95)' : isAvoid ? 'rgba(232,150,130,0.75)' : 'rgba(200,180,255,0.5)',
      'font-weight': '700',
    });
    label.textContent = DIR_META[dir].jp;
    svg.appendChild(label);
  });

  svg.appendChild(svgEl('circle', { cx, cy, r, fill: 'none', stroke: 'rgba(201,168,76,0.5)', 'stroke-width': 1.5 }));
  svg.appendChild(svgEl('circle', { cx, cy, r: 7, fill: 'rgba(13,11,46,0.95)' }));
  svg.appendChild(svgEl('circle', { cx, cy, r: 2.5, fill: 'rgba(255,255,255,0.75)' }));
  // 北マーク
  const nMark = svgEl('text', { x: cx, y: cy - r - 4, 'text-anchor': 'middle', 'font-size': 10, fill: 'rgba(200,180,255,0.5)' });
  nMark.textContent = 'N';
  svg.appendChild(nMark);
  return svg;
}

function buildDirectionSection(yearDirections) {
  const box = el('div', { class: 'direction' });
  box.appendChild(el('div', { class: 'direction__label' }, [el('span', { class: 'bar bar--green' }), `${yearDirections.kigakuYear}年のあなたの吉方位`]));
  box.appendChild(el('div', { class: 'direction__note', text: '九星気学の年盤（立春で切り替わる年の方位盤）にもとづく、今年1年の吉方位です。' }));
  const dirsByKind = {};
  for (const d of DIR_ORDER) dirsByKind[d] = yearDirections.dirs[d].kind;
  box.appendChild(el('div', { class: 'direction__compass' }, [buildCompassSvg(dirsByKind)]));
  if (yearDirections.kichiDirs.length > 0) {
    box.appendChild(el('div', { class: 'direction__rowLabel direction__rowLabel--good', text: '吉方位' }));
    box.appendChild(tagRow(yearDirections.kichiDirs.map((d) => DIR_META[d].jp), 'good'));
  } else {
    box.appendChild(el('p', { class: 'direction__empty', text: '今年は目立った吉方位がありません。無理な移動は控えめに。' }));
  }
  if (yearDirections.kyouDirs.length > 0) {
    box.appendChild(el('div', { class: 'direction__rowLabel direction__rowLabel--bad', text: '避けたい方角（凶方）' }));
    box.appendChild(tagRow(yearDirections.kyouDirs.map((d) => DIR_META[d].jp), 'challenge'));
  }
  box.appendChild(paidList([
    ['今月の吉方位（月盤）', 'アプリの吉方位マップで、今月の方位盤を確認できます'],
    ['今日の吉方位（日盤）', 'アプリの吉方位マップで、今日の方位盤を確認できます'],
  ], '詳しい続きは有料'));
  return box;
}

const INTEGRATED_BLOCK_SPECS = [
  { title: '本質の重なり', fetch: (p) => getStarSignOverlap(p.nineStar.honmeiStarName, p.astrology.sunSign) },
  { title: '才能と使命', fetch: (p) => getNumStemOverlap(p.numerology.lifePath, p.fourPillars.day.stem) },
  { title: '人との関わり方', fetch: (p) => getSignStemOverlap(p.astrology.sunSign, p.fourPillars.day.stem) },
];
async function buildIntegratedBlocks(profile) {
  const results = await Promise.all(INTEGRATED_BLOCK_SPECS.map((spec) => spec.fetch(profile)));
  const wrap = el('div');
  INTEGRATED_BLOCK_SPECS.forEach((spec, i) => {
    const result = results[i];
    if (!result || !result.text) return;
    wrap.appendChild(el('div', { class: 'integratedBlock' }, [
      el('div', { class: 'integratedBlock__title' }, [el('span', { class: 'bar' }), spec.title]),
      el('div', { class: 'integratedBlock__pair', text: result.label }),
      el('p', { class: 'integratedBlock__text', text: result.text }),
    ]));
  });
  return wrap.childElementCount > 0 ? wrap : null;
}

// ─── 天命まとめ・天命の目次（図） ─────────────────────────────────
function buildSummaryPanel(baseById, freeSecs) {
  const groups = buildSummary(baseById, freeSecs);
  if (!groups.length) return null;
  const panel = el('section', { class: 'panel' });
  panel.appendChild(el('h2', { class: 'panel__title', text: summaryTitle() }));
  panel.appendChild(el('p', { class: 'panel__lead', text: '無料で読める項目の「結論」だけを並べました。タップすると、その鑑定へ移動します。' }));
  for (const g of groups) {
    panel.appendChild(el('div', { class: 'sumGroup__h', text: g.heading }));
    for (const r of g.rows) {
      panel.appendChild(el('button', { type: 'button', class: 'sumRow', onclick: () => jumpKey(r.key) }, [
        el('span', { class: 'sumRow__n', text: r.name }),
        el('span', { class: 'sumRow__t', text: r.text }),
      ]));
    }
  }
  return panel;
}

function buildDiagramPanel() {
  const d = el('details', { class: 'panel diagram', open: '' });
  d.appendChild(el('summary', {}, [
    el('h2', { class: 'panel__title', style: 'margin:0', text: '天命の目次' }),
    el('span', { class: 'diagram__toggle', text: '開く／閉じる' }),
  ]));
  d.appendChild(el('div', { class: 'legend' }, [
    el('span', {}, [badge('free', '無料'), '読めます']),
    el('span', {}, [badge('paid', '有料'), 'アプリで解放']),
    el('span', {}, [badge('part', '一部有料'), '中に有料あり']),
  ]));
  d.appendChild(el('div', { class: 'dgFoot dgFoot--top' }, [
    el('div', { class: 'dgFoot__free', text: buildFreeRangeSummary() }),
    el('div', {}, [el('b', { text: buildPaidLine() })]),
  ]));
  buildDiagram().forEach((ch) => {
    const chap = el('div', { class: 'dgCh' });
    chap.appendChild(el('h3', { class: 'dgCh__h', text: `${ch.chapter.no} ${ch.chapter.title}` }));
    chap.appendChild(el('p', { class: 'dgCh__d', text: ch.chapter.desc }));
    ch.subs.forEach((s) => {
      const st = subStatus(s.items);
      const key = jumpKeyForSub(ch.chapter.key, s.key);
      const row = el('button', { type: 'button', class: 'dgSub', onclick: () => jumpKey(key) });
      row.appendChild(el('div', { class: 'dgSub__top' }, [
        el('span', { class: 'dgSub__label', text: s.label }),
        badge(st === 'free' ? 'free' : st === 'paid' ? 'paid' : 'part', subStatusLabel(st)),
      ]));
      if (s.note) row.appendChild(el('div', { class: 'dgSub__note', text: s.note }));
      if (s.items.length) {
        const items = el('div', { class: 'dgSub__items' });
        s.items.forEach((it) => items.appendChild(el('span', {}, [it.free ? el('i', { class: 'dot' }) : lockIcon(), it.label])));
        row.appendChild(items);
      }
      chap.appendChild(row);
    });
    d.appendChild(chap);
  });
  return d;
}
// 目次の小見出し → 飛び先のキー
function jumpKeyForSub(chapterKey, subKey) {
  if (chapterKey === 'divination') return `div:${subKey}`;
  if (chapterKey === 'future') return `sub:${subKey}`;
  return `cat:${subKey}`;
}

// ─── 固定目次バー（2段） ──────────────────────────────────────
function setupTocBar() {
  const t1 = $('#tocT1');
  const t2 = $('#tocT2');
  t1.innerHTML = '';
  t2.innerHTML = '';
  const chBtns = TENMEI_CHAPTERS.map((ch, ci) => {
    const b = el('button', { type: 'button', class: 'chip', text: `${ch.no} ${ch.title}`, onclick: () => jumpKey(ctx.sections.find((s) => s.chapter === ci).jump) });
    t1.appendChild(b);
    return b;
  });
  let shownChapter = -1;
  let subBtns = [];
  function renderT2(ci) {
    t2.innerHTML = '';
    subBtns = ctx.sections.filter((s) => s.chapter === ci).map((s) => {
      const b = el('button', { type: 'button', class: 'chip', text: s.label, onclick: () => jumpKey(s.jump) });
      t2.appendChild(b);
      return { b, s };
    });
    shownChapter = ci;
  }
  function update() {
    const bar = $('#tocBar');
    if (!bar || $('#resultBody').hidden) return;
    const off = barHeight() + 8;
    const ys = ctx.sections.map((s) => s.el.getBoundingClientRect().top + window.scrollY);
    const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    const idx = pickActiveIndex(ys, window.scrollY, off, atEnd);
    const act = ctx.sections[idx];
    if (!act) return;
    if (shownChapter !== act.chapter) renderT2(act.chapter);
    chBtns.forEach((b, i) => b.classList.toggle('chip--on', i === act.chapter));
    subBtns.forEach(({ b, s }) => {
      const on = s === act;
      b.classList.toggle('chip--on', on);
      if (on) t2.scrollLeft = Math.max(0, b.offsetLeft - 12);
    });
  }
  ctx.updateToc = update;
  renderT2(0);
  update();
}
let scrollBound = false;
function bindScroll() {
  if (scrollBound) return;
  scrollBound = true;
  let raf = 0;
  const run = () => { raf = 0; if (ctx && ctx.updateToc) ctx.updateToc(); };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(run); }, { passive: true });
  window.addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(run); });
}

// ─── ローディング演出（診断ボタン押下〜結果表示まで約5秒） ──────────────
// 博士指示（2026-10-16）：すぐ結果を出すと信頼感が無いので、段階的な文言＋進捗バー＋
// 星図風の回転アニメーションで約5秒かける。prefers-reduced-motionの人は回転のみ止める
// （待ち時間・段階表示は変えない＝CSS側の@media(prefers-reduced-motion)で対応済み）。
const LOADING_STAGES = [
  '九星気学 本命星を算出中',
  '数秘術 ライフパスナンバーを算出中',
  '西洋占星術 太陽星座を算出中',
  '四柱推命 日干を算出中',
  '4つの結果を統合しています',
];
const LOADING_STAGE_MS = 1000; // 5段 × 1000ms ≒ 約5秒

// 星図風の回転リング（絵文字は使わず線のSVGのみ。サイトの紫/金配色に揃える）
function buildLoadingRingSvg() {
  const svg = svgEl('svg', { class: 'loading__ring', viewBox: '0 0 120 120', role: 'img', 'aria-label': '計算中' });
  svg.appendChild(svgEl('circle', { cx: 60, cy: 60, r: 50, fill: 'none', stroke: 'rgba(180,140,255,0.22)', 'stroke-width': 1 }));
  svg.appendChild(svgEl('circle', {
    cx: 60, cy: 60, r: 34, fill: 'none', stroke: 'rgba(201,168,76,0.3)', 'stroke-width': 1, 'stroke-dasharray': '3 7',
  }));
  const points = [[60, 14], [97, 37], [97, 83], [60, 106], [23, 83], [23, 37]];
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length];
    svg.appendChild(svgEl('line', { x1, y1, x2, y2, stroke: 'rgba(201,168,76,0.4)', 'stroke-width': 1 }));
  });
  for (const [x, y] of points) {
    svg.appendChild(svgEl('circle', { cx: x, cy: y, r: 3, fill: 'rgba(245,215,142,0.9)' }));
  }
  svg.appendChild(svgEl('circle', { cx: 60, cy: 60, r: 4, fill: 'rgba(255,255,255,0.85)' }));
  return svg;
}

// 初期化時に1回だけ、ローディングUIの静的な骨組み（リング・段階リスト）をDOMへ入れる
function populateLoadingHost() {
  $('#loadingRingWrap').appendChild(buildLoadingRingSvg());
  const stages = $('#loadingStages');
  LOADING_STAGES.forEach((label, i) => {
    stages.appendChild(el('div', { class: 'loading__stage', id: `loadingStage-${i}` }, [
      el('span', { class: 'loading__stageMark' }),
      el('span', { class: 'loading__stageLabel', text: label }),
    ]));
  });
}

// 前回の状態（チェック済み・進捗バー）をリセットしてから再度使えるようにする
function resetLoadingHost() {
  $('#loadingFill').style.width = '0%';
  LOADING_STAGES.forEach((_, i) => {
    const node = $(`#loadingStage-${i}`);
    node.classList.remove('loading__stage--active', 'loading__stage--done');
    node.querySelector('.loading__stageMark').textContent = '';
  });
}

// 段階的に文言を進め、各段完了でチェック表示＋進捗バーを更新する。約5秒かけて解決する。
function runLoadingSequence() {
  const fill = $('#loadingFill');
  const total = LOADING_STAGES.length;
  return new Promise((resolve) => {
    function step(i) {
      const node = $(`#loadingStage-${i}`);
      node.classList.add('loading__stage--active');
      fill.style.width = `${Math.round(((i + 1) / total) * 100)}%`;
      setTimeout(() => {
        node.classList.remove('loading__stage--active');
        node.classList.add('loading__stage--done');
        node.querySelector('.loading__stageMark').textContent = '✓';
        if (i + 1 < total) step(i + 1);
        else setTimeout(resolve, 200);
      }, LOADING_STAGE_MS);
    }
    step(0);
  });
}

function formatBirthLabel(y, m, d) {
  return `${y}年${m}月${d}日生まれ`;
}

let isRendering = false;

async function renderResult(y, m, d) {
  if (isRendering) return;
  isRendering = true;
  try {
    const birthDate = new Date(y, m - 1, d);
    const now = new Date();
    const profile = buildFortuneProfile(birthDate);

    const resultSection = $('#result');
    const resultBody = $('#resultBody');
    $('#intro').hidden = true;
    resultSection.hidden = false;
    resultBody.hidden = true;
    resetLoadingHost();
    $('#loadingHost').hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // ローディング演出（約5秒）と、裏側での組み立て（4つを重ねて読む3ブロックの読み込み含む）を並行して進める
    const [, pairBlocks] = await Promise.all([
      runLoadingSequence(),
      SHOW_PAIR_BLOCKS ? buildIntegratedBlocks(profile) : Promise.resolve(null),
    ]);

    ctx = { targets: {}, sections: [], updateToc: null };

    // ① 4つの運勢
    const userAttrs = {
      nine_star: { label: '本命星', value: profile.nineStar.honmeiStarName, sub: `月命星：${profile.nineStar.tsukiStarName}`, subNote: TSUKI_STAR_NOTE },
      numerology: { label: '数秘術の数', value: String(profile.numerology.lifePath), sub: profile.numerology.ismaster ? 'マスターナンバー' : undefined },
      astrology: { label: '太陽星座', value: profile.astrology.sunSign, sub: `月星座：${profile.astrology.moonSign}` },
      four_pillars: { label: '命式', value: profile.fourPillars.day.combined, sub: `五行：${profile.fourPillars.year.stem}` },
    };
    const baseById = {};
    const chaptersHost = $('#chaptersHost');
    chaptersHost.innerHTML = '';
    const chapterEls = TENMEI_CHAPTERS.map((ch) => {
      const sec = el('section', { class: 'chapter' });
      sec.appendChild(el('div', { class: 'chapter__head' }, [
        el('div', { class: 'chapter__no', text: ch.no }),
        el('h2', { class: 'chapter__title', text: ch.title }),
        el('p', { class: 'chapter__desc', text: ch.desc }),
      ]));
      chaptersHost.appendChild(sec);
      return sec;
    });
    const addSection = (chapter, label, jump, node) => ctx.sections.push({ chapter, label, jump, el: node });

    for (const fortune of FORTUNE_DATA) {
      const extras = buildFortuneExtras(profile, fortune.id);
      const reading = READING_LOOKUP[fortune.id] ? READING_LOOKUP[fortune.id](profile) : null;
      baseById[fortune.id] = reading;
      const key = `div:${fortune.id}`;
      const card = buildCard(fortune, userAttrs[fortune.id], extras, reading, key);
      ctx.targets[key] = card;
      chapterEls[0].appendChild(card.el);
      addSection(0, fortune.name, key, card.el);
    }
    chapterEls[0].appendChild(ctaBox('ここまでが、無料で読める4つの運勢です。4つを重ねて読む総合占いの続きは、アプリで読めます。'));

    // ② 今後の運勢
    const subWrap = (label) => {
      const w = el('div', { class: 'sub' });
      w.appendChild(el('h3', { class: 'sub__h' }, [el('span', { class: 'bar' }), label]));
      chapterEls[1].appendChild(w);
      return w;
    };
    const futureBuilders = [
      ['monthly', '月ごとの運勢', () => buildMonthly(profile, birthDate, now)],
      ['decade', '10年ごとの運勢', () => buildDecade(birthDate, now)],
      ['jushin', '神獣', () => buildJushin(birthDate, now)],
    ];
    for (const [k, label, build] of futureBuilders) {
      const w = subWrap(label);
      const part = build();
      w.appendChild(part.el);
      ctx.targets[`sub:${k}`] = { el: w, open: part.open };
      addSection(1, label, `sub:${k}`, w);
    }
    const futurePaid = 1 + 1 + JUSHIN_PAID_ITEMS.length;
    chapterEls[1].appendChild(ctaBox(`ほかの月・ほかの時期・神獣の詳しい読み物（有料${futurePaid}項目）は、アプリで天命の鑑定を解放すると読めます。`));

    // ③ 総合占い
    const freeSecs = buildFreeSecs(getCompositeFreeReading(profile.nineStar.honmeiStarName));
    for (const cat of COMPOSITE_CATEGORIES) {
      const part = buildCategory(cat, freeSecs, ctx);
      chapterEls[2].appendChild(part.el);
      ctx.targets[`cat:${cat.key}`] = { el: part.el, open: part.open };
      addSection(2, cat.label, `cat:${cat.key}`, part.el);
    }
    chapterEls[2].appendChild(ctaBox(`有料${PAID_COMPOSITE_ITEM_COUNT}項目（人生の目的・金運・結婚運など）は、アプリで天命の鑑定を解放すると読めます。`));

    // 天命まとめ・目次
    const sumHost = $('#summaryHost');
    sumHost.innerHTML = '';
    const panel = buildSummaryPanel(baseById, freeSecs);
    if (panel) sumHost.appendChild(panel);
    const dgHost = $('#diagramHost');
    dgHost.innerHTML = '';
    dgHost.appendChild(buildDiagramPanel());

    // おまけ（Webだけの内容）
    const extraHost = $('#extraHost');
    extraHost.innerHTML = '';
    const extra = el('section', { class: 'extra' });
    extra.appendChild(el('div', { class: 'extra__tag', text: 'おまけ（Web版だけの内容）' }));
    extra.appendChild(buildDirectionSection(calcYearDirections(birthDate)));
    extra.appendChild(el('h3', { class: 'sub__h' }, [el('span', { class: 'bar' }), '4つを重ねて読む']));
    if (pairBlocks) {
      extra.appendChild(pairBlocks);
    } else {
      // 未公開の予告（中身は出さない。準備ができたら SHOW_PAIR_BLOCKS を true にして解放）
      const soon = el('div', { class: 'paidRow paidRow--soon' });
      soon.appendChild(el('div', { class: 'paidRow__top' }, [
        el('span', { class: 'paidRow__name', text: '4つの占いの重なり' }),
        el('span', { class: 'badge badge--soon', text: '近日公開' }),
      ]));
      soon.appendChild(el('p', { class: 'paidRow__hint', text: '九星気学・数秘術・西洋占星術・四柱推命をふたつずつ重ねると、ひとつだけでは見えない一面が浮かびます。準備ができしだい、ここで読めるようになります。' }));
      extra.appendChild(soon);
    }
    extraHost.appendChild(extra);

    // ページ末尾のまとめ CTA
    const endHost = $('#endCtaHost');
    endHost.innerHTML = '';
    const cta = el('div', { class: 'cta cta--end' }, [
      el('p', { class: 'cta__title', text: '続きはアプリで' }),
      el('p', { class: 'cta__lead', text: `有料の${paidItemCount()}項目（今後の運勢${futurePaid}・総合占い${PAID_COMPOSITE_ITEM_COUNT}）は、パワースポットマップで天命の鑑定を解放すると読めます。無料の範囲は、アプリでもここまでと同じです。` }),
      appButton('パワースポットマップを見る'),
    ]);
    endHost.appendChild(cta);

    $('#resultHeading').textContent = `${profile.nineStar.honmeiStarName}の あなたの天命`;
    $('#resultBirth').textContent = formatBirthLabel(y, m, d);

    $('#loadingHost').hidden = true;
    resultBody.hidden = false;
    setupTocBar();
    bindScroll();
  } finally {
    isRendering = false;
  }
}

function populateDateSelects() {
  const yearSel = $('#birthYear');
  const monthSel = $('#birthMonth');
  const daySel = $('#birthDay');

  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 1920; y--) {
    yearSel.appendChild(el('option', { value: String(y), text: `${y}年` }));
  }
  for (let m = 1; m <= 12; m++) {
    monthSel.appendChild(el('option', { value: String(m), text: `${m}月` }));
  }
  function refreshDays() {
    const y = Number(yearSel.value) || thisYear;
    const m = Number(monthSel.value) || 1;
    const daysInMonth = new Date(y, m, 0).getDate();
    const current = daySel.value;
    daySel.innerHTML = '';
    for (let d = 1; d <= daysInMonth; d++) {
      daySel.appendChild(el('option', { value: String(d), text: `${d}日` }));
    }
    if (current && Number(current) <= daysInMonth) daySel.value = current;
  }
  yearSel.addEventListener('change', refreshDays);
  monthSel.addEventListener('change', refreshDays);
  refreshDays();

  // デフォルトはキリのいい日付（未選択のまま分かりやすく）
  yearSel.value = String(thisYear - 25);
  monthSel.value = '1';
  refreshDays();
  daySel.value = '1';
}

function setupShare() {
  const text = 'パワースポットマップの天命占いをやってみた';
  const url = SITE_URL;
  const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  $('#shareBtn').setAttribute('href', intent);
}

function init() {
  populateDateSelects();
  setupShare();
  populateLoadingHost();

  $('#birthForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const y = Number($('#birthYear').value);
    const m = Number($('#birthMonth').value);
    const d = Number($('#birthDay').value);
    if (!y || !m || !d) return;
    renderResult(y, m, d);
  });

  $('#resetBtn').addEventListener('click', () => {
    $('#result').hidden = true;
    $('#intro').hidden = false;
    ctx = null;
    $('#intro').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

document.addEventListener('DOMContentLoaded', init);

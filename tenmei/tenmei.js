// 天命診断サイト — 画面制御（生年月日はこの端末内だけで扱い、どこにも送信しない）
import { buildFortuneProfile, buildFortuneExtras, calcYearDirections, DIR_ORDER, DIR_META } from './fortune-core.mjs';
import { getNineStarReading } from './readings/nine-star.mjs';
import { getNumerologyReading } from './readings/numerology.mjs';
import { getAstrologyReading } from './readings/astrology.mjs';
import { getFourPillarsReading } from './readings/four-pillars.mjs';
import { getYearlyReading } from './readings/yearly-2026.mjs';
import { getStarSignOverlap, getNumStemOverlap, getSignStemOverlap } from './readings/composite-pairs.mjs';

// 占術ID → その占術の鑑定データを引くための関数（profile全体を受け取る）
const READING_LOOKUP = {
  nine_star:    (profile) => getNineStarReading(profile.nineStar.honmeiStarName),
  numerology:   (profile) => getNumerologyReading(profile.numerology.lifePath),
  astrology:    (profile) => getAstrologyReading(profile.astrology.sunSign),
  four_pillars: (profile) => getFourPillarsReading(profile.fourPillars.day.stem),
};

const APP_STORE_URL = 'https://apps.apple.com/jp/app/id6791989590';
const SITE_URL = 'https://drqururi.github.io/tenmei/';

const FORTUNE_DATA = [
  {
    id: 'nine_star',
    icon: '☯',
    name: '九星気学',
    sub: '東洋占術 ／ 命占 ／ 9つの星に分類',
    attrLabel: '本命星',
    explain: [
      { h: 'どんな占術？', t: '古代中国から伝わる東洋の命占術です。天地のエネルギーを9つの星に分類し、生まれた年・月・日の星の配置からその人の本質・才能・運命を読み解きます。' },
      { h: '日常でどう取り入れる？', t: '最も実践的なのは「方位」の活用です。吉方位に向かって外出したり、引越しや旅行の方向を吉方位に合わせると運のエネルギーが高まるといわれています。' },
    ],
  },
  {
    id: 'numerology',
    icon: '∞',
    name: '数秘術',
    sub: '西洋占術 ／ 命占 ／ 1〜9・11・22・33の12分類',
    attrLabel: '数秘術の数',
    explain: [
      { h: 'どんな占術？', t: '古代ギリシャのピタゴラスが体系化したとされる西洋の占術です。生年月日の数字を一桁になるまで足し合わせて、その人の核となる数を導き出します。' },
      { h: '日常でどう取り入れる？', t: 'パーソナルイヤーナンバーを計算することで今年のテーマがわかります。今が何の年かを把握して、行動の指針にしてみてください。' },
    ],
  },
  {
    id: 'astrology',
    icon: '★',
    name: '西洋占星術',
    sub: '西洋占術 ／ 命占 ／ 12星座×10天体×12ハウス',
    attrLabel: '太陽星座',
    explain: [
      { h: 'どんな占術？', t: '約2000年以上の歴史を持つ西洋の命占術です。生まれた瞬間の天体の配置をホロスコープに記録し、その配置パターンから性格・才能・人生の流れを読み解きます。' },
      { h: '日常でどう取り入れる？', t: '「月のサイクル」の活用が最もすぐに使えます。新月は始める日、満月は手放す日として意識すると、日常のリズムが整いやすくなります。' },
    ],
  },
  {
    id: 'four_pillars',
    icon: '龍',
    name: '四柱推命',
    sub: '東洋占術 ／ 命占 ／ 干支×五行×大運',
    attrLabel: '命式（日柱）',
    explain: [
      { h: 'どんな占術？', t: '中国4000年の歴史を持つ東洋最高峰の命占術です。生まれた年・月・日・時の柱から命式という運命の地図を作ります。' },
      { h: '日常でどう取り入れる？', t: '「命式はそのままの自分を示している」ということを大切にしてください。良い・悪い命式は存在せず、すべての命式に固有の強みがあります。' },
    ],
  },
];

// 2026-10-16: アプリの購入モーダルと同一の文言に更新。総合性格・天職・人生の転機・
// 恋愛の癖と傾向は無料公開になったため外し、新規追加した有料項目を含めた16項目から抜粋。
const COMPOSITE_ITEMS = [
  '生まれてから死ぬまでの運気の流れ',
  '結婚運・結婚の時期',
  '要注意の時期・転機',
  '運命の人と出会う場所',
  '家族運・人間関係のアドバイス',
  '隠れた才能・前世・魂のルーツ',
  '開運アクション（ラッキーカラー・数字・方位）',
];

// 2026-10-16: 無料プレビュー4項目（総合性格・天職・人生の転機・恋愛の癖と傾向）は、
// 統合鑑定区画（九星×星座／数秘×日干／星座×日干）と内容が重なるため画面表示から外した
// （composite-free.mjs とそのデータは温存。将来また使う可能性があるため削除しない）。

// 「約6割有料」の文言（アプリ側 lib/claude.ts の宣言済み目標文字数と揃える。実測値ではないため「約」を付ける）
const PAID_RATIO_TEXT = '有料の鑑定：約6割（約4,560字・16項目）';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

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

function buildReadingSection(reading) {
  if (!reading) return null;
  const wrap = el('div', { class: 'card__reading' });
  const items = [
    { label: '本質・性格', text: reading.essence },
    { label: '相性のいいタイプ', text: reading.compatibility },
    { label: '人生の運気の流れ', text: reading.life_flow },
  ];
  items.forEach((item, i) => {
    const sec = el('div', { class: i === 0 ? 'card__readingSec' : 'card__readingSec card__readingSec--sep' });
    sec.appendChild(el('div', { class: 'card__sectionLabel' }, [el('span', { class: 'bar' }), item.label]));
    sec.appendChild(el('p', { class: 'card__readingText', text: item.text }));
    wrap.appendChild(sec);
  });
  return wrap;
}

function buildCard(fortune, userAttr, extras, reading) {
  const card = el('div', { class: 'card' });

  const head = el('div', { class: 'card__head' }, [
    el('div', { class: 'card__title' }, [
      el('span', { class: 'card__dot' }),
      el('span', { class: 'card__name', text: fortune.name }),
    ]),
    el('button', { class: 'card__explainBtn', type: 'button', text: `${fortune.name}とは？` }),
  ]);

  const attrBox = el('div', { class: 'card__attr' }, [
    el('div', { class: 'card__attrLabel', text: userAttr.label }),
    el('div', { class: 'card__attrValue', text: userAttr.value }),
    userAttr.sub ? el('div', { class: 'card__attrSub', text: userAttr.sub }) : null,
  ]);
  card.appendChild(head);
  card.appendChild(attrBox);

  if (extras.keywords.length > 0) {
    card.appendChild(el('div', { class: 'card__sectionLabel' }, [el('span', { class: 'bar' }), 'あなたの強み']));
    card.appendChild(tagRow(extras.keywords, 'keyword'));
  }

  if (extras.compat.good.length > 0) {
    card.appendChild(el('div', { class: 'card__sectionLabel' }, [el('span', { class: 'bar' }), extras.compat.label]));
    const goodRow = el('div', { class: 'compatRow' }, [
      el('span', { class: 'compatMark compatMark--good', text: '◎' }),
      tagRow(extras.compat.good, 'good'),
    ]);
    card.appendChild(goodRow);
    if (extras.compat.challenge && extras.compat.challenge.length > 0) {
      const chRow = el('div', { class: 'compatRow' }, [
        el('span', { class: 'compatMark compatMark--challenge', text: '△' }),
        tagRow(extras.compat.challenge, 'challenge'),
      ]);
      card.appendChild(chRow);
    }
  }

  if (extras.elementBalance && extras.elementBalance.length > 0) {
    card.appendChild(el('div', { class: 'card__sectionLabel' }, [el('span', { class: 'bar' }), '命式の五行バランス']));
    const maxC = Math.max(...extras.elementBalance.map((e) => e.count), 1);
    const balanceBox = el('div', { class: 'balance' });
    for (const { element, color, count } of extras.elementBalance) {
      const pct = Math.round((count / maxC) * 100);
      balanceBox.appendChild(el('div', { class: 'balance__row' }, [
        el('span', { class: 'balance__el', style: `color:${color}`, text: element }),
        el('div', { class: 'balance__track' }, [
          el('div', { class: 'balance__fill', style: `width:${pct}%;background:${color}` }),
        ]),
        el('span', { class: 'balance__count', text: count > 0 ? String(count) : '—' }),
      ]));
    }
    card.appendChild(balanceBox);
  }

  // 本質・性格 / 相性のいいタイプ / 人生の運気の流れ（アプリの基本鑑定カードと同じ見出し・並び）
  const readingBox = buildReadingSection(reading);
  if (readingBox) card.appendChild(readingBox);

  // 占術の解説（アプリの「〇〇とは？」モーダルと同じ静的テキスト）
  const explainBox = el('div', { class: 'card__explain', hidden: '' });
  for (const sec of fortune.explain) {
    explainBox.appendChild(el('div', { class: 'explainSec' }, [
      el('div', { class: 'explainSec__h' }, [el('span', { class: 'bar' }), sec.h]),
      el('p', { class: 'explainSec__t', text: sec.t }),
    ]));
  }
  card.appendChild(explainBox);
  head.querySelector('.card__explainBtn').addEventListener('click', () => {
    explainBox.hidden = !explainBox.hidden;
  });

  return card;
}

// ─── 区画1: 4つの占術 それぞれの単独結果（タブ切り替え） ─────────────
// 博士指示（2026-10-16）：ここは「占術ごとの単独の結果」であり統合結果ではないことを
// 一目でわかるようにする。見出し・背景・枠を区画2（統合鑑定）と明確に区別する（CSS側で対応）。
function buildSoloSection(cardsById) {
  const section = el('section', { class: 'soloSection' });
  section.appendChild(el('div', { class: 'soloSection__head' }, [
    el('h2', { class: 'soloSection__title', text: '4つの占術 それぞれの結果' }),
    el('p', { class: 'soloSection__lead', text: 'まずは占術ごとに、単独で読み解いた結果です' }),
    el('p', { class: 'soloSection__note', text: '※ まだ4つを重ね合わせていません。統合した結果は下にあります。' }),
  ]));
  section.appendChild(buildFortuneTabs(cardsById));
  return section;
}

// タブ本体（タイトル＋ボタンで切り替え。縦列挙はしない） ─────────────
// role="tab"/"tabpanel" + 矢印キー/Home/Endでのキーボード操作に対応（WAI-ARIA tabsパターン）。
function buildFortuneTabs(cardsById) {
  const wrap = el('div', { class: 'tabsWrap' });
  wrap.appendChild(el('div', { class: 'tabsWrap__heading' }, [el('span', { class: 'bar' }), '4つの占術']));

  const tablist = el('div', { class: 'tabsWrap__tablist', role: 'tablist', 'aria-label': '占術を選択' });
  const panelHost = el('div', { class: 'tabsWrap__panel' });
  const buttons = [];

  function selectTab(idx, moveFocus) {
    FORTUNE_DATA.forEach((fortune, i) => {
      const active = i === idx;
      buttons[i].setAttribute('aria-selected', active ? 'true' : 'false');
      buttons[i].tabIndex = active ? 0 : -1;
      buttons[i].classList.toggle('tabBtn--active', active);
    });
    const fortune = FORTUNE_DATA[idx];
    panelHost.innerHTML = '';
    const panel = el('div', {
      id: `panel-${fortune.id}`,
      role: 'tabpanel',
      'aria-labelledby': `tab-${fortune.id}`,
      tabindex: '0',
    });
    panel.appendChild(cardsById[fortune.id]);
    panelHost.appendChild(panel);
    if (moveFocus) buttons[idx].focus();
  }

  FORTUNE_DATA.forEach((fortune, i) => {
    const btn = el('button', {
      type: 'button',
      class: 'tabBtn',
      role: 'tab',
      id: `tab-${fortune.id}`,
      'aria-controls': `panel-${fortune.id}`,
      'aria-selected': i === 0 ? 'true' : 'false',
      tabindex: i === 0 ? '0' : '-1',
      onclick: () => selectTab(i, false),
      onkeydown: (e) => {
        const last = FORTUNE_DATA.length - 1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); selectTab(i === last ? 0 : i + 1, true); }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); selectTab(i === 0 ? last : i - 1, true); }
        else if (e.key === 'Home') { e.preventDefault(); selectTab(0, true); }
        else if (e.key === 'End') { e.preventDefault(); selectTab(last, true); }
      },
    }, [
      el('span', { class: 'tabBtn__icon', text: fortune.icon }),
      el('span', { class: 'tabBtn__name', text: fortune.name }),
    ]);
    buttons.push(btn);
    tablist.appendChild(btn);
  });

  selectTab(0, false);

  wrap.appendChild(tablist);
  wrap.appendChild(panelHost);
  return wrap;
}

// ─── 区画2: 4つを統合した、あなたの天命 ──────────────────────────
// 博士指示（2026-10-16）：「2つずつ組み合わせた」とは書かず、
// 「4つの命術を重ね合わせて多角的に読み解いた」という見せ方にする。
// 実データ（九星×星座／数秘×日干／星座×日干）は src/readings/pairs/ の6ファイル
// （別担当が作成中）。キーが見つからない間はそのブロックを出さずエラーにしない。

const INTEGRATED_BLOCK_SPECS = [
  { title: '本質の重なり', fetch: (p) => getStarSignOverlap(p.nineStar.honmeiStarName, p.astrology.sunSign) },
  { title: '才能と使命', fetch: (p) => getNumStemOverlap(p.numerology.lifePath, p.fourPillars.day.stem) },
  { title: '人との関わり方', fetch: (p) => getSignStemOverlap(p.astrology.sunSign, p.fourPillars.day.stem) },
];

// 九星×星座／数秘×日干／星座×日干 の3ブロックを並べる。1件も無ければ null を返す
// （呼び出し側はその場合ブロック全体を省略し、アップセル部分だけ表示する）。
async function buildIntegratedBlocks(profile) {
  const results = await Promise.all(INTEGRATED_BLOCK_SPECS.map((spec) => spec.fetch(profile)));
  const wrap = el('div', { class: 'integrated__blocks' });
  INTEGRATED_BLOCK_SPECS.forEach((spec, i) => {
    const result = results[i];
    if (!result || !result.text) return;
    const block = el('div', { class: 'integratedBlock' });
    block.appendChild(el('div', { class: 'integratedBlock__title' }, [el('span', { class: 'bar' }), spec.title]));
    block.appendChild(el('div', { class: 'integratedBlock__pair', text: result.label }));
    block.appendChild(el('p', { class: 'integratedBlock__text', text: result.text }));
    wrap.appendChild(block);
  });
  return wrap.childElementCount > 0 ? wrap : null;
}

// 残り16項目のアップセル（アプリ誘導）。統合鑑定区画の中、3ブロックの下に置く。
function buildIntegratedUpsell() {
  const body = el('div', { class: 'composite__body' });
  body.appendChild(el('div', { class: 'composite__lockTitle', text: '残り16項目の鑑定を解放する' }));
  body.appendChild(el('div', {
    class: 'composite__lockDesc',
    text: '相性・運気の流れ・結婚運・金運・前世まで、4占術を統合した鑑定の続きはアプリで見られます',
  }));
  body.appendChild(el('div', { class: 'ratioRow' }, [
    el('span', { class: 'ratioBadge ratioBadge--paid', text: PAID_RATIO_TEXT }),
  ]));
  const list = el('div', { class: 'composite__list' });
  for (const item of COMPOSITE_ITEMS) {
    list.appendChild(el('div', { class: 'composite__item' }, [el('span', { class: 'composite__dot' }), item]));
  }
  body.appendChild(list);
  body.appendChild(el('a', {
    class: 'btn btn--gold',
    href: APP_STORE_URL,
    target: '_blank',
    rel: 'noopener',
    text: 'アプリで鑑定を解放する',
  }));
  return body;
}

async function buildIntegratedSection(profile) {
  const section = el('section', { class: 'integratedSection', id: 'integratedSection' });
  section.appendChild(el('div', { class: 'integratedSection__head' }, [
    el('h2', { class: 'integratedSection__title', text: '4つを統合した、あなたの天命' }),
    el('p', {
      class: 'integratedSection__lead',
      text: '九星気学・数秘術・西洋占星術・四柱推命の結果を重ね合わせ、多角的に読み解きました',
    }),
  ]));
  const blocks = await buildIntegratedBlocks(profile);
  if (blocks) section.appendChild(blocks);
  section.appendChild(buildIntegratedUpsell());
  return section;
}

// ─── 今年の吉方位（九星気学・年盤）── 線のコンパスSVG ──────────────
const SVG_NS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

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

function buildYearlySection(honmeiStar, kigakuYear) {
  const reading = getYearlyReading(honmeiStar, kigakuYear);
  if (!reading) return null;
  const box = el('div', { class: 'yearly' });
  box.appendChild(el('div', { class: 'yearly__label' }, [el('span', { class: 'bar' }), `${kigakuYear}年のあなたの運勢`]));
  box.appendChild(el('p', { class: 'yearly__text', text: reading.overview }));

  const grid = el('div', { class: 'yearly__grid' });
  const items = [['仕事', reading.work], ['お金', reading.money], ['恋愛', reading.love], ['健康', reading.health]];
  for (const [label, text] of items) {
    grid.appendChild(el('div', { class: 'yearly__item' }, [
      el('div', { class: 'yearly__itemLabel', text: label }),
      el('div', { class: 'yearly__itemText', text }),
    ]));
  }
  box.appendChild(grid);
  return box;
}

function buildDirectionSection(yearDirections) {
  const box = el('div', { class: 'direction' });
  box.appendChild(el('div', { class: 'direction__label' }, [el('span', { class: 'bar bar--green' }), `${yearDirections.kigakuYear}年のあなたの吉方位`]));
  box.appendChild(el('div', { class: 'direction__note', text: '九星気学の年盤（立春で切り替わる年の方位盤）にもとづく、今年1年の吉方位です。' }));

  const dirsByKind = {};
  for (const d of DIR_ORDER) dirsByKind[d] = yearDirections.dirs[d].kind;

  const compassWrap = el('div', { class: 'direction__compass' });
  compassWrap.appendChild(buildCompassSvg(dirsByKind));
  box.appendChild(compassWrap);

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

  box.appendChild(el('p', { class: 'direction__appHint', text: '今月・今日の吉方位、詳しい性格診断はアプリで。' }));
  box.appendChild(el('a', {
    class: 'btn btn--ghost-gold',
    href: APP_STORE_URL,
    target: '_blank',
    rel: 'noopener',
    text: '今月・今日の吉方位をアプリで見る',
  }));

  return box;
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
  // 連打での二重実行を防ぐ（すでに診断中なら無視する）
  if (isRendering) return;
  isRendering = true;

  try {
    const birthDate = new Date(y, m - 1, d);
    const profile = buildFortuneProfile(birthDate);

    const resultSection = $('#result');
    const resultBody = $('#resultBody');

    // 結果の代わりにローディング演出を先に表示する（共有URL等どの経路から呼ばれても同じ）
    $('#intro').hidden = true;
    resultSection.hidden = false;
    resultBody.hidden = true;
    resetLoadingHost();
    $('#loadingHost').hidden = false;
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // ローディング演出（約5秒）と、裏側でのデータ組み立て（統合鑑定のpairs読み込み含む）を並行して進める
    const [, integratedSection] = await Promise.all([
      runLoadingSequence(),
      buildIntegratedSection(profile),
    ]);

    const userAttrs = {
      nine_star: { label: '本命星', value: profile.nineStar.honmeiStarName, sub: `月命星：${profile.nineStar.tsukiStarName}` },
      numerology: { label: '数秘術の数', value: String(profile.numerology.lifePath), sub: profile.numerology.ismaster ? 'マスターナンバー' : undefined },
      astrology: { label: '太陽星座', value: profile.astrology.sunSign, sub: `月星座：${profile.astrology.moonSign}` },
      four_pillars: { label: '命式', value: profile.fourPillars.day.combined, sub: `五行：${profile.fourPillars.year.stem}` },
    };

    const soloHost = $('#soloHost');
    soloHost.innerHTML = '';
    const cardsById = {};
    for (const fortune of FORTUNE_DATA) {
      const extras = buildFortuneExtras(profile, fortune.id);
      const reading = READING_LOOKUP[fortune.id] ? READING_LOOKUP[fortune.id](profile) : null;
      cardsById[fortune.id] = buildCard(fortune, userAttrs[fortune.id], extras, reading);
    }
    soloHost.appendChild(buildSoloSection(cardsById));

    const integratedHost = $('#integratedHost');
    integratedHost.innerHTML = '';
    integratedHost.appendChild(integratedSection);

    const directionHost = $('#directionHost');
    directionHost.innerHTML = '';
    const yearDirections = calcYearDirections(birthDate);
    const yearlyBox = buildYearlySection(yearDirections.honmeiStar, yearDirections.kigakuYear);
    if (yearlyBox) directionHost.appendChild(yearlyBox);
    directionHost.appendChild(buildDirectionSection(yearDirections));

    $('#resultHeading').textContent = `${profile.nineStar.honmeiStarName}の あなたの天命`;
    $('#resultBirth').textContent = formatBirthLabel(y, m, d);

    $('#loadingHost').hidden = true;
    resultBody.hidden = false;
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
    $('#intro').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

document.addEventListener('DOMContentLoaded', init);

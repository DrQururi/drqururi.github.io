// 天命診断サイト — 画面制御（生年月日はこの端末内だけで扱い、どこにも送信しない）
import { buildFortuneProfile, buildFortuneExtras, calcYearDirections, DIR_ORDER, DIR_META } from './fortune-core.mjs';
import { getNineStarReading } from './readings/nine-star.mjs';
import { getNumerologyReading } from './readings/numerology.mjs';
import { getAstrologyReading } from './readings/astrology.mjs';
import { getFourPillarsReading } from './readings/four-pillars.mjs';
import { getYearlyReading } from './readings/yearly-2026.mjs';

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

// アプリの購入モーダルと同一の文言（天命の複合鑑定でアンロックされる項目）
const COMPOSITE_ITEMS = [
  '総合的な性格・好き嫌い',
  '相性のいい人の特徴・誕生月',
  '運命の人と出会う場所',
  '運気を上げる・下げる行動',
  '天職・仕事との向き合い方',
  '生まれてから死ぬまでの運気の流れ',
  '隠れた才能・前世・魂のルーツ',
];

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

function buildCompositeTeaser() {
  const box = el('div', { class: 'composite' });
  box.appendChild(el('div', { class: 'composite__banner' }, [
    el('div', { class: 'composite__stars', text: '✦ ✦ ✦' }),
    el('div', { class: 'composite__title', text: 'これらの占術を統合した' }),
    el('div', { class: 'composite__titleGold', text: 'あなただけの総合占い' }),
    el('div', { class: 'composite__sub', text: '4つの占術が語る、あなたの本当の姿' }),
  ]));

  const body = el('div', { class: 'composite__body' });
  const lockTitle = el('div', { class: 'composite__lockTitle', text: '天命の複合鑑定を解放する' });
  const lockDesc = el('div', { class: 'composite__lockDesc', text: '総合的な性格・相性・運気の流れ・天職・前世まで、4占術を統合した鑑定はアプリで見られます' });
  const list = el('div', { class: 'composite__list' });
  for (const item of COMPOSITE_ITEMS) {
    list.appendChild(el('div', { class: 'composite__item' }, [el('span', { class: 'composite__dot' }), item]));
  }
  const cta = el('a', {
    class: 'btn btn--gold',
    href: APP_STORE_URL,
    target: '_blank',
    rel: 'noopener',
    text: 'アプリで鑑定を解放する',
  });

  body.appendChild(lockTitle);
  body.appendChild(lockDesc);
  body.appendChild(list);
  body.appendChild(cta);
  box.appendChild(body);
  return box;
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

function formatBirthLabel(y, m, d) {
  return `${y}年${m}月${d}日生まれ`;
}

function renderResult(y, m, d) {
  const birthDate = new Date(y, m - 1, d);
  const profile = buildFortuneProfile(birthDate);

  const userAttrs = {
    nine_star: { label: '本命星', value: profile.nineStar.honmeiStarName, sub: `月命星：${profile.nineStar.tsukiStarName}` },
    numerology: { label: '数秘術の数', value: String(profile.numerology.lifePath), sub: profile.numerology.ismaster ? 'マスターナンバー' : undefined },
    astrology: { label: '太陽星座', value: profile.astrology.sunSign, sub: `月星座：${profile.astrology.moonSign}` },
    four_pillars: { label: '命式', value: profile.fourPillars.day.combined, sub: `五行：${profile.fourPillars.year.stem}` },
  };

  const resultSection = $('#result');
  const deck = $('#cardDeck');
  deck.innerHTML = '';
  for (const fortune of FORTUNE_DATA) {
    const extras = buildFortuneExtras(profile, fortune.id);
    const reading = READING_LOOKUP[fortune.id] ? READING_LOOKUP[fortune.id](profile) : null;
    deck.appendChild(buildCard(fortune, userAttrs[fortune.id], extras, reading));
  }

  const directionHost = $('#directionHost');
  directionHost.innerHTML = '';
  const yearDirections = calcYearDirections(birthDate);
  const yearlyBox = buildYearlySection(yearDirections.honmeiStar, yearDirections.kigakuYear);
  if (yearlyBox) directionHost.appendChild(yearlyBox);
  directionHost.appendChild(buildDirectionSection(yearDirections));

  const teaserHost = $('#compositeHost');
  teaserHost.innerHTML = '';
  teaserHost.appendChild(buildCompositeTeaser());

  $('#resultHeading').textContent = `${profile.nineStar.honmeiStarName}の あなたの天命`;
  $('#resultBirth').textContent = formatBirthLabel(y, m, d);

  $('#intro').hidden = true;
  resultSection.hidden = false;
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

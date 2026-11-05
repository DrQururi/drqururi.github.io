// 天命の構成（3つの章・小見出し・無料／有料の項目）。アプリ lib/tenmei/structure.ts と同じ内容の移植。
// 無料／有料の線引きはアプリと完全に揃える（Webだけ無料にしない・Webだけ有料にしない）。
// 数は配列の長さから出す（手書きしない）。テスト（test/structure.mjs）でアプリの数と一致を検査する。

export const DIVINATIONS = [
  { id: 'nine_star', name: '九星気学' },
  { id: 'numerology', name: '数秘術' },
  { id: 'astrology', name: '西洋占星術' },
  { id: 'four_pillars', name: '四柱推命' },
];
export const DIVINATION_PARTS = '性格・相性・運気の流れ';

export const COMPOSITE_CATEGORIES = [
  { key: 'self', label: '自分を知る', color: '#c8b8ff',
    free: ['総合性格'],
    paid: ['人生の目的', '隠れた才能・前世・魂のルーツ'] },
  { key: 'timing', label: '運気・タイミング', color: '#f5d78e',
    free: ['人生の転機'],
    paid: ['生まれから死ぬまでの運気の流れ', '今年の運気の流れ', '要注意の時期', '今年のおすすめ行動', '引っ越し・移動の吉方位', '運気を上げる行動', '開運アクション'] },
  { key: 'relations', label: '人間関係', color: '#e8a0c0',
    free: ['恋愛の癖と傾向'],
    paid: ['恋愛・相性TOP3', '結婚運・結婚の時期', '出会いの場所', '人間関係・友人運', '家族運'] },
  { key: 'practical', label: '生活・実践', color: '#a0c8f5',
    free: ['天職'],
    paid: ['金運', '健康・体のリズム'] },
];

export const JUSHIN_PAID_ITEMS = ['季節×年目の過ごし方', '次の春はいつ来るか', '神獣の詳しい解説', '12年分の年表'];

// 有料項目の「この項目でわかること」（アプリの固定文をそのまま使う。断定・誇大な語は使わない）
export const PAID_ITEM_HINTS = {
  '人生の目的': '今世の使命と、人生で繰り返し向き合うテーマ',
  '隠れた才能・前世・魂のルーツ': 'まだ眠っている才能の開花のさせ方と、魂のルーツ（前世）の読み物',
  '生まれから死ぬまでの運気の流れ': '幼少期〜20代、30代、40〜50代、60代以降の4つの時期の流れ',
  '今年の運気の流れ': '今年を上旬・中旬・下旬に分けて読む、仕事・恋愛・金運の波',
  '要注意の時期': '今年〜来年で慎重に動きたい時期（月名つき）と、その対処法',
  '今年のおすすめ行動': '吉方位1〜2方角と、その方角での具体的な行動アドバイス',
  '引っ越し・移動の吉方位': '吉方位と今年の動き方、引っ越しに向く日TOP3',
  '運気を上げる行動': 'あなたの占術の属性に合った、運気を引き寄せる習慣5つ',
  '開運アクション': 'ラッキーカラー・ラッキーナンバー・ラッキー方位と、その理由',
  '恋愛・相性TOP3': '縁が深い人の特徴と、恋愛傾向・縁の結び方',
  '結婚運・結婚の時期': '結婚しやすい時期・年齢の傾向と、結婚相手に求めたい条件',
  '出会いの場所': '縁が動きやすい場所3つと、その理由',
  '人間関係・友人運': '相性のいい人・苦手な人の傾向と、付き合い方のコツ',
  '家族運': '親・きょうだい・自分がつくる家庭との縁の傾向と、距離を整えるコツ',
  '金運': 'お金との関係の流れと、貯め方・使い方の癖と注意点',
  '健康・体のリズム': '体のリズムと弱い部位の傾向、今年の注意月',
  '季節×年目の過ごし方': '今年の季節（春夏秋冬）と何年目かに合わせた、過ごし方の読み物',
  '次の春はいつ来るか': '次に春（種まきの時期）が始まる年と、何年後にあたるか',
  '神獣の詳しい解説': 'あなたの神獣の性質を、五行のイメージで詳しく読む解説',
  '12年分の年表': '12年周期の中で、各年がどの季節の何年目にあたるかの一覧',
};
// ②の「月」「10年」の有料行（アプリでは短い案内文）
export const FUTURE_PAID_NOTES = {
  monthly: '12か月分の詳しい運勢は、アプリで天命の鑑定を解放すると読めます',
  decade: '8期すべての詳しい文章は、アプリで天命の鑑定を解放すると読めます',
};

export const FUTURE_SUBS = [
  { key: 'monthly', label: '月ごとの運勢' },
  { key: 'decade', label: '10年ごとの運勢' },
  { key: 'jushin', label: '神獣' },
];

export const FREE_COMPOSITE_ITEM_COUNT = COMPOSITE_CATEGORIES.reduce((n, c) => n + c.free.length, 0);
export const PAID_COMPOSITE_ITEM_COUNT = COMPOSITE_CATEGORIES.reduce((n, c) => n + c.paid.length, 0);

export const TENMEI_CHAPTERS = [
  { key: 'divination', no: '①', title: '4つの運勢', desc: '生まれ持った性格を、4つの占術で',
    subs: DIVINATIONS.map((d) => ({ key: d.id, label: d.name })) },
  { key: 'future', no: '②', title: '今後の運勢', desc: '月ごと・10年ごと・神獣で見る、これからの流れ', subs: FUTURE_SUBS },
  { key: 'composite', no: '③', title: '総合占い',
    desc: `4つの運勢をまとめた${FREE_COMPOSITE_ITEM_COUNT + PAID_COMPOSITE_ITEM_COUNT}項目（無料${FREE_COMPOSITE_ITEM_COUNT}・有料${PAID_COMPOSITE_ITEM_COUNT}）`,
    subs: COMPOSITE_CATEGORIES.map((c) => ({ key: c.key, label: c.label })) },
];

export const FREE_ITEM_META = {
  '総合性格': { color: '#c8b8ff' },
  '天職': { color: '#a0c8f5' },
  '人生の転機': { color: '#f5d78e' },
  '恋愛の癖と傾向': { color: '#e8a0c0' },
};

export function buildFreeRangeSummary() {
  return `無料で読めるのは ①すべて・②今月・今の10年・今年の神獣・③のうち${FREE_COMPOSITE_ITEM_COUNT}項目`;
}

export function buildDiagram() {
  const [c1, c2, c3] = TENMEI_CHAPTERS;
  const futureItems = {
    monthly: [{ label: '今月', free: true }, { label: 'ほかの月（12か月分）', free: false }],
    decade: [{ label: '今の10年のテーマ', free: true }, { label: 'ほかの時期（8期分）', free: false }],
    jushin: [{ label: '神獣と今年の季節', free: true }, ...JUSHIN_PAID_ITEMS.map((l) => ({ label: l, free: false }))],
  };
  return [
    { chapter: c1, subs: c1.subs.map((s) => ({ key: s.key, label: s.label, note: DIVINATION_PARTS, items: [] })) },
    { chapter: c2, subs: c2.subs.map((s) => ({ key: s.key, label: s.label, items: futureItems[s.key] })) },
    { chapter: c3, subs: COMPOSITE_CATEGORIES.map((c) => ({
      key: c.key, label: c.label, color: c.color,
      items: [...c.free.map((l) => ({ label: l, free: true })), ...c.paid.map((l) => ({ label: l, free: false }))],
    })) },
  ];
}
export function subStatus(items) {
  const paid = items.filter((i) => !i.free).length;
  if (paid === 0) return 'free';
  return paid === items.length ? 'paid' : 'partial';
}
export const subStatusLabel = (st) => (st === 'free' ? '無料' : st === 'partial' ? '一部有料' : '有料');
export function paidItemCount() {
  return buildDiagram().reduce((n, ch) => n + ch.subs.reduce((m, s) => m + s.items.filter((i) => !i.free).length, 0), 0);
}
// Web版は金額を出さない（価格はApp Store側の表示が正）
export const buildPaidLine = () => `有料：${paidItemCount()}項目（アプリで購入すると読めます）`;

// スクロール位置 → いま居る区画（アプリ pickActiveIndex と同じ）
export function pickActiveIndex(ys, scrollY, offset, atEnd = false) {
  if (ys.length === 0) return 0;
  if (atEnd) return ys.length - 1;
  let active = 0;
  for (let i = 0; i < ys.length; i++) {
    const y = ys[i];
    if (y == null) continue;
    if (y - offset <= scrollY + 1) active = i;
  }
  return active;
}

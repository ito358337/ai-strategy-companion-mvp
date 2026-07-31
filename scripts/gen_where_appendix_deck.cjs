// WHERE × ゆずりえ 補足スライド A-1〜A-7（修正版）
const pptxgen = require('pptxgenjs');

const NAVY = '13224A', NAVY2 = '22345F', ICE = 'DCE6F7', AMBER = 'E9A63C';
const CARD = 'F3F6FB', TEXT = '1B2437', MUTED = '667089', WHITE = 'FFFFFF';
const RED = 'A33B32', GREEN = '2C7A4B';
const JP = 'Yu Gothic';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE';
const W = 13.333, M = 0.62, CW = W - M * 2;

function foot(s, code) {
  s.addText('補足資料｜WHERE × ゆずりえ 空き家管理収益モデル（叩き台）', { x: M, y: 7.02, w: 8, h: 0.3, fontSize: 9, color: MUTED, fontFace: JP, margin: 0 });
  s.addText(code, { x: W - M - 1.0, y: 7.0, w: 1.0, h: 0.3, fontSize: 11, bold: true, color: AMBER, align: 'right', fontFace: 'Calibri', margin: 0 });
}
function head(s, eyebrow, title, code, tag, tagColor) {
  s.addText(eyebrow, { x: M, y: 0.42, w: CW - 2.4, h: 0.26, fontSize: 10.5, bold: true, color: AMBER, charSpacing: 2, fontFace: 'Calibri', margin: 0 });
  s.addText(title, { x: M, y: 0.72, w: CW - 2.4, h: 0.6, fontSize: 23, bold: true, color: NAVY, fontFace: JP, margin: 0 });
  if (tag) {
    s.addShape(pres.ShapeType.roundRect, { x: W - M - 2.0, y: 0.5, w: 2.0, h: 0.38, rectRadius: 0.19, fill: { color: tagColor || NAVY } });
    s.addText(tag, { x: W - M - 2.0, y: 0.5, w: 2.0, h: 0.38, fontSize: 11, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
  }
  foot(s, code);
}
function card(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, { x, y, w, h, rectRadius: 0.08, fill: { color: fill || CARD }, line: { color: 'E3E9F4', width: 1 } });
}
function note(s, y, text, fill) {
  card(s, M, y, CW, 0.98, fill || 'FCF3E3');
  s.addText(text, { x: M + 0.36, y: y + 0.06, w: CW - 0.72, h: 0.86, fontSize: 11.5, color: TEXT, valign: 'middle', lineSpacing: 17, fontFace: JP, margin: 0 });
}

/* ---------- A-1 表紙 ---------- */
let s = pres.addSlide();
s.background = { color: NAVY };
s.addShape(pres.ShapeType.ellipse, { x: 10.2, y: -1.2, w: 4.6, h: 4.6, fill: { color: NAVY2 } });
s.addText('APPENDIX', { x: M, y: 0.9, w: 8, h: 0.34, fontSize: 13, bold: true, color: AMBER, charSpacing: 4, fontFace: 'Calibri', margin: 0 });
s.addText('実証判断のための詳細設計', { x: M, y: 1.3, w: 9, h: 0.8, fontSize: 34, bold: true, color: WHITE, fontFace: JP, margin: 0 });
s.addText('面談で深掘りを受けた項目のみ提示する補足資料', { x: M, y: 2.2, w: 9, h: 0.36, fontSize: 13, color: ICE, fontFace: JP, margin: 0 });
const idx = [
  ['A-2', 'プラン区別設計（案）', '既存企業向けプランとのカニバリゼーション防止'],
  ['A-3', '工務店収支モデル（P&L）', '管理単体ではなく転換込みで成立する構造'],
  ['A-4', 'ファネル3ケース試算', '初年度の価値は「管理在庫」と「買えないデータ」'],
  ['A-5', 'KPIと事前合意の判断基準', 'GO ／ 調整 ／ 再考 の明確な基準'],
  ['A-6', '収益スキームの法的整理', '工事紹介料と媒介報酬の分離、データ帰属'],
  ['A-7', '協議事項チェックリスト', '実証前に共同で決めるべき具体的項目'],
];
idx.forEach((r, i) => {
  const y = 2.9 + i * 0.6;
  s.addShape(pres.ShapeType.roundRect, { x: M, y, w: 0.86, h: 0.42, rectRadius: 0.08, fill: { color: AMBER } });
  s.addText(r[0], { x: M, y, w: 0.86, h: 0.42, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
  s.addText(r[1], { x: M + 1.06, y, w: 4.2, h: 0.42, fontSize: 13.5, bold: true, color: WHITE, valign: 'middle', fontFace: JP, margin: 0 });
  s.addText(r[2], { x: M + 5.4, y, w: 6.6, h: 0.42, fontSize: 11.5, color: ICE, valign: 'middle', fontFace: JP, margin: 0 });
});
s.addText('本資料の数値区分　［実績］確定した事実・公表値　／　［協議中］両社協議で決定する条件　／　［仮定・試算］実証で検証するシミュレーション', { x: M, y: 6.66, w: 12.1, h: 0.34, fontSize: 10.5, color: '8FA0C4', fontFace: JP, margin: 0 });

/* ---------- A-2 PLAN SEPARATION ---------- */
s = pres.addSlide();
head(s, 'PLAN SEPARATION', '既存プランと競合しない、別チャネルとしての区別設計（案）', 'A-2', '協議中', NAVY);
const rows2 = [
  ['対象', '不動産・建設等の法人（制限なし）', 'ゆずりえ認定工務店のみ\n（経営者面談・認定資格修了が必須条件）'],
  ['利用範囲', '全国・制限なし', '自社商圏の協定市区町村に限定（ドミナント運用）'],
  ['機能', 'フル機能', '機能限定版（探索・登記取得・台帳・巡回報告連携）'],
  ['ID数・サポート', '5 ID（追加可）／週次MTG・高タッチ運用', '2 IDまで／セルフサーブ＋ゆずりえ本部一次対応'],
  ['価格体系', '導入75万円 ＋ 月額30万円（税別）', '月額3.3万円程度 ＋ 成約時 工事金額の3〜5％\n＋ 登記・DM実費［協議中］'],
];
s.addTable(
  [[
    { text: '項目', options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 11.5 } },
    { text: '現行・企業向け標準プラン（直販）', options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 11.5 } },
    { text: '地域工務店ネットワークプラン（新設案）', options: { bold: true, color: WHITE, fill: { color: 'A8761C' }, fontSize: 11.5 } },
  ]].concat(rows2.map((r, i) => [
    { text: r[0], options: { bold: true, color: NAVY, fill: { color: CARD }, fontSize: 11 } },
    { text: r[1], options: { color: TEXT, fill: { color: WHITE }, fontSize: 11 } },
    { text: r[2], options: { color: TEXT, fill: { color: 'FDF8EF' }, fontSize: 11 } },
  ])),
  { x: M, y: 1.6, w: CW, colW: [1.9, 4.6, 5.59], rowH: [0.42, 0.7, 0.46, 0.46, 0.6, 0.7], border: { pt: 1, color: 'E3E9F4' }, fontFace: JP, valign: 'middle', margin: 0.08 }
);
note(s, 5.34, '【カニバリ防止制限】直近1年以内にWHERE社と商談・取引履歴がある企業は、新プランへの移行を禁止する制限ルールを合意設計する。「値下げ」ではなく「既存価格では届かない小規模工務店市場へのチャネル追加」である。');

/* ---------- A-3 PARTNER P&L ---------- */
s = pres.addSlide();
head(s, 'PARTNER P&L', '工務店の収支 — 管理単体ではなく、工事転換込みで成立する', 'A-3', '仮定・試算', 'A8761C');
s.addText('モデルケース：管理20棟・1年目（管理料 月8,000円／棟・100％工務店還元の仮定）', { x: M, y: 1.52, w: CW, h: 0.32, fontSize: 12, bold: true, color: MUTED, fontFace: JP, margin: 0 });
const pl = [
  ['管理料収入（8,000円 × 20棟 × 12か月）', '＋192.0万円', TEXT, false],
  ['巡回原価（移動・作業・報告 ≒ 2.4h × 3,000円/h × 20棟 × 12か月）', '▲174.0万円', TEXT, false],
  ['WHERE月額システム料（3.3万円 × 12か月）', '▲39.6万円', TEXT, false],
  ['① 管理単体の年間収支', '▲21.6万円', RED, true],
  ['小修繕への転換　年4件（粗利4.5万円/件）', '＋18.0万円', TEXT, false],
  ['再生・改修工事への転換　年1件（工事300万円・粗利25％）', '＋75.0万円', TEXT, false],
  ['② 転換込みの年間収支（＋将来の解体・新築・売却案件の芽）', '約 ＋71.4万円', GREEN, true],
];
pl.forEach((r, i) => {
  const y = 1.94 + i * 0.5;
  if (r[3]) card(s, M, y, CW - 1.6, 0.44, r[2] === RED ? 'FBF0EF' : 'EEF6F1');
  s.addText(r[0], { x: M + 0.24, y, w: CW - 3.9, h: 0.44, fontSize: r[3] ? 12.5 : 11.5, bold: r[3], color: r[3] ? r[2] : TEXT, valign: 'middle', fontFace: JP, margin: 0 });
  s.addText(r[1], { x: M + CW - 3.4, y, w: 1.8, h: 0.44, fontSize: r[3] ? 15 : 13, bold: true, color: r[2], align: 'right', valign: 'middle', fontFace: JP, margin: 0 });
});
card(s, M + CW - 1.36, 1.94, 1.36, 3.44, NAVY);
s.addText('損益分岐', { x: M + CW - 1.36, y: 2.6, w: 1.36, h: 0.3, fontSize: 10.5, color: ICE, align: 'center', fontFace: JP, margin: 0 });
s.addText('約7〜8棟', { x: M + CW - 1.36, y: 2.94, w: 1.36, h: 0.5, fontSize: 16, bold: true, color: AMBER, align: 'center', fontFace: JP, margin: 0 });
s.addText('転換込み試算', { x: M + CW - 1.36, y: 3.46, w: 1.36, h: 0.3, fontSize: 9.5, color: ICE, align: 'center', fontFace: JP, margin: 0 });
note(s, 5.54, '管理・空き地管理の単体は、SUUMO注文住宅カウンター等と同様に「持ち出し（広告費・投資）」の設計。だからこそ、巡回から早期に変化を捉えて修繕・解体・新築へつなげる転換設計が生命線になる。工務店にとって管理は「広告費ゼロで地域の土地とオーナーを押さえる営業活動」である。');

/* ---------- A-4 FUNNEL 3 CASES ---------- */
s = pres.addSlide();
head(s, 'FUNNEL — 3 CASES', '初年度の成果は「管理在庫」と「買えないデータ」の形成', 'A-4', '仮定・試算', 'A8761C');
const fr = [
  ['候補抽出（衛星・AI）', '4,000件', '4,000件', '4,000件'],
  ['所有者特定・DM到達', '2,800件', '2,800件', '2,800件'],
  ['反応率 → 商談件数', '0.8％ → 22件', '1.5％ → 42件', '3.0％ → 84件'],
  ['管理契約率 → 契約棟数', '30％ → 7棟', '40％ → 17棟', '50％ → 42棟'],
  ['年内の工事転換件数', '15％ → 1件', '20％ → 3件', '30％ → 13件'],
  ['平均工事単価', '200万円', '500万円', '800万円'],
  ['WHERE成果収益（4％時）', '約8万円', '約60万円', '約416万円'],
];
s.addTable(
  [[
    { text: 'ファネル段階', options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 11.5 } },
    { text: '保守ケース', options: { bold: true, color: WHITE, fill: { color: '4A5A7A' }, fontSize: 11.5, align: 'center' } },
    { text: '標準ケース', options: { bold: true, color: WHITE, fill: { color: 'A8761C' }, fontSize: 11.5, align: 'center' } },
    { text: '強気ケース', options: { bold: true, color: WHITE, fill: { color: '4A5A7A' }, fontSize: 11.5, align: 'center' } },
  ]].concat(fr.map((r, i) => {
    const last = i === fr.length - 1;
    return [
      { text: r[0], options: { bold: true, color: NAVY, fill: { color: CARD }, fontSize: 11 } },
      { text: r[1], options: { color: TEXT, fill: { color: WHITE }, fontSize: 11.5, align: 'center', bold: last } },
      { text: r[2], options: { color: last ? 'A8761C' : TEXT, fill: { color: 'FDF8EF' }, fontSize: 11.5, align: 'center', bold: last } },
      { text: r[3], options: { color: TEXT, fill: { color: WHITE }, fontSize: 11.5, align: 'center', bold: last } },
    ];
  })),
  { x: M, y: 1.6, w: CW, colW: [3.6, 2.83, 2.83, 2.83], rowH: [0.4, 0.38, 0.38, 0.38, 0.38, 0.38, 0.38, 0.44], border: { pt: 1, color: 'E3E9F4' }, fontFace: JP, valign: 'middle', margin: 0.08 }
);
card(s, M, 4.56, CW, 1.24, NAVY);
s.addText('初年度のWHERE成果収入は限定的。本実証の真の価値は、2年目以降の転換母数となる「管理契約棟数」と、競合が後から購入できない「建物内部・時系列劣化・所有者意向のデータベース（買えないデータ）」を自社に蓄積することにある。', { x: M + 0.4, y: 4.72, w: CW - 0.8, h: 0.94, fontSize: 12.5, color: WHITE, lineSpacing: 20, fontFace: JP, margin: 0 });
s.addText('※ 年間1億円規模は「100社展開・複数年後」のシナリオ。本実証は、その前提となる反応率・契約率・転換率を実測して置き換えるために行う。数値はすべて仮定。', { x: M, y: 5.98, w: CW, h: 0.5, fontSize: 10.5, color: MUTED, lineSpacing: 16, fontFace: JP, margin: 0 });

/* ---------- A-5 KPI & DECISION RULE ---------- */
s = pres.addSlide();
head(s, 'KPI & DECISION RULE', 'KPI目標と、先に合意しておく判断基準（案）', 'A-5', '協議中', NAVY);
s.addText('KPI目標（標準ケース基準・既存4地域合計）', { x: M, y: 1.5, w: 6.2, h: 0.3, fontSize: 12, bold: true, color: MUTED, fontFace: JP, margin: 0 });
const kpi = [['管理契約棟数', '8棟', '17棟'], ['活用提案件数', '—', '8件'], ['工事転換率', '—', '20％'], ['工事成約件数', '—', '3件'], ['WHERE成果収益', '—', '約60万円'], ['解約率', '0％', '10％未満'], ['巡回報告の遅延率', '5％未満', '5％未満'], ['オーナー満足度', '—', '80％以上']];
s.addTable(
  [[
    { text: '指標', options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 11 } },
    { text: 'Q2末', options: { bold: true, color: WHITE, fill: { color: NAVY }, fontSize: 11, align: 'center' } },
    { text: 'Q4末（1年）', options: { bold: true, color: WHITE, fill: { color: 'A8761C' }, fontSize: 11, align: 'center' } },
  ]].concat(kpi.map(r => [
    { text: r[0], options: { color: TEXT, fill: { color: WHITE }, fontSize: 10.5 } },
    { text: r[1], options: { color: MUTED, fill: { color: WHITE }, fontSize: 10.5, align: 'center' } },
    { text: r[2], options: { color: NAVY, bold: true, fill: { color: 'FDF8EF' }, fontSize: 10.5, align: 'center' } },
  ])),
  { x: M, y: 1.84, w: 6.2, colW: [2.9, 1.5, 1.8], rowH: 0.38, border: { pt: 1, color: 'E3E9F4' }, fontFace: JP, valign: 'middle', margin: 0.08 }
);
const dx = M + 6.6, dw = CW - 6.6;
s.addText('1年後の判断基準（実証開始前に両社で合意）', { x: dx, y: 1.5, w: dw, h: 0.3, fontSize: 12, bold: true, color: MUTED, fontFace: JP, margin: 0 });
const dec = [
  ['GO', '2年目から全国展開へ', '管理契約17棟以上 かつ 工事転換率20％以上\nかつ 解約率10％未満', GREEN, 'EEF6F1'],
  ['調整', '条件を見直して実証延長', '管理契約10〜17棟。料金・エリア・DM設計・\n巡回品質を再設計', 'A8761C', 'FDF8EF'],
  ['再考', '撤退・事業モデル再設計を協議', '管理契約10棟未満、または解約率25％超\n（ダウンサイドは限定的）', RED, 'FBF0EF'],
];
dec.forEach((d, i) => {
  const y = 1.84 + i * 1.22;
  card(s, dx, y, dw, 1.08, d[4]);
  s.addShape(pres.ShapeType.roundRect, { x: dx + 0.24, y: y + 0.22, w: 1.0, h: 0.42, rectRadius: 0.1, fill: { color: d[3] } });
  s.addText(d[0], { x: dx + 0.24, y: y + 0.22, w: 1.0, h: 0.42, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
  s.addText(d[1], { x: dx + 1.4, y: y + 0.14, w: dw - 1.64, h: 0.3, fontSize: 12, bold: true, color: d[3], fontFace: JP, margin: 0 });
  s.addText(d[2], { x: dx + 1.4, y: y + 0.46, w: dw - 1.64, h: 0.52, fontSize: 10.5, color: TEXT, lineSpacing: 15, fontFace: JP, margin: 0 });
});
note(s, 5.5, '求めるのは成功の約束ではなく、判断できる設計。目標値と撤退基準を実証開始前に両社で合意し、四半期レビューで進捗と前提のズレを確認する。数値は標準ケースに基づく叩き台。', CARD);

/* ---------- A-6 LEGAL STRUCTURE ---------- */
s = pres.addSlide();
head(s, 'LEGAL STRUCTURE', '「工事紹介料」と「媒介報酬」の分離、そしてデータ帰属', 'A-6', '要専門家確認', RED);
const lg = [
  ['①', '工事紹介料', '適用可', GREEN, '修繕・再生・解体・新築の建設工事の紹介手数料。宅建業免許は不要で、料率は当事者間の合意で設定できる。本実証の成果報酬3〜5％はこの範囲を基本とする。［協議中］'],
  ['②', '不動産媒介報酬', '要確認', 'A8761C', '売買・賃貸の仲介は宅建業免許が必須で、報酬は上限が法定（売買はおおむね3％＋6万円等）。WHEREの免許保有状況を確認のうえ、紹介料とは厳密に分離した別スキームとして設計する。'],
  ['③', '管理受託・契約関係', '要協議', '4A5A7A', '国交省「不動産業による空き家管理受託のガイドライン」に準拠。鍵・家財・責任範囲・保険・緊急時対応を契約書に明記する。'],
];
const lw = (CW - 0.28 * 2) / 3;
lg.forEach((c, i) => {
  const x = M + i * (lw + 0.28);
  card(s, x, 1.56, lw, 2.3);
  s.addText(c[0], { x: x + 0.26, y: 1.72, w: 0.4, h: 0.32, fontSize: 15, bold: true, color: AMBER, fontFace: 'Calibri', margin: 0 });
  s.addShape(pres.ShapeType.roundRect, { x: x + lw - 1.3, y: 1.74, w: 1.04, h: 0.3, rectRadius: 0.15, fill: { color: c[3] } });
  s.addText(c[2], { x: x + lw - 1.3, y: 1.74, w: 1.04, h: 0.3, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
  s.addText(c[1], { x: x + 0.26, y: 2.1, w: lw - 0.52, h: 0.34, fontSize: 13.5, bold: true, color: NAVY, fontFace: JP, margin: 0 });
  s.addText(c[4], { x: x + 0.26, y: 2.5, w: lw - 0.52, h: 1.22, fontSize: 10.5, color: TEXT, lineSpacing: 16, fontFace: JP, margin: 0 });
});
card(s, M, 4.04, CW, 2.16, NAVY);
s.addShape(pres.ShapeType.roundRect, { x: M + 0.36, y: 4.24, w: 1.5, h: 0.32, rectRadius: 0.16, fill: { color: AMBER } });
s.addText('最重要', { x: M + 0.36, y: 4.24, w: 1.5, h: 0.32, fontSize: 10.5, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
s.addText('④ データ帰属の整理 —「買えないデータ」の保護', { x: M + 2.0, y: 4.24, w: 8, h: 0.32, fontSize: 14, bold: true, color: WHITE, valign: 'middle', fontFace: JP, margin: 0 });
[
  '個人情報（所有者情報）の主体は所有者本人。管理契約書に利用目的を特定して明記する。',
  '蓄積される物件台帳データ（巡回写真・建物状態・履歴・意向）の保有権はWHEREに帰属する。',
  '工務店およびゆずりえ本部は、巡回・研修など業務範囲内でのみ利用する。',
  '競合に対する強固な参入障壁として保護。帰属を曖昧にしたまま実証を始めないことが双方の利益。',
].forEach((t, i) => {
  s.addText('－　' + t, { x: M + 0.36, y: 4.66 + i * 0.36, w: CW - 0.72, h: 0.32, fontSize: 11.5, color: ICE, fontFace: JP, margin: 0 });
});
s.addText('※ 契約書式は弁護士・宅建士の確認を経て確定する。', { x: M, y: 6.34, w: CW, h: 0.3, fontSize: 10, color: MUTED, fontFace: JP, margin: 0 });

/* ---------- A-7 DISCUSSION CHECKLIST ---------- */
s = pres.addSlide();
head(s, 'DISCUSSION CHECKLIST', '実証前に共同で決めたい事項', 'A-7', '協議中', NAVY);
const ck = [
  ['対象地域', ['既存4地域（3〜4市）の対象確定（人口密度・空き家数・工務店から片道30〜40分圏）', '参加工務店と想定所有者像の共同選定']],
  ['システム連携（開発負担ゼロ）', ['実証段階では追加API開発を行わず、CSV連携・手動運用で開始', '事業性が確認された段階でシステム投資を判断する段階設計']],
  ['契約・料金', ['WHEREが契約する管理契約書と所有者向け料金（月8,000円台の妥当性）', '工務店への委託範囲・支払額（管理料の90〜100％還元）・保険・事故責任']],
  ['収益・商流', ['WHERE発見案件（適用）と工務店自己開拓案件（除外）のシステム区分ルール', '不動産売買・賃貸へ移行する際のWHEREの役割と成果報酬3〜5％の適用条件']],
  ['法務・実証条件', ['弁護士・宅建士による契約書式および個人情報取扱いルールの確認', '実証期間・対象件数・KPI目標・評価方法と、継続／拡大の判断基準（A-5）']],
];
ck.forEach((c, i) => {
  const y = 1.56 + i * 1.02;
  card(s, M, y, CW, 0.9);
  s.addShape(pres.ShapeType.roundRect, { x: M + 0.22, y: y + 0.2, w: 2.9, h: 0.5, rectRadius: 0.1, fill: { color: NAVY } });
  s.addText(c[0], { x: M + 0.22, y: y + 0.2, w: 2.9, h: 0.5, fontSize: 11.5, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
  c[1].forEach((t, j) => {
    s.addText('□　' + t, { x: M + 3.32, y: y + 0.14 + j * 0.34, w: CW - 3.6, h: 0.32, fontSize: 11, color: TEXT, valign: 'middle', fontFace: JP, margin: 0 });
  });
});
s.addText('※ 上記が固まった時点で、実証契約書と共通KPIシートを両社で確定する。', { x: M, y: 6.72, w: CW, h: 0.3, fontSize: 10, color: MUTED, fontFace: JP, margin: 0 });

pres.writeFile({ fileName: '/home/user/ai-strategy-companion-mvp/docs/WHERE_補足スライドA1-A7_改訂版.pptx' })
  .then(f => console.log('saved:', f));

// WHERE × ゆずりえ 本編スライド14枚（修正版）
const pptxgen = require('pptxgenjs');

const NAVY = '13224A', NAVY2 = '22345F', ICE = 'DCE6F7', AMBER = 'E9A63C';
const CARD = 'F3F6FB', TEXT = '1B2437', MUTED = '667089', WHITE = 'FFFFFF';
const JP = 'Yu Gothic';

const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5
const W = 13.333, M = 0.62, CW = W - M * 2;

function footer(s, n) {
  s.addText('WHERE × ゆずりえ｜空き家管理収益モデル（叩き台）', {
    x: M, y: 7.02, w: 8, h: 0.3, fontSize: 9, color: MUTED, fontFace: JP, margin: 0
  });
  s.addText(String(n).padStart(2, '0'), {
    x: W - M - 0.8, y: 7.02, w: 0.8, h: 0.3, fontSize: 10, bold: true,
    color: AMBER, align: 'right', fontFace: JP, margin: 0
  });
}
function head(s, eyebrow, title, n) {
  s.addText(eyebrow, { x: M, y: 0.42, w: CW, h: 0.26, fontSize: 10.5, bold: true, color: AMBER, charSpacing: 2, fontFace: 'Calibri', margin: 0 });
  s.addText(title, { x: M, y: 0.72, w: CW, h: 0.62, fontSize: 26, bold: true, color: NAVY, fontFace: JP, margin: 0 });
  footer(s, n);
}
function card(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.08, fill: { color: fill || CARD }, line: { color: 'E3E9F4', width: 1 }
  });
}
function badge(s, x, y, label, d) {
  const dia = d || 0.42;
  s.addShape(pres.ShapeType.ellipse, { x, y, w: dia, h: dia, fill: { color: AMBER } });
  s.addText(label, { x, y, w: dia, h: dia, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
}

/* ---------- 01 TITLE ---------- */
let s = pres.addSlide();
s.background = { color: NAVY };
s.addShape(pres.ShapeType.ellipse, { x: 9.4, y: -1.5, w: 5.6, h: 5.6, fill: { color: NAVY2 } });
s.addShape(pres.ShapeType.ellipse, { x: 11.2, y: 4.6, w: 2.4, h: 2.4, fill: { color: AMBER, transparency: 80 } });
s.addText('WHERE × ゆずりえ', { x: M, y: 1.35, w: 8, h: 0.4, fontSize: 14, bold: true, color: AMBER, charSpacing: 3, fontFace: 'Calibri', margin: 0 });
s.addText('宇宙から見つけ、\n管理でつなぎ、\n地域の収益へ', { x: M, y: 1.9, w: 8.4, h: 2.5, fontSize: 40, bold: true, color: WHITE, lineSpacing: 52, fontFace: JP, margin: 0 });
s.addText('空き家管理を起点とした建築・不動産収益モデル｜実証のご提案', { x: M, y: 4.62, w: 9, h: 0.36, fontSize: 15, color: ICE, fontFace: JP, margin: 0 });
s.addShape(pres.ShapeType.roundRect, { x: M, y: 5.2, w: 4.5, h: 0.5, rectRadius: 0.25, fill: { color: NAVY2 } });
s.addText('既存4地域（3〜4市）・1年間の限定実証案', { x: M, y: 5.2, w: 4.5, h: 0.5, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
s.addText('株式会社WHERE 御中　／　株式会社Aether ゆずりえプロジェクト　　2026年7月｜DRAFT', { x: M, y: 6.5, w: 11, h: 0.3, fontSize: 11, color: '8FA0C4', fontFace: JP, margin: 0 });

/* ---------- 02 GOAL ---------- */
s = pres.addSlide();
head(s, 'GOAL', '発見した空き家を、継続収益を生む管理資産へ', 2);
const g = [
  ['01', '宇宙から発見', '衛星・AIで候補地を自動抽出。\n登記情報から所有者を特定'],
  ['02', '管理で関係を継続', '売却提案から入らず\n「まず建物を守りませんか」'],
  ['03', '地域で変化を発見', '認定工務店が月1回巡回。\n建物と意向の変化を捉える'],
  ['04', '工事・取引で収益化', '修繕・再生・解体・新築へ。\n成果報酬 3〜5％'],
];
const gw = (CW - 0.3 * 3) / 4;
g.forEach((c, i) => {
  const x = M + i * (gw + 0.3);
  card(s, x, 1.62, gw, 2.55, i === 3 ? 'FCF3E3' : CARD);
  badge(s, x + 0.28, 1.9, c[0]);
  s.addText(c[1], { x: x + 0.28, y: 2.48, w: gw - 0.56, h: 0.42, fontSize: 15, bold: true, color: NAVY, fontFace: JP, margin: 0 });
  s.addText(c[2], { x: x + 0.28, y: 2.98, w: gw - 0.56, h: 1.0, fontSize: 11.5, color: MUTED, lineSpacing: 17, fontFace: JP, margin: 0 });
  if (i < 3) s.addText('▶', { x: x + gw + 0.03, y: 2.72, w: 0.24, h: 0.3, fontSize: 12, color: AMBER, align: 'center', fontFace: 'Calibri', margin: 0 });
});
card(s, M, 4.45, CW, 1.55, NAVY);
s.addText('空き家・空き地管理は、小さな管理料を得るための事業ではない。', { x: M + 0.45, y: 4.72, w: CW - 0.9, h: 0.36, fontSize: 15, bold: true, color: WHITE, fontFace: JP, margin: 0 });
s.addText('オーナーとの関係と土地情報を早期に押さえ、将来の建築・不動産需要を最も早く捉える「入口」である。', { x: M + 0.45, y: 5.15, w: CW - 0.9, h: 0.6, fontSize: 12.5, color: ICE, lineSpacing: 20, fontFace: JP, margin: 0 });

/* ---------- 03 WHY NOW ---------- */
s = pres.addSlide();
head(s, 'WHY NOW', '供給・需要・法改正の三つが、同時に揃っている', 3);
const hw = (CW - 0.3) / 2;
card(s, M, 1.6, hw, 1.9);
s.addText('供給｜全国の空き家ストック', { x: M + 0.3, y: 1.78, w: hw - 0.6, h: 0.3, fontSize: 11, bold: true, color: MUTED, fontFace: JP, margin: 0 });
s.addText([{ text: '900.2', options: { fontSize: 40, bold: true, color: NAVY } }, { text: ' 万戸', options: { fontSize: 15, bold: true, color: NAVY } }], { x: M + 0.3, y: 2.12, w: hw - 0.6, h: 0.6, fontFace: JP, margin: 0 });
s.addText('空き家率13.8％で過去最高。うち放置空き家（その他の住宅）は385万戸。', { x: M + 0.3, y: 2.8, w: hw - 0.6, h: 0.55, fontSize: 11.5, color: MUTED, lineSpacing: 17, fontFace: JP, margin: 0 });
card(s, M + hw + 0.3, 1.6, hw, 1.9, 'FCF3E3');
s.addText('需要｜ゆずりえの確認済み入居希望', { x: M + hw + 0.6, y: 1.78, w: hw - 0.6, h: 0.3, fontSize: 11, bold: true, color: 'A8761C', fontFace: JP, margin: 0 });
s.addText([{ text: '35', options: { fontSize: 40, bold: true, color: NAVY } }, { text: ' 組', options: { fontSize: 15, bold: true, color: NAVY } }, { text: '　／ 3か月', options: { fontSize: 13, color: MUTED } }], { x: M + hw + 0.6, y: 2.12, w: hw - 0.6, h: 0.6, fontFace: JP, margin: 0 });
s.addText('希望地域・希望家賃・家族条件まで確認済み。将来贈与型への具体的な関心。', { x: M + hw + 0.6, y: 2.8, w: hw - 0.6, h: 0.55, fontSize: 11.5, color: MUTED, lineSpacing: 17, fontFace: JP, margin: 0 });
s.addText('法改正による追い風', { x: M, y: 3.68, w: 4, h: 0.3, fontSize: 12, bold: true, color: AMBER, fontFace: JP, margin: 0 });
const law = [
  ['2023年 改正空家法', '「管理不全空家」に指定・勧告されると、固定資産税の住宅用地特例（最大1/6軽減）が解除。税負担が最大6倍になる実損リスクが生まれ、オーナーが活用・処分を急ぐ動機が激増。'],
  ['2025年 建築基準法改正', '4号特例の縮小（新2号建築物）により、リフォーム時の構造・省エネ適合が義務化。設計・構造を扱える技術力のある専門工務店の必要性が急増。'],
];
law.forEach((c, i) => {
  const x = M + i * (hw + 0.3);
  card(s, x, 4.02, hw, 1.85);
  s.addShape(pres.ShapeType.roundRect, { x: x + 0.3, y: 4.24, w: 2.5, h: 0.34, rectRadius: 0.17, fill: { color: NAVY } });
  s.addText(c[0], { x: x + 0.3, y: 4.24, w: 2.5, h: 0.34, fontSize: 11, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
  s.addText(c[1], { x: x + 0.3, y: 4.72, w: hw - 0.6, h: 1.0, fontSize: 11.5, color: TEXT, lineSpacing: 18, fontFace: JP, margin: 0 });
});
s.addText('出典：令和5年住宅・土地統計調査（総務省統計局）／35組はゆずりえ実績（3か月）［実績］', { x: M, y: 6.1, w: CW, h: 0.3, fontSize: 9.5, color: MUTED, fontFace: JP, margin: 0 });

/* ---------- 04 WHERE STRENGTH ---------- */
s = pres.addSlide();
head(s, 'WHERE STRENGTH', 'WHEREは、空き家営業の「入口」を宇宙から変えられる', 4);
const ws = [
  ['01', '候補地を自動抽出', '条件指定のみで、衛星データとAI解析により候補地を網羅的に自動抽出'],
  ['02', '所有者を特定', '登記情報提供サービスと連携し、WHEREシステム内で所有者情報を一括取得'],
  ['03', '土地・建物を台帳化', '候補地を「土地管理」「建物管理」のデータベースへ自動登録・蓄積'],
  ['04', 'アプローチを記録', 'DM・電話・訪問等の履歴とネクストアクションを一元管理'],
];
const cw2 = (CW - 0.3) / 2, ch2 = 1.32;
ws.forEach((c, i) => {
  const x = M + (i % 2) * (cw2 + 0.3), y = 1.64 + Math.floor(i / 2) * (ch2 + 0.26);
  card(s, x, y, cw2, ch2);
  badge(s, x + 0.3, y + 0.26, c[0], 0.4);
  s.addText(c[1], { x: x + 0.86, y: y + 0.24, w: cw2 - 1.2, h: 0.36, fontSize: 14.5, bold: true, color: NAVY, fontFace: JP, margin: 0 });
  s.addText(c[2], { x: x + 0.86, y: y + 0.66, w: cw2 - 1.2, h: 0.55, fontSize: 11.5, color: MUTED, lineSpacing: 17, fontFace: JP, margin: 0 });
});
card(s, M, 4.86, CW, 1.1, NAVY);
s.addText('探索 → 所有者特定 → 台帳管理 → 活動履歴まで、一つの情報基盤でつながっている。', { x: M + 0.45, y: 5.05, w: CW - 0.9, h: 0.4, fontSize: 14, bold: true, color: WHITE, fontFace: JP, margin: 0 });
s.addText('本提案は、この強みを変えるものではない。その先に「管理」を加える提案。', { x: M + 0.45, y: 5.44, w: CW - 0.9, h: 0.32, fontSize: 11.5, color: ICE, fontFace: JP, margin: 0 });
s.addText('出典：WHERE基本機能紹介', { x: M, y: 6.1, w: CW, h: 0.3, fontSize: 9.5, color: MUTED, fontFace: JP, margin: 0 });

/* ---------- 05 YUZURIE STRENGTH ---------- */
s = pres.addSlide();
head(s, 'YUZURIE STRENGTH', 'ゆずりえは、発見した空き家に「活用の出口」をつくる', 5);
const ys = [
  ['01', '条件確認済みの需要', '35組', '希望地域・予算・家族条件が明確な具体的入居希望者'],
  ['02', '再生・収支設計ツール', 'アプリ', '概算見積・家賃・オーナー収益・将来贈与到達年数を一元計算'],
  ['03', '地域工務店ネットワーク', '実行力', '管理・修繕・再生・解体・新築工事を現地で実行する担い手'],
  ['04', '認定制度・教育・伴走', '認定資格', 'コンプライアンス厳守の認定資格、営業資料、初回遠隔伴走'],
];
const yw = (CW - 0.28 * 3) / 4;
ys.forEach((c, i) => {
  const x = M + i * (yw + 0.28);
  card(s, x, 1.64, yw, 3.0);
  badge(s, x + 0.26, 1.9, c[0], 0.4);
  s.addText(c[1], { x: x + 0.26, y: 2.44, w: yw - 0.52, h: 0.62, fontSize: 13.5, bold: true, color: NAVY, lineSpacing: 19, fontFace: JP, margin: 0 });
  s.addText(c[2], { x: x + 0.26, y: 3.08, w: yw - 0.52, h: 0.42, fontSize: 19, bold: true, color: AMBER, fontFace: JP, margin: 0 });
  s.addText(c[3], { x: x + 0.26, y: 3.58, w: yw - 0.52, h: 0.9, fontSize: 11, color: MUTED, lineSpacing: 16, fontFace: JP, margin: 0 });
});
card(s, M, 4.92, CW, 1.05, NAVY);
s.addText('物件を見つける技術に、活用・入居・工事までの実行力を接続する。', { x: M + 0.45, y: 5.22, w: CW - 0.9, h: 0.42, fontSize: 15, bold: true, color: WHITE, fontFace: JP, margin: 0 });

/* ---------- 06 SYNERGY ---------- */
s = pres.addSlide();
head(s, 'SYNERGY', '二つの強みがつながると、発見が成約まで動き始める', 6);
const sw = 5.35;
card(s, M, 1.68, sw, 3.5, NAVY);
s.addText('WHERE｜宇宙の発見力', { x: M + 0.35, y: 1.92, w: sw - 0.7, h: 0.36, fontSize: 15, bold: true, color: AMBER, fontFace: JP, margin: 0 });
['衛星・AIによる候補抽出', '登記情報からの所有者特定', '物件・活動データの蓄積', '不動産契約と関係維持'].forEach((t, i) => {
  s.addText('－　' + t, { x: M + 0.35, y: 2.42 + i * 0.6, w: sw - 0.7, h: 0.4, fontSize: 12.5, color: WHITE, fontFace: JP, margin: 0 });
});
const rx = M + CW - sw;
card(s, rx, 1.68, sw, 3.5, 'FCF3E3');
s.addText('ゆずりえ｜地上の実行力', { x: rx + 0.35, y: 1.92, w: sw - 0.7, h: 0.36, fontSize: 15, bold: true, color: 'A8761C', fontFace: JP, margin: 0 });
['条件確認済みの入居需要', '将来贈与型の活用設計', '地域工務店の実行力', '収益計算・AI・認定研修'].forEach((t, i) => {
  s.addText('－　' + t, { x: rx + 0.35, y: 2.42 + i * 0.6, w: sw - 0.7, h: 0.4, fontSize: 12.5, color: TEXT, fontFace: JP, margin: 0 });
});
s.addShape(pres.ShapeType.ellipse, { x: 6.24, y: 2.94, w: 0.86, h: 0.86, fill: { color: AMBER } });
s.addText('×', { x: 6.24, y: 2.94, w: 0.86, h: 0.86, fontSize: 26, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
s.addText('管理で接続', { x: 5.94, y: 3.86, w: 1.46, h: 0.3, fontSize: 11, bold: true, color: NAVY, align: 'center', fontFace: JP, margin: 0 });
card(s, M, 5.4, CW, 0.98, NAVY);
s.addText('WHEREの発見力（宇宙）× ゆずりえの地域実行力（地上）＝ 放置空き家 循環プラットフォーム', { x: M + 0.4, y: 5.62, w: CW - 0.8, h: 0.46, fontSize: 15, bold: true, color: WHITE, align: 'center', fontFace: JP, margin: 0 });

/* ---------- 07 BUSINESS FLOW ---------- */
s = pres.addSlide();
head(s, 'BUSINESS FLOW', '管理契約が、オーナーとの関係と収益導線をつなぐ', 7);
const fl = [
  ['01', '空から発見', '衛星・AI'],
  ['02', '所有者特定', '登記情報'],
  ['03', '管理契約', '月8,000円台'],
  ['04', '月次巡回', '写真報告'],
  ['05', '活用提案', '修繕・再生'],
  ['06', '成約', '工事・取引'],
];
const fw = (CW - 0.18 * 5) / 6;
fl.forEach((c, i) => {
  const x = M + i * (fw + 0.18);
  card(s, x, 1.66, fw, 1.5, i === 5 ? 'FCF3E3' : CARD);
  s.addText(c[0], { x, y: 1.82, w: fw, h: 0.26, fontSize: 10, bold: true, color: AMBER, align: 'center', fontFace: 'Calibri', margin: 0 });
  s.addText(c[1], { x: x + 0.06, y: 2.14, w: fw - 0.12, h: 0.34, fontSize: 13, bold: true, color: NAVY, align: 'center', fontFace: JP, margin: 0 });
  s.addText(c[2], { x: x + 0.06, y: 2.52, w: fw - 0.12, h: 0.3, fontSize: 10.5, color: MUTED, align: 'center', fontFace: JP, margin: 0 });
  if (i < 5) s.addText('›', { x: x + fw, y: 2.16, w: 0.18, h: 0.3, fontSize: 15, bold: true, color: AMBER, align: 'center', fontFace: 'Calibri', margin: 0 });
});
card(s, M, 3.36, 6.0, 1.3, NAVY);
s.addText('WHERE収益', { x: M + 0.35, y: 3.56, w: 5.3, h: 0.3, fontSize: 11, bold: true, color: ICE, fontFace: JP, margin: 0 });
s.addText([{ text: '工事金額の ', options: { fontSize: 15, bold: true, color: WHITE } }, { text: '3〜5％', options: { fontSize: 26, bold: true, color: AMBER } }], { x: M + 0.35, y: 3.86, w: 5.3, h: 0.5, fontFace: JP, margin: 0 });
card(s, M + 6.3, 3.36, CW - 6.3, 1.3);
s.addText('修繕・再生・解体・新築・不動産取引まで', { x: M + 6.6, y: 3.6, w: CW - 6.9, h: 0.34, fontSize: 13, bold: true, color: NAVY, fontFace: JP, margin: 0 });
s.addText('管理から生まれた工事・取引すべてが成果報酬の対象。紹介して終わりではなく、管理で関係を継続できる。', { x: M + 6.6, y: 3.96, w: CW - 6.9, h: 0.6, fontSize: 11.5, color: MUTED, lineSpacing: 17, fontFace: JP, margin: 0 });
card(s, M, 4.88, CW, 1.36, 'FBF0EF');
s.addShape(pres.ShapeType.roundRect, { x: M + 0.32, y: 5.08, w: 2.1, h: 0.32, rectRadius: 0.16, fill: { color: 'A33B32' } });
s.addText('厳格な商流区分', { x: M + 0.32, y: 5.08, w: 2.1, h: 0.32, fontSize: 11, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
s.addText('成果報酬の適用対象は「WHEREが発見・接続し、オーナーとの関係を持った案件」に限る。工務店が自ら見つけて直接契約した自己開拓案件は対象外とし、システム上で厳密に区分・管理する。', { x: M + 0.32, y: 5.5, w: CW - 0.64, h: 0.62, fontSize: 12, color: TEXT, lineSpacing: 18, fontFace: JP, margin: 0 });
s.addText('※ 管理契約の月額8,000円台は［仮説］、成果報酬3〜5％は［協議中］の条件。', { x: M, y: 6.42, w: CW, h: 0.3, fontSize: 9.5, color: MUTED, fontFace: JP, margin: 0 });

/* ---------- 08 MANAGEMENT AS ASSET ---------- */
s = pres.addSlide();
head(s, 'MANAGEMENT AS ASSET', '管理情報は、将来案件を蓄積する「収益資産」になる', 8);
const bw = (CW - 0.9) / 2;
card(s, M, 1.62, bw, 2.44);
s.addText('従来｜一度きりの探索', { x: M + 0.3, y: 1.82, w: bw - 0.6, h: 0.32, fontSize: 13.5, bold: true, color: MUTED, fontFace: JP, margin: 0 });
['候補リストを抽出し、DMを発送', '今すぐ需要がなければ関係は終了', '物件情報が時間とともに陳腐化'].forEach((t, i) => {
  s.addText('－　' + t, { x: M + 0.3, y: 2.24 + i * 0.44, w: bw - 0.6, h: 0.4, fontSize: 11.5, color: TEXT, fontFace: JP, margin: 0 });
});
s.addText('短期・単発', { x: M + 0.3, y: 3.6, w: bw - 0.6, h: 0.32, fontSize: 12, bold: true, color: 'A33B32', fontFace: JP, margin: 0 });
s.addShape(pres.ShapeType.ellipse, { x: M + bw + 0.15, y: 2.68, w: 0.6, h: 0.6, fill: { color: AMBER } });
s.addText('→', { x: M + bw + 0.15, y: 2.68, w: 0.6, h: 0.6, fontSize: 18, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
const bx = M + bw + 0.9;
card(s, bx, 1.62, bw, 2.44, 'FCF3E3');
s.addText('本モデル｜管理でつながる探索', { x: bx + 0.3, y: 1.82, w: bw - 0.6, h: 0.32, fontSize: 13.5, bold: true, color: 'A8761C', fontFace: JP, margin: 0 });
['オーナーと管理契約を結び関係を維持', '毎月、建物と意向の変化を把握', '最適なタイミングで提案・成約へ'].forEach((t, i) => {
  s.addText('－　' + t, { x: bx + 0.3, y: 2.24 + i * 0.44, w: bw - 0.6, h: 0.4, fontSize: 11.5, color: TEXT, fontFace: JP, margin: 0 });
});
s.addText('継続・蓄積', { x: bx + 0.3, y: 3.6, w: bw - 0.6, h: 0.32, fontSize: 12, bold: true, color: '2C7A4B', fontFace: JP, margin: 0 });
card(s, M, 4.26, CW, 2.0, NAVY);
s.addText('SUUMO等 大手カウンター構造からの転換', { x: M + 0.42, y: 4.46, w: CW - 0.84, h: 0.34, fontSize: 14, bold: true, color: AMBER, fontFace: JP, margin: 0 });
s.addText('既存のSUUMO注文住宅カウンター等は、大手ハウスメーカーへ案件を誘導する構造。本モデルは、圧倒的に数の多い「地域工務店」をインフラ化する。', { x: M + 0.42, y: 4.86, w: CW - 0.84, h: 0.6, fontSize: 12.5, color: WHITE, lineSpacing: 19, fontFace: JP, margin: 0 });
s.addText('空き家・空き地管理で土地とオーナー情報を早期に押さえ、土地確保から建築・活用までを工務店が主導する。初期の管理は「投資（持ち出し）」と捉え、成約時の成果報酬で高回収する仕組み。', { x: M + 0.42, y: 5.5, w: CW - 0.84, h: 0.6, fontSize: 12.5, color: ICE, lineSpacing: 19, fontFace: JP, margin: 0 });

/* ---------- 09 PRICING SHIFT ---------- */
s = pres.addSlide();
head(s, 'PRICING SHIFT', '入口を低くし、成果が生まれた後に収益を取る', 9);
const pw = (CW - 0.34) / 2;
card(s, M, 1.66, pw, 3.5);
s.addText('現行・企業向け標準プラン（直販）', { x: M + 0.34, y: 1.9, w: pw - 0.68, h: 0.34, fontSize: 13.5, bold: true, color: MUTED, fontFace: JP, margin: 0 });
[['導入支援', '75万円'], ['月額', '30万円'], ['初年度固定費', '435万円']].forEach((r, i) => {
  s.addText(r[0], { x: M + 0.34, y: 2.42 + i * 0.62, w: 2.2, h: 0.36, fontSize: 12, color: MUTED, valign: 'middle', fontFace: JP, margin: 0 });
  s.addText(r[1], { x: M + 2.5, y: 2.42 + i * 0.62, w: pw - 2.84, h: 0.36, fontSize: i === 2 ? 20 : 17, bold: true, color: i === 2 ? NAVY : TEXT, valign: 'middle', fontFace: JP, margin: 0 });
});
s.addText('5ID・週次MTG・高タッチ運用／税別・登記／DM費用を除く', { x: M + 0.34, y: 4.42, w: pw - 0.68, h: 0.5, fontSize: 11, color: MUTED, lineSpacing: 16, fontFace: JP, margin: 0 });
const px = M + pw + 0.34;
card(s, px, 1.66, pw, 3.5, 'FCF3E3');
s.addShape(pres.ShapeType.roundRect, { x: px + pw - 1.5, y: 1.86, w: 1.16, h: 0.3, rectRadius: 0.15, fill: { color: AMBER } });
s.addText('新設案', { x: px + pw - 1.5, y: 1.86, w: 1.16, h: 0.3, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
s.addText('認定工務店ネットワークプラン', { x: px + 0.34, y: 1.9, w: pw - 1.9, h: 0.34, fontSize: 13.5, bold: true, color: 'A8761C', fontFace: JP, margin: 0 });
[['月額システム料', '3.3万円程度'], ['成約時', '工事金額の3〜5％'], ['従量費', '登記・DM実費']].forEach((r, i) => {
  s.addText(r[0], { x: px + 0.34, y: 2.42 + i * 0.62, w: 2.2, h: 0.36, fontSize: 12, color: MUTED, valign: 'middle', fontFace: JP, margin: 0 });
  s.addText(r[1], { x: px + 2.5, y: 2.42 + i * 0.62, w: pw - 2.84, h: 0.36, fontSize: i === 1 ? 18 : 17, bold: true, color: i === 1 ? 'A8761C' : TEXT, valign: 'middle', fontFace: JP, margin: 0 });
});
s.addText('追加ID（月2万円）の価格帯をベースに、ネットワーク運用原資を加味した仮案［協議中］', { x: px + 0.34, y: 4.42, w: pw - 0.68, h: 0.5, fontSize: 11, color: MUTED, lineSpacing: 16, fontFace: JP, margin: 0 });
card(s, M, 5.4, CW, 0.96, NAVY);
s.addText('値下げではない。現行プランが価格的に届かない小規模事業者市場への「チャネル追加」。', { x: M + 0.42, y: 5.62, w: CW - 0.84, h: 0.44, fontSize: 14, bold: true, color: WHITE, align: 'center', fontFace: JP, margin: 0 });

/* ---------- 10 UNIT ECONOMICS ---------- */
s = pres.addSlide();
head(s, 'UNIT ECONOMICS', '1件あたり15万〜125万円。工事規模に応じて収益が積み上がる', 10);
const lblW = 4.3, rgap = 0.24, rw = (CW - lblW - rgap * 3) / 3;
const rateX = i => M + lblW + rgap + i * (rw + rgap);
// ヘッダー行
s.addShape(pres.ShapeType.roundRect, { x: M, y: 1.6, w: lblW, h: 0.42, rectRadius: 0.08, fill: { color: NAVY } });
s.addText('工事区分（1件あたり・仮定）', { x: M + 0.24, y: 1.6, w: lblW - 0.48, h: 0.42, fontSize: 11.5, bold: true, color: WHITE, valign: 'middle', fontFace: JP, margin: 0 });
['成果報酬 3％', '成果報酬 4％', '成果報酬 5％'].forEach((t, i) => {
  s.addShape(pres.ShapeType.roundRect, { x: rateX(i), y: 1.6, w: rw, h: 0.42, rectRadius: 0.08, fill: { color: i === 2 ? AMBER : '4A5A7A' } });
  s.addText(t, { x: rateX(i), y: 1.6, w: rw, h: 0.42, fontSize: 11.5, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
});
// 2つのケース
const cases = [
  ['再生・改修工事', '工事金額 500万円', ['15万円', '20万円', '25万円'], CARD, 22],
  ['解体・建て替え新築', '建物価格 2,500万円', ['75万円', '100万円', '125万円'], 'FCF3E3', 26],
];
cases.forEach((c, r) => {
  const y = 2.14 + r * 0.98;
  card(s, M, y, lblW, 0.86, c[3]);
  s.addText(c[0], { x: M + 0.26, y: y + 0.1, w: lblW - 0.52, h: 0.34, fontSize: 14, bold: true, color: NAVY, fontFace: JP, margin: 0 });
  s.addText(c[1], { x: M + 0.26, y: y + 0.46, w: lblW - 0.52, h: 0.3, fontSize: 11.5, color: MUTED, fontFace: JP, margin: 0 });
  c[2].forEach((v, i) => {
    card(s, rateX(i), y, rw, 0.86, r === 1 && i === 2 ? 'FCF3E3' : WHITE);
    s.addText(v, { x: rateX(i), y, w: rw, h: 0.86, fontSize: c[4], bold: true, color: r === 1 ? NAVY : '4A5A7A', align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
  });
});
// 固定費との比較
card(s, M, 4.16, CW, 1.16);
s.addText([{ text: '現行プランの初年度固定費 435万円　＝　', options: { fontSize: 14.5, color: TEXT } }, { text: '成果報酬5％なら新築4件', options: { fontSize: 16.5, bold: true, color: NAVY } }, { text: '　／　3％なら6件程度の成約に相当', options: { fontSize: 14.5, color: TEXT } }], { x: M + 0.42, y: 4.34, w: CW - 0.84, h: 0.4, fontFace: JP, margin: 0 });
s.addText('空き家はすべてが再生に向くわけではない。状態・立地・オーナーの希望によっては、解体して新築へ建て替える可能性がある。', { x: M + 0.42, y: 4.78, w: CW - 0.84, h: 0.4, fontSize: 11.5, color: MUTED, fontFace: JP, margin: 0 });
card(s, M, 5.48, CW, 1.16, NAVY);
s.addText('収益機会は新築だけではない。小修繕（数十万円）→ 再生・改修（数百万円）→ 解体 → 建て替え新築（2,500万円規模）まで、管理から生まれる工事すべてが階段状に成果報酬の対象になる。', { x: M + 0.42, y: 5.62, w: CW - 0.84, h: 0.9, fontSize: 12.5, color: WHITE, valign: 'middle', lineSpacing: 20, fontFace: JP, margin: 0 });
s.addText('計算：工事金額 × 3〜5％。再生工事500万円、新築の建物価格2,500万円はいずれも本企画の［仮定］。', { x: M, y: 6.72, w: CW, h: 0.3, fontSize: 9.5, color: MUTED, fontFace: JP, margin: 0 });

/* ---------- 11 SCALE MODEL ---------- */
s = pres.addSlide();
head(s, 'SCALE MODEL', '100社展開で、年間1億円規模が見える', 11);
card(s, M, 1.62, CW, 0.62, NAVY);
s.addText('試算前提｜100社　｜　月額3.3万円　｜　新築2,500万円　｜　成果報酬3〜5％', { x: M + 0.42, y: 1.62, w: CW - 0.84, h: 0.62, fontSize: 13, bold: true, color: WHITE, valign: 'middle', fontFace: JP, margin: 0 });
const sc = [
  ['1社あたり 年0.5件', '新築 50件／年', '3,960万円', '3,750万〜6,250万円', '7,710万〜1億210万円', CARD, NAVY],
  ['1社あたり 年1件', '新築 100件／年', '3,960万円', '7,500万〜1億2,500万円', '1億1,460万〜1億6,460万円', 'FCF3E3', 'A8761C'],
];
const scw = (CW - 0.34) / 2;
sc.forEach((c, i) => {
  const x = M + i * (scw + 0.34);
  card(s, x, 2.46, scw, 2.98, c[5]);
  s.addText(c[0], { x: x + 0.32, y: 2.68, w: scw - 0.64, h: 0.32, fontSize: 13, bold: true, color: c[6], fontFace: JP, margin: 0 });
  s.addText(c[1], { x: x + 0.32, y: 3.02, w: scw - 0.64, h: 0.34, fontSize: 15, bold: true, color: NAVY, fontFace: JP, margin: 0 });
  s.addText('月額収入', { x: x + 0.32, y: 3.54, w: 1.7, h: 0.3, fontSize: 11, color: MUTED, fontFace: JP, margin: 0 });
  s.addText(c[2], { x: x + 2.0, y: 3.5, w: scw - 2.32, h: 0.34, fontSize: 14, bold: true, color: TEXT, fontFace: JP, margin: 0 });
  s.addText('成果収入', { x: x + 0.32, y: 3.98, w: 1.7, h: 0.3, fontSize: 11, color: MUTED, fontFace: JP, margin: 0 });
  s.addText(c[3], { x: x + 2.0, y: 3.94, w: scw - 2.32, h: 0.34, fontSize: 14, bold: true, color: TEXT, fontFace: JP, margin: 0 });
  s.addShape(pres.ShapeType.roundRect, { x: x + 0.32, y: 4.42, w: scw - 0.64, h: 0.82, rectRadius: 0.08, fill: { color: WHITE } });
  s.addText('合計 年間収益', { x: x + 0.48, y: 4.5, w: scw - 0.96, h: 0.26, fontSize: 10.5, color: MUTED, fontFace: JP, margin: 0 });
  s.addText(c[4], { x: x + 0.48, y: 4.76, w: scw - 0.96, h: 0.4, fontSize: 17, bold: true, color: NAVY, fontFace: JP, margin: 0 });
});
s.addText('※ 確定予測ではない事業シミュレーション。小修繕・リフォーム再生・解体・不動産仲介の収益は含めていない。本実証で各種転換率の実測値を得て精度を高める。［試算］', { x: M, y: 5.62, w: CW, h: 0.6, fontSize: 11, color: MUTED, lineSpacing: 17, fontFace: JP, margin: 0 });

/* ---------- 12 VALUE FOR ALL ---------- */
s = pres.addSlide();
head(s, 'VALUE FOR ALL', '管理を中心に、4者の利益が同時に成立する', 12);
const va = [
  ['WHERE', '管理物件の蓄積、オーナーとの継続接点、3〜5％の成約収益、不動産取引機会、「買えないデータ」の自社蓄積', NAVY, WHITE],
  ['地域工務店', '管理料還元、土地の早期確保、修繕・再生・解体・新築工事の継続受注、地域密着の信頼獲得', '2C7A4B', WHITE],
  ['所有者（オーナー）', '建物の保全、月次写真報告、売却以外の選択肢、固定資産税増額リスクの回避', 'A8761C', WHITE],
  ['入居者・地域', '放置空き家の解消、地域防犯・景観の維持、住宅ローンに頼りすぎない戸建て居住の選択肢', '4A5A7A', WHITE],
];
va.forEach((r, i) => {
  const y = 1.66 + i * 0.98;
  card(s, M, y, CW, 0.84);
  s.addShape(pres.ShapeType.roundRect, { x: M + 0.22, y: y + 0.18, w: 2.4, h: 0.48, rectRadius: 0.1, fill: { color: r[2] } });
  s.addText(r[0], { x: M + 0.22, y: y + 0.18, w: 2.4, h: 0.48, fontSize: 12.5, bold: true, color: r[3], align: 'center', valign: 'middle', fontFace: JP, margin: 0 });
  s.addText(r[1], { x: M + 2.86, y: y + 0.16, w: CW - 3.2, h: 0.52, fontSize: 12, color: TEXT, valign: 'middle', lineSpacing: 18, fontFace: JP, margin: 0 });
});
card(s, M, 5.62, CW, 0.92, 'FCF3E3');
s.addText('ゆずりえ本部は工事紹介料・仲介料を取らない。認定資格・研修・アプリ・コンプライアンス基盤の提供に特化する。', { x: M + 0.42, y: 5.62, w: CW - 0.84, h: 0.92, fontSize: 13, bold: true, color: 'A8761C', valign: 'middle', fontFace: JP, margin: 0 });

/* ---------- 13 ONE-YEAR PILOT ---------- */
s = pres.addSlide();
head(s, 'ONE-YEAR PILOT', '既存4地域で1年実証し、2年目から全国展開へ', 13);
const q = [
  ['Q1', '設計・開始', '料金・契約・役割分担\n共通KPI・巡回運用\n手動／CSV連携フロー確定'],
  ['Q2', '管理在庫の形成', '候補抽出・所有者接触\n管理契約の蓄積\n目標 8棟'],
  ['Q3', '提案・成約検証', '巡回情報から修繕・再生\n解体・新築を提案\n成約を検証'],
  ['Q4', '収益性判定', '成約率・工事単価・収益\n全国展開条件を決定\n目標 17棟・3成約'],
];
const qw = (CW - 0.26 * 3) / 4;
q.forEach((c, i) => {
  const x = M + i * (qw + 0.26);
  card(s, x, 1.64, qw, 2.62, i === 3 ? 'FCF3E3' : CARD);
  s.addShape(pres.ShapeType.roundRect, { x: x + 0.26, y: 1.86, w: 0.8, h: 0.36, rectRadius: 0.18, fill: { color: i === 3 ? AMBER : NAVY } });
  s.addText(c[0], { x: x + 0.26, y: 1.86, w: 0.8, h: 0.36, fontSize: 12, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
  s.addText(c[1], { x: x + 0.26, y: 2.36, w: qw - 0.52, h: 0.36, fontSize: 14, bold: true, color: NAVY, fontFace: JP, margin: 0 });
  s.addText(c[2], { x: x + 0.26, y: 2.8, w: qw - 0.52, h: 1.2, fontSize: 11, color: MUTED, lineSpacing: 17, fontFace: JP, margin: 0 });
});
card(s, M, 4.52, CW, 1.16, NAVY);
s.addText('共通KPI', { x: M + 0.4, y: 4.7, w: 1.6, h: 0.3, fontSize: 11.5, bold: true, color: AMBER, fontFace: JP, margin: 0 });
s.addText('候補数 → 所有者接触 → 管理契約 → 活用提案 → 見積 → 工事成約 → WHERE成果収益', { x: M + 0.4, y: 5.02, w: CW - 0.8, h: 0.44, fontSize: 13, bold: true, color: WHITE, fontFace: JP, margin: 0 });
s.addText('1年目も実証地域だけで止めず、条件が整った別地域の工務店を段階的に追加する。', { x: M, y: 5.86, w: CW, h: 0.34, fontSize: 12, color: TEXT, fontFace: JP, margin: 0 });

/* ---------- 14 PROPOSAL ---------- */
s = pres.addSlide();
s.background = { color: NAVY };
s.addShape(pres.ShapeType.ellipse, { x: 10.6, y: 4.4, w: 3.6, h: 3.6, fill: { color: NAVY2 } });
s.addText('PROPOSAL', { x: M, y: 0.62, w: 6, h: 0.3, fontSize: 11, bold: true, color: AMBER, charSpacing: 3, fontFace: 'Calibri', margin: 0 });
s.addText('宇宙から発見した空き家を、\n全国の収益資産へ。', { x: M, y: 1.02, w: 9.6, h: 1.5, fontSize: 32, bold: true, color: WHITE, lineSpacing: 44, fontFace: JP, margin: 0 });
s.addText('空き家検索ツールの提供会社から、管理・建築・不動産収益まで生み出すプラットフォームへ。', { x: M, y: 2.62, w: 10, h: 0.36, fontSize: 13.5, color: ICE, fontFace: JP, margin: 0 });
s.addText('本日、ご協議・合意を開始したいこと', { x: M, y: 3.32, w: 8, h: 0.34, fontSize: 13, bold: true, color: AMBER, fontFace: JP, margin: 0 });
const ag = [
  '既存4地域（3〜4市）・1年間の限定実証の共同設計',
  '実証期間の料金体系（月額3.3万円案）と成果報酬3〜5％の適用・除外条件',
  'オーナー契約・物件台帳データ（買えないデータ）の帰属と役割分担',
  '専門家（弁護士・宅建士）を交えた法務・コンプライアンス整理と契約書式の作成',
  '共通KPI目標と、2年目の全国展開・撤退に関する合意基準（GO／調整／再考）',
];
ag.forEach((t, i) => {
  const y = 3.78 + i * 0.54;
  s.addShape(pres.ShapeType.ellipse, { x: M, y: y + 0.04, w: 0.32, h: 0.32, fill: { color: AMBER } });
  s.addText(String(i + 1), { x: M, y: y + 0.04, w: 0.32, h: 0.32, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri', margin: 0 });
  s.addText(t, { x: M + 0.5, y, w: 10.4, h: 0.4, fontSize: 13, color: WHITE, valign: 'middle', fontFace: JP, margin: 0 });
});
s.addText('株式会社Aether ゆずりえプロジェクト　｜　2026年7月｜DRAFT（協議用叩き台）', { x: M, y: 6.82, w: 10, h: 0.3, fontSize: 10, color: '8FA0C4', fontFace: JP, margin: 0 });

pres.writeFile({ fileName: '/home/user/ai-strategy-companion-mvp/docs/WHERE_本編スライド14枚_改訂版.pptx' })
  .then(f => console.log('saved:', f));

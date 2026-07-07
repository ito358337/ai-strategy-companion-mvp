# -*- coding: utf-8 -*-
"""戸建賃貸・アパート向け 30年収支計画計算書(数式入り)を生成する"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import LineChart, Reference

OUT = "/tmp/claude-0/-home-user-ai-strategy-companion-mvp/c4435073-323b-5027-8d2e-d3f0394d9dbd/scratchpad/収支計画計算書_戸建賃貸30年.xlsx"

wb = Workbook()

# ---------- styles ----------
TITLE_F = Font(name="游ゴシック", size=14, bold=True, color="1F3864")
H_F = Font(name="游ゴシック", size=10, bold=True, color="FFFFFF")
B_F = Font(name="游ゴシック", size=10)
BOLD = Font(name="游ゴシック", size=10, bold=True)
NOTE_F = Font(name="游ゴシック", size=9, color="808080")
INPUT_FILL = PatternFill("solid", fgColor="FFF2CC")   # 黄色 = 入力セル
CALC_FILL = PatternFill("solid", fgColor="E2EFDA")    # 緑 = 自動計算
HEAD_FILL = PatternFill("solid", fgColor="1F3864")
SEC_FILL = PatternFill("solid", fgColor="D6E4F0")
TOT_FILL = PatternFill("solid", fgColor="FCE4D6")
thin = Side(style="thin", color="B0B0B0")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
YEN = "#,##0"
PCT = "0.0%"

def put(ws, cell, value, font=B_F, fill=None, fmt=None, border=True, align=None, bold=False):
    c = ws[cell]
    c.value = value
    c.font = BOLD if bold else font
    if fill: c.fill = fill
    if fmt: c.number_format = fmt
    if border: c.border = BORDER
    if align: c.alignment = Alignment(horizontal=align, vertical="center")
    return c

P = "前提条件"

# =========================================================
# シート1: 前提条件
# =========================================================
ws = wb.active
ws.title = P
ws.sheet_view.showGridLines = False
ws.column_dimensions["A"].width = 34
ws.column_dimensions["B"].width = 16
ws.column_dimensions["C"].width = 16
ws.column_dimensions["D"].width = 52

put(ws, "A1", "収支計画計算書 — 前提条件(入力シート)", TITLE_F, border=False)
put(ws, "A2", "黄色のセルだけ入力してください。緑のセルと他のシートはすべて自動計算されます。", NOTE_F, border=False)

def sec(row, label):
    put(ws, f"A{row}", label, H_F, HEAD_FILL)
    for col in "BCD":
        put(ws, f"{col}{row}", "", H_F, HEAD_FILL)

def inp(row, label, value, fmt=YEN, unit="", note=""):
    put(ws, f"A{row}", label)
    put(ws, f"B{row}", value, fill=INPUT_FILL, fmt=fmt, align="right")
    put(ws, f"C{row}", unit, align="left")
    put(ws, f"D{row}", note, NOTE_F)

def calc(row, label, formula, fmt=YEN, unit="", note=""):
    put(ws, f"A{row}", label, bold=True)
    put(ws, f"B{row}", formula, fill=CALC_FILL, fmt=fmt, align="right", bold=True)
    put(ws, f"C{row}", unit, align="left")
    put(ws, f"D{row}", note, NOTE_F)

sec(4, "■ 建築計画")
inp(5, "棟数(戸数)", 3, "0", "棟", "アパートの場合は戸数として使用")
inp(6, "建築費(1棟・1戸あたり)", 17000000, YEN, "円", "本体工事費(税込)")
inp(7, "外構・諸費用(総額)", 3000000, YEN, "円", "外構・水道加入・登記・火災保険初回等")
calc(8, "総事業費", "=B5*B6+B7", YEN, "円")

sec(10, "■ 資金計画")
inp(11, "自己資金", 10000000, YEN, "円", "推奨: 総事業費の2割")
calc(12, "借入額", "=B8-B11", YEN, "円")
inp(13, "借入金利(年利)", 0.02, PCT, "", "変動の場合は現行金利。サマリーで+1%/+2%も自動比較")
inp(14, "返済期間", 25, "0", "年", "元利均等返済を想定")
calc(15, "年間返済額", "=IF(B12<=0,0,PMT(B13/12,B14*12,-B12)*12)", YEN, "円/年")

sec(17, "■ 収入計画")
inp(18, "月額家賃(1棟・1戸あたり)", 85000, YEN, "円/月", "周辺成約事例に基づき設定")
calc(19, "満室時 年間家賃収入", "=B5*B18*12", YEN, "円/年")
inp(20, "空室率(1〜15年目)", 0.05, PCT, "", "戸建賃貸は5%程度が目安")
inp(21, "空室率(16年目以降)", 0.10, PCT, "", "築年数経過による上昇を織り込み")
inp(22, "家賃下落率(年)", 0.01, PCT, "", "毎年この率で逓減させる保守的前提")

sec(24, "■ 運営費")
inp(25, "管理委託料率(実効家賃に対し)", 0.05, PCT, "", "一般管理委託の相場 3〜5%")
inp(26, "固定資産税・都市計画税(年)", 350000, YEN, "円/年", "建物+住宅用地特例後の土地分")
inp(27, "火災保険・その他経費(年)", 100000, YEN, "円/年")
inp(28, "小修繕・原状回復費(年)", 100000, YEN, "円/年", "大規模修繕とは別枠。二重計上しないこと")
put(ws, "A29", "大規模修繕①(実施年/金額)")
put(ws, "B29", 12, fill=INPUT_FILL, fmt="0", align="right")
put(ws, "C29", 4500000, fill=INPUT_FILL, fmt=YEN, align="right")
put(ws, "D29", "外壁・屋根等 (例:150万円×3棟)", NOTE_F)
put(ws, "A30", "大規模修繕②(実施年/金額)")
put(ws, "B30", 24, fill=INPUT_FILL, fmt="0", align="right")
put(ws, "C30", 4500000, fill=INPUT_FILL, fmt=YEN, align="right")
put(ws, "D30", "設備更新等", NOTE_F)

sec(32, "■ 税金(概算用)")
calc(33, "減価償却対象(建物本体)", "=B5*B6", YEN, "円", "外構等は簡便化のため除外")
inp(34, "償却率(木造・法定22年 定額法)", 0.046, "0.000", "", "軽量鉄骨等の場合は変更")
inp(35, "所得税+住民税の適用税率(概算)", 0.30, PCT, "", "他の所得と合算した実効税率の目安")

put(ws, "A37", "※ 本シートは概算シミュレーションです。税務の取扱いは税理士にご確認ください。", NOTE_F, border=False)

# =========================================================
# シート2: 収支計画30年
# =========================================================
ws2 = wb.create_sheet("収支計画30年")
ws2.sheet_view.showGridLines = False
ws2.freeze_panes = "B4"

headers = [
    ("A", "年次", 6),
    ("B", "満室時\n家賃収入", 12),
    ("C", "空室損", 11),
    ("D", "実効\n家賃収入", 12),
    ("E", "管理料", 10),
    ("F", "固都税", 10),
    ("G", "保険\nその他", 10),
    ("H", "小修繕・\n原状回復", 11),
    ("I", "大規模\n修繕", 11),
    ("J", "運営費 計", 12),
    ("K", "営業純収益\n(NOI)", 13),
    ("L", "借入返済額\n(元利)", 13),
    ("M", "(うち利息)", 11),
    ("N", "税引前\nキャッシュフロー", 14),
    ("O", "減価償却費\n(参考)", 12),
    ("P", "不動産所得\n(概算)", 12),
    ("Q", "税金\n(概算)", 11),
    ("R", "税引後\nキャッシュフロー", 14),
    ("S", "累計\nキャッシュフロー", 15),
]
put(ws2, "A1", "30年 収支計画計算書(自動計算)", TITLE_F, border=False)
put(ws2, "A2", "前提条件シートの黄色セルを変更すると、本シートは自動で再計算されます。金額単位: 円", NOTE_F, border=False)
for col, name, width in headers:
    ws2.column_dimensions[col].width = width
    c = put(ws2, f"{col}3", name.replace("\n", "\n"), H_F, HEAD_FILL, align="center")
    c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

R0 = 4  # first data row
for i in range(30):
    r = R0 + i
    y = f"A{r}"
    put(ws2, y, i + 1, fmt="0", align="center")
    f = {
        "B": f"='{P}'!$B$19*(1-'{P}'!$B$22)^(A{r}-1)",
        "C": f"=-B{r}*IF(A{r}>=16,'{P}'!$B$21,'{P}'!$B$20)",
        "D": f"=B{r}+C{r}",
        "E": f"=-D{r}*'{P}'!$B$25",
        "F": f"=-'{P}'!$B$26",
        "G": f"=-'{P}'!$B$27",
        "H": f"=-'{P}'!$B$28",
        "I": f"=-IF(A{r}='{P}'!$B$29,'{P}'!$C$29,0)-IF(A{r}='{P}'!$B$30,'{P}'!$C$30,0)",
        "J": f"=SUM(E{r}:I{r})",
        "K": f"=D{r}+J{r}",
        "L": f"=-IF(A{r}<='{P}'!$B$14,'{P}'!$B$15,0)",
        "M": f"=IF(OR(A{r}>'{P}'!$B$14,'{P}'!$B$12<=0,'{P}'!$B$13<=0),0,CUMIPMT('{P}'!$B$13/12,'{P}'!$B$14*12,'{P}'!$B$12,(A{r}-1)*12+1,A{r}*12,0))",
        "N": f"=K{r}+L{r}",
        "O": f"=IF(A{r}<=22,'{P}'!$B$33*'{P}'!$B$34,0)",
        "P": f"=K{r}+M{r}-O{r}",
        "Q": f"=-MAX(0,P{r}*'{P}'!$B$35)",
        "R": f"=N{r}+Q{r}",
        "S": (f"=R{r}" if i == 0 else f"=S{r-1}+R{r}"),
    }
    for col, formula in f.items():
        fmt = YEN
        put(ws2, f"{col}{r}", formula, fmt=fmt, align="right")
    # 返済終了後の行をうっすら色分け
# 合計行
rT = R0 + 30
put(ws2, f"A{rT}", "合計", BOLD, TOT_FILL, align="center")
for col in "BCDEFGHIJKLMNOQR":
    put(ws2, f"{col}{rT}", f"=SUM({col}{R0}:{col}{rT-1})", fmt=YEN, fill=TOT_FILL, align="right", bold=True)
put(ws2, f"S{rT}", f"=S{rT-1}", fmt=YEN, fill=TOT_FILL, align="right", bold=True)
put(ws2, f"A{rT+2}", "※ 税金(概算)は不動産所得×適用税率の簡易計算です(青色申告特別控除・損益通算等は未反映)。正式な税額は税理士試算によります。", NOTE_F, border=False)

# =========================================================
# シート3: サマリー・金利シナリオ
# =========================================================
ws3 = wb.create_sheet("サマリー")
ws3.sheet_view.showGridLines = False
for col, w in [("A", 34), ("B", 15), ("C", 15), ("D", 15), ("E", 40)]:
    ws3.column_dimensions[col].width = w

put(ws3, "A1", "投資サマリー・金利上昇シナリオ比較", TITLE_F, border=False)

put(ws3, "A3", "■ 主要指標", H_F, HEAD_FILL)
for c in "BCDE": put(ws3, f"{c}3", "", H_F, HEAD_FILL)
rows3 = [
    ("総事業費", f"='{P}'!B8", YEN, ""),
    ("自己資金 / 借入額", f"='{P}'!B11", YEN, "隣は借入額"),
    ("表面利回り(満室時家賃 ÷ 総事業費)", f"='{P}'!B19/'{P}'!B8", PCT, "土地は自己所有のため建物投資に対する利回り"),
    ("実質利回り(1年目NOI ÷ 総事業費)", f"=収支計画30年!K4/'{P}'!B8", PCT, "運営費控除後"),
    ("DSCR(1年目NOI ÷ 年間返済額)", f"=IF('{P}'!B15=0,\"借入なし\",収支計画30年!K4/'{P}'!B15)", "0.00", "1.2以上が金融機関の目安"),
    ("1年目 税引後キャッシュフロー", "=収支計画30年!R4", YEN, ""),
    ("返済終了後(26年目)の年間手残り", "=収支計画30年!R29", YEN, "無借金の収益資産になります"),
    ("30年累計 税引後キャッシュフロー", "=収支計画30年!S33", YEN, ""),
    ("30年累計 − 自己資金(純増額)", f"=収支計画30年!S33-'{P}'!B11", YEN, "投下自己資金を差し引いた実質手取り"),
]
r = 4
for label, formula, fmt, note in rows3:
    put(ws3, f"A{r}", label)
    put(ws3, f"B{r}", formula, fill=CALC_FILL, fmt=fmt, align="right", bold=True)
    if "自己資金" in label and "純増" not in label:
        put(ws3, f"C{r}", f"='{P}'!B12", fill=CALC_FILL, fmt=YEN, align="right", bold=True)
    put(ws3, f"E{r}", note, NOTE_F)
    r += 1

r += 1
put(ws3, f"A{r}", "■ 金利上昇シナリオ(1年目ベース)", H_F, HEAD_FILL)
for c in "BCDE": put(ws3, f"{c}{r}", "", H_F, HEAD_FILL)
r += 1
hdr = r
put(ws3, f"A{hdr}", "", B_F, SEC_FILL)
put(ws3, f"B{hdr}", "現行金利", BOLD, SEC_FILL, align="center")
put(ws3, f"C{hdr}", "+1.0%", BOLD, SEC_FILL, align="center")
put(ws3, f"D{hdr}", "+2.0%", BOLD, SEC_FILL, align="center")
put(ws3, f"A{hdr+1}", "適用金利")
put(ws3, f"B{hdr+1}", f"='{P}'!B13", fmt=PCT, align="right")
put(ws3, f"C{hdr+1}", f"='{P}'!B13+0.01", fmt=PCT, align="right")
put(ws3, f"D{hdr+1}", f"='{P}'!B13+0.02", fmt=PCT, align="right")
put(ws3, f"A{hdr+2}", "年間返済額")
for col, add in [("B", "0"), ("C", "0.01"), ("D", "0.02")]:
    put(ws3, f"{col}{hdr+2}", f"=IF('{P}'!B12<=0,0,PMT(('{P}'!B13+{add})/12,'{P}'!B14*12,-'{P}'!B12)*12)", fmt=YEN, align="right")
put(ws3, f"A{hdr+3}", "1年目 税引前キャッシュフロー", bold=True)
for col in "BCD":
    put(ws3, f"{col}{hdr+3}", f"=収支計画30年!K4-{col}{hdr+2}", fill=CALC_FILL, fmt=YEN, align="right", bold=True)
put(ws3, f"E{hdr+3}", "金利が2%上がっても赤字にならないかを確認", NOTE_F)

r = hdr + 5
put(ws3, f"A{r}", "※ 本書は一定の前提に基づく概算シミュレーションであり、将来の収益を保証するものではありません。", NOTE_F, border=False)
put(ws3, f"A{r+1}", "※ 大規模修繕年は一時的にキャッシュフローがマイナスになります(収支計画30年シート参照)。", NOTE_F, border=False)

# 折れ線グラフ: 税引後CFと累計CF
chart = LineChart()
chart.title = "キャッシュフローの推移(30年)"
chart.style = 2
chart.height = 8.5
chart.width = 22
chart.y_axis.title = "円"
chart.x_axis.title = "年次"
data = Reference(wb["収支計画30年"], min_col=18, min_row=3, max_row=33)   # R列 税引後CF
data2 = Reference(wb["収支計画30年"], min_col=19, min_row=3, max_row=33)  # S列 累計
cats = Reference(wb["収支計画30年"], min_col=1, min_row=4, max_row=33)
chart.add_data(data, titles_from_data=True)
chart.add_data(data2, titles_from_data=True)
chart.set_categories(cats)
ws3.add_chart(chart, f"A{r+3}")

wb.save(OUT)
print("saved:", OUT)

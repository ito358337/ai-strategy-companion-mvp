# ゆずりえクラウド

AI経営伴走アプリ（MVPライト版）と見積・実行予算システムをまとめたWebアプリです。

- **AI経営伴走アプリ**（`/`）: 5章×10問のQuestionBank JSONを使った経営の言語化ツール
- **見積・実行予算システム**（`/estimate/`）: リフォーム工事向けの見積作成・粗利管理ツール

どのURLパス配下に置いても動くよう、アセットは相対パスで参照しています。

## 起動

```bash
npm run dev
```

ブラウザで `http://localhost:4273/` を開きます。

## 検証

```bash
npm run check
```

5章、各10問、カテゴリ、次質問ID、必須項目の整合性を確認します。

## データ

- `src/data/categories.json`
- `src/data/question-bank/strategy.json`
- `src/data/question-bank/tactics.json`
- `src/data/question-bank/promotion.json`
- `src/data/question-bank/experience.json`
- `src/data/question-bank/philosophy.json`

回答はMVP用にブラウザのlocalStorageへ保存します。

## 出力

- **PDF出力**: ヘッダーの「PDF出力」ボタンで、回答を「売上アップ戦略シート」として整形した印刷ビューを開きます。ブラウザの印刷ダイアログから「PDFに保存」を選ぶとPDFになります。
- **Markdown出力**: 全質問・深掘り回答を含む詳細なMarkdownファイルをダウンロードします。

## 見積・実行予算システム

`/estimate/` で、リフォーム工事向けの見積システムが使えます（ヘッダーの「見積システム」からも移動できます）。

- **入力**: 工区・部屋ごとに明細（数量・お客様単価・実行単価）を入力。手入力金額が単価×数量より優先されます。
- **お客様見積書**: 工区別の税抜・消費税（端数切り捨て）・税込を自動集計し、原価を含まない明細を表示。
- **実行予算 / 粗利分析**: 工区別・明細別の粗利額と粗利率を、目標粗利率に対して OK / 注意 / 要改善 で判定。
- **PDF出力**: 表示中の帳票（見積書または実行予算書）を印刷ビューでPDF保存。
- データは `src/data/estimate-master.json`（Aetherサンプル156明細）を初期値として、ブラウザのlocalStorageに保存されます。

## 使い方ガイド

社内テストや少人数での試用には、`docs/userGuide.md` を参照してください。

## GitHub / Vercel公開

1. このフォルダをGitHubリポジトリへpushします。
2. Vercelで「Add New Project」からGitHubリポジトリを選択します。
3. Framework PresetはOther、Build Commandは空、Output Directoryも空のままで公開できます。
4. 公開後、VercelのProject Settingsから独自ドメインを設定できます。

このMVPは静的サイトとして動きます。DB保存やAI API連携はまだ入れていないため、回答は利用者ごとのブラウザに保存されます。

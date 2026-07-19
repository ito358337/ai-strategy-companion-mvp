# AI経営伴走アプリ MVPライト版

5章×10問のQuestionBank JSONを使った、ローカル実行用のMVPです。

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

## 使い方ガイド

社内テストや少人数での試用には、`docs/userGuide.md` を参照してください。

## GitHub / Vercel公開

1. このフォルダをGitHubリポジトリへpushします。
2. Vercelで「Add New Project」からGitHubリポジトリを選択します。
3. Framework PresetはOther、Build Commandは空、Output Directoryも空のままで公開できます。
4. 公開後、VercelのProject Settingsから独自ドメインを設定できます。

このMVPは静的サイトとして動きます。DB保存やAI API連携はまだ入れていないため、回答は利用者ごとのブラウザに保存されます。

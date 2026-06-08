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

## GitHub / Vercel公開

1. このフォルダをGitHubリポジトリへpushします。
2. Vercelで「Add New Project」からGitHubリポジトリを選択します。
3. Framework PresetはOther、Build Commandは空、Output Directoryも空のままで公開できます。
4. 公開後、VercelのProject Settingsから独自ドメインを設定できます。

このMVPは静的サイトとして動きます。DB保存やAI API連携はまだ入れていないため、回答は利用者ごとのブラウザに保存されます。

# データベース設計書 (Database Schema)

MVPライト版および将来の拡張を見据えたリレーショナルデータベース設計（Supabase/PostgreSQL想定）。

## テーブル一覧

### 1. `users` (ユーザー情報)
| フィールド名 | 型 | 説明 | 必須 | リレーション |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | ユーザーID (PK) | 〇 | - |
| `email` | String | メールアドレス | 〇 | - |
| `name` | String | ユーザー名 | 〇 | - |
| `created_at` | Timestamp | 作成日時 | 〇 | - |

### 2. `companies` (会社情報)
| フィールド名 | 型 | 説明 | 必須 | リレーション |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | 会社ID (PK) | 〇 | - |
| `user_id` | UUID | 管理者ユーザーID | 〇 | `users.id` |
| `name` | String | 会社名 | 〇 | - |
| `industry` | String | 業種 | - | - |
| `created_at` | Timestamp | 作成日時 | 〇 | - |

### 3. `sessions` (セッション管理)
| フィールド名 | 型 | 説明 | 必須 | リレーション |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | セッションID (PK) | 〇 | - |
| `user_id` | UUID | ユーザーID | 〇 | `users.id` |
| `company_id` | UUID | 会社ID | 〇 | `companies.id` |
| `title` | String | セッション名（日付などで自動生成） | 〇 | - |
| `status` | String | 状態 (in_progress, completed) | 〇 | - |
| `current_chapter` | String | 現在進行中の章ID | - | - |
| `created_at` | Timestamp | 開始日時 | 〇 | - |
| `updated_at` | Timestamp | 最終更新日時 | 〇 | - |

### 4. `categories` (章管理) ※JSONマスターで代用可
| フィールド名 | 型 | 説明 | 必須 | リレーション |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | カテゴリID (PK) 例: strategy | 〇 | - |
| `name` | String | 章名 | 〇 | - |
| `order_num` | Integer | 表示順 | 〇 | - |

### 5. `questions` (質問マスター) ※MVP時はJSONファイルから直接読み込み想定
| フィールド名 | 型 | 説明 | 必須 | リレーション |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | 質問ID (PK) 例: STG-001 | 〇 | - |
| `category_id` | String | カテゴリID | 〇 | `categories.id` |
| `level1_text` | Text | メイン質問文 | 〇 | - |
| `level2_text` | Text | 深掘り質問文 | - | - |
| `next_question_id`| String | 次の質問ID | - | - |
| `pdf_output_key`| String | PDF出力先マッピングキー | 〇 | - |

### 6. `answers` (ユーザー回答)
| フィールド名 | 型 | 説明 | 必須 | リレーション |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | 回答ID (PK) | 〇 | - |
| `session_id` | UUID | セッションID | 〇 | `sessions.id` |
| `question_id` | String | 質問ID | 〇 | `questions.id` |
| `answer_text` | Text | ユーザーの回答内容 | 〇 | - |
| `ai_deep_prompt`| Text | AIが生成した深掘り質問（あれば）| - | - |
| `created_at` | Timestamp | 回答日時 | 〇 | - |

### 7. `ai_summaries` (AI要約データ)
| フィールド名 | 型 | 説明 | 必須 | リレーション |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | 要約ID (PK) | 〇 | - |
| `session_id` | UUID | セッションID | 〇 | `sessions.id` |
| `category_id` | String | カテゴリID (全体要約の場合は 'all') | 〇 | `categories.id` |
| `summary_text` | Text | AI生成要約テキスト | 〇 | - |
| `action_plan` | Text | 90日アクションプラン(全章完了時) | - | - |

### 8. `pdf_exports` (PDF出力履歴)
| フィールド名 | 型 | 説明 | 必須 | リレーション |
| :--- | :--- | :--- | :--- | :--- |
| `id` | UUID | エクスポートID (PK) | 〇 | - |
| `session_id` | UUID | セッションID | 〇 | `sessions.id` |
| `file_url` | String | 生成されたPDFのストレージURL | 〇 | - |
| `created_at` | Timestamp | 出力日時 | 〇 | - |

### 9. `prompt_settings` (プロンプト管理)
| フィールド名 | 型 | 説明 | 必須 | リレーション |
| :--- | :--- | :--- | :--- | :--- |
| `id` | String | プロンプトID (PK) | 〇 | - |
| `content` | Text | プロンプト本文 | 〇 | - |
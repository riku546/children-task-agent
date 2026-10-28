# 育児事務AIエージェント Web MVP

保育園・学校・習い事の連絡から、家族で共有できるTODOを作る授業発表用プロトタイプです。

## 前提
以下のソフトウェアが必要です。
- node.js 20.x
- npm 10.x
- Docker 

## セットアップ

```bash
#envファイルを作成し、必要に応じて編集してください
cp .env.example .env  

npm install

docker compose up -d

npx prisma generate
npx prisma db push

npm run dev
```

外部サービスは後から設定できます。`OPENROUTER_API_KEY` が未設定の場合は、簡易ルールベースのTODO生成にフォールバックします。Google Calendar の環境変数が未設定の場合は、デモ用のイベントIDを保存します。

TODO抽出は、テキストでも画像・PDFでも `OPENROUTER_MODEL` のモデルを使います。未設定なら `openai/gpt-5.6-luna` です。OpenRouter へのリクエストは従来どおり Zero Data Retention（`provider.data_collection: "deny"` と `provider.zdr: true`）です。

スキーマを更新したあとは、データベースに次を反映してください。

```bash
npx prisma db push
```

`User.onboardingCompletedAt` は、初回案内を完了またはスキップした時刻です。

ログインには Supabase Auth を使います。Supabase プロジェクトの URL と publishable key を `.env` に設定してください。

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

Googleログインを使う場合は、Supabase Dashboard の Authentication Providers で Google を有効化し、Google Cloud の OAuth client ID / client secret を登録してください。Supabase の Redirect URLs には以下を追加します。

```text
http://localhost:3000/auth/callback
```

## 画面

- `/login`: メールアドレス/パスワードログイン、新規登録、Googleログイン
- `/onboarding`: 初回ログイン時の案内（グループ → 子ども → 読み取り → TODO）。スキップできます
- `/dashboard`: 今日・明日・未完了TODO。カレンダーの日付からは、その日が期限のTODOをその場で追加できます
- `/tasks/new`: テキスト、画像OCR、PDF抽出/OCR、音声入力、AI TODO候補確認
- `/tasks/[id]`: TODO詳細、編集、完了、Googleカレンダー追加
- `/groups`: 家族グループ作成
- `/groups/[id]/settings`: メンバー、招待リンク、子ども情報

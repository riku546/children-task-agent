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

ログインには Supabase Auth を使います。Supabase プロジェクトの URL と publishable key を `.env` に設定してください。

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

Googleログインを使う場合は、Supabase Dashboard の Authentication Providers で Google を有効化し、Google Cloud の OAuth client ID / client secret を登録してください。Supabase の Redirect URLs には以下を追加します。

```text
http://localhost:3000/auth/callback
```

## CI（GitHub Actions）

`main` / `master` への PR、および `feature/**` への push で、GitHub Actions の **CI** ワークフローが走ります。

| ステップ | コマンド | 内容 |
| :--- | :--- | :--- |
| Prisma | `npm run prisma:generate` | クライアント生成 |
| Lint / Format | `npm run lint` | Biome |
| 型チェック | `npm run typecheck` | `tsc --noEmit` |
| ビルド | `npm run build` | Next.js 本番ビルド（DB 不要） |

ローカルで同じ内容をまとめて実行する場合:

```bash
npm run ci
```

設定ファイル: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

### Vercel デプロイを CI 通過後に限定する

Vercel は push 直後にビルドを始めるため、**Git のコミットチェック**で CI 成功を待つ設定を推奨します。

1. **Vercel** → 対象プロジェクト → **Settings** → **Git** → **Deploy Hooks / Git Commit Checks**（表示名はプランで多少異なります）
2. 必須チェックに **`Lint, Typecheck & Build`**（ワークフロー `CI` のジョブ名）を追加
3. **GitHub** → リポジトリ **Settings** → **Branches** → `main` のブランチ保護ルールで、同じステータスチェックを必須にするとマージも CI 後に限定できます

プレビュー／本番どちらのデプロイも、指定したチェックが green になるまで Vercel は進めません。

## 画面

- `/login`: メールアドレス/パスワードログイン、新規登録、Googleログイン
- `/dashboard`: 今日・明日・未完了TODO
- `/tasks/new`: テキスト、画像OCR、PDF抽出/OCR、音声入力、AI TODO候補確認
- `/tasks/[id]`: TODO詳細、編集、完了、Googleカレンダー追加
- `/groups`: 家族グループ作成
- `/groups/[id]/settings`: メンバー、招待リンク、子ども情報

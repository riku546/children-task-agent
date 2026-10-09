# 育児タスクAI (Childcare Task Agent) - AIエージェント開発ガイド

このドキュメントは、本リポジトリで作業するAIアシスタントおよび開発者のためのアーキテクチャ・設計方針・開発規約リファレンスです。

---

## 1. プロジェクト概要

「園や学校から届くお便り・プリント・連絡」から、家族で共有すべきTODO（提出物、持ち物、集金、行事等）を自動抽出し、家族間での分担・実行を支援するWebアプリケーション（MVP）です。

### 主要な価値提案
- **お便りからワンタップでTODO抽出**: 写真撮影・画像選択・PDF・音声入力から、マルチモーダルAIが即座にタスク化。
- **家族でのToDo分担と見える化**: 誰がどのタスクを持っているか、偏りを可視化し、「私がやる」ボタンで自発的なタスク引き受けを促進。
- **高いプライバシー・個人情報保護**: 児童・家庭の機微情報を扱うため、AI通信はZero Data Retention (ZDR) 準拠で推論後に即時破棄。

---

## 2. 技術スタック

| 分野 | 技術 |
| :--- | :--- |
| **フレームワーク** | Next.js (App Router, Turbopack) / React 19 / TypeScript |
| **スタイリング** | Tailwind CSS / Lucide React アイコン |
| **データベース・ORM** | PostgreSQL / Prisma ORM / メモリフォールバック (`memory-store.ts`) |
| **認証・ストレージ** | Supabase Auth (SSR) / デモ用インメモリ認証 |
| **AI (LLM / VLM)** | OpenRouter API (`google/gemini-2.5-flash` / `google/gemini-3.1-flash-lite`) |
| **PDF処理** | `pdfjs-dist` |
| **Linter / Formatter** | Biome (`@biomejs/biome`) |
| **CI / 自動化** | GitHub Actions (`.github/workflows/ci.yml`) |

---

## 3. ディレクトリ構成

```tree
childcare-task-agent/
├── .github/
│   └── workflows/
│       └── ci.yml               # GitHub Actions CI (Biome, Typecheck, Build)
├── prisma/
│   └── schema.prisma           # Prisma スキーマ (User, FamilyGroup, Task, etc.)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/extract/     # AIによるマルチモーダルTODO抽出API
│   │   │   ├── tasks/          # タスク作成・一覧・更新API
│   │   │   ├── groups/         # 家族グループ・招待・子ども管理API
│   │   │   └── me/             # ログインユーザー・所属グループ情報API
│   │   ├── dashboard/          # ホームダッシュボード（期限別TODO）
│   │   ├── family/             # 家族のタスク管理画面（担当状況の見える化）
│   │   ├── tasks/
│   │   │   ├── new/            # 写真撮影・画像・PDFからのTODO作成画面
│   │   │   └── [id]/           # タスク詳細・編集画面
│   │   ├── groups/             # グループ一覧・設定・招待
│   │   ├── layout.tsx          # 共通ヘッダー・フッター・ナビゲーション
│   │   └── globals.css         # スタイル定義
│   ├── components/             # 共通UIコンポーネント (TaskList, StatusPill, etc.)
│   └── lib/
│       ├── extraction.ts       # OpenRouter Gemini マルチモーダル連携
│       ├── repository.ts       # データアクセス層（Prisma ↔ メモリストアのハイブリッド）
│       ├── memory-store.ts     # DB未接続時のローカルモックストア
│       ├── types.ts            # ドメイン型定義
│       └── auth.ts             # 認証ハンドラ
├── biome.json                  # Biome 設定ファイル
├── package.json
└── todos.md                    # 開発ロードマップ / TODO
```

---

## 4. 開発コマンド

```bash
# 依存関係インストール
npm install

# 開発サーバー起動 (ポート 3000)
npm run dev

# 型チェック
npm run typecheck

# Linter & Formatter (Biome)
npm run lint          # チェックのみ
npm run format        # フォーマット適用
npm run check         # Lint & Format を自動修正適用

# プロダクションビルド
npm run build

# Prisma
npm run prisma:generate   # クライアント生成
npm run prisma:push       # スキーマをDBへ反映
```

---

## 5. 重要な設計規約・開発ルール

### ① OpenRouter通信とプライバシー (ZDRの徹底)
- 写真やお便りデータには、園児の名前、クラス名、園名などの個人情報が含まれます。
- OpenRouter APIへのリクエストには必ず以下を含めてください：
  ```json
  provider: {
    data_collection: "deny",
    zdr: true
  }
  ```
- ログ保存を禁止し、AIプロバイダー（Google）側でも学習への不使用・即時破棄を強制します。

### ② DB接続フォールバックアーキテクチャ
- `src/lib/repository.ts` は、`DATABASE_URL` がない場合や接続失敗時に自動的に `src/lib/memory-store.ts` にフォールバックします。
- これにより、ローカル開発環境やオフライン環境でもDBなしで全画面の動作確認が可能です。新しいエンティティや操作を追加する際は、Prisma処理とメモリストア処理の双方に対応させてください。

### ③ モバイルファーストUI
- ユーザーはスマホでお便りを撮影して操作することが多いため、レスポンシブデザイン（タッチターゲットの広さ、ボトムナビゲーション対応）を常に意識してください。

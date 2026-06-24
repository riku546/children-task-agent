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

## 画面

- `/login`: デモログイン、Googleログイン導線
- `/dashboard`: 今日・明日・未完了TODO
- `/tasks/new`: テキスト、画像OCR、PDF抽出/OCR、音声入力、AI TODO候補確認
- `/tasks/[id]`: TODO詳細、編集、完了、Googleカレンダー追加
- `/groups`: 家族グループ作成
- `/groups/[id]/settings`: メンバー、招待リンク、子ども情報

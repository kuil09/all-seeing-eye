# all-seeing-eye

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文](README.zh-CN.md)

選別された RSS 項目を、出典・信頼度・レビュー履歴付きのレビュー可能なイベントへ変換する、ローカルファーストの first-slice analyst workflow リポジトリです。

## スコープ

現在のリポジトリの固定スコープは次のとおりです。

`curated RSS -> local synthesis -> SQLite -> read API -> timeline-first review console`

このスライスの対象外:

- 直接的な SNS 取り込み
- 地図中心のワークフロー
- マルチテナント認証またはデプロイ面
- ホスト型 LLM 依存

## 実装済みの内容

- curated fixture を SQLite に seed する経路
- 明示的な allowlist を使う live curated RSS polling
- feed ごとの成功・失敗コンテキストを保持する ingest run 履歴
- event、claim、entity、relationship、provenance、confidence を生成する決定論的な local synthesis
- timeline、event detail、review action を返す local read API
- queue filter、search、draft、saved view、handoff link、recent review recovery、keyboard shortcut を備えた analyst review console
- fixture-backed と SQLite-backed の smoke validation 経路

## リポジトリ構成

```text
apps/review-console/        Analyst review application
contracts/                  Canonical JSON schemas and example payloads
docs/architecture/          Architecture package for the first slice
docs/contracts/             Contract change-control notes
docs/operations/            Runbooks, observability notes, validation bundle
fixtures/                   Shared fixture dataset and allowlist example
packages/contracts/         Contract helper tests and package surface
schemas/                    SQLite schema baseline
services/pipeline/          Ingest, poll, synthesize, and persist flow
services/read-api/          Local read-only API
scripts/                    Local validation and dev entrypoints
```

## クイックスタート

デモ用データベースを seed します。

```bash
node services/pipeline/cli.mjs seed-demo
```

現在のデータベース状態を確認します。

```bash
node services/pipeline/cli.mjs stats
node services/pipeline/cli.mjs ingest-runs
```

Read API を起動します。

```bash
./scripts/serve_read_api.sh
```

Analyst review console を起動します。

```bash
npm run review-console:dev
```

開く URL:

- `http://127.0.0.1:4310/api/timeline`
- `http://127.0.0.1:4173/apps/review-console/`

fixture mode ではなく SQLite-backed data を使う場合:

```bash
READ_API_DB_PATH=data/all-seeing-eye.sqlite npm run review-console:dev
```

## 検証

リポジトリ smoke check:

```bash
./scripts/validate_sql.sh
./scripts/validate_json.sh
./scripts/smoke_pipeline.sh
./scripts/smoke_read_api.sh
./scripts/smoke_review_console.sh
./scripts/smoke_review_console_sqlite.sh
```

用途別の npm entrypoint:

```bash
npm run pipeline:smoke
npm run publication:check
npm run read-api:smoke
npm run review-console:smoke
npm run review-console:smoke:sqlite
```

## Live Curated RSS パス

承認済み allowlist を poll して ingest 履歴を保存します。

```bash
node services/pipeline/cli.mjs poll-curated \
  --allowlist ./path/to/approved-curated-feed-allowlist.json
```

リポジトリには形式例があります。

- `fixtures/curated-feed-allowlist.example.json`

チェックポイントや handoff 前に参照する運用ドキュメント:

- `docs/operations/curated-rss-runbook.md`
- `docs/operations/pipeline-observability.md`

## 主要ドキュメント

- `docs/architecture/first-slice-architecture.md`
- `services/pipeline/README.md`
- `services/read-api/README.md`
- `apps/review-console/README.md`
- `docs/operations/review-console-validation-bundle.md`
- `notes/2026-03-17-nit-105-mainline-publication-path-recovery.md`

## 現在の制約

- live curated polling は現在、取得した item ごとに決定論的な event candidate 1 件と event-fact claim 1 件を生成します
- live feed からは、まだより豊かな multi-entity や relationship 抽出は行いません
- review console の saved view、draft、recent activity はブラウザローカルに残ります
- このスライスは hosted operations より local reproducibility を優先しています

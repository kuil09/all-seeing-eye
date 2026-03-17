# all-seeing-eye

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文](README.zh-CN.md)

这是一个本地优先的 first-slice analyst workflow 仓库，用于把经过筛选的 RSS 条目转换为可审阅事件，并保留来源、置信度和审阅历史。

## 范围

当前仓库的固定范围如下：

`curated RSS -> local synthesis -> SQLite -> read API -> timeline-first review console`

本阶段不包含：

- 直接的 SNS 摄取
- 以地图为中心的工作流
- 多租户认证或部署面
- 托管式 LLM 依赖

## 已实现内容

- 将 curated fixture seed 到 SQLite 的路径
- 基于显式 allowlist 的实时 curated RSS polling
- 保存每个 feed 成功/失败上下文的 ingest run 历史
- 为 event、claim、entity、relationship、provenance、confidence 提供确定性的本地 synthesis
- 提供 timeline、event detail、review action 的本地 read API
- 包含 queue filter、search、draft、saved view、handoff link、recent review recovery、keyboard shortcut 的 analyst review console
- 基于 fixture 和基于 SQLite 的 smoke validation 路径

## 仓库结构

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

## 快速开始

为演示数据库执行 seed：

```bash
node services/pipeline/cli.mjs seed-demo
```

检查当前数据库快照：

```bash
node services/pipeline/cli.mjs stats
node services/pipeline/cli.mjs ingest-runs
```

启动 Read API：

```bash
./scripts/serve_read_api.sh
```

启动 analyst review console：

```bash
npm run review-console:dev
```

打开：

- `http://127.0.0.1:4310/api/timeline`
- `http://127.0.0.1:4173/apps/review-console/`

如果要让 console 和 API 使用 SQLite 数据而不是 fixture mode：

```bash
READ_API_DB_PATH=data/all-seeing-eye.sqlite npm run review-console:dev
```

## 验证

仓库 smoke check：

```bash
./scripts/validate_sql.sh
./scripts/validate_json.sh
./scripts/smoke_pipeline.sh
./scripts/smoke_read_api.sh
./scripts/smoke_review_console.sh
./scripts/smoke_review_console_sqlite.sh
```

按用途划分的 npm 入口：

```bash
npm run pipeline:smoke
npm run publication:check
npm run read-api:smoke
npm run review-console:smoke
npm run review-console:smoke:sqlite
```

## 实时 Curated RSS 路径

轮询已批准的 allowlist 并持久化 ingest 历史：

```bash
node services/pipeline/cli.mjs poll-curated \
  --allowlist ./path/to/approved-curated-feed-allowlist.json
```

仓库内提供了格式示例：

- `fixtures/curated-feed-allowlist.example.json`

在 checkpoint 或 handoff 前应参考的运维文档：

- `docs/operations/curated-rss-runbook.md`
- `docs/operations/pipeline-observability.md`

## 关键文档

- `docs/architecture/first-slice-architecture.md`
- `services/pipeline/README.md`
- `services/read-api/README.md`
- `apps/review-console/README.md`
- `docs/operations/review-console-validation-bundle.md`
- `notes/2026-03-17-nit-105-mainline-publication-path-recovery.md`

## 当前限制

- 实时 curated polling 目前会为每个抓取到的 item 生成 1 个确定性的 event candidate 和 1 个 event-fact claim
- 实时 feed 还不会产出更丰富的 multi-entity 或 relationship 抽取
- review console 的 saved view、draft、recent activity 仍保存在浏览器本地
- 这一阶段优先保证本地可复现性，而不是面向托管运行
